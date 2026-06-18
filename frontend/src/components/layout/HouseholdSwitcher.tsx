import { ChevronDown, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/authStore';
import { useHouseholdStore } from '@/stores/householdStore';
import { getHouseholdInitials } from '@/utils/initials';

export const HouseholdSwitcher = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const setUser = useAuthStore((state) => state.setUser);
  const households = useHouseholdStore((state) => state.households);
  const selectedHouseholdId = useHouseholdStore((state) => state.selectedHouseholdId);
  const getCurrentHousehold = useHouseholdStore((state) => state.getCurrentHousehold);
  const selectHousehold = useHouseholdStore((state) => state.selectHousehold);

  const current = getCurrentHousehold();
  const hasMultiple = households.length > 1;
  const initials = getHouseholdInitials(current?.name);

  const handleSwitch = async (householdId: string) => {
    if (householdId === selectedHouseholdId) return;
    try {
      const user = await selectHousehold(householdId);
      if (user) setUser(user);
    } catch (error) {
      console.error('HouseholdSwitcher: failed to switch household', error);
    }
  };

  const trigger = (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar className="h-9 w-9 border border-border">
        <AvatarFallback className="bg-primary/10 text-sm font-semibold text-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col min-w-0 text-left">
        <span className="text-sm font-semibold text-foreground truncate">
          {current?.name ?? '—'}
        </span>
        {current ? (
          <span className="text-xs text-muted-foreground truncate">
            {t('header.members', { count: current.memberCount })}
          </span>
        ) : null}
      </div>
      {hasMultiple ? (
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      ) : null}
    </div>
  );

  if (!hasMultiple) {
    return (
      <div
        className="flex items-center gap-3 px-2 py-1 min-w-0"
        aria-label={t('header.currentHousehold')}
      >
        {trigger}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto px-2 py-1 -ml-2 hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={t('header.switchHousehold')}
        >
          {trigger}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>{t('header.switchHousehold')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={selectedHouseholdId ?? ''}
          onValueChange={handleSwitch}
        >
          {households.map((h) => (
            <DropdownMenuRadioItem key={h.id} value={h.id}>
              <span className="flex items-center gap-2 truncate">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-primary/10 text-[11px] font-semibold">
                    {getHouseholdInitials(h.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{h.name}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/household')}>
          <Users className="mr-2 h-4 w-4" />
          <span>{t('pages.dashboard.manageHouseholds')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
