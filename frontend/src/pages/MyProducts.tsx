import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  ChefHat,
  ChevronDown,
  Filter,
  Search,
  X,
} from 'lucide-react';

import BottomNavigation from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import { MyProductsItemCard } from '@/components/MyProductsItemCard';
import { useAuthStore } from '@/stores/authStore';
import { useStoredItemStore } from '@/stores/storedItemStore';
import { useStorageAreaStore } from '@/stores/storageAreaStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useMyProductsPreferences } from '@/hooks/useMyProductsPreferences';
import { itemService, type Item } from '@/services/itemService';
import {
  buildStorageAreaDisplayRows,
  type StorageAreaListRow,
  type StorageAreaSortCriterion,
} from '@/utils/storageAreaSort';
import { CategoryIcon } from '@/utils/categoryIcons';
import { getItemDisplayName } from '@/utils/itemUtils';
import { ITEM_CATEGORIES, StorageAreaType } from '@/types/enums';
import { scrollRevealFadeUp } from '@/lib/motion';
import { normalizeForSearch } from '@/utils/searchNormalize';

const SORT_CRITERIA: StorageAreaSortCriterion[] = [
  'expiration',
  'addedAt',
  'name',
  'category',
];

interface AreaSection {
  areaId: string | null;
  areaName: string;
  areaEmoji: string;
  areaType: StorageAreaType;
  rows: StorageAreaListRow[];
  itemCount: number;
}

const MyProducts = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { selectedHouseholdId } = useProtectedRoute();
  const currentUser = useAuthStore((state) => state.user);
  const prefersReducedMotion = useReducedMotion() ?? false;

  const {
    fetchStoredItems,
    deleteStoredItem,
    getStoredItemsForHousehold,
    loading: storedItemsLoading,
  } = useStoredItemStore();
  const { fetchStorageAreas, getStorageAreasForHousehold } = useStorageAreaStore();

  const storedItems = getStoredItemsForHousehold();
  const storageAreas = getStorageAreasForHousehold();
  const sortedAreas = useMemo(
    () => [...storageAreas].sort((a, b) => a.sortOrder - b.sortOrder),
    [storageAreas]
  );
  const areaById = useMemo(() => {
    const map: Record<string, (typeof storageAreas)[number]> = {};
    for (const area of storageAreas) map[area.id] = area;
    return map;
  }, [storageAreas]);

  const [items, setItems] = useState<Record<string, Item>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  /**
   * `null` means "no area filter applied" (default — all areas shown).
   * Becomes a Set as soon as the user toggles a checkbox.
   */
  const [selectedAreaIds, setSelectedAreaIds] = useState<Set<string> | null>(null);

  const { preferences, setCriterion, toggleDirection, setGroupByArea } =
    useMyProductsPreferences(currentUser?.id);

  useEffect(() => {
    if (!selectedHouseholdId) return;
    fetchStorageAreas();
    /** Refetch on mount: a per-area page may have overwritten the household bucket. */
    fetchStoredItems();
  }, [selectedHouseholdId, fetchStorageAreas, fetchStoredItems]);

  /**
   * Tracks itemIds we've already started fetching (success OR pending) so we don't
   * re-issue requests on every re-render. On error we clear the id so it can retry.
   */
  const pendingItemFetchesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!selectedHouseholdId) return;
    const missing = storedItems
      .map((si) => si.itemId)
      .filter((itemId) => !items[itemId] && !pendingItemFetchesRef.current.has(itemId));
    if (missing.length === 0) return;

    const unique = Array.from(new Set(missing));
    for (const id of unique) pendingItemFetchesRef.current.add(id);

    let cancelled = false;
    (async () => {
      try {
        const fetched = await Promise.all(
          unique.map((itemId) => itemService.getItemById(itemId, selectedHouseholdId))
        );
        if (cancelled) return;
        setItems((prev) => {
          const next = { ...prev };
          for (const it of fetched) next[it.id] = it;
          return next;
        });
      } catch (error) {
        console.error('Failed to load item details:', error);
        for (const id of unique) pendingItemFetchesRef.current.delete(id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storedItems, selectedHouseholdId, items]);

  const isAreaChecked = (areaId: string) =>
    selectedAreaIds === null ? true : selectedAreaIds.has(areaId);

  const toggleArea = (areaId: string) => {
    setSelectedAreaIds((prev) => {
      if (prev === null) {
        /** First user interaction: materialize "all" minus the toggled one. */
        const next = new Set(sortedAreas.map((a) => a.id));
        next.delete(areaId);
        return next;
      }
      const next = new Set(prev);
      if (next.has(areaId)) next.delete(areaId);
      else next.add(areaId);
      return next;
    });
  };

  const checkedAreasCount = selectedAreaIds === null ? sortedAreas.length : selectedAreaIds.size;

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeForSearch(searchQuery.trim());
    return storedItems.filter((si) => {
      if (selectedAreaIds !== null && !selectedAreaIds.has(si.storageAreaId)) {
        return false;
      }
      const item = items[si.itemId];
      if (categoryFilter !== 'all') {
        if (!item || item.category !== categoryFilter) return false;
      }
      if (normalizedSearch) {
        if (!item) return false;
        const name = getItemDisplayName(item, t);
        if (!normalizeForSearch(name).includes(normalizedSearch)) return false;
      }
      return true;
    });
  }, [storedItems, selectedAreaIds, categoryFilter, items, searchQuery, t]);

  /** Empty state distinguishes "no items in the household" vs. "search/filter returned nothing". */
  const hasAnyItem = storedItems.length > 0;
  const hasResults = filteredItems.length > 0;
  const filtersActive =
    searchQuery.trim() !== '' ||
    categoryFilter !== 'all' ||
    (selectedAreaIds !== null && selectedAreaIds.size !== sortedAreas.length);

  const sections: AreaSection[] = useMemo(() => {
    if (preferences.groupByArea) {
      const byArea = new Map<string, typeof storedItems>();
      for (const si of filteredItems) {
        const arr = byArea.get(si.storageAreaId) ?? [];
        arr.push(si);
        byArea.set(si.storageAreaId, arr);
      }
      const result: AreaSection[] = [];
      for (const area of sortedAreas) {
        const list = byArea.get(area.id);
        if (!list || list.length === 0) continue;
        const rows = buildStorageAreaDisplayRows(
          list,
          items,
          area.type,
          preferences.criterion,
          preferences.direction,
          i18n.language,
          t
        );
        result.push({
          areaId: area.id,
          areaName: area.name,
          areaEmoji: area.emoji,
          areaType: area.type,
          rows,
          itemCount: list.length,
        });
      }
      return result;
    }

    /**
     * Flat mode: a single virtual section. Pass OTHER as the area type so the
     * freezer fallback in the sort util doesn't kick in for the mixed view.
     */
    const rows = buildStorageAreaDisplayRows(
      filteredItems,
      items,
      StorageAreaType.OTHER,
      preferences.criterion,
      preferences.direction,
      i18n.language,
      t
    );
    return [
      {
        areaId: null,
        areaName: '',
        areaEmoji: '',
        areaType: StorageAreaType.OTHER,
        rows,
        itemCount: filteredItems.length,
      },
    ];
  }, [
    preferences.groupByArea,
    preferences.criterion,
    preferences.direction,
    filteredItems,
    items,
    sortedAreas,
    i18n.language,
    t,
  ]);

  const handleSortOption = (criterion: StorageAreaSortCriterion) => {
    if (preferences.criterion === criterion) {
      toggleDirection();
    } else {
      setCriterion(criterion);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setSelectedAreaIds(null);
  };

  const handleDelete = async (storedItemId: string) => {
    try {
      await deleteStoredItem(storedItemId);
    } catch (error) {
      console.error('Failed to delete stored item:', error);
    }
  };

  const renderRow = (row: StorageAreaListRow, key: string | number) => {
    if (row.kind === 'header') {
      return (
        <div
          key={`cat-header-${key}`}
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
      );
    }

    const si = row.storedItem;
    return (
      <motion.div key={si.id} {...scrollRevealFadeUp(prefersReducedMotion)}>
        <MyProductsItemCard
          storedItem={si}
          item={items[si.itemId]}
          area={areaById[si.storageAreaId]}
          currentUserId={currentUser?.id}
          onDelete={handleDelete}
        />
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Boxes className="h-6 w-6 text-primary shrink-0" aria-hidden />
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">
                {t('pages.myProducts.title')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('pages.myProducts.subtitle', { count: storedItems.length })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4"
            aria-hidden
          />
          <Input
            placeholder={t('pages.myProducts.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card/80 backdrop-blur-sm border-0 shadow-lg"
          />
        </div>

        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-between gap-2 touch-friendly"
                    aria-label={t('pages.myProducts.filterByArea')}
                  >
                    <span className="text-muted-foreground shrink-0">
                      {t('pages.myProducts.filterByArea')}
                    </span>
                    <span className="font-medium truncate">
                      {selectedAreaIds === null
                        ? t('pages.myProducts.areasAll')
                        : t('pages.myProducts.areasSelected', { count: checkedAreasCount })}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-2">
                  {sortedAreas.length === 0 ? (
                    <p className="px-2 py-1 text-sm text-muted-foreground">
                      {t('pages.dashboard.noStorageAreas')}
                    </p>
                  ) : (
                    <ul className="space-y-1 max-h-72 overflow-y-auto">
                      {sortedAreas.map((area) => {
                        const checked = isAreaChecked(area.id);
                        return (
                          <li key={area.id}>
                            <Label
                              htmlFor={`area-filter-${area.id}`}
                              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                            >
                              <Checkbox
                                id={`area-filter-${area.id}`}
                                checked={checked}
                                onCheckedChange={() => toggleArea(area.id)}
                              />
                              <span aria-hidden>{area.emoji}</span>
                              <span className="flex-1 truncate text-sm font-medium">
                                {area.name}
                              </span>
                            </Label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </PopoverContent>
              </Popover>

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
                        {t(`storageArea.sort.criterion.${preferences.criterion}`)}
                      </span>
                      {preferences.direction === 'asc' ? (
                        <ArrowUp className="h-4 w-4 shrink-0" aria-hidden />
                      ) : (
                        <ArrowDown className="h-4 w-4 shrink-0" aria-hidden />
                      )}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {SORT_CRITERIA.map((criterion) => (
                    <DropdownMenuItem
                      key={criterion}
                      onClick={() => handleSortOption(criterion)}
                      className={
                        preferences.criterion === criterion ? 'bg-accent focus:bg-accent' : ''
                      }
                    >
                      {t(`storageArea.sort.criterion.${criterion}`)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {filtersActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5 mr-1" aria-hidden />
                  {t('pages.myProducts.noResults.reset')}
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <Label
                htmlFor="group-by-area"
                className="text-sm text-foreground cursor-pointer flex-1"
              >
                {t('pages.myProducts.groupByArea')}
              </Label>
              <Switch
                id="group-by-area"
                checked={preferences.groupByArea}
                onCheckedChange={setGroupByArea}
                aria-label={t('pages.myProducts.groupByArea')}
              />
            </div>
          </CardContent>
        </Card>

        {storedItemsLoading && storedItems.length === 0 ? (
          <Card className="bg-card backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="text-lg text-muted-foreground">{t('common.loading')}</div>
            </CardContent>
          </Card>
        ) : !hasAnyItem ? (
          <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <ChefHat
                className="h-12 w-12 text-muted-foreground mx-auto mb-4"
                aria-hidden
              />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {t('pages.myProducts.empty.title')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t('pages.myProducts.empty.description')}
              </p>
              <Button onClick={() => navigate('/dashboard')} variant="green">
                {t('pages.myProducts.empty.cta')}
              </Button>
            </CardContent>
          </Card>
        ) : !hasResults ? (
          <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <Search
                className="h-12 w-12 text-muted-foreground mx-auto mb-4"
                aria-hidden
              />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {t('pages.myProducts.noResults.title')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t('pages.myProducts.noResults.description')}
              </p>
              <Button onClick={handleResetFilters} variant="green">
                {t('pages.myProducts.noResults.reset')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {sections.map((section) =>
              section.areaId === null ? (
                <div key="flat" className="space-y-4">
                  {section.rows.map((row, idx) => renderRow(row, idx))}
                </div>
              ) : (
                <section key={section.areaId} className="space-y-4">
                  <header className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/60 backdrop-blur-sm border border-border/40">
                    <span className="text-lg" aria-hidden>
                      {section.areaEmoji}
                    </span>
                    <h2 className="font-semibold text-sm sm:text-base text-foreground truncate">
                      {section.areaName}
                    </h2>
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                      {t('pages.myProducts.areaItems', { count: section.itemCount })}
                    </span>
                  </header>
                  <div className="space-y-4">
                    {section.rows.map((row, idx) =>
                      renderRow(row, `${section.areaId}-${idx}`)
                    )}
                  </div>
                </section>
              )
            )}
          </div>
        )}
      </div>

      <BottomNavigation currentPage="products" />
    </div>
  );
};

export default MyProducts;
