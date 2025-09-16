import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, ArrowLeft, Calendar, MapPin, AlertTriangle, Edit, Trash2, Save, X } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { ItemSelector } from '@/components/ItemSelector';
import { QuantitySelector } from '@/components/QuantitySelector';
import { useStorageAreaStore } from '@/stores/storageAreaStore';
import { useStoredItemStore } from '@/stores/storedItemStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { itemService } from '@/services/itemService';
import { format } from 'date-fns';
import { Unit } from '@/types/enums';
import { Item } from '@/services/itemService';
import { useTranslation } from 'react-i18next';

const StorageArea = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Store hooks
  const { getStorageAreaById, fetchStorageAreas } = useStorageAreaStore();
  const { 
    getStoredItemsByStorageArea, 
    createStoredItem, 
    updateStoredItem, 
    deleteStoredItem,
    fetchStoredItemsByStorageArea,
    loading: storedItemsLoading 
  } = useStoredItemStore();
  const { selectedHouseholdId } = useProtectedRoute();
  
  // Local state
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [location, setLocation] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, Item>>({});

  // Get data from stores
  const area = selectedHouseholdId ? getStorageAreaById(selectedHouseholdId, id || '') : null;
  const storageItems = selectedHouseholdId ? getStoredItemsByStorageArea(selectedHouseholdId, id || '') : [];

  // Load storage areas and stored items on mount
  useEffect(() => {
    if (selectedHouseholdId) {
      fetchStorageAreas(selectedHouseholdId);
    }
  }, [selectedHouseholdId, fetchStorageAreas]);

  // Load stored items when area changes
  useEffect(() => {
    if (selectedHouseholdId && id) {
      fetchStoredItemsByStorageArea(selectedHouseholdId, id);
    }
  }, [selectedHouseholdId, id, fetchStoredItemsByStorageArea]);

  // Load item details for stored items
  useEffect(() => {
    const loadItemDetails = async () => {
      if (!selectedHouseholdId) return;
      
      const itemIds = storageItems
        .map(item => item.itemId)
        .filter(itemId => !items[itemId]);
      
      if (itemIds.length === 0) return;
      
      try {
        const itemDetails = await Promise.all(
          itemIds.map(itemId => itemService.getItemById(itemId, selectedHouseholdId))
        );
        
        const newItems = itemDetails.reduce((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {} as Record<string, Item>);
        
        setItems(prev => ({ ...prev, ...newItems }));
      } catch (error) {
        console.error('Failed to load item details:', error);
      }
    };

    loadItemDetails();
  }, [storageItems, selectedHouseholdId, items]);

  if (!area) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🤔</div>
          <p className="text-lg text-gray-600">{t('storageAreaNotFound')}</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            {t('buttons.goToDashboard')}
          </Button>
        </div>
      </div>
    );
  }

  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
    setNewItemUnit(item.defaultUnit);
  };

  const handleQuantityChange = (quantity: string, unit: string) => {
    setNewItemQuantity(quantity);
    setNewItemUnit(unit);
  };

  const handleAddItem = async () => {
    if (!selectedItem || !newItemQuantity.trim() || !selectedHouseholdId) return;
    
    try {
      await createStoredItem(selectedHouseholdId, {
        itemId: selectedItem.id,
        storageAreaId: id || '',
        quantity: parseFloat(newItemQuantity),
        unit: newItemUnit as Unit,
        expirationDate: expirationDate || undefined,
        location: location.trim() || undefined,
      });
      
      // Reset form
      setSelectedItem(null);
      setNewItemQuantity('1');
      setNewItemUnit('');
      setExpirationDate('');
      setLocation('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const getDaysUntilExpiration = (expirationDate?: string) => {
    if (!expirationDate) return null;
    const now = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpirationStatus = (expirationDate?: string) => {
    const days = getDaysUntilExpiration(expirationDate);
    if (days === null) return null;
    if (days < 0) return 'expired';
    if (days <= 2) return 'expiring-soon';
    if (days <= 7) return 'expiring-week';
    return 'fresh';
  };

  const getExpirationBadge = (expirationDate?: string) => {
    const status = getExpirationStatus(expirationDate);
    const days = getDaysUntilExpiration(expirationDate);
    
    if (!status || days === null) return null;
    
    const badges = {
      'expired': <Badge variant="destructive" className="text-xs">{t('storageArea.expired')}</Badge>,
      'expiring-soon': <Badge variant="destructive" className="text-xs">{t('pages.storageArea.expiresIn', { days })}</Badge>,
      'expiring-week': <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">Expires in {days}d</Badge>,
      'fresh': <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Fresh ({days}d)</Badge>
    };
    
    return badges[status];
  };

  const StorageItemCard = ({ storageItem }: { storageItem: typeof storageItems[0] }) => {
    const item = items[storageItem.itemId];
    const isEditing = editingItem === storageItem.id;
    const [editQuantity, setEditQuantity] = useState(storageItem.quantity.toString());
    const [editUnit, setEditUnit] = useState(storageItem.unit);
    const [editLocation, setEditLocation] = useState(storageItem.location || '');
    const [editExpiration, setEditExpiration] = useState(
      storageItem.expirationDate ? format(new Date(storageItem.expirationDate), 'yyyy-MM-dd') : ''
    );

    if (!item) {
      return (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="text-center text-gray-500">{t('common.loading')}</div>
          </CardContent>
        </Card>
      );
    }

    const handleSave = async () => {
      if (!selectedHouseholdId) return;
      
      try {
        await updateStoredItem(selectedHouseholdId, storageItem.id, {
          quantity: parseFloat(editQuantity),
          unit: editUnit as Unit,
          location: editLocation.trim() || undefined,
          expirationDate: editExpiration || undefined,
        });
        setEditingItem(null);
      } catch (error) {
        console.error('Failed to update item:', error);
      }
    };

    const handleCancel = () => {
      setEditQuantity(storageItem.quantity.toString());
      setEditUnit(storageItem.unit);
      setEditLocation(storageItem.location || '');
      setEditExpiration(storageItem.expirationDate ? format(new Date(storageItem.expirationDate), 'yyyy-MM-dd') : '');
      setEditingItem(null);
    };

    const handleDelete = async () => {
      if (!selectedHouseholdId) return;
      
      try {
        await deleteStoredItem(selectedHouseholdId, storageItem.id);
      } catch (error) {
        console.error('Failed to delete item:', error);
      }
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
                    <Label className="text-sm">{t('storageArea.quantity')}</Label>
                    <QuantitySelector
                      item={item}
                      initialQuantity={editQuantity}
                      initialUnit={editUnit}
                      onQuantityChange={(quantity, unit) => {
                        setEditQuantity(quantity);
                        setEditUnit(unit as Unit);
                      }}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm">{t('storageArea.location')}</Label>
                    <Input
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder={t('storageArea.locationPlaceholder')}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm">{t('storageArea.expirationDate')}</Label>
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
                      {t('buttons.save')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      <X className="h-3 w-3 mr-1" />
                      {t('buttons.cancel')}
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
                      <span>{t('storageArea.added')} {format(new Date(storageItem.createdAt), 'MMM d')}</span>
                    </div>
                    {storageItem.expirationDate && (
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Expires {format(new Date(storageItem.expirationDate), 'MMM d')}</span>
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
                  onClick={handleDelete}
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
                  {storageItems.length} {t('storageArea.items')}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('storageArea.addItem')}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Add Item Form */}
        {showAddForm && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">{t('storageArea.addItemTo', { name: area.name })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm">{t('pages.storageArea.selectItem')}</Label>
                <ItemSelector
                  onItemSelect={handleItemSelect}
                  placeholder={t('itemselector.searchOrAddItemPlaceholder')}
                  className="mt-1"
                />
              </div>
              
              {selectedItem && (
                <>
                  <div>
                    <Label className="text-sm">{t('pages.storageArea.quantity')}</Label>
                    <QuantitySelector
                      item={selectedItem}
                      initialQuantity={newItemQuantity}
                      initialUnit={newItemUnit}
                      onQuantityChange={handleQuantityChange}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm">{t('storageArea.location', { optional: t('common.optional') })}</Label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Main shelf, Vegetable drawer"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm">{t('pages.storageArea.expirationDate', { optional: t('common.optional') })}</Label>
                    <Input
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleAddItem} className="flex-1" disabled={storedItemsLoading}>
                      {t('pages.storageArea.addTo', { name: area.name })}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAddForm(false)}
                      className="flex-1"
                    >
                      {t('buttons.cancel')}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Storage Items */}
        <div className="space-y-4">
          {storedItemsLoading ? (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="text-lg text-gray-600">{t('common.loading')}</div>
              </CardContent>
            </Card>
          ) : storageItems.length > 0 ? (
            storageItems.map((storageItem) => (
              <StorageItemCard key={storageItem.id} storageItem={storageItem} />
            ))
          ) : (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-4">{area.emoji}</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('pages.storageArea.emptyArea', { name: area.name })}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t('pages.storageArea.startAddingItems')}
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('pages.storageArea.addFirstItem')}
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
