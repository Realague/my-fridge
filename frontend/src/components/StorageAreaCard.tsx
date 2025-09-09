import { Card, CardContent } from '@/components/ui/card';
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
    <Card
      className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-102 cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-orange-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">{area.emoji}</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{area.name}</h3>
              <p className="text-sm text-gray-500">{t(`storageArea.types.${area.type}`)}</p>
              <p className="text-sm text-gray-600">
                {area.itemCount} {area.itemCount === 1 ? t('storageArea.item') : t('storageArea.items')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {area.lowStockCount > 0 && (
              <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">
                {area.lowStockCount} {t('storageArea.low')}
              </Badge>
            )}
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StorageAreaCard;
