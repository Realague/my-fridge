
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, User, Users, Bell, Palette, LogOut, ChevronRight } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';

const Settings = () => {
  const navigate = useNavigate();

  const settingsOptions = [
    {
      title: 'Profile',
      description: 'Manage your personal information',
      icon: <User className="h-5 w-5 text-gray-500" />,
      onClick: () => { /* Placeholder for future navigation */ },
    },
    {
      title: 'Household',
      description: 'Manage members and household settings',
      icon: <Users className="h-5 w-5 text-gray-500" />,
      onClick: () => navigate('/household'),
    },
    {
      title: 'Notifications',
      description: 'Configure how you receive alerts',
      icon: <Bell className="h-5 w-5 text-gray-500" />,
      onClick: () => { /* Placeholder for future navigation */ },
    },
    {
      title: 'Appearance',
      description: 'Customize the look and feel',
      icon: <Palette className="h-5 w-5 text-gray-500" />,
      onClick: () => { /* Placeholder for future navigation */ },
    },
  ];

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
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-0">
            <ul className="divide-y divide-gray-200">
              {settingsOptions.map((option, index) => (
                <li key={index} onClick={option.onClick} className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-100 p-3 rounded-full">
                      {option.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{option.title}</p>
                      <p className="text-sm text-gray-500">{option.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

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
