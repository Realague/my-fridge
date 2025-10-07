import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UserPlus, Trash2, ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import BottomNavigation from '@/components/BottomNavigation';
import StorageAreaManager from '@/components/StorageAreaManager';
import { useHouseholdStore } from '@/stores/householdStore';
import { useAuthStore } from '@/stores/authStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const HouseholdDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  
  // Protected route hook handles auth and household checks
  useProtectedRoute();
  
  const { user: currentUser } = useAuthStore();
  
  // Zustand store - selective subscriptions
  const householdDetailsMap = useHouseholdStore(state => state.householdDetails);
  const fetchHouseholdDetails = useHouseholdStore(state => state.fetchHouseholdDetails);
  const removeMember = useHouseholdStore(state => state.removeMember);
  const leaveHousehold = useHouseholdStore(state => state.leaveHousehold);
  const deleteHousehold = useHouseholdStore(state => state.deleteHousehold);
  
  // Compute household details from stable reference
  const householdDetails = id ? householdDetailsMap[id] || null : null;

  // Load household details when component mounts
  useEffect(() => {
    if (id) {
      fetchHouseholdDetails(id);
    }
  }, [id, fetchHouseholdDetails]);

  const handleLeaveHousehold = async () => {
    if (!id) return;
    
    try {
      await leaveHousehold(id);
      navigate('/household');
    } catch (error) {
      console.error('Error leaving household:', error);
      // The useHouseholds hook already handles toast notifications for errors
    }
  };

  const handleRemoveHousehold = async () => {
    if (!id) return;
    
    try {
      await deleteHousehold(id);
      navigate('/household');
    } catch (error) {
      console.error('Error removing household:', error);
    }
  };

  if (!householdDetails) {
    return (
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('pages.household.householdNotFound')}</h3>
          <p className="text-muted-foreground mb-4">{t('pages.household.householdNotFoundDescription')}</p>
          <Button onClick={() => navigate('/household')}>
            {t('pages.household.backToHouseholds')}
          </Button>
        </div>
      </div>
    );
  }

  const members = Array.isArray(householdDetails?.members) ? householdDetails.members : [];
  
  // Find current user's role in this household
  const currentUserMember = members.find(member => member.id === currentUser?.id);
  const isAdmin = currentUserMember?.HouseholdMember.role === 'admin';

  const handleInviteMember = async () => {
    if (!householdDetails?.inviteCode) return;
    
    const inviteMessage = t('messages.inviteMessage', { 
      householdName: householdDetails.name, 
      inviteCode: householdDetails.inviteCode 
    });
    
    try {
      await navigator.clipboard.writeText(inviteMessage);
      toast({
        title: t('messages.success.inviteCopied'),
        description: t('common.description'),
      });
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteMessage;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: t('messages.success.inviteCopied'),
        description: t('common.description'),
      });
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!id) return;
    
    const confirmed = window.confirm(t('pages.household.confirmationMemberRemoval', { name: memberName }));
    if (!confirmed) return;
    
    try {
      await removeMember(id, memberId);
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card/90 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate('/household')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">{t('pages.household.manageHousehold')}</h1>
            <Button variant="ghost" size="icon">
              <UserPlus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6 pb-24">
        <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>{householdDetails?.name}</CardTitle>
            <CardDescription>{members.length} {t('pages.household.members')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full touch-friendly bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleInviteMember}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t('buttons.inviteNewMember')}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full touch-friendly text-destructive border-destructive/20 hover:bg-destructive/10">
                  <LogOut className="h-4 w-4 mr-2" />
                  { members.length <= 1 && isAdmin ? t('buttons.removeHousehold') : t('pages.household.leaveHousehold')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{ members.length <= 1 && isAdmin ? t('buttons.removeHousehold') : t('pages.household.leaveHousehold')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('pages.household.leaveHouseholdDescription', { name: householdDetails.name })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('buttons.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={ members.length <= 1 && isAdmin ? handleRemoveHousehold : handleLeaveHousehold} className="bg-destructive hover:bg-destructive/90">
                    {  members.length <= 1 && isAdmin ? t('buttons.removeHousehold') : t('buttons.leaveHousehold')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Storage Management Section - Always visible for admins */}
        {isAdmin && <StorageAreaManager />}

        <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>{t('pages.household.manageMembers')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {(member.firstName?.charAt(0) || '') + (member.lastName?.charAt(0) || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">
                      {`${member.firstName || ''} ${member.lastName || ''}`.trim()}
                      {member.id === currentUser?.id && <span className="text-sm text-muted-foreground ml-2">({t('pages.household.you')})</span>}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{member.email || ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge 
                    variant={member.HouseholdMember.role === 'admin' ? 'default' : 'secondary'}
                  >
                    {member.HouseholdMember.role}
                  </Badge>
                  {isAdmin && member.id !== currentUser?.id && (
                    <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveMember(member.id, `${member.firstName || ''} ${member.lastName || ''}`.trim())}
                  >
                     <Trash2 className="h-4 w-4" />
                  </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <BottomNavigation currentPage="household" />
    </div>
  );
};

export default HouseholdDetails;
