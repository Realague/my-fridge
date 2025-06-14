import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, LogOut } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const Settings = () => {
  const navigate = useNavigate();

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
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-lg p-1 h-auto">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="mt-4">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Manage your personal information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" defaultValue="The Smith Family" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="smith.family@example.com" readOnly className="bg-gray-100" />
                  <p className="text-xs text-gray-500">Email cannot be changed.</p>
                </div>
                <Button className="w-full sm:w-auto">Save Changes</Button>
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
                  <Label htmlFor="email-notifications" className="flex flex-col space-y-1 cursor-pointer flex-1">
                    <span className="font-medium">Email Notifications</span>
                    <span className="font-normal text-sm text-gray-500">
                      Get weekly summaries and important alerts.
                    </span>
                  </Label>
                  <Switch id="email-notifications" />
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
        </Tabs>

        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <Button variant="destructive" className="w-full">
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
