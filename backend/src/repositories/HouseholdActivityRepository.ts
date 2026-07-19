import { Transaction, Op, fn, col, literal } from 'sequelize';
import { HouseholdActivity } from '../models/HouseholdActivity';
import { HouseholdActivityAction } from '../types/enums';

export interface CreateHouseholdActivityData {
  householdId: string;
  userId: string;
  itemId: string | null;
  itemNameSnapshot: string | null;
  action: HouseholdActivityAction;
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
}
