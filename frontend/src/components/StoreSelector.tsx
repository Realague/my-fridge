import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBrandStore } from '@/stores/brandStore';
import { Brand } from '@/services/brandService';
import BrandLogo from '@/components/BrandLogo';

interface StoreSelectorProps {
  onSelect: (brand: Brand) => void;
}

const StoreSelector = ({ onSelect }: StoreSelectorProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const brands = useBrandStore((s) => s.brands);
  const loading = useBrandStore((s) => s.loading);
  const error = useBrandStore((s) => s.error);
  const loaded = useBrandStore((s) => s.loaded);
  const fetchBrands = useBrandStore((s) => s.fetchBrands);
  const createBrand = useBrandStore((s) => s.createBrand);

  useEffect(() => {
    void fetchBrands();
  }, [fetchBrands]);

  const filtered = search
    ? brands.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    : brands;

  const handleCustomSubmit = async () => {
    const name = customName.trim();
    if (!name) return;
    setCreating(true);
    setCreateError(null);
    try {
      const brand = await createBrand({ name, domain: customDomain.trim() || undefined });
      onSelect(brand);
    } catch {
      setCreateError(t('loyaltyCards.storeSelector.createError'));
    } finally {
      setCreating(false);
    }
  };

  if (showCustom) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">{t('loyaltyCards.storeSelector.customStore')}</h3>
        <Input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder={t('loyaltyCards.storeSelector.enterStoreName')}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
        />
        <Input
          value={customDomain}
          onChange={(e) => setCustomDomain(e.target.value)}
          placeholder={t('loyaltyCards.storeSelector.websitePlaceholder')}
          aria-label={t('loyaltyCards.storeSelector.website')}
        />
        {createError && <p className="text-sm text-destructive">{createError}</p>}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCustom(false)} className="flex-1" disabled={creating}>
            {t('buttons.back')}
          </Button>
          <Button variant="green" onClick={handleCustomSubmit} disabled={!customName.trim() || creating} className="flex-1">
            {creating ? t('loyaltyCards.storeSelector.creating') : t('buttons.confirm')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">{t('loyaltyCards.storeSelector.title')}</h3>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('loyaltyCards.storeSelector.search')}
          className="pl-10"
        />
      </div>

      {loading && !loaded ? (
        <div className="py-8 text-center text-muted-foreground">{t('loyaltyCards.storeSelector.loading')}</div>
      ) : error && !loaded ? (
        <div className="py-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">{t('loyaltyCards.storeSelector.error')}</p>
          <Button variant="outline" onClick={() => fetchBrands(true)}>{t('common.retry')}</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">{t('loyaltyCards.storeSelector.noResults')}</div>
      ) : (
        <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto">
          {filtered.map((brand) => (
            <button
              key={brand.id}
              onClick={() => onSelect(brand)}
              className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <BrandLogo name={brand.name} logoPath={brand.logoPath} color={brand.color} />
              <span className="text-xs font-medium text-foreground text-center leading-tight">{brand.name}</span>
            </button>
          ))}
        </div>
      )}

      <Button variant="outline" className="w-full" onClick={() => setShowCustom(true)}>
        <Store className="h-4 w-4 mr-2" />
        {t('loyaltyCards.storeSelector.other')}
      </Button>
    </div>
  );
};

export default StoreSelector;
