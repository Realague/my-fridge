import {
  Bell,
  ChevronDown,
  Home,
  LogOut,
  Sliders,
  User,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/authStore';
import { getUserInitials } from '@/utils/initials';

export const UserMenu = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  const initials = getUserInitials(user?.firstName, user?.lastName, user?.email);
  const displayName = user?.firstName?.trim() || user?.email?.split('@')[0] || '';

  const handleSignOut = () => {
    signOut();
    navigate('/auth');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto gap-2 px-2 py-1 hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={t('header.openUserMenu')}
        >
          <Avatar className="h-8 w-8 border border-border">
            <AvatarFallback className="bg-primary/15 text-xs font-semibold text-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden lg:inline text-sm font-medium text-foreground max-w-[7rem] truncate">
            {displayName}
          </span>
          <ChevronDown className="hidden md:inline h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => navigate('/settings?tab=profile')}>
          <User className="mr-2 h-4 w-4" />
          <span>{t('header.userMenu.profile')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings?tab=appearance')}>
          <Sliders className="mr-2 h-4 w-4" />
          <span>{t('header.userMenu.preferences')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings?tab=notifications')}>
          <Bell className="mr-2 h-4 w-4" />
          <span>{t('header.userMenu.notifications')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/household')}>
          <Home className="mr-2 h-4 w-4" />
          <span>{t('header.userMenu.household')}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('header.userMenu.signOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
