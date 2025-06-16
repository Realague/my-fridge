import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UserPlus, Mail, Trash2, ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import BottomNavigation from '@/components/BottomNavigation';
import StorageAreaManager from '@/components/StorageAreaManager';
import { toast } from 'sonner';

// Mock data for household members
const members = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'Admin',
    avatar: '',
    initials: 'JD',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    role: 'Member',
    avatar: '',
    initials: 'JS',
  },
  {
    id: '3',
    name: 'Peter Jones',
    email: 'peter.jones@example.com',
    role: 'Member',
    avatar: '',
    initials: 'PJ',
  },
];

// Mock data for households to get the name
const households = [
    { id: '1', name: 'The Smith Family' },
    { id: '2', name: 'Work Lunch Club' },
];

// Mock current user (in real app this would come from auth context)
const currentUser = members[0]; // John Doe (Admin)

const HouseholdDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const household = households.find(h => h.id === id) || { name: 'Household' };
  const isAdmin = currentUser.role === 'Admin';

  const handleLeaveHousehold = () => {
    toast.success('Left household successfully');
    navigate('/household');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate('/household')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Manage Household</h1>
            <Button variant="ghost" size="icon">
              <UserPlus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6 pb-24">
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>{household.name}</CardTitle>
            <CardDescription>{members.length} members</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full touch-friendly bg-gray-900 text-white hover:bg-gray-800">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite New Member
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full touch-friendly text-red-600 border-red-200 hover:bg-red-50">
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave Household
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave Household</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to leave "{household.name}"? You will lose access to all shared items, recipes, and meal plans.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLeaveHousehold} className="bg-red-600 hover:bg-red-700">
                    Leave Household
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Storage Management Section - Always visible for admins */}
        {isAdmin && <StorageAreaManager />}

        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Manage Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback className="bg-green-100 text-green-700 font-semibold">{member.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">
                      {member.name}
                      {member.id === currentUser.id && <span className="text-sm text-gray-500 ml-2">(You)</span>}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge 
                    variant={member.role === 'Admin' ? 'default' : 'secondary'}
                    className={member.role === 'Admin' ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                  >
                    {member.role}
                  </Badge>
                  {isAdmin && member.id !== currentUser.id && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50">
                       <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">No pending invitations.</p>
          </CardContent>
        </Card>
      </div>
      <BottomNavigation currentPage="household" />
    </div>
  );
};

export default HouseholdDetails;
