import { Transaction, Op, fn, col, literal } from 'sequelize';
import { HouseholdActivity } from '../models/HouseholdActivity';
import { User } from '../models/User';
import { HouseholdActivityAction, HouseholdActivityTargetType } from '../types/enums';

export interface CreateHouseholdActivityData {
  householdId: string;
  userId: string;
  itemId: string | null;
  itemNameSnapshot: string | null;
  action: HouseholdActivityAction;
  targetType?: HouseholdActivityTargetType | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ItemScore {
  personalCount: number;
  householdCount: number;
}

export class HouseholdActivityRepository {
  async create(
    data: CreateHouseholdActivityData,
    options?: { transaction?: Transaction }
  ): Promise<HouseholdActivity> {
    return await HouseholdActivity.create(data, { transaction: options?.transaction });
  }

  // Per-item personal + household counts within [since, now). Only non-null
  // itemIds are counted. One indexed grouped query per scope; results are small
  // (distinct items a household touched in 30 days).
  async getScoreMap(
    householdId: string,
    userId: string,
    since: Date
  ): Promise<Map<string, ItemScore>> {
    const rows = (await HouseholdActivity.findAll({
      attributes: [
        'itemId',
        [fn('COUNT', col('id')), 'householdCount'],
        [
          fn(
            'COUNT',
            literal(`CASE WHEN "userId" = '${userId}' THEN 1 END`)
          ),
          'personalCount',
        ],
      ],
      where: {
        householdId,
        itemId: { [Op.ne]: null },
        createdAt: { [Op.gte]: since },
      },
      group: ['itemId'],
      raw: true,
    })) as unknown as Array<{ itemId: string; householdCount: string; personalCount: string }>;

    const map = new Map<string, ItemScore>();
    for (const r of rows) {
      map.set(r.itemId, {
        personalCount: Number(r.personalCount),
        householdCount: Number(r.householdCount),
      });
    }
    return map;
  }

  // Distinct items this user most recently touched (any action, NO time window
  // — an inactive user still sees their récents). Ordered newest first.
  async getRecentItemRefs(
    householdId: string,
    userId: string,
    limit: number
  ): Promise<Array<{ itemId: string; lastSelectedAt: Date }>> {
    const rows = (await HouseholdActivity.findAll({
      attributes: ['itemId', [fn('MAX', col('createdAt')), 'lastSelectedAt']],
      where: { householdId, userId, itemId: { [Op.ne]: null } },
      group: ['itemId'],
      order: [[literal('"lastSelectedAt"'), 'DESC']],
      limit,
      raw: true,
    })) as unknown as Array<{ itemId: string; lastSelectedAt: string }>;

    return rows.map((r) => ({ itemId: r.itemId, lastSelectedAt: new Date(r.lastSelectedAt) }));
  }

  // Most frequent items within [since, now). userId omitted = whole household.
  async getFrequent(
    householdId: string,
    since: Date,
    limit: number,
    userId?: string
  ): Promise<Array<{ itemId: string; count: number }>> {
    const where: Record<string, unknown> = {
      householdId,
      itemId: { [Op.ne]: null },
      createdAt: { [Op.gte]: since },
    };
    if (userId) where.userId = userId;

    const rows = (await HouseholdActivity.findAll({
      attributes: ['itemId', [fn('COUNT', col('id')), 'count']],
      where,
      group: ['itemId'],
      order: [[literal('count'), 'DESC']],
      limit,
      raw: true,
    })) as unknown as Array<{ itemId: string; count: string }>;

    return rows.map((r) => ({ itemId: r.itemId, count: Number(r.count) }));
  }

  // Feed paginé en keyset décroissant sur (createdAt, id). `before` = curseur
  // opaque renvoyé par un appel précédent. Inclut l'auteur (User).
  async getFeed(
    householdId: string,
    opts: { limit: number; before?: string }
  ): Promise<{ rows: HouseholdActivity[]; nextCursor: string | null }> {
    const where: Record<string, unknown> = { householdId };

    if (opts.before) {
      const decoded = this.decodeCursor(opts.before);
      if (decoded) {
        where[Op.or as unknown as string] = [
          { createdAt: { [Op.lt]: decoded.createdAt } },
          { createdAt: decoded.createdAt, id: { [Op.lt]: decoded.id } },
        ];
      }
    }

    const rows = await HouseholdActivity.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }],
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: opts.limit + 1,
    });

    let nextCursor: string | null = null;
    if (rows.length > opts.limit) {
      const last = rows[opts.limit - 1]!;
      nextCursor = this.encodeCursor(last.createdAt, last.id);
      rows.length = opts.limit;
    }

    return { rows, nextCursor };
  }

  // Supprime la ligne d'activité la plus récente correspondant à un target +
  // une des actions données. Best-effort (undo dans la fenêtre de 10s).
  async deleteRecentForTarget(
    householdId: string,
    targetId: string,
    actions: HouseholdActivityAction[]
  ): Promise<void> {
    const row = await HouseholdActivity.findOne({
      where: { householdId, targetId, action: { [Op.in]: actions } },
      order: [['createdAt', 'DESC']],
    });
    if (row) await row.destroy();
  }

  private encodeCursor(createdAt: Date, id: string): string {
    return Buffer.from(`${new Date(createdAt).toISOString()}|${id}`).toString('base64');
  }

  private decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
    try {
      const [iso, id] = Buffer.from(cursor, 'base64').toString('utf8').split('|');
      if (!iso || !id) return null;
      return { createdAt: new Date(iso), id };
    } catch {
      return null;
    }
  }
}
