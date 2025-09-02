import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { useStorageAreasWithStats, useCurrentHouseholdStorageAreas } from '@/stores/storageAreaStore';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaEmoji, setNewAreaEmoji] = useState('📦');
  const [newAreaType, setNewAreaType] = useState<'fridge' | 'freezer' | 'pantry' | 'other'>('other');

  const handleAddArea = async () => {
    if (!newAreaName.trim()) {
      toast.error(t('storageAreaManager.pleaseEnterName'));
      return;
    }

    try {
      await createStorageArea({
        name: newAreaName.trim(),
        emoji: newAreaEmoji,
        type: newAreaType
      });

      setNewAreaName('');
      setNewAreaEmoji('📦');
      setNewAreaType('other');
      setIsAddDialogOpen(false);
    } catch (error) {
      // Error handled by store
    }
  };

  const handleEditArea = (area: any) => {
    setEditingArea(area);
    setNewAreaName(area.name);
    setNewAreaEmoji(area.emoji);
    setNewAreaType(area.type);
    setIsEditDialogOpen(true);
  };

  const handleUpdateArea = async () => {
    if (!editingArea || !newAreaName.trim()) {
      toast.error(t('storageAreaManager.pleaseEnterName'));
      return;
    }

    try {
      await updateStorageArea(editingArea.id, {
        name: newAreaName.trim(),
        emoji: newAreaEmoji,
        type: newAreaType
      });

      setEditingArea(null);
      setNewAreaName('');
      setNewAreaEmoji('📦');
      setNewAreaType('other');
      setIsEditDialogOpen(false);
    } catch (error) {
      // Error handled by store
    }
  };

  const handleDeleteArea = async (area: any) => {
    try {
      await deleteStorageArea(area.id);
    } catch (error) {
      // Error handled by store
    }
  };

  const resetForm = () => {
    setNewAreaName('');
    setNewAreaEmoji('📦');
    setNewAreaType('other');
    setEditingArea(null);
  };

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('storageAreaManager.title')}</span>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('storageAreaManager.addStorage')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('storageAreaManager.addNewStorageArea')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('forms.name')}</label>
                  <Input
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    placeholder={t('storageAreaManager.namePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('storageAreaManager.emoji')}</label>
                  <Input
                    value={newAreaEmoji}
                    onChange={(e) => setNewAreaEmoji(e.target.value)}
                    placeholder="📦"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('storageArea.type')}</label>
                  <select 
                    value={newAreaType} 
                    onChange={(e) => setNewAreaType(e.target.value as any)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="fridge">{t('storageArea.types.fridge')}</option>
                    <option value="freezer">{t('storageArea.types.freezer')}</option>
                    <option value="pantry">{t('storageArea.types.pantry')}</option>
                    <option value="other">{t('storageArea.types.other')}</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddArea} className="flex-1">
                    {t('storageArea.addStorageArea')}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      resetForm();
                      setIsAddDialogOpen(false);
                    }}
                  >
                    {t('buttons.cancel')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {storageAreas.map((area) => (
          <div key={area.id} className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{area.emoji}</span>
              <div>
                <p className="font-semibold text-gray-900">{area.name}</p>
                <p className="text-sm text-gray-500">{t(`storageArea.types.${area.type}`)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleEditArea(area)}
                className="h-8 w-8 text-gray-400 hover:text-blue-500 hover:bg-blue-50"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
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
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {t('buttons.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('storageAreaManager.editStorageArea')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('forms.name')}</label>
                <Input
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  placeholder={t('storageAreaManager.namePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('storageAreaManager.emoji')}</label>
                <Input
                  value={newAreaEmoji}
                  onChange={(e) => setNewAreaEmoji(e.target.value)}
                  placeholder="📦"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('storageArea.type')}</label>
                <select 
                  value={newAreaType} 
                  onChange={(e) => setNewAreaType(e.target.value as any)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="fridge">{t('storageArea.types.fridge')}</option>
                  <option value="freezer">{t('storageArea.types.freezer')}</option>
                  <option value="pantry">{t('storageArea.types.pantry')}</option>
                  <option value="other">{t('storageArea.types.other')}</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateArea} className="flex-1">
                  {t('storageAreaManager.updateStorageArea')}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    resetForm();
                    setIsEditDialogOpen(false);
                  }}
                >
                  {t('buttons.cancel')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default StorageAreaManager;
