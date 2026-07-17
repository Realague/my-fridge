'use strict';

const fs = require('fs');
const path = require('path');

function normalizeBrandName(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Seeds the curated brands from enseignes.json (reference data, not user data).
 * Idempotent: upsert on `id`. logoPath is left NULL — run `npm run brands:logos`
 * to populate logos via logo.dev + Cloudinary.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const file = path.join(__dirname, '..', 'scripts', 'enseignes.json');
    const enseignes = JSON.parse(fs.readFileSync(file, 'utf8'));
    const now = new Date();

    // Raw upsert on `id`. queryInterface.bulkInsert does NOT support
    // updateOnDuplicate (that's a Model.bulkCreate option, unavailable here),
    // so we use Postgres ON CONFLICT. The category column is an enum type
    // (enum_brands_category), so the string param is cast explicitly.
    // usageCount and logoPath are intentionally NOT updated on conflict, so a
    // re-run never resets a counter or wipes an already-downloaded logo.
    for (const e of enseignes) {
      await queryInterface.sequelize.query(
        `INSERT INTO brands
           (id, name, "normalizedName", domain, color, "logoPath", category, "isCurated", "usageCount", "createdAt", "updatedAt")
         VALUES
           (:id, :name, :normalizedName, :domain, :color, NULL, CAST(:category AS "enum_brands_category"), true, 0, :now, :now)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           "normalizedName" = EXCLUDED."normalizedName",
           domain = EXCLUDED.domain,
           color = EXCLUDED.color,
           category = EXCLUDED.category,
           "isCurated" = true,
           "updatedAt" = EXCLUDED."updatedAt";`,
        {
          replacements: {
            id: e.id,
            name: e.nom,
            normalizedName: normalizeBrandName(e.nom),
            domain: e.domaine || null,
            color: e.couleur || null,
            category: e.categorie || null,
            now,
          },
        }
      );
    }
  },

  async down (queryInterface, Sequelize) {
    const file = path.join(__dirname, '..', 'scripts', 'enseignes.json');
    const enseignes = JSON.parse(fs.readFileSync(file, 'utf8'));
    const ids = enseignes.map((e) => e.id);
    await queryInterface.bulkDelete('brands', { id: ids });
  }
};
