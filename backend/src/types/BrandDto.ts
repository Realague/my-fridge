import { BrandCategory } from './enums';

export interface BrandDto {
  id: string;
  name: string;
  domain: string | null;
  color: string | null;
  logoPath: string | null;
  category: BrandCategory | null;
  isCurated: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomBrandDto {
  name: string;
  domain?: string;
  color?: string;
  category?: BrandCategory;
}

export interface GetBrandsQueryDto {
  search?: string;
  category?: BrandCategory;
  isCurated?: boolean;
}

// Internal shape passed from service to repository on create.
export interface CreateBrandRecord {
  id: string;
  name: string;
  normalizedName: string;
  domain: string | null;
  color: string | null;
  logoPath: string | null;
  category: BrandCategory | null;
  isCurated: boolean;
  usageCount: number;
}
