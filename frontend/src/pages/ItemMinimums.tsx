import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Edit, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { ItemMinimumDialog } from '@/components/ItemMinimumDialog';
import { useItemMinimumStore } from '@/stores/itemMinimumStore';
import { useStoredItemStore } from '@/stores/storedItemStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useTranslation } from 'react-i18next';
import { getItemDisplayName } from '@/utils/itemUtils';
import { toast } from '@/hooks/use-toast';

const ItemMinimums = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedHouseholdId } = useProtectedRoute();
  
  const { 
    getItemMinimumsForHousehold, 
    fetchItemMinimums, 
    deleteItemMinimum,
    loading 
  } = useItemMinimumStore();
  const { getStoredItemsByItemAndUnit } = useStoredItemStore();
  
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
        title: t('messages.success.deleteSuccess'),
        description: t('messages.success.deleteSuccessDescription'),
        variant: 'default',
      });
    } catch (error) {
      console.error('Failed to delete minimum:', error);
      toast({
        title: t('messages.error.deleteFailed'),
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="p-1"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">{t('itemMinimum.title')}</h1>
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
              className="flex items-center gap-2"
              variant="green"
            >
              <Plus className="h-4 w-4" />
              {t('buttons.add')}
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
                <Card key={minimum.id} className="bg-card backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-foreground">
                            {getItemDisplayName(item, t)}
                          </h3>
                          {lowStock ? (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {t('itemMinimum.lowStock')}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t('itemMinimum.inStock')}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
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
                          {lowStock && (
                            <div className="text-orange-600 dark:text-orange-400">
                              {t('itemMinimum.quantityNeeded', {
                                quantity: (minimum.minimumQuantity - currentStock).toFixed(1),
                                unit: minimum.minimumUnit
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(minimum.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="deleteTrash"
                          size="sm"
                          onClick={() => setDeleteConfirmId(minimum.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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

      <BottomNavigation currentPage="settings" />
    </div>
  );
};

export default ItemMinimums;
