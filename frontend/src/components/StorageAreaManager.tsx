import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit3, Trash2, Edit, ChevronUp, ChevronDown } from 'lucide-react';
import { useStorageAreasWithStats, useCurrentHouseholdStorageAreas } from '@/stores/storageAreaStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import StorageAreaDialog from './StorageAreaDialog';
import { StorageAreaType } from '@/types/enums';

const StorageAreaManager = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { storageAreas } = useStorageAreasWithStats(user?.selectedHouseholdId);
  const { 
    createStorageArea, 
    updateStorageArea, 
    deleteStorageArea,
    reorderStorageAreas,
  } = useCurrentHouseholdStorageAreas(user?.selectedHouseholdId);
  
  const [editingArea, setEditingArea] = useState<any>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleAddArea = async (data: { name: string; emoji: string; type: StorageAreaType; defaultCategories: string[] }) => {
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

      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('createStorageArea failed:', error);
      toast.error(t("messages.error.creationFailed"));
    }
  };

  const handleEditArea = (area: any) => {
    setEditingArea(area);
    setIsEditDialogOpen(true);
  };

  const handleUpdateArea = async (data: { name: string; emoji: string; type: StorageAreaType; defaultCategories: string[] }) => {
    if (!editingArea) {
      return;
    }

    try {
      await updateStorageArea(editingArea.id, {
        name: data.name,
        emoji: data.emoji,
        type: data.type,
        defaultCategories: data.defaultCategories,
      });

      toast.success(t("messages.success.storageAreaUpdated"), {
        description: t("messages.success.storageAreaUpdatedDescription", { name: data.name }),
      });

      setEditingArea(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('updateStorageArea failed:', error);
      toast.error(t("messages.error.updateFailed"));
    }
  };

  const handleDeleteArea = async (area: any) => {
    try {
      await deleteStorageArea(area.id);

      toast.success(t("messages.success.storageAreaDeleted"), {
        description: t("messages.success.storageAreaDeletedDescription", { name: area.name }),
      });
    } catch (error) {
      console.error('deleteStorageArea failed:', error);
      toast.error(t("messages.error.deleteFailed"));
    }
  };

  const handleMoveArea = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= storageAreas.length) return;

    const reordered = [...storageAreas];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];

    const items = reordered.map((area, i) => ({ id: area.id, sortOrder: i }));
    try {
      await reorderStorageAreas(items);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("messages.error.updateFailed");
      toast.error(message);
    }
  };

  return (
    <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>{t('storageAreaManager.title')}</span>
          <Button
            variant="green"
            className="shrink-0"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('storageAreaManager.addStorage')}</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {storageAreas.map((area, index) => (
          <div key={area.id} className="flex items-center justify-between p-4 bg-primary/10 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0"
                  disabled={index === 0}
                  onClick={() => handleMoveArea(index, 'up')}
                  aria-label={t('a11y.storageArea.moveUp', { name: area.name })}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0"
                  disabled={index === storageAreas.length - 1}
                  onClick={() => handleMoveArea(index, 'down')}
                  aria-label={t('a11y.storageArea.moveDown', { name: area.name })}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-2xl">{area.emoji}</span>
              <div>
                <p className="font-semibold">{area.name}</p>
                <p className="text-sm">{t(`storageArea.types.${area.type}`)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="editIconButton"
                size="icon"
                onClick={() => handleEditArea(area)}
                className="h-8 w-8 p-0"
                aria-label={t('storageAreaManager.editStorageArea')}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="deleteTrash"
                    size="icon"
                    className="h-8 w-8 p-0"
                    aria-label={t('storageAreaManager.deleteStorageArea')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('storageAreaManager.deleteStorageArea')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('storageAreaManager.deleteConfirmation', { name: area.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('buttons.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteArea(area)}
                      className="bg-mf-danger text-white hover:bg-mf-danger/90"
                    >
                      {t('buttons.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}

        {/* Add Dialog */}
        <StorageAreaDialog
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          onSubmit={handleAddArea}
          mode="add"
        />

        {/* Edit Dialog */}
        <StorageAreaDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setEditingArea(null);
            setIsEditDialogOpen(false);
          }}
          onSubmit={handleUpdateArea}
          mode="edit"
          initialData={editingArea}
        />
      </CardContent>
    </Card>
  );
};

export default StorageAreaManager;
