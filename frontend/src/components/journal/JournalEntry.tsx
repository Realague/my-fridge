import { Clock, CornerDownRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useDateFormat } from '@/utils/dateFormatting';
import { CategoryIcon } from '@/utils/categoryIcons';
import { StorageAreaIcon } from '@/utils/storageAreaIcons';
import { getDisplayUnitLabel } from '@/utils/unitSystem';
import { categoryTone, toneBadgeClass } from '@/lib/tokenMaps';
import type { StockExitDto } from '@/services/stockExitService';
import { ACTION_META } from './journalActionMeta';

interface JournalEntryProps {
  entry: StockExitDto;
  currentUserId?: string;
  /** Storage-area type for the correct icon (falls back to a generic glyph). */
  storageType?: string | null;
  /** Whether to render the member (hidden for single-member households). */
  showMember?: boolean;
}

function initialsOf(name?: string | null): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** A single stock-exit row. Read-only. Desktop = aligned columns; mobile = stacked. */
export function JournalEntry({
  entry,
  currentUserId,
  storageType,
  showMember = true,
}: JournalEntryProps) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();

  const meta = ACTION_META[entry.exitType];
  const ActionIcon = meta.icon;

  const name = entry.itemName || t('messages.storedItem.unnamed');
  const unitLabel = getDisplayUnitLabel(entry.unit, entry.quantity, t);
  const time = formatDate(new Date(entry.createdAt), 'HH:mm');

  const isCurrentUser = !!currentUserId && entry.exitedBy === currentUserId;
  const firstName = entry.exitedByName?.trim().split(/\s+/)[0];
  const memberName = isCurrentUser ? t('common.you') : firstName || '—';
  const initials = initialsOf(entry.exitedByName);

  const categoryBadge = (
    <span className={cn('mf-badge', toneBadgeClass(categoryTone(entry.category)))}>
      <CategoryIcon category={entry.category} className="h-3.5 w-3.5" />
      {entry.category ? t(`items.categories.${entry.category}`) : t('items.categories.other')}
    </span>
  );

  const storageChip = entry.storageAreaName ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-mf-text-mute">
      <StorageAreaIcon type={storageType} colored={false} className="h-3.5 w-3.5" />
      {entry.storageAreaName}
    </span>
  ) : null;

  const noteChip = entry.note ? (
    <span className="inline-flex items-center gap-1 text-xs italic text-mf-text-soft">
      <CornerDownRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {entry.note}
    </span>
  ) : null;

  const actionBadge = (
    <span className={cn('mf-badge', meta.badgeClass)}>
      <ActionIcon className="h-3.5 w-3.5" aria-hidden />
      {t(meta.labelKey)}
    </span>
  );

  const quantity = (
    <span className="font-display text-base font-extrabold text-mf-text">
      {entry.quantity}
      {unitLabel ? <span className="ml-1 text-xs font-semibold text-mf-text-mute">{unitLabel}</span> : null}
    </span>
  );

  const member = showMember ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-mf-night-elevated py-0.5 pl-0.5 pr-2.5">
      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-mf-text text-[10px] font-bold uppercase leading-none text-mf-night dark:bg-mf-night dark:text-mf-text">
        {initials}
      </span>
      <span className="font-display text-[13px] font-bold text-mf-text-soft">{memberName}</span>
    </span>
  ) : null;

  const timeChip = (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-mf-text-mute">
      <Clock className="h-3 w-3" aria-hidden />
      {time}
    </span>
  );

  return (
    <div className="relative mf-card mf-motion-card overflow-hidden px-3 py-3 sm:px-[18px]">
      <span
        className={cn('absolute left-0 top-3 bottom-3 w-[3px] rounded-full', meta.accentClass)}
        aria-hidden
      />

      <div className="flex items-start gap-3 pl-2 sm:gap-4">
        {/* Category thumbnail */}
        <span
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] sm:h-[52px] sm:w-[52px]',
            toneBadgeClass(categoryTone(entry.category))
          )}
        >
          <CategoryIcon category={entry.category} className="h-6 w-6" />
        </span>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px] font-bold text-mf-text sm:text-base">{name}</div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {categoryBadge}
            {storageChip}
            {noteChip}
          </div>

          {/* Mobile-only stacked footer */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:hidden">
            {actionBadge}
            {quantity}
            {member}
            {timeChip}
          </div>
        </div>

        {/* Desktop-only aligned columns */}
        <div className="hidden shrink-0 items-center gap-4 sm:flex">
          <div className="w-[132px]">{actionBadge}</div>
          <div className="w-[92px] text-right">{quantity}</div>
          <div className="flex w-[128px] flex-col items-end gap-1">
            {member}
            {timeChip}
          </div>
        </div>
      </div>
    </div>
  );
}
