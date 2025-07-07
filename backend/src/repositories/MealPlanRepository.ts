import { Op } from 'sequelize';
import { MealPlan, MealPlanCreationAttributes } from '../models/MealPlan';
import { Recipe } from '../models/Recipe';
import { MealPlanQueryParams } from '../types/MealPlanDto';

export class MealPlanRepository {
  async create(mealPlanData: MealPlanCreationAttributes): Promise<MealPlan> {
    return await MealPlan.create(mealPlanData);
  }

  async findById(id: string, includeRecipe = false): Promise<MealPlan | null> {
    const include = includeRecipe ? [{
      model: Recipe,
      as: 'recipe',
      attributes: ['id', 'title',  'prepTime', 'cookTime', 'servings', 'difficulty']
    }] : [];

    return await MealPlan.findByPk(id, { include });
  }

  async findByHousehold(
    householdId: string, 
    params: MealPlanQueryParams = {},
    includeRecipe = true
  ): Promise<{ mealPlans: MealPlan[], total: number }> {
    const where: any = { householdId };
    
    // Date filtering
    if (params.startDate && params.endDate) {
      where.date = {
        [Op.between]: [params.startDate, params.endDate]
      };
    } else if (params.date) {
      where.date = params.date;
    } else if (params.startDate) {
      where.date = {
        [Op.gte]: params.startDate
      };
    } else if (params.endDate) {
      where.date = {
        [Op.lte]: params.endDate
      };
    }

    // Other filters
    if (params.mealType) {
      where.mealType = params.mealType;
    }

    if (params.recipeId) {
      where.recipeId = params.recipeId;
    }

    const include = includeRecipe ? [{
      model: Recipe,
      as: 'recipe',
      attributes: ['id', 'title', 'prepTime', 'cookTime', 'servings', 'difficulty']
    }] : [];

    const { count, rows } = await MealPlan.findAndCountAll({
      where,
      include,
      order: [['date', 'ASC'], ['mealType', 'ASC']],
      limit: params.limit || 100,
      offset: params.offset || 0,
    });

    return {
      mealPlans: rows,
      total: count
    };
  }

  async findByDateRange(
    householdId: string,
    startDate: string,
    endDate: string,
    includeRecipe = true
  ): Promise<MealPlan[]> {
    const include = includeRecipe ? [{
      model: Recipe,
      as: 'recipe',
      attributes: ['id', 'title', 'prepTime', 'cookTime', 'servings', 'difficulty']
    }] : [];

    return await MealPlan.findAll({
      where: {
        householdId,
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      include,
      order: [['date', 'ASC'], ['mealType', 'ASC']]
    });
  }

  async findByDate(householdId: string, date: string, includeRecipe = true): Promise<MealPlan[]> {
    const include = includeRecipe ? [{
      model: Recipe,
      as: 'recipe',
      attributes: ['id', 'title', 'prepTime', 'cookTime', 'servings', 'difficulty']
    }] : [];

    return await MealPlan.findAll({
      where: {
        householdId,
        date
      },
      include,
      order: [['mealType', 'ASC']]
    });
  }

  async update(id: string, updates: Partial<MealPlanCreationAttributes>): Promise<MealPlan | null> {
    const [affectedCount] = await MealPlan.update(updates, {
      where: { id },
      returning: true
    });

    if (affectedCount === 0) {
      return null;
    }

    return await this.findById(id, true);
  }

  async delete(id: string): Promise<boolean> {
    const affectedCount = await MealPlan.destroy({
      where: { id }
    });

    return affectedCount > 0;
  }

  async deleteByHousehold(householdId: string): Promise<number> {
    return await MealPlan.destroy({
      where: { householdId }
    });
  }

  async checkDuplicate(
    householdId: string,
    date: string,
    mealType: 'breakfast' | 'lunch' | 'dinner',
    excludeId?: string
  ): Promise<MealPlan | null> {
    const where: any = {
      householdId,
      date,
      mealType
    };

    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    return await MealPlan.findOne({ where });
  }

  async getMealPlanStats(householdId: string, startDate?: string, endDate?: string) {
    const where: any = { householdId };
    
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const stats = await MealPlan.findAll({
      where,
      attributes: [
        'mealType',
        [MealPlan.sequelize!.fn('COUNT', MealPlan.sequelize!.col('id')), 'count']
      ],
      group: ['mealType'],
      raw: true
    });

    return stats;
  }
} 