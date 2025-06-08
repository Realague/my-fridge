
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Check, Plus } from 'lucide-react';
import { FoodItem } from '@/contexts/ItemContext';
import { getUnitsForCategory, getAllCategories } from '@/utils/unitSystem';

interface ItemEditorProps {
  item: FoodItem;
  onSave: (updatedItem: Partial<FoodItem>) => void;
  onCancel: () => void;
}

export const ItemEditor = ({ item, onSave, onCancel }: ItemEditorProps) => {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [defaultUnit, setDefaultUnit] = useState(item.defaultUnit);
  const [availableUnits, setAvailableUnits] = useState<string[]>(item.availableUnits);
  const [newUnit, setNewUnit] = useState('');

  const categoryUnits = getUnitsForCategory(category);

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    const units = getUnitsForCategory(newCategory);
    setDefaultUnit(units.defaultUnit);
    setAvailableUnits(units.availableUnits);
  };

  const addCustomUnit = () => {
    if (newUnit.trim() && !availableUnits.includes(newUnit.trim())) {
      setAvailableUnits([...availableUnits, newUnit.trim()]);
      setNewUnit('');
    }
  };

  const removeUnit = (unitToRemove: string) => {
    if (availableUnits.length > 1 && unitToRemove !== defaultUnit) {
      setAvailableUnits(availableUnits.filter(unit => unit !== unitToRemove));
    }
  };

  const handleSave = () => {
    onSave({
      name: name.trim(),
      category,
      defaultUnit,
      availableUnits
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">Edit Item</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Item name"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Category</label>
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getAllCategories().map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Default Unit</label>
          <Select value={defaultUnit} onValueChange={setDefaultUnit}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableUnits.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Available Units</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {availableUnits.map((unit) => (
              <Badge
                key={unit}
                variant={unit === defaultUnit ? "default" : "secondary"}
                className="flex items-center gap-1"
              >
                {unit}
                {unit === defaultUnit && <span className="text-xs">(default)</span>}
                {availableUnits.length > 1 && unit !== defaultUnit && (
                  <button
                    onClick={() => removeUnit(unit)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Input
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="Add custom unit"
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && addCustomUnit()}
            />
            <Button
              type="button"
              onClick={addCustomUnit}
              size="sm"
              variant="outline"
              disabled={!newUnit.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} className="flex-1">
            <Check className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
