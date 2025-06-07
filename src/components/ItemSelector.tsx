
import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useItems, FoodItem } from '@/contexts/ItemContext';
import { cn } from '@/lib/utils';

interface ItemSelectorProps {
  onItemSelect: (item: FoodItem) => void;
  placeholder?: string;
  className?: string;
}

export const ItemSelector = ({ onItemSelect, placeholder = "Search or add item...", className }: ItemSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { searchItems, addItem } = useItems();
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="pr-8"
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </Button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {searchResults.length > 0 && (
            <div className="p-1">
              {searchResults.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemSelect(item)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-100 rounded-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {item.category}
                    </Badge>
                  </div>
                  {item.usageCount > 1 && (
                    <span className="text-xs text-gray-500">
                      Used {item.usageCount}x
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {query.trim() && !exactMatch && (
            <div className="border-t border-gray-200 p-1">
              <button
                onClick={handleCreateNew}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded-sm text-green-600"
              >
                <Plus className="h-4 w-4" />
                <span>Create "{query}"</span>
              </button>
            </div>
          )}

          {searchResults.length === 0 && !query.trim() && (
            <div className="p-4 text-center text-sm text-gray-500">
              Start typing to search items...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
