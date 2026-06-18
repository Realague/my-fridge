import { CardButton, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

const StorageAreaCard = ({ area, onClick }: StorageAreaCardProps) => {
  const { t } = useTranslation();

  return (
    <CardButton
      variant="elevated"
      onClick={onClick}
      aria-label={`${area.name} — ${t(`storageArea.types.${area.type}`)} — ${t('storageArea.itemCount', { count: area.itemCount })}${area.lowStockCount > 0 ? `, ${area.lowStockCount} ${t('storageArea.low')}` : ''}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">{area.emoji}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">{area.name}</h3>
              <p className="text-sm text-muted-foreground">{t(`storageArea.types.${area.type}`)}</p>
              <p className="text-sm text-muted-foreground">
                {t('storageArea.itemCount', { count: area.itemCount })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {area.lowStockCount > 0 && (
              <Badge variant="destructive" className="bg-mf-warning text-white hover:bg-mf-warning/90">
                {area.lowStockCount} {t('storageArea.low')}
              </Badge>
            )}
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </CardButton>
  );
};

export default StorageAreaCard;
