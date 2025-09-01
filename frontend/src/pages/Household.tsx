import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, Plus, Users, CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '@/components/BottomNavigation';
import { useHouseholdStore } from '@/stores/householdStore';
import { useAuthStore } from '@/stores/authStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useEffect, useState } from 'react';

const Household = () => {
  const navigate = useNavigate();
  
  // Protected route hook handles auth and household checks
  useProtectedRoute();
  
  const { user: currentUser, setUser } = useAuthStore();
  
  // Zustand store - selective subscriptions
  const households = useHouseholdStore(state => state.households);
  const fetchHouseholds = useHouseholdStore(state => state.fetchHouseholds);
  const selectHousehold = useHouseholdStore(state => state.selectHousehold);
  
  const [switchingHousehold, setSwitchingHousehold] = useState<string | null>(null);

  // Load households on mount
  useEffect(() => {
    fetchHouseholds();
  }, [fetchHouseholds]);

  const handleCreateNew = () => {
    navigate('/onboarding?step=2'); // Go directly to the "Create Your Household" step
  };
  
  const handleJoin = () => {
    navigate('/onboarding?step=4'); // Go directly to the "Join a Household" step
  };

  const handleSwitch = async (householdId: string) => {
    try {
      setSwitchingHousehold(householdId);
      
      const user = await selectHousehold(householdId);
      
      if (user) {
        setUser(user);
      } else {
        console.error('No user data returned from selectHousehold');
      }
    } catch (error) {
      console.error('Failed to switch household:', error);
    } finally {
      setSwitchingHousehold(null);
    }
  };

  const handleManage = (householdId: string) => {
    navigate(`/household/${householdId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <Home className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-gray-900">Your Households</h1>
            <div className="w-9" /> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Switch or Manage Households</CardTitle>
            <CardDescription>You can be a part of multiple households.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
                         {households.map((h) => (
               <div key={h.id} className="flex items-center justify-between p-3 bg-gray-50/70 rounded-lg">
                 <div className="flex-1 min-w-0">
                   <p className="font-semibold text-gray-900">{h.name}</p>
                   <p className="text-sm text-gray-500">{h.memberCount} members • {h.userRole}</p>
                 </div>
                 <div className="flex items-center gap-2">
                   {currentUser?.selectedHouseholdId === h.id ? (
                     <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                       <CheckCircle className="h-3 w-3 mr-1.5" />
                       Active
                     </Badge>
                   ) : (
                     <Button 
                       variant="outline" 
                       size="sm" 
                       onClick={() => handleSwitch(h.id)}
                       disabled={switchingHousehold === h.id}
                     >
                       {switchingHousehold === h.id ? 'Switching...' : 'Switch'}
                     </Button>
                   )}
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-gray-800 hover:bg-gray-100" onClick={() => handleManage(h.id)}>
                      <span className="sr-only">Manage</span>
                      <ArrowRight className="h-4 w-4" />
                   </Button>
                 </div>
               </div>
             ))}
          </CardContent>
        </Card>

        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Join or Create</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button size="lg" className="h-auto py-3" onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create New
            </Button>
            <Button size="lg" variant="outline" className="h-auto py-3" onClick={handleJoin}>
              <Users className="h-4 w-4 mr-2" />
              Join Existing
            </Button>
          </CardContent>
        </Card>
        
      </div>
      <BottomNavigation currentPage="household" />
    </div>
  );
};

export default Household;
