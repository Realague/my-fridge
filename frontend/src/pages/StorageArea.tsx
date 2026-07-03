import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  X,
  ChevronDown,
  Filter,
} from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { ItemSelector } from '@/components/ItemSelector';
import { QuantitySelector } from '@/components/QuantitySelector';
import { useStorageAreaStore } from '@/stores/storageAreaStore';
import { useStoredItemStore } from '@/stores/storedItemStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useStoreErrorToast } from '@/hooks/useStoreErrorToast';
import { itemService } from '@/services/itemService';
import { Unit, StorageAreaType, ITEM_CATEGORIES } from '@/types/enums';
import { StorageAreaIcon } from '@/utils/storageAreaIcons';
import { Item } from '@/services/itemService';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SelectedItemPreview } from '@/components/SelectedItemPreview';
import { getItemDisplayName } from '@/utils/itemUtils';
import { CategoryIcon } from '@/utils/categoryIcons';
import { OpenedStatusToggle } from '@/components/OpenedStatusToggle';
import { useAuthStore } from '@/stores/authStore';
import { motion, useReducedMotion } from 'framer-motion';
import { scrollRevealFadeUp } from '@/lib/motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStorageAreaSortPreferences } from '@/hooks/useStorageAreaSortPreferences';
import {
  buildStorageAreaDisplayRows,
  type StorageAreaSortCriterion,
} from '@/utils/storageAreaSort';
import { StoredItemCard } from '@/components/StoredItemCard';

const STORAGE_SORT_CRITERIA: StorageAreaSortCriterion[] = [
  'expiration',
  'addedAt',
  'name',
  'category',
];

const StorageArea = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  // Store hooks
  const { getStorageAreaById, fetchStorageAreas } = useStorageAreaStore();

  // Surface fetch errors instead of swallowing them silently.
  useStoreErrorToast(useStoredItemStore((s) => s.error), useStoredItemStore((s) => s.setError));
  useStoreErrorToast(useStorageAreaStore((s) => s.error), useStorageAreaStore((s) => s.setError));
  const {
    getStoredItemsByStorageArea,
    createStoredItem,
    fetchStoredItemsByStorageArea,
    loading: storedItemsLoading
  } = useStoredItemStore();
  const { selectedHouseholdId } = useProtectedRoute();
  const currentUser = useAuthStore((state) => state.user);
  const prefersReducedMotion = useReducedMotion() ?? false;

  // Local state
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [location, setLocation] = useState('');
  const [isOpened, setIsOpened] = useState(false);
  const [openedDate, setOpenedDate] = useState('');
  const [items, setItems] = useState<Record<string, Item>>({});
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Get data from stores
  const area = getStorageAreaById(id || '');
  const storageItems = getStoredItemsByStorageArea(id || '');
  const areaId = id || '';
  const { getSort, setCriterion, toggleDirection } =
    useStorageAreaSortPreferences(currentUser?.id);
  const sortState = getSort(areaId);
  const itemsAfterFilter = useMemo(() => {
    if (categoryFilter === 'all') return storageItems;
    return storageItems.filter((si) => items[si.itemId]?.category === categoryFilter);
  }, [storageItems, items, categoryFilter]);

  const displayRows = useMemo(() => {
    if (!area) return [];
    return buildStorageAreaDisplayRows(
      itemsAfterFilter,
      items,
      area.type,
      sortState.criterion,
      sortState.direction,
      i18n.language,
      t
    );
  }, [
    area,
    itemsAfterFilter,
    items,
    sortState.criterion,
    sortState.direction,
    i18n.language,
    t,
  ]);

  // Load storage areas and stored items on mount
  useEffect(() => {
    if (selectedHouseholdId) {
      fetchStorageAreas();
    }
  }, [selectedHouseholdId, fetchStorageAreas]);

  // Load stored items when area changes
  useEffect(() => {
    if (selectedHouseholdId && id) {
      fetchStoredItemsByStorageArea(id);
    }
  }, [selectedHouseholdId, id, fetchStoredItemsByStorageArea]);

  // Load item details for stored items
  useEffect(() => {
    const loadItemDetails = async () => {
      if (!selectedHouseholdId) return;
      
      const itemIds = storageItems
        .map(item => item.itemId)
        .filter(itemId => !items[itemId]);
      
      if (itemIds.length === 0) return;
      
      try {
        const itemDetails = await Promise.all(
          itemIds.map(itemId => itemService.getItemById(itemId, selectedHouseholdId))
        );
        
        const newItems = itemDetails.reduce((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {} as Record<string, Item>);
        
        setItems(prev => ({ ...prev, ...newItems }));
      } catch (error) {
        console.error('Failed to load item details:', error);
      }
    };

    loadItemDetails();
  }, [storageItems, selectedHouseholdId, items]);

  if (!area) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🤔</div>
          <p className="text-lg text-gray-600">{t('storageAreaNotFound')}</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            {t('buttons.goToDashboard')}
          </Button>
        </div>
      </div>
    );
  }

  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
    setNewItemUnit(item.defaultUnit);
  };

  const handleQuantityChange = (quantity: string, unit: string) => {
    setNewItemQuantity(quantity);
    setNewItemUnit(unit);
  };

  const handleAddItem = async () => {
    if (!selectedItem || !newItemQuantity.trim() || !selectedHouseholdId) return;
    
    try {
      await createStoredItem({
        itemId: selectedItem.id,
        storageAreaId: id || '',
        quantity: parseFloat(newItemQuantity),
        unit: newItemUnit as Unit,
        expirationDate: expirationDate || undefined,
        location: location.trim() || undefined,
        isOpened: isOpened,
        openedDate: isOpened && openedDate ? openedDate : undefined,
      });
      
      // Show success toast with specific details
      toast.success(t('storageArea.addedDetails', { quantity: newItemQuantity, unit: newItemUnit, item: selectedItem.name, area: area?.name }));
      
      // Reset form
      setSelectedItem(null);
      setNewItemQuantity('1');
      setNewItemUnit('');
      setExpirationDate('');
      setLocation('');
      setIsOpened(false);
      setOpenedDate('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error(t('messages.error.failedToAddItem'));
    }
  };

  const handleSortOption = (criterion: StorageAreaSortCriterion) => {
    if (!areaId) return;
    if (sortState.criterion === criterion) {
      toggleDirection(areaId);
    } else {
      setCriterion(areaId, criterion);
    }
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
                onClick={() => navigate('/dashboard')}
                className="p-1 shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <StorageAreaIcon type={area.type} className="h-6 w-6 shrink-0" />
                  <h1 className="text-xl font-bold text-foreground truncate">{area.name}</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('storageArea.itemCount', { count: storageItems.length })}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 shrink-0"
              variant="green"
            >
              <Plus className="h-4 w-4 sm:mr-0" />
              <span className="hidden sm:inline">{t('storageArea.addItem')}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Add Item Form */}
        {showAddForm && (
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  {t('storageArea.addItemTo', { name: area.name })}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false);
                    setSelectedItem(null);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">{t('storageArea.selectItem')}</Label>
                <ItemSelector
                  onItemSelect={handleItemSelect}
                  placeholder={t('forms.searchOrAddItem')}
                  selectedItem={selectedItem}
                  className="mt-1"
                />
              </div>
              
              {selectedItem && (
                <div className="space-y-4 animate-in fade-in-50 slide-in-from-top-2 duration-300">
                  {/* Selected Item Preview */}
                  <SelectedItemPreview 
                    item={selectedItem} 
                    onClear={() => setSelectedItem(null)} 
                  />

                  {/* Quantity */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {t('storageArea.addItemInformation', { item: getItemDisplayName(selectedItem, t) })}
                    </Label>
                    <QuantitySelector
                      item={selectedItem}
                      initialQuantity={newItemQuantity}
                      initialUnit={newItemUnit}
                      onQuantityChange={handleQuantityChange}
                      className="mt-1"
                    />
                  </div>
                  
                  {/* Location */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {t('storageArea.location')} <span className="text-muted-foreground">({t('common.optional')})</span>
                    </Label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={t('storageArea.locationPlaceholder')}
                      className="mt-1"
                    />
                  </div>
                  
                  {/* Expiration Date - not shown for freezer (frozen items use recommended storage times) */}
                  {area.type !== StorageAreaType.FREEZER && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        {t('storageArea.expirationDate')} <span className="text-muted-foreground">({t('common.optional')})</span>
                      </Label>
                      <Input
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  )}
                  
                  {/* Opened Status Toggle */}
                  {selectedItem.daysAfterOpening && (
                    <OpenedStatusToggle
                      isOpened={isOpened}
                      openedDate={openedDate}
                      daysAfterOpening={selectedItem.daysAfterOpening}
                      effectiveExpirationDate={isOpened && openedDate ? 
                        new Date(new Date(openedDate).getTime() + selectedItem.daysAfterOpening * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
                        : undefined
                      }
                      onToggle={(opened, date) => {
                        setIsOpened(opened);
                        setOpenedDate(date || '');
                      }}
                    />
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowAddForm(false);
                        setSelectedItem(null);
                      }}
                      className="flex-1"
                      size="lg"
                    >
                      {t('buttons.cancel')}
                    </Button>
                    <Button 
                      variant="green"
                      onClick={handleAddItem} 
                      className="flex-1" 
                      disabled={storedItemsLoading}
                      size="lg"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('storageArea.addTo', { name: area.name })}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Storage Items */}
        <div className="space-y-4">
          {storedItemsLoading ? (
            <Card className="bg-card backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="text-lg text-gray-600">{t('common.loading')}</div>
              </CardContent>
            </Card>
          ) : storageItems.length > 0 ? (
            <>
              <Card variant="elevated">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Filter className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder={t('pages.myProducts.filterByCategory')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('items.categories.all')}</SelectItem>
                        {ITEM_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            <span className="inline-flex items-center gap-2">
                              <CategoryIcon category={category} className="h-4 w-4" />
                              {t(`items.categories.${category}`)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-between gap-2 touch-friendly"
                          aria-label={t('storageArea.sort.ariaOpen')}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="text-muted-foreground shrink-0">
                              {t('storageArea.sort.labelPrefix')}
                            </span>
                            <span className="font-medium truncate">
                              {t(`storageArea.sort.criterion.${sortState.criterion}`)}
                            </span>
                            {sortState.direction === 'asc' ? (
                              <ArrowUp className="h-4 w-4 shrink-0" aria-hidden />
                            ) : (
                              <ArrowDown className="h-4 w-4 shrink-0" aria-hidden />
                            )}
                          </span>
                          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        {STORAGE_SORT_CRITERIA.map((criterion) => (
                          <DropdownMenuItem
                            key={criterion}
                            onClick={() => handleSortOption(criterion)}
                            className={
                              sortState.criterion === criterion ? 'bg-accent focus:bg-accent' : ''
                            }
                          >
                            {t(`storageArea.sort.criterion.${criterion}`)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-4">
                {displayRows.map((row, rowIndex) =>
                  row.kind === 'header' ? (
                    <div
                      key={`${area.id}-cat-${row.categoryKey ?? 'none'}-${rowIndex}`}
                      className="flex items-center gap-2 border-b border-border/50 pb-2 pt-1"
                    >
                      <CategoryIcon
                        category={row.categoryKey}
                        className="h-5 w-5 text-muted-foreground"
                      />
                      <span className="text-sm font-semibold text-foreground">
                        {row.categoryKey
                          ? t(`items.categories.${row.categoryKey}`)
                          : t('storageArea.sort.noCategory')}
                      </span>
                    </div>
                  ) : (
                    <motion.div
                      key={row.storedItem.id}
                      {...scrollRevealFadeUp(prefersReducedMotion)}
                    >
                      <StoredItemCard
                        storedItem={row.storedItem}
                        item={items[row.storedItem.itemId]}
                        area={area}
                        currentUserId={currentUser?.id}
                        hideAreaBadge
                      />
                    </motion.div>
                  )
                )}
              </div>
            </>
          ) : (
            <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <StorageAreaIcon type={area.type} className="mx-auto mb-4 h-12 w-12" />
                <h3 className="text-lg font-medium text-white mb-2">
                  {t('storageArea.emptyArea', { name: area.name })}
                </h3>
                <p className="text-white mb-4">
                  {t('storageArea.startAddingItems')}
                </p>
                <Button onClick={() => setShowAddForm(true)} variant="green">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('storageArea.addFirstItem')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <BottomNavigation currentPage="storage" />
    </div>
  );
};

export default StorageArea;
