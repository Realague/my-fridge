import { Op } from 'sequelize';
import { Brand } from '../models/Brand';
import { GetBrandsQueryDto, CreateBrandRecord } from '../types/BrandDto';

export class BrandRepository {
  async findAll(query: GetBrandsQueryDto): Promise<Brand[]> {
    const where: any = {};

    if (query.category) {
      where.category = query.category;
    }
    if (typeof query.isCurated === 'boolean') {
      where.isCurated = query.isCurated;
    }
    if (query.search && query.search.trim()) {
      where.name = { [Op.iLike]: `%${query.search.trim()}%` };
    }

    return await Brand.findAll({
      where,
      order: [
        ['isCurated', 'DESC'],
        ['usageCount', 'DESC'],
        ['name', 'ASC'],
      ],
    });
  }

  async findById(id: string): Promise<Brand | null> {
    return await Brand.findByPk(id);
  }

  async findByNormalizedName(normalizedName: string): Promise<Brand | null> {
    return await Brand.findOne({ where: { normalizedName } });
  }

  async create(data: CreateBrandRecord): Promise<Brand> {
    return await Brand.create(data);
  }

  async incrementUsage(id: string): Promise<void> {
    await Brand.increment('usageCount', { by: 1, where: { id } });
  }
}
