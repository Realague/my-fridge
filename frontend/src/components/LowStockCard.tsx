import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ItemImage } from '@/components/ItemImage';
import { Check, Settings, ShoppingCart, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useItemMinimumStore } from '@/stores/itemMinimumStore';
import { useShoppingStore } from '@/stores/shoppingStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { useCallback, useMemo } from 'react';
import { getItemDisplayName } from '@/utils/itemUtils';
import { getTranslatedUnitLabel } from '@/utils/unitSystem';
import { motion, useReducedMotion } from 'framer-motion';
import { scrollRevealFadeUp } from '@/lib/motion';

export const LowStockCard = () => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const navigate = useNavigate();
  const lowStockAlertsEnabled = useAuthStore((s) => s.user?.lowStockAlertsEnabled !== false);
  const { getLowStockItemsForHousehold } = useItemMinimumStore();
  const { createShoppingItem, items: shoppingItems } = useShoppingStore();
  const lowStockItems = getLowStockItemsForHousehold();

  const shoppingItemIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of shoppingItems) {
      if (!item.completed && item.item?.id) {
        ids.add(item.item.id);
      }
    }
    return ids;
  }, [shoppingItems]);

  const isInShoppingList = useCallback(
    (itemId: string) => shoppingItemIds.has(itemId),
    [shoppingItemIds]
  );

  const handleAddToShopping = async (itemId: string, quantity: number, unit: string) => {
    try {
      await createShoppingItem({
        itemId,
        quantity: quantity.toString(),
        unit,
      });
      toast.success(t('pages.dashboard.addedToShoppingList'));
    } catch (error) {
      console.error('Failed to add to shopping:', error);
    }
  };

  if (!lowStockAlertsEnabled || lowStockItems.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 bg-mf-night-surface shadow-none">
      <CardHeader className="px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mf-purple-soft text-mf-purple-deep"
            >
              <TrendingDown className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <CardTitle className="font-display text-mf-text">
                <span className="truncate">{t('pages.dashboard.lowStockItems')}</span>
              </CardTitle>
              <CardDescription className="text-mf-text-soft mt-1">
                {t('pages.dashboard.itemsNeedRestock', { count: lowStockItems.length })}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/item-minimums')}
            className="rounded-full bg-mf-night-elevated text-mf-text hover:bg-mf-night-line shrink-0 w-full sm:w-auto font-display font-semibold"
          >
            <Settings className="h-4 w-4 mr-1.5" />
            {t('itemMinimum.manageMinimums')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="space-y-2.5">
          {lowStockItems.slice(0, 3).map((lowStockItem) => {
            const inList = isInShoppingList(lowStockItem.itemMinimum.itemId);
            const item = lowStockItem.itemMinimum.item;
            const displayName = getItemDisplayName(item, t);
            return (
              <motion.div
                key={lowStockItem.itemMinimum.id}
                className="flex items-center justify-between gap-3 p-3 bg-mf-night-elevated rounded-md"
                {...scrollRevealFadeUp(prefersReducedMotion)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <ItemImage
                    src={item?.imageUrl}
                    alt={displayName}
                    category={item?.category}
                    fallbackIconSize={24}
                    containerClassName="h-11 w-11 rounded-md bg-mf-night-surface"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold text-mf-text truncate">
                      {displayName}
                    </div>
                    <div className="text-xs text-mf-text-soft">
                      {t('itemMinimum.quantityNeeded', {
                        quantity: lowStockItem.quantityNeeded,
                        unit: getTranslatedUnitLabel(
                          lowStockItem.itemMinimum.minimumUnit,
                          lowStockItem.quantityNeeded,
                          t
                        ),
                      })}
                    </div>
                  </div>
                </div>
                {inList ? (
                  <span
                    className="inline-flex items-center justify-center gap-1.5 shrink-0 rounded-full bg-mf-green-soft text-mf-green-deep h-8 w-8 sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 font-display text-xs font-bold"
                    title={t('pages.dashboard.alreadyInShoppingList')}
                    aria-label={t('pages.dashboard.alreadyInShoppingList')}
                  >
                    <Check className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline truncate">
                      {t('pages.dashboard.alreadyInShoppingList')}
                    </span>
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const shoppingQty = lowStockItem.itemMinimum.shoppingQuantity;
                      const addQuantity =
                        shoppingQty > 0
                          ? Math.ceil(lowStockItem.quantityNeeded / shoppingQty) * shoppingQty
                          : lowStockItem.quantityNeeded;
                      handleAddToShopping(
                        lowStockItem.itemMinimum.itemId,
                        addQuantity,
                        lowStockItem.itemMinimum.minimumUnit
                      );
                    }}
                    className="shrink-0 rounded-full bg-mf-green-soft text-mf-green-deep hover:bg-mf-green hover:text-white font-display font-bold px-4"
                  >
                    <ShoppingCart className="h-4 w-4 mr-1.5" />
                    {t('buttons.add')}
                  </Button>
                )}
              </motion.div>
            );
          })}
          {lowStockItems.length > 3 && (
            <Button
              variant="ghost"
              className="w-full rounded-full text-mf-purple-deep hover:bg-mf-purple-soft font-display font-semibold"
              onClick={() => navigate('/shopping')}
            >
              {t('pages.dashboard.viewAll')} ({lowStockItems.length})
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
