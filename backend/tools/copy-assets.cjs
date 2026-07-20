// Copies non-TS runtime assets that `tsc` does not emit into dist/.
// tsc only emits compiled .ts; data files read at runtime via fs.readFileSync
// must be copied explicitly or they are missing from the production image.
//
// Currently: reference-data JSON seeded by a startup migration
// (src/migrations/202606281-seed-curated-brands.js reads dist/scripts/enseignes.json).
const fs = require('fs');
const path = require('path');

// [source, destination] relative to the backend package root.
const assets = [
  ['src/scripts/enseignes.json', 'dist/scripts/enseignes.json'],
];

const root = path.resolve(__dirname, '..');

for (const [from, to] of assets) {
  const src = path.join(root, from);
  const dest = path.join(root, to);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`Copied asset: ${from} -> ${to}`);
}
