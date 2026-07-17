import { Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface JournalEmptyStateProps {
  /**
   * 'empty' = journal has no entries at all (new user);
   * 'period-empty' = the selected period has no exits;
   * 'no-results' = active filters exclude everything.
   */
  variant: 'empty' | 'period-empty' | 'no-results';
  onReset?: () => void;
}

export function JournalEmptyState({ variant, onReset }: JournalEmptyStateProps) {
  const { t } = useTranslation();

  if (variant === 'empty') {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <img
          src="/mascot/chef-happy.png"
          alt=""
          aria-hidden
          className="h-28 w-28 object-contain opacity-90"
        />
        <div className="max-w-sm space-y-1.5">
          <p className="font-display text-base font-bold text-mf-text">
            {t('stockExit.journal.empty.title')}
          </p>
          <p className="text-sm text-mf-text-soft">{t('stockExit.journal.empty.subtitle')}</p>
        </div>
      </div>
    );
  }

  const title =
    variant === 'period-empty'
      ? t('stockExit.journal.periodEmpty.title')
      : t('stockExit.journal.noResults.title');

  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center text-mf-text-mute">
      <Inbox className="h-8 w-8" aria-hidden />
      <p className="font-display text-sm font-semibold">{title}</p>
      {onReset ? (
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          {t('stockExit.journal.noResults.reset')}
        </Button>
      ) : null}
    </div>
  );
}
