import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { CustomStorageArea } from '@/types/household';
import { useTranslation } from 'react-i18next';

interface OnboardingStorageSelectorProps {
  selectedAreas: CustomStorageArea[];
  onChange: (areas: CustomStorageArea[]) => void;
}

const OnboardingStorageSelector = ({ selectedAreas, onChange }: OnboardingStorageSelectorProps) => {
  const { t } = useTranslation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentArea, setCurrentArea] = useState<CustomStorageArea>({
    name: '',
    description: '',
    emoji: '📦',
    type: 'other'
  });

  const storageTypes = [
    { value: 'fridge', label: t('storageArea.types.fridge'), emoji: '🥬', defaultName: t('storageArea.types.fridge') },
    { value: 'freezer', label: t('storageArea.types.freezer'), emoji: '🧊', defaultName: t('storageArea.types.freezer') },
    { value: 'pantry', label: t('storageArea.types.pantry'), emoji: '🏺', defaultName: t('storageArea.types.pantry') },
    { value: 'kitchen_cupboard', label: t('storageArea.types.kitchen_cupboard'), emoji: '🗄️', defaultName: t('storageArea.types.kitchen_cupboard') },
    { value: 'other', label: t('storageArea.types.other'), emoji: '📦', defaultName: 'Storage Area' }
  ] as const;

  const handleAddStorageType = (type: string) => {
    const storageType = storageTypes.find(st => st.value === type);
    if (!storageType) return;

    const newArea: CustomStorageArea = {
      name: storageType.defaultName,
      description: '',
      emoji: storageType.emoji,
      type: type as CustomStorageArea['type']
    };

    setCurrentArea(newArea);
    setEditingIndex(null);
    setIsSheetOpen(true);
  };

  const handleEditArea = (index: number) => {
    setCurrentArea({ ...selectedAreas[index] });
    setEditingIndex(index);
    setIsSheetOpen(true);
  };

  const handleSaveArea = () => {
    if (!currentArea.name.trim()) return;

    const newAreas = [...selectedAreas];
    if (editingIndex !== null) {
      newAreas[editingIndex] = currentArea;
    } else {
      newAreas.push(currentArea);
    }
    
    onChange(newAreas);
    setIsSheetOpen(false);
    resetForm();
  };

  const handleDeleteArea = (index: number) => {
    const newAreas = selectedAreas.filter((_, i) => i !== index);
    onChange(newAreas);
  };

  const resetForm = () => {
    setCurrentArea({
      name: '',
      description: '',
      emoji: '📦',
      type: 'other'
    });
    setEditingIndex(null);
  };

  const handleTypeChange = (type: string) => {
    const storageType = storageTypes.find(st => st.value === type);
    if (storageType) {
      setCurrentArea(prev => ({
        ...prev,
        type: type as CustomStorageArea['type'],
        emoji: storageType.emoji,
        name: prev.name || storageType.defaultName
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Add Buttons */}
      <div className="space-y-3">
        <Label className="text-base font-medium">{t('pages.household.addStorageAreas')}</Label>
        <div className="grid grid-cols-2 gap-3">
          {storageTypes.slice(0, 4).map((type) => (
            <Button
              key={type.value}
              variant="outline"
              className="h-16 flex flex-col items-center justify-center gap-2 border-2 border-dashed hover:border-primary hover:bg-primary/5"
              onClick={() => handleAddStorageType(type.value)}
            >
              <span className="text-xl">{type.emoji}</span>
              <span className="text-sm font-medium">{type.label}</span>
            </Button>
          ))}
        </div>
        
        {/* Other storage type button */}
        <Button
          variant="outline"
          className="w-full h-12 border-2 border-dashed hover:border-primary hover:bg-primary/5"
          onClick={() => handleAddStorageType('other')}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('storageArea.types.other')}
        </Button>
      </div>

      {/* Selected Storage Areas */}
      {selectedAreas.length > 0 && (
        <div className="space-y-3">
          <Label className="text-base font-medium">{t('pages.household.selectedStorageAreas')}</Label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {selectedAreas.map((area, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-lg">{area.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{area.name}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {storageTypes.find(t => t.value === area.type)?.label}
                        </Badge>
                        {area.description && (
                          <span className="text-xs text-muted-foreground truncate">
                            {area.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleEditArea(index)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteArea(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Edit/Add Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <div /> {/* Hidden trigger */}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle>
                  {editingIndex !== null ? t('storageAreaManager.editStorageArea') : t('storageAreaManager.addNewStorageArea')}
                </SheetTitle>
                <SheetDescription>
                  {t('storageArea.createNewDescription')}
                </SheetDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSheetOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Storage Type */}
            <div className="space-y-2">
              <Label htmlFor="storage-type">{t('storageArea.type')}</Label>
              <Select
                value={currentArea.type}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger id="storage-type">
                  <SelectValue placeholder={t('storageArea.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  {storageTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center space-x-2">
                        <span>{type.emoji}</span>
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="storage-name">{t('common.name')}</Label>
              <Input
                id="storage-name"
                placeholder={t('storageArea.namePlaceholder')}
                value={currentArea.name}
                onChange={(e) => setCurrentArea(prev => ({ ...prev, name: e.target.value }))}
                className="h-12"
              />
            </div>

            {/* Emoji */}
            <div className="space-y-2">
              <Label htmlFor="storage-emoji">{t('storageArea.emoji')}</Label>
              <Input
                id="storage-emoji"
                placeholder="📦"
                value={currentArea.emoji}
                onChange={(e) => setCurrentArea(prev => ({ ...prev, emoji: e.target.value || '📦' }))}
                className="h-12"
                maxLength={10}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="storage-description">{t('common.description')} ({t('common.optional')})</Label>
              <Textarea
                id="storage-description"
                placeholder={t('pages.household.descriptionPlaceholder')}
                value={currentArea.description}
                onChange={(e) => setCurrentArea(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-6">
              <Button
                onClick={handleSaveArea}
                disabled={!currentArea.name.trim()}
                className="w-full h-12 bg-primary hover:bg-primary/90"
              >
                {editingIndex !== null ? t('buttons.update') : t('storageArea.createArea')}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setIsSheetOpen(false)}
                className="w-full h-12"
              >
                {t('buttons.cancel')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default OnboardingStorageSelector;
