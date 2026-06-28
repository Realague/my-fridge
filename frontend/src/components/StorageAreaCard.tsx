import { CardButton, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { StorageAreaIcon } from '@/utils/storageAreaIcons';

interface StorageArea {
  id: string;
  name: string;
  emoji: string;
  type: string;
  itemCount: number;
  lowStockCount: number;
}

interface StorageAreaCardProps {
  area: StorageArea;
  onClick: () => void;
}

// Fresh tile — compact slot in the dashboard "Zones de stockage" grid.
// Sub-cream surface, square emoji thumb, ink display title + soft count.
// Low-stock signal moved to a discreet dot on the thumb to keep the grid calm.
const StorageAreaCard = ({ area, onClick }: StorageAreaCardProps) => {
  const { t } = useTranslation();

  return (
    <CardButton
      variant="elevated"
      onClick={onClick}
      className="w-full rounded-md bg-mf-night-elevated border-0 shadow-none hover:bg-mf-night-line transition-colors"
      aria-label={`${area.name} — ${t(`storageArea.types.${area.type}`)} — ${t('storageArea.itemCount', { count: area.itemCount })}${area.lowStockCount > 0 ? `, ${area.lowStockCount} ${t('storageArea.low')}` : ''}`}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <div className="relative h-11 w-11 shrink-0 rounded-md bg-white dark:bg-mf-night flex items-center justify-center">
          <StorageAreaIcon type={area.type} className="h-6 w-6" />
          {area.lowStockCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-mf-warning text-white font-display text-[10px] font-bold leading-none ring-2 ring-mf-night-elevated"
              aria-label={`${area.lowStockCount} ${t('storageArea.low')}`}
            >
              {area.lowStockCount > 9 ? '9+' : area.lowStockCount}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="font-display font-bold text-mf-text truncate">{area.name}</div>
          <div className="text-xs text-mf-text-soft">
            {t('storageArea.itemCount', { count: area.itemCount })}
          </div>
        </div>
      </CardContent>
    </CardButton>
  );
};

export default StorageAreaCard;
