import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { StorageArea } from '@/types/household';
import { useTranslation } from 'react-i18next';
import { StorageAreaType } from '@/types/enums';

interface OnboardingStorageSelectorProps {
  selectedAreas: StorageArea[];
  onAreasChange: (areas: StorageArea[]) => void;
  className?: string;
}

interface StorageTypeOption {
  id: StorageAreaType;
  name: string;
  emoji: string;
  description: string;
  suggestedNames: string[];
}

const emojiOptions = ['🥬', '🧊', '🏺', '🗄️', '📦', '🛒', '🍎', '🥖', '🧄', '🫙', '🥫', '🍯'];

export const OnboardingStorageSelector = ({ 
  selectedAreas, 
  onAreasChange, 
  className = '' 
}: OnboardingStorageSelectorProps) => {
  const { t } = useTranslation();
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [editingArea, setEditingArea] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<StorageAreaType>(StorageAreaType.FRIDGE);
  const [areaName, setAreaName] = useState('');
  const [areaDescription, setAreaDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🥬');

  const storageTypeOptions: StorageTypeOption[] = [
    { 
      id: StorageAreaType.FRIDGE, 
      name: t('storageArea.types.fridge'),
      emoji: '🥬', 
      description: t('storageArea.mainFridgeDescription'),
      suggestedNames: [t('storageArea.mainFridge'), t('storageArea.kitchenFridge'), t('storageArea.coldStorage')]
    },
    { 
      id: StorageAreaType.FREEZER, 
      name: t('storageArea.types.freezer'), 
      emoji: '🧊', 
      description: t('storageArea.mainFreezerDescription'),
      suggestedNames: [t('storageArea.mainFreezer'), t('storageArea.chestFreezer'), t('storageArea.iceBox')]
    },
    { 
      id: StorageAreaType.PANTRY, 
      name: t('storageArea.types.pantry'), 
      emoji: '🏺', 
      description: t('storageArea.mainPantryDescription'),
      suggestedNames: [t('storageArea.mainPantry'), t('storageArea.walkInPantry'), t('storageArea.foodCloset')]
    },
    {
      id: StorageAreaType.KITCHEN_CUPBOARD, 
      name: t('storageArea.types.kitchen_cupboard'), 
      emoji: '🗄️', 
      description: t('storageArea.mainKitchenCupboardDescription'),
      suggestedNames: [t('storageArea.upperCabinets'), t('storageArea.lowerCabinets'), t('storageArea.spiceCabinet')]
    },
/*{ 
      id: 'other', 
      name: 'Other Storage', 
      emoji: '📦', 
      description: 'Custom storage area',
      suggestedNames: ['Basement Storage', 'Garage Shelf', 'Wine Cellar']
    }*/
  ];

  const resetForm = () => {
    setAreaName('');
    setAreaDescription('');
    setSelectedEmoji('🥬');
    setSelectedType(StorageAreaType.FRIDGE);
  };

  const handleAddArea = () => {
    if (!areaName.trim()) return;

    const newArea: StorageArea = {
      name: areaName.trim(),
      description: areaDescription.trim() || undefined,
      emoji: selectedEmoji,
      type: selectedType
    };

    if (editingArea !== null) {
      const updatedAreas = [...selectedAreas];
      updatedAreas[editingArea] = newArea;
      onAreasChange(updatedAreas);
      setEditingArea(null);
    } else {
      onAreasChange([...selectedAreas, newArea]);
    }

    resetForm();
    setIsAddingArea(false);
  };

  const handleEditArea = (index: number) => {
    const area = selectedAreas[index];
    setAreaName(area.name);
    setAreaDescription(area.description || '');
    setSelectedEmoji(area.emoji);
    setSelectedType(area.type);
    setEditingArea(index);
    setIsAddingArea(true);
  };

  const handleRemoveArea = (index: number) => {
    const updatedAreas = selectedAreas.filter((_, i) => i !== index);
    onAreasChange(updatedAreas);
  };

  const handleQuickAdd = (typeOption: StorageTypeOption) => {
    const existingCount = selectedAreas.filter(area => area.type === typeOption.id).length;
    const suggestedName = typeOption.suggestedNames[existingCount] || `${typeOption.name} ${existingCount + 1}`;
    
    setSelectedType(typeOption.id);
    setAreaName(suggestedName);
    setAreaDescription(typeOption.description);
    setSelectedEmoji(typeOption.emoji);
    setIsAddingArea(true);
  };

  const getTypeStats = () => {
    return storageTypeOptions.map(type => ({
      ...type,
      count: selectedAreas.filter(area => area.type === type.id).length
    }));
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Quick Add Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {storageTypeOptions.slice(0, 4).map((typeOption) => {
          const count = selectedAreas.filter(area => area.type === typeOption.id).length;
          return (
            <Button
              key={typeOption.id}
              onClick={() => handleQuickAdd(typeOption)}
              variant="outline"
              className="h-20 p-4 flex flex-col items-center justify-center gap-1"
            >
              <div className="text-2xl">{typeOption.emoji}</div>
              <div className="text-xs font-medium text-center">{typeOption.name}</div>
              {count > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Selected Areas List */}
      {selectedAreas.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Selected Storage Areas ({selectedAreas.length})</Label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {selectedAreas.map((area, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                <div className="flex items-center gap-3">
                  <div className="text-lg">{area.emoji}</div>
                  <div>
                    <div className="font-medium text-sm">{area.name}</div>
                    {area.description && (
                      <div className="text-xs text-muted-foreground">{area.description}</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditArea(index)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="deleteTrash"
                    onClick={() => handleRemoveArea(index)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Area Sheet */}
      <Sheet open={isAddingArea} onOpenChange={setIsAddingArea}>
        <SheetTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full flex items-center gap-2"
            onClick={() => {
              resetForm();
              setEditingArea(null);
            }}
          >
            <Plus className="h-4 w-4" />
            {t('storageArea.addCustomStorageArea')}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[90vh]">
          <SheetHeader>
            <SheetTitle>
              {editingArea !== null ? t('storageArea.editStorageArea') : t('storageArea.addStorageArea')}
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 mt-6">
            {/* Storage Type Selection */}
            <div className="space-y-3">
              <Label>{t('storageArea.type')}</Label>
              <div className="grid grid-cols-3 gap-2">
                {storageTypeOptions.map((type) => (
                  <Button
                    key={type.id}
                    variant={selectedType === type.id ? "green" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedType(type.id);
                      setSelectedEmoji(type.emoji);
                      if (!areaName) {
                        const existingCount = selectedAreas.filter(area => area.type === type.id).length;
                        setAreaName(type.suggestedNames[existingCount] || `${type.name} ${existingCount + 1}`);
                      }
                      if (!areaDescription) {
                        setAreaDescription(type.description);
                      }
                    }}
                    className="flex flex-col gap-1 h-14"
                  >
                    <div className="text-lg">{type.emoji}</div>
                    <div className="text-xs">{type.name.split(' ')[0]}</div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="area-name">{t('storageArea.name')} *</Label>
              <Input
                id="area-name"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder={t('storageArea.namePlaceholder')}
                className="h-12"
              />
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <Label htmlFor="area-description">{t('storageArea.description')}</Label>
              <Textarea
                id="area-description"
                value={areaDescription}
                onChange={(e) => setAreaDescription(e.target.value)}
                placeholder={t('storageArea.descriptionPlaceholder')}
                rows={2}
              />
            </div>

            {/* Emoji Selection */}
            <div className="space-y-3">
              <Label>{t('storageArea.chooseIcon')}</Label>
              <div className="grid grid-cols-6 gap-2">
                {emojiOptions.map((emoji) => (
                  <Button
                    key={emoji}
                    variant={selectedEmoji === emoji ? "green" : "outline"}
                    size="sm"
                    onClick={() => setSelectedEmoji(emoji)}
                    className="h-12 text-xl"
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingArea(false);
                  setEditingArea(null);
                  resetForm();
                }}
                className="flex-1"
              >
                {t('buttons.cancel')}
              </Button>
              <Button
                variant="green"
                onClick={handleAddArea}
                disabled={!areaName.trim()}
                className="flex-1"
              >
                {editingArea !== null ? t('buttons.update') : t('buttons.add')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};