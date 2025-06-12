
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Plus, Edit, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useItems, FoodItem } from '@/contexts/ItemContext';
import { ItemEditor } from '@/components/ItemEditor';
import { cn } from '@/lib/utils';

interface ItemSelectorProps {
  onItemSelect: (item: FoodItem | null) => void;
  placeholder?: string;
  className?: string;
  selectedItem?: FoodItem | null;
}

export const ItemSelector = ({ 
  onItemSelect, 
  placeholder = "Search or add item...", 
  className,
  selectedItem = null 
}: ItemSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [creatingNewItem, setCreatingNewItem] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const { searchItems, addItem, updateItem } = useItems();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchResults = searchItems(query);
  const exactMatch = searchResults.find(item => 
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

  const handleItemSelect = (item: FoodItem) => {
    onItemSelect(item);
    setQuery('');
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    if (query.trim() && !exactMatch) {
      setCreatingNewItem(true);
      setIsOpen(false);
    }
  };

  const handleQuickCreate = () => {
    if (query.trim() && !exactMatch) {
      const newItem = addItem(query);
      onItemSelect(newItem);
      setQuery('');
      setIsOpen(false);
    }
  };

  const handleEditItem = (item: FoodItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setIsOpen(false);
  };

  const handleSaveEdit = (updates: Partial<FoodItem>) => {
    if (editingItem) {
      updateItem(editingItem.id, updates);
      setEditingItem(null);
    }
  };

  const handleSaveNewItem = (newItemData: Partial<FoodItem>) => {
    if (query.trim()) {
      const newItem = addItem(
        query.trim(),
        newItemData.category || 'Other',
        newItemData.defaultUnit,
        newItemData.availableUnits
      );
      onItemSelect(newItem);
      setQuery('');
      setCreatingNewItem(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setTimeout(updateDropdownPosition, 0);
  };

  const handleClearSelection = () => {
    setQuery('');
    setIsOpen(false);
    onItemSelect(null);
  };

  const displayValue = selectedItem && !query ? selectedItem.name : query;
  const showClearButton = selectedItem && !query;

  if (editingItem) {
    return (
      <div className={className}>
        <ItemEditor
          item={editingItem}
          onSave={handleSaveEdit}
          onCancel={() => setEditingItem(null)}
        />
      </div>
    );
  }

  if (creatingNewItem) {
    // Create a temporary item for the editor
    const tempItem: FoodItem = {
      id: 'temp',
      name: query.trim(),
      category: 'Other',
      defaultUnit: 'piece',
      availableUnits: ['piece'],
      commonQuantities: ['1'],
      createdAt: new Date(),
      usageCount: 0
    };

    return (
      <div className={className}>
        <ItemEditor
          item={tempItem}
          onSave={handleSaveNewItem}
          onCancel={() => {
            setCreatingNewItem(false);
            setQuery('');
          }}
        />
      </div>
    );
  }

  return (
    <>
      <div className={cn("relative", className)} ref={containerRef}>
        <div className="relative">
          <Input
            ref={inputRef}
            value={displayValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            className={cn(
              "pr-16",
              selectedItem && !query && "bg-green-50 border-green-200"
            )}
          />
          <div className="absolute right-0 top-0 h-full flex items-center">
            {showClearButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="h-full px-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-full px-2"
              onClick={() => {
                setIsOpen(!isOpen);
                if (!isOpen) {
                  setTimeout(updateDropdownPosition, 0);
                }
              }}
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </Button>
          </div>
        </div>
      </div>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[100] bg-white border border-gray-200 rounded-md shadow-2xl max-h-60 overflow-y-auto"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
        >
          {searchResults.length > 0 && (
            <div className="p-1">
              {searchResults.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-100 rounded-sm bg-white group"
                >
                  <button
                    onClick={() => handleItemSelect(item)}
                    className="flex-1 flex items-center gap-2 text-left"
                  >
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {item.category}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-gray-600">
                      per {item.defaultUnit}
                    </Badge>
                  </button>
                  <div className="flex items-center gap-2">
                    {item.usageCount > 1 && (
                      <span className="text-xs text-gray-500">
                        Used {item.usageCount}x
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleEditItem(item, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {query.trim() && !exactMatch && (
            <div className="border-t border-gray-200 p-1 bg-white">
              <div className="flex gap-1">
                <button
                  onClick={handleQuickCreate}
                  className="flex-1 flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded-sm text-green-600 bg-white"
                >
                  <Plus className="h-4 w-4" />
                  <span>Quick add "{query}"</span>
                </button>
                <button
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded-sm text-blue-600 bg-white border-l border-gray-200"
                >
                  <Edit className="h-4 w-4" />
                  <span>Custom</span>
                </button>
              </div>
            </div>
          )}

          {searchResults.length === 0 && !query.trim() && (
            <div className="p-4 text-center text-sm text-gray-500 bg-white">
              Start typing to search items...
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};
