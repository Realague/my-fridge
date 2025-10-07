import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Plus, Users, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StorageArea } from '@/types/household';
import { OnboardingStorageSelector } from '@/components/OnboardingStorageSelector';
import { useHouseholdStore } from '@/stores/householdStore';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const Onboarding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuthStore();
  const createHousehold = useHouseholdStore(state => state.createHousehold);
  const joinHousehold = useHouseholdStore(state => state.joinHousehold);
  
  const [step, setStep] = useState(1);
  const [householdName, setHouseholdName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [storageAreas, setStorageAreas] = useState<StorageArea[]>([]);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Show loading spinner while auth is loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
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

  const handleCreateHousehold = async () => {
    try {
      // Validate inputs
      if (!householdName.trim()) {
        toast({
          title: t('messages.error.invalidInput'),
          description: t('messages.error.householdNameRequired'),
          variant: "destructive",
        });
        return;
      }

      await createHousehold(householdName.trim(), undefined, storageAreas);

      toast({
        title: t('messages.success.householdCreated'),
        description: t('messages.success.householdCreatedDescription', { 
          name: householdName.trim(),
          count: storageAreas.length
        }),
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to create household:', error);
      toast({
        title: t('messages.error.creationFailed'),
        description: t('messages.error.failedToCreateHousehold'),
        variant: "destructive",
      });
    }
  };

  const handleJoinHousehold = async () => {
    try {
      // Validate inputs
      if (!joinCode.trim() || joinCode.trim().length !== 8) {
        toast({ 
          title: t('messages.error.invalidJoinCode'),
          description: t('messages.error.invalidJoinCodeDescription'),
          variant: "destructive",
        });
        return;
      }

      await joinHousehold(joinCode.trim());
      
      // Show success toast with translation
      toast({
        title: t('messages.success.householdJoined'),
        description: t('messages.success.householdJoinedDescription'),
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to join household:', error);
      toast({
        title: t('messages.error.joinFailed'),
        description: t('messages.error.failedToJoinHousehold'),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {step === 1 && (
          <Card className="bg-card backdrop-blur-sm border border-border/50 shadow-xl">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
                <span className="text-2xl">🏠</span>
              </div>
              <CardTitle className="text-2xl">{t('pages.household.setupHousehold')}</CardTitle>
              <CardDescription>
                {t('pages.household.setupHouseholdDescription')}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Button
                onClick={() => setStep(2)}
                className="w-full h-16 bg-primary hover:bg-primary/90 text-primary-foreground text-left justify-start px-6"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-background/20 rounded-lg flex items-center justify-center mr-4">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{t('pages.household.createNewHousehold')}</div>
                    <div className="text-sm opacity-90">{t('pages.household.createNewHouseholdDescription')}</div>
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => setStep(4)}
                variant="outline"
                className="w-full h-16 text-left justify-start px-6"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mr-4">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{t('pages.household.joinExistingHousehold')}</div>
                    <div className="text-sm opacity-75">{t('pages.household.joinExistingHouseholdDescription')}</div>
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="bg-card backdrop-blur-sm border border-border/50 shadow-xl">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
                <Plus className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">{t('pages.household.createYourHousehold')}</CardTitle>
              <CardDescription>
                {t('pages.household.createYourHouseholdDescription')}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="household-name">{t('pages.household.householdName')}</Label>
                <Input
                  id="household-name"
                  placeholder={t('pages.household.namePlaceholder')}
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
                  {t('buttons.back')}
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!householdName.trim()}
                  className="flex-1"
                >
                  {t('buttons.next')} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="bg-card backdrop-blur-sm border border-border/50 shadow-xl">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
                <span className="text-2xl">🏺</span>
              </div>
              <CardTitle className="text-2xl">{t('pages.household.setupStorageAreas')}</CardTitle>
              <CardDescription>
                {t('pages.household.setupStorageAreasDescription')}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <OnboardingStorageSelector
                selectedAreas={storageAreas}
                onAreasChange={setStorageAreas}
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('buttons.back')}
                </Button>
                <Button
                  onClick={handleCreateHousehold}
                  className="flex-1"
                >
                  {t('buttons.create')} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="bg-card backdrop-blur-sm border border-border/50 shadow-xl">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center">
                <Users className="h-8 w-8 text-secondary-foreground" />
              </div>
              <CardTitle className="text-2xl">{t('pages.household.joinHousehold')}</CardTitle>
              <CardDescription>
                {t('pages.household.joinHouseholdDescription')}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="join-code">{t('pages.household.inviteCode')}</Label>
                <Input
                  id="join-code"
                  placeholder={t('pages.household.inviteCodePlaceholder')}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="h-12 text-center text-lg tracking-widest"
                  maxLength={8}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('buttons.back')}
                </Button>
                <Button
                  onClick={handleJoinHousehold}
                  disabled={joinCode.length !== 8}
                  className="flex-1"
                >
                  {t('buttons.join')} <ArrowRight className="ml-2 h-4 w-4" />
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
