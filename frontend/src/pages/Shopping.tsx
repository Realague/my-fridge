import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Trash2, Users, Edit, Save, X, Filter, Package, PackageCheck, CalendarIcon } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { AddItemCard } from '@/components/AddItemCard';
import { QuantitySelector } from '@/components/QuantitySelector';
import { Item } from '@/services/itemService';
import { useShoppingStore, ShoppingItem } from '@/stores/shoppingStore';
import { useStorageAreaStore } from '@/stores/storageAreaStore';
import { useStoredItemStore } from '@/stores/storedItemStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getItemDisplayName, getCategoryColor } from '@/utils/itemUtils';
import { StorageAreaType } from '@/types/enums';
import { ItemImage } from '@/components/ItemImage';
import { BulkStorageDialog } from '@/components/BulkStorageDialog';
import { getSuggestedStorageAreaId } from '@/utils/categoryStorageMapping';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuthStore } from '@/stores/authStore';

const Shopping = () => {
  const { t } = useTranslation();
  // Protected route hook handles auth and household checks
  const { selectedHouseholdId } = useProtectedRoute();
  const currentUser = useAuthStore((state) => state.user);
  
  const { getStorageAreasForHousehold, fetchStorageAreas } = useStorageAreaStore();
  const { createStoredItem } = useStoredItemStore();
  
  const storageAreas = selectedHouseholdId ? getStorageAreasForHousehold() : [];
  const {
    items,
    loading,
    fetchShoppingItems,
    createShoppingItem,
    updateShoppingItem,
    deleteShoppingItem,
    toggleShoppingItemCompleted,
    bulkTransferToStorage,
    getPendingItems,
    getCompletedItems,
    getTotalItems,
    getCompletedCount
  } = useShoppingStore();
  
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [completedItemsLoaded, setCompletedItemsLoaded] = useState(false);
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  // Load shopping items and storage areas from API
  useEffect(() => {
    if (selectedHouseholdId) {
      // Fetch pending items first
      fetchShoppingItems(false);

      setCompletedItemsLoaded(false);
      // Also fetch completed items
      fetchCompletedItems();
      // Fetch storage areas for the storage dialog
      fetchStorageAreas();
    }
  }, [selectedHouseholdId, fetchShoppingItems, fetchStorageAreas]);

  // Function to fetch completed items
  const fetchCompletedItems = async () => {
    if (!selectedHouseholdId || completedItemsLoaded) return;
    
    setLoadingCompleted(true);
    try {
      await fetchShoppingItems(true);
      setCompletedItemsLoaded(true);
    } catch (error) {
      console.error('Failed to fetch completed items:', error);
    } finally {
      setLoadingCompleted(false);
    }
  };

  // Function to refresh all shopping items
  const refreshShoppingItems = async () => {
    if (!selectedHouseholdId) return;
    
    setCompletedItemsLoaded(false);
    // Fetch pending items
    await fetchShoppingItems(false);
    
    // Fetch completed items
    await fetchCompletedItems();
  };

  // Inline quick-store prompt state
  const [quickStoreItemId, setQuickStoreItemId] = useState<string | null>(null);
  const [quickStoreDate, setQuickStoreDate] = useState('');
  
  // Fallback full storage dialog (used from "Modifier" toast action)
  const [showStorageDialog, setShowStorageDialog] = useState(false);
  const [itemToStore, setItemToStore] = useState<ShoppingItem | null>(null);
  const [selectedStorageArea, setSelectedStorageArea] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [storageExpirationDate, setStorageExpirationDate] = useState('');

  // Bulk storage dialog state
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  const handleAddItem = async (item: Item, quantity: string, unit: string) => {
    if (!selectedHouseholdId) {
      toast.error(t('messages.error.noHouseholdSelected'));
      return;
    }

    await createShoppingItem({
      itemId: item.id,
      quantity,
      unit,
    });
  };

  const toggleItemComplete = async (id: string) => {
    const item = items.find(item => item.id === id);
    if (!item || !selectedHouseholdId) return;

    if (!item.completed) {
      if (storageAreas.length === 0) {
        // No storage areas -- fallback to old dialog
        setItemToStore(item);
        setSelectedStorageArea('');
        setStorageLocation('');
        setStorageExpirationDate('');
        setShowStorageDialog(true);
        return;
      }

      // Show inline quick-store prompt for this item
      setQuickStoreItemId(id);
      setQuickStoreDate('');
    } else {
      // Item is being unchecked - toggle via API
      const success = await toggleShoppingItemCompleted(id);
      
      if (success && completedItemsLoaded) {
        await refreshShoppingItems();
      }
    }
  };

  const handleQuickStore = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item || !selectedHouseholdId) return;

    const suggestedAreaId = getSuggestedStorageAreaId(item.item?.category, storageAreas);
    if (!suggestedAreaId) return;

    const suggestedArea = storageAreas.find(a => a.id === suggestedAreaId);

    try {
      const createdStoredItem = await createStoredItem({
        itemId: item.item?.id,
        storageAreaId: suggestedAreaId,
        quantity: parseFloat(item.quantity),
        unit: item.unit as any,
        expirationDate: quickStoreDate || undefined,
      });

      const updateSuccess = await updateShoppingItem(item.id, {
        storedItemId: createdStoredItem.id,
        completed: true,
      });

      if (updateSuccess) {
        const itemName = item.item ? getItemDisplayName(item.item, t) : '';
        const areaName = suggestedArea ? `${suggestedArea.emoji} ${suggestedArea.name}` : '';

        toast.success(t('pages.shopping.itemAddedQuick', { item: itemName, area: areaName }), {
          action: {
            label: t('pages.shopping.modify'),
            onClick: () => {
              setItemToStore(item);
              setSelectedStorageArea(suggestedAreaId);
              setStorageLocation('');
              setStorageExpirationDate(quickStoreDate);
              setShowStorageDialog(true);
            },
          },
        });
        await refreshShoppingItems();
      }
    } catch (error) {
      console.error('Error in quick store:', error);
      toast.error(t('messages.error.failedToAddToStorage'));
    }

    setQuickStoreItemId(null);
    setQuickStoreDate('');
  };

  const handleSkipQuickStore = async (id: string) => {
    if (!selectedHouseholdId) return;

    try {
      const success = await toggleShoppingItemCompleted(id);
      if (success) {
        toast.success(t('messages.success.itemMarkedCompleted'));
        await refreshShoppingItems();
      }
    } catch (error) {
      console.error('Error skipping storage:', error);
    }

    setQuickStoreItemId(null);
    setQuickStoreDate('');
  };

  const handleCancelQuickStore = () => {
    setQuickStoreItemId(null);
    setQuickStoreDate('');
  };

  const handleAddToStorage = async () => {
    if (!itemToStore || !selectedStorageArea || !selectedHouseholdId) return;

    try {
      // Add to storage using the new API
      const createdStoredItem = await createStoredItem({
        itemId: itemToStore.item?.id,
        storageAreaId: selectedStorageArea,
        quantity: parseFloat(itemToStore.quantity),
        unit: itemToStore.unit as any,
        expirationDate: storageExpirationDate || undefined,
        location: storageLocation.trim() || undefined,
      });

      // Update the shopping item with the stored item ID, then mark as completed
      const updateSuccess = await updateShoppingItem(itemToStore.id, {
        storedItemId: createdStoredItem.id,
        completed: true
      });
      
      if (updateSuccess) {
        toast.success(t('messages.success.itemAddedToStorage'));
        // Refresh items to ensure proper state
        await refreshShoppingItems();
      }
    } catch (error) {
      console.error('Error adding to storage:', error);
      toast.error(t('messages.error.failedToAddToStorage'));
    }

    // Close dialog and reset state
    setShowStorageDialog(false);
    setItemToStore(null);
    setSelectedStorageArea('');
    setStorageLocation('');
    setStorageExpirationDate('');
  };

  const handleSkipStorage = async () => {
    if (!itemToStore || !selectedHouseholdId) return;

    try {
      // Just mark as completed without adding to storage
      const success = await toggleShoppingItemCompleted(itemToStore.id);
      
      if (success) {
        toast.success(t('messages.success.itemMarkedCompleted'));
        // Refresh items to ensure proper state
        await refreshShoppingItems();
      }
    } catch (error) {
      console.error('Error marking item as completed:', error);
      toast.error(t('messages.error.failedToMarkCompleted'));
    }

    // Close dialog and reset state
    setShowStorageDialog(false);
    setItemToStore(null);
  };

  const handleBulkTransfer = async (items: Array<{ shoppingItemId: string; storageAreaId: string; expirationDate?: string }>) => {
    const success = await bulkTransferToStorage({ items });
    if (success) {
      toast.success(t('pages.shopping.bulkStorageSuccess', { count: items.length }));
      await refreshShoppingItems();
    } else {
      toast.error(t('pages.shopping.bulkStorageError'));
    }
  };

  const handleBulkSkipAll = async () => {
    // Just close the dialog without doing anything
  };

  const deleteItemHandler = async (id: string) => {
    if (!selectedHouseholdId) return;
    await deleteShoppingItem(id);
  };

  const startEditingItem = (id: string) => {
    setEditingItem(id);
  };

  const saveItemEdit = async (id: string, newQuantity: string, newUnit: string) => {
    if (!selectedHouseholdId) return;
    
    const success = await updateShoppingItem(id, {
      quantity: newQuantity,
      unit: newUnit
    });
    
    if (success) {
      setEditingItem(null);
    }
  };

  const cancelItemEdit = () => {
    setEditingItem(null);
  };

  // Group and aggregate items by itemId
  const aggregateShoppingItems = (itemsList: ShoppingItem[]) => {
    const grouped = new Map<string, ShoppingItem[]>();
    itemsList.forEach(item => {
      const key = item.item?.id || 'unknown';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
    });

    // For items with same itemId and unit, show aggregated view
    return Array.from(grouped.values()).flatMap(group => {
      if (group.length === 1) return group;
      
      // Check if all have same unit
      const firstUnit = group[0].unit;
      if (group.every(item => item.unit === firstUnit)) {
        // Aggregate - show total quantity
        const totalQty = group.reduce((sum, item) => sum + parseFloat(item.quantity), 0);
        return [{
          ...group[0],
          quantity: totalQty.toString(),
        }];
      }
      return group;
    });
  };

  // Filter items by category
  const filterItemsByCategory = (itemsList: ShoppingItem[]) => {
    if (categoryFilter === 'all') return itemsList;
    return itemsList.filter(item => item.item?.category === categoryFilter);
  };

  const pendingItems = filterItemsByCategory(aggregateShoppingItems(getPendingItems()));
  const completedItems = filterItemsByCategory(aggregateShoppingItems(getCompletedItems()));
  const totalItems = getTotalItems();
  const completedCount = getCompletedCount();

  // Get unique categories from items
  const categories = ['all', ...Array.from(new Set(items.map(item => item.item?.category).filter(Boolean)))];


  const getItemName = (shoppingItem: ShoppingItem) => {
    return shoppingItem.item ? getItemDisplayName(shoppingItem.item, t) : 'Unknown Item';
  };

  const getItemCategory = (shoppingItem: ShoppingItem) => {
    return t(`items.categories.${shoppingItem.item?.category}`) || t('items.categories.other');
  };

  const getItemData = (shoppingItem: ShoppingItem): Item | null => {
    return shoppingItem.item || null;
  };

  const ShoppingItemRow = ({ shoppingItem, isCompleted = false }: { shoppingItem: ShoppingItem; isCompleted?: boolean }) => {
    const [editQuantity, setEditQuantity] = useState(shoppingItem.quantity);
    const [editUnit, setEditUnit] = useState(shoppingItem.unit);
    const isEditing = editingItem === shoppingItem.id;
    const isQuickStoring = quickStoreItemId === shoppingItem.id;
    const itemData = getItemData(shoppingItem);

    const suggestedAreaId = getSuggestedStorageAreaId(shoppingItem.item?.category, storageAreas);
    const suggestedArea = storageAreas.find(a => a.id === suggestedAreaId);
    const isFreezerArea = suggestedArea?.type === StorageAreaType.FREEZER;

    const handleSave = () => {
      saveItemEdit(shoppingItem.id, editQuantity, editUnit);
    };

    const handleCancel = () => {
      setEditQuantity(shoppingItem.quantity);
      setEditUnit(shoppingItem.unit);
      cancelItemEdit();
    };

    if (!itemData) {
      return null;
    }

    return (
      <div className="space-y-0">
        <div
          className={`flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-move ${
            isCompleted ? 'bg-accent opacity-75' : isQuickStoring ? 'bg-green-50 dark:bg-green-950/20 rounded-b-none' : 'bg-muted'
          }`}
        >
          <button
            onClick={() => toggleItemComplete(shoppingItem.id)}
            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
              isCompleted 
                ? 'bg-green-500' 
                : 'border-2 border-border hover:border-green-500 bg-primary/10'
            }`}
          >
            {isCompleted && <Check className="h-4 w-4 text-white" />}
          </button>

          <ItemImage
            src={shoppingItem.item?.imageUrl}
            alt={getItemName(shoppingItem)}
            containerClassName="w-10 h-10 rounded-md"
            fallbackIconSize={40}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`font-medium ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {getItemName(shoppingItem)}
                </span>
                <Badge className={getCategoryColor(shoppingItem.item?.category)}>
                  {getItemCategory(shoppingItem)}
                </Badge>
              </div>
              {isEditing && (
                <div className="flex gap-1 flex-shrink-0 md:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    className="h-8 px-2"
                  >
                    <Save className="h-3 w-3"/>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    className="h-8 px-2"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {isEditing ? (
                <div className="mt-1">
                  <QuantitySelector
                    item={itemData}
                    initialQuantity={editQuantity}
                    initialUnit={editUnit}
                    onQuantityChange={(quantity, unit) => {
                      setEditQuantity(quantity);
                      setEditUnit(unit);
                    }}
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{shoppingItem.quantity} {shoppingItem.unit !== 'piece' ? shoppingItem.unit : ''}</span>
                  {shoppingItem.creator && (
                    <>
                      <span>•</span>
                      <span>
                        {t('common.addedBy', {
                          name: shoppingItem.creator.id === currentUser?.id
                            ? t('common.you')
                            : shoppingItem.creator.displayName,
                        })}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {isEditing && (
              <div className="hidden md:flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  className="h-8 px-2"
                >
                  <Save className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="h-8 px-2"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            {!isCompleted && !isEditing && !isQuickStoring && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startEditingItem(shoppingItem.id)}
                className="h-8 w-8 p-0 opacity-70 hover:opacity-100 transition-opacity hover:bg-primary/10"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {!isEditing && !isQuickStoring && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteItemHandler(shoppingItem.id)}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 hover:bg-primary/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Inline quick-store prompt */}
        {isQuickStoring && (
          <div className="bg-green-50 dark:bg-green-950/20 border border-t-0 border-green-200 dark:border-green-800 rounded-b-lg px-3 pb-3 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              {suggestedArea && (
                <span className="text-xs font-medium text-green-700 dark:text-green-400">
                  {t('pages.shopping.suggestedArea', { area: `${suggestedArea.emoji} ${suggestedArea.name}` })}
                </span>
              )}
              {!isFreezerArea && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5 bg-white dark:bg-background font-normal"
                    >
                      <CalendarIcon className="h-3 w-3" />
                      {quickStoreDate
                        ? format(new Date(quickStoreDate), 'dd/MM/yyyy', { locale: fr })
                        : t('pages.shopping.expirationDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={quickStoreDate ? new Date(quickStoreDate) : undefined}
                      onSelect={(date) => setQuickStoreDate(date ? format(date, 'yyyy-MM-dd') : '')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
              <div className="flex gap-1 ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSkipQuickStore(shoppingItem.id)}
                  className="h-7 px-2 text-xs text-muted-foreground"
                >
                  {t('pages.shopping.skip')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelQuickStore}
                  className="h-7 px-2 text-xs"
                >
                  <X className="h-3 w-3" />
                </Button>
                <Button
                  variant="green"
                  size="sm"
                  onClick={() => handleQuickStore(shoppingItem.id)}
                  className="h-7 px-2 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  {t('pages.shopping.validate')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Storage Dialog */}
      <Dialog open={showStorageDialog} onOpenChange={setShowStorageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
               {t('pages.shopping.addToStorage')}
            </DialogTitle>
          </DialogHeader>
          
          {itemToStore && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{getItemName(itemToStore)}</span>
                  <Badge className={getCategoryColor(getItemCategory(itemToStore))}>
                    {getItemCategory(itemToStore)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {itemToStore.quantity} {itemToStore.unit !== 'piece' ? itemToStore.unit : ''}
                </p>
              </div>
              
              <div>
                <Label className="text-sm">{t('pages.shopping.storageArea')}</Label>
                <Select value={selectedStorageArea} onValueChange={setSelectedStorageArea}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('pages.shopping.selectStorageArea')} />
                  </SelectTrigger>
                  <SelectContent>
                    {storageAreas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        <div className="flex items-center gap-2">
                          <span>{area.emoji}</span>
                          <span>{area.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm">{t('pages.shopping.locationOptional')}</Label>
                <Input
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  placeholder={t('storageArea.locationPlaceholder')}
                  className="mt-1"
                />
              </div>
              
              {storageAreas.find((a) => a.id === selectedStorageArea)?.type !== StorageAreaType.FREEZER && (
                <div>
                  <Label className="text-sm">{t('pages.shopping.expirationDateOptional')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full mt-1 justify-start font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {storageExpirationDate
                          ? format(new Date(storageExpirationDate), 'dd MMMM yyyy', { locale: fr })
                          : t('pages.shopping.expirationDateOptional')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={storageExpirationDate ? new Date(storageExpirationDate) : undefined}
                        onSelect={(date) => setStorageExpirationDate(date ? format(date, 'yyyy-MM-dd') : '')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
              <Button 
                  variant="outline" 
                  onClick={handleSkipStorage}
                  className="flex-1"
                >
                  {t('pages.shopping.skipStorage')}
                </Button>
                <Button
                  variant="green"
                  onClick={handleAddToStorage} 
                  disabled={!selectedStorageArea}
                  className="flex-1"
                >
                  {t('pages.shopping.addToStorage')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Storage Dialog */}
      <BulkStorageDialog
        open={showBulkDialog}
        onOpenChange={setShowBulkDialog}
        pendingItems={getPendingItems()}
        storageAreas={storageAreas}
        onConfirm={handleBulkTransfer}
        onSkipAll={handleBulkSkipAll}
      />

      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">{t('pages.shopping.title')}</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground">
                  {t('pages.shopping.itemsCompleted', { completed: completedCount, count: totalItems })}
                </p>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">{t('pages.shopping.synced')}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {Math.round((completedCount / totalItems) * 100) || 0}%
              </div>
              <div className="text-xs text-muted-foreground">{t('pages.shopping.complete')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Add New Item */}
        <AddItemCard
          title={t('pages.shopping.addItem')}
          onItemAdd={handleAddItem}
          placeholder={t('pages.shopping.searchPlaceholder')}
          buttonText={t('pages.shopping.add')}
        />

        {loading && (
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t('pages.shopping.loadingShoppingList')}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !selectedHouseholdId && (
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">{t('pages.shopping.selectHouseholdToView')}</p>
            </CardContent>
          </Card>
        )}

        {!loading && selectedHouseholdId && (
        <>
        {/* Category Filter */}
        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t('pages.shopping.filterByCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {t(`items.categories.${category}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoryFilter !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCategoryFilter('all')}
                  className="text-muted-foreground"
                >
                  {t('pages.shopping.clearFilter')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Items */}
        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {t('pages.shopping.toBuy')} ({pendingItems.length})
                {categoryFilter !== 'all' && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    • {t(`storageArea.types.${categoryFilter}`)}
                  </span>
                )}
              </CardTitle>
              {pendingItems.length > 0 && storageAreas.length > 0 && (
                <Button
                  variant="green"
                  size="sm"
                  onClick={() => setShowBulkDialog(true)}
                  className="gap-1.5"
                >
                  <PackageCheck className="h-4 w-4" />
                  {t('pages.shopping.bulkStorage')}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingItems.map((shoppingItem) => (
                <ShoppingItemRow key={shoppingItem.id} shoppingItem={shoppingItem} />
              ))}
              
              {pendingItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-4xl mb-2">
                    {categoryFilter === 'all' ? '🎉' : '📋'}
                  </div>
                  <p>
                    {categoryFilter === 'all' 
                      ? t('pages.shopping.allItemsCompleted')
                      : t('pages.shopping.noItemsInCategory', { category: categoryFilter.toLowerCase() })
                    }
                  </p>
                  <p className="text-sm">
                    {categoryFilter === 'all' 
                      ? t('pages.shopping.addNewItemsToGetStarted')
                      : t('pages.shopping.tryDifferentCategory')
                    }
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Completed Items */}
        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">
              {t('pages.shopping.completed')} ({completedItems.length})
              {categoryFilter !== 'all' && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  • {categoryFilter}
                </span>
              )}
              {loadingCompleted && (
                <div className="inline-flex items-center gap-2 ml-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                  <span className="text-sm text-muted-foreground">{t('pages.shopping.loading')}</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCompleted && completedItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p>{t('pages.shopping.loadingCompletedItems')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedItems.map((shoppingItem) => (
                  <ShoppingItemRow 
                    key={shoppingItem.id} 
                    shoppingItem={shoppingItem} 
                    isCompleted={true} 
                  />
                ))}
                {completedItems.length === 0 && completedItemsLoaded && (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-4xl mb-2">✅</div>
                    <p>{t('pages.shopping.noCompletedItemsYet')}</p>
                    <p className="text-sm">{t('pages.shopping.completedItemsWillAppear')}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        </>
        )}
      </div>

      <BottomNavigation currentPage="shopping" />
    </div>
  );
};

export default Shopping;
