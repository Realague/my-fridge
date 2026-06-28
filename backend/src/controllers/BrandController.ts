import { Request, Response } from 'express';
import { BrandService } from '../services/BrandService';
import { CreateCustomBrandDto, GetBrandsQueryDto } from '../types/BrandDto';
import { ApiResponse } from '../types/ApiResponse';
import { BadRequestError, NotFoundError } from '../errors/CustomErrors';
import { BrandCategory, BRAND_CATEGORIES } from '../types/enums';

export class BrandController {
  private brandService: BrandService;

  constructor() {
    this.brandService = new BrandService();
  }

  async getBrands(req: Request, res: Response): Promise<void> {
    try {
      const categoryParam = req.query.category as string | undefined;
      if (categoryParam && !BRAND_CATEGORIES.includes(categoryParam as BrandCategory)) {
        throw new BadRequestError('Invalid brand category');
      }

      const category = categoryParam ? (categoryParam as BrandCategory) : undefined;
      const search = req.query.search ? (req.query.search as string) : undefined;
      const query: GetBrandsQueryDto = {
        search,
        category,
        isCurated: req.query.isCurated === undefined ? undefined : req.query.isCurated === 'true',
      };

      const brands = await this.brandService.getBrands(query);

      const response: ApiResponse = {
        success: true,
        message: 'Brands retrieved successfully',
        data: brands,
      };
      res.json(response);
    } catch (error) {
      res.status(error instanceof BadRequestError ? 400 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve brands',
      });
    }
  }

  async getBrandById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const brand = await this.brandService.getBrandById(id);
      if (!brand) {
        throw new NotFoundError('Brand not found');
      }
      const response: ApiResponse = {
        success: true,
        message: 'Brand retrieved successfully',
        data: brand,
      };
      res.json(response);
    } catch (error) {
      res.status(error instanceof NotFoundError ? 404 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve brand',
      });
    }
  }

  async createCustomBrand(req: Request, res: Response): Promise<void> {
    try {
      const { name, domain, color, category } = req.body || {};
      if (!name || typeof name !== 'string') {
        throw new BadRequestError('Brand name is required');
      }
      if (category && !BRAND_CATEGORIES.includes(category as BrandCategory)) {
        throw new BadRequestError('Invalid brand category');
      }

      const dto: CreateCustomBrandDto = { name, domain, color, category };
      const brand = await this.brandService.createCustomBrand(dto);

      const response: ApiResponse = {
        success: true,
        message: 'Brand created successfully',
        data: brand,
      };
      res.status(201).json(response);
    } catch (error) {
      res.status(error instanceof BadRequestError ? 400 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create brand',
      });
    }
  }
}
