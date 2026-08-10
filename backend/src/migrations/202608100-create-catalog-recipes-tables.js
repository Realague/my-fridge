'use strict';

const { DataTypes } = require('sequelize');

// Valeurs dupliquées depuis src/models/CatalogRecipe.ts et src/types/enums.ts :
// une migration CommonJS ne peut pas importer le TypeScript du projet.
const DIFFICULTY_VALUES = ['Easy', 'Medium', 'Hard'];
const ORIGIN_TYPE_VALUES = ['community', 'aggregated'];
const STATUS_VALUES = ['published', 'under_review', 'removed'];
const UNIT_VALUES = [
  'g', 'kg', 'ml', 'cl', 'l', 'tbsp', 'tsp', 'piece', 'serving',
  'pinch', 'drizzle', 'knob',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('catalog_recipes', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      instructions: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      tags: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      prepTime: { type: DataTypes.INTEGER, allowNull: false },
      cookTime: { type: DataTypes.INTEGER, allowNull: false },
      servings: { type: DataTypes.INTEGER, allowNull: false },
      difficulty: {
        type: DataTypes.ENUM(...DIFFICULTY_VALUES),
        allowNull: false,
        defaultValue: 'Easy',
      },
      imageUrl: { type: DataTypes.TEXT, allowNull: true },
      // SET NULL et non CASCADE : la copie catalogue survit à la suppression
      // de son auteur, de son foyer et de sa recette d'origine.
      authorUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      authorHouseholdId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'households', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      sourceRecipeId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'recipes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      originType: {
        type: DataTypes.ENUM(...ORIGIN_TYPE_VALUES),
        allowNull: false,
        defaultValue: 'community',
      },
      sourceUrl: { type: DataTypes.TEXT, allowNull: true },
      sourceDomain: { type: DataTypes.STRING, allowNull: true },
      status: {
        type: DataTypes.ENUM(...STATUS_VALUES),
        allowNull: false,
        defaultValue: 'published',
      },
      publishedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('catalog_recipes', ['status', 'publishedAt']);
    await queryInterface.addIndex('catalog_recipes', ['authorHouseholdId']);
    await queryInterface.addIndex('catalog_recipes', ['authorUserId']);
    await queryInterface.addIndex('catalog_recipes', ['originType', 'status']);

    // Une seule publication vivante par recette perso : rend le "republier =
    // mettre à jour" déterministe, sans bloquer l'historique des publications
    // retirées.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX catalog_recipes_source_recipe_live_unique
      ON catalog_recipes ("sourceRecipeId")
      WHERE "sourceRecipeId" IS NOT NULL AND status <> 'removed';
    `);

    await queryInterface.createTable('catalog_recipe_ingredients', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      catalogRecipeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'catalog_recipes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      // Nullable : ingrédient non mappé (agrégation) ou article d'origine privé
      // au foyer auteur. Dans les deux cas rawText porte l'information.
      itemId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      rawText: { type: DataTypes.TEXT, allowNull: true },
      quantity: { type: DataTypes.DECIMAL(10, 3), allowNull: true },
      unit: {
        type: DataTypes.ENUM(...UNIT_VALUES),
        allowNull: false,
        defaultValue: 'piece',
      },
      isFreeQuantity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      notes: { type: DataTypes.TEXT, allowNull: true },
      usedInSteps: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      displayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('catalog_recipe_ingredients', ['catalogRecipeId', 'displayOrder']);
    await queryInterface.addIndex('catalog_recipe_ingredients', ['itemId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('catalog_recipe_ingredients');
    await queryInterface.dropTable('catalog_recipes');
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_catalog_recipe_ingredients_unit";
      DROP TYPE IF EXISTS "enum_catalog_recipes_status";
      DROP TYPE IF EXISTS "enum_catalog_recipes_originType";
      DROP TYPE IF EXISTS "enum_catalog_recipes_difficulty";
    `);
  },
};
