import { BrandRepository } from '../repositories/BrandRepository';
import { Brand } from '../models/Brand';
import { BrandDto, CreateCustomBrandDto, GetBrandsQueryDto } from '../types/BrandDto';
import { normalizeBrandName, slugifyBrandName } from '../utils/brandNormalize';
import { fetchAndHostLogo } from '../utils/logoDevClient';
import { BadRequestError } from '../errors/CustomErrors';

export class BrandService {
  private brandRepository: BrandRepository;

  constructor() {
    this.brandRepository = new BrandRepository();
  }

  async getBrands(query: GetBrandsQueryDto): Promise<BrandDto[]> {
    const brands = await this.brandRepository.findAll(query);
    return brands.map((b) => this.mapToDto(b));
  }

  async getBrandById(id: string): Promise<BrandDto | null> {
    const brand = await this.brandRepository.findById(id);
    return brand ? this.mapToDto(brand) : null;
  }

  async createCustomBrand(data: CreateCustomBrandDto): Promise<BrandDto> {
    const name = (data.name || '').trim();
    if (!name) {
      throw new BadRequestError('Brand name is required');
    }

    // Dedup: if a brand (curated or custom) already exists with this
    // normalized name, return it instead of creating a duplicate.
    const normalizedName = normalizeBrandName(name);
    if (!normalizedName) {
      throw new BadRequestError('Brand name must contain alphanumeric characters');
    }
    const existing = await this.brandRepository.findByNormalizedName(normalizedName);
    if (existing) {
      return this.mapToDto(existing);
    }

    const id = await this.generateUniqueId(name);

    // Best-effort logo fetch (only when a domain is provided).
    const logoPath = data.domain ? await fetchAndHostLogo(data.domain, id) : null;

    const brand = await this.brandRepository.create({
      id,
      name,
      normalizedName,
      domain: data.domain ? data.domain.trim().toLowerCase() : null,
      color: data.color || null,
      logoPath,
      category: data.category || null,
      isCurated: false,
      usageCount: 1,
    });

    return this.mapToDto(brand);
  }

  async incrementUsage(id: string): Promise<void> {
    await this.brandRepository.incrementUsage(id);
  }

  /**
   * Builds a slug id from the name; appends -2, -3, ... if the id is already
   * taken by a brand with a *different* normalized name (rare slug collision).
   */
  private async generateUniqueId(name: string): Promise<string> {
    const base = slugifyBrandName(name);
    let candidate = base;
    let suffix = 2;
    // eslint-disable-next-line no-await-in-loop
    while (await this.brandRepository.findById(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private mapToDto(brand: Brand): BrandDto {
    return {
      id: brand.id,
      name: brand.name,
      domain: brand.domain,
      color: brand.color,
      logoPath: brand.logoPath,
      category: brand.category,
      isCurated: brand.isCurated,
      usageCount: brand.usageCount,
      createdAt: brand.createdAt.toISOString(),
      updatedAt: brand.updatedAt.toISOString(),
    };
  }
}
