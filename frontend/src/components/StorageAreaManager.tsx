
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { useStorage, StorageArea } from '@/contexts/StorageContext';
import { toast } from 'sonner';

const StorageAreaManager = () => {
  const { storageAreas, addStorageArea, updateStorageArea, removeStorageArea } = useStorage();
  const [editingArea, setEditingArea] = useState<StorageArea | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaEmoji, setNewAreaEmoji] = useState('📦');
  const [newAreaType, setNewAreaType] = useState<'fridge' | 'freezer' | 'pantry' | 'other'>('other');

  const handleAddArea = () => {
    if (!newAreaName.trim()) {
      toast.error('Please enter a storage area name');
      return;
    }

    addStorageArea({
      name: newAreaName.trim(),
      emoji: newAreaEmoji,
      type: newAreaType
    });

    toast.success(`Added storage area: ${newAreaName}`);
    setNewAreaName('');
    setNewAreaEmoji('📦');
    setNewAreaType('other');
    setIsAddDialogOpen(false);
  };

  const handleEditArea = (area: StorageArea) => {
    setEditingArea(area);
    setNewAreaName(area.name);
    setNewAreaEmoji(area.emoji);
    setNewAreaType(area.type);
    setIsEditDialogOpen(true);
  };

  const handleUpdateArea = () => {
    if (!editingArea || !newAreaName.trim()) {
      toast.error('Please enter a storage area name');
      return;
    }

    updateStorageArea(editingArea.id, {
      name: newAreaName.trim(),
      emoji: newAreaEmoji,
      type: newAreaType
    });

    toast.success(`Updated storage area: ${newAreaName}`);
    setEditingArea(null);
    setNewAreaName('');
    setNewAreaEmoji('📦');
    setNewAreaType('other');
    setIsEditDialogOpen(false);
  };

  const handleDeleteArea = (area: StorageArea) => {
    removeStorageArea(area.id);
    toast.success(`Deleted storage area: ${area.name}`);
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
          <span>Storage Areas</span>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Storage
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Storage Area</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <Input
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    placeholder="Storage area name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Emoji</label>
                  <Input
                    value={newAreaEmoji}
                    onChange={(e) => setNewAreaEmoji(e.target.value)}
                    placeholder="📦"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select 
                    value={newAreaType} 
                    onChange={(e) => setNewAreaType(e.target.value as any)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="fridge">Fridge</option>
                    <option value="freezer">Freezer</option>
                    <option value="pantry">Pantry</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddArea} className="flex-1">
                    Add Storage Area
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      resetForm();
                      setIsAddDialogOpen(false);
                    }}
                  >
                    Cancel
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
                <p className="text-sm text-gray-500 capitalize">{area.type}</p>
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
                    <AlertDialogTitle>Delete Storage Area</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{area.name}"? This will also remove all items stored in this area.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDeleteArea(area)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
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
              <DialogTitle>Edit Storage Area</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <Input
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  placeholder="Storage area name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Emoji</label>
                <Input
                  value={newAreaEmoji}
                  onChange={(e) => setNewAreaEmoji(e.target.value)}
                  placeholder="📦"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <select 
                  value={newAreaType} 
                  onChange={(e) => setNewAreaType(e.target.value as any)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="fridge">Fridge</option>
                  <option value="freezer">Freezer</option>
                  <option value="pantry">Pantry</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateArea} className="flex-1">
                  Update Storage Area
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    resetForm();
                    setIsEditDialogOpen(false);
                  }}
                >
                  Cancel
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
