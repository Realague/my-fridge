import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity as ActivityIcon, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useActivityStore } from '@/stores/activityStore';
import { useAuthStore } from '@/stores/authStore';
import { ActivityEntry } from '@/components/activity/ActivityEntry';

interface Props {
  householdId: string;
}

export function RecentActivityCard({ householdId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const recent = useActivityStore((s) => s.recent);
  const loadRecent = useActivityStore((s) => s.loadRecent);
  const currentUserId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (householdId) loadRecent(householdId);
  }, [householdId, loadRecent]);

  // Section masquée entièrement si aucune activité (spec : pas d'état vide).
  if (recent.length === 0) return null;

  return (
    <Card className="border-0 bg-mf-night-surface shadow-none">
      <CardHeader className="flex flex-row items-center justify-between px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 font-display text-mf-text">
          <ActivityIcon className="h-5 w-5 text-primary" aria-hidden />
          {t('activity.recentTitle')}
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate('/activity')}>
          {t('activity.seeAll')}
          <ChevronRight className="ml-0.5 h-4 w-4" aria-hidden />
        </Button>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="divide-y divide-border">
          {recent.map((entry) => (
            <ActivityEntry key={entry.id} entry={entry} currentUserId={currentUserId} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
