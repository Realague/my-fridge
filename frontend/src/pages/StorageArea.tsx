import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ArrowLeft, Calendar, MapPin, AlertTriangle, Edit, Trash2, Save, X, PackageOpen, Snowflake } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { ItemSelector } from '@/components/ItemSelector';
import { QuantitySelector } from '@/components/QuantitySelector';
import { useStorageAreaStore } from '@/stores/storageAreaStore';
import { useStoredItemStore } from '@/stores/storedItemStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { itemService } from '@/services/itemService';
import { format } from 'date-fns';
import { Unit, StorageAreaType } from '@/types/enums';
import { Item } from '@/services/itemService';
import { useTranslation } from 'react-i18next';
import { useDateFormat } from '@/utils/dateFormatting';
import { toast } from 'sonner';
import { SelectedItemPreview } from '@/components/SelectedItemPreview';
import { getCategoryColor, getItemDisplayName } from '@/utils/itemUtils';
import { CategoryIcon } from '@/utils/categoryIcons';
import { OpenedStatusToggle } from '@/components/OpenedStatusToggle';
import { ItemImage } from '@/components/ItemImage';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { motion, useReducedMotion } from 'framer-motion';
import { scrollRevealFadeUp } from '@/lib/motion';

/** Text/badge color by share of recommended freezer time used (<70% blue, 70–90% orange, >90% red). */
function getFreezerColorClass(daysFrozen: number, recommendedDays: number): string {
  const total = recommendedDays > 0 ? recommendedDays : 180;
  const ratio = daysFrozen / total;
  if (ratio > 0.9) return 'text-red-600 dark:text-red-400';
  if (ratio >= 0.7) return 'text-orange-600 dark:text-orange-400';
  return 'text-blue-600 dark:text-blue-400';
}

function getFreezerBadgeClassName(daysFrozen: number, recommendedDays: number): string {
  const total = recommendedDays > 0 ? recommendedDays : 180;
  const ratio = daysFrozen / total;
  if (ratio > 0.9) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
  if (ratio >= 0.7) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
  return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
}

/** Show X/Y congélation + tooltip whenever the row is in a freezer zone or has a frozenDate. */
function getFreezerProgressDisplay(
  storageItem: {
    frozenDate?: string | null;
    daysFrozen?: number | null;
    recommendedFreezerDays?: number | null;
    createdAt: string;
  },
  areaType: StorageAreaType
): { current: number; total: number } | null {
  const total = storageItem.recommendedFreezerDays ?? 180;
  const inFreezer = areaType === StorageAreaType.FREEZER;
  const hasFrozenDate = Boolean(storageItem.frozenDate);
  if (!inFreezer && !hasFrozenDate) return null;

  let current = storageItem.daysFrozen;
  if (current == null || current === undefined) {
    if (hasFrozenDate && storageItem.frozenDate) {
      current = Math.max(
        0,
        Math.floor((Date.now() - new Date(storageItem.frozenDate).getTime()) / 86_400_000)
      );
    } else if (inFreezer) {
      current = Math.max(
        0,
        Math.floor((Date.now() - new Date(storageItem.createdAt).getTime()) / 86_400_000)
      );
    } else {
      current = 0;
    }
  }
  return { current, total };
}

const StorageArea = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const navigate = useNavigate();
  
  // Store hooks
  const { getStorageAreaById, fetchStorageAreas, getStorageAreasForHousehold } = useStorageAreaStore();
  const storageAreasList = getStorageAreasForHousehold();
  const {
    getStoredItemsByStorageArea, 
    createStoredItem, 
    updateStoredItem, 
    deleteStoredItem,
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
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, Item>>({});

  // Get data from stores
  const area = getStorageAreaById(id || '');
  const storageItems = getStoredItemsByStorageArea(id || '');

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

  const getDaysUntilExpiration = (expirationDate?: string) => {
    if (!expirationDate) return null;
    const now = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpirationStatus = (expirationDate?: string) => {
    const days = getDaysUntilExpiration(expirationDate);
    if (days === null) return null;
    if (days < 0) return 'expired';
    if (days <= 2) return 'expiring-soon';
    if (days <= 7) return 'expiring-week';
    return 'fresh';
  };

  const getExpirationBadge = (expirationDate?: string) => {
    const status = getExpirationStatus(expirationDate);
    const days = getDaysUntilExpiration(expirationDate);
    
    if (!status || days === null) return null;
    
    const badges = {
      'expired': <Badge variant="destructive" className="text-xs">{t('storageArea.expired')}</Badge>,
      'expiring-soon': <Badge variant="destructive" className="text-xs">{t('storageArea.expiresIn', { days })}</Badge>,
      'expiring-week': <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">{t('storageArea.expiresIn', { days })}</Badge>,
      'fresh': <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">{t('storageArea.fresh', { days })}</Badge>
    };
    
    return badges[status];
  };

  const StorageItemCard = ({
    storageItem,
    storageAreas,
  }: {
    storageItem: typeof storageItems[0];
    storageAreas: ReturnType<typeof getStorageAreasForHousehold>;
  }) => {
    const item = items[storageItem.itemId];
    const isEditing = editingItem === storageItem.id;
    const [editQuantity, setEditQuantity] = useState(storageItem.quantity.toString());
    const [editUnit, setEditUnit] = useState(storageItem.unit);
    const [editLocation, setEditLocation] = useState(storageItem.location || '');
    const [editExpiration, setEditExpiration] = useState(
      storageItem.expirationDate ? format(new Date(storageItem.expirationDate), 'yyyy-MM-dd') : ''
    );
    const [editIsOpened, setEditIsOpened] = useState(storageItem.isOpened);
    const [editOpenedDate, setEditOpenedDate] = useState(
      storageItem.openedDate ? format(new Date(storageItem.openedDate), 'yyyy-MM-dd') : ''
    );
    const [editStorageAreaId, setEditStorageAreaId] = useState(storageItem.storageAreaId);
    const wasEditingRef = useRef(false);

    useEffect(() => {
      if (isEditing && !wasEditingRef.current) {
        setEditQuantity(storageItem.quantity.toString());
        setEditUnit(storageItem.unit);
        setEditLocation(storageItem.location || '');
        setEditExpiration(
          storageItem.expirationDate ? format(new Date(storageItem.expirationDate), 'yyyy-MM-dd') : ''
        );
        setEditIsOpened(storageItem.isOpened);
        setEditOpenedDate(
          storageItem.openedDate ? format(new Date(storageItem.openedDate), 'yyyy-MM-dd') : ''
        );
        setEditStorageAreaId(storageItem.storageAreaId);
      }
      wasEditingRef.current = isEditing;
    }, [isEditing, storageItem]);

    const sortedStorageAreas = [...storageAreas].sort((a, b) => a.sortOrder - b.sortOrder);
    const editTargetArea = sortedStorageAreas.find((a) => a.id === editStorageAreaId);
    const showExpirationInEdit = editTargetArea?.type !== StorageAreaType.FREEZER;

    if (!item) {
      return (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="text-center text-gray-500">{t('common.loading')}</div>
          </CardContent>
        </Card>
      );
    }

    const freezerProgress = getFreezerProgressDisplay(storageItem, area.type);
    const freezerOverRecommended =
      freezerProgress != null && freezerProgress.current > freezerProgress.total;
    const showFreezerWarning = Boolean(storageItem.isFrozenTooLong || freezerOverRecommended);

    const handleSave = async () => {
      if (!selectedHouseholdId) return;
      
      try {
        const expirationPayload =
          editTargetArea?.type === StorageAreaType.FREEZER
            ? null
            : editExpiration || undefined;
        await updateStoredItem(storageItem.id, {
          quantity: parseFloat(editQuantity),
          unit: editUnit as Unit,
          location: editLocation.trim() || undefined,
          expirationDate: expirationPayload,
          isOpened: editIsOpened,
          openedDate: editIsOpened && editOpenedDate ? editOpenedDate : undefined,
          storageAreaId: editStorageAreaId,
        });
        setEditingItem(null);
      } catch (error) {
        console.error('Failed to update item:', error);
      }
    };

    const handleCancel = () => {
      setEditQuantity(storageItem.quantity.toString());
      setEditUnit(storageItem.unit);
      setEditLocation(storageItem.location || '');
      setEditExpiration(storageItem.expirationDate ? format(new Date(storageItem.expirationDate), 'yyyy-MM-dd') : '');
      setEditIsOpened(storageItem.isOpened);
      setEditOpenedDate(storageItem.openedDate ? format(new Date(storageItem.openedDate), 'yyyy-MM-dd') : '');
      setEditStorageAreaId(storageItem.storageAreaId);
      setEditingItem(null);
    };

    const handleDelete = async () => {
      if (!selectedHouseholdId) return;
      
      try {
        await deleteStoredItem(storageItem.id);
      } catch (error) {
        console.error('Failed to delete item:', error);
      }
    };

    return (
      <Card className="bg-card backdrop-blur-sm border-0 shadow-lg">
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
                <Badge variant="outline" className={`${getCategoryColor(item.category)} inline-flex items-center gap-1`}>
                  <CategoryIcon category={item.category} className="h-3.5 w-3.5" />
                  { t(`items.categories.${item.category}`) }
                </Badge>
                {storageItem.isOpened && (
                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                    <PackageOpen className="h-3 w-3 mr-1" />
                    {t('storedItems.opened')}
                  </Badge>
                )}
                {freezerProgress && (
                  <Badge
                    variant={showFreezerWarning ? 'destructive' : 'secondary'}
                    className={cn(
                      'text-xs',
                      !showFreezerWarning &&
                        getFreezerBadgeClassName(freezerProgress.current, freezerProgress.total)
                    )}
                  >
                    <Snowflake className="h-3 w-3 mr-1" />
                    {showFreezerWarning ? t('storedItems.freezerWarning') : t('storedItems.frozen')}
                  </Badge>
                )}
                {area.type !== StorageAreaType.FREEZER &&
                  getExpirationBadge(storageItem.effectiveExpirationDate || storageItem.expirationDate)}
              </div>
              
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">{t('storageArea.moveToStorage')}</Label>
                    <Select value={editStorageAreaId} onValueChange={setEditStorageAreaId}>
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedStorageAreas.map((sa) => (
                          <SelectItem key={sa.id} value={sa.id}>
                            <span className="flex items-center gap-2">
                              <span aria-hidden>{sa.emoji}</span>
                              <span>{sa.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm">{t('storageArea.quantity')}</Label>
                    <QuantitySelector
                      item={item}
                      initialQuantity={editQuantity}
                      initialUnit={editUnit}
                      onQuantityChange={(quantity, unit) => {
                        setEditQuantity(quantity);
                        setEditUnit(unit as Unit);
                      }}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm">{t('storageArea.location')}</Label>
                    <Input
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder={t('storageArea.locationPlaceholder')}
                      className="mt-1"
                    />
                  </div>
                  
                  {showExpirationInEdit && (
                    <div>
                      <Label className="text-sm">{t('storageArea.expirationDate')}</Label>
                      <Input
                        type="date"
                        value={editExpiration}
                        onChange={(e) => setEditExpiration(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  )}
                  
                  {item.daysAfterOpening && (
                    <OpenedStatusToggle
                      isOpened={editIsOpened}
                      openedDate={editOpenedDate}
                      daysAfterOpening={item.daysAfterOpening}
                      effectiveExpirationDate={editIsOpened && editOpenedDate ? 
                        new Date(new Date(editOpenedDate).getTime() + item.daysAfterOpening * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
                        : undefined
                      }
                      onToggle={(opened, date) => {
                        setEditIsOpened(opened);
                        setEditOpenedDate(date || '');
                      }}
                    />
                  )}
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      <X className="h-3 w-3 mr-1" />
                      {t('buttons.cancel')}
                    </Button>
                    <Button variant="green" size="sm" onClick={handleSave}>
                      <Save className="h-3 w-3 mr-1" />
                      {t('buttons.save')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{storageItem.quantity} {storageItem.unit !== 'piece' ? storageItem.unit : ''}</span>
                    {storageItem.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{storageItem.location}</span>
                      </div>
                    )}
                  </div>
                  
                  {storageItem.creator && (
                    <p className="text-xs text-muted-foreground">
                      {t('common.addedBy', {
                        name: storageItem.creator.id === currentUser?.id
                          ? t('common.you')
                          : storageItem.creator.displayName,
                      })}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <div className="flex items-start gap-1 min-w-0">
                      <Calendar className="h-3 w-3 shrink-0 mt-0.5" />
                      <span>
                        {t('storageArea.added')} {formatDate(new Date(storageItem.createdAt), 'MMM d')}
                        {freezerProgress && (
                          <>
                            {' '}
                            <Tooltip delayDuration={200}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    'inline cursor-help border-0 bg-transparent p-0 text-left font-medium underline decoration-dotted decoration-current underline-offset-2',
                                    getFreezerColorClass(freezerProgress.current, freezerProgress.total)
                                  )}
                                >
                                  [
                                  {t('storedItems.frozenProgress', {
                                    current: freezerProgress.current,
                                    count: freezerProgress.total,
                                  })}
                                  ]
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p>
                                  {t('storedItems.freezerRecommendation', {
                                    category: t(`items.categories.${item.category}`),
                                    count: Math.max(
                                      1,
                                      Math.round(freezerProgress.total / 30)
                                    ),
                                  })}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </span>
                    </div>
                    {area.type !== StorageAreaType.FREEZER &&
                      (storageItem.effectiveExpirationDate || storageItem.expirationDate) && (
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{t('storageArea.expiresIn', { days: getDaysUntilExpiration(storageItem.effectiveExpirationDate || storageItem.expirationDate) })}</span>
                      </div>
                    )}
                    {storageItem.isOpened && storageItem.openedDate && (
                      <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                        <PackageOpen className="h-3 w-3" />
                        <span>{t('storedItems.openedOn')} {formatDate(new Date(storageItem.openedDate), 'MMM d')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {!isEditing && (
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingItem(storageItem.id)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="deleteTrash"
                  size="sm"
                  onClick={handleDelete}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
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
                  <span className="text-2xl shrink-0">{area.emoji}</span>
                  <h1 className="text-xl font-bold text-foreground truncate">{area.name}</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('storageArea.itemCount', { count: storageItems.length })}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 touch-friendly shrink-0"
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
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
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
            storageItems.map((storageItem) => (
              <motion.div
                key={storageItem.id}
                {...scrollRevealFadeUp(prefersReducedMotion)}
              >
                <StorageItemCard storageItem={storageItem} storageAreas={storageAreasList} />
              </motion.div>
            ))
          ) : (
            <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-4">{area.emoji}</div>
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

      <BottomNavigation currentPage="home" />
    </div>
  );
};

export default StorageArea;
