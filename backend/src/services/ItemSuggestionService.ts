import { HouseholdActivityRepository } from '../repositories/HouseholdActivityRepository';
import { ItemRepository } from '../repositories/ItemRepository';
import { HouseholdRepository } from '../repositories/HouseholdRepository';
import { ItemDto } from '../types/ItemDto';
import { formatItemDto } from '../utils/itemFormatter';

const WINDOW_DAYS = 30;
const RECENT_LIMIT = 5;
const PERSONAL_LIMIT = 8;
const HOUSEHOLD_LIMIT = 5;
// Over-fetch frequents so dedup against higher-priority sections can't starve a
// section below its display limit.
const FETCH_MULTIPLIER = 4;

export interface RecentItemDto extends ItemDto {
  lastSelectedAt: string;
}

export interface ItemSuggestionsResult {
  recent: RecentItemDto[];
  personalFrequent: ItemDto[];
  householdFrequent: ItemDto[];
}

export class ItemSuggestionService {
  private activityRepository: HouseholdActivityRepository;
  private itemRepository: ItemRepository;
  private householdRepository: HouseholdRepository;

  constructor() {
    this.activityRepository = new HouseholdActivityRepository();
    this.itemRepository = new ItemRepository();
    this.householdRepository = new HouseholdRepository();
  }

  async getSuggestions(householdId: string, userId: string): Promise<ItemSuggestionsResult> {
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [recentRefs, personalFreq, householdFreqRaw, memberCount] = await Promise.all([
      this.activityRepository.getRecentItemRefs(householdId, userId, RECENT_LIMIT),
      this.activityRepository.getFrequent(householdId, since, PERSONAL_LIMIT * FETCH_MULTIPLIER, userId),
      this.activityRepository.getFrequent(householdId, since, HOUSEHOLD_LIMIT * FETCH_MULTIPLIER),
      this.householdRepository.getMemberCount(householdId),
    ]);

    // Mono-member household: "Populaires dans le foyer" duplicates "Souvent
    // utilisés", so it is suppressed (spec §7).
    const householdFreq = memberCount > 1 ? householdFreqRaw : [];

    // Hydrate every referenced id in one batch; missing ids (deleted items)
    // silently drop out.
    const allIds = Array.from(
      new Set([
        ...recentRefs.map((r) => r.itemId),
        ...personalFreq.map((f) => f.itemId),
        ...householdFreq.map((f) => f.itemId),
      ])
    );
    const items = await this.itemRepository.findByIds(allIds);
    const byId = new Map(items.map((it) => [it.id, it]));

    // Dedup across sections in priority order: recent → personal → household.
    const used = new Set<string>();

    const recent: RecentItemDto[] = [];
    for (const ref of recentRefs) {
      const item = byId.get(ref.itemId);
      if (!item || used.has(ref.itemId)) continue;
      used.add(ref.itemId);
      recent.push({ ...formatItemDto(item), lastSelectedAt: ref.lastSelectedAt.toISOString() });
    }

    const personalFrequent = this.pick(personalFreq, byId, used, PERSONAL_LIMIT);
    const householdFrequent = this.pick(householdFreq, byId, used, HOUSEHOLD_LIMIT);

    return { recent, personalFrequent, householdFrequent };
  }

  private pick(
    freq: Array<{ itemId: string; count: number }>,
    byId: Map<string, import('../models/Item').Item>,
    used: Set<string>,
    limit: number
  ): ItemDto[] {
    const out: ItemDto[] = [];
    for (const f of freq) {
      if (out.length >= limit) break;
      const item = byId.get(f.itemId);
      if (!item || used.has(f.itemId)) continue;
      used.add(f.itemId);
      out.push(formatItemDto(item));
    }
    return out;
  }
}
