import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { DESKTOP_NAV_ITEMS } from '@/config/desktopNavigation';

import { SidebarStorageGroup } from './SidebarStorageGroup';

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  storageExpanded: boolean;
  onStorageExpandedChange: (value: boolean) => void;
}

export const AppSidebar = ({
  collapsed,
  onToggleCollapsed,
  storageExpanded,
  onStorageExpandedChange,
}: AppSidebarProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const isItemActive = (to: string, matchPaths?: string[]) => {
    if (matchPaths) {
      return matchPaths.some(
        (p) => location.pathname === p || location.pathname.startsWith(`${p}/`),
      );
    }
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className={cn('py-3', collapsed ? 'px-2' : 'px-3')}>
        <div
          className={cn(
            'flex items-center overflow-hidden',
            collapsed ? 'justify-center' : 'gap-2',
          )}
        >
          <img
            src="/icons/icon-72x72.png"
            alt=""
            aria-hidden="true"
            className="h-7 w-7 shrink-0 rounded-md"
          />
          {!collapsed && (
            <span className="font-display text-base font-semibold tracking-tight">
              MyFridge
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-2">
          <SidebarMenu>
            {DESKTOP_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const label = t(item.labelKey);
              const active = isItemActive(item.to, item.matchPaths);
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={active}
                    tooltip={label}
                    onClick={() => navigate(item.to)}
                    aria-label={label}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}

            <SidebarStorageGroup
              collapsed={collapsed}
              expanded={storageExpanded}
              onExpandedChange={onStorageExpandedChange}
            />
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4 shrink-0" />
              <span className="text-xs">{t('sidebar.collapse')}</span>
            </>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
