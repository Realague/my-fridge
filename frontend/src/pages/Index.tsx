
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Users, Utensils, ShoppingCart, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useHouseholdStore } from '@/stores/householdStore';
import { useTranslation } from 'react-i18next';

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { selectedHouseholdId } = useHouseholdStore();

  // Redirect authenticated users to appropriate page
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Check if user has selected household
      if (selectedHouseholdId) {
        // User has a selected household, go to dashboard
        navigate('/dashboard');
      } else {
        // User has no selected household, go to onboarding
        navigate('/onboarding');
      }
    }
      }, [authLoading, isAuthenticated, selectedHouseholdId, navigate]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="mb-6">
              <img src="/favicon.ico" alt="MyFridge" className="inline-flex items-center justify-center w-20 h-20" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            My<span className="text-primary">Fridge</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('pages.index.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-primary/10 text-primary hover:bg-primary/15 px-8 py-3 rounded-xl"
              onClick={() => navigate('/auth')}
            >
              {t('pages.index.getStarted')} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-primary/10 text-primary hover:bg-primary/10 px-8 py-3 rounded-xl"
              onClick={() => navigate('/demo')}
            >
              {t('pages.index.seeDemo')}
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-accent-foreground" />
              </div>
              <CardTitle>{t('pages.index.features.householdSharing')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {t('pages.index.features.householdSharingDescription')}
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-3">
                <Utensils className="h-6 w-6 text-accent-foreground" />
              </div>
              <CardTitle>{t('pages.index.features.smartInventory')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {t('pages.index.features.smartInventoryDescription')}
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-3">
                <ShoppingCart className="h-6 w-6 text-accent-foreground" />
              </div>
              <CardTitle>{t('pages.index.features.shoppingLists')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {t('pages.index.features.shoppingListsDescription')}
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-3">
                <Clock className="h-6 w-6 text-accent-foreground" />
              </div>
              <CardTitle>{t('pages.index.features.mealPlanning')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {t('pages.index.features.mealPlanningDescription')}
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Demo Preview */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground mb-8">{t('pages.index.demoSection.title')}</h2>
          <div className="bg-card rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-green-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">🥬</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{t('pages.index.demoSection.trackInventory')}</h3>
                <p className="text-muted-foreground text-sm">
                  {t('pages.index.demoSection.trackInventoryDescription')}
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{t('pages.index.demoSection.planTogether')}</h3>
                <p className="text-muted-foreground text-sm">
                  {t('pages.index.demoSection.planTogetherDescription')}
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">🛒</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{t('pages.index.demoSection.shopSmart')}</h3>
                <p className="text-muted-foreground text-sm">
                  {t('pages.index.demoSection.shopSmartDescription')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card/50 backdrop-blur-sm mt-16 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            {t('pages.index.footer')}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
