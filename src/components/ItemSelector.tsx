
import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Plus, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useItems, FoodItem } from '@/contexts/ItemContext';
import { ItemEditor } from '@/components/ItemEditor';
import { getAllCategories } from '@/utils/unitSystem';
import { cn } from '@/lib/utils';

interface ItemSelectorProps {
  onItemSelect: (item: FoodItem) => void;
  placeholder?: string;
  className?: string;
}

export const ItemSelector = ({ onItemSelect, placeholder = "Search or add item...", className }: ItemSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newItemCategory, setNewItemCategory] = useState('Other');
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
        setShowCreateForm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemSelect = (item: FoodItem) => {
    onItemSelect(item);
    setQuery('');
    setIsOpen(false);
    setShowCreateForm(false);
  };

  const handleCreateNew = () => {
    if (query.trim() && !exactMatch) {
      const newItem = addItem(query, newItemCategory);
      onItemSelect(newItem);
      setQuery('');
      setIsOpen(false);
      setShowCreateForm(false);
      setNewItemCategory('Other');
    }
  };

  const handleShowCreateForm = () => {
    setShowCreateForm(true);
    setNewItemCategory('Other');
  };

  const handleEditItem = (item: FoodItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setIsOpen(false);
    setShowCreateForm(false);
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
    setShowCreateForm(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

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
        <div className="fixed inset-x-0 z-[9999] mt-1 mx-4 bg-white border border-gray-200 rounded-md shadow-2xl max-h-60 overflow-y-auto">
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
            <div className="border-t border-gray-200 bg-white">
              {!showCreateForm ? (
                <div className="p-1">
                  <button
                    onClick={handleShowCreateForm}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded-sm text-green-600 bg-white"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create "{query}"</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 space-y-3 bg-white">
                  <div>
                    <Label htmlFor="category-select" className="text-sm font-medium text-gray-700">
                      Category for "{query}"
                    </Label>
                    <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                      <SelectTrigger id="category-select" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getAllCategories().map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleCreateNew}
                      size="sm" 
                      className="flex-1"
                    >
                      Create Item
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
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
