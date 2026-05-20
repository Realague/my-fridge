import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, PenLine, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { ItemMinimumDialog } from '@/components/ItemMinimumDialog';
import { ItemImage } from '@/components/ItemImage';
import { useItemMinimumStore } from '@/stores/itemMinimumStore';
import { useStoredItemStore } from '@/stores/storedItemStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useStoreErrorToast } from '@/hooks/useStoreErrorToast';
import { useTranslation } from 'react-i18next';
import { getItemDisplayName } from '@/utils/itemUtils';
import { getTranslatedUnitLabel } from '@/utils/unitSystem';
import { toast } from '@/hooks/use-toast';
import { motion, useReducedMotion } from 'framer-motion';
import { scrollRevealFadeUp } from '@/lib/motion';

const ItemMinimums = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const { selectedHouseholdId } = useProtectedRoute();
  
  const {
    getItemMinimumsForHousehold,
    fetchItemMinimums,
    deleteItemMinimum,
    loading
  } = useItemMinimumStore();
  const { getStoredItemsByItemAndUnit } = useStoredItemStore();

  // Surface fetch errors instead of swallowing them silently.
  useStoreErrorToast(useItemMinimumStore((s) => s.error), useItemMinimumStore((s) => s.setError));
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingMinimumId, setEditingMinimumId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const itemMinimums = getItemMinimumsForHousehold();

  useEffect(() => {
    if (selectedHouseholdId) {
      fetchItemMinimums();
    }
  }, [selectedHouseholdId, fetchItemMinimums]);

  const calculateCurrentStock = (itemId: string, unit: string) => {
    const storedItems = getStoredItemsByItemAndUnit(itemId, unit);
    return storedItems.reduce((total, item) => {
      if (item.unit === unit) {
        return total + item.quantity;
      }
      return total;
    }, 0);
  };

  const isLowStock = (itemId: string, minimumQty: number, unit: string) => {
    const currentStock = calculateCurrentStock(itemId, unit);
    return currentStock < minimumQty;
  };

  const handleEdit = (minimumId: string) => {
    setEditingMinimumId(minimumId);
    setShowDialog(true);
  };

  const handleDelete = async (minimumId: string) => {
    try {
      await deleteItemMinimum(minimumId);
      setDeleteConfirmId(null);
      toast({
        title: t('itemMinimum.minimumDeleted'),
        variant: 'default',
      });
    } catch (error) {
      console.error('Failed to delete minimum:', error);
      toast({
        title: t('itemMinimum.minimumDeletedFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleDialogClose = () => {
    setShowDialog(false);
    setEditingMinimumId(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="p-1 shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-foreground truncate">{t('itemMinimum.title')}</h1>
                <p className="text-sm text-muted-foreground">
                  {t('itemMinimum.description')}
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                setEditingMinimumId(null);
                setShowDialog(true);
              }}
              className="flex items-center gap-2 shrink-0"
              variant="green"
            >
              <Plus className="h-4 w-4 sm:mr-0" />
              <span className="hidden sm:inline">{t('buttons.add')}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        ) : itemMinimums.length === 0 ? (
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium mb-2">{t('itemMinimum.noMinimumsYet')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('itemMinimum.setMinimumsDescription')}
              </p>
              <Button
                onClick={() => setShowDialog(true)}
                variant="green"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('itemMinimum.setFirstMinimum')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {itemMinimums.map((minimum) => {
              const item = minimum.item;
              if (!item) return null;

              const currentStock = calculateCurrentStock(item.id, minimum.minimumUnit);
              const lowStock = isLowStock(item.id, minimum.minimumQuantity, minimum.minimumUnit);

              return (
                <motion.div
                  key={minimum.id}
                  {...scrollRevealFadeUp(prefersReducedMotion)}
                >
                <Card className="bg-card backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <ItemImage
                        src={item.imageUrl}
                        alt={getItemDisplayName(item, t)}
                        containerClassName="w-20 h-20 rounded-lg shrink-0"
                        fallbackIconSize={40}
                        category={item.category}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-medium text-foreground">
                                {getItemDisplayName(item, t)}
                              </h3>
                              {lowStock ? (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {t('itemMinimum.lowStock')}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs bg-mf-green-soft text-mf-green-deep">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {t('itemMinimum.inStock')}
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-0.5 text-xs text-mf-text-soft">
                              <div>
                                <span className="font-medium text-foreground">
                                  {t('itemMinimum.currentStock')}:
                                </span>{' '}
                                {currentStock} {minimum.minimumUnit}
                              </div>
                              <div>
                                <span className="font-medium text-foreground">
                                  {t('itemMinimum.minimum')}:
                                </span>{' '}
                                {minimum.minimumQuantity} {minimum.minimumUnit}
                              </div>
                              {minimum.shoppingQuantity && (
                                <div>
                                  <span className="font-medium text-foreground">
                                    {t('itemMinimum.shoppingQuantity')}:
                                  </span>{' '}
                                  {minimum.shoppingQuantity} {minimum.minimumUnit}
                                </div>
                              )}
                              {lowStock && (
                                <div className="text-mf-warning">
                                  {t('itemMinimum.quantityNeeded', {
                                    quantity: (minimum.minimumQuantity - currentStock).toFixed(1),
                                    unit: getTranslatedUnitLabel(
                                      minimum.minimumUnit,
                                      minimum.minimumQuantity - currentStock,
                                      t
                                    ),
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEdit(minimum.id)}
                              aria-label={t('common.edit')}
                              className="h-9 w-9 rounded-md flex items-center justify-center bg-mf-night-elevated text-mf-text hover:bg-mf-night-line transition-colors"
                            >
                              <PenLine className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(minimum.id)}
                              aria-label={t('common.delete')}
                              className="h-9 w-9 rounded-md flex items-center justify-center bg-mf-danger-soft text-mf-danger hover:bg-mf-danger hover:text-white transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Item Minimum Dialog */}
      <ItemMinimumDialog
        open={showDialog}
        onOpenChange={handleDialogClose}
        existingMinimumId={editingMinimumId || undefined}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('itemMinimum.deleteMinimum')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('itemMinimum.deleteConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('buttons.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNavigation currentPage="more" />
    </div>
  );
};

export default ItemMinimums;
