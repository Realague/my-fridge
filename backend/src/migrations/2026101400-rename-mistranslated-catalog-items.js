'use strict';

const { randomUUID } = require('crypto');

/**
 * Fixes catalog items whose nameKey came from a literal mistranslation of
 * the French name (e.g. "Navette" -> "shuttle", "Joue" -> "plays",
 * "Lentilles" -> "lenses"). The CSV and the translation files now use the
 * corrected keys; this renames the matching global items in the database.
 *
 * imageUrl is rewritten to the new key. The Cloudinary images themselves
 * were already renamed to the new keys (one-off script, 2026-10-14;
 * Cloudinary is shared by all environments).
 *
 * Also:
 * - gives "Tourteau" its own item (brownCrab); it used to share the "crab"
 *   key with "Crabe", so it is created as a copy of the existing crab item;
 * - fixes a few wrong categories.
 *
 * Idempotent: a rename is skipped when the old key is gone or the new key
 * already exists. Only global items (householdId IS NULL) are touched.
 *
 * No 'down' function: catalog cleanup, not user data.
 */

const RENAMES = [
  ['shuttle', 'babyTurnip'],
  ['lawyer', 'avocado'],
  ['sillyDog', 'andouille'],
  ['lowerCoast', 'beefChuck'],
  ['bib', 'flankSteak'],
  ['can', 'duckling'],
  ['kid', 'kidGoat'],
  ['suede', 'fallowDeer'],
  ['lambEpigram', 'lambBreastCutlet'],
  ['farce', 'stuffing'],
  ['bottom', 'stock'],
  ['policeOfficer', 'gendarmeSausage'],
  ['cottage', 'beefShin'],
  ['doubleFat', 'beefTripe'],
  ['shaft', 'skirtSteak'],
  ['jesus', 'jesusSausage'],
  ['plays', 'cheek'],
  ['knack', 'knackSausage'],
  ['language', 'tongue'],
  ['sheep', 'mutton'],
  ['muzzle', 'snout'],
  ['vealSweetbreads2', 'vealTopside'],
  ['headlessBird', 'beefOlive'],
  ['tab', 'hangerSteak'],
  ['breakdown', 'leafLard'],
  ['belly', 'rumen'],
  ['jewelry', 'meatTrimmings'],
  ['missed', 'spleen'],
  ['tenderSlice', 'topside'],
  ['vealShank2', 'vealFlank'],
  ['nipple', 'udder'],
  ['calf', 'veal'],
  ['bar', 'seaBass2'],
  ['colin', 'hake2'],
  ['shells', 'cockles'],
  ['golden', 'walleye'],
  ['emperor', 'orangeRoughy'],
  ['currycomb', 'velvetCrab'],
  ['julienne', 'ling2'],
  ['wolf', 'seaBass3'],
  ['mule', 'greyMullet'],
  ['fold', 'plaice'],
  ['saber', 'scabbardfish'],
  ['saintPierre', 'johnDory'],
  ['old', 'ballanWrasse'],
  ['longLive', 'weever'],
  ['sichuanBay', 'sichuanPepper2'],
  ['graze', 'cabbageSprouts'],
  ['card', 'chardStalks'],
  ['oak', 'oakLeafLettuce'],
  ['pet', 'chayote2'],
  ['paimpolCoco', 'paimpolBeans'],
  ['flatCoconut', 'flatBeans2'],
  ['sweetcornHeart', 'littleGemHeart'],
  ['curly', 'friseeLettuce'],
  ['grenade', 'pomegranate'],
  ['khaki', 'persimmon'],
  ['lentin', 'shiitake2'],
  ['but', 'corn'],
  ['miniBut', 'babyCorn'],
  ['eyelet', 'carnation'],
  ['orange2', 'caesarMushroom'],
  ['stonePasser', 'samphire'],
  ['fishing', 'peach'],
  ['thought', 'pansy'],
  ['hedgehog', 'hedgehogMushroom'],
  ['cheekbone', 'crabApple'],
  ['roman', 'romaineLettuce'],
  ['street', 'rue'],
  ['brig', 'brickPastry'],
  ['string', 'ficelleBread'],
  ['executed', 'fusilli'],
  ['blondeContactLenses', 'blondLentils'],
  ['lenses', 'lentils'],
  ['coralLenses', 'redLentils'],
  ['pittedBread', 'pitaBread'],
  ['butterflies', 'farfalle2'],
  ['dough2', 'pate'],
  ['abundance', 'abondance'],
  ['lark', 'alouette'],
  ['blue', 'blueCheese'],
  ['bush', 'brousse'],
  ['thatch', 'chaumes'],
  ['goat', 'goatCheese2'],
  ['county', 'comte'],
  ['letSCoo', 'roucoulons'],
  ['seren', 'quark'],
  ['volume', 'tomme'],
  ['log', 'yuleLog'],
  ['howAreYou', 'cava'],
  ['genoa', 'genoiseSponge'],
  ['ice', 'iceCream'],
  ['host', 'altarWafer'],
  ['march', 'marsBar'],
  ['swimming', 'nage'],
  ['tablecloth', 'glaze'],
  ['nut', 'walnut'],
  ['softPalate', 'softBiscuit'],
  ['knob', 'pommeau'],
  ['pink', 'rose'],
  ['rust', 'rouille'],
  ['sat', 'satay2'],
  ['sweetie', 'sweetenerTablet'],
  ['table', 'tabel'],
];

const CATEGORY_UPDATES = {
  vegetables: ['paimpolBeans', 'flatBeans2', 'hedgehogMushroom', 'potatoesForMashing', 'newPotatoes2', 'newPotatoes3'],
  meat: ['pate', 'hareSSaddle', 'smokedMatches', 'quail', 'beefFillet'],
  beverages: ['pommeau', 'marieBrizard'],
  fish: ['halibut'],
  dairy: ['pLardon'],
};

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      for (const [oldName, newName] of RENAMES) {
        await queryInterface.sequelize.query(
          `UPDATE items SET name = :newName,
             "imageUrl" = REPLACE("imageUrl", '/items/' || :oldName || '.jpg', '/items/' || :newName || '.jpg'),
             "updatedAt" = NOW()
           WHERE name = :oldName AND "householdId" IS NULL
             AND NOT EXISTS (SELECT 1 FROM items WHERE name = :newName AND "householdId" IS NULL)`,
          { replacements: { oldName, newName }, transaction }
        );
      }

      await queryInterface.sequelize.query(
        `INSERT INTO items (id, name, category, "defaultUnit", "availableUnits", "pieceAlias",
                            "daysAfterOpening", "excludeFromShopping", "imageUrl", "householdId",
                            "createdBy", "recipeId", "createdAt", "updatedAt")
         SELECT :id, 'brownCrab', category, "defaultUnit", "availableUnits", "pieceAlias",
                "daysAfterOpening", "excludeFromShopping",
                REPLACE("imageUrl", '/items/crab.jpg', '/items/brownCrab.jpg'), NULL, NULL, NULL, NOW(), NOW()
         FROM items
         WHERE name = 'crab' AND "householdId" IS NULL
           AND NOT EXISTS (SELECT 1 FROM items WHERE name = 'brownCrab' AND "householdId" IS NULL)
         LIMIT 1`,
        { replacements: { id: randomUUID() }, transaction }
      );

      for (const [category, names] of Object.entries(CATEGORY_UPDATES)) {
        await queryInterface.bulkUpdate(
          'items',
          { category },
          { name: names, householdId: null },
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
    // No rollback: catalog cleanup is not reversible by design.
  },
};
