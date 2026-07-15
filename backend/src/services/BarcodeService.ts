import { BarcodeMappingRepository } from '../repositories/BarcodeMappingRepository';
import { ItemRepository } from '../repositories/ItemRepository';
import { ApiResponse } from '../types/ApiResponse';
import { ItemDto } from '../types/ItemDto';
import { Item } from '../models/Item';
import { BarcodeMapping } from '../models/BarcodeMapping';
import { lookupOffProduct, OffProduct } from '../utils/openFoodFactsClient';
import { uploadImageFromUrl } from '../utils/imageUploader';

/**
 * Result of resolving a scanned barcode for a given household.
 *  - `catalog`: the barcode maps to a catalog Item visible to the household.
 *  - `off`:     no usable mapping, but Open Food Facts returned a product to
 *               pre-fill a "create item" form.
 *  - `unknown`: neither a mapping nor Open Food Facts could identify it.
 */
export type BarcodeLookupResult =
  | { match: 'catalog'; item: ItemDto; mappingId: string; validatedCount: number; confidence: number }
  | { match: 'off'; product: OffProduct }
  | { match: 'unknown'; barcode: string };

export class BarcodeService {
  private barcodeMappingRepository: BarcodeMappingRepository;
  private itemRepository: ItemRepository;

  constructor(barcodeMappingRepository?: BarcodeMappingRepository, itemRepository?: ItemRepository) {
    this.barcodeMappingRepository = barcodeMappingRepository || new BarcodeMappingRepository();
    this.itemRepository = itemRepository || new ItemRepository();
  }

  /**
   * Resolve a scanned barcode for a household. Checks the global mapping table
   * first (preferring a mapping whose item is visible to this household), then
   * falls back to Open Food Facts.
   */
  async lookup(householdId: string, barcode: string): Promise<ApiResponse<BarcodeLookupResult>> {
    try {
      const clean = String(barcode ?? '').trim();
      if (!clean) {
        return { success: false, error: 'Barcode is required' };
      }

      const mappings = await this.barcodeMappingRepository.findByBarcode(clean);

      // Pick the best mapping whose item is visible to this household. A global
      // item (householdId === null) is visible to everyone; a personal item is
      // visible only to its owning household.
      const usable = mappings.find((m) => m.item && this.isItemVisible(m.item, householdId));
      if (usable && usable.item) {
        console.log(`[barcode] ${clean} -> catalog match "${usable.item.name}" imageUrl=${usable.item.imageUrl ?? 'null'}`);
        return {
          success: true,
          data: {
            match: 'catalog',
            item: this.formatItem(usable.item),
            mappingId: usable.id,
            validatedCount: usable.validatedCount,
            confidence: usable.confidence,
          },
        };
      }

      // No usable mapping — ask Open Food Facts.
      const product = await lookupOffProduct(clean);
      console.log(`[barcode] ${clean} -> OFF ${product ? `name="${product.name}" rawImage=${product.imageUrl ?? 'null'}` : 'no product'}`);
      if (product) {
        // Open Food Facts serves images from images.openfoodfacts.org, which is
        // often unreachable from clients on restricted/corporate networks (even
        // when the API host is reachable). Re-host the image on Cloudinary —
        // which the backend fetches server-side — so the client gets a reliable
        // URL and the created item keeps a persistent image. Best-effort:
        // keep the raw OFF URL if hosting fails. Idempotent per barcode.
        if (product.imageUrl) {
          // Key the Cloudinary asset on the *source image*, not just the barcode,
          // so a change in which OFF image we pick can't be shadowed by a stale
          // upload (overwrite:false). Idempotent per source image.
          const slug =
            product.imageUrl
              .split('/')
              .pop()
              ?.replace(/\.[a-z]+$/i, '')
              .replace(/[^a-z0-9]+/gi, '-')
              .toLowerCase() || 'img';
          const hosted = await uploadImageFromUrl(product.imageUrl, `off-${clean}-${slug}`, 'items');
          console.log(`[barcode] ${clean} -> Cloudinary hosted=${hosted ?? 'FAILED (keeping raw OFF url)'}`);
          if (hosted) product.imageUrl = hosted;
        }
        return { success: true, data: { match: 'off', product } };
      }

      return { success: true, data: { match: 'unknown', barcode: clean } };
    } catch (error) {
      console.error('Error resolving barcode:', error);
      return { success: false, error: 'Failed to resolve barcode' };
    }
  }

  /**
   * Record (or reinforce) a barcode → item mapping in the global table. If the
   * (barcode, item) pair already exists its validated_count and confidence are
   * bumped; otherwise a new row is created. Shared across all households.
   */
  async confirmMapping(
    householdId: string,
    barcode: string,
    itemId: string,
    userId: string | null,
    format?: string | null
  ): Promise<ApiResponse<{ mappingId: string; validatedCount: number; confidence: number }>> {
    try {
      const clean = String(barcode ?? '').trim();
      if (!clean || !itemId) {
        return { success: false, error: 'Barcode and itemId are required' };
      }

      // The item must exist and be visible to this household to be mapped.
      const item = await this.itemRepository.findById(itemId);
      if (!item || !this.isItemVisible(item, householdId)) {
        return { success: false, error: 'Item not found' };
      }

      const existing = await this.barcodeMappingRepository.findByBarcodeAndItem(clean, itemId);
      let mapping: BarcodeMapping;

      if (existing) {
        existing.validatedCount += 1;
        // Confidence grows with confirmations, capped at 1.
        existing.confidence = Math.min(1, Number(existing.confidence) + 0.1);
        await existing.save();
        mapping = existing;
      } else {
        mapping = await this.barcodeMappingRepository.create({
          barcode: clean,
          itemId,
          format: format ?? null,
          createdBy: userId,
        });
      }

      return {
        success: true,
        data: {
          mappingId: mapping.id,
          validatedCount: mapping.validatedCount,
          confidence: mapping.confidence,
        },
      };
    } catch (error) {
      console.error('Error confirming barcode mapping:', error);
      return { success: false, error: 'Failed to confirm barcode mapping' };
    }
  }

  private isItemVisible(item: Item, householdId: string): boolean {
    return item.householdId === null || item.householdId === householdId;
  }

  private formatItem(item: Item): ItemDto {
    let availableUnits = item.availableUnits as unknown;
    if (typeof availableUnits === 'string') {
      try {
        availableUnits = JSON.parse(availableUnits);
      } catch {
        availableUnits = [item.defaultUnit];
      }
    }
    if (!Array.isArray(availableUnits)) {
      availableUnits = [item.defaultUnit];
    }

    return {
      id: item.id,
      name: item.name,
      category: item.category,
      defaultUnit: item.defaultUnit,
      availableUnits: availableUnits as ItemDto['availableUnits'],
      pieceAlias: item.pieceAlias ?? null,
      imageUrl: item.imageUrl,
      createdBy: item.createdBy,
      householdId: item.householdId,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
