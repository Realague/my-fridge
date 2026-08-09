import { Op, fn, col, literal } from 'sequelize';
import { StockExit } from '../models/StockExit';
import { StoredItem } from '../models/StoredItem';
import { Meal } from '../models/Meal';
import { Recipe } from '../models/Recipe';
import { RecipeIngredient } from '../models/RecipeIngredient';
import { Item } from '../models/Item';
import { HouseholdActivity } from '../models/HouseholdActivity';
import { HouseholdMember } from '../models/HouseholdMember';
import { User } from '../models/User';
import { HouseholdActivityAction, ItemCategory, StockExitType } from '../types/enums';

// Half-open range [from, to). Both bounds optional (undefined = unbounded).
export interface DateRange {
  from?: Date;
  to?: Date;
}

// One exit row, trimmed to what the stats need. `storedItemCreatedAt` comes
// from the (soft-deleted) stored_items row and drives "temps de conservation".
export interface StatsExitRow {
  exitType: StockExitType;
  category: string | null;
  expirationDate: Date | null;
  createdAt: Date;
  storedItemCreatedAt: Date | null;
}

export interface StatsCookedMealRow {
  recipeId: string;
  recipeTitle: string | null;
  cookedAt: Date;
}

export interface UserCount {
  userId: string;
  count: number;
}

export interface HouseholdMemberRow {
  userId: string;
  firstName: string | null;
  lastName: string | null;
}

function rangeWhere(range: DateRange, field = 'createdAt'): Record<string, unknown> {
  if (!range.from && !range.to) return {};
  const bounds: Record<symbol, Date> = {};
  if (range.from) bounds[Op.gte] = range.from;
  if (range.to) bounds[Op.lt] = range.to;
  return { [field]: bounds };
}

/**
 * Read-only aggregates behind the household statistics (phase 1).
 *
 * No retroactivity: every figure is derived from `stock_exits`,
 * `household_activities` and `meals.cookedAt`, all of which only carry rows
 * created after the "distinction des sorties de stock" release. Nothing here
 * tries to reconstruct pre-release history.
 */
export class HouseholdStatsRepository {
  /**
   * Exits over a range, joined to their (possibly soft-deleted) stored item so
   * the caller can compute how long the article was kept before it left.
   * Rows are small and bounded by the household's own activity, so the service
   * buckets them in JS rather than issuing one aggregate query per figure.
   */
  async findExits(householdId: string, range: DateRange): Promise<StatsExitRow[]> {
    const rows = (await StockExit.findAll({
      where: { householdId, ...rangeWhere(range) },
      attributes: ['exitType', 'categorySnapshot', 'expirationDateSnapshot', 'createdAt'],
      include: [
        {
          model: StoredItem,
          as: 'storedItem',
          attributes: ['createdAt'],
          required: false,
          // The stored item is soft-deleted by a full exit — read it anyway.
          paranoid: false,
        },
      ],
      order: [['createdAt', 'ASC']],
      raw: true,
      nest: true,
    })) as unknown as Array<{
      exitType: StockExitType;
      categorySnapshot: string | null;
      expirationDateSnapshot: string | Date | null;
      createdAt: string | Date;
      storedItem: { createdAt: string | Date | null } | null;
    }>;

    return rows.map((r) => ({
      exitType: r.exitType,
      category: r.categorySnapshot,
      expirationDate: r.expirationDateSnapshot ? new Date(r.expirationDateSnapshot) : null,
      createdAt: new Date(r.createdAt),
      storedItemCreatedAt: r.storedItem?.createdAt ? new Date(r.storedItem.createdAt) : null,
    }));
  }

  /** Meals marked as cooked within the range, newest last. */
  async findCookedMeals(householdId: string, range: DateRange): Promise<StatsCookedMealRow[]> {
    // Merge the null-check into the range bounds rather than spreading over it:
    // an unbounded range must still exclude meals that were never cooked.
    const cookedAt: Record<symbol, unknown> = { [Op.ne]: null };
    if (range.from) cookedAt[Op.gte] = range.from;
    if (range.to) cookedAt[Op.lt] = range.to;

    const rows = (await Meal.findAll({
      where: { householdId, cookedAt },
      attributes: ['recipeId', 'cookedAt'],
      include: [{ model: Recipe, as: 'recipe', attributes: ['title'], required: false }],
      order: [['cookedAt', 'ASC']],
      raw: true,
      nest: true,
    })) as unknown as Array<{
      recipeId: string;
      cookedAt: string | Date;
      recipe: { title: string | null } | null;
    }>;

    return rows.map((r) => ({
      recipeId: r.recipeId,
      recipeTitle: r.recipe?.title ?? null,
      cookedAt: new Date(r.cookedAt),
    }));
  }

  /**
   * Meal-plan completion basis: meals *planned* (row created) within the range,
   * split by whether they ended up cooked. Unplanned meals are hard-deleted, so
   * they legitimately drop out of both counts.
   */
  async countPlannedMeals(
    householdId: string,
    range: DateRange
  ): Promise<{ planned: number; cooked: number }> {
    const planned = await Meal.count({ where: { householdId, ...rangeWhere(range) } });
    const cooked = await Meal.count({
      where: { householdId, cookedAt: { [Op.ne]: null }, ...rangeWhere(range) },
    });
    return { planned, cooked };
  }

  /** Distinct categories of the items used by these recipes (for dish typing). */
  async findRecipeIngredientCategories(
    recipeIds: string[]
  ): Promise<Map<string, Set<ItemCategory>>> {
    const map = new Map<string, Set<ItemCategory>>();
    if (recipeIds.length === 0) return map;

    const rows = (await RecipeIngredient.findAll({
      where: { recipeId: { [Op.in]: recipeIds } },
      attributes: ['recipeId'],
      include: [{ model: Item, as: 'item', attributes: ['category'], required: true }],
      raw: true,
      nest: true,
    })) as unknown as Array<{ recipeId: string; item: { category: ItemCategory } }>;

    for (const row of rows) {
      const set = map.get(row.recipeId) ?? new Set<ItemCategory>();
      set.add(row.item.category);
      map.set(row.recipeId, set);
    }
    return map;
  }

  /** Per-member counts for one activity action over a range. */
  async countActivitiesByUser(
    householdId: string,
    action: HouseholdActivityAction,
    range: DateRange
  ): Promise<UserCount[]> {
    const rows = (await HouseholdActivity.findAll({
      where: { householdId, action, ...rangeWhere(range) },
      attributes: ['userId', [fn('COUNT', col('id')), 'count']],
      group: ['userId'],
      raw: true,
    })) as unknown as Array<{ userId: string; count: string }>;

    return rows.map((r) => ({ userId: r.userId, count: Number(r.count) }));
  }

  /** Recipe cooked most often since `since`, ties broken by recipe id. */
  async findFavoriteRecipe(
    householdId: string,
    since: Date
  ): Promise<{ recipeId: string; title: string | null; count: number } | null> {
    const rows = (await Meal.findAll({
      where: { householdId, cookedAt: { [Op.gte]: since } },
      attributes: ['recipeId', [fn('COUNT', col('Meal.id')), 'count']],
      include: [{ model: Recipe, as: 'recipe', attributes: ['title'], required: false }],
      group: ['Meal.recipeId', 'recipe.id'],
      order: [[literal('count'), 'DESC']],
      limit: 1,
      raw: true,
      nest: true,
    })) as unknown as Array<{
      recipeId: string;
      count: string;
      recipe: { title: string | null } | null;
    }>;

    const top = rows[0];
    if (!top) return null;
    return { recipeId: top.recipeId, title: top.recipe?.title ?? null, count: Number(top.count) };
  }

  /** Active members of the household, with the names used in the breakdowns. */
  async findActiveMembers(householdId: string): Promise<HouseholdMemberRow[]> {
    const rows = (await HouseholdMember.findAll({
      where: { householdId, isActive: true },
      attributes: ['userId'],
      include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'], required: false }],
      raw: true,
      nest: true,
    })) as unknown as Array<{
      userId: string;
      user: { firstName: string | null; lastName: string | null } | null;
    }>;

    return rows.map((r) => ({
      userId: r.userId,
      firstName: r.user?.firstName ?? null,
      lastName: r.user?.lastName ?? null,
    }));
  }

  /** Names for contributors who are no longer active members. */
  async findUsers(userIds: string[]): Promise<HouseholdMemberRow[]> {
    if (userIds.length === 0) return [];
    const rows = (await User.findAll({
      where: { id: { [Op.in]: userIds } },
      attributes: ['id', 'firstName', 'lastName'],
      raw: true,
    })) as unknown as Array<{ id: string; firstName: string | null; lastName: string | null }>;

    return rows.map((r) => ({ userId: r.id, firstName: r.firstName, lastName: r.lastName }));
  }

  /**
   * Whether the household ever produced a figure worth showing. Drives the
   * "totally empty" state, which is distinct from "empty for this period".
   */
  async hasAnyData(householdId: string): Promise<boolean> {
    const exits = await StockExit.count({ where: { householdId } });
    if (exits > 0) return true;
    const cooked = await Meal.count({ where: { householdId, cookedAt: { [Op.ne]: null } } });
    if (cooked > 0) return true;
    const activities = await HouseholdActivity.count({ where: { householdId } });
    return activities > 0;
  }
}
