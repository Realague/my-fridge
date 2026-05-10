import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Users, Bell, List, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StorageAreaCard from '@/components/StorageAreaCard';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationDrawer from '@/components/NotificationDrawer';
import AddStorageAreaDialog from '@/components/AddStorageAreaDialog';
import { LowStockCard } from '@/components/LowStockCard';
import { ExpiringSoonCard } from '@/components/ExpiringSoonCard';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import { useAuthStore } from '@/stores/authStore';
import { useHouseholdStore } from '@/stores/householdStore';
import { useStorageAreasWithStats } from '@/stores/storageAreaStore';
import { useShoppingStore } from '@/stores/shoppingStore';
import { useStoredItemStore } from '@/stores/storedItemStore';
import { useRecipeStore } from '@/stores/recipeStore';
import { useItemMinimumStore } from '@/stores/itemMinimumStore';
import { useExpirationNotificationStore } from '@/stores/expirationNotificationStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { scrollRevealFadeUp, scrollRevealSlideRight } from '@/lib/motion';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion() ?? false;
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Protected route hook handles auth and household checks
  const { selectedHouseholdId, isLoading: authLoading, isAuthenticated, hasHousehold } = useProtectedRoute();
  
  // Zustand stores - selective subscriptions for better performance
  const { user: currentUser, setUser } = useAuthStore();
  const { getPendingItems, fetchShoppingItems } = useShoppingStore();
  const { fetchStoredItems } = useStoredItemStore();
  const { recipes, fetchRecipes } = useRecipeStore();
  const { getItemMinimumsForHousehold, fetchItemMinimums, fetchLowStockItems } = useItemMinimumStore();
  const fetchNotifications = useExpirationNotificationStore((s) => s.fetchAll);
  const unreadNotifications = useExpirationNotificationStore((s) =>
    s.notifications.filter((n) => !n.readByCurrentUser).length
  );
  
  // Household store - only re-renders when these specific values change
  const households = useHouseholdStore(state => state.households);
  
  // Actions - these don't cause re-renders
  const getCurrentHousehold = useHouseholdStore(state => state.getCurrentHousehold);
  const fetchHouseholds = useHouseholdStore(state => state.fetchHouseholds);
  const selectHousehold = useHouseholdStore(state => state.selectHousehold);
  
  // Storage areas for current household - pass null if no household to prevent API calls
  const {
    storageAreasWithStats,
    fetchStorageAreas
  } = useStorageAreasWithStats(hasHousehold ? selectedHouseholdId : null);

  // Load households when authenticated
  useEffect(() => {
    fetchHouseholds();  
  }, [selectedHouseholdId, authLoading]);

  // Load storage areas and stored items when household changes
  useEffect(() => {
    if (selectedHouseholdId && !authLoading && hasHousehold) {
      fetchStorageAreas();
      // Also fetch stored items so item counts are calculated correctly
      fetchStoredItems();
      // Fetch shopping items for the dashboard count
      fetchShoppingItems();
      // Fetch recipes for the dashboard count
      fetchRecipes();
      // Full item minimums list for the quick-action count (low-stock endpoint alone does not populate it)
      fetchItemMinimums();
      // Fetch low stock items for the LowStockCard
      if (currentUser?.lowStockAlertsEnabled !== false) {
        fetchLowStockItems();
      }
      // Fetch expiration notifications and expiring-now items for the dashboard
      fetchNotifications(selectedHouseholdId);
    }
  }, [selectedHouseholdId, authLoading, hasHousehold, currentUser?.lowStockAlertsEnabled]); // Remove function dependencies to prevent infinite loops

  // Don't render dashboard content until we have a household
  // This prevents rendering before redirect to onboarding
  if (authLoading || !hasHousehold) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Note: Auth and household checks are now handled by useProtectedRoute hook

  const handleSwitchHousehold = async (householdId: string) => {
    try {
      const user = await selectHousehold(householdId);
      if (user) {
        setUser(user);
      } else {
        console.error('No user data returned from selectHousehold');
      }
    } catch (error) {
      console.error('Failed to switch household:', error);
    }
  };


  // TODO: Re-enable notifications and storage when stores are ready
  // Demo: Add some sample notifications on component mount
  /*
  useEffect(() => {
    const hasAddedSampleNotifications = localStorage.getItem('sampleNotificationsAdded');
    if (!hasAddedSampleNotifications) {
      // Sample notifications code will go here when notification store is integrated
      localStorage.setItem('sampleNotificationsAdded', 'true');
    }
  }, []);
  */

  const itemMinimums = getItemMinimumsForHousehold();
  
  const quickActions = [
    { title: t('pages.shopping.title'), description: t('pages.dashboard.itemsPending', { count: getPendingItems().length }), emoji: '🛒', route: '/shopping' },
    { title: t('pages.meals.title'), description: t('pages.dashboard.planThisWeek'), emoji: '📅', route: '/meals' },
    { title: t('pages.recipes.title'), description: t('pages.dashboard.savedRecipes', { count: (recipes || []).length }), emoji: '📖', route: '/recipes' },
    { title: t('pages.dashboard.itemMinimums'), description: t('pages.dashboard.itemsTracked', { count: itemMinimums.length }), emoji: '📊', route: '/item-minimums' },
    { title: t('pages.dashboard.loyaltyCards'), description: t('pages.dashboard.loyaltyCardsDesc'), emoji: '💳', route: '/loyalty-cards' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      {/* Mobile-only header — on desktop, AppHeader (in AppShell) takes over. */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/20 sticky top-0 z-40 md:hidden">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-left h-auto p-1 -ml-2">
                  <div className="flex items-center gap-2">
                    <div>
                       <h1 className="text-xl font-bold text-foreground">{getCurrentHousehold()?.name || t('common.loading')}</h1>
                       <p className="text-sm text-muted-foreground">{t('pages.dashboard.members', { count: getCurrentHousehold()?.memberCount || 0 })}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>{t('pages.dashboard.switchHousehold')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={selectedHouseholdId || ''} onValueChange={handleSwitchHousehold}>
                  {households.map((h) => (
                    <DropdownMenuRadioItem key={h.id} value={h.id} className="hover:bg-primary/10">
                      {h.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/household')} className="hover:bg-primary/10">
                  <Users className="mr-2 h-4 w-4" />
                  <span>{t('pages.dashboard.manageHouseholds')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="flex items-center gap-1 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setShowNotifications(true)}
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-[10px] bg-rose-500 text-white p-0 rounded-full">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Badge>
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions — hidden on desktop, the sidebar already exposes these. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:hidden">
          {quickActions.map((action) => (
            <motion.div key={action.route} {...scrollRevealFadeUp(prefersReducedMotion)}>
              <Card
                className="bg-card/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                onClick={() => navigate(action.route)}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">{action.emoji}</div>
                  <div className="font-medium text-sm text-foreground">{action.title}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Expiring Soon Alert */}
        <ExpiringSoonCard householdId={selectedHouseholdId} />

        {/* Low Stock Alert */}
        <LowStockCard />

        {/* Storage Areas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-foreground shrink-0">{t('pages.dashboard.storageAreas')}</h2>
            <div className="flex gap-2 shrink-0">
              <AddStorageAreaDialog />
              <Button
                variant="green"
                size="sm"
                onClick={() => navigate(`/household/${getCurrentHousehold()?.id}`)}
              >
                <List className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('pages.dashboard.manage')}</span>
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {storageAreasWithStats.length === 0 ? (
              <div className="text-center py-8">
                 <p className="text-gray-500 mb-4">{t('pages.dashboard.noStorageAreas')}</p>
                 <AddStorageAreaDialog 
                   trigger={
                     <Button variant="green">
                       {t('pages.dashboard.addFirstStorageArea')}
                     </Button>
                   }
                 />
              </div>
            ) : (
              storageAreasWithStats.map((area) => (
                <motion.div key={area.id} {...scrollRevealSlideRight(prefersReducedMotion)}>
                  <StorageAreaCard
                    area={area}
                    onClick={() => navigate(`/storage/${area.id}`)}
                  />
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
             <CardTitle className="text-lg">{t('pages.dashboard.recentActivity')}</CardTitle>
             <CardDescription>{t('pages.dashboard.recentActivityDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-accent rounded-lg">
                <div className="w-8 h-8 bg-accent/50 rounded-full flex items-center justify-center">
                  <span className="text-sm">🥛</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Sarah added milk to the fridge</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-accent rounded-lg">
                <div className="w-8 h-8 bg-accent/50 rounded-full flex items-center justify-center">
                  <span className="text-sm">🍞</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Low stock: Bread</p>
                  <p className="text-xs text-muted-foreground">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-accent rounded-lg">
                <div className="w-8 h-8 bg-accent/50 rounded-full flex items-center justify-center">
                  <span className="text-sm">📝</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">John completed shopping list</p>
                  <p className="text-xs text-muted-foreground">Yesterday</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Drawer */}
      <NotificationDrawer
        open={showNotifications}
        onOpenChange={setShowNotifications}
        householdId={selectedHouseholdId}
      />

      <BottomNavigation currentPage="dashboard" />
    </div>
  );
};

export default Dashboard;
