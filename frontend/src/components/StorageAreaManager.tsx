import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit3, Trash2, Edit } from 'lucide-react';
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
    deleteStorageArea
  } = useCurrentHouseholdStorageAreas(user?.selectedHouseholdId);
  
  const [editingArea, setEditingArea] = useState<any>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleAddArea = async (data: { name: string; emoji: string; type: StorageAreaType }) => {
    try {
      await createStorageArea({
        name: data.name,
        emoji: data.emoji,
        type: data.type
      });

      toast.success(t("messages.success.storageAreaCreated"), {
        description: t("messages.success.storageAreaCreatedDescription", { name: data.name }),
      });

      setIsAddDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("messages.error.failedToCreateStorageArea");
      toast.error(t("messages.error.creationFailed"), {
        description: message,
      });
    }
  };

  const handleEditArea = (area: any) => {
    setEditingArea(area);
    setIsEditDialogOpen(true);
  };

  const handleUpdateArea = async (data: { name: string; emoji: string; type: StorageAreaType }) => {
    if (!editingArea) {
      return;
    }

    try {
      await updateStorageArea(editingArea.id, {
        name: data.name,
        emoji: data.emoji,
        type: data.type
      });

      toast.success(t("messages.success.storageAreaUpdated"), {
        description: t("messages.success.storageAreaUpdatedDescription"),
      });

      setEditingArea(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("messages.error.failedToUpdateStorageArea");
      toast.error(t("messages.error.updateFailed"), {
        description: message,
      });
    }
  };

  const handleDeleteArea = async (area: any) => {
    try {
      await deleteStorageArea(area.id);

      toast.success(t("messages.success.storageAreaDeleted"), {
        description: t("messages.success.storageAreaDeletedDescription"),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("messages.error.failedToDeleteStorageArea");
      toast.error(t("messages.error.deleteFailed"), {
        description: message,
      });
    }
  };


  return (
    <Card className="bg-primary/10 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('storageAreaManager.title')}</span>
          <Button 
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('storageAreaManager.addStorage')}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {storageAreas.map((area) => (
          <div key={area.id} className="flex items-center justify-between p-4 bg-primary/10 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
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
              >
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="deleteTrash" 
                    size="icon"
                    className="h-8 w-8 p-0"
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
                      className="text-foreground bg-red-600 hover:bg-red-700"
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
