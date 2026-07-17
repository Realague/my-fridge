import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { brandService, Brand, CreateCustomBrandRequest } from '@/services/brandService';

interface BrandStore {
  brands: Brand[];
  loaded: boolean;
  loading: boolean;
  error: string | null;

  fetchBrands: (force?: boolean) => Promise<void>;
  createBrand: (data: CreateCustomBrandRequest) => Promise<Brand>;
  getBrandBySlug: (slug: string | null | undefined) => Brand | undefined;
}

export const useBrandStore = create<BrandStore>()(
  devtools(
    (set, get) => ({
      brands: [],
      loaded: false,
      loading: false,
      error: null,

      fetchBrands: async (force = false) => {
        if (get().loaded && !force) return;
        set({ loading: true, error: null });
        try {
          const brands = await brandService.getBrands();
          set({ brands, loaded: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch brands';
          set({ error: message });
        } finally {
          set({ loading: false });
        }
      },

      createBrand: async (data: CreateCustomBrandRequest) => {
        set({ error: null });
        try {
          const brand = await brandService.createBrand(data);
          // Merge: replace if the id already exists (dedup returns existing), else append.
          set((state) => {
            const others = state.brands.filter((b) => b.id !== brand.id);
            return { brands: [...others, brand] };
          });
          return brand;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create brand';
          set({ error: message });
          throw error;
        }
      },

      getBrandBySlug: (slug) => {
        if (!slug) return undefined;
        return get().brands.find((b) => b.id === slug);
      },
    }),
    { name: 'brand-store' }
  )
);
