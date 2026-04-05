import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { storeCatalog, StoreCatalogEntry } from '@/data/storeCatalog';

interface StoreSelectorProps {
  onSelect: (store: StoreCatalogEntry | null, customName?: string) => void;
}

const StoreLogo = ({ store, size = 'md' }: { store: StoreCatalogEntry; size?: 'sm' | 'md' }) => {
  const [imgError, setImgError] = useState(false);
  const sizeClass = size === 'sm' ? 'w-8 h-8' : 'w-12 h-12';
  const padClass = size === 'sm' ? 'p-1' : 'p-2';
  const textSize = size === 'sm' ? 'text-sm' : 'text-lg';

  if (imgError || !store.logoUrl) {
    return (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold ${textSize} shrink-0`}
        style={{ backgroundColor: store.color }}
      >
        {store.name.charAt(0)}
      </div>
    );
  }

  return (
    <div className={`${sizeClass} rounded-full bg-white flex items-center justify-center ${padClass} shrink-0`}>
      <img
        src={store.logoUrl}
        alt={store.name}
        className="w-full h-full object-contain"
        onError={() => setImgError(true)}
      />
    </div>
  );
};

const StoreSelector = ({ onSelect }: StoreSelectorProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');

  const filtered = search
    ? storeCatalog.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : storeCatalog;

  const handleCustomSubmit = () => {
    if (customName.trim()) {
      onSelect(null, customName.trim());
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCustom(false)} className="flex-1">
            {t('buttons.back')}
          </Button>
          <Button variant="green" onClick={handleCustomSubmit} disabled={!customName.trim()} className="flex-1">
            {t('buttons.confirm')}
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

      <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto">
        {filtered.map((store) => (
          <button
            key={store.slug}
            onClick={() => onSelect(store)}
            className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
          >
            <StoreLogo store={store} />
            <span className="text-xs font-medium text-foreground text-center leading-tight">{store.name}</span>
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => setShowCustom(true)}
      >
        <Store className="h-4 w-4 mr-2" />
        {t('loyaltyCards.storeSelector.other')}
      </Button>
    </div>
  );
};

export { StoreLogo };
export default StoreSelector;
