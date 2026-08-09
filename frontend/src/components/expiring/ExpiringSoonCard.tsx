import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Clock } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PushOptInBanner } from '@/components/PushOptInBanner';
import { scrollRevealFadeUp } from '@/lib/motion';
import { ExpiringGroup } from './ExpiringGroup';
import { useExpiringSoon } from './useExpiringSoon';

interface ExpiringSoonCardProps {
  householdId: string | null | undefined;
}

/** Shared card chrome, so every state (skeleton, error, list) sits in the same shell. */
const CardShell = ({ children }: { children: ReactNode }) => {
  const prefersReducedMotion = useReducedMotion() ?? false;
  return (
    <motion.div {...scrollRevealFadeUp(prefersReducedMotion)}>
      <Card className="overflow-hidden rounded-xl border border-mf-night-line bg-mf-night-surface shadow-[0_1px_2px_rgba(20,15,5,0.05)]">
        {children}
      </Card>
    </motion.div>
  );
};

export const ExpiringSoonCard = ({ householdId }: ExpiringSoonCardProps) => {
  const { t } = useTranslation();
  const {
    status,
    groups,
    totalCount,
    summary,
    isEmptyAfterResolution,
    onConsume,
    onWaste,
    onFreeze,
    onRetry,
  } = useExpiringSoon(householdId);

  if (status === 'loading') {
    return (
      <CardShell>
        <CardContent className="px-[18px] py-[18px] sm:px-6 sm:py-5">
          <div className="animate-pulse space-y-3" aria-hidden>
            <div className="h-5 w-44 rounded-full bg-mf-night-elevated" />
            <div className="h-3 w-56 rounded-full bg-mf-night-elevated" />
            <div className="space-y-2.5 pt-2">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-[10px] bg-mf-night-elevated" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-1/3 rounded-full bg-mf-night-elevated" />
                    <div className="h-2.5 w-1/4 rounded-full bg-mf-night-elevated" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <span className="sr-only">{t('common.loading')}</span>
        </CardContent>
      </CardShell>
    );
  }

  if (status === 'error') {
    return (
      <CardShell>
        <CardContent className="px-[18px] py-6 text-center sm:px-6">
          <p className="text-[12.5px] text-mf-text-soft sm:text-[13.5px]">
            {t('pages.dashboard.expiringSoon.loadError')}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="mt-3 rounded-full font-display font-semibold text-mf-green-deep hover:bg-mf-green-soft"
          >
            {t('pages.dashboard.expiringSoon.retry')}
          </Button>
        </CardContent>
      </CardShell>
    );
  }

  // Nothing to act on and the user never acted: keep the dashboard uncluttered.
  if (totalCount === 0 && !isEmptyAfterResolution) return null;

  return (
    <CardShell>
      <CardHeader className="space-y-0 px-[18px] pb-0.5 pt-[18px] sm:px-6 sm:pb-1 sm:pt-5">
        <CardTitle className="flex min-w-0 items-center gap-2 font-display text-[14.5px] font-bold text-mf-text sm:gap-2.5 sm:text-[17px]">
          <Clock className="h-4 w-4 shrink-0 text-mf-warning sm:h-[19px] sm:w-[19px]" strokeWidth={2.3} aria-hidden />
          <span className="truncate">{t('pages.dashboard.expiringSoon.title')}</span>
          {totalCount > 0 && (
            <span className="inline-flex h-[17px] min-w-[17px] shrink-0 items-center justify-center rounded-full bg-mf-danger px-1.5 font-display text-[10.5px] font-bold leading-none text-white sm:h-5 sm:min-w-[20px] sm:text-[11.5px]">
              {totalCount}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-[18px] pb-3 pt-0 sm:px-6 sm:pb-4">
        <p className="text-[11.5px] font-medium text-mf-text-soft sm:text-[13px]">{summary}</p>

        {totalCount === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-mf-text-soft sm:text-[13.5px]">
            {t('pages.dashboard.expiringSoon.emptyAfterResolution')}
          </p>
        ) : (
          groups.map((group) => (
            <ExpiringGroup
              key={group.key}
              urgency={group.key}
              items={group.items}
              onConsume={onConsume}
              onFreeze={onFreeze}
              onWaste={onWaste}
            />
          ))
        )}

        {/* `empty:hidden` keeps the spacer from leaving a gap when the banner
            declines to render (already subscribed, dismissed, unsupported…). */}
        <div className="pt-3 empty:hidden">
          <PushOptInBanner />
        </div>
      </CardContent>
    </CardShell>
  );
};
