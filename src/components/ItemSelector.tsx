
import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Plus, Edit, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useItems, FoodItem } from '@/contexts/ItemContext';
import { ItemEditor } from '@/components/ItemEditor';
import { cn } from '@/lib/utils';

interface ItemSelectorProps {
  onItemSelect: (item: FoodItem) => void;
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
  const { searchItems, addItem, updateItem } = useItems();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchResults = searchItems(query);
  const exactMatch = searchResults.find(item => 
    item.name.toLowerCase() === query.toLowerCase()
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemSelect = (item: FoodItem) => {
    onItemSelect(item);
    setQuery('');
    setIsOpen(false);
  };

  const handleCreateNew = () => {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleClearSelection = () => {
    setQuery('');
    setIsOpen(false);
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

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
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
            onClick={() => setIsOpen(!isOpen)}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute inset-x-0 z-[60] mt-1 bg-white border border-gray-200 rounded-md shadow-2xl max-h-60 overflow-y-auto">
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
              <button
                onClick={handleCreateNew}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded-sm text-green-600 bg-white"
              >
                <Plus className="h-4 w-4" />
                <span>Create "{query}"</span>
              </button>
            </div>
          )}

          {searchResults.length === 0 && !query.trim() && (
            <div className="p-4 text-center text-sm text-gray-500 bg-white">
              Start typing to search items...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
