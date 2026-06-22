import { useEffect, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import AddStorageAreaDialog from '@/components/AddStorageAreaDialog';
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { StorageAreaIcon } from '@/utils/storageAreaIcons';
import { useHouseholdStore } from '@/stores/householdStore';
import { useStorageAreaStore } from '@/stores/storageAreaStore';
import { STORAGE_GROUP } from '@/config/desktopNavigation';
import type { StorageArea } from '@/services/storageAreaService';

interface SidebarStorageGroupProps {
  collapsed: boolean;
  expanded: boolean;
  onExpandedChange: (value: boolean) => void;
}

export const SidebarStorageGroup = ({
  collapsed,
  expanded,
  onExpandedChange,
}: SidebarStorageGroupProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const Icon = STORAGE_GROUP.icon;
  const [addOpen, setAddOpen] = useState(false);

  const selectedHouseholdId = useHouseholdStore((s) => s.selectedHouseholdId);
  const storageAreasByHousehold = useStorageAreaStore((s) => s.storageAreasByHousehold);
  const fetchStorageAreas = useStorageAreaStore((s) => s.fetchStorageAreas);

  const storageAreas: StorageArea[] = selectedHouseholdId
    ? storageAreasByHousehold[selectedHouseholdId] ?? []
    : [];

  const isStorageRouteActive = location.pathname.startsWith('/storage/');
  const label = t(STORAGE_GROUP.labelKey);
  const addLabel = t('sidebar.addStorage');
  const emptyLabel = t('sidebar.noStorageAreas');

  // Lazy-fetch when the user opens the group and we don't have data yet.
  useEffect(() => {
    if ((expanded || collapsed) && selectedHouseholdId && storageAreas.length === 0) {
      void fetchStorageAreas();
    }
  }, [expanded, collapsed, selectedHouseholdId, storageAreas.length, fetchStorageAreas]);

  const handleAddStorage = () => setAddOpen(true);

  const renderArea = (area: StorageArea) => {
    const isActive = location.pathname === `/storage/${area.id}`;
    return (
      <SidebarMenuSubItem key={area.id}>
        <SidebarMenuSubButton
          asChild
          isActive={isActive}
          onClick={(event) => {
            event.preventDefault();
            navigate(`/storage/${area.id}`);
          }}
        >
          <a href={`/storage/${area.id}`} className="flex items-center gap-2 min-w-0">
            <StorageAreaIcon type={area.type} className="h-4 w-4 shrink-0" />
            <span className="truncate">{area.name}</span>
          </a>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  };

  const addDialog = (
    <AddStorageAreaDialog open={addOpen} onOpenChange={setAddOpen} />
  );

  // Collapsed mode: clicking the icon opens a popover with the list of storages.
  if (collapsed) {
    return (
      <>
      {addDialog}
      <SidebarMenuItem>
        <Popover>
          <PopoverTrigger asChild>
            <SidebarMenuButton
              tooltip={label}
              isActive={isStorageRouteActive}
              aria-label={label}
            >
              <Icon />
              <span>{label}</span>
            </SidebarMenuButton>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            sideOffset={8}
            className="w-64 p-2"
          >
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <ScrollArea className="max-h-72">
              {storageAreas.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">{emptyLabel}</p>
              ) : (
                <ul className="space-y-1">
                  {storageAreas.map((area) => {
                    const isActive = location.pathname === `/storage/${area.id}`;
                    return (
                      <li key={area.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/storage/${area.id}`)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            isActive && 'bg-muted font-medium text-foreground',
                          )}
                        >
                          <StorageAreaIcon type={area.type} className="h-4 w-4 shrink-0" />
                          <span className="truncate">{area.name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
            <button
              type="button"
              onClick={handleAddStorage}
              className="mt-2 flex w-full items-center gap-2 rounded-md border border-dashed border-border px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              <span>{addLabel}</span>
            </button>
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
      </>
    );
  }

  // Expanded mode: header toggles open/close, sub-items render inline.
  return (
    <>
      {addDialog}
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={isStorageRouteActive}
          onClick={() => onExpandedChange(!expanded)}
          aria-expanded={expanded}
          aria-controls="sidebar-storage-areas"
          tooltip={label}
        >
          <Icon />
          <span className="flex-1">{label}</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform shrink-0',
              expanded ? 'rotate-0' : '-rotate-90',
            )}
            aria-hidden="true"
          />
        </SidebarMenuButton>
      </SidebarMenuItem>

      {expanded && (
        <SidebarMenuSub id="sidebar-storage-areas">
          {storageAreas.length === 0 ? (
            <li className="px-2 py-1.5 text-xs text-muted-foreground">
              {emptyLabel}
            </li>
          ) : (
            <ScrollArea className="max-h-72">
              {storageAreas.map(renderArea)}
            </ScrollArea>
          )}
          <SidebarMenuSubItem>
            <SidebarMenuSubButton asChild>
              <button
                type="button"
                onClick={handleAddStorage}
                className="flex w-full items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
                <span>{addLabel}</span>
              </button>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        </SidebarMenuSub>
      )}
    </>
  );
};

