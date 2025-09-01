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

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  
  // Protected route hook handles auth and household checks
  useProtectedRoute();
  
  const [googleToken, setGoogleToken] = useState<string>('');
  const [showToken, setShowToken] = useState(false);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { user, updateUser, signOut } = useAuthStore();

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  useEffect(() => {
    // Get the Google token from localStorage
    const token = localStorage.getItem('google_token');
    setGoogleToken(token || 'No token found');
    
    // Initialize form fields with current user data
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [user]);

  const copyTokenToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(googleToken);
      toast({
        title: t('messages.success.inviteCopied'),
        description: "Google token has been copied to clipboard for API testing.",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy token to clipboard.",
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
        title: "Validation Error",
        description: "First name and last name are required.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      await updateUser(firstName.trim(), lastName.trim());
      toast({
        title: t('messages.success.settingsSaved'),
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-gray-900">{t('pages.settings.title')}</h1>
            <div className="w-9" /> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 rounded-lg p-1 h-auto">
             <TabsTrigger value="profile">{t('pages.settings.tabs.profile')}</TabsTrigger>
             <TabsTrigger value="notifications">{t('pages.settings.tabs.notifications')}</TabsTrigger>
             <TabsTrigger value="appearance">{t('pages.settings.tabs.appearance')}</TabsTrigger>
             <TabsTrigger value="debug">{t('pages.settings.tabs.debug')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="mt-4">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
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
                  <Input id="email" type="email" defaultValue={user?.email} readOnly className="bg-gray-100" />
                  <p className="text-xs text-gray-500">{t('pages.settings.profileSettings.emailCannotBeChanged')}</p>
                </div>
                <Button 
                  className="w-full sm:w-auto" 
                  onClick={handleSaveChanges}
                  disabled={isUpdating}
                >
                  {isUpdating ? t('pages.settings.profileSettings.saving') : t('buttons.save')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="mt-4">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                 <CardTitle>{t('pages.settings.notificationSettings.title')}</CardTitle>
                 <CardDescription>{t('pages.settings.notificationSettings.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50/70">
                  <Label htmlFor="push-notifications" className="flex flex-col space-y-1 cursor-pointer flex-1">
                     <span className="font-medium">{t('pages.settings.notificationSettings.pushNotifications')}</span>
                     <span className="font-normal text-sm text-gray-500">
                       {t('pages.settings.notificationSettings.pushDescription')}
                     </span>
                  </Label>
                  <Switch id="push-notifications" defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50/70">
                  <Label htmlFor="low-stock-alerts" className="flex flex-col space-y-1 cursor-pointer flex-1">
                     <span className="font-medium">{t('pages.settings.notificationSettings.lowStockAlerts')}</span>
                     <span className="font-normal text-sm text-gray-500">
                       {t('pages.settings.notificationSettings.lowStockDescription')}
                     </span>
                  </Label>
                  <Switch id="low-stock-alerts" defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="mt-4">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
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
                  <p className="text-xs text-gray-500">{t('pages.settings.appearanceSettings.languageDescription')}</p>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50/70">
                  <Label htmlFor="dark-mode" className="flex flex-col space-y-1 cursor-pointer flex-1">
                     <span className="font-medium">{t('pages.settings.appearanceSettings.darkMode')}</span>
                     <span className="font-normal text-sm text-gray-500">
                       {t('pages.settings.appearanceSettings.darkModeDescription')}
                     </span>
                  </Label>
                  <Switch id="dark-mode" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="debug" className="mt-4">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                 <CardTitle>{t('pages.settings.debugSettings.title')}</CardTitle>
                 <CardDescription>{t('pages.settings.debugSettings.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="google-token">{t('pages.settings.debugSettings.googleAuthToken')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="google-token"
                      type={showToken ? "text" : "password"}
                      value={googleToken}
                      readOnly
                      className="font-mono text-xs bg-gray-50"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowToken(!showToken)}
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyTokenToClipboard}
                      disabled={!googleToken || googleToken === 'No token found'}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                   <p className="text-xs text-gray-500">
                     {t('pages.settings.debugSettings.tokenDescription')}
                     <br />
                     {t('pages.settings.debugSettings.authorizationHeader')}: <code className="bg-gray-100 px-1 rounded">Authorization: Bearer &lt;token&gt;</code>
                   </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
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
