import { Calendar, SlidersHorizontal, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StockExitType } from '@/types/enums';
import { JOURNAL_PERIODS, type JournalPeriod } from '@/utils/journalPeriods';
import type { HouseholdMember } from '@/stores/householdStore';
import { ACTION_META } from './journalActionMeta';

export type TypeFilter = StockExitType | 'all';

export interface TypeCounts {
  all: number;
  consumed: number;
  wasted: number;
  removed: number;
}

interface JournalToolbarProps {
  typeFilter: TypeFilter;
  onTypeChange: (value: TypeFilter) => void;
  counts: TypeCounts;
  period: JournalPeriod;
  onPeriodChange: (value: JournalPeriod) => void;
  members: HouseholdMember[];
  currentUserId?: string;
  memberFilter: string;
  onMemberChange: (value: string) => void;
}

const TAB_ACTIVE_CLASS: Record<TypeFilter, string> = {
  all: 'bg-mf-text text-mf-night border-mf-text',
  [StockExitType.CONSUMED]: 'bg-mf-green text-white border-mf-green',
  [StockExitType.WASTED]: 'bg-mf-danger text-white border-mf-danger',
  [StockExitType.REMOVED]: 'bg-mf-text-soft text-mf-night border-mf-text-soft',
};

export function JournalToolbar({
  typeFilter,
  onTypeChange,
  counts,
  period,
  onPeriodChange,
  members,
  currentUserId,
  memberFilter,
  onMemberChange,
}: JournalToolbarProps) {
  const { t } = useTranslation();

  const tabs: Array<{ key: TypeFilter; label: string; count: number; type?: StockExitType }> = [
    { key: 'all', label: t('stockExit.journal.tabs.all'), count: counts.all },
    {
      key: StockExitType.CONSUMED,
      label: t('stockExit.journal.actions.consumed'),
      count: counts.consumed,
      type: StockExitType.CONSUMED,
    },
    {
      key: StockExitType.WASTED,
      label: t('stockExit.journal.actions.wasted'),
      count: counts.wasted,
      type: StockExitType.WASTED,
    },
    {
      key: StockExitType.REMOVED,
      label: t('stockExit.journal.actions.removed'),
      count: counts.removed,
      type: StockExitType.REMOVED,
    },
  ];

  const showMemberFilter = members.length > 1;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      {/* Type tabs */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const isActive = typeFilter === tab.key;
          const TabIcon = tab.type ? ACTION_META[tab.type].icon : null;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTypeChange(tab.key)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 font-display text-[13px] font-bold shadow-[var(--mf-shadow-1)] transition-colors',
                isActive
                  ? TAB_ACTIVE_CLASS[tab.key]
                  : 'border-mf-night-line bg-mf-night-surface text-mf-text-soft hover:text-mf-text'
              )}
              aria-pressed={isActive}
            >
              {TabIcon ? <TabIcon className="h-3.5 w-3.5" aria-hidden /> : null}
              {tab.label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10.5px] leading-none',
                  isActive ? 'bg-white/20 text-current' : 'bg-mf-night-elevated text-mf-text-soft'
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Secondary controls */}
      <div className="flex flex-wrap items-center gap-2">
        {showMemberFilter ? (
          <Select value={memberFilter} onValueChange={onMemberChange}>
            <SelectTrigger className="h-9 w-auto gap-2 rounded-full border-mf-night-line bg-mf-night-surface font-display text-[13px] font-bold text-mf-text-soft">
              <Users className="h-4 w-4" aria-hidden />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('stockExit.journal.filters.allMembers')}</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.id === currentUserId ? t('common.you') : m.firstName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Select value={period} onValueChange={(v) => onPeriodChange(v as JournalPeriod)}>
          <SelectTrigger className="h-9 w-auto gap-2 rounded-full border-mf-night-line bg-mf-night-surface font-display text-[13px] font-bold text-mf-text-soft">
            <Calendar className="h-4 w-4" aria-hidden />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JOURNAL_PERIODS.map((p) => (
              <SelectItem key={p} value={p}>
                {t(`stockExit.journal.periods.${p}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          title={t('stockExit.journal.filters.advancedSoon')}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{t('stockExit.journal.filters.advanced')}</span>
        </Button>
      </div>
    </div>
  );
}
