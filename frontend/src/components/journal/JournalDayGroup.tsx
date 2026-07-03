import { useTranslation } from 'react-i18next';
import { useDateFormat } from '@/utils/dateFormatting';
import {
  dayRelativeLabel,
  summariseDay,
  type JournalDayGroup as DayGroup,
} from '@/utils/journalGrouping';
import { JournalEntry } from './JournalEntry';

interface JournalDayGroupProps {
  group: DayGroup;
  now: Date;
  currentUserId?: string;
  /** Map of storageAreaId → storage-area type, for the correct row icon. */
  storageTypeById: Record<string, string | undefined>;
  showMember?: boolean;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function JournalDayGroup({
  group,
  now,
  currentUserId,
  storageTypeById,
  showMember = true,
}: JournalDayGroupProps) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();

  const rel = dayRelativeLabel(group.dayStart, now);
  const label =
    rel === 'today'
      ? t('stockExit.journal.day.today')
      : rel === 'yesterday'
        ? t('stockExit.journal.day.yesterday')
        : capitalize(formatDate(group.dayStart, 'EEEE'));
  const dateStr = rel
    ? formatDate(group.dayStart, 'EEEE d MMMM')
    : formatDate(group.dayStart, 'd MMMM');

  const summary = summariseDay(group.entries);
  const summaryParts = [t('stockExit.journal.day.exitsCount', { count: summary.total })];
  if (summary.consumed) {
    summaryParts.push(t('stockExit.journal.day.consumedCount', { count: summary.consumed }));
  }
  if (summary.wasted) {
    summaryParts.push(t('stockExit.journal.day.wastedCount', { count: summary.wasted }));
  }

  return (
    <section className="mb-1">
      <header className="mb-3 mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-1">
        <span className="font-display text-[15px] font-extrabold text-mf-text">{label}</span>
        <span className="font-display text-[12.5px] font-semibold text-mf-text-mute">{dateStr}</span>
        <span className="ml-auto font-display text-xs font-semibold text-mf-text-mute">
          {summaryParts.join(' · ')}
        </span>
      </header>

      <div className="space-y-2.5">
        {group.entries.map((entry) => (
          <JournalEntry
            key={entry.id}
            entry={entry}
            currentUserId={currentUserId}
            storageType={entry.storageAreaId ? storageTypeById[entry.storageAreaId] : undefined}
            showMember={showMember}
          />
        ))}
      </div>
    </section>
  );
}
