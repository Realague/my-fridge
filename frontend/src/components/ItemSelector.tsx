import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, PenLine, X, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { itemService, Item, RecentItem } from '@/services/itemService';
import { ItemDeletionService } from '@/services/itemDeletionService';
import { useAuthStore } from '@/stores/authStore';
import { useHouseholdStore } from '@/stores/householdStore';
import { ItemEditor } from '@/components/ItemEditor';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { getItemDisplayName, getCategoryColor } from '@/utils/itemUtils';
import { CategoryIcon } from '@/utils/categoryIcons';
import { ItemImage } from '@/components/ItemImage';
import { ItemCategory } from '@/types/enums';
import { uploadImageWithSignature } from '@/services/imageUploadService';
import { getCachedSuggestions } from '@/utils/itemSuggestionsCache';
import { formatRelativeTime } from '@/utils/relativeTime';
import type { ItemSuggestions } from '@/services/itemService';

interface ItemSelectorProps {
  onItemSelect: (item: Item | null) => void;
  placeholder?: string;
  className?: string;
  selectedItem?: Item | null;
  excludedItems?: Item[];
  excludeCleaningProducts?: boolean;
  /** Focus the search input on mount and whenever `selectedItem` clears. */
  autoFocus?: boolean;
  /** Enable personalized ranking + sectioned empty-state (stock & shopping only). */
  personalized?: boolean;
}

export const ItemSelector = ({
  onItemSelect,
  placeholder,
  className,
  selectedItem = null,
  excludedItems = [],
  excludeCleaningProducts = false,
  autoFocus = false,
  personalized = false,
}: ItemSelectorProps) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [creatingNewItem, setCreatingNewItem] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const [deletionImpact, setDeletionImpact] = useState<string>('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [apiResults, setApiResults] = useState<Item[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [hasLoadedHouseholdItems, setHasLoadedHouseholdItems] = useState(false);
  const [suggestions, setSuggestions] = useState<ItemSuggestions | null>(null);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const catalogOffsetRef = useRef(0);
  const PAGE_SIZE = 20;

  const { user, isAuthenticated } = useAuthStore();
  const { selectedHouseholdId, isCurrentUserAdmin } = useHouseholdStore();
  const userRef = useRef(user);
  const isAuthenticatedRef = useRef(isAuthenticated);

  const itemNameSchema = z.string()
  .trim()
  .min(2, { message: t('messages.error.invalidItemName') });

  // Keep refs updated
  useEffect(() => {
    userRef.current = user;
    isAuthenticatedRef.current = isAuthenticated;
  }, [user, isAuthenticated]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSearchQueryRef = useRef('');
  const householdItemsRef = useRef<Item[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // When the parent clears the selection (typically after a successful add),
  // pull focus back to the search input so the next item can be typed without
  // re-clicking the field.
  useEffect(() => {
    if (autoFocus && !selectedItem) {
      inputRef.current?.focus();
    }
  }, [autoFocus, selectedItem]);

  // Load household items only when dropdown is opened (lazy loading)
  const loadHouseholdItemsOnDemand = async () => {
    // Wait for authentication to complete
    if (!user || !isAuthenticated || !selectedHouseholdId || hasLoadedHouseholdItems) {
      return;
    }

    try {
      setApiLoading(true);
      const items = await itemService.getItemsByHousehold(selectedHouseholdId);
      setApiResults(items);
      householdItemsRef.current = items;
      setHasLoadedHouseholdItems(true);
    } catch (error) {
      console.error('ItemSelector: Failed to load household items:', error);
      // Check if it's an auth error
      if (error instanceof Error && error.message.includes('Authentication')) {
        toast.error(t('messages.error.loginRequired'));
      } else {
        toast.error(t('messages.error.failedToLoad'));
      }
      setApiResults([]);
      householdItemsRef.current = [];
    } finally {
      setApiLoading(false);
    }
  };

  // Load personalized suggestions only when dropdown is opened (lazy loading)
  const loadSuggestionsOnDemand = async () => {
    if (!personalized || !user || !isAuthenticated || !selectedHouseholdId) return;
    try {
      const [data, firstPage] = await Promise.all([
        getCachedSuggestions(selectedHouseholdId),
        itemService.getCatalogPage({
          householdId: selectedHouseholdId,
          language: i18n.language.split('-')[0],
          limit: PAGE_SIZE,
          offset: 0,
        }),
      ]);
      setSuggestions(data);
      setApiResults(firstPage.items);
      setCatalogTotal(firstPage.total);
      catalogOffsetRef.current = firstPage.items.length;
    } catch (error) {
      console.error('ItemSelector: failed to load suggestions/catalog', error);
      setSuggestions(null); // fall back silently to the plain catalog
    }
  };

  // Reset household items cache when household changes
  useEffect(() => {
    setHasLoadedHouseholdItems(false);
    setApiResults([]);
    householdItemsRef.current = [];
    setSuggestions(null);
  }, [selectedHouseholdId]);

  // Debounced search effect - loads ALL items and filters on frontend for translation support
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    if (query.trim()) {
      // Load all items when user searches (filter happens on frontend using translations)
      if (query !== lastSearchQueryRef.current) {
        const timeout = setTimeout(async () => {
          if (!userRef.current || !isAuthenticatedRef.current || !query.trim()) {
            return;
          }

          setApiLoading(true);
          
          try {
            // Use backend translation search for better performance
            // Normalize language to base code (e.g., 'fr-FR' → 'fr') for mobile browser compatibility
            const normalizedLanguage = i18n.language.split('-')[0];
            const response = await itemService.searchItems({
              search: query, // Search with the actual query
              language: normalizedLanguage, // Pass normalized language for backend translation search
              limit: PAGE_SIZE,
              personalized,
            });
            
            setApiResults(response.items);
            lastSearchQueryRef.current = query;
          } catch (error) {
            console.error('Failed to load items:', error);
            // Check if it's an auth error
            if (error instanceof Error && error.message.includes('Authentication')) {
              toast.error(t('messages.error.loginRequired'));
            } else {
              toast.error(t('messages.error.failedToLoad'));
            }
            setApiResults([]);
          } finally {
            setApiLoading(false);
          }
        }, 300);
        searchTimeoutRef.current = timeout;
      }
    } else {
      // When query is empty, show household items if available
      setApiResults(householdItemsRef.current);
      lastSearchQueryRef.current = '';
    }

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [query]); // Only query dependency to prevent any re-renders

  const filteredResults = apiResults.filter(item => {
    // Exclude items that are in the excludedItems list
    if (excludedItems.some(excluded => excluded.id === item.id)) {
      return false;
    }
    
    // Exclude cleaning products if the prop is set to true
    if (excludeCleaningProducts && item.category === ItemCategory.CLEANING_PRODUCTS) {
      return false;
    }

    // Cooked meals are managed exclusively via the dedicated cooked-meal flow
    // (AddStoredItemDialog → "Plat cuisiné" toggle). They must not appear in
    // the generic catalog selector — neither for shopping list, recipe
    // ingredients, nor for the "ingredient" branch of the storage form.
    if (item.category === ItemCategory.COOKED_MEAL) {
      return false;
    }

    return true;
  });

  const exactMatch = filteredResults.find(item => 
    item.name.toLowerCase() === query.toLowerCase()
  );

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Calculate available space below the input
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Determine if dropdown should open above or below
      // Open above if there's not enough space below (less than 300px) 
      // or if there's significantly more space above
      const shouldOpenAbove = spaceBelow < 300 || (spaceAbove > spaceBelow + 100);
      
      // For fixed positioning, use viewport coordinates directly
      // When opening above, we need to account for the dropdown height
      const dropdownHeight = 256; // max-h-64 = 16rem = 256px
      let top = shouldOpenAbove 
        ? Math.max(10, rect.top - dropdownHeight - 4)  // Position above input with margin
        : rect.bottom + 4; // Position below input
      
      // Ensure dropdown doesn't go off-screen horizontally
      let left = rect.left;
      const dropdownWidth = Math.max(rect.width, 300); // Minimum width
      
      if (left + dropdownWidth > viewportWidth) {
        left = viewportWidth - dropdownWidth - 10; // 10px margin from edge
      }
      if (left < 10) {
        left = 10; // 10px margin from left edge
      }
      
      setDropdownPosition({
        top,
        left,
        width: dropdownWidth
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        // Use requestAnimationFrame to ensure smooth updates
        requestAnimationFrame(() => {
          updateDropdownPosition();
        });
      }
    };

    const handleResize = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    document.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  /**
   * react-remove-scroll (used by Radix Dialog) registers capture-phase listeners on
   * the document that call preventDefault() on wheel events to block body scrolling.
   * Since capture-phase document listeners fire before any element-level handler, the
   * only reliable fix is to intercept the event ourselves with { passive: false } and
   * manually drive scrollTop, bypassing the lock entirely.
   */
  useEffect(() => {
    const el = dropdownRef.current;
    if (!el || !isOpen) return;
    const onWheel = (e: WheelEvent) => {
      e.stopPropagation();
      e.preventDefault();
      el.scrollTop += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isOpen]);

  const loadMore = async () => {
    if (loadingMore) return;

    // Active search: page more matches via the search endpoint.
    if (query.trim()) {
      if (filteredResults.length >= 200) return; // sane bound on a typed search
      setLoadingMore(true);
      try {
        const resp = await itemService.searchItems({
          search: query,
          language: i18n.language.split('-')[0],
          limit: PAGE_SIZE,
          offset: apiResults.length,
          personalized,
        });
        if (resp.items.length > 0) {
          setApiResults((prev) => [...prev, ...resp.items]);
        }
      } catch (error) {
        console.error('ItemSelector: failed to load more search results', error);
      } finally {
        setLoadingMore(false);
      }
      return;
    }

    // Personalized empty state: page the alphabetical catalogue.
    if (personalized && catalogOffsetRef.current < catalogTotal) {
      setLoadingMore(true);
      try {
        const page = await itemService.getCatalogPage({
          householdId: selectedHouseholdId!,
          language: i18n.language.split('-')[0],
          limit: PAGE_SIZE,
          offset: catalogOffsetRef.current,
        });
        setApiResults((prev) => [...prev, ...page.items]);
        catalogOffsetRef.current += page.items.length;
        setCatalogTotal(page.total);
      } catch (error) {
        console.error('ItemSelector: failed to load more catalog items', error);
      } finally {
        setLoadingMore(false);
      }
    }
  };

  const handleDropdownScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      loadMore();
    }
  };

  const handleItemSelect = (item: Item) => {
    onItemSelect(item);
    setQuery('');
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    const validationResult = itemNameSchema.safeParse(query);

    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }
    if (exactMatch) return;

    setCreatingNewItem(true);
    setIsOpen(false);
  };

  const handleEditItem = (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setIsOpen(false);
  };

  const confirmDeleteItem = async (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteItem(item);
    setIsOpen(false);
    const recipeCount = await itemService.getRecipeCount(item.id);
    const impact = ItemDeletionService.getDeletionImpactSummary(item.id, recipeCount, {
      storedItems: (count: number) => t('itemSelector.storedItems', { count }),
      itemMinimums: (count: number) => t('itemSelector.itemMinimums', { count }),
      shoppingItems: (count: number) => t('itemSelector.shoppingItems', { count }),
      recipes: (count: number) => t('itemSelector.recipes', { count }),
      noReferencesFound: t('itemSelector.noReferencesFound'),
      deletionImpactSummary: (impacts: string) => t('itemSelector.deletionImpactSummary', { impacts })
    });
    setDeletionImpact(impact);
  };

  const handleDeleteItem = async (item: Item) => {
    if (!user || !selectedHouseholdId) {
      toast.error(t('messages.error.loginRequired'));
      return;
    }
    
    try {
      // Use the centralized deletion service with translated messages
      await ItemDeletionService.deleteItem(
        item.id, 
        selectedHouseholdId, 
        getItemDisplayName(item, t),
        t('messages.success.itemDeleted'),
        t('messages.success.itemDeletedDescription', { item: getItemDisplayName(item, t) })
      );
      
      // Refresh the household items cache
      await refreshHouseholdItems();
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to delete item:', error);
      const errorMessage = error instanceof Error ? error.message : '';
      
      // Check if it's a permission error
      if (errorMessage.includes('Admin privileges required') || errorMessage.includes('Access denied')) {
        toast.error(t('messages.error.adminRequired'));
      } else if (errorMessage.includes('Authentication') || errorMessage.includes('401')) {
        toast.error(t('messages.error.loginRequired'));
      } else {
        toast.error(t('messages.error.failedToDeleteItem'));
      }
    }
  };

  // Refresh household items cache
  const refreshHouseholdItems = async () => {
    if (!user || !selectedHouseholdId) return;
    
    try {
      const items = await itemService.getItemsByHousehold(selectedHouseholdId);
      householdItemsRef.current = items;
      if (!query.trim()) {
        setApiResults(items);
      }
    } catch (error) {
      console.error('Failed to refresh household items:', error);
    }
  };

  const handleSaveEdit = async (updates: Partial<Item>) => {
    if (!editingItem) return;

    try {
      if (user && selectedHouseholdId) {
        const selectedFile = (updates as any)._selectedImageFile as File | null;
        // First update core fields
        await itemService.updateItem(editingItem.id, {
          name: updates.name,
          category: updates.category,
          defaultUnit: updates.defaultUnit,
          availableUnits: updates.availableUnits,
          daysAfterOpening: updates.daysAfterOpening,
        }, selectedHouseholdId);

        // If a new image was selected, upload it now and update the item image
        if (selectedFile) {
          try {
            const imageUrl = await uploadImageWithSignature('items', selectedFile);
            await itemService.updateItem(editingItem.id, { imageUrl: imageUrl }, selectedHouseholdId);
          } catch (e) {
            console.error('Deferred item image upload failed:', e);
          }
        }
        toast.success(t('messages.success.itemUpdated'));
        // Refresh the household items cache
        await refreshHouseholdItems();
      }
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to update item:', error);
      const errorMessage = error instanceof Error ? error.message : '';
      
      // Check if it's a duplicate name error
      if (errorMessage.includes('already exists')) {
        toast.error(t('messages.error.duplicateItemName'));
      } else {
        toast.error(t('messages.error.failedToUpdateItem'));
      }
    }
  };

  const handleSaveNewItem = async (newItemData: Partial<Item>) => {
    const validationResult = itemNameSchema.safeParse(newItemData.name);

    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }
    
    const newName = validationResult.data;

    try {
      if (user && selectedHouseholdId) {
        const selectedFile = (newItemData as any)._selectedImageFile as File | null;
        const newApiItem = await itemService.createItem({
          name: newName,
          category: newItemData.category || 'other',
          defaultUnit: newItemData.defaultUnit,
          availableUnits: newItemData.availableUnits,
          householdId: selectedHouseholdId,
          daysAfterOpening: newItemData.daysAfterOpening,
        });
        // If an image was selected, upload it now and set on the new item
        if (selectedFile) {
          try {
            const imageUrl = await uploadImageWithSignature('items', selectedFile);
            await itemService.updateItem(newApiItem.id, { imageUrl: imageUrl }, selectedHouseholdId);
          } catch (e) {
            console.error('Deferred item image upload failed:', e);
          }
        }
        onItemSelect(newApiItem);
        setQuery('');
        setCreatingNewItem(false);
        toast.success(t('messages.success.itemAdded', { item: newName }));
        // Refresh the household items cache
        await refreshHouseholdItems();
        return;
      }
      
      toast.error(t('messages.error.selectHouseholdFirst'));
    } catch (error) {
      console.error('Failed to create item:', error);
      const errorMessage = error instanceof Error ? error.message : '';
      
      // Check if it's a duplicate name error
      if (errorMessage.includes('already exists')) {
        toast.error(t('messages.error.duplicateItemName'));
      } else {
        toast.error(t('messages.error.failedToCreateItem'));
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);

    // Load household items when user starts typing (lazy loading)
    if (!e.target.value.trim()) {
      if (personalized) {
        loadSuggestionsOnDemand();
      } else if (!hasLoadedHouseholdItems) {
        loadHouseholdItemsOnDemand();
      }
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setTimeout(updateDropdownPosition, 0);

    if (!query.trim()) {
      if (personalized) {
        loadSuggestionsOnDemand();
      } else if (!hasLoadedHouseholdItems) {
        loadHouseholdItemsOnDemand();
      }
    }
  };

  const handleClearSelection = () => {
    setQuery('');
    setIsOpen(false);
    onItemSelect(null);
  };

  const displayValue = selectedItem && !query ? getItemDisplayName(selectedItem, t) : query;
  const showClearButton = selectedItem && !query;

  const renderRow = (item: Item, subtitle?: string) => (
    <div
      key={item.id}
      onClick={() => handleItemSelect(item)}
      className="group flex items-center justify-between p-2 hover:bg-muted cursor-pointer rounded transition-colors"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <ItemImage
          src={item.imageUrl}
          alt={getItemDisplayName(item, t)}
          containerClassName="w-10 h-10 rounded-md"
          fallbackIconSize={22}
          category={item.category}
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{getItemDisplayName(item, t)}</div>
          <div className="flex items-center gap-2">
            <Badge className={`${getCategoryColor(item.category)} inline-flex items-center gap-1`}>
              <CategoryIcon category={item.category} className="h-3.5 w-3.5" />
              {t(`items.categories.${item.category}`)}
            </Badge>
            {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSectionHeader = (label: string) => (
    <div className="px-2 pt-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
  );

  // Filter out excluded / cleaning / cooked-meal items the same way the search
  // results are filtered, so sections honour the same exclusions.
  const keepSuggestion = (item: Item) =>
    !excludedItems.some((e) => e.id === item.id) &&
    !(excludeCleaningProducts && item.category === ItemCategory.CLEANING_PRODUCTS) &&
    item.category !== ItemCategory.COOKED_MEAL;

  const showSections = personalized && !query.trim() && !!suggestions;
  const hasAnySuggestion =
    !!suggestions &&
    (suggestions.recent.length + suggestions.personalFrequent.length + suggestions.householdFrequent.length) > 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="pr-20"
          autoFocus={autoFocus}
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {showClearButton && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            className="h-6 w-6 p-0 hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleInputFocus}
            className="h-6 w-6 p-0 hover:bg-muted"
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          onScroll={handleDropdownScroll}
          className="fixed z-[100] bg-card border border-border rounded-md shadow-lg max-h-64 overflow-y-auto pointer-events-auto"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            minWidth: dropdownPosition.width
          }}
        >

          {apiLoading && (
            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground bg-card">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {t('itemSelector.searching')}
            </div>
          )}

          {!apiLoading && query.trim() && !exactMatch && (
            <div className="border-b border-border bg-muted/50">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCreateNew}
                className="w-full justify-start p-3 h-auto text-left hover:bg-muted"
              >
                <Plus className="h-4 w-4 mr-2 text-primary" />
                <div>
                  <div className="font-medium">{t('itemSelector.createWithDetails', { query })}</div>
                  <div className="text-xs text-muted-foreground">{t('itemSelector.setCategoryUnitsAndOtherOptions')}</div>
                </div>
              </Button>
            </div>
          )}

          {showSections && hasAnySuggestion && (
            <div className="p-1">
              {suggestions!.recent.filter(keepSuggestion).length > 0 && (
                <>
                  {renderSectionHeader(t('itemSelector.sections.recent'))}
                  {suggestions!.recent.filter(keepSuggestion).map((item) =>
                    renderRow(item, formatRelativeTime((item as RecentItem).lastSelectedAt, i18n.language.split('-')[0]))
                  )}
                </>
              )}
              {suggestions!.personalFrequent.filter(keepSuggestion).length > 0 && (
                <>
                  {renderSectionHeader(t('itemSelector.sections.frequent'))}
                  {suggestions!.personalFrequent.filter(keepSuggestion).map((item) => renderRow(item))}
                </>
              )}
              {suggestions!.householdFrequent.filter(keepSuggestion).length > 0 && (
                <>
                  {renderSectionHeader(t('itemSelector.sections.householdFrequent'))}
                  {suggestions!.householdFrequent.filter(keepSuggestion).map((item) => renderRow(item))}
                </>
              )}
              {renderSectionHeader(t('itemSelector.sections.allItems'))}
            </div>
          )}

          {filteredResults.length > 0 && (
            <div className="p-1">
              {filteredResults.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  onClick={() => handleItemSelect(item)}
                  className="group flex items-center justify-between p-2 hover:bg-muted cursor-pointer rounded transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <ItemImage
                      src={item.imageUrl}
                      alt={getItemDisplayName(item, t)}
                      containerClassName="w-10 h-10 rounded-md"
                      fallbackIconSize={22}
                      category={item.category}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{getItemDisplayName(item, t)}</div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getCategoryColor(item.category)} inline-flex items-center gap-1`}>
                          <CategoryIcon category={item.category} className="h-3.5 w-3.5" />
                          {t(`items.categories.${item.category}`) }
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {item.householdId ? t('itemSelector.household') : t('itemSelector.global')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {item.householdId && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="editIconButton"
                        size="sm"
                        onClick={(e) => handleEditItem(item, e)}
                        className="h-6 w-6 p-0"
                      >
                        <PenLine className="h-3 w-3" />
                      </Button>
                      {isCurrentUserAdmin() && (
                        <Button
                          type="button"
                          variant="deleteTrash"
                          size="sm"
                          onClick={(e) => confirmDeleteItem(item, e)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {loadingMore && (
            <div className="flex items-center justify-center p-2 text-xs text-muted-foreground bg-card">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {t('itemSelector.searching')}
            </div>
          )}

          {filteredResults.length === 0 && !query.trim() && !hasLoadedHouseholdItems && (
            <div 
              className="p-4 text-center text-sm text-muted-foreground bg-card cursor-pointer hover:bg-muted/50"
              onClick={() => loadHouseholdItemsOnDemand()}
            >
              {t('itemSelector.clickToLoadHouseholdItems')}
            </div>
          )}
          
          {filteredResults.length === 0 && !query.trim() && hasLoadedHouseholdItems && (
            <div className="p-4 text-center text-sm text-muted-foreground bg-card">
              {t('itemSelector.searchItemsPlaceholder')}
            </div>
          )}

          {filteredResults.length === 0 && query.trim() && !apiLoading && (
            <div className="p-4 text-center text-sm text-muted-foreground bg-card">
              {t('itemSelector.noItemsFound')}
            </div>
          )}

          {filteredResults.length === 0 && !query.trim() && hasLoadedHouseholdItems && excludedItems.length > 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground bg-card">
              {t('itemSelector.allItemsAlreadySelected')}
            </div>
          )}
        </div>,
        document.body
      )}

      {editingItem && (
        <ItemEditor
          item={editingItem}
          onSave={handleSaveEdit}
          onCancel={() => setEditingItem(null)}
          onDelete={handleDeleteItem}
        />
      )}

      {creatingNewItem && (
        <ItemEditor
          item={{
            id: '',
            name: query.trim(),
            category: 'other',
            defaultUnit: 'piece',
            availableUnits: ['piece'],
            imageUrl: null,
            createdBy: null,
            householdId: null,
            createdAt: '',
            updatedAt: ''
          }}
          onSave={handleSaveNewItem}
          onCancel={() => setCreatingNewItem(false)}
        />
      )}

       {deleteItem && (
         <AlertDialog open={!!deleteItem} onOpenChange={(open) => {
           if (!open) {
             setDeleteItem(null);
             setDeletionImpact('');
           }
         }}>
           <AlertDialogContent>
             <AlertDialogHeader>
               <AlertDialogTitle>{t('itemSelector.deleteItem')}</AlertDialogTitle>
             <AlertDialogDescription>
               {t('itemSelector.deleteItemConfirmation', { item: getItemDisplayName(deleteItem, t) })}
               <br /><br />
               <span className="text-sm text-muted-foreground">{deletionImpact}</span>
             </AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogFooter>
               <AlertDialogCancel onClick={() => {
                 setDeleteItem(null);
                 setDeletionImpact('');
               }}>
                 {t('buttons.cancel')}
               </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => {
                    handleDeleteItem(deleteItem);
                    setDeleteItem(null);
                    setDeletionImpact('');
                  }} 
                  className="text-foreground bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  {t('buttons.delete')}
                </AlertDialogAction>
             </AlertDialogFooter>
           </AlertDialogContent>
         </AlertDialog>
       )}
      
    </div>
  );
};
