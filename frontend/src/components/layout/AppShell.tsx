import { Outlet } from 'react-router-dom';

import { SidebarProvider } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSidebarPreferences } from '@/hooks/useSidebarPreferences';

import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

export const AppShell = () => {
  const isMobile = useIsMobile();
  const { collapsed, setCollapsed, storageExpanded, setStorageExpanded } =
    useSidebarPreferences();

  if (isMobile) {
    return <Outlet />;
  }

  return (
    <SidebarProvider
      open={!collapsed}
      onOpenChange={(open) => setCollapsed(!open)}
    >
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed(!collapsed)}
          storageExpanded={storageExpanded}
          onStorageExpandedChange={setStorageExpanded}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader />
          <main className="flex-1 min-w-0 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppShell;
