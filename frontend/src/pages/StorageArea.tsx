
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ArrowLeft, Calendar, MapPin, AlertTriangle, Edit, Trash2, Save, X } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { ItemSelector } from '@/components/ItemSelector';
import { QuantitySelector } from '@/components/QuantitySelector';
import { useStorage, StorageItem } from '@/contexts/StorageContext';
import { useItems, FoodItem } from '@/contexts/ItemContext';
import { format } from 'date-fns';

const StorageArea = () => {
  const { areaId } = useParams<{ areaId: string }>();
  const navigate = useNavigate();
  const { getItemsByArea, getStorageArea, addStorageItem, updateStorageItem, removeStorageItem } = useStorage();
  const { getItemById, updateItemUsage } = useItems();
  
  const area = getStorageArea(areaId || '');
  const storageItems = getItemsByArea(areaId || '');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [location, setLocation] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);

  if (!area) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🤔</div>
          <p className="text-lg text-gray-600">Storage area not found</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

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
      addStorageItem({
        itemId: selectedItem.id,
        storageAreaId: areaId || '',
        quantity: newItemQuantity,
        unit: newItemUnit,
        purchaseDate: new Date(),
        expirationDate: expirationDate ? new Date(expirationDate) : undefined,
        location: location.trim() || undefined,
      });
      
      setSelectedItem(null);
      setNewItemQuantity('1');
      setNewItemUnit('');
      setExpirationDate('');
      setLocation('');
      setShowAddForm(false);
      updateItemUsage(selectedItem.id);
    }
  };

  const getDaysUntilExpiration = (expirationDate?: Date) => {
    if (!expirationDate) return null;
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpirationStatus = (expirationDate?: Date) => {
    const days = getDaysUntilExpiration(expirationDate);
    if (days === null) return null;
    if (days < 0) return 'expired';
    if (days <= 2) return 'expiring-soon';
    if (days <= 7) return 'expiring-week';
    return 'fresh';
  };

  const getExpirationBadge = (expirationDate?: Date) => {
    const status = getExpirationStatus(expirationDate);
    const days = getDaysUntilExpiration(expirationDate);
    
    if (!status || days === null) return null;
    
    const badges = {
      'expired': <Badge variant="destructive" className="text-xs">Expired</Badge>,
      'expiring-soon': <Badge variant="destructive" className="text-xs">Expires in {days}d</Badge>,
      'expiring-week': <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">Expires in {days}d</Badge>,
      'fresh': <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Fresh ({days}d)</Badge>
    };
    
    return badges[status];
  };

  const StorageItemCard = ({ storageItem }: { storageItem: StorageItem }) => {
    const item = getItemById(storageItem.itemId);
    const isEditing = editingItem === storageItem.id;
    const [editQuantity, setEditQuantity] = useState(storageItem.quantity);
    const [editUnit, setEditUnit] = useState(storageItem.unit);
    const [editLocation, setEditLocation] = useState(storageItem.location || '');
    const [editExpiration, setEditExpiration] = useState(
      storageItem.expirationDate ? format(storageItem.expirationDate, 'yyyy-MM-dd') : ''
    );

    if (!item) return null;

    const handleSave = () => {
      updateStorageItem(storageItem.id, {
        quantity: editQuantity,
        unit: editUnit,
        location: editLocation.trim() || undefined,
        expirationDate: editExpiration ? new Date(editExpiration) : undefined,
      });
      setEditingItem(null);
    };

    const handleCancel = () => {
      setEditQuantity(storageItem.quantity);
      setEditUnit(storageItem.unit);
      setEditLocation(storageItem.location || '');
      setEditExpiration(storageItem.expirationDate ? format(storageItem.expirationDate, 'yyyy-MM-dd') : '');
      setEditingItem(null);
    };

    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-gray-900">{item.name}</h3>
                <Badge variant="outline" className="text-xs">
                  {item.category}
                </Badge>
                {getExpirationBadge(storageItem.expirationDate)}
              </div>
              
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Quantity</Label>
                    <QuantitySelector
                      item={item}
                      initialQuantity={editQuantity}
                      initialUnit={editUnit}
                      onQuantityChange={(quantity, unit) => {
                        setEditQuantity(quantity);
                        setEditUnit(unit);
                      }}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm">Location</Label>
                    <Input
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="e.g., Main shelf, Door"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm">Expiration Date</Label>
                    <Input
                      type="date"
                      value={editExpiration}
                      onChange={(e) => setEditExpiration(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave}>
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="font-medium">{storageItem.quantity} {storageItem.unit}</span>
                    {storageItem.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{storageItem.location}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Added {format(storageItem.purchaseDate, 'MMM d')}</span>
                    </div>
                    {storageItem.expirationDate && (
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Expires {format(storageItem.expirationDate, 'MMM d')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {!isEditing && (
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingItem(storageItem.id)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStorageItem(storageItem.id)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="p-1"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{area.emoji}</span>
                  <h1 className="text-xl font-bold text-gray-900">{area.name}</h1>
                </div>
                <p className="text-sm text-gray-600">
                  {storageItems.length} items
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Add Item Form */}
        {showAddForm && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Add Item to {area.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm">Select Item</Label>
                <ItemSelector
                  onItemSelect={handleItemSelect}
                  placeholder="Search or add item..."
                  className="mt-1"
                />
              </div>
              
              {selectedItem && (
                <>
                  <div>
                    <Label className="text-sm">Quantity</Label>
                    <QuantitySelector
                      item={selectedItem}
                      initialQuantity={newItemQuantity}
                      initialUnit={newItemUnit}
                      onQuantityChange={handleQuantityChange}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm">Location (optional)</Label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Main shelf, Vegetable drawer"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm">Expiration Date (optional)</Label>
                    <Input
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleAddItem} className="flex-1">
                      Add to {area.name}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAddForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Storage Items */}
        <div className="space-y-4">
          {storageItems.length > 0 ? (
            storageItems.map((storageItem) => (
              <StorageItemCard key={storageItem.id} storageItem={storageItem} />
            ))
          ) : (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-4">{area.emoji}</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Your {area.name.toLowerCase()} is empty
                </h3>
                <p className="text-gray-600 mb-4">
                  Start adding items to track your inventory
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <BottomNavigation currentPage="dashboard" />
    </div>
  );
};

export default StorageArea;
