import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Users, Filter, Package, PackageCheck, ShoppingCart, PartyPopper, Trash2 } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { AddItemCard } from '@/components/AddItemCard';
import { Item } from '@/services/itemService';
import { useShoppingStore, ShoppingItem } from '@/stores/shoppingStore';
import { useStorageAreaStore } from '@/stores/storageAreaStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useStoreErrorToast } from '@/hooks/useStoreErrorToast';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getItemDisplayName } from '@/utils/itemUtils';
import { CategoryIcon } from '@/utils/categoryIcons';
import { useAuthStore } from '@/stores/authStore';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { shoppingRowMotion } from '@/lib/motion';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { ShoppingItemRow } from '@/components/shopping/ShoppingItemRow';
import { AisleSection } from '@/components/shopping/AisleSection';
import { ShoppingViewModeToggle } from '@/components/shopping/ShoppingViewModeToggle';
import { BulkStorageDialog } from '@/components/BulkStorageDialog';
import { useShoppingPreferences } from '@/hooks/useShoppingPreferences';
import { Aisle, groupItemsByAisle } from '@/utils/aisleMapping';

const noop = () => {};

const Shopping = () => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const { selectedHouseholdId } = useProtectedRoute();
  const currentUser = useAuthStore((state) => state.user);

  const { getStorageAreasForHousehold, fetchStorageAreas } = useStorageAreaStore();

  useStoreErrorToast(useShoppingStore((s) => s.error), useShoppingStore((s) => s.setError));
  useStoreErrorToast(useStorageAreaStore((s) => s.error), useStorageAreaStore((s) => s.setError));

  const storageAreas = selectedHouseholdId ? getStorageAreasForHousehold() : [];
  const {
    items,
    loading,
    fetchShoppingItems,
    createShoppingItem,
    updateShoppingItem,
    deleteShoppingItem,
    moveToStore,
    moveToBuy,
    bulkTransferToStorage,
    getToBuyItems,
    getToStoreItems,
    getTotalItems,
    getToStoreCount,
  } = useShoppingStore();

  const {
    viewMode,
    aisleOrder,
    setViewMode,
    reorderAisle,
    isAisleCollapsed,
    toggleAisleCollapsed,
  } = useShoppingPreferences();

  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeAisle, setActiveAisle] = useState<Aisle | null>(null);

  // Guided storage assistant — the set of items being stored (1..N).
  const [assistantItems, setAssistantItems] = useState<ShoppingItem[] | null>(null);
  // Explicit confirmation before deleting a "to store" item.
  const [itemToConfirmDelete, setItemToConfirmDelete] = useState<ShoppingItem | null>(null);

  // Load shopping items and storage areas from API.
  useEffect(() => {
    if (selectedHouseholdId) {
      fetchShoppingItems();
      fetchStorageAreas();
    }
  }, [selectedHouseholdId, fetchShoppingItems, fetchStorageAreas]);

  // Real-time is deferred to V2 — as a light touch, refetch when the window
  // regains focus so a member sees the list roughly up to date.
  useEffect(() => {
    if (!selectedHouseholdId) return;
    const onFocus = () => fetchShoppingItems();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [selectedHouseholdId, fetchShoppingItems]);

  const handleAddItem = async (item: Item, quantity: string, unit: string) => {
    if (!selectedHouseholdId) {
      toast.error(t('messages.error.noHouseholdSelected'));
      return;
    }
    await createShoppingItem({ itemId: item.id, quantity, unit });
  };

  // À acheter → À ranger (no toast: this action is repeated many times in-store).
  const handleCheck = (id: string) => {
    void moveToStore(id);
  };

  // À ranger → À acheter.
  const handleMoveBack = (id: string) => {
    void moveToBuy(id);
  };

  const deleteToBuy = async (id: string) => {
    if (!selectedHouseholdId) return;
    await deleteShoppingItem(id);
  };

  const requestDeleteToStore = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) setItemToConfirmDelete(item);
  };

  const confirmDeleteToStore = async () => {
    if (!itemToConfirmDelete) return;
    await deleteShoppingItem(itemToConfirmDelete.id);
    setItemToConfirmDelete(null);
  };

  const openAssistantForItem = (id: string) => {
    const item = getToStoreItems().find((i) => i.id === id);
    if (item) setAssistantItems([item]);
  };

  const openAssistantForAll = () => {
    const all = getToStoreItems();
    if (all.length > 0) setAssistantItems(all);
  };

  const handleStore = async (
    selected: Array<{ shoppingItemId: string; storageAreaId: string; expirationDate?: string }>
  ) => {
    const success = await bulkTransferToStorage({ items: selected });
    if (!success) {
      toast.error(t('pages.shopping.bulkStorageError'));
      return;
    }
    setAssistantItems(null);
    // Satisfaction cue once everything has been stored.
    if (getTotalItems() === 0) {
      toast.success(t('pages.shopping.allStoredAway'), {
        icon: '🎉',
      });
    }
  };

  const startEditingItem = (id: string) => setEditingItem(id);
  const cancelItemEdit = () => setEditingItem(null);
  const saveItemEdit = async (id: string, newQuantity: string, newUnit: string) => {
    if (!selectedHouseholdId) return;
    const success = await updateShoppingItem(id, { quantity: newQuantity, unit: newUnit });
    if (success) setEditingItem(null);
  };

  const filterItemsByCategory = (itemsList: ShoppingItem[]) => {
    if (categoryFilter === 'all') return itemsList;
    return itemsList.filter((item) => item.item?.category === categoryFilter);
  };

  const getItemName = (shoppingItem: ShoppingItem) =>
    shoppingItem.item ? getItemDisplayName(shoppingItem.item, t) : 'Unknown Item';

  // --- Derived data ------------------------------------------------------
  const toBuyItems = useMemo(
    () => filterItemsByCategory(getToBuyItems()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, categoryFilter]
  );
  const toStoreItems = useMemo(
    () => filterItemsByCategory(getToStoreItems()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, categoryFilter]
  );

  const totalItems = getTotalItems();
  const toStoreCount = getToStoreCount();
  const hasToStore = toStoreItems.length > 0;

  const categories = ['all', ...Array.from(new Set(items.map((item) => item.item?.category).filter(Boolean)))];

  const sortAlpha = (list: ShoppingItem[]) =>
    [...list].sort((a, b) =>
      getItemName(a).localeCompare(getItemName(b), undefined, { sensitivity: 'base' })
    );

  const toBuyByAisle = useMemo(() => groupItemsByAisle(toBuyItems), [toBuyItems]);
  const toStoreByAisle = useMemo(() => groupItemsByAisle(toStoreItems), [toStoreItems]);
  const toBuyAisleOrder = useMemo(
    () => aisleOrder.filter((aisle) => toBuyByAisle[aisle].length > 0),
    [aisleOrder, toBuyByAisle]
  );
  const toStoreAisleOrder = useMemo(
    () => aisleOrder.filter((aisle) => toStoreByAisle[aisle].length > 0),
    [aisleOrder, toStoreByAisle]
  );

  // Row props per section.
  const buyRowProps = {
    variant: 'to-buy' as const,
    currentUserId: currentUser?.id,
    editingItemId: editingItem,
    onStartEdit: startEditingItem,
    onCancelEdit: cancelItemEdit,
    onSaveEdit: saveItemEdit,
    onDelete: deleteToBuy,
    onCheck: handleCheck,
    onOpenAssistant: noop,
    onMoveBack: noop,
  };
  const storeRowProps = {
    variant: 'to-store' as const,
    currentUserId: currentUser?.id,
    editingItemId: null,
    onStartEdit: noop,
    onCancelEdit: noop,
    onSaveEdit: noop,
    onDelete: requestDeleteToStore,
    onCheck: noop,
    onOpenAssistant: openAssistantForItem,
    onMoveBack: handleMoveBack,
  };

  // --- DnD (aisle reordering, "À acheter" section) -----------------------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const handleDragStart = (event: DragStartEvent) => setActiveAisle(event.active.id as Aisle);
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveAisle(null);
    if (!over || active.id === over.id) return;
    reorderAisle(active.id as Aisle, over.id as Aisle);
  };
  const handleDragCancel = () => setActiveAisle(null);

  // --- Section renderers -------------------------------------------------
  const renderAlphaList = (
    list: ShoppingItem[],
    rowProps: typeof buyRowProps | typeof storeRowProps
  ) => (
    <div className="space-y-2 sm:space-y-3">
      <AnimatePresence initial={false}>
        {sortAlpha(list).map((shoppingItem) => (
          <motion.div
            key={shoppingItem.id}
            layout={!prefersReducedMotion}
            {...shoppingRowMotion(prefersReducedMotion)}
          >
            <ShoppingItemRow shoppingItem={shoppingItem} {...rowProps} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  const renderToBuySection = () => {
    if (toBuyItems.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-4xl mb-2">{hasToStore ? '🛒' : categoryFilter === 'all' ? '🎉' : '📋'}</div>
          <p>
            {hasToStore
              ? t('pages.shopping.allInCart')
              : categoryFilter === 'all'
                ? t('pages.shopping.allItemsCompleted')
                : t('pages.shopping.noItemsInCategory', { category: categoryFilter.toLowerCase() })}
          </p>
        </div>
      );
    }

    if (viewMode === 'aisle') {
      return (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={toBuyAisleOrder} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {toBuyAisleOrder.map((aisle) => (
                <AisleSection
                  key={aisle}
                  aisle={aisle}
                  items={toBuyByAisle[aisle]}
                  collapsed={isAisleCollapsed(aisle)}
                  onToggleCollapsed={toggleAisleCollapsed}
                  {...buyRowProps}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeAisle ? (
              <AisleSection
                aisle={activeAisle}
                items={toBuyByAisle[activeAisle] ?? []}
                collapsed
                dragPreview
                {...buyRowProps}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      );
    }

    return renderAlphaList(toBuyItems, buyRowProps);
  };

  const renderToStoreSection = () => {
    if (viewMode === 'aisle') {
      return (
        <div className="space-y-3">
          {toStoreAisleOrder.map((aisle) => (
            <AisleSection
              key={aisle}
              aisle={aisle}
              items={toStoreByAisle[aisle]}
              collapsed={isAisleCollapsed(aisle)}
              onToggleCollapsed={toggleAisleCollapsed}
              {...storeRowProps}
            />
          ))}
        </div>
      );
    }
    return renderAlphaList(toStoreItems, storeRowProps);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Guided storage assistant (single item or "Tout ranger") */}
      <BulkStorageDialog
        open={assistantItems !== null}
        onOpenChange={(open) => !open && setAssistantItems(null)}
        items={assistantItems ?? []}
        storageAreas={storageAreas}
        title={
          assistantItems && assistantItems.length === 1
            ? t('pages.shopping.storeItemTitle', { name: getItemName(assistantItems[0]) })
            : t('pages.shopping.storeAllTitle')
        }
        onConfirm={handleStore}
        onSkipAll={() => setAssistantItems(null)}
      />

      {/* Delete confirmation for a "to store" item */}
      <Dialog open={itemToConfirmDelete !== null} onOpenChange={(open) => !open && setItemToConfirmDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-mf-danger" />
              {t('pages.shopping.deleteToStoreTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('pages.shopping.deleteToStoreDescription', {
                name: itemToConfirmDelete ? getItemName(itemToConfirmDelete) : '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setItemToConfirmDelete(null)} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDeleteToStore} className="flex-1">
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary shrink-0" aria-hidden />
                {t('pages.shopping.title')}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground">
                  {t('pages.shopping.itemCountSummary', { count: totalItems })}
                </p>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-xs text-primary">{t('pages.shopping.synced')}</span>
                </div>
              </div>
            </div>
            {toStoreCount > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold text-mf-green-deep">{toStoreCount}</div>
                <div className="text-xs text-muted-foreground">{t('pages.shopping.toStoreShort')}</div>
              </div>
            )}
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

        {loading && items.length === 0 && (
          <Card variant="elevated">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mf-green mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t('pages.shopping.loadingShoppingList')}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !selectedHouseholdId && (
          <Card variant="elevated">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">{t('pages.shopping.selectHouseholdToView')}</p>
            </CardContent>
          </Card>
        )}

        {selectedHouseholdId && (!loading || items.length > 0) && (
          <>
            {totalItems === 0 ? (
              <Card variant="elevated">
                <CardContent className="p-10 text-center">
                  <div className="text-5xl mb-3">🛒</div>
                  <h2 className="text-lg font-bold text-foreground">{t('pages.shopping.emptyTitle')}</h2>
                  <p className="text-sm text-muted-foreground mt-2">{t('pages.shopping.emptyDescription')}</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Category Filter + View Mode Toggle */}
                <Card variant="elevated">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-3">
                        <Filter className="h-5 w-5 text-muted-foreground" />
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder={t('pages.shopping.filterByCategory')} />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                <span className="inline-flex items-center gap-2">
                                  {category !== 'all' && (
                                    <CategoryIcon category={category} className="h-4 w-4" />
                                  )}
                                  {t(`items.categories.${category}`)}
                                </span>
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
                      <ShoppingViewModeToggle value={viewMode} onChange={setViewMode} className="shrink-0" />
                    </div>
                  </CardContent>
                </Card>

                <div className={`grid grid-cols-1 gap-6 ${hasToStore ? 'lg:grid-cols-2 lg:items-start' : ''}`}>
                  {/* À acheter */}
                  <Card variant="elevated">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                          <ShoppingCart className="h-5 w-5" />
                        </span>
                        {t('pages.shopping.toBuy')}
                        <span className="text-sm font-normal text-muted-foreground">({toBuyItems.length})</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>{renderToBuySection()}</CardContent>
                  </Card>

                  {/* À ranger — hidden when empty */}
                  {hasToStore && (
                    <Card variant="elevated" className="border-mf-green/30 bg-mf-green-soft/20">
                      <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mf-green-soft text-mf-green-deep">
                              <Package className="h-5 w-5" />
                            </span>
                            {t('pages.shopping.toStore')}
                            <span className="text-sm font-normal text-muted-foreground">({toStoreItems.length})</span>
                          </CardTitle>
                          <Button variant="green" size="sm" onClick={openAssistantForAll} className="gap-1.5 shrink-0">
                            <PackageCheck className="h-4 w-4" />
                            {t('pages.shopping.storeAll')}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>{renderToStoreSection()}</CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <BottomNavigation currentPage="shopping" />
    </div>
  );
};

export default Shopping;
