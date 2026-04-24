import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Item } from '@/services/itemService';
import { getItemDisplayName } from '@/utils/itemUtils';
import { CategoryIcon } from '@/utils/categoryIcons';
import { X } from 'lucide-react';
import { ItemImage } from '@/components/ItemImage';
import { useTranslation } from 'react-i18next';

interface SelectedItemPreviewProps {
  item: Item;
  onClear: () => void;
}

export const SelectedItemPreview = ({ item, onClear }: SelectedItemPreviewProps) => {
  const { t } = useTranslation();

  return (
    <Card className="border-2 border-primary/20 bg-primary/5 animate-in fade-in-50 slide-in-from-top-2 duration-300">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <ItemImage
                src={item.imageUrl}
                alt={getItemDisplayName(item, t)}
                containerClassName="w-10 h-10 rounded-md"
                fallbackIconSize={40}
                category={item.category}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">{getItemDisplayName(item, t)}</h3>
                {item.householdId && (
                  <Badge variant="secondary" className="text-xs">
                    {t('forms.householdItem')}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground capitalize inline-flex items-center gap-1.5">
                <CategoryIcon category={item.category} className="h-3.5 w-3.5" />
                {t(`items.categories.${item.category}`)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 w-8 p-0 -mr-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
