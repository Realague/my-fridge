'use strict';

/**
 * Reclassifies catalog items whose category was wrong after the first
 * fish/seafood cleanup (see 202604201). Examples: beef fillet classified
 * as fish, bouillons/fonds classified as meat, Bimi as meat, broccolini
 * spice mixes as meal, peanut/almond butters as dairy, etc.
 *
 * No 'down' function: catalog cleanup, not user data.
 */

const UPDATES = {
  condiments: [
    'beefFat', 'duckFat', 'tarragonFlavoredVinegar',
  ],
  fish: [
    'anglerfish', 'arcticChar', 'lumpfishRoe', 'morayEel', 'nilePerch',
  ],
  meal: [
    'lobsterBisque', 'squidInkPasta',
  ],
  meat: [
    'beefFillet', 'quail',
  ],
  preparation: [
    'beefBroth', 'broth', 'chickenBroth', 'chickenBroth2', 'chickenStock',
    'cocoaButter', 'roastStock', 'tsuyuFlyingFishBroth', 'vealBroth', 'vealStock',
    'vegetableBroth', 'whiteCookingBase',
  ],
  snacks: [
    'almondButter', 'chocolateEggs', 'eggsInLiqueur', 'grasshopper',
    'peanutButter', 'peanutButter2',
  ],
  spices: [
    'garlicPowder', 'lemonVerbena', 'paellaSpices', 'pizzaSpices', 'spicesForTagine',
  ],
  vegetables: [
    'bimiOrBroccolini', 'edamame', 'hedgehog', 'springOnion2',
  ],
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      for (const [category, names] of Object.entries(UPDATES)) {
        await queryInterface.bulkUpdate(
          'items',
          { category },
          { name: names },
          { transaction }
        );
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down() {
    // No rollback: catalog reclassification is not reversible by design.
  },
};
