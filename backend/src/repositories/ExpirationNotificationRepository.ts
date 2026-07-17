import { Op, Transaction } from 'sequelize';
import { ExpirationNotification } from '../models/ExpirationNotification';
import { ExpirationNotificationRead } from '../models/ExpirationNotificationRead';

type NewNotificationInput = {
  householdId: string;
  storedItemId: string;
  phase: 'initial' | 'reminder' | 'exit_suggestion';
  itemNameSnapshot: string;
  itemHouseholdIdSnapshot: string | null;
  storageAreaNameSnapshot: string | null;
  storageAreaIdSnapshot: string | null;
  expirationDateSnapshot: Date;
  isOpenedSnapshot: boolean;
  openedDateSnapshot: Date | null;
  quantitySnapshot: number | null;
  unitSnapshot: string | null;
};

export type ExpirationNotificationWithRead = {
  notification: ExpirationNotification;
  readByCurrentUser: boolean;
};

export class ExpirationNotificationRepository {
  async bulkUpsertSkippingConflict(rows: NewNotificationInput[]): Promise<ExpirationNotification[]> {
    if (rows.length === 0) return [];

    // Identify pre-existing rows (storedItemId, phase) so we can return only the
    // notifications actually inserted by this call.
    const candidateKeys = rows.map((r) => ({ storedItemId: r.storedItemId, phase: r.phase }));
    const storedItemIds = Array.from(new Set(candidateKeys.map((k) => k.storedItemId)));
    const phases = Array.from(new Set(candidateKeys.map((k) => k.phase)));

    const existing = await ExpirationNotification.findAll({
      where: {
        storedItemId: { [Op.in]: storedItemIds },
        phase: { [Op.in]: phases },
      },
      attributes: ['storedItemId', 'phase'],
    });
    const existingKeys = new Set(existing.map((e) => `${e.storedItemId}::${e.phase}`));

    await ExpirationNotification.bulkCreate(rows, { ignoreDuplicates: true });

    const newKeys = rows.filter((r) => !existingKeys.has(`${r.storedItemId}::${r.phase}`));
    if (newKeys.length === 0) return [];

    // Re-query the just-inserted rows by their (storedItemId, phase) tuples.
    const inserted = await ExpirationNotification.findAll({
      where: {
        [Op.or]: newKeys.map((k) => ({ storedItemId: k.storedItemId, phase: k.phase })),
      },
    });
    return inserted;
  }

  async listByHouseholdWithReadState(
    householdId: string,
    userId: string
  ): Promise<ExpirationNotificationWithRead[]> {
    const notifications = await ExpirationNotification.findAll({
      where: { householdId },
      include: [
        {
          model: ExpirationNotificationRead,
          as: 'reads',
          where: { userId },
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return notifications.map((n) => {
      const reads = (n as any).reads as ExpirationNotificationRead[] | undefined;
      return {
        notification: n,
        readByCurrentUser: Array.isArray(reads) && reads.length > 0,
      };
    });
  }

  async findByIdInHousehold(id: string, householdId: string): Promise<ExpirationNotification | null> {
    return await ExpirationNotification.findOne({ where: { id, householdId } });
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await ExpirationNotificationRead.findOrCreate({
      where: { notificationId, userId },
      defaults: { notificationId, userId, readAt: new Date() },
    });
  }

  async markAllReadForHousehold(householdId: string, userId: string): Promise<void> {
    const ids = (
      await ExpirationNotification.findAll({
        where: { householdId },
        attributes: ['id'],
      })
    ).map((n) => n.id);

    if (ids.length === 0) return;

    const existing = await ExpirationNotificationRead.findAll({
      where: { userId, notificationId: { [Op.in]: ids } },
      attributes: ['notificationId'],
    });
    const existingIds = new Set(existing.map((e) => e.notificationId));
    const toInsert = ids
      .filter((id) => !existingIds.has(id))
      .map((id) => ({ notificationId: id, userId, readAt: new Date() }));

    if (toInsert.length > 0) {
      await ExpirationNotificationRead.bulkCreate(toInsert, { ignoreDuplicates: true });
    }
  }

  async delete(notificationId: string, householdId: string): Promise<boolean> {
    const result = await ExpirationNotification.destroy({
      where: { id: notificationId, householdId },
    });
    return result > 0;
  }

  async clearHousehold(householdId: string): Promise<void> {
    await ExpirationNotification.destroy({ where: { householdId } });
  }

  /**
   * Remove every expiration notification tied to a stored item — used when the
   * item leaves the stock (consumed/wasted/removed) so stale alerts don't linger.
   * Accepts an optional transaction so it can run atomically inside recipe consume.
   */
  async deleteByStoredItemId(
    storedItemId: string,
    options?: { transaction?: Transaction }
  ): Promise<number> {
    return await ExpirationNotification.destroy({
      where: { storedItemId },
      transaction: options?.transaction,
    });
  }

  async pruneOlderThan(date: Date): Promise<number> {
    return await ExpirationNotification.destroy({
      where: { createdAt: { [Op.lt]: date } },
    });
  }
}
