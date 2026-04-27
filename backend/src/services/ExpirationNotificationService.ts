import { ExpirationNotificationRepository } from '../repositories/ExpirationNotificationRepository';
import { HouseholdRepository } from '../repositories/HouseholdRepository';
import { HouseholdSettingsService } from './HouseholdSettingsService';
import { StoredItem } from '../models/StoredItem';
import { Item } from '../models/Item';
import { StorageArea } from '../models/StorageArea';
import { ExpirationNotification } from '../models/ExpirationNotification';
import { StorageAreaType } from '../types/enums';
import { NotFoundError, UnauthorizedError } from '../errors/CustomErrors';

export type ExpirationUrgency = 'expired' | 'today' | 'tomorrow' | 'soon';

export interface ExpirationNotificationDto {
  id: string;
  storedItemId: string | null;
  phase: 'initial' | 'reminder';
  itemName: string;
  itemHouseholdId: string | null;
  storageAreaId: string | null;
  storageAreaName: string | null;
  expirationDate: string;
  isOpened: boolean;
  openedDate: string | null;
  quantity: number | null;
  unit: string | null;
  createdAt: Date;
  readByCurrentUser: boolean;
}

export interface NotificationListResponseDto {
  notifications: ExpirationNotificationDto[];
  unreadCount: number;
}

export interface ExpiringNowItemDto {
  storedItemId: string;
  itemId: string;
  itemName: string;
  itemHouseholdId: string | null;
  itemImageUrl: string | null;
  storageAreaId: string;
  storageAreaName: string;
  storageAreaType: StorageAreaType;
  quantity: number;
  unit: string;
  isOpened: boolean;
  openedDate: string | null;
  expirationDate: string;
  daysUntilExpiration: number;
  urgency: ExpirationUrgency;
}

export interface ExpiringNowResponseDto {
  alertDays: number;
  total: number;
  items: ExpiringNowItemDto[];
}

const PRUNE_DAYS = 30;

export class ExpirationNotificationService {
  constructor(
    private notificationRepository: ExpirationNotificationRepository,
    private householdRepository: HouseholdRepository,
    private settingsService: HouseholdSettingsService
  ) {}

  async getNotificationsForHousehold(
    householdId: string,
    userId: string
  ): Promise<NotificationListResponseDto> {
    await this.assertMember(householdId, userId);
    await this.syncForHousehold(householdId);

    const rows = await this.notificationRepository.listByHouseholdWithReadState(householdId, userId);
    const notifications = rows.map((row) => this.toDto(row.notification, row.readByCurrentUser));
    const unreadCount = notifications.filter((n) => !n.readByCurrentUser).length;
    return { notifications, unreadCount };
  }

  async markRead(householdId: string, userId: string, notificationId: string): Promise<void> {
    await this.assertMember(householdId, userId);
    const notification = await this.notificationRepository.findByIdInHousehold(notificationId, householdId);
    if (!notification) throw new NotFoundError('Notification not found');
    await this.notificationRepository.markRead(notificationId, userId);
  }

  async markAllRead(householdId: string, userId: string): Promise<void> {
    await this.assertMember(householdId, userId);
    await this.notificationRepository.markAllReadForHousehold(householdId, userId);
  }

  async deleteNotification(householdId: string, userId: string, notificationId: string): Promise<void> {
    await this.assertMember(householdId, userId);
    const deleted = await this.notificationRepository.delete(notificationId, householdId);
    if (!deleted) throw new NotFoundError('Notification not found');
  }

  async clearAll(householdId: string, userId: string): Promise<void> {
    await this.assertMember(householdId, userId);
    await this.notificationRepository.clearHousehold(householdId);
  }

  async getExpiringNow(householdId: string, userId: string): Promise<ExpiringNowResponseDto> {
    await this.assertMember(householdId, userId);
    const alertDays = await this.settingsService.getAlertDaysForHousehold(householdId);

    const storedItems = await this.loadStoredItems(householdId);

    const items: ExpiringNowItemDto[] = [];
    for (const storedItem of storedItems) {
      const storageArea = storedItem.storageArea;
      if (!storageArea || storageArea.type === StorageAreaType.FREEZER) continue;

      const effectiveDate = storedItem.getEffectiveExpirationDate();
      if (!effectiveDate) continue;

      const daysUntil = this.diffInDays(effectiveDate);

      // Show: expired (past), today (0), or within alertDays window (positive, <= alertDays)
      const include = daysUntil <= alertDays;
      if (!include) continue;

      let urgency: ExpirationUrgency;
      if (daysUntil < 0) urgency = 'expired';
      else if (daysUntil === 0) urgency = 'today';
      else if (daysUntil === 1) urgency = 'tomorrow';
      else urgency = 'soon';

      items.push({
        storedItemId: storedItem.id,
        itemId: storedItem.itemId,
        itemName: storedItem.item?.name ?? 'Item',
        itemHouseholdId: storedItem.item?.householdId ?? null,
        itemImageUrl: storedItem.item?.imageUrl ?? null,
        storageAreaId: storageArea.id,
        storageAreaName: storageArea.name,
        storageAreaType: storageArea.type,
        quantity: Number(storedItem.quantity),
        unit: storedItem.unit,
        isOpened: storedItem.isOpened,
        openedDate: storedItem.openedDate ? this.toIsoDate(storedItem.openedDate) : null,
        expirationDate: this.toIsoDate(effectiveDate),
        daysUntilExpiration: daysUntil,
        urgency,
      });
    }

    items.sort((a, b) => {
      const order: Record<ExpirationUrgency, number> = {
        expired: 0,
        today: 1,
        tomorrow: 2,
        soon: 3,
      };
      const cmp = order[a.urgency] - order[b.urgency];
      if (cmp !== 0) return cmp;
      return a.daysUntilExpiration - b.daysUntilExpiration;
    });

    return { alertDays, total: items.length, items };
  }

  /**
   * Lazy generation: create missing notifications for items that should have one
   * given the current household alert window. Idempotent via unique(storedItemId, phase).
   */
  async syncForHousehold(householdId: string): Promise<void> {
    await this.notificationRepository.pruneOlderThan(this.daysAgo(PRUNE_DAYS));

    const alertDays = await this.settingsService.getAlertDaysForHousehold(householdId);
    const storedItems = await this.loadStoredItems(householdId);

    const toInsert: Parameters<ExpirationNotificationRepository['bulkUpsertSkippingConflict']>[0] = [];

    for (const storedItem of storedItems) {
      const storageArea = storedItem.storageArea;
      if (!storageArea || storageArea.type === StorageAreaType.FREEZER) continue;

      const effectiveDate = storedItem.getEffectiveExpirationDate();
      if (!effectiveDate) continue;

      const daysUntil = this.diffInDays(effectiveDate);
      if (daysUntil < 1) continue; // expired or today: no drawer entry per spec

      const baseSnapshot = {
        householdId,
        storedItemId: storedItem.id,
        itemNameSnapshot: storedItem.item?.name ?? 'Item',
        itemHouseholdIdSnapshot: storedItem.item?.householdId ?? null,
        storageAreaNameSnapshot: storageArea.name ?? null,
        storageAreaIdSnapshot: storageArea.id ?? null,
        expirationDateSnapshot: effectiveDate,
        isOpenedSnapshot: storedItem.isOpened,
        openedDateSnapshot: storedItem.openedDate ? new Date(storedItem.openedDate) : null,
        quantitySnapshot: Number(storedItem.quantity),
        unitSnapshot: storedItem.unit,
      };

      // initial: only when alertDays > 1 AND item is within the window (1 < daysUntil <= alertDays)
      if (alertDays > 1 && daysUntil > 1 && daysUntil <= alertDays) {
        toInsert.push({ ...baseSnapshot, phase: 'initial' });
      }
      // reminder: at J-1
      if (daysUntil === 1) {
        toInsert.push({ ...baseSnapshot, phase: 'reminder' });
      }
    }

    await this.notificationRepository.bulkUpsertSkippingConflict(toInsert);
  }

  private async loadStoredItems(householdId: string): Promise<StoredItem[]> {
    return await StoredItem.findAll({
      where: { householdId },
      include: [
        { model: Item, as: 'item' },
        { model: StorageArea, as: 'storageArea' },
      ],
    });
  }

  private toDto(notification: ExpirationNotification, readByCurrentUser: boolean): ExpirationNotificationDto {
    return {
      id: notification.id,
      storedItemId: notification.storedItemId,
      phase: notification.phase,
      itemName: notification.itemNameSnapshot,
      itemHouseholdId: notification.itemHouseholdIdSnapshot ?? null,
      storageAreaId: notification.storageAreaIdSnapshot,
      storageAreaName: notification.storageAreaNameSnapshot,
      expirationDate: this.toIsoDate(notification.expirationDateSnapshot),
      isOpened: notification.isOpenedSnapshot,
      openedDate: notification.openedDateSnapshot ? this.toIsoDate(notification.openedDateSnapshot) : null,
      quantity: notification.quantitySnapshot !== null ? Number(notification.quantitySnapshot) : null,
      unit: notification.unitSnapshot,
      createdAt: notification.createdAt,
      readByCurrentUser,
    };
  }

  private async assertMember(householdId: string, userId: string): Promise<void> {
    const household = await this.householdRepository.findById(householdId);
    if (!household) throw new NotFoundError('Household not found');
    const isMember = await this.householdRepository.isMember(householdId, userId);
    if (!isMember) throw new UnauthorizedError('Access denied. You are not a member of this household.');
  }

  private diffInDays(target: Date): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(target);
    const endStart = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const diffMs = endStart.getTime() - start.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  private daysAgo(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }

  private toIsoDate(d: Date | string): string {
    if (typeof d === 'string') return d;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
