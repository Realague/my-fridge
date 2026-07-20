import {
  StockExitRepository,
  CreateStockExitData,
  ListStockExitsOptions,
  StockExitFilters,
} from '../repositories/StockExitRepository';
import { StoredItemRepository } from '../repositories/StoredItemRepository';
import { StoredItemService } from './StoredItemService';
import { StockExit } from '../models/StockExit';
import { StoredItem } from '../models/StoredItem';
import { StoredItemDto } from '../types/ItemDto';
import { StockExitType, STOCK_EXIT_TYPES, HouseholdActivityAction, HouseholdActivityTargetType } from '../types/enums';
import { BadRequestError, NotFoundError, ValidationError } from '../errors/CustomErrors';
import { HouseholdActivityLogger } from './HouseholdActivityLogger';
import { HouseholdActivityRepository } from '../repositories/HouseholdActivityRepository';

export interface StockExitDto {
  id: string;
  householdId: string;
  storedItemId: string | null;
  itemId: string | null;
  exitType: StockExitType;
  quantity: number;
  unit: string;
  exitedBy: string;
  exitedByName?: string;
  itemName: string | null;
  category?: string | null;
  storageAreaId?: string | null;
  storageAreaName?: string | null;
  expirationDate?: string | null;
  createdAt: string;
}

// Per-type totals over a period (drives the summary band + tab counters).
export interface StockExitStats {
  consumed: number;
  wasted: number;
  removed: number;
}

export interface StockExitStatsResult {
  current: StockExitStats;
  // Comparable previous period (e.g. previous month). null when the caller did
  // not request a comparison (non-month periods, or no previous data).
  previous: StockExitStats | null;
}

// Server-side safety net for undo (client enforces 10s).
const UNDO_WINDOW_MS = 60 * 1000;

// Maps a stock exit's type to the activity-feed action logged alongside it.
const EXIT_TYPE_TO_ACTION: Record<StockExitType, HouseholdActivityAction> = {
  [StockExitType.CONSUMED]: HouseholdActivityAction.ITEM_CONSUMED,
  [StockExitType.WASTED]: HouseholdActivityAction.ITEM_THROWN,
  [StockExitType.REMOVED]: HouseholdActivityAction.ITEM_REMOVED,
};

export class StockExitService {
  private stockExitRepository: StockExitRepository;
  private storedItemRepository: StoredItemRepository;
  private storedItemService: StoredItemService;
  private activityLogger: HouseholdActivityLogger;
  private activityRepo: HouseholdActivityRepository;

  constructor() {
    this.stockExitRepository = new StockExitRepository();
    this.storedItemRepository = new StoredItemRepository();
    this.storedItemService = new StoredItemService();
    this.activityLogger = new HouseholdActivityLogger();
    this.activityRepo = new HouseholdActivityRepository();
  }

  /**
   * Record a stock exit for a stored item. See spec §1a.
   */
  async exitStoredItem(
    householdId: string,
    storedItemId: string,
    userId: string,
    type: string,
    quantity?: number
  ): Promise<{ exit: StockExitDto; remaining: StoredItemDto | null }> {
    if (!STOCK_EXIT_TYPES.includes(type as StockExitType)) {
      throw new ValidationError(`Invalid exit type: ${type}`);
    }
    const exitType = type as StockExitType;

    const requestedQty = quantity === undefined ? 1 : Number(quantity);
    if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
      throw new ValidationError('quantity must be greater than 0');
    }

    const storedItem = await this.storedItemRepository.findById(storedItemId, householdId);
    if (!storedItem) {
      throw new NotFoundError('Stored item not found');
    }

    const currentQuantity = Number(storedItem.quantity);
    const exitQty = Math.min(requestedQty, currentQuantity);

    const restoreSnapshot = this.buildRestoreSnapshot(storedItem);

    const createData: CreateStockExitData = {
      householdId,
      storedItemId: storedItem.id,
      itemId: storedItem.itemId,
      exitType,
      quantity: exitQty,
      unit: storedItem.unit,
      exitedBy: userId,
      itemNameSnapshot: storedItem.item?.name ?? null,
      categorySnapshot: storedItem.item?.category ?? null,
      storageAreaIdSnapshot: storedItem.storageAreaId ?? null,
      storageAreaNameSnapshot: storedItem.storageArea?.name ?? null,
      expirationDateSnapshot: storedItem.expirationDate ? new Date(storedItem.expirationDate) : null,
      restoreSnapshot,
    };

    const exit = await this.stockExitRepository.create(createData);

    // Personalized-search / activity-feed signal. Best-effort (log() swallows
    // its own errors); must never break the exit.
    await this.activityLogger.log({
      householdId,
      userId,
      itemId: storedItem.itemId,
      itemNameSnapshot: storedItem.item?.name ?? null,
      action: EXIT_TYPE_TO_ACTION[exitType],
      targetType: HouseholdActivityTargetType.ITEM,
      targetId: storedItem.id,
      metadata: {
        quantity: exitQty,
        unit: storedItem.unit,
        storageAreaName: storedItem.storageArea?.name ?? null,
      },
    });

    let remaining: StoredItemDto | null = null;
    if (exitQty >= currentQuantity) {
      // Full exit: reuse StoredItemService so one-shot cooked-meal cleanup runs.
      await this.storedItemService.deleteStoredItem(storedItem.id, householdId);
    } else {
      const updated = await this.storedItemRepository.update(storedItem.id, householdId, {
        quantity: currentQuantity - exitQty,
      });
      remaining = updated ? await this.storedItemService.getStoredItemById(storedItem.id, householdId) : null;
    }

    return { exit: this.mapToDto(exit), remaining };
  }

  /**
   * Undo a previously-recorded exit. See spec §1b.
   */
  async undoExit(householdId: string, exitId: string): Promise<{ restored: StoredItemDto }> {
    const exit = await this.stockExitRepository.findById(exitId, householdId);
    if (!exit) {
      throw new NotFoundError('Stock exit not found');
    }

    // Server guard: exits older than 60s are definitive.
    if (Date.now() - new Date(exit.createdAt).getTime() > UNDO_WINDOW_MS) {
      throw new BadRequestError('exit_undo_expired');
    }

    const exitQty = Number(exit.quantity);

    let restored: StoredItemDto | null = null;

    if (exit.storedItemId) {
      // Load INCLUDING soft-deleted rows: a full exit soft-deletes the row.
      const existing = await this.storedItemRepository.findByIdWithDeleted(exit.storedItemId, householdId);
      if (existing) {
        if (existing.deletedAt) {
          // Full exit: the row was soft-deleted with its pre-exit quantity
          // intact. Restore it as-is — do NOT add exit.quantity back.
          await existing.restore();
        } else {
          // Partial exit: the row still exists — increment its quantity back.
          await this.storedItemRepository.update(exit.storedItemId, householdId, {
            quantity: Number(existing.quantity) + exitQty,
          });
        }
        restored = await this.storedItemService.getStoredItemById(exit.storedItemId, householdId);
      }
    }

    if (!restored) {
      // Row is gone entirely (e.g. force-deleted by a cascade): recreate the
      // StoredItem from the snapshot, reusing the original id.
      restored = await this.recreateFromSnapshot(householdId, exit);
    }

    // Hard-delete the log so stats stay accurate.
    await this.stockExitRepository.delete(exitId, householdId);

    // Undo (10s window) must erase the matching activity entry so the feed
    // reflects final state. Best-effort: never break the undo itself.
    if (exit.storedItemId) {
      try {
        await this.activityRepo.deleteRecentForTarget(householdId, exit.storedItemId, [
          HouseholdActivityAction.ITEM_CONSUMED,
          HouseholdActivityAction.ITEM_THROWN,
          HouseholdActivityAction.ITEM_REMOVED,
        ]);
      } catch (e) {
        console.error('[StockExitService] failed to delete activity on undo', e);
      }
    }

    return { restored };
  }

  /**
   * Exit journal for a household, most recent first. Supports optional
   * period / type / member filters + pagination. See spec §1c.
   */
  async listExits(householdId: string, options: ListStockExitsOptions = {}): Promise<StockExitDto[]> {
    const exits = await this.stockExitRepository.findAll(householdId, options);
    return exits.map((exit) => this.mapToDto(exit));
  }

  /**
   * Aggregated per-type counts for the journal summary band. `previous` is
   * computed only when the caller supplies a previous range (frontend owns the
   * period math and requests a comparison for calendar-month periods).
   */
  async getStats(
    householdId: string,
    opts: {
      from?: Date;
      to?: Date;
      previousFrom?: Date;
      previousTo?: Date;
      exitedBy?: string;
    } = {}
  ): Promise<StockExitStatsResult> {
    const { from, to, previousFrom, previousTo, exitedBy } = opts;

    const current = await this.countsFor(householdId, { from, to, exitedBy });

    let previous: StockExitStats | null = null;
    if (previousFrom && previousTo) {
      previous = await this.countsFor(householdId, {
        from: previousFrom,
        to: previousTo,
        exitedBy,
      });
    }

    return { current, previous };
  }

  private async countsFor(householdId: string, filters: StockExitFilters): Promise<StockExitStats> {
    const rows = await this.stockExitRepository.countByType(householdId, filters);
    const stats: StockExitStats = { consumed: 0, wasted: 0, removed: 0 };
    rows.forEach((row) => {
      if (row.exitType in stats) {
        stats[row.exitType as keyof StockExitStats] = row.count;
      }
    });
    return stats;
  }

  private buildRestoreSnapshot(storedItem: StoredItem): Record<string, unknown> {
    return {
      id: storedItem.id,
      itemId: storedItem.itemId,
      storageAreaId: storedItem.storageAreaId,
      quantity: Number(storedItem.quantity),
      unit: storedItem.unit,
      expirationDate: storedItem.expirationDate
        ? new Date(storedItem.expirationDate).toISOString().split('T')[0]
        : null,
      location: storedItem.location,
      isOpened: storedItem.isOpened,
      openedDate: storedItem.openedDate ? new Date(storedItem.openedDate).toISOString().split('T')[0] : null,
      frozenDate: storedItem.frozenDate ? new Date(storedItem.frozenDate).toISOString().split('T')[0] : null,
      cookedDate: storedItem.cookedDate ? new Date(storedItem.cookedDate).toISOString().split('T')[0] : null,
      householdId: storedItem.householdId,
      createdBy: storedItem.createdBy,
    };
  }

  private async recreateFromSnapshot(householdId: string, exit: StockExit): Promise<StoredItemDto> {
    const snapshot = exit.restoreSnapshot;
    if (!snapshot) {
      throw new BadRequestError('Cannot restore this exit: no snapshot available');
    }

    const s = snapshot as {
      id: string;
      itemId: string;
      storageAreaId: string;
      quantity: number;
      unit: string;
      expirationDate: string | null;
      location: string | null;
      isOpened: boolean;
      openedDate: string | null;
      frozenDate: string | null;
      cookedDate: string | null;
      householdId: string;
      createdBy: string;
    };

    await StoredItem.create({
      id: s.id,
      itemId: s.itemId,
      storageAreaId: s.storageAreaId,
      quantity: s.quantity,
      unit: s.unit as StoredItem['unit'],
      expirationDate: s.expirationDate ? new Date(s.expirationDate) : null,
      location: s.location,
      isOpened: s.isOpened,
      openedDate: s.openedDate ? new Date(s.openedDate) : null,
      frozenDate: s.frozenDate ? new Date(s.frozenDate) : null,
      cookedDate: s.cookedDate ? new Date(s.cookedDate) : null,
      householdId: s.householdId ?? householdId,
      createdBy: s.createdBy,
    });

    const dto = await this.storedItemService.getStoredItemById(s.id, householdId);
    if (!dto) {
      throw new BadRequestError('Failed to restore stored item');
    }
    return dto;
  }

  private mapToDto(exit: StockExit): StockExitDto {
    const exitedByName = exit.exitedByUser
      ? `${exit.exitedByUser.firstName} ${exit.exitedByUser.lastName}`.trim()
      : undefined;

    return {
      id: exit.id,
      householdId: exit.householdId,
      storedItemId: exit.storedItemId,
      itemId: exit.itemId,
      exitType: exit.exitType,
      quantity: Number(exit.quantity),
      unit: exit.unit,
      exitedBy: exit.exitedBy,
      exitedByName,
      itemName: exit.itemNameSnapshot,
      category: exit.categorySnapshot,
      storageAreaId: exit.storageAreaIdSnapshot,
      storageAreaName: exit.storageAreaNameSnapshot,
      expirationDate: exit.expirationDateSnapshot
        ? new Date(exit.expirationDateSnapshot).toISOString().split('T')[0]
        : null,
      createdAt: new Date(exit.createdAt).toISOString(),
    };
  }
}
