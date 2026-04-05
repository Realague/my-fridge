import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Plus, Settings, ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useItemMinimumStore } from '@/stores/itemMinimumStore';
import { useShoppingStore } from '@/stores/shoppingStore';
import { toast } from 'sonner';
import { useCallback, useMemo } from 'react';
import { getItemDisplayName } from '@/utils/itemUtils';
import { getTranslatedUnitLabel } from '@/utils/unitSystem';

export const LowStockCard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  if (lowStockItems.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 border-orange-200 dark:border-orange-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
              <AlertCircle className="h-5 w-5" />
              {t('pages.dashboard.lowStockItems')}
            </CardTitle>
            <CardDescription className="text-orange-700 dark:text-orange-300">
              {t('pages.dashboard.itemsNeedRestock', { count: lowStockItems.length })}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/item-minimums')}
            className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/20"
          >
            <Settings className="h-4 w-4 mr-2" />
            {t('itemMinimum.manageMinimums')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {lowStockItems.slice(0, 3).map((lowStockItem) => (
            <div
              key={lowStockItem.itemMinimum.id}
              className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-orange-200 dark:border-orange-800"
            >
              <div className="flex-1">
                <div className="font-medium text-foreground">
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
                <Badge variant="secondary" className="ml-2 flex items-center gap-1">
                  <ShoppingCart className="h-3 w-3" />
                  {t('pages.dashboard.alreadyInShoppingList')}
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddToShopping(
                    lowStockItem.itemMinimum.itemId,
                    lowStockItem.quantityNeeded,
                    lowStockItem.itemMinimum.minimumUnit
                  )}
                  className="ml-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('buttons.add')}
                </Button>
              )}
            </div>
          ))}
          {lowStockItems.length > 3 && (
            <Button
              variant="ghost"
              className="w-full text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/20"
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
