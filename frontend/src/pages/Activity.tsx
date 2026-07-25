import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity as ActivityIcon } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { useActivityStore } from '@/stores/activityStore';
import { useAuthStore } from '@/stores/authStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { ActivityDayGroup } from '@/components/activity/ActivityDayGroup';
import { groupByDay } from '@/components/activity/activityTime';

const Activity = () => {
  const { t } = useTranslation();
  const { selectedHouseholdId, isLoading: authLoading, hasHousehold } = useProtectedRoute();

  const currentUserId = useAuthStore((s) => s.user?.id);
  const feed = useActivityStore((s) => s.feed);
  const loading = useActivityStore((s) => s.loading);
  const loadingMore = useActivityStore((s) => s.loadingMore);
  const hasMore = useActivityStore((s) => s.hasMore);
  const loadFeed = useActivityStore((s) => s.loadFeed);
  const loadMore = useActivityStore((s) => s.loadMore);

  useEffect(() => {
    if (selectedHouseholdId && !authLoading && hasHousehold) {
      loadFeed(selectedHouseholdId);
    }
  }, [selectedHouseholdId, authLoading, hasHousehold, loadFeed]);

  const groups = useMemo(() => groupByDay(feed, t), [feed, t]);

  if (authLoading || !hasHousehold) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mf-green mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-10">
      {/* En-tête aligné sur le pattern des pages-flux (cf. StockExitJournal). */}
      <div className="sticky top-0 z-40 border-b border-border/20 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-mf-green-soft text-mf-green-deep">
              <ActivityIcon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-bold text-foreground lg:text-[28px] lg:tracking-tight">
                {t('activity.title')}
              </h1>
              <p className="truncate text-sm text-mf-text-soft">{t('activity.subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto max-w-3xl px-4 py-6">
        {loading && feed.length === 0 ? (
          <p className="py-16 text-center text-sm text-mf-text-mute">{t('common.loading')}</p>
        ) : feed.length === 0 ? (
          <p className="py-16 text-center text-sm text-mf-text-mute">{t('activity.empty')}</p>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <ActivityDayGroup
                key={g.key}
                label={g.label}
                entries={g.entries}
                currentUserId={currentUserId}
              />
            ))}
            {hasMore && (
              <div className="flex justify-center pt-1">
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={loadingMore}
                  onClick={() => selectedHouseholdId && loadMore(selectedHouseholdId)}
                >
                  {t('activity.loadMore')}
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      <div className="lg:hidden">
        <BottomNavigation currentPage="more" />
      </div>
    </div>
  );
};

export default Activity;
