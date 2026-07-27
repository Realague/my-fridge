import {
  HouseholdStatsRepository,
  type DateRange,
  type StatsExitRow,
  type HouseholdMemberRow,
} from '../repositories/HouseholdStatsRepository';
import { Household } from '../models/Household';
import { NotFoundError } from '../errors/CustomErrors';
import { HouseholdActivityAction, ItemCategory, StockExitType } from '../types/enums';

// A household younger than this has no meaningful month-over-month history:
// trend badges are hidden and the frontend shows the "come back later" nudge.
const RECENT_HOUSEHOLD_DAYS = 14;

// "Sauvé in extremis" = consumed within this many days before expiry.
const SAVED_WINDOW_DAYS = 2;

const TOP_WASTED_CATEGORIES = 5;
const KEEP_TIME_CATEGORIES = 6;
const TOP_DISH_CATEGORIES = 3;

// A single member owning more than this share of the stock additions triggers
// the (never comparative) "faire équipe" nudge.
const TEAM_NUDGE_SHARE = 0.55;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Dish typing derived from the categories of a recipe's ingredients. */
export type DishCategory = 'meat' | 'fish' | 'vegetarian';

export interface StatsRangesInput {
  from?: Date;
  to?: Date;
  previousFrom?: Date;
  previousTo?: Date;
  trendFrom?: Date;
  trendTo?: Date;
  /** `Date.prototype.getTimezoneOffset()` of the caller, for month bucketing. */
  tzOffsetMinutes: number;
}

export interface StatsMetaDto {
  householdAgeDays: number;
  isRecentHousehold: boolean;
  hasAnyData: boolean;
  memberCount: number;
  comparisonAvailable: boolean;
}

export interface TrendPointDto {
  /** Calendar month in the caller's timezone, `YYYY-MM`. */
  month: string;
  usageRate: number | null;
  cookedCount: number;
}

export interface WasteStatsDto {
  consumed: number;
  wasted: number;
  usageRate: number | null;
  usageRateDelta: number | null;
  savedJustInTime: number;
  topWastedCategories: Array<{ category: string; count: number }>;
  averageKeepDays: Array<{ category: string; days: number }>;
}

export interface CookingStatsDto {
  cookedCount: number;
  cookedCountDelta: number | null;
  distinctRecipes: number;
  mealPlanCompletion: number | null;
  favoriteRecipe: { title: string | null; count: number } | null;
  topDishCategories: Array<{ category: DishCategory; count: number }>;
}

export interface MemberContributionDto {
  userId: string;
  name: string | null;
  adds: number;
  cooks: number;
  shoppingChecks: number;
}

export interface HouseholdContributionDto {
  isSolo: boolean;
  members: MemberContributionDto[];
  totals: { adds: number; cooks: number; shoppingChecks: number };
  showTeamNudge: boolean;
}

export interface HouseholdStatsSummaryDto {
  meta: StatsMetaDto;
  waste: Pick<WasteStatsDto, 'consumed' | 'wasted' | 'usageRate' | 'usageRateDelta'>;
  cooking: Pick<CookingStatsDto, 'cookedCount' | 'cookedCountDelta' | 'distinctRecipes'>;
  /** Monthly series behind the "En cuisine" sparkline. */
  trend: TrendPointDto[];
}

export interface HouseholdStatsDto {
  meta: StatsMetaDto;
  waste: WasteStatsDto;
  cooking: CookingStatsDto;
  household: HouseholdContributionDto;
  trend: TrendPointDto[];
}

export class HouseholdStatsService {
  private repo: HouseholdStatsRepository;

  constructor(repo?: HouseholdStatsRepository) {
    this.repo = repo || new HouseholdStatsRepository();
  }

  /**
   * Dashboard cards: current-month figures plus the monthly series feeding the
   * "En cuisine" sparkline. The "Anti-gaspi" card reads its gauge straight from
   * `waste.usageRate` and needs no series of its own.
   */
  async getSummary(
    householdId: string,
    ranges: StatsRangesInput
  ): Promise<HouseholdStatsSummaryDto> {
    const range: DateRange = { from: ranges.from, to: ranges.to };
    const meta = await this.buildMeta(householdId, ranges);

    const [exits, cookedMeals] = await Promise.all([
      this.repo.findExits(householdId, range),
      this.repo.findCookedMeals(householdId, range),
    ]);

    const counts = this.countExits(exits);
    const previous = await this.previousCounts(householdId, ranges, meta.comparisonAvailable);
    const trend = await this.buildTrend(householdId, ranges);

    return {
      meta,
      waste: {
        consumed: counts.consumed,
        wasted: counts.wasted,
        usageRate: counts.usageRate,
        usageRateDelta: this.pointsDelta(counts.usageRate, previous?.usageRate ?? null),
      },
      cooking: {
        cookedCount: cookedMeals.length,
        cookedCountDelta:
          previous === null ? null : cookedMeals.length - previous.cookedCount,
        distinctRecipes: new Set(cookedMeals.map((m) => m.recipeId)).size,
      },
      trend,
    };
  }

  /** Detail page: the three blocks for the selected period. */
  async getStats(householdId: string, ranges: StatsRangesInput): Promise<HouseholdStatsDto> {
    const range: DateRange = { from: ranges.from, to: ranges.to };
    const meta = await this.buildMeta(householdId, ranges);

    const [exits, cookedMeals, plannedMeals] = await Promise.all([
      this.repo.findExits(householdId, range),
      this.repo.findCookedMeals(householdId, range),
      this.repo.countPlannedMeals(householdId, range),
    ]);

    const counts = this.countExits(exits);
    const previous = await this.previousCounts(householdId, ranges, meta.comparisonAvailable);

    // "Recette fétiche" is always read over the last 3 months, independently of
    // the selected period (spec).
    const favoriteSince = new Date(Date.now() - 90 * DAY_MS);
    const [favorite, dishCategories, contribution, trend] = await Promise.all([
      this.repo.findFavoriteRecipe(householdId, favoriteSince),
      this.buildDishCategories(cookedMeals.map((m) => m.recipeId)),
      this.buildContribution(householdId, range),
      this.buildTrend(householdId, ranges),
    ]);

    return {
      meta,
      waste: {
        consumed: counts.consumed,
        wasted: counts.wasted,
        usageRate: counts.usageRate,
        usageRateDelta: this.pointsDelta(counts.usageRate, previous?.usageRate ?? null),
        savedJustInTime: this.countSavedJustInTime(exits, ranges.tzOffsetMinutes),
        topWastedCategories: this.topWastedCategories(exits),
        averageKeepDays: this.averageKeepDays(exits),
      },
      cooking: {
        cookedCount: cookedMeals.length,
        cookedCountDelta: previous === null ? null : cookedMeals.length - previous.cookedCount,
        distinctRecipes: new Set(cookedMeals.map((m) => m.recipeId)).size,
        mealPlanCompletion:
          plannedMeals.planned === 0
            ? null
            : Math.round((plannedMeals.cooked / plannedMeals.planned) * 100),
        favoriteRecipe: favorite ? { title: favorite.title, count: favorite.count } : null,
        topDishCategories: dishCategories,
      },
      household: contribution,
      trend,
    };
  }

  // ---------------------------------------------------------------- meta ---

  private async buildMeta(
    householdId: string,
    ranges: StatsRangesInput
  ): Promise<StatsMetaDto> {
    const household = await Household.findByPk(householdId, { attributes: ['id', 'createdAt'] });
    if (!household) throw new NotFoundError('Household not found');

    const ageDays = Math.floor((Date.now() - new Date(household.createdAt).getTime()) / DAY_MS);
    const isRecent = ageDays < RECENT_HOUSEHOLD_DAYS;

    const [hasAnyData, members] = await Promise.all([
      this.repo.hasAnyData(householdId),
      this.repo.findActiveMembers(householdId),
    ]);

    // A comparison needs an explicit previous range, an old-enough household,
    // and something to compare against on the previous side.
    let comparisonAvailable = false;
    if (!isRecent && ranges.previousFrom && ranges.previousTo) {
      const previousRange: DateRange = { from: ranges.previousFrom, to: ranges.previousTo };
      const [previousExits, previousCooked] = await Promise.all([
        this.repo.findExits(householdId, previousRange),
        this.repo.findCookedMeals(householdId, previousRange),
      ]);
      comparisonAvailable = previousExits.length > 0 || previousCooked.length > 0;
    }

    return {
      householdAgeDays: ageDays,
      isRecentHousehold: isRecent,
      hasAnyData,
      memberCount: members.length,
      comparisonAvailable,
    };
  }

  private async previousCounts(
    householdId: string,
    ranges: StatsRangesInput,
    comparisonAvailable: boolean
  ): Promise<{ usageRate: number | null; cookedCount: number } | null> {
    if (!comparisonAvailable || !ranges.previousFrom || !ranges.previousTo) return null;

    const previousRange: DateRange = { from: ranges.previousFrom, to: ranges.previousTo };
    const [exits, cooked] = await Promise.all([
      this.repo.findExits(householdId, previousRange),
      this.repo.findCookedMeals(householdId, previousRange),
    ]);

    return { usageRate: this.countExits(exits).usageRate, cookedCount: cooked.length };
  }

  // --------------------------------------------------------------- waste ---

  /**
   * Usage rate ignores `removed` exits on purpose: an article pulled out of
   * stock for another reason was neither eaten nor wasted.
   */
  private countExits(exits: StatsExitRow[]): {
    consumed: number;
    wasted: number;
    usageRate: number | null;
  } {
    let consumed = 0;
    let wasted = 0;
    for (const exit of exits) {
      if (exit.exitType === StockExitType.CONSUMED) consumed += 1;
      else if (exit.exitType === StockExitType.WASTED) wasted += 1;
    }
    const total = consumed + wasted;
    return { consumed, wasted, usageRate: total === 0 ? null : Math.round((consumed / total) * 100) };
  }

  private pointsDelta(current: number | null, previous: number | null): number | null {
    if (current === null || previous === null) return null;
    return current - previous;
  }

  private countSavedJustInTime(exits: StatsExitRow[], tzOffsetMinutes: number): number {
    let saved = 0;
    for (const exit of exits) {
      if (exit.exitType !== StockExitType.CONSUMED || !exit.expirationDate) continue;
      // expirationDateSnapshot is a DATEONLY (midnight UTC); compare it to the
      // exit's calendar day in the caller's timezone.
      const [year, month, day] = this.localYmd(exit.createdAt, tzOffsetMinutes);
      const exitDay = Date.UTC(year, month, day);
      const expiryDay = Date.UTC(
        exit.expirationDate.getUTCFullYear(),
        exit.expirationDate.getUTCMonth(),
        exit.expirationDate.getUTCDate()
      );
      const daysLeft = Math.round((expiryDay - exitDay) / DAY_MS);
      if (daysLeft >= 0 && daysLeft <= SAVED_WINDOW_DAYS) saved += 1;
    }
    return saved;
  }

  private topWastedCategories(exits: StatsExitRow[]): Array<{ category: string; count: number }> {
    const counts = new Map<string, number>();
    for (const exit of exits) {
      if (exit.exitType !== StockExitType.WASTED) continue;
      const category = exit.category ?? ItemCategory.OTHER;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category))
      .slice(0, TOP_WASTED_CATEGORIES);
  }

  /**
   * Average shelf life per category, measured on consumed articles only: how
   * long the article sat in stock before it was eaten.
   */
  private averageKeepDays(exits: StatsExitRow[]): Array<{ category: string; days: number }> {
    const buckets = new Map<string, { total: number; count: number }>();
    for (const exit of exits) {
      if (exit.exitType !== StockExitType.CONSUMED || !exit.storedItemCreatedAt) continue;
      const days = (exit.createdAt.getTime() - exit.storedItemCreatedAt.getTime()) / DAY_MS;
      if (!Number.isFinite(days) || days < 0) continue;
      const category = exit.category ?? ItemCategory.OTHER;
      const bucket = buckets.get(category) ?? { total: 0, count: 0 };
      bucket.total += days;
      bucket.count += 1;
      buckets.set(category, bucket);
    }
    return [...buckets.entries()]
      .map(([category, b]) => ({ category, days: Math.round(b.total / b.count) }))
      .sort((a, b) => b.days - a.days || a.category.localeCompare(b.category))
      .slice(0, KEEP_TIME_CATEGORIES);
  }

  // ------------------------------------------------------------- cooking ---

  /**
   * Types each cooked meal from its recipe's ingredients — meat wins over fish,
   * fish over vegetarian. Recipes with no ingredient on file are left out
   * rather than defaulting to "vegetarian".
   */
  private async buildDishCategories(
    cookedRecipeIds: string[]
  ): Promise<Array<{ category: DishCategory; count: number }>> {
    if (cookedRecipeIds.length === 0) return [];

    const categoriesByRecipe = await this.repo.findRecipeIngredientCategories([
      ...new Set(cookedRecipeIds),
    ]);

    const counts = new Map<DishCategory, number>();
    for (const recipeId of cookedRecipeIds) {
      const categories = categoriesByRecipe.get(recipeId);
      if (!categories || categories.size === 0) continue;
      const dish: DishCategory = categories.has(ItemCategory.MEAT)
        ? 'meat'
        : categories.has(ItemCategory.FISH) || categories.has(ItemCategory.SEAFOOD)
          ? 'fish'
          : 'vegetarian';
      counts.set(dish, (counts.get(dish) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category))
      .slice(0, TOP_DISH_CATEGORIES);
  }

  // ----------------------------------------------------------- household ---

  /**
   * Per-member contribution. Never ranked: members come back in a stable order
   * (active members first, alphabetically), and the frontend only ever lists
   * them.
   */
  private async buildContribution(
    householdId: string,
    range: DateRange
  ): Promise<HouseholdContributionDto> {
    const [members, adds, cooks, checks] = await Promise.all([
      this.repo.findActiveMembers(householdId),
      this.repo.countActivitiesByUser(householdId, HouseholdActivityAction.ITEM_ADDED, range),
      this.repo.countActivitiesByUser(householdId, HouseholdActivityAction.RECIPE_COOKED, range),
      this.repo.countActivitiesByUser(householdId, HouseholdActivityAction.SHOPPING_CHECKED, range),
    ]);

    const byUser = (rows: Array<{ userId: string; count: number }>) =>
      new Map(rows.map((r) => [r.userId, r.count]));
    const addMap = byUser(adds);
    const cookMap = byUser(cooks);
    const checkMap = byUser(checks);

    // Former members who contributed during the period still show up, so the
    // per-member figures always add up to the household total.
    const activeIds = new Set(members.map((m) => m.userId));
    const contributorIds = [...new Set([...addMap.keys(), ...cookMap.keys(), ...checkMap.keys()])];
    const formerIds = contributorIds.filter((id) => !activeIds.has(id));
    const formerMembers = await this.repo.findUsers(formerIds);

    const toName = (m: HouseholdMemberRow) =>
      [m.firstName?.trim(), m.lastName?.trim()].filter(Boolean).join(' ') || null;

    const all = [...members, ...formerMembers].map((m) => ({
      userId: m.userId,
      name: toName(m),
      adds: addMap.get(m.userId) ?? 0,
      cooks: cookMap.get(m.userId) ?? 0,
      shoppingChecks: checkMap.get(m.userId) ?? 0,
    }));
    all.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

    const totals = all.reduce(
      (acc, m) => ({
        adds: acc.adds + m.adds,
        cooks: acc.cooks + m.cooks,
        shoppingChecks: acc.shoppingChecks + m.shoppingChecks,
      }),
      { adds: 0, cooks: 0, shoppingChecks: 0 }
    );

    const topShare = totals.adds > 0 ? Math.max(...all.map((m) => m.adds)) / totals.adds : 0;

    return {
      isSolo: members.length <= 1,
      members: all,
      totals,
      showTeamNudge: members.length > 1 && totals.adds > 0 && topShare > TEAM_NUDGE_SHARE,
    };
  }

  // ----------------------------------------------------------------- trend ---

  /**
   * Monthly usage rate + cooked count over the trend window, bucketed in the
   * caller's timezone. Months with no exit report a null rate so the frontend
   * can decide whether to draw them.
   */
  private async buildTrend(
    householdId: string,
    ranges: StatsRangesInput
  ): Promise<TrendPointDto[]> {
    if (!ranges.trendFrom || !ranges.trendTo) return [];

    const range: DateRange = { from: ranges.trendFrom, to: ranges.trendTo };
    const [exits, cooked] = await Promise.all([
      this.repo.findExits(householdId, range),
      this.repo.findCookedMeals(householdId, range),
    ]);

    const months = this.monthKeys(ranges.trendFrom, ranges.trendTo, ranges.tzOffsetMinutes);
    const buckets = new Map<string, { consumed: number; wasted: number; cooked: number }>(
      months.map((m) => [m, { consumed: 0, wasted: 0, cooked: 0 }])
    );

    for (const exit of exits) {
      const bucket = buckets.get(this.monthKey(exit.createdAt, ranges.tzOffsetMinutes));
      if (!bucket) continue;
      if (exit.exitType === StockExitType.CONSUMED) bucket.consumed += 1;
      else if (exit.exitType === StockExitType.WASTED) bucket.wasted += 1;
    }
    for (const meal of cooked) {
      const bucket = buckets.get(this.monthKey(meal.cookedAt, ranges.tzOffsetMinutes));
      if (bucket) bucket.cooked += 1;
    }

    return months.map((month) => {
      const b = buckets.get(month)!;
      const total = b.consumed + b.wasted;
      return {
        month,
        usageRate: total === 0 ? null : Math.round((b.consumed / total) * 100),
        cookedCount: b.cooked,
      };
    });
  }

  /** Calendar Y/M/D of a UTC instant, in the caller's timezone. */
  private localYmd(date: Date, tzOffsetMinutes: number): [number, number, number] {
    const shifted = new Date(date.getTime() - tzOffsetMinutes * 60_000);
    return [shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()];
  }

  private monthKey(date: Date, tzOffsetMinutes: number): string {
    const [year, month] = this.localYmd(date, tzOffsetMinutes);
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  }

  private monthKeys(from: Date, to: Date, tzOffsetMinutes: number): string[] {
    const [startYear, startMonth] = this.localYmd(from, tzOffsetMinutes);
    // `to` is exclusive: step back one millisecond to stay in the last month.
    const [endYear, endMonth] = this.localYmd(new Date(to.getTime() - 1), tzOffsetMinutes);

    const keys: string[] = [];
    let year = startYear;
    let month = startMonth;
    // Guard against a pathological range blowing up the loop.
    while ((year < endYear || (year === endYear && month <= endMonth)) && keys.length < 36) {
      keys.push(`${year}-${String(month + 1).padStart(2, '0')}`);
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
    return keys;
  }
}
