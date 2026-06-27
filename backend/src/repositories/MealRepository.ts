import { Transaction } from 'sequelize';
import { Meal, MealCreationAttributes } from '../models/Meal';
import { Recipe } from '../models/Recipe';
import sequelize from '../config/database';

const RECIPE_INCLUDE = [
  {
    model: Recipe,
    as: 'recipe',
    attributes: ['id', 'title', 'prepTime', 'cookTime', 'servings', 'tags', 'imageUrl'],
  },
];

export class MealRepository {
  async findByHousehold(householdId: string): Promise<Meal[]> {
    return await Meal.findAll({
      where: { householdId, cookedAt: null },
      include: RECIPE_INCLUDE,
      order: [['position', 'ASC']],
    });
  }

  async findById(id: string, includeRecipe = true): Promise<Meal | null> {
    return await Meal.findByPk(id, {
      include: includeRecipe ? RECIPE_INCLUDE : [],
    });
  }

  async getMaxPosition(householdId: string, transaction?: Transaction): Promise<number> {
    const max = await Meal.max('position', {
      where: { householdId, cookedAt: null },
      transaction,
    });
    return typeof max === 'number' ? max : 0;
  }

  /**
   * Finds the ACTIVE meal (cookedAt IS NULL) for this (household, recipe) pair,
   * if any. A recipe can have at most one active meal (enforced by the partial
   * unique index), plus any number of cooked history rows. Callers check this
   * before inserting so re-adding an already-planned recipe updates it instead
   * of hitting the unique index.
   */
  async findActiveByHouseholdAndRecipe(householdId: string, recipeId: string): Promise<Meal | null> {
    return await Meal.findOne({ where: { householdId, recipeId, cookedAt: null } });
  }

  async create(data: MealCreationAttributes): Promise<Meal> {
    return await sequelize.transaction(async (transaction) => {
      const maxPosition = await this.getMaxPosition(data.householdId, transaction);
      const meal = await Meal.create(
        { ...data, position: maxPosition + 1 },
        { transaction }
      );
      return meal;
    });
  }

  async updateServings(id: string, servings: number): Promise<Meal | null> {
    const [affected] = await Meal.update({ servings }, { where: { id } });
    if (affected === 0) return null;
    return await this.findById(id, true);
  }

  async deleteAndRepack(id: string, householdId: string): Promise<boolean> {
    return await sequelize.transaction(async (transaction) => {
      const deleted = await Meal.destroy({ where: { id, householdId }, transaction });
      if (deleted === 0) return false;
      await this.repackPositions(householdId, transaction);
      return true;
    });
  }

  /**
   * Marks a meal as cooked (soft-removal): keeps the row for stats but the
   * meal vanishes from the active plan. Positions are repacked so the UI
   * stays compact.
   */
  async markCooked(id: string, householdId: string): Promise<Meal | null> {
    return await sequelize.transaction(async (transaction) => {
      const meal = await Meal.findOne({
        where: { id, householdId },
        include: RECIPE_INCLUDE,
        transaction,
      });
      if (!meal) return null;
      if (!meal.cookedAt) {
        await meal.update({ cookedAt: new Date() }, { transaction });
        await this.repackPositions(householdId, transaction);
      }
      return meal;
    });
  }

  private async repackPositions(householdId: string, transaction: Transaction): Promise<void> {
    const remaining = await Meal.findAll({
      where: { householdId, cookedAt: null },
      order: [['position', 'ASC']],
      transaction,
    });

    for (let i = 0; i < remaining.length; i++) {
      const meal = remaining[i]!;
      if (meal.position !== i + 1) {
        await meal.update({ position: i + 1 }, { transaction });
      }
    }
  }
}
