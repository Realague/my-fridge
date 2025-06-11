import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, Users, Bell, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StorageAreaCard from '@/components/StorageAreaCard';
import BottomNavigation from '@/components/BottomNavigation';
import { useStorage } from '@/contexts/StorageContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { storageAreas, getItemsByArea } = useStorage();
  const [showManageAreasDialog, setShowManageAreasDialog] = useState(false);

  // Calculate storage area stats
  const storageAreasWithStats = storageAreas.map(area => {
    const items = getItemsByArea(area.id);
    return {
      id: parseInt(area.id),
      name: area.name,
      emoji: area.emoji,
      itemCount: items.length,
      lowStockCount: 0, // TODO: implement low stock logic
    };
  });

  const quickActions = [
    { title: 'Shopping List', description: '5 items pending', emoji: '🛒', route: '/shopping' },
    { title: 'Meal Plans', description: 'Plan this week', emoji: '📅', route: '/meal-plans' },
    { title: 'Recipes', description: '12 saved recipes', emoji: '📖', route: '/recipes' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">The Smith Family</h1>
              <p className="text-sm text-gray-600">3 members</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs bg-red-500 text-white">
                  2
                </Badge>
              </Button>
              <Button variant="ghost" size="sm">
                <Users className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action, index) => (
            <Card
              key={index}
              className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
              onClick={() => navigate(action.route)}
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">{action.emoji}</div>
                <div className="font-medium text-sm text-gray-900">{action.title}</div>
                <div className="text-xs text-gray-600">{action.description}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Storage Areas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Storage Areas</h2>
            <Button
              variant="outline"
              size="sm"
              className="border-green-600 text-green-600 hover:bg-green-50"
              onClick={() => setShowManageAreasDialog(true)}
            >
              <List className="h-4 w-4 mr-2" />
              Manage Areas
            </Button>
          </div>

          <div className="space-y-3">
            {storageAreasWithStats.map((area) => (
              <StorageAreaCard
                key={area.id}
                area={area}
                onClick={() => navigate(`/storage/${area.id}`)}
              />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>What's happening in your household</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-sm">🥛</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Sarah added milk to the fridge</p>
                  <p className="text-xs text-gray-600">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-sm">🍞</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Low stock: Bread</p>
                  <p className="text-xs text-gray-600">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm">📝</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">John completed shopping list</p>
                  <p className="text-xs text-gray-600">Yesterday</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manage Areas Dialog */}
      <Dialog open={showManageAreasDialog} onOpenChange={setShowManageAreasDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Storage Areas</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600 mb-4">
              Your current storage areas:
            </p>
            <div className="space-y-3">
              {storageAreasWithStats.map((area) => (
                <div key={area.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{area.emoji}</span>
                    <div>
                      <h4 className="font-medium text-gray-900">{area.name}</h4>
                      <p className="text-sm text-gray-600">{area.itemCount} items stored</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowManageAreasDialog(false);
                      navigate(`/storage/${area.id}`);
                    }}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 Custom storage areas feature is coming soon! You can add more areas like basement, garage, or custom pantries.
              </p>
            </div>
            <Button 
              onClick={() => setShowManageAreasDialog(false)} 
              className="w-full mt-4"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation currentPage="dashboard" />
    </div>
  );
};

export default Dashboard;
