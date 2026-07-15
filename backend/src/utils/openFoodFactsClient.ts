import axios from 'axios';
import { ItemCategory, Unit } from '../types/enums';
import { mapOffCategory, mapPnnsGroup, suggestUnit } from './offCategoryMapping';

/**
 * Normalized Open Food Facts product, mapped onto My Fridge concepts and ready
 * to pre-fill the "create item" form.
 */
export interface OffProduct {
  barcode: string;
  name: string;
  imageUrl: string | null;
  quantity: string | null;
  category: ItemCategory;
  suggestedUnit: Unit;
}

const OFF_TIMEOUT_MS = 5000;

/**
 * Look up a product on Open Food Facts by barcode.
 *
 * API: GET https://world.openfoodfacts.org/api/v3/product/{barcode}.json
 * (free, no key). Best-effort: returns null on timeout, network error, or when
 * OFF has no product for the barcode. Never throws.
 */
export async function lookupOffProduct(barcode: string): Promise<OffProduct | null> {
  const clean = String(barcode).trim();
  if (!/^\d{6,14}$/.test(clean)) {
    // Only numeric EAN/UPC codes are meaningful to OFF.
    return null;
  }

  try {
    const url = `https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(clean)}.json`;
    const response = await axios.get(url, {
      timeout: OFF_TIMEOUT_MS,
      headers: {
        // OFF asks API consumers to identify themselves via User-Agent.
        'User-Agent': 'MyFridge/1.0 (https://github.com/realague/my-fridge)',
        Accept: 'application/json',
      },
      // Treat 404 (product not found) as a normal "no result", not an error.
      validateStatus: (status) => status === 200 || status === 404,
    });

    const data = response.data;
    // v3 returns { status: 'success' | 'failure', product: {...} }
    if (!data || data.status !== 'success' || !data.product) {
      return null;
    }

    const product = data.product;
    // Locale-first name cascade. The brand is intentionally NOT merged in — the
    // name is what matches the catalog; brand is separate metadata.
    const name: string =
      product.product_name_fr ||
      product.product_name ||
      product.product_name_en ||
      product.generic_name_fr ||
      product.generic_name ||
      '';

    const cleanedName = cleanProductName(name);
    if (!cleanedName) {
      // A product with no usable name is treated as "not identified".
      return null;
    }

    // Category: prefer OFF's PNNS groups (small controlled vocabulary); fall
    // back to the sprawling categories_tags.
    const categoriesTags: string[] = Array.isArray(product.categories_tags)
      ? product.categories_tags
      : [];
    const category =
      mapPnnsGroup(product.pnns_groups_2, product.pnns_groups_1) ?? mapOffCategory(categoriesTags);
    const quantity: string | null =
      typeof product.quantity === 'string' && product.quantity.trim() ? product.quantity.trim() : null;

    return {
      barcode: clean,
      name: cleanedName,
      imageUrl: pickProductImage(product, clean),
      quantity,
      category,
      suggestedUnit: suggestUnit(quantity, category),
    };
  } catch (error) {
    // Timeout / network / parsing — best-effort, swallow and report "no result".
    console.warn(`Open Food Facts lookup failed for barcode ${clean}:`, (error as Error).message);
    return null;
  }
}

/**
 * Clean a community-entered Open Food Facts product name: strip emojis and
 * pictographs, collapse whitespace, trim, and cap length. The result is only a
 * pre-fill — the user can still edit it in the form.
 */
function cleanProductName(raw: string): string {
  return raw
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{20E3}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

/**
 * Pick the best available product image from an Open Food Facts product.
 *
 * `image_front_url`/`image_url` only exist when a contributor has *selected* a
 * "front" image. Many products have images uploaded but no front selected — in
 * that case OFF still exposes the packaging/ingredients/nutrition selected
 * images and the raw numbered uploads. We fall back through all of them so a
 * product with any photo at all resolves to something displayable.
 */
function pickProductImage(product: Record<string, unknown>, barcode: string): string | null {
  // 1. Locale-selected front image (best): selected_images.front.display, fr
  //    first, then en, then any language — the front photo can differ per lang.
  const selectedFront = (product.selected_images as { front?: { display?: Record<string, unknown> } } | undefined)
    ?.front?.display;
  if (selectedFront && typeof selectedFront === 'object') {
    for (const lang of ['fr', 'en', ...Object.keys(selectedFront)]) {
      const url = selectedFront[lang];
      if (typeof url === 'string' && url.trim()) return url;
    }
  }

  // 2. The built "front" display URLs (front photo in the product's main lang).
  for (const field of ['image_front_url', 'image_url', 'image_front_small_url']) {
    const value = product[field];
    if (typeof value === 'string' && value.trim()) return value;
  }

  // 3. Raw uploaded photos. These are the actual product pictures (usually the
  //    front-of-pack), and are far more representative than the packaging /
  //    ingredients / nutrition images, which are CROPS of text panels. Prefer
  //    the first upload (typically the original front shot).
  const images = product.images;
  if (images && typeof images === 'object') {
    const numericIds = Object.keys(images as Record<string, unknown>)
      .filter((k) => /^\d+$/.test(k))
      .sort((a, b) => Number(a) - Number(b));
    if (numericIds.length > 0) {
      return `https://images.openfoodfacts.org/images/products/${barcodeToImagePath(barcode)}/${numericIds[0]}.400.jpg`;
    }
  }

  // 4. Last resort: the packaging crop (ingredients/nutrition are pure text
  //    panels, so we never use them as the product image).
  const packaging = product.image_packaging_url ?? product.image_packaging_small_url;
  if (typeof packaging === 'string' && packaging.trim()) return packaging;

  return null;
}

/**
 * Open Food Facts stores product images under a path derived from the barcode:
 * barcodes longer than 8 digits are split into groups of 3 (then the remainder),
 * e.g. `8410076610737` -> `841/007/661/0737`. Shorter codes are used as-is.
 */
function barcodeToImagePath(barcode: string): string {
  if (barcode.length <= 8) return barcode;
  const match = barcode.match(/^(\d{3})(\d{3})(\d{3})(.+)$/);
  return match ? `${match[1]}/${match[2]}/${match[3]}/${match[4]}` : barcode;
}
