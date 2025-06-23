import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCurrentHouseholdStorageAreas } from '@/stores/storageAreaStore';
import { useAuthStore } from '@/stores/authStore';

interface AddStorageAreaDialogProps {
  trigger?: React.ReactNode;
}

const storageAreaTypes = [
  { value: 'fridge', label: 'Refrigerator', emoji: '🥬' },
  { value: 'freezer', label: 'Freezer', emoji: '🧊' },
  { value: 'pantry', label: 'Pantry', emoji: '🏺' },
  { value: 'kitchen_cupboard', label: 'Kitchen Cupboard', emoji: '🗄️' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

const AddStorageAreaDialog = ({ trigger }: AddStorageAreaDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('');
  const [emoji, setEmoji] = useState('');
  
  const { user } = useAuthStore();
  const { createStorageArea, loading } = useCurrentHouseholdStorageAreas(user?.selectedHouseholdId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !type) {
      return;
    }

    try {
      await createStorageArea({
        name: name.trim(),
        type: type as 'fridge' | 'freezer' | 'pantry' | 'kitchen_cupboard' | 'other',
        emoji: emoji || storageAreaTypes.find(t => t.value === type)?.emoji || '📦',
      });
      
      // Reset form and close dialog
      setName('');
      setType('');
      setEmoji('');
      setOpen(false);
    } catch (error) {
      console.error('Failed to create storage area:', error);
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
            variant="outline"
            size="sm"
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Area
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Storage Area</DialogTitle>
            <DialogDescription>
              Create a new storage area for your household.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="storage-name">Name</Label>
              <Input
                id="storage-name"
                placeholder="e.g., Main Fridge, Walk-in Pantry"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="storage-type">Type</Label>
              <Select value={type} onValueChange={handleTypeChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select storage type" />
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
              <Label htmlFor="storage-emoji">Emoji (optional)</Label>
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
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !type || loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Creating...' : 'Create Area'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStorageAreaDialog; 