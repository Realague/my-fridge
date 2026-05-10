import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Plus, Settings, ShoppingCart } from 'lucide-react';
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
    <Card className="bg-mf-warning-soft border-mf-warning/30">
      <CardHeader className="px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-mf-warning">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="truncate">{t('pages.dashboard.lowStockItems')}</span>
            </CardTitle>
            <CardDescription className="text-mf-text-soft mt-1">
              {t('pages.dashboard.itemsNeedRestock', { count: lowStockItems.length })}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/item-minimums')}
            className="border-mf-warning/40 text-mf-warning hover:bg-mf-warning-soft shrink-0 w-full sm:w-auto"
          >
            <Settings className="h-4 w-4 mr-2" />
            {t('itemMinimum.manageMinimums')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="space-y-3">
          {lowStockItems.slice(0, 3).map((lowStockItem) => (
            <motion.div
              key={lowStockItem.itemMinimum.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-card rounded-lg border border-mf-warning/30"
              {...scrollRevealFadeUp(prefersReducedMotion)}
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground truncate">
                  {getItemDisplayName(lowStockItem.itemMinimum.item, t)}
                </div>
                <div className="text-sm text-muted-foreground">
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
              {isInShoppingList(lowStockItem.itemMinimum.itemId) ? (
                <Badge variant="secondary" className="flex items-center gap-1 self-start sm:self-auto shrink-0">
                  <ShoppingCart className="h-3 w-3" />
                  <span className="truncate">{t('pages.dashboard.alreadyInShoppingList')}</span>
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
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
                  className="self-start sm:self-auto shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('buttons.add')}
                </Button>
              )}
            </motion.div>
          ))}
          {lowStockItems.length > 3 && (
            <Button
              variant="ghost"
              className="w-full text-mf-warning hover:bg-mf-warning-soft"
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
