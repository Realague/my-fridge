import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { StorageAreaType } from '@/types/enums';

interface StorageAreaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; emoji: string; type: StorageAreaType }) => void;
  mode: 'add' | 'edit';
  initialData?: {
    name: string;
    emoji: string;
    type: StorageAreaType;
  };
}

const StorageAreaDialog = ({ isOpen, onClose, onSubmit, mode, initialData }: StorageAreaDialogProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📦');
  const [type, setType] = useState<StorageAreaType>(StorageAreaType.OTHER);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setName(initialData.name);
        setEmoji(initialData.emoji);
        setType(initialData.type);
      } else {
        setName('');
        setEmoji('📦');
        setType(StorageAreaType.OTHER);
      }
    }
  }, [isOpen, mode, initialData]);

  const handleSubmit = () => {
    if (!name.trim()) {
      return;
    }
    onSubmit({ name: name.trim(), emoji, type });
  };

  const handleClose = () => {
    setName('');
    setEmoji('📦');
    setType(StorageAreaType.OTHER);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
              className="w-full p-2 border rounded-md"
            >
              <option value={StorageAreaType.FRIDGE}>{t('storageArea.types.fridge')}</option>
              <option value={StorageAreaType.FREEZER}>{t('storageArea.types.freezer')}</option>
              <option value={StorageAreaType.PANTRY}>{t('storageArea.types.pantry')}</option>
              <option value={StorageAreaType.OTHER}>{t('storageArea.types.other')}</option>
            </select>
          </div>
          <div className="flex gap-2">
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
