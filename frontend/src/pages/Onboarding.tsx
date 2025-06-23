import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, Plus, Users, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StorageAreaOption, StorageAreaSelections } from '@/types/household';
import { useHouseholdStore } from '@/stores/householdStore';

const Onboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { createHousehold, joinHousehold } = useHouseholdStore(state => ({
    createHousehold: state.createHousehold,
    joinHousehold: state.joinHousehold
  }));
  
  const [step, setStep] = useState(1);
  const [householdName, setHouseholdName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [selectedStorageAreas, setSelectedStorageAreas] = useState<(keyof StorageAreaSelections)[]>([]);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('Onboarding: User not authenticated, redirecting to auth');
      navigate('/auth');
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Show loading spinner while auth is loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check URL parameters and set initial step
  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam) {
      const stepNumber = parseInt(stepParam, 10);
      if (stepNumber >= 1 && stepNumber <= 4) {
        setStep(stepNumber);
      }
    }
  }, [searchParams]);

  const storageOptions: StorageAreaOption[] = [
    { id: 'hasFridge', name: 'Refrigerator', emoji: '🥬', description: 'Main fridge compartment' },
    { id: 'hasFreezer', name: 'Freezer', emoji: '🧊', description: 'Frozen food storage' },
    { id: 'hasPantry', name: 'Pantry', emoji: '🏺', description: 'Dry goods and canned items' },
    { id: 'hasKitchenCupboard', name: 'Kitchen Cupboard', emoji: '🗄️', description: 'Spices and small items' },
  ];

  const handleStorageToggle = (storageId: keyof StorageAreaSelections) => {
    setSelectedStorageAreas(prev => 
      prev.includes(storageId) 
        ? prev.filter(id => id !== storageId)
        : [...prev, storageId]
    );
  };

  const handleCreateHousehold = async () => {
    try {
      // Validate inputs
      if (!householdName.trim()) {
        console.error('Household name is required');
        return;
      }

      // Convert selected storage areas to the format expected by the backend
      const storageAreas: StorageAreaSelections = {
        hasFridge: selectedStorageAreas.includes('hasFridge'),
        hasFreezer: selectedStorageAreas.includes('hasFreezer'),
        hasPantry: selectedStorageAreas.includes('hasPantry'),
        hasKitchenCupboard: selectedStorageAreas.includes('hasKitchenCupboard'),
      };

      await createHousehold(householdName.trim(), undefined, storageAreas);
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to create household:', error);
    }
  };

  const handleJoinHousehold = async () => {
    try {
      // Validate inputs
      if (!joinCode.trim() || joinCode.trim().length !== 6) {
        console.error('Valid 6-character join code is required');
        return;
      }

      await joinHousehold(joinCode.trim());
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to join household:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {step === 1 && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-orange-500 rounded-2xl flex items-center justify-center">
                <span className="text-2xl">🏠</span>
              </div>
              <CardTitle className="text-2xl">Set Up Your Household</CardTitle>
              <CardDescription>
                Choose whether to create a new household or join an existing one
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Button
                onClick={() => setStep(2)}
                className="w-full h-16 bg-green-600 hover:bg-green-700 text-left justify-start px-6"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">Create New Household</div>
                    <div className="text-sm opacity-90">Start fresh with your own kitchen</div>
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => setStep(4)}
                variant="outline"
                className="w-full h-16 border-green-600 text-green-600 hover:bg-green-50 text-left justify-start px-6"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold">Join Existing Household</div>
                    <div className="text-sm opacity-75">Use an invite code to join</div>
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-orange-500 rounded-2xl flex items-center justify-center">
                <Plus className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Create Your Household</CardTitle>
              <CardDescription>
                Give your household a name that everyone will recognize
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="household-name">Household Name</Label>
                <Input
                  id="household-name"
                  placeholder="e.g., The Smith Family, Roommates at Oak St"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  className="h-12"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!householdName.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-orange-500 rounded-2xl flex items-center justify-center">
                <span className="text-2xl">🏺</span>
              </div>
              <CardTitle className="text-2xl">Set Up Storage Areas</CardTitle>
              <CardDescription>
                Select the storage areas you have in your kitchen (optional - you can add more later)
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {storageOptions.map((storage) => (
                  <div
                    key={storage.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleStorageToggle(storage.id)}
                  >
                    <Checkbox
                      checked={selectedStorageAreas.includes(storage.id)}
                      onChange={() => handleStorageToggle(storage.id)}
                    />
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-100 to-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg">{storage.emoji}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{storage.name}</div>
                        <div className="text-sm text-gray-600">{storage.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleCreateHousehold}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Create <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                <Users className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Join a Household</CardTitle>
              <CardDescription>
                Enter the invite code shared by your household member
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="join-code">Invite Code</Label>
                <Input
                  id="join-code"
                  placeholder="Enter 6-digit code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="h-12 text-center text-lg tracking-widest"
                  maxLength={6}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleJoinHousehold}
                  disabled={joinCode.length !== 6}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Join <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
