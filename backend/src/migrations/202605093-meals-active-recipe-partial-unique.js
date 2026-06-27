'use strict';

/** @type {import('sequelize-cli').Migration}
 *
 * Replaces the global unique constraint on meals(householdId, recipeId) with a
 * PARTIAL unique index that only applies to active meals (cookedAt IS NULL).
 *
 * Why: cooked meals are soft-removed from the active plan but their row is kept
 * for history/stats (cookedAt set). The old global constraint meant that once a
 * recipe had been cooked, it could never be added back to the plan — the insert
 * hit `meal_plans_household_recipe_unique`. With the partial index, a recipe can
 * have at most one ACTIVE meal, but any number of cooked (history) rows, so it
 * can be planned again after being cooked.
 */
module.exports = {
  async up(queryInterface) {
    // Old constraint may exist as a constraint or as an index depending on how
    // it was originally created — drop whichever is present, ignore if absent.
    await queryInterface
      .removeConstraint('meals', 'meal_plans_household_recipe_unique')
      .catch(() => {});
    await queryInterface
      .removeIndex('meals', 'meal_plans_household_recipe_unique')
      .catch(() => {});

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "meals_household_recipe_active_unique"
      ON "meals" ("householdId", "recipeId")
      WHERE "cookedAt" IS NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS "meals_household_recipe_active_unique";'
    );

    await queryInterface
      .addConstraint('meals', {
        fields: ['householdId', 'recipeId'],
        type: 'unique',
        name: 'meal_plans_household_recipe_unique',
      })
      .catch(() => {});
  },
};
