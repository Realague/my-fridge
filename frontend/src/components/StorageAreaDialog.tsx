import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { StorageAreaType, ITEM_CATEGORIES } from '@/types/enums';
import { getCategoryColor } from '@/utils/itemUtils';
import { CategoryIcon } from '@/utils/categoryIcons';
import { getDefaultCategoriesForStorageType } from '@/utils/categoryStorageMapping';

interface StorageAreaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; emoji: string; type: StorageAreaType; defaultCategories: string[] }) => void;
  mode: 'add' | 'edit';
  initialData?: {
    name: string;
    emoji: string;
    type: StorageAreaType;
    defaultCategories?: string[];
  };
}

const StorageAreaDialog = ({ isOpen, onClose, onSubmit, mode, initialData }: StorageAreaDialogProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📦');
  const [type, setType] = useState<StorageAreaType>(StorageAreaType.OTHER);
  const [defaultCategories, setDefaultCategories] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setName(initialData.name);
        setEmoji(initialData.emoji);
        setType(initialData.type);
        setDefaultCategories(
          initialData.defaultCategories?.length
            ? initialData.defaultCategories
            : getDefaultCategoriesForStorageType(initialData.type)
        );
      } else {
        setName('');
        setEmoji('📦');
        setType(StorageAreaType.OTHER);
      }
    }
  }, [isOpen, mode, initialData]);

  useEffect(() => {
    if (isOpen && mode === 'add') {
      setDefaultCategories(getDefaultCategoriesForStorageType(type));
    }
  }, [type, isOpen, mode]);

  const toggleCategory = (category: string) => {
    setDefaultCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      return;
    }
    onSubmit({ name: name.trim(), emoji, type, defaultCategories });
  };

  const handleClose = () => {
    setName('');
    setEmoji('📦');
    setType(StorageAreaType.OTHER);
    setDefaultCategories([]);
    onClose();
  };

  const title = mode === 'add' 
    ? t('storageAreaManager.addNewStorageArea')
    : t('storageAreaManager.editStorageArea');

  const submitButtonText = mode === 'add'
    ? t('storageArea.addStorageArea')
    : t('storageAreaManager.updateStorageArea');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium mb-2">{t('forms.name')}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('storageAreaManager.namePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{t('storageAreaManager.emoji')}</label>
            <Input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="📦"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{t('storageArea.type')}</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value as StorageAreaType)}
              className="w-full p-2 border rounded-md bg-background"
            >
              <option value={StorageAreaType.FRIDGE}>{t('storageArea.types.fridge')}</option>
              <option value={StorageAreaType.FREEZER}>{t('storageArea.types.freezer')}</option>
              <option value={StorageAreaType.PANTRY}>{t('storageArea.types.pantry')}</option>
              <option value={StorageAreaType.KITCHEN_CUPBOARD}>{t('storageArea.types.kitchen_cupboard')}</option>
              <option value={StorageAreaType.OTHER}>{t('storageArea.types.other')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{t('storageArea.defaultCategories')}</label>
            <p className="text-xs text-muted-foreground mb-2">{t('storageArea.selectCategories')}</p>
            <div className="flex flex-wrap gap-2">
              {ITEM_CATEGORIES.map((category) => {
                const isSelected = defaultCategories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="transition-all"
                  >
                    <Badge
                      className={`cursor-pointer transition-all inline-flex items-center gap-1 ${
                        isSelected
                          ? getCategoryColor(category)
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      <CategoryIcon category={category} className="h-3.5 w-3.5" />
                      {t(`items.categories.${category}`)}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              variant="outline" 
              onClick={handleClose}
            >
              {t('buttons.cancel')}
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="flex-1"
              variant="green"
            >
              {submitButtonText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StorageAreaDialog;
