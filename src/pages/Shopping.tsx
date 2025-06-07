
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Check, GripVertical, Trash2, Users } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { ItemSelector } from '@/components/ItemSelector';
import { useItems, FoodItem } from '@/contexts/ItemContext';

interface ShoppingItem {
  id: string;
  item: FoodItem;
  quantity: string;
  completed: boolean;
  addedBy: string;
}

const Shopping = () => {
  const { getItemById, updateItemUsage } = useItems();
  
  // Initialize with items from the item context
  const [items, setItems] = useState<ShoppingItem[]>([
    { 
      id: '1', 
      item: getItemById('1')!, 
      quantity: '1 gallon', 
      completed: false, 
      addedBy: 'Sarah' 
    },
    { 
      id: '2', 
      item: getItemById('2')!, 
      quantity: '1 loaf', 
      completed: false, 
      addedBy: 'John' 
    },
    { 
      id: '3', 
      item: getItemById('3')!, 
      quantity: '12 count', 
      completed: true, 
      addedBy: 'Sarah' 
    },
    { 
      id: '4', 
      item: getItemById('4')!, 
      quantity: '2 lbs', 
      completed: false, 
      addedBy: 'Auto-added from meal plan' 
    },
    { 
      id: '5', 
      item: getItemById('5')!, 
      quantity: '1 lb', 
      completed: false, 
      addedBy: 'Auto-added from meal plan' 
    },
  ].filter(item => item.item)); // Filter out any undefined items
  
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const handleAddItem = (selectedItem: FoodItem) => {
    const quantity = newItemQuantity.trim() || selectedItem.commonQuantities[0] || '1';
    
    const newShoppingItem: ShoppingItem = {
      id: Date.now().toString(),
      item: selectedItem,
      quantity,
      completed: false,
      addedBy: 'You'
    };
    
    setItems([...items, newShoppingItem]);
    setNewItemQuantity('');
    updateItemUsage(selectedItem.id);
  };

  const toggleItemComplete = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const pendingItems = items.filter(item => !item.completed);
  const completedItems = items.filter(item => item.completed);
  const totalItems = items.length;
  const completedCount = completedItems.length;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 pb-20">
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
            <div className="flex gap-2">
              <ItemSelector
                onItemSelect={handleAddItem}
                placeholder="Search or add item..."
                className="flex-1"
              />
              <Input
                placeholder="Qty"
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(e.target.value)}
                className="w-24"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pending Items */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">To Buy ({pendingItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingItems.map((shoppingItem) => (
                <div
                  key={shoppingItem.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                  
                  <button
                    onClick={() => toggleItemComplete(shoppingItem.id)}
                    className="flex-shrink-0 w-6 h-6 border-2 border-gray-300 rounded-full hover:border-green-500 transition-colors"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{shoppingItem.item.name}</span>
                      <Badge className={getCategoryColor(shoppingItem.item.category)}>
                        {shoppingItem.item.category}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {shoppingItem.quantity} • Added by {shoppingItem.addedBy}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteItem(shoppingItem.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {pendingItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🎉</div>
                  <p>All items completed!</p>
                  <p className="text-sm">Add new items to get started</p>
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
                <CardTitle className="text-lg">Completed ({completedItems.length})</CardTitle>
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
                    <div
                      key={shoppingItem.id}
                      className="flex items-center gap-3 p-3 bg-green-50 rounded-lg opacity-75"
                    >
                      <button
                        onClick={() => toggleItemComplete(shoppingItem.id)}
                        className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
                      >
                        <Check className="h-4 w-4 text-white" />
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700 line-through">{shoppingItem.item.name}</span>
                          <Badge className={getCategoryColor(shoppingItem.item.category)}>
                            {shoppingItem.item.category}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          {shoppingItem.quantity} • Added by {shoppingItem.addedBy}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteItem(shoppingItem.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
