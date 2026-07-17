import { BarcodeMapping } from '../models/BarcodeMapping';
import { Item } from '../models/Item';

export class BarcodeMappingRepository {
  /**
   * All mappings for a barcode, best first (highest validated_count, then
   * highest confidence). The linked catalog Item is eagerly loaded so callers
   * can filter by household visibility.
   */
  async findByBarcode(barcode: string): Promise<BarcodeMapping[]> {
    return await BarcodeMapping.findAll({
      where: { barcode },
      include: [{ model: Item, as: 'item' }],
      order: [
        ['validatedCount', 'DESC'],
        ['confidence', 'DESC'],
      ],
    });
  }

  async findByBarcodeAndItem(barcode: string, itemId: string): Promise<BarcodeMapping | null> {
    return await BarcodeMapping.findOne({ where: { barcode, itemId } });
  }

  async create(data: {
    barcode: string;
    itemId: string;
    format?: string | null;
    createdBy: string | null;
  }): Promise<BarcodeMapping> {
    return await BarcodeMapping.create({
      barcode: data.barcode,
      itemId: data.itemId,
      format: (data.format as any) ?? null,
      createdBy: data.createdBy,
    });
  }
}
