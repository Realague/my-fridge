import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardButton, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Users, Bell, Menu, ChevronDown, Refrigerator, ShoppingCart, CalendarDays, BookOpen, PackageMinus, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StorageAreaCard from '@/components/StorageAreaCard';
import BottomNavigation from '@/components/BottomNavigation';
import NotificationDrawer from '@/components/NotificationDrawer';
import AddStorageAreaDialog from '@/components/AddStorageAreaDialog';
import { LowStockCard } from '@/components/LowStockCard';
import { ExpiringSoonCard } from '@/components/ExpiringSoonCard';
import { RecentActivityCard } from '@/components/RecentActivityCard';
import { StatsSummaryCards } from '@/components/stats/StatsSummaryCards';
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
import { useStorageAreasWithStats, useStorageAreaStore } from '@/stores/storageAreaStore';
import { useShoppingStore } from '@/stores/shoppingStore';
import { useStoredItemStore } from '@/stores/storedItemStore';
import { useRecipeStore } from '@/stores/recipeStore';
import { useItemMinimumStore } from '@/stores/itemMinimumStore';
import { useExpirationNotificationStore } from '@/stores/expirationNotificationStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useStoreErrorToast } from '@/hooks/useStoreErrorToast';
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
  const { getToBuyItems, fetchShoppingItems } = useShoppingStore();
  const { fetchStoredItems } = useStoredItemStore();
  const { recipes, fetchRecipes } = useRecipeStore();
  const { getItemMinimumsForHousehold, fetchItemMinimums, fetchLowStockItems } = useItemMinimumStore();
  const fetchNotifications = useExpirationNotificationStore((s) => s.fetchAll);

  // Surface fetch errors as destructive toasts; clear after toasting so the
  // same failure doesn't re-fire on every re-render. All hooks share the same
  // sonner id, so simultaneous failures (e.g. offline) collapse into one toast.
  useStoreErrorToast(useStorageAreaStore((s) => s.error), useStorageAreaStore((s) => s.setError));
  useStoreErrorToast(useStoredItemStore((s) => s.error), useStoredItemStore((s) => s.setError));
  useStoreErrorToast(useShoppingStore((s) => s.error), useShoppingStore((s) => s.setError));
  useStoreErrorToast(useRecipeStore((s) => s.error), useRecipeStore((s) => s.setError));
  useStoreErrorToast(useItemMinimumStore((s) => s.error), useItemMinimumStore((s) => s.setError));
  useStoreErrorToast(useExpirationNotificationStore((s) => s.error), useExpirationNotificationStore((s) => s.setError));
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mf-green mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
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
    { title: t('pages.shopping.title'), description: t('pages.dashboard.itemsPending', { count: getToBuyItems().length }), icon: ShoppingCart, route: '/shopping' },
    { title: t('pages.meals.title'), description: t('pages.dashboard.planThisWeek'), icon: CalendarDays, route: '/meals' },
    { title: t('pages.recipes.title'), description: t('pages.dashboard.savedRecipes', { count: (recipes || []).length }), icon: BookOpen, route: '/recipes' },
    { title: t('pages.dashboard.itemMinimums'), description: t('pages.dashboard.itemsTracked', { count: itemMinimums.length }), icon: PackageMinus, route: '/item-minimums' },
    { title: t('pages.dashboard.loyaltyCards'), description: t('pages.dashboard.loyaltyCardsDesc'), icon: CreditCard, route: '/loyalty-cards' },
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
                aria-label={t('a11y.openNotifications')}
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-[10px] bg-mf-danger text-white p-0 rounded-full">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Badge>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/settings')}
                aria-label={t('a11y.openSettings')}
              >
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
              <CardButton
                variant="elevated"
                onClick={() => navigate(action.route)}
                aria-label={`${action.title} — ${action.description}`}
              >
                <CardContent className="p-4 text-center">
                  <action.icon className="h-6 w-6 mb-2 mx-auto text-mf-green-deep" strokeWidth={1.8} />
                  <div className="font-medium text-sm text-foreground">{action.title}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </CardContent>
              </CardButton>
            </motion.div>
          ))}
        </div>

        {/* Expiring Soon Alert */}
        <ExpiringSoonCard householdId={selectedHouseholdId} />

        {/* Low Stock Alert */}
        <LowStockCard />

        {/* Household statistics — the two summary cards hide themselves
            (StatsSummaryCards returns null) until the household has data. */}
        <StatsSummaryCards householdId={selectedHouseholdId} />

        {/* Storage Areas — Fresh "card with header + grid" pattern */}
        <Card className="border-0 bg-mf-night-surface shadow-none">
          <CardHeader className="px-4 sm:px-6">
            <div className="flex flex-row items-center justify-between gap-3">
              <div className="min-w-0 flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mf-blue-soft text-mf-blue"
                >
                  <Refrigerator className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <CardTitle className="font-display text-mf-text">
                    <span className="truncate">{t('pages.dashboard.storageAreas')}</span>
                  </CardTitle>
                  <CardDescription className="text-mf-text-soft mt-1">
                    {t('pages.dashboard.storageAreasActive', { count: storageAreasWithStats.length })}
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <AddStorageAreaDialog />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/household/${getCurrentHousehold()?.id}`)}
                  className="rounded-full bg-mf-night-elevated text-mf-text hover:bg-mf-night-line font-display font-semibold"
                >
                  <Menu className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t('pages.dashboard.manage')}</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {storageAreasWithStats.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-mf-text-soft mb-4">{t('pages.dashboard.noStorageAreas')}</p>
                <AddStorageAreaDialog
                  trigger={
                    <Button variant="green" className="font-display font-bold">
                      {t('pages.dashboard.addFirstStorageArea')}
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {storageAreasWithStats.map((area, idx) => (
                  <motion.div
                    key={area.id}
                    {...scrollRevealSlideRight(prefersReducedMotion)}
                    transition={{
                      ...scrollRevealSlideRight(prefersReducedMotion).transition,
                      delay: prefersReducedMotion ? 0 : idx * 0.03,
                    }}
                  >
                    <StorageAreaCard
                      area={area}
                      onClick={() => navigate(`/storage/${area.id}`)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity — hidden entirely (RecentActivityCard returns null)
            when the household has no activity yet. */}
        <RecentActivityCard householdId={selectedHouseholdId} />
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
