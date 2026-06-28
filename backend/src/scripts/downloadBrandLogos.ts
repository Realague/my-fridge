import dotenv from 'dotenv';
import { Op } from 'sequelize';
import { sequelize, Brand } from '../models';
import { fetchAndHostLogo } from '../utils/logoDevClient';

dotenv.config();

/**
 * One-shot: for every brand that has a domain but no logoPath, fetch the
 * logo from logo.dev and host it on Cloudinary (folder `brands`), then
 * update logoPath. Re-runnable: already-hosted logos are skipped. Failures
 * are logged and do not stop the run.
 */
async function main(): Promise<void> {
  if (!process.env.LOGODEV_PUBLISHABLE_KEY) {
    console.error('LOGODEV_PUBLISHABLE_KEY is not set. Aborting.');
    process.exit(1);
  }

  await sequelize.authenticate();

  const brands = await Brand.findAll({
    where: { domain: { [Op.ne]: null }, logoPath: null },
  });

  console.log(`Found ${brands.length} brand(s) needing a logo.`);

  let ok = 0;
  let failed = 0;
  for (const brand of brands) {
    const hosted = await fetchAndHostLogo(brand.domain, brand.id);
    if (hosted) {
      await brand.update({ logoPath: hosted });
      ok += 1;
      console.log(`✓ ${brand.id} -> ${hosted}`);
    } else {
      failed += 1;
      console.warn(`✗ ${brand.id} (${brand.domain}) — no logo hosted`);
    }
  }

  console.log(`Done. ${ok} hosted, ${failed} failed.`);
  await sequelize.close();
}

main().catch((err) => {
  console.error('downloadBrandLogos failed:', err);
  process.exit(1);
});
