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
    // Shell aligné sur le mock (docs/design_recent_activity) : surface crème,
    // rule 1px, rayon xl (24px) et ombre très douce — plus le border-0/shadow-none
    // précédent. Paddings header/body pas à pas mobile → desktop.
    <Card className="overflow-hidden rounded-xl border border-mf-night-line bg-mf-night-surface shadow-[0_1px_2px_rgba(20,15,5,0.05)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-[18px] pb-2.5 pt-[18px] sm:px-6 sm:pb-3 sm:pt-5">
        <CardTitle className="flex items-center gap-2.5 font-display text-[17px] font-bold text-mf-text sm:text-[19px]">
          {/* Chip à fond doux — même pattern que l'en-tête « Zones de stockage ». */}
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mf-green-soft text-mf-green-deep"
          >
            <ActivityIcon className="h-5 w-5" strokeWidth={2} />
          </span>
          {t('activity.recentTitle')}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto rounded-full px-2 py-1.5 font-display text-[13.5px] font-semibold text-mf-green-deep hover:bg-mf-green-soft sm:text-sm"
          onClick={() => navigate('/activity')}
        >
          {t('activity.seeAll')}
          <ChevronRight className="ml-0.5 h-4 w-4" aria-hidden />
        </Button>
      </CardHeader>
      <CardContent className="px-[18px] pb-3 pt-0 sm:px-6 sm:pb-4">
        <div className="divide-y divide-border">
          {recent.map((entry) => (
            <ActivityEntry key={entry.id} entry={entry} currentUserId={currentUserId} showDate />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
