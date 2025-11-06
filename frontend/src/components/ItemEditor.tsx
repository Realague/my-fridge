import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { X, Trash2 } from 'lucide-react';
import { Item, itemService } from '@/services/itemService';
import { getUnitsForCategory, getUnitDisplayName } from '@/utils/unitSystem';
import { ITEM_CATEGORIES, UNITS } from '@/types/enums';
import { useTranslation } from 'react-i18next';
import { useHouseholdStore } from '@/stores/householdStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { getItemDisplayName } from '@/utils/itemUtils';
import { ImageUpload } from '@/components/ImageUpload';

interface ItemEditorProps {
  item: Item;
  onSave: (updatedItem: Partial<Item>) => void;
  onCancel: () => void;
  onDelete?: (item: Item) => void;
}

export const ItemEditor = ({ item, onSave, onCancel, onDelete }: ItemEditorProps) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { selectedHouseholdId, isCurrentUserAdmin } = useHouseholdStore();
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [defaultUnit, setDefaultUnit] = useState(item.defaultUnit);
  const [imageUrl, setImageUrl] = useState<string | null>(item.imageUrl || null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  
  // Ensure availableUnits is always an array (handle cases where it might be a string from DB)
  const initialAvailableUnits = React.useMemo(() => {
    if (Array.isArray(item.availableUnits)) {
      return item.availableUnits;
    }
    // If it's a string (JSON), try to parse it
    if (typeof item.availableUnits === 'string') {
      try {
        const parsed = JSON.parse(item.availableUnits);
        return Array.isArray(parsed) ? parsed : [item.defaultUnit];
      } catch {
        return [item.defaultUnit];
      }
    }
    // Fallback to default unit
    return [item.defaultUnit];
  }, [item.availableUnits, item.defaultUnit]);
  
  const [availableUnits, setAvailableUnits] = useState<string[]>(initialAvailableUnits);

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    const categoryUnits = getUnitsForCategory(newCategory);
    setDefaultUnit(categoryUnits.defaultUnit);
    setAvailableUnits(categoryUnits.availableUnits);
  };

  const handleAddUnit = (unit: string) => {
    if (unit && !availableUnits.includes(unit)) {
      setAvailableUnits([...availableUnits, unit]);
    }
  };

  const handleRemoveUnit = (unit: string) => {
    if (availableUnits.length > 1) {
      const newUnits = availableUnits.filter(u => u !== unit);
      setAvailableUnits(newUnits);
      if (defaultUnit === unit && newUnits.length > 0) {
        setDefaultUnit(newUnits[0]);
      }
    }
  };

  const handleSave = () => {
    onSave({
      name: name.trim(),
      category,
      defaultUnit,
      availableUnits,
      imageUrl: imageUrl,
      // Pass the selected file for deferred upload handling via an extra property onSave 
      ...(selectedImageFile ? { _selectedImageFile: selectedImageFile } : {}),
    });
  };

  const handleDelete = async () => {
    if (!user || !selectedHouseholdId || !item.id) return;
    
    onDelete?.(item);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pb-4">
          <DialogTitle>
            {item.id ? t('itemEditor.editItem') : t('itemEditor.createNewItem')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <ImageUpload
            currentImageUrl={imageUrl}
            onImageUpload={setImageUrl}
            onImageRemove={() => { setImageUrl(null); setSelectedImageFile(null); }}
            folder="items"
            label={t('itemEditor.itemImage')}
            description={t('itemEditor.itemImageDescription')}
            deferUpload
            onImageSelected={(file) => setSelectedImageFile(file)}
          />

          <div>
            <Label htmlFor="item-name">{t('forms.name')}</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('itemEditor.itemNamePlaceholder')}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="item-category">{t('forms.category')}</Label>
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_CATEGORIES.map((itemCategory) => (
                  <SelectItem key={itemCategory} value={itemCategory}>
                    {t(`items.categories.${itemCategory}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="default-unit">{t('itemEditor.defaultUnit')}</Label>
            <Select value={defaultUnit} onValueChange={setDefaultUnit}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableUnits.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {t(`units.${getUnitDisplayName(unit)}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>{t('itemEditor.availableUnits')}</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableUnits.map((unit) => (
                <Badge
                  key={unit}
                  variant={unit === defaultUnit ? "default" : "secondary"}
                  className="cursor-pointer"
                >
                  {getUnitDisplayName(unit)}
                  {availableUnits.length > 1 && (
                    <button
                      onClick={() => handleRemoveUnit(unit)}
                      className="ml-1 hover:bg-red-100 rounded"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
            
            <div className="mt-2">
              <Select onValueChange={handleAddUnit}>
                <SelectTrigger>
                  <SelectValue placeholder={t('itemEditor.addUnit')} />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.filter(unit => !availableUnits.includes(unit)).map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {t(`units.${getUnitDisplayName(unit)}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between pt-4 border-t">
          <div>
            {item.id && item.householdId && isCurrentUserAdmin() && onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="delete" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('buttons.delete')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('itemSelector.deleteItem')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('itemSelector.deleteItemConfirmation', { item: getItemDisplayName(item, t) })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('buttons.cancel')}</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {t('buttons.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              {t('buttons.cancel')}
            </Button>
            <Button variant="green" onClick={handleSave} disabled={!name.trim()}>
              {item.id ? t('buttons.update') : t('buttons.create')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
