import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Check, GripVertical, Trash2, Users, Edit, Save, X, Filter, Package } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { ItemSelector } from '@/components/ItemSelector';
import { QuantitySelector } from '@/components/QuantitySelector';
import { useItems, FoodItem } from '@/contexts/ItemContext';
import { useStorage } from '@/contexts/StorageContext';

interface ShoppingItem {
  id: string;
  item: FoodItem;
  quantity: string;
  unit: string;
  completed: boolean;
  addedBy: string;
}

const Shopping = () => {
  const { getItemById, updateItemUsage } = useItems();
  const { storageAreas, addStorageItem } = useStorage();
  
  // Initialize with items from the item context
  const [items, setItems] = useState<ShoppingItem[]>([
    { 
      id: '1', 
      item: getItemById('1')!, 
      quantity: '1', 
      unit: 'gallon',
      completed: false, 
      addedBy: 'Sarah' 
    },
    { 
      id: '2', 
      item: getItemById('2')!, 
      quantity: '1', 
      unit: 'loaf',
      completed: false, 
      addedBy: 'John' 
    },
    { 
      id: '3', 
      item: getItemById('3')!, 
      quantity: '12', 
      unit: 'count',
      completed: true, 
      addedBy: 'Sarah' 
    },
    { 
      id: '4', 
      item: getItemById('4')!, 
      quantity: '2', 
      unit: 'lb',
      completed: false, 
      addedBy: 'Auto-added from meal plan' 
    },
    { 
      id: '5', 
      item: getItemById('5')!, 
      quantity: '1', 
      unit: 'lb',
      completed: false, 
      addedBy: 'Auto-added from meal plan' 
    },
  ].filter(item => item.item)); // Filter out any undefined items
  
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // New state for storage dialog
  const [showStorageDialog, setShowStorageDialog] = useState(false);
  const [itemToStore, setItemToStore] = useState<ShoppingItem | null>(null);
  const [selectedStorageArea, setSelectedStorageArea] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [storageExpirationDate, setStorageExpirationDate] = useState('');

  const handleItemSelect = (item: FoodItem) => {
    setSelectedItem(item);
    setNewItemUnit(item.defaultUnit);
  };

  const handleQuantityChange = (quantity: string, unit: string) => {
    setNewItemQuantity(quantity);
    setNewItemUnit(unit);
  };

  const handleAddItem = () => {
    if (selectedItem && newItemQuantity.trim()) {
      const newShoppingItem: ShoppingItem = {
        id: Date.now().toString(),
        item: selectedItem,
        quantity: newItemQuantity,
        unit: newItemUnit,
        completed: false,
        addedBy: 'You'
      };
      
      setItems([...items, newShoppingItem]);
      setSelectedItem(null);
      setNewItemQuantity('1');
      setNewItemUnit('');
      updateItemUsage(selectedItem.id);
    }
  };

  const toggleItemComplete = (id: string) => {
    const item = items.find(item => item.id === id);
    if (!item) return;

    if (!item.completed) {
      // Item is being marked as completed - show storage dialog
      setItemToStore(item);
      setSelectedStorageArea('');
      setStorageLocation('');
      setStorageExpirationDate('');
      setShowStorageDialog(true);
    } else {
      // Item is being unchecked - just toggle
      setItems(items.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      ));
    }
  };

  const handleAddToStorage = () => {
    if (!itemToStore || !selectedStorageArea) return;

    // Add to storage
    addStorageItem({
      itemId: itemToStore.item.id,
      storageAreaId: selectedStorageArea,
      quantity: itemToStore.quantity,
      unit: itemToStore.unit,
      purchaseDate: new Date(),
      expirationDate: storageExpirationDate ? new Date(storageExpirationDate) : undefined,
      location: storageLocation.trim() || undefined,
    });

    // Mark as completed
    setItems(items.map(item => 
      item.id === itemToStore.id ? { ...item, completed: true } : item
    ));

    // Close dialog and reset state
    setShowStorageDialog(false);
    setItemToStore(null);
    setSelectedStorageArea('');
    setStorageLocation('');
    setStorageExpirationDate('');
  };

  const handleSkipStorage = () => {
    if (!itemToStore) return;

    // Just mark as completed without adding to storage
    setItems(items.map(item => 
      item.id === itemToStore.id ? { ...item, completed: true } : item
    ));

    // Close dialog and reset state
    setShowStorageDialog(false);
    setItemToStore(null);
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const startEditingItem = (id: string) => {
    setEditingItem(id);
  };

  const saveItemEdit = (id: string, newQuantity: string, newUnit: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, quantity: newQuantity, unit: newUnit } : item
    ));
    setEditingItem(null);
  };

  const cancelItemEdit = () => {
    setEditingItem(null);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = items.findIndex(item => item.id === draggedItem);
    const targetIndex = items.findIndex(item => item.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newItems = [...items];
    const [draggedElement] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedElement);
    
    setItems(newItems);
    setDraggedItem(null);
  };

  // Filter items by category
  const filterItemsByCategory = (itemsList: ShoppingItem[]) => {
    if (categoryFilter === 'All') return itemsList;
    return itemsList.filter(item => item.item.category === categoryFilter);
  };

  const pendingItems = filterItemsByCategory(items.filter(item => !item.completed));
  const completedItems = filterItemsByCategory(items.filter(item => item.completed));
  const totalItems = items.length;
  const completedCount = completedItems.length;

  // Get unique categories from items
  const categories = ['All', ...Array.from(new Set(items.map(item => item.item.category)))];

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Dairy': 'bg-blue-100 text-blue-800',
      'Produce': 'bg-green-100 text-green-800',
      'Meat': 'bg-red-100 text-red-800',
      'Bakery': 'bg-orange-100 text-orange-800',
      'Grains': 'bg-yellow-100 text-yellow-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors['Other'];
  };

  const ShoppingItemRow = ({ shoppingItem, isCompleted = false }: { shoppingItem: ShoppingItem; isCompleted?: boolean }) => {
    const [editQuantity, setEditQuantity] = useState(shoppingItem.quantity);
    const [editUnit, setEditUnit] = useState(shoppingItem.unit);
    const isEditing = editingItem === shoppingItem.id;

    const handleSave = () => {
      saveItemEdit(shoppingItem.id, editQuantity, editUnit);
    };

    const handleCancel = () => {
      setEditQuantity(shoppingItem.quantity);
      setEditUnit(shoppingItem.unit);
      cancelItemEdit();
    };

    return (
      <div
        draggable={!isEditing}
        onDragStart={(e) => handleDragStart(e, shoppingItem.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, shoppingItem.id)}
        className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors cursor-move ${
          isCompleted ? 'bg-green-50 opacity-75' : 'bg-gray-50'
        } ${draggedItem === shoppingItem.id ? 'opacity-50' : ''}`}
      >
        <GripVertical className="h-4 w-4 text-gray-400 cursor-grab flex-shrink-0" />
        
        <button
          onClick={() => toggleItemComplete(shoppingItem.id)}
          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
            isCompleted 
              ? 'bg-green-500' 
              : 'border-2 border-gray-300 hover:border-green-500'
          }`}
        >
          {isCompleted && <Check className="h-4 w-4 text-white" />}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className={`font-medium ${isCompleted ? 'text-gray-700 line-through' : 'text-gray-900'}`}>
                {shoppingItem.item.name}
              </span>
              <Badge className={getCategoryColor(shoppingItem.item.category)}>
                {shoppingItem.item.category}
              </Badge>
            </div>
            {isEditing && (
              <div className="flex gap-1 flex-shrink-0 md:hidden">
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="h-8 px-2"
                >
                  <Save className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="h-8 px-2"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {isEditing ? (
              <div className="mt-1">
                <QuantitySelector
                  item={shoppingItem.item}
                  initialQuantity={editQuantity}
                  initialUnit={editUnit}
                  onQuantityChange={(quantity, unit) => {
                    setEditQuantity(quantity);
                    setEditUnit(unit);
                  }}
                  className="w-full"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>{shoppingItem.quantity} {shoppingItem.unit}</span>
                <span>•</span>
                <span>Added by {shoppingItem.addedBy}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {isEditing && (
            <div className="hidden md:flex gap-1">
              <Button
                size="sm"
                onClick={handleSave}
                className="h-8 px-2"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="h-8 px-2"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          {!isCompleted && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startEditingItem(shoppingItem.id)}
              className="h-8 w-8 p-0 opacity-70 hover:opacity-100 transition-opacity"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteItem(shoppingItem.id)}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 pb-20">
      {/* Storage Dialog */}
      <Dialog open={showStorageDialog} onOpenChange={setShowStorageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              Add to Storage
            </DialogTitle>
          </DialogHeader>
          
          {itemToStore && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{itemToStore.item.name}</span>
                  <Badge className={getCategoryColor(itemToStore.item.category)}>
                    {itemToStore.item.category}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {itemToStore.quantity} {itemToStore.unit}
                </p>
              </div>
              
              <div>
                <Label className="text-sm">Storage Area</Label>
                <Select value={selectedStorageArea} onValueChange={setSelectedStorageArea}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select storage area" />
                  </SelectTrigger>
                  <SelectContent>
                    {storageAreas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        <div className="flex items-center gap-2">
                          <span>{area.emoji}</span>
                          <span>{area.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm">Location (optional)</Label>
                <Input
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  placeholder="e.g., Main shelf, Door"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label className="text-sm">Expiration Date (optional)</Label>
                <Input
                  type="date"
                  value={storageExpirationDate}
                  onChange={(e) => setStorageExpirationDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handleAddToStorage} 
                  disabled={!selectedStorageArea}
                  className="flex-1"
                >
                  Add to Storage
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleSkipStorage}
                  className="flex-1"
                >
                  Skip Storage
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Shopping List</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-600">
                  {completedCount} of {totalItems} items completed
                </p>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">Synced</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {Math.round((completedCount / totalItems) * 100) || 0}%
              </div>
              <div className="text-xs text-gray-600">Complete</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Add New Item */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-600" />
              Add Item
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ItemSelector
              onItemSelect={handleItemSelect}
              placeholder="Search or add item..."
              className="w-full"
            />
            
            {selectedItem && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">
                    Selected: <span className="font-medium">{selectedItem.name}</span>
                  </p>
                  <QuantitySelector
                    item={selectedItem}
                    initialQuantity={newItemQuantity}
                    initialUnit={newItemUnit}
                    onQuantityChange={handleQuantityChange}
                  />
                </div>
                <Button onClick={handleAddItem} className="px-6">
                  Add
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Filter */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Filter className="h-5 w-5 text-gray-600" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoryFilter !== 'All' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCategoryFilter('All')}
                  className="text-gray-500"
                >
                  Clear filter
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Items */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">
              To Buy ({pendingItems.length})
              {categoryFilter !== 'All' && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  • {categoryFilter}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingItems.map((shoppingItem) => (
                <ShoppingItemRow key={shoppingItem.id} shoppingItem={shoppingItem} />
              ))}
              
              {pendingItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">
                    {categoryFilter === 'All' ? '🎉' : '📋'}
                  </div>
                  <p>
                    {categoryFilter === 'All' 
                      ? 'All items completed!' 
                      : `No ${categoryFilter.toLowerCase()} items to buy`
                    }
                  </p>
                  <p className="text-sm">
                    {categoryFilter === 'All' 
                      ? 'Add new items to get started' 
                      : 'Try a different category filter'
                    }
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Completed Items */}
        {completedItems.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Completed ({completedItems.length})
                  {categoryFilter !== 'All' && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      • {categoryFilter}
                    </span>
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCompleted(!showCompleted)}
                >
                  {showCompleted ? 'Hide' : 'Show'}
                </Button>
              </div>
            </CardHeader>
            {showCompleted && (
              <CardContent>
                <div className="space-y-3">
                  {completedItems.map((shoppingItem) => (
                    <ShoppingItemRow 
                      key={shoppingItem.id} 
                      shoppingItem={shoppingItem} 
                      isCompleted={true} 
                    />
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}
      </div>

      <BottomNavigation currentPage="shopping" />
    </div>
  );
};

export default Shopping;
