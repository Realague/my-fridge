import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useCurrentHouseholdStorageAreas } from '@/stores/storageAreaStore';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { StorageAreaType } from '@/types/enums';
import StorageAreaDialog from './StorageAreaDialog';

interface AddStorageAreaDialogProps {
  trigger?: React.ReactNode;
}

const AddStorageAreaDialog = ({ trigger }: AddStorageAreaDialogProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const { user } = useAuthStore();
  const { createStorageArea } = useCurrentHouseholdStorageAreas(user?.selectedHouseholdId);

  const handleSubmit = async (data: { name: string; emoji: string; type: StorageAreaType; defaultCategories: string[] }) => {
    try {
      await createStorageArea({
        name: data.name,
        emoji: data.emoji,
        type: data.type,
        defaultCategories: data.defaultCategories,
      });

      toast.success(t("messages.success.storageAreaCreated"), {
        description: t("messages.success.storageAreaCreatedDescription", { name: data.name }),
      });

      setOpen(false);
    } catch (error) {
      console.error('Failed to create storage area:', error);
      const message = error instanceof Error ? error.message : t("messages.error.failedToCreateStorageArea");
      toast.error(t("messages.error.creationFailed"), {
        description: message,
      });
    }
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button
          variant="green"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t('storageArea.addArea')}</span>
        </Button>
      )}

      <StorageAreaDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        mode="add"
      />
    </>
  );
};

export default AddStorageAreaDialog;
