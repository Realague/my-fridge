import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Mail, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '@/components/BottomNavigation';

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

const Household = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Household</h1>
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
            <CardTitle>The Smith Family</CardTitle>
            <CardDescription>3 members</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full touch-friendly bg-gray-900 text-white hover:bg-gray-800">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite New Member
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Manage Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback className="bg-green-100 text-green-700">{member.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={member.role === 'Admin' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-800'}>{member.role}</Badge>
                  <Button variant="ghost" size="icon" className="text-gray-500 hover:text-red-500">
                     <Trash2 className="h-4 w-4" />
                  </Button>
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

export default Household;
