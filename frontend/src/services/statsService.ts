import { makeAuthenticatedApiCall } from '@/utils/apiAuth';
import type { StatsRange } from '@/utils/statsPeriods';

// Les services front définissent ApiResponse en local (cf. activityService.ts),
// pas d'import partagé.
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/** Dish typing derived from the categories of a recipe's ingredients. */
export type DishCategory = 'meat' | 'fish' | 'vegetarian';

export interface StatsMeta {
  householdAgeDays: number;
  isRecentHousehold: boolean;
  hasAnyData: boolean;
  memberCount: number;
  comparisonAvailable: boolean;
}

export interface TrendPoint {
  /** Calendar month, `YYYY-MM`. */
  month: string;
  usageRate: number | null;
  cookedCount: number;
}

export interface WasteStats {
  consumed: number;
  wasted: number;
  usageRate: number | null;
  usageRateDelta: number | null;
  savedJustInTime: number;
  topWastedCategories: Array<{ category: string; count: number }>;
  averageKeepDays: Array<{ category: string; days: number }>;
}

export interface CookingStats {
  cookedCount: number;
  cookedCountDelta: number | null;
  distinctRecipes: number;
  mealPlanCompletion: number | null;
  favoriteRecipe: { title: string | null; count: number } | null;
  topDishCategories: Array<{ category: DishCategory; count: number }>;
}

export interface MemberContribution {
  userId: string;
  name: string | null;
  adds: number;
  cooks: number;
  shoppingChecks: number;
}

export interface HouseholdContribution {
  isSolo: boolean;
  members: MemberContribution[];
  totals: { adds: number; cooks: number; shoppingChecks: number };
  showTeamNudge: boolean;
}

export interface HouseholdStats {
  meta: StatsMeta;
  waste: WasteStats;
  cooking: CookingStats;
  household: HouseholdContribution;
  trend: TrendPoint[];
}

export interface HouseholdStatsSummary {
  meta: StatsMeta;
  waste: Pick<WasteStats, 'consumed' | 'wasted' | 'usageRate' | 'usageRateDelta'>;
  cooking: Pick<CookingStats, 'cookedCount' | 'cookedCountDelta' | 'distinctRecipes'>;
  /** Monthly series behind the "En cuisine" sparkline. */
  trend: TrendPoint[];
}

const createApiService = () => {
  const makeApiCall = async (url: string) => {
    const response = await makeAuthenticatedApiCall(url, { method: 'GET' }, { showToast: false });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response;
  };
  return { get: makeApiCall };
};

const apiService = createApiService();

/**
 * The backend needs the caller's timezone to bucket the trend series by
 * calendar month — the ISO bounds alone can't tell it where a month starts.
 */
const buildQuery = (range: StatsRange): string => {
  const qs = new URLSearchParams({
    from: range.from,
    to: range.to,
    trendFrom: range.trendFrom,
    trendTo: range.trendTo,
    tzOffset: String(new Date().getTimezoneOffset()),
  });
  if (range.previousFrom) qs.set('previousFrom', range.previousFrom);
  if (range.previousTo) qs.set('previousTo', range.previousTo);
  return qs.toString();
};

const getStats = async (householdId: string, range: StatsRange): Promise<HouseholdStats> => {
  const response = await apiService.get(
    `/api/households/${householdId}/stats?${buildQuery(range)}`
  );
  const result: ApiResponse<HouseholdStats> = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to load statistics');
  return result.data!;
};

const getSummary = async (
  householdId: string,
  range: StatsRange
): Promise<HouseholdStatsSummary> => {
  const response = await apiService.get(
    `/api/households/${householdId}/stats/summary?${buildQuery(range)}`
  );
  const result: ApiResponse<HouseholdStatsSummary> = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to load statistics summary');
  return result.data!;
};

export const statsService = { getStats, getSummary };
