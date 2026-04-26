import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, PackageOpen, Snowflake, Trash2 } from 'lucide-react';
import type { StoredItem } from '@/services/storedItemService';
import type { Item } from '@/services/itemService';
import type { StorageArea } from '@/services/storageAreaService';
import { useTranslation } from 'react-i18next';
import { useDateFormat } from '@/utils/dateFormatting';
import { ItemImage } from '@/components/ItemImage';
import { CategoryIcon } from '@/utils/categoryIcons';
import { getCategoryColor, getItemDisplayName } from '@/utils/itemUtils';
import { formatQuantityWithUnit } from '@/utils/unitSystem';
import { StorageAreaType } from '@/types/enums';

interface MyProductsItemCardProps {
  storedItem: StoredItem;
  item: Item | undefined;
  area: StorageArea | undefined;
  currentUserId: string | undefined;
  onDelete: (storedItemId: string) => void;
}

function getDaysUntilExpiration(expirationDate?: string | null): number | null {
  if (!expirationDate) return null;
  const expDate = new Date(expirationDate);
  const diffMs = expDate.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getDaysSince(date: string): number {
  const diffMs = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function MyProductsItemCard({
  storedItem,
  item,
  area,
  currentUserId,
  onDelete,
}: MyProductsItemCardProps) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const navigate = useNavigate();

  if (!item) {
    return (
      <Card className="bg-card backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">{t('common.loading')}</div>
        </CardContent>
      </Card>
    );
  }

  const goToArea = () => {
    if (area) navigate(`/storage/${area.id}`);
  };

  const handleAreaBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    goToArea();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(storedItem.id);
  };

  const expirationSource = storedItem.effectiveExpirationDate || storedItem.expirationDate;
  const isFreezerArea = area?.type === StorageAreaType.FREEZER;
  const daysUntilExpiration = getDaysUntilExpiration(expirationSource);

  const expirationBadge = (() => {
    if (isFreezerArea || daysUntilExpiration === null) return null;
    if (daysUntilExpiration < 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          {t('storageArea.expired')}
        </Badge>
      );
    }
    if (daysUntilExpiration <= 2) {
      return (
        <Badge variant="destructive" className="text-xs">
          {t('storageArea.expiresIn', { days: daysUntilExpiration })}
        </Badge>
      );
    }
    if (daysUntilExpiration <= 7) {
      return (
        <Badge
          variant="secondary"
          className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
        >
          {t('storageArea.expiresIn', { days: daysUntilExpiration })}
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      >
        {t('storageArea.fresh', { days: daysUntilExpiration })}
      </Badge>
    );
  })();

  const openedDaysAgo =
    storedItem.isOpened && storedItem.openedDate ? getDaysSince(storedItem.openedDate) : null;

  return (
    <Card
      className="bg-card backdrop-blur-sm border-0 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200"
      onClick={goToArea}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <ItemImage
            src={item.imageUrl}
            alt={getItemDisplayName(item, t)}
            containerClassName="w-16 h-16 rounded-lg"
            fallbackIconSize={48}
            category={item.category}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="font-medium text-foreground">{getItemDisplayName(item, t)}</h3>

              <Badge
                variant="outline"
                className={`${getCategoryColor(item.category)} inline-flex items-center gap-1`}
              >
                <CategoryIcon category={item.category} className="h-3.5 w-3.5" />
                {t(`items.categories.${item.category}`)}
              </Badge>

              {area && (
                <button
                  type="button"
                  onClick={handleAreaBadgeClick}
                  className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted px-2 py-0.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
                  aria-label={`${t('pages.myProducts.filterByArea')} — ${area.name}`}
                >
                  <span aria-hidden>{area.emoji}</span>
                  <span className="truncate max-w-[10rem]">{area.name}</span>
                </button>
              )}

              {storedItem.isOpened && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                >
                  <PackageOpen className="h-3 w-3 mr-1" />
                  {t('storedItems.opened')}
                </Badge>
              )}

              {(isFreezerArea || storedItem.frozenDate) && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                >
                  <Snowflake className="h-3 w-3 mr-1" />
                  {t('storedItems.frozen')}
                </Badge>
              )}

              {expirationBadge}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {formatQuantityWithUnit(storedItem.quantity, storedItem.unit, t, {
                    item,
                    itemName: getItemDisplayName(item, t),
                  })}
                </span>
                {storedItem.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{storedItem.location}</span>
                  </div>
                )}
              </div>

              {storedItem.creator && (
                <p className="text-xs text-muted-foreground">
                  {t('common.addedBy', {
                    name:
                      storedItem.creator.id === currentUserId
                        ? t('common.you')
                        : storedItem.creator.displayName,
                  })}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {t('storageArea.added')} {formatDate(new Date(storedItem.createdAt), 'MMM d')}
                  </span>
                </div>

                {openedDaysAgo !== null && (
                  <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                    <PackageOpen className="h-3 w-3" />
                    <span>
                      {openedDaysAgo === 0
                        ? t('pages.myProducts.openedToday')
                        : t('pages.myProducts.openedDaysAgo', { count: openedDaysAgo })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Button
              variant="deleteTrash"
              size="sm"
              onClick={handleDelete}
              className="h-8 w-8 p-0"
              aria-label={t('buttons.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
