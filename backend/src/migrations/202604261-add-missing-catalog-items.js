'use strict';

const { randomUUID } = require('crypto');

/**
 * Inserts the 199 missing catalog items from manquants_full.csv into
 * the global `items` table (householdId IS NULL).
 *
 * Idempotent: skips any name that already exists as a global item.
 *
 * Image upload to Cloudinary is NOT performed by this migration. Images
 * must already be uploaded under public_id = nameKey in the shared
 * Cloudinary cloud_name (run `npm run seed:items:incremental` once from
 * any environment with access to backend/src/scripts/img/ before deploying
 * — Cloudinary's overwrite:false means a single upload is enough for all
 * environments since they share the same cloud_name).
 *
 * No 'down' function: catalog seeding is not user data.
 */

const CLOUDINARY_BASE_URL = 'https://res.cloudinary.com/duxpbou8b/image/upload/v1763055075/items';

const ITEMS = [
  { name: "asparagus", category: "vegetables", hasImage: true },
  { name: "greenAsparagus", category: "vegetables", hasImage: true },
  { name: "smartiesMiniBox15g", category: "snacks", hasImage: true },
  { name: "blackCherry", category: "fruits", hasImage: true },
  { name: "duckSausageMeat", category: "meat", hasImage: false },
  { name: "smartiesChocolate", category: "snacks", hasImage: true },
  { name: "cornFlakes", category: "grains", hasImage: true },
  { name: "cornedBeef", category: "meat", hasImage: false },
  { name: "cone", category: "snacks", hasImage: true },
  { name: "iceCreamCone", category: "snacks", hasImage: true },
  { name: "cornetteBean", category: "vegetables", hasImage: false },
  { name: "pickleInVinegar", category: "condiments", hasImage: true },
  { name: "pickles", category: "condiments", hasImage: true },
  { name: "soursop", category: "fruits", hasImage: false },
  { name: "peaPods", category: "vegetables", hasImage: false },
  { name: "cottageCheese", category: "dairy", hasImage: true },
  { name: "layer", category: "other", hasImage: true },
  { name: "elbowMacaroni", category: "grains", hasImage: true },
  { name: "porkRind", category: "meat", hasImage: false },
  { name: "porkBackFatRind", category: "meat", hasImage: false },
  { name: "parasolMushroom", category: "vegetables", hasImage: false },
  { name: "coulis", category: "condiments", hasImage: false },
  { name: "apricotCoulis", category: "condiments", hasImage: true },
  { name: "cherryCoulis", category: "condiments", hasImage: true },
  { name: "strawberryCoulis", category: "condiments", hasImage: true },
  { name: "raspberryCoulis", category: "condiments", hasImage: true },
  { name: "passionFruitCoulis", category: "condiments", hasImage: true },
  { name: "redFruitCoulis", category: "condiments", hasImage: true },
  { name: "mangoCoulis", category: "condiments", hasImage: true },
  { name: "tomatoCoulis", category: "condiments", hasImage: true },
  { name: "coulommier", category: "dairy", hasImage: true },
  { name: "squash", category: "vegetables", hasImage: true },
  { name: "butternutSquash", category: "vegetables", hasImage: true },
  { name: "spaghettiSquash", category: "vegetables", hasImage: true },
  { name: "zucchini", category: "vegetables", hasImage: true },
  { name: "yellowZucchini", category: "vegetables", hasImage: true },
  { name: "roundZucchini", category: "vegetables", hasImage: false },
  { name: "poultryCourtBouillon", category: "preparation", hasImage: false },
  { name: "courtBouillon", category: "preparation", hasImage: true },
  { name: "couscous", category: "grains", hasImage: true },
  { name: "couscousInCookingBags", category: "grains", hasImage: false },
  { name: "razorClam", category: "seafood", hasImage: true },
  { name: "crab", category: "seafood", hasImage: true },
  { name: "cracker", category: "snacks", hasImage: true },
  { name: "cranberries", category: "fruits", hasImage: true },
  { name: "creamCheese", category: "dairy", hasImage: true },
  { name: "almondCream", category: "condiments", hasImage: false },
  { name: "watercress", category: "vegetables", hasImage: true },
  { name: "smallWatercress", category: "vegetables", hasImage: false },
  { name: "bouquetShrimp", category: "seafood", hasImage: true },
  { name: "greyShrimp", category: "seafood", hasImage: true },
  { name: "pinkShrimp", category: "seafood", hasImage: true },
  { name: "tigerShrimp", category: "seafood", hasImage: true },
  { name: "shrimps", category: "seafood", hasImage: true },
  { name: "croissant", category: "grains", hasImage: true },
  { name: "cordesCroquant", category: "snacks", hasImage: false },
  { name: "ferncrosnes", category: "vegetables", hasImage: true },
  { name: "chavignolCrottin", category: "dairy", hasImage: true },
  { name: "goatCrottin", category: "dairy", hasImage: true },
  { name: "crozet", category: "grains", hasImage: true },
  { name: "cheeseRind", category: "dairy", hasImage: false },
  { name: "garlicAndHerbsCrouton", category: "grains", hasImage: true },
  { name: "croutons", category: "grains", hasImage: true },
  { name: "crumble", category: "snacks", hasImage: true },
  { name: "crunch", category: "snacks", hasImage: true },
  { name: "cream", category: "dairy", hasImage: true },
  { name: "lightCream", category: "dairy", hasImage: true },
  { name: "creamAnglaise", category: "dairy", hasImage: true },
  { name: "balsamicCream", category: "condiments", hasImage: true },
  { name: "whippedCream", category: "dairy", hasImage: true },
  { name: "almondCreamPaste", category: "preparation", hasImage: true },
  { name: "anchovyCream", category: "condiments", hasImage: false },
  { name: "bananaLiqueur", category: "beverages", hasImage: false },
  { name: "blackcurrantLiqueur", category: "beverages", hasImage: false },
  { name: "coconutCream", category: "dairy", hasImage: true },
  { name: "passionFruitCream", category: "preparation", hasImage: false },
  { name: "chestnutCream", category: "preparation", hasImage: true },
  { name: "blackberryLiqueur", category: "beverages", hasImage: false },
  { name: "riceCream", category: "grains", hasImage: false },
  { name: "soyCream", category: "dairy", hasImage: false },
  { name: "creamOfTartar", category: "preparation", hasImage: false },
  { name: "truffleCream", category: "condiments", hasImage: false },
  { name: "baileysCream", category: "beverages", hasImage: false },
  { name: "chocolateDessertCream", category: "dairy", hasImage: true },
  { name: "vanillaDessertCream", category: "dairy", hasImage: true },
  { name: "wholeCream", category: "dairy", hasImage: true },
  { name: "wholeLiquidCream", category: "dairy", hasImage: true },
  { name: "fleuretteCream", category: "dairy", hasImage: true },
  { name: "whippedCream2", category: "dairy", hasImage: true },
  { name: "creme_fraiche", category: "dairy", hasImage: true },
  { name: "lightCremeFraiche", category: "dairy", hasImage: true },
  { name: "liquidCremeFraiche", category: "dairy", hasImage: true },
  { name: "thickCremeFraiche", category: "dairy", hasImage: true },
  { name: "liquidCream", category: "dairy", hasImage: true },
  { name: "pastryCream", category: "preparation", hasImage: true },
  { name: "semiThickCream", category: "dairy", hasImage: true },
  { name: "vegetableCream", category: "dairy", hasImage: true },
  { name: "speltVegetableCream", category: "dairy", hasImage: false },
  { name: "thickCream", category: "dairy", hasImage: true },
  { name: "cremant", category: "beverages", hasImage: true },
  { name: "slipperLimpet", category: "seafood", hasImage: false },
  { name: "caulFat", category: "meat", hasImage: false },
  { name: "crepinette", category: "meat", hasImage: false },
  { name: "crepe", category: "grains", hasImage: true },
  { name: "laceCrepe", category: "snacks", hasImage: true },
  { name: "milkChocolateLaceCrepes", category: "snacks", hasImage: true },
  { name: "darkChocolateLaceCrepes", category: "snacks", hasImage: true },
  { name: "cuajada", category: "dairy", hasImage: true },
  { name: "bouillonCube", category: "preparation", hasImage: true },
  { name: "maggiCube", category: "preparation", hasImage: true },
  { name: "potAuFeuCube", category: "preparation", hasImage: false },
  { name: "cuberdon", category: "snacks", hasImage: false },
  { name: "duckThigh", category: "meat", hasImage: true },
  { name: "duckConfitThigh", category: "meat", hasImage: false },
  { name: "turkeyThigh", category: "meat", hasImage: true },
  { name: "frogLeg", category: "meat", hasImage: true },
  { name: "rabbitThigh", category: "meat", hasImage: true },
  { name: "chickenThigh", category: "meat", hasImage: true },
  { name: "cumin", category: "spices", hasImage: true },
  { name: "groundCumin", category: "spices", hasImage: true },
  { name: "curacao", category: "beverages", hasImage: true },
  { name: "blueCuracao", category: "beverages", hasImage: false },
  { name: "turmeric", category: "spices", hasImage: true },
  { name: "curry", category: "spices", hasImage: true },
  { name: "cureNantais", category: "dairy", hasImage: false },
  { name: "rosehip", category: "fruits", hasImage: true },
  { name: "lambChop", category: "meat", hasImage: true },
  { name: "beefRib", category: "meat", hasImage: true },
  { name: "porkChop", category: "meat", hasImage: true },
  { name: "vealChop", category: "meat", hasImage: true },
  { name: "lambCutlet", category: "meat", hasImage: true },
  { name: "vealCutlet", category: "meat", hasImage: false },
  { name: "espresso", category: "beverages", hasImage: true },
  { name: "oxalisLeaves", category: "vegetables", hasImage: true },
  { name: "chickenUpperThigh", category: "meat", hasImage: true },
  { name: "beetrootJuice", category: "beverages", hasImage: true },
  { name: "limeJuice", category: "beverages", hasImage: true },
  { name: "poultryJus", category: "preparation", hasImage: false },
  { name: "shisoMiso", category: "condiments", hasImage: true },
  { name: "goldenFoodFlakes", category: "preparation", hasImage: false },
  { name: "smartiesSmallTube38g", category: "snacks", hasImage: true },
  { name: "smallChocolateEggs", category: "snacks", hasImage: true },
  { name: "hen", category: "meat", hasImage: true },
  { name: "chicken", category: "meat", hasImage: true },
  { name: "wholeChicken", category: "meat", hasImage: true },
  { name: "octopus", category: "seafood", hasImage: true },
  { name: "lung", category: "meat", hasImage: false },
  { name: "purslane", category: "vegetables", hasImage: true },
  { name: "bambooShoot", category: "vegetables", hasImage: true },
  { name: "lotusShoot", category: "vegetables", hasImage: false },
  { name: "pousseRapiere", category: "beverages", hasImage: false },
  { name: "spinachShoots", category: "vegetables", hasImage: true },
  { name: "redMustardSprouts", category: "vegetables", hasImage: true },
  { name: "greenMustardSprouts", category: "vegetables", hasImage: false },
  { name: "soybeanSprouts", category: "vegetables", hasImage: false },
  { name: "germinatedSprouts", category: "vegetables", hasImage: false },
  { name: "chick", category: "meat", hasImage: false },
  { name: "bottarga", category: "fish", hasImage: true },
  { name: "clam", category: "seafood", hasImage: true },
  { name: "pralin", category: "preparation", hasImage: true },
  { name: "praline", category: "snacks", hasImage: true },
  { name: "redPraline", category: "snacks", hasImage: false },
  { name: "pinkPralines", category: "snacks", hasImage: false },
  { name: "pralinoise", category: "snacks", hasImage: true },
  { name: "pralineTopping", category: "preparation", hasImage: true },
  { name: "prosciutto", category: "meat", hasImage: true },
  { name: "prosecco", category: "beverages", hasImage: false },
  { name: "soyProtein", category: "preparation", hasImage: true },
  { name: "provolone", category: "dairy", hasImage: false },
  { name: "plum", category: "fruits", hasImage: true },
  { name: "prune", category: "fruits", hasImage: true },
  { name: "sloe", category: "fruits", hasImage: true },
  { name: "plainFlanPreparation", category: "preparation", hasImage: false },
  { name: "rennet", category: "preparation", hasImage: false },
  { name: "psyllium", category: "preparation", hasImage: false },
  { name: "tomatoPulp", category: "canned", hasImage: true },
  { name: "coconutPunch", category: "beverages", hasImage: false },
  { name: "puree", category: "preparation", hasImage: true },
  { name: "almondPuree", category: "preparation", hasImage: true },
  { name: "eggplantPuree", category: "preparation", hasImage: false },
  { name: "onionPuree", category: "preparation", hasImage: false },
  { name: "spinachPuree", category: "preparation", hasImage: false },
  { name: "peanutPuree", category: "preparation", hasImage: true },
  { name: "carrotPuree", category: "preparation", hasImage: true },
  { name: "strawberryPuree", category: "preparation", hasImage: false },
  { name: "passionFruitPuree", category: "preparation", hasImage: true },
  { name: "lycheePuree", category: "preparation", hasImage: false },
  { name: "chestnutPuree", category: "preparation", hasImage: true },
  { name: "hazelnutPuree", category: "preparation", hasImage: false },
  { name: "cashewPuree", category: "preparation", hasImage: false },
  { name: "passionPuree", category: "preparation", hasImage: true },
  { name: "chiliPuree", category: "condiments", hasImage: true },
  { name: "peachPuree", category: "preparation", hasImage: false },
  { name: "tomatoPuree", category: "canned", hasImage: true },
  { name: "bottledTomatoPuree", category: "canned", hasImage: true },
  { name: "perlAmandeWholeAlmondPuree", category: "preparation", hasImage: true },
  { name: "thaiCurryPaste", category: "condiments", hasImage: true },
  { name: "poultrySupremesWithBone", category: "meat", hasImage: false },
  { name: "grisonMeat", category: "meat", hasImage: true },
];

function getAvailableUnits(category) {
  switch (category) {
    case 'meal': return ['piece', 'serving'];
    case 'vegetables':
    case 'fruits':
    case 'meat':
    case 'fish':
    case 'seafood': return ['piece', 'g', 'kg'];
    case 'dairy': return ['ml', 'l', 'piece', 'g'];
    case 'grains': return ['g', 'kg', 'piece'];
    case 'spices': return ['g', 'piece'];
    case 'beverages': return ['ml', 'l', 'piece'];
    case 'snacks':
    case 'frozen':
    case 'canned': return ['piece', 'g', 'kg'];
    case 'condiments': return ['ml', 'l', 'g', 'piece'];
    default: return ['piece', 'g', 'kg'];
  }
}

function getDefaultUnit(category) {
  switch (category) {
    case 'beverages':
    case 'dairy':
    case 'condiments': return 'ml';
    case 'grains':
    case 'spices': return 'g';
    default: return 'piece';
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const names = ITEMS.map(i => i.name);
      const [existing] = await queryInterface.sequelize.query(
        `SELECT name FROM items WHERE "householdId" IS NULL AND name IN (:names)`,
        { replacements: { names }, transaction }
      );
      const existingNames = new Set(existing.map(r => r.name));

      const now = new Date();
      const toInsert = ITEMS
        .filter(i => !existingNames.has(i.name))
        .map(i => ({
          id: randomUUID(),
          name: i.name,
          category: i.category,
          defaultUnit: getDefaultUnit(i.category),
          availableUnits: JSON.stringify(getAvailableUnits(i.category)),
          imageUrl: i.hasImage ? `${CLOUDINARY_BASE_URL}/${i.name}.jpg` : null,
          householdId: null,
          createdBy: null,
          daysAfterOpening: null,
          createdAt: now,
          updatedAt: now,
        }));

      if (toInsert.length === 0) {
        await transaction.commit();
        return;
      }

      const BATCH = 100;
      for (let i = 0; i < toInsert.length; i += BATCH) {
        await queryInterface.bulkInsert('items', toInsert.slice(i, i + BATCH), { transaction });
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down() {
    // No rollback: catalog seeding is not user data.
  },
};
