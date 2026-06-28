import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Plus, Users, CheckCircle, ArrowRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '@/components/BottomNavigation';
import { useHouseholdStore } from '@/stores/householdStore';
import { useAuthStore } from '@/stores/authStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const Household = () => {
  const { t } = useTranslation();
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
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card/90 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              aria-label={t('navigation.dashboard')}
            >
              <Home className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">{t('pages.household.yourHouseholds')}</h1>
            <div className="w-9" /> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">

        <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>{t('pages.household.switchOrManage')}</CardTitle>
            <CardDescription>{t('pages.household.switchOrManageDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
                         {households.map((h) => (
               <div
                 key={h.id}
                 className={`flex items-center justify-between p-3 rounded-lg border ${
                   currentUser?.selectedHouseholdId === h.id
                     ? 'bg-mf-green-soft border-mf-green/30'
                     : 'bg-accent border-border/50'
                 }`}
               >
                 <div className="flex-1 min-w-0">
                   <p className="font-semibold text-foreground">{h.name}</p>
                   <p className="text-sm text-muted-foreground">{t('pages.dashboard.members', { count: h.memberCount })} • {h.userRole}</p>
                 </div>
                 <div className="flex items-center gap-2">
                    {currentUser?.selectedHouseholdId === h.id ? (
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-mf-green-deep">
                        <Check className="h-4 w-4" />
                        {t('pages.household.active')}
                      </span>
                   ) : (
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => handleSwitch(h.id)}
                       disabled={switchingHousehold === h.id}
                     >
                       {switchingHousehold === h.id ? t('pages.household.switching') : t('pages.household.switch')}
                     </Button>
                   )}
                     <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => handleManage(h.id)}>
                       <span className="sr-only">{t('pages.household.manage')}</span>
                       <ArrowRight className="h-4 w-4" />
                    </Button>
                 </div>
               </div>
             ))}
          </CardContent>
        </Card>

        <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>{t('pages.household.joinOrCreate')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button size="lg" variant="green" className="h-auto py-3" onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              {t('pages.household.createNew')}
            </Button>
            <Button size="lg" variant="outline" className="h-auto py-3" onClick={handleJoin}>
              <Users className="h-4 w-4 mr-2" />
              {t('pages.household.joinExisting')}
            </Button>
          </CardContent>
        </Card>

      </div>
      <BottomNavigation currentPage="more" />
    </div>
  );
};

export default Household;
