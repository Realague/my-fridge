import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { StorageAreaType, ITEM_CATEGORIES } from '@/types/enums';
import { getCategoryColor } from '@/utils/itemUtils';
import { CategoryIcon } from '@/utils/categoryIcons';
import { StorageAreaIcon } from '@/utils/storageAreaIcons';
import { getDefaultCategoriesForStorageType } from '@/utils/categoryStorageMapping';

const STORAGE_AREA_TYPE_OPTIONS: StorageAreaType[] = [
  StorageAreaType.FRIDGE,
  StorageAreaType.FREEZER,
  StorageAreaType.PANTRY,
  StorageAreaType.KITCHEN_CUPBOARD,
  StorageAreaType.OTHER,
];

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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleFormSubmit} className="space-y-4 overflow-y-auto flex-1 px-1 -mx-1 py-1 -my-1">
          <div>
            <label htmlFor="storage-area-name" className="block text-sm font-medium mb-2">{t('forms.name')}</label>
            <Input
              id="storage-area-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('storageAreaManager.namePlaceholder')}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="storage-area-type" className="block text-sm font-medium mb-2">{t('storageArea.type')}</label>
            <Select value={type} onValueChange={(value) => setType(value as StorageAreaType)}>
              <SelectTrigger id="storage-area-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STORAGE_AREA_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    <span className="flex items-center gap-2">
                      <StorageAreaIcon type={option} className="h-4 w-4 shrink-0" />
                      {t(`storageArea.types.${option}`)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              type="button"
              className="flex-1"
              variant="outline"
              onClick={handleClose}
            >
              {t('buttons.cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              variant="green"
              disabled={!name.trim()}
            >
              {submitButtonText}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StorageAreaDialog;
