import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, LogOut, Copy, Eye, EyeOff } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from '@/stores/authStore';

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [googleToken, setGoogleToken] = useState<string>('');
  const [showToken, setShowToken] = useState(false);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { user, updateUser, signOut } = useAuthStore();

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
        title: "Token Copied!",
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
        title: "Profile Updated!",
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
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            <div className="w-9" /> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 rounded-lg p-1 h-auto">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="mt-4">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Manage your personal information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter your last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={user?.email} readOnly className="bg-gray-100" />
                  <p className="text-xs text-gray-500">Email cannot be changed.</p>
                </div>
                <Button 
                  className="w-full sm:w-auto" 
                  onClick={handleSaveChanges}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="mt-4">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure how you receive alerts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50/70">
                  <Label htmlFor="push-notifications" className="flex flex-col space-y-1 cursor-pointer flex-1">
                    <span className="font-medium">Push Notifications</span>
                    <span className="font-normal text-sm text-gray-500">
                      Receive alerts on your device.
                    </span>
                  </Label>
                  <Switch id="push-notifications" defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50/70">
                  <Label htmlFor="low-stock-alerts" className="flex flex-col space-y-1 cursor-pointer flex-1">
                    <span className="font-medium">Low Stock Alerts</span>
                    <span className="font-normal text-sm text-gray-500">
                      Notify me when items are running low.
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
                <CardTitle>Appearance Settings</CardTitle>
                <CardDescription>Customize the look and feel of the app.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50/70">
                  <Label htmlFor="dark-mode" className="flex flex-col space-y-1 cursor-pointer flex-1">
                    <span className="font-medium">Dark Mode</span>
                    <span className="font-normal text-sm text-gray-500">
                      Enable a darker color scheme.
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
                <CardTitle>Debug Information</CardTitle>
                <CardDescription>Developer tools and authentication tokens for API testing.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="google-token">Google Auth Token</Label>
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
                    Copy this token to use in API testing tools like Insomnia or Postman.
                    <br />
                    Add it as: <code className="bg-gray-100 px-1 rounded">Authorization: Bearer &lt;token&gt;</code>
                  </p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">API Testing Instructions:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Copy the token above using the copy button</li>
                    <li>Open Insomnia/Postman</li>
                    <li>Add header: <code className="bg-blue-100 px-1 rounded">Authorization: Bearer &lt;paste-token&gt;</code></li>
                    <li>Test API endpoints at: <code className="bg-blue-100 px-1 rounded">http://localhost:3001/api/households</code></li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <Button variant="destructive" className="w-full" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation currentPage="settings" />
    </div>
  );
};

export default Settings;
