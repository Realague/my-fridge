import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Plus, Edit, X, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { itemService, Item } from '@/services/itemService';
import { useAuthStore } from '@/stores/authStore';
import { useHouseholdStore } from '@/stores/householdStore';
import { ItemEditor } from '@/components/ItemEditor';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { z } from 'zod';

const itemNameSchema = z.string()
  .trim()
  .min(2, { message: "Item name must be at least 2 characters." })
  .regex(/^[a-zA-Z ]+$/, { message: "Item name can only contain letters and spaces." });

interface ItemSelectorProps {
  onItemSelect: (item: Item | null) => void;
  placeholder?: string;
  className?: string;
  selectedItem?: Item | null;
}

export const ItemSelector = ({ 
  onItemSelect, 
  placeholder = "Search or add item...", 
  className,
  selectedItem = null 
}: ItemSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [creatingNewItem, setCreatingNewItem] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [apiResults, setApiResults] = useState<Item[]>([]);
  const [householdItems, setHouseholdItems] = useState<Item[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [hasLoadedHouseholdItems, setHasLoadedHouseholdItems] = useState(false);

  const { user, isAuthenticated } = useAuthStore();
  const { selectedHouseholdId } = useHouseholdStore();
  const userRef = useRef(user);
  const isAuthenticatedRef = useRef(isAuthenticated);

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
      console.log('ItemSelector: Skipping household items load:', { 
        hasUser: !!user, 
        isAuthenticated, 
        hasHouseholdId: !!selectedHouseholdId, 
        hasLoaded: hasLoadedHouseholdItems 
      });
      return;
    }

    // Check if we have a valid token
    const token = localStorage.getItem('google_token');
    if (!token) {
      console.warn('ItemSelector: No Google token found, skipping household items load');
      return;
    }
    
    console.log('ItemSelector: Loading household items on demand for household:', selectedHouseholdId);

    try {
      setApiLoading(true);
      const items = await itemService.getItemsByHousehold(selectedHouseholdId);
      console.log('ItemSelector: Loaded household items:', items.length);
      setHouseholdItems(items);
      setApiResults(items);
      householdItemsRef.current = items;
      setHasLoadedHouseholdItems(true);
    } catch (error) {
      console.error('ItemSelector: Failed to load household items:', error);
      // Check if it's an auth error
      if (error instanceof Error && error.message.includes('Authentication')) {
        toast.error('Please log in again to access items');
      } else {
        toast.error('Failed to load items. Please try again.');
      }
      setHouseholdItems([]);
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
    setHouseholdItems([]);
    householdItemsRef.current = [];
  }, [selectedHouseholdId]);

  // Debounced search effect with proper cleanup
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    if (query.trim()) {
      // Only search if query is different from last search
      if (query !== lastSearchQueryRef.current) {
        const timeout = setTimeout(async () => {
          if (!userRef.current || !isAuthenticatedRef.current || !query.trim()) {
            console.log('Skipping search:', { 
              hasUser: !!userRef.current, 
              isAuthenticated: isAuthenticatedRef.current, 
              hasQuery: !!query.trim() 
            });
            return;
          }

          // Check if we have a valid token
          const token = localStorage.getItem('google_token');
          if (!token) {
            console.warn('No Google token found, skipping search');
            toast.error('Please log in to search items');
            return;
          }
          
          console.log('Using Google token for search:', token.substring(0, 50) + '...');

          setApiLoading(true);
          
          try {
            console.log('Searching items with query:', query);
            const response = await itemService.searchItems({
              search: query,
              limit: 10,
            });
            console.log('Search results:', response.items.length, 'items');
            
            setApiResults(response.items);
            setLastSearchQuery(query);
            lastSearchQueryRef.current = query;
          } catch (error) {
            console.error('Failed to search API items:', error);
            // Check if it's an auth error
            if (error instanceof Error && error.message.includes('Authentication')) {
              toast.error('Please log in again to search items');
            } else {
              toast.error('Failed to search items');
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
      setLastSearchQuery('');
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

  const filteredResults = query.trim() 
    ? apiResults.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase())
      )
    : apiResults;

  const exactMatch = filteredResults.find(item => 
    item.name.toLowerCase() === query.toLowerCase()
  );

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
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
        updateDropdownPosition();
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
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
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
        toast.success(`Added new item: "${validationResult.data}"`);
        // Refresh the household items cache
        await refreshHouseholdItems();
        return;
      }
      
      toast.error('Please select a household first');
    } catch (error) {
      console.error('Failed to create item:', error);
      toast.error('Failed to create item');
    }
  };

  const handleEditItem = (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setIsOpen(false);
  };

  // Refresh household items cache
  const refreshHouseholdItems = async () => {
    if (!user || !selectedHouseholdId) return;
    
    try {
      const items = await itemService.getItemsByHousehold(selectedHouseholdId);
      setHouseholdItems(items);
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
        await itemService.updateItem(editingItem.id, {
          name: updates.name,
          category: updates.category,
          defaultUnit: updates.defaultUnit,
          availableUnits: updates.availableUnits,
        }, selectedHouseholdId);
        toast.success('Item updated successfully');
        // Refresh the household items cache
        await refreshHouseholdItems();
      }
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to update item:', error);
      toast.error('Failed to update item');
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
        const newApiItem = await itemService.createItem({
          name: newName,
          category: newItemData.category || 'other',
          defaultUnit: newItemData.defaultUnit,
          availableUnits: newItemData.availableUnits,
          householdId: selectedHouseholdId,
        });
        
        onItemSelect(newApiItem);
        setQuery('');
        setCreatingNewItem(false);
        toast.success(`Added new item: "${newName}"`);
        // Refresh the household items cache
        await refreshHouseholdItems();
        return;
      }
      
      toast.error('Please select a household first');
    } catch (error) {
      console.error('Failed to create item:', error);
      toast.error('Failed to create item');
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

  const displayValue = selectedItem && !query ? selectedItem.name : query;
  const showClearButton = selectedItem && !query;

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'vegetables': 'bg-green-100 text-green-800',
      'fruits': 'bg-orange-100 text-orange-800',
      'meat': 'bg-red-100 text-red-800',
      'dairy': 'bg-blue-100 text-blue-800',
      'grains': 'bg-yellow-100 text-yellow-800',
      'spices': 'bg-purple-100 text-purple-800',
      'beverages': 'bg-cyan-100 text-cyan-800',
      'snacks': 'bg-pink-100 text-pink-800',
      'condiments': 'bg-indigo-100 text-indigo-800',
      'frozen': 'bg-blue-200 text-blue-900',
      'canned': 'bg-gray-100 text-gray-800',
      'bakery': 'bg-orange-200 text-orange-900',
      'household': 'bg-teal-100 text-teal-800',
      'personal': 'bg-pink-200 text-pink-900',
      'other': 'bg-gray-100 text-gray-700'
    };
    return colors[category.toLowerCase()] || colors['other'];
  };

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
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleInputFocus}
            className="h-6 w-6 p-0 hover:bg-gray-100"
          >
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </Button>
        </div>
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            minWidth: dropdownPosition.width
          }}
        >

          {apiLoading && (
            <div className="flex items-center justify-center p-4 text-sm text-gray-500 bg-white">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Searching...
            </div>
          )}

          {!apiLoading && query.trim() && !exactMatch && (
            <div className="border-b border-gray-100 bg-gray-50">
              <Button
                type="button"
                variant="ghost"
                onClick={handleQuickCreate}
                className="w-full justify-start p-3 h-auto text-left hover:bg-gray-100"
              >
                <Plus className="h-4 w-4 mr-2 text-green-600" />
                <div>
                  <div className="font-medium">Add "{query}"</div>
                  <div className="text-xs text-gray-500">Quick add with default settings</div>
                </div>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleCreateNew}
                className="w-full justify-start p-3 h-auto text-left hover:bg-gray-100 border-t border-gray-200"
              >
                <Edit className="h-4 w-4 mr-2 text-blue-600" />
                <div>
                  <div className="font-medium">Create "{query}" with details</div>
                  <div className="text-xs text-gray-500">Set category, units, and other options</div>
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
                  className="group flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer rounded transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.name}</div>
                      <div className="flex items-center gap-2">
                        <Badge className={getCategoryColor(item.category)}>
                          {item.category}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {item.householdId ? 'Household' : 'Global'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {item.householdId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleEditItem(item, e)}
                      className="h-6 w-6 p-0 opacity-30 group-hover:opacity-100 hover:bg-gray-200 transition-opacity"
                      title="Edit item"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {filteredResults.length === 0 && !query.trim() && !hasLoadedHouseholdItems && (
            <div 
              className="p-4 text-center text-sm text-gray-500 bg-white cursor-pointer hover:bg-gray-50"
              onClick={() => loadHouseholdItemsOnDemand()}
            >
              Click to load your household items...
            </div>
          )}
          
          {filteredResults.length === 0 && !query.trim() && hasLoadedHouseholdItems && (
            <div className="p-4 text-center text-sm text-gray-500 bg-white">
              Start typing to search items...
            </div>
          )}

          {filteredResults.length === 0 && query.trim() && !apiLoading && (
            <div className="p-4 text-center text-sm text-gray-500 bg-white">
              No items found. Use the options above to add a new one.
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
    </div>
  );
};
