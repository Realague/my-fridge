import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, Edit, X, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { itemService, Item } from '@/services/itemService';
import { useAuthStore } from '@/stores/authStore';
import { useHouseholdStore } from '@/stores/householdStore';
import { ItemEditor } from '@/components/ItemEditor';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { getItemDisplayName, getCategoryColor } from '@/utils/itemUtils';
import { uploadImageWithSignature } from '@/services/imageUploadService';

interface ItemSelectorProps {
  onItemSelect: (item: Item | null) => void;
  placeholder?: string;
  className?: string;
  selectedItem?: Item | null;
  excludedItems?: Item[];
}

export const ItemSelector = ({ 
  onItemSelect, 
  placeholder, 
  className,
  selectedItem = null,
  excludedItems = []
}: ItemSelectorProps) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [creatingNewItem, setCreatingNewItem] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [apiResults, setApiResults] = useState<Item[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [hasLoadedHouseholdItems, setHasLoadedHouseholdItems] = useState(false);

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

  // Reset household items cache when household changes
  useEffect(() => {
    setHasLoadedHouseholdItems(false);
    setApiResults([]);
    householdItemsRef.current = [];
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
            const response = await itemService.searchItems({
              search: query, // Search with the actual query
              language: i18n.language, // Pass current language for backend translation search
              limit: 20,
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

  const filteredResults = apiResults.filter(item => 
    !excludedItems.some(excluded => excluded.id === item.id)
  );

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

  const handleQuickCreate = async () => {
    const validationResult = itemNameSchema.safeParse(query);

    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    if (exactMatch) return;

    try {
      if (user && selectedHouseholdId) {
        const newApiItem = await itemService.createItem({
          name: validationResult.data,
          category: 'other',
          householdId: selectedHouseholdId,
        });
        
        onItemSelect(newApiItem);
        setQuery('');
        setIsOpen(false);
        toast.success(t('messages.success.itemAdded', { item: validationResult.data }));
        // Refresh the household items cache
        await refreshHouseholdItems();
        return;
      }
    } catch (error) {
      console.error('Failed to create item:', error);
      toast.error(t('messages.error.failedToCreateItem'));
    }
  };

  const handleEditItem = (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setIsOpen(false);
  };

  const confirmDeleteItem = (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteItem(item);
    setIsOpen(false);
  };

  const handleDeleteItem = async (item: Item) => {
    if (!user || !selectedHouseholdId) {
      toast.error(t('messages.error.loginRequired'));
      return;
    }
    
    try {
      await itemService.deleteItem(item.id, selectedHouseholdId);
      toast.success(t('messages.success.itemDeleted', { item: getItemDisplayName(item, t) }));
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
        }, selectedHouseholdId);

        // If a new image was selected, upload it now and update the item image
        if (selectedFile) {
          try {
            const imageUrl = await uploadImageWithSignature('items', selectedFile);
            await itemService.updateItem(editingItem.id, { image: imageUrl }, selectedHouseholdId);
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
        });
        // If an image was selected, upload it now and set on the new item
        if (selectedFile) {
          try {
            const imageUrl = await uploadImageWithSignature('items', selectedFile);
            await itemService.updateItem(newApiItem.id, { image: imageUrl }, selectedHouseholdId);
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
    if (!hasLoadedHouseholdItems && !e.target.value.trim()) {
      loadHouseholdItemsOnDemand();
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setTimeout(updateDropdownPosition, 0);
    
    // Load household items on first focus if not already loaded
    if (!hasLoadedHouseholdItems && !query.trim()) {
      loadHouseholdItemsOnDemand();
    }
  };

  const handleClearSelection = () => {
    setQuery('');
    setIsOpen(false);
    onItemSelect(null);
  };

  const displayValue = selectedItem && !query ? getItemDisplayName(selectedItem, t) : query;
  const showClearButton = selectedItem && !query;


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
          className="fixed z-50 bg-card border border-border rounded-md shadow-lg max-h-64 overflow-y-auto"
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
                onClick={handleQuickCreate}
                className="w-full justify-start p-3 h-auto text-left hover:bg-muted"
              >
                <Plus className="h-4 w-4 mr-2 text-primary" />
                <div>
                  <div className="font-medium">{t('itemSelector.add', { query })}</div>
                  <div className="text-xs text-muted-foreground">{t('itemSelector.quickAddWithDefaultSettings')}</div>
                </div>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleCreateNew}
                className="w-full justify-start p-3 h-auto text-left hover:bg-muted border-t border-border"
              >
                <Edit className="h-4 w-4 mr-2 text-primary" />
                <div>
                  <div className="font-medium">{t('itemSelector.createWithDetails', { query })}</div>
                  <div className="text-xs text-muted-foreground">{t('itemSelector.setCategoryUnitsAndOtherOptions')}</div>
                </div>
              </Button>
            </div>
          )}

          {filteredResults.length > 0 && (
            <div className="p-1">
              {filteredResults.slice(0, 8).map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  onClick={() => handleItemSelect(item)}
                  className="group flex items-center justify-between p-2 hover:bg-muted cursor-pointer rounded transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{getItemDisplayName(item, t)}</div>
                      <div className="flex items-center gap-2">
                        <Badge className={getCategoryColor(item.category)}>
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
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleEditItem(item, e)}
                        className="h-6 w-6 p-0 hover:bg-primary/10 transition-opacity"
                        title="Edit item"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      {isCurrentUserAdmin() && (
                        <Button
                          type="button"
                          variant="deleteTrash"
                          size="sm"
                          onClick={(e) => confirmDeleteItem(item, e)}
                          className="h-6 w-6 p-0"
                          title="Delete item"
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
         <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
           <AlertDialogContent>
             <AlertDialogHeader>
               <AlertDialogTitle>{t('itemSelector.deleteItem')}</AlertDialogTitle>
               <AlertDialogDescription>
                 {t('itemSelector.deleteItemConfirmation', { item: getItemDisplayName(deleteItem, t) })}
               </AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogFooter>
               <AlertDialogCancel onClick={() => setDeleteItem(null)}>
                 {t('buttons.cancel')}
               </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => {
                    handleDeleteItem(deleteItem);
                    setDeleteItem(null);
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
