import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, LogOut, Copy, Eye, EyeOff, Globe } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from '@/stores/authStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { usePushNotificationsStore } from '@/stores/pushNotificationsStore';
import { isPushSupported } from '@/utils/pushSubscription';

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  
  // Protected route hook handles auth and household checks
  useProtectedRoute();
  
  const [googleToken, setGoogleToken] = useState<string>('');
  const [showToken, setShowToken] = useState(false);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingLowStockAlerts, setIsUpdatingLowStockAlerts] = useState(false);
  const { user, updateUser, signOut, tokens } = useAuthStore();

  const pushSupported = isPushSupported();
  const pushPermission = usePushNotificationsStore((s) => s.permission);
  const pushSubscribed = usePushNotificationsStore((s) => s.subscribed);
  const pushIsLoading = usePushNotificationsStore((s) => s.isLoading);
  const pushInitialized = usePushNotificationsStore((s) => s.initialized);
  const initPush = usePushNotificationsStore((s) => s.init);
  const enablePush = usePushNotificationsStore((s) => s.enable);
  const disablePush = usePushNotificationsStore((s) => s.disable);

  useEffect(() => {
    if (pushSupported && !pushInitialized) {
      void initPush();
    }
  }, [pushSupported, pushInitialized, initPush]);

  const handlePushToggle = async (checked: boolean) => {
    if (checked) {
      const result = await enablePush();
      if (result.ok) {
        toast({
          title: t('pages.dashboard.expiringSoon.pushOptIn.enabledToast'),
        });
      } else if (result.reason === 'denied') {
        toast({
          variant: 'destructive',
          title: t('pages.dashboard.expiringSoon.pushOptIn.deniedToast'),
        });
      } else {
        toast({
          variant: 'destructive',
          title: t('messages.error.requestFailed'),
        });
      }
    } else {
      const result = await disablePush();
      if (!result.ok) {
        toast({
          variant: 'destructive',
          title: t('messages.error.requestFailed'),
        });
      }
    }
  };

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  useEffect(() => {
    // Get the access token from auth store (OAuth2 flow)
    setGoogleToken(tokens?.accessToken || 'No token found');
    
    // Initialize form fields with current user data
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [user, tokens]);

  const copyTokenToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(googleToken);
      toast({
        title: t('messages.success.inviteCopied'),
        description: "Google token has been copied to clipboard for API testing.",
      });
    } catch (err) {
      toast({
        title: t('messages.error.copyFailed'),
        description: t('messages.error.couldNotCopyToken'),
        variant: "destructive",
      });
    }
  };

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    toast({
      title: t('messages.success.settingsSaved'),
      description: `Language changed to ${languages.find(lang => lang.code === languageCode)?.name}`,
    });
  };

  const handleSaveChanges = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: t('messages.error.validationError'),
        description: t('messages.error.firstNameLastNameRequired'),
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      await updateUser({ firstName: firstName.trim(), lastName: lastName.trim() });
      toast({
        title: t('messages.success.settingsSaved'),
        description: t('messages.success.profileUpdated'),
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: t('messages.error.updateFailed'),
        description: error instanceof Error ? error.message : t('messages.error.failedToUpdateProfile'),
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    navigate('/auth');
  };

  const lowStockAlertsEnabled = user?.lowStockAlertsEnabled !== false;

  const handleLowStockAlertsChange = async (enabled: boolean) => {
    setIsUpdatingLowStockAlerts(true);
    try {
      await updateUser({ lowStockAlertsEnabled: enabled });
      toast({
        title: t('messages.success.settingsSaved'),
      });
    } catch (error) {
      console.error('Error updating low stock alerts preference:', error);
      toast({
        title: t('messages.error.updateFailed'),
        description: error instanceof Error ? error.message : t('messages.error.failedToUpdateProfile'),
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingLowStockAlerts(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card/90 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">{t('pages.settings.title')}</h1>
            <div className="w-9" /> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-1 bg-muted rounded-lg p-1 h-auto">
             <TabsTrigger value="profile" className="min-h-10 w-full">
               {t('pages.settings.tabs.profile')}
             </TabsTrigger>
             <TabsTrigger value="notifications" className="min-h-10 w-full">
               {t('pages.settings.tabs.notifications')}
             </TabsTrigger>
             <TabsTrigger value="appearance" className="min-h-10 w-full">
               {t('pages.settings.tabs.appearance')}
             </TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="mt-4">
            <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                 <CardTitle>{t('pages.settings.profileSettings.title')}</CardTitle>
                 <CardDescription>{t('pages.settings.profileSettings.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t('forms.firstName')}</Label>
                  <Input 
                    id="firstName" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t('pages.settings.profileSettings.enterFirstName')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t('forms.lastName')}</Label>
                  <Input 
                    id="lastName" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t('pages.settings.profileSettings.enterLastName')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('forms.email')}</Label>
                  <Input id="email" type="email" defaultValue={user?.email} readOnly className="bg-muted bg-background" />
                  <p className="text-xs text-muted-foreground">{t('pages.settings.profileSettings.emailCannotBeChanged')}</p>
                </div>
                <Button 
                  className="w-full sm:w-auto" 
                  variant="green"
                  onClick={handleSaveChanges}
                  disabled={isUpdating}
                >
                  {isUpdating ? t('pages.settings.profileSettings.saving') : t('buttons.save')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="mt-4">
            <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                 <CardTitle>{t('pages.settings.notificationSettings.title')}</CardTitle>
                 <CardDescription>{t('pages.settings.notificationSettings.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pushSupported && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/70">
                    <Label htmlFor="push-notifications" className="flex flex-col space-y-1 cursor-pointer flex-1">
                       <span className="font-medium">{t('pages.settings.notificationSettings.pushNotifications')}</span>
                       <span className="font-normal text-sm text-muted-foreground">
                         {pushPermission === 'denied'
                           ? t('pages.settings.notificationSettings.pushDeniedHelp')
                           : t('pages.settings.notificationSettings.pushDescription')}
                       </span>
                    </Label>
                    <Switch
                      id="push-notifications"
                      checked={pushSubscribed}
                      disabled={pushIsLoading || pushPermission === 'denied' || !pushInitialized}
                      onCheckedChange={handlePushToggle}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/70">
                  <Label htmlFor="low-stock-alerts" className="flex flex-col space-y-1 cursor-pointer flex-1">
                     <span className="font-medium">{t('pages.settings.notificationSettings.lowStockAlerts')}</span>
                     <span className="font-normal text-sm text-muted-foreground">
                       {t('pages.settings.notificationSettings.lowStockDescription')}
                     </span>
                  </Label>
                  <Switch
                    id="low-stock-alerts"
                    checked={lowStockAlertsEnabled}
                    disabled={isUpdatingLowStockAlerts}
                    onCheckedChange={handleLowStockAlertsChange}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="mt-4">
            <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>{t('pages.settings.appearance')}</CardTitle>
                <CardDescription>{t('pages.settings.appearanceSettings.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="language-select" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {t('pages.settings.language')}
                  </Label>
                  <Select value={i18n.language} onValueChange={handleLanguageChange}>
                    <SelectTrigger id="language-select">
                      <SelectValue placeholder={t('common.selectLanguage')} />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((language) => (
                        <SelectItem key={language.code} value={language.code}>
                          <div className="flex items-center gap-2">
                            <span>{language.flag}</span>
                            <span>{language.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t('pages.settings.appearanceSettings.languageDescription')}</p>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <Label htmlFor="dark-mode" className="flex flex-col space-y-1 cursor-pointer flex-1">
                     <span className="font-medium">{t('pages.settings.appearanceSettings.darkMode')}</span>
                     <span className="font-normal text-sm text-muted-foreground">
                       {t('pages.settings.appearanceSettings.darkModeDescription')}
                     </span>
                  </Label>
                  <Switch 
                    id="dark-mode" 
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <Button variant="destructive" className="w-full" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              {t('pages.settings.logOut')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation currentPage="settings" />
    </div>
  );
};

export default Settings;
