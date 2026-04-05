'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [recipes] = await queryInterface.sequelize.query(
      'SELECT id, instructions FROM recipes'
    );

    for (const recipe of recipes) {
      const raw = recipe.instructions;
      const instructions = typeof raw === 'string' ? JSON.parse(raw) : raw;

      if (!Array.isArray(instructions) || instructions.length === 0) continue;

      // Already migrated if first element is an object with a "text" key
      if (typeof instructions[0] === 'object' && instructions[0] !== null && 'text' in instructions[0]) continue;

      const migrated = instructions.map((step) => ({
        text: typeof step === 'string' ? step : String(step),
        duration: null,
      }));

      await queryInterface.sequelize.query(
        'UPDATE recipes SET instructions = :instructions WHERE id = :id',
        { replacements: { instructions: JSON.stringify(migrated), id: recipe.id } }
      );
    }
  },

  async down(queryInterface) {
    const [recipes] = await queryInterface.sequelize.query(
      'SELECT id, instructions FROM recipes'
    );

    for (const recipe of recipes) {
      const raw = recipe.instructions;
      const instructions = typeof raw === 'string' ? JSON.parse(raw) : raw;

      if (!Array.isArray(instructions) || instructions.length === 0) continue;

      // Already plain strings
      if (typeof instructions[0] === 'string') continue;

      const reverted = instructions.map((step) =>
        typeof step === 'object' && step !== null ? step.text : String(step)
      );

      await queryInterface.sequelize.query(
        'UPDATE recipes SET instructions = :instructions WHERE id = :id',
        { replacements: { instructions: JSON.stringify(reverted), id: recipe.id } }
      );
    }
  },
};
