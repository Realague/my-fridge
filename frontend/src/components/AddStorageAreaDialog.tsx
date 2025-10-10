
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCurrentHouseholdStorageAreas } from '@/stores/storageAreaStore';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { StorageAreaType } from '@/types/enums';

interface AddStorageAreaDialogProps {
  trigger?: React.ReactNode;
}

const AddStorageAreaDialog = ({ trigger }: AddStorageAreaDialogProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('');
  const [emoji, setEmoji] = useState('');
  
  const { user } = useAuthStore();
  const { createStorageArea, loading } = useCurrentHouseholdStorageAreas(user?.selectedHouseholdId);

  const storageAreaTypes = [
    { value: StorageAreaType.FRIDGE, label: t('storageArea.types.fridge'), emoji: '🥬' },
    { value: StorageAreaType.FREEZER, label: t('storageArea.types.freezer'), emoji: '🧊' },
    { value: StorageAreaType.PANTRY, label: t('storageArea.types.pantry'), emoji: '🏺' },
    { value: StorageAreaType.KITCHEN_CUPBOARD, label: t('storageArea.types.kitchenCupboard'), emoji: '🗄️' },
    { value: StorageAreaType.OTHER, label: t('storageArea.types.other'), emoji: '📦' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !type) {
      return;
    }

    try {
      await createStorageArea({
        name: name.trim(),
        type: type as StorageAreaType,
        emoji: emoji || storageAreaTypes.find(t => t.value === type)?.emoji || '📦',
      });
      
      // Show success toast
      toast.success(t("messages.success.storageAreaCreated"), {
        description: t("messages.success.storageAreaCreatedDescription", { name: name.trim() }),
      });
      
      // Reset form and close dialog
      setName('');
      setType('');
      setEmoji('');
      setOpen(false);
    } catch (error) {
      console.error('Failed to create storage area:', error);
      
      // Show error toast
      const message = error instanceof Error ? error.message : t("messages.error.failedToCreateStorageArea");
      toast.error(t("messages.error.creationFailed"), {
        description: message,
      });
    }
  };

  const handleTypeChange = (value: string) => {
    setType(value);
    // Auto-set emoji based on type if no custom emoji is set
    if (!emoji) {
      const selectedType = storageAreaTypes.find(t => t.value === value);
      if (selectedType) {
        setEmoji(selectedType.emoji);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="green"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('storageArea.addArea')}
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('storageArea.addStorageArea')}</DialogTitle>
            <DialogDescription>
              {t('storageArea.createNewDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="storage-name">{t('forms.name')}</Label>
              <Input
                id="storage-name"
                placeholder={t('storageArea.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="storage-type">{t('storageArea.type')}</Label>
              <Select value={type} onValueChange={handleTypeChange} required>
                <SelectTrigger>
                  <SelectValue placeholder={t('storageArea.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  {storageAreaTypes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <span>{option.emoji}</span>
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="storage-emoji">{t('storageArea.emoji')}</Label>
              <Input
                id="storage-emoji"
                placeholder="🥬"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                maxLength={10}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t('buttons.cancel')}
            </Button>
            <Button
              type="submit"
              variant="green"
              disabled={!name.trim() || !type || loading}
            >
              {loading ? t('storageArea.creating') : t('storageArea.createArea')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStorageAreaDialog;
