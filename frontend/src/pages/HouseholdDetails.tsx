import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus, Trash2, ArrowLeft, LogOut, PenLine } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import BottomNavigation from '@/components/BottomNavigation';
import StorageAreaManager from '@/components/StorageAreaManager';
import { HouseholdExpirationSettings } from '@/components/HouseholdExpirationSettings';
import { useHouseholdStore } from '@/stores/householdStore';
import { useAuthStore } from '@/stores/authStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { getAppUrl } from '@/utils/apiHeaders';

type LoadPhase = 'loading' | 'ready' | 'not-found' | 'error';

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
  const updateHousehold = useHouseholdStore(state => state.updateHousehold);
  
  // Compute household details from stable reference
  const householdDetails = id ? householdDetailsMap[id] || null : null;

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [phase, setPhase] = useState<LoadPhase>('loading');

  // Load household details when component mounts (or when id changes).
  // Track the request lifecycle locally so the page can show a real loading
  // state instead of mistaking a pending fetch for a 404.
  useEffect(() => {
    if (!id) {
      setPhase('not-found');
      return;
    }
    let cancelled = false;
    setPhase('loading');
    fetchHouseholdDetails(id)
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setPhase('ready');
        } else {
          // Store sets `error` on real failures; no error means the API
          // returned no data for this id (treat as 404).
          const storeError = useHouseholdStore.getState().error;
          setPhase(storeError ? 'error' : 'not-found');
        }
      });
    return () => {
      cancelled = true;
    };
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

  const handleRenameHousehold = async () => {
    if (!id || !newName.trim()) return;
    
    try {
      await updateHousehold(id, newName.trim());
      setRenameDialogOpen(false);
      toast({
        title: t('messages.success.householdRenamed'),
      });
    } catch (error) {
      console.error('Error renaming household:', error);
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

  const handleRetry = () => {
    if (!id) return;
    setPhase('loading');
    fetchHouseholdDetails(id).then((result) => {
      if (result) {
        setPhase('ready');
      } else {
        const storeError = useHouseholdStore.getState().error;
        setPhase(storeError ? 'error' : 'not-found');
      }
    });
  };

  if (phase === 'loading' || (phase === 'ready' && !householdDetails)) {
    return (
      <div className="min-h-screen bg-background pb-24" aria-busy="true" aria-live="polite">
        <div className="bg-card/90 backdrop-blur-sm border-b border-border sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t('common.back')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Skeleton className="h-7 w-48" />
            <div className="h-9 w-9" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-6 space-y-6">
          <Card className="bg-card/90 backdrop-blur-sm border border-border/50 shadow-lg">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24 mt-2" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </CardContent>
          </Card>
          <Card className="bg-card/90 backdrop-blur-sm border border-border/50 shadow-lg">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === 'not-found' || !householdDetails) {
    return (
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center" role="alert">
        <div className="text-center max-w-sm px-4">
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('pages.household.householdNotFound')}</h3>
          <p className="text-muted-foreground mb-4">{t('pages.household.householdNotFoundDescription')}</p>
          <Button variant="green" onClick={() => navigate('/household')}>
            {t('pages.household.backToHouseholds')}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center" role="alert">
        <div className="text-center max-w-sm px-4">
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('pages.household.householdLoadFailed')}</h3>
          <p className="text-muted-foreground mb-4">{t('pages.household.householdLoadFailedDescription')}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="green" onClick={handleRetry}>
              {t('common.retry')}
            </Button>
            <Button variant="outline" onClick={() => navigate('/household')}>
              {t('pages.household.backToHouseholds')}
            </Button>
          </div>
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
    
    const appUrl = getAppUrl();
    const inviteLink = appUrl ? `${appUrl}/join?code=${encodeURIComponent(householdDetails.inviteCode)}` : '';
    const inviteMessage = t('messages.inviteMessageWithLink', {
      householdName: householdDetails.name,
      inviteLink: inviteLink || householdDetails.inviteCode,
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              aria-label={t('common.back')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">{t('pages.household.manageHousehold')}</h1>
            <Button variant="ghost" size="icon" aria-label={t('a11y.inviteMember')}>
              <UserPlus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6 pb-24">
        <Card className="bg-card/90 backdrop-blur-sm border border-border/50 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-1">
              <CardTitle>{householdDetails?.name}</CardTitle>
              {isAdmin && (
                <Dialog open={renameDialogOpen} onOpenChange={(open) => {
                  setRenameDialogOpen(open);
                  if (open) setNewName(householdDetails?.name || '');
                }}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={t('pages.household.renameHousehold')}
                    >
                      <PenLine className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('pages.household.renameHousehold')}</DialogTitle>
                      <DialogDescription>{t('pages.household.renameHouseholdDescription')}</DialogDescription>
                    </DialogHeader>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={t('pages.household.namePlaceholder')}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRenameHousehold(); }}
                      autoFocus
                    />
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
                        {t('buttons.cancel')}
                      </Button>
                      <Button variant="green" onClick={handleRenameHousehold} disabled={!newName.trim() || newName.trim() === householdDetails?.name}>
                        {t('buttons.save')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <CardDescription>{t('pages.dashboard.members', { count: members.length })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="green"
              className="w-full"
              onClick={handleInviteMember}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t('buttons.inviteNewMember')}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="delete" className="w-full touch-friendly">
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
                  <AlertDialogAction onClick={ members.length <= 1 && isAdmin ? handleRemoveHousehold : handleLeaveHousehold} className="text-foreground bg-destructive hover:bg-destructive/90">
                    {  members.length <= 1 && isAdmin ? t('buttons.removeHousehold') : t('buttons.leaveHousehold')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Expiration alerts setting - any household member can adjust */}
        {id && <HouseholdExpirationSettings householdId={id} />}

        {/* Storage Management Section - Always visible for admins */}
        {isAdmin && <StorageAreaManager />}

        <Card className="bg-card/90 backdrop-blur-sm border border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle>{t('pages.household.manageMembers')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 bg-muted rounded-xl border border-border">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarFallback className="rounded-full bg-card text-foreground font-semibold">
                      {(member.firstName?.charAt(0) || '') + (member.lastName?.charAt(0) || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">
                      {`${member.firstName || ''} ${member.lastName || ''}`.trim()}
                      {member.id === currentUser?.id && <span className="text-sm text-muted-foreground ml-2">{t('pages.household.you')}</span>}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{member.email || ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge 
                    variant={member.HouseholdMember.role === 'admin' ? 'default' : 'secondary'}
                    className="bg-card text-foreground"
                  >
                    {member.HouseholdMember.role}
                  </Badge>
                  {isAdmin && member.id !== currentUser?.id && (
                    <Button
                      variant="deleteTrash"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemoveMember(member.id, `${member.firstName || ''} ${member.lastName || ''}`.trim())}
                      aria-label={t('a11y.removeMember', { name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email || '' })}
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
      <BottomNavigation currentPage="more" />
    </div>
  );
};

export default HouseholdDetails;
