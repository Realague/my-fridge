
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Settings, User, Bell, Shield, LogOut } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut, isLoading } = useAuth();

  const handleLogout = () => {
    signOut();
    navigate('/auth');
  };

  const handleSaveProfile = () => {
    // TODO: Implement profile save functionality
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-orange-50 to-green-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to auth page if not logged in
    React.useEffect(() => {
      if (!isLoading) {
        navigate('/auth');
      }
    }, [isLoading, navigate]);
    return null;
  }
  
  const userInitials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Profile Card */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src="" alt="Profile" />
                <AvatarFallback className="text-lg bg-green-100 text-green-700">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">{user.firstName} {user.lastName}</CardTitle>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              <Button variant="outline" size="sm">
                Change Photo
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Personal Information */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  defaultValue={user.firstName}
                  className="touch-friendly"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  defaultValue={user.lastName}
                  className="touch-friendly"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                defaultValue={user.email}
                className="touch-friendly"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                className="touch-friendly"
              />
            </div>
            <Button onClick={handleSaveProfile} className="w-full touch-friendly">
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Household Settings */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Household Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="householdName">Household Name</Label>
              <Input
                id="householdName"
                defaultValue="The Doe Family"
                className="touch-friendly"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="members">Family Members</Label>
              <p className="text-sm text-gray-500">Manage who has access to your fridge</p>
              <Button variant="outline" className="w-full touch-friendly">
                Manage Members
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Expiration Notifications</p>
                <p className="text-sm text-gray-500">Get notified when items are about to expire</p>
              </div>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Shopping Reminders</p>
                <p className="text-sm text-gray-500">Weekly shopping list reminders</p>
              </div>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Meal Plan Notifications</p>
                <p className="text-sm text-gray-500">Reminders for planned meals</p>
              </div>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start touch-friendly">
              Change Password
            </Button>
            <Button variant="outline" className="w-full justify-start touch-friendly">
              Privacy Settings
            </Button>
            <Button variant="outline" className="w-full justify-start touch-friendly">
              Data Export
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="pt-6">
            <Button 
              variant="destructive" 
              className="w-full touch-friendly"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation currentPage="profile" />
    </div>
  );
};

export default Profile;
