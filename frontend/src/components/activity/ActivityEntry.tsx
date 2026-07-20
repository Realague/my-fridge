import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { ActivityEntry as ActivityEntryModel } from '@/services/activityService';
import { buildActivityLabel } from './activityLabel';
import { formatEntryTime } from './activityTime';

function initialsOf(name?: string | null): string {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((w) => w.charAt(0)).slice(0, 2).join('').toUpperCase();
}

interface Props {
  entry: ActivityEntryModel;
  currentUserId?: string;
}

export function ActivityEntry({ entry, currentUserId }: Props) {
  const { t } = useTranslation();
  const label = buildActivityLabel(entry, t);
  const Icon = label.icon;

  const isCurrentUser = !!currentUserId && entry.actor.id === currentUserId;
  // actor.name is string | null (backend returns null when it has no name on
  // file). Guard the null and fall back to a localized label.
  const firstName = entry.actor.name ? entry.actor.name.trim().split(/\s+/)[0] : null;
  const displayName = isCurrentUser ? t('activity.you') : (firstName ?? t('activity.unknownMember'));
  const suffix = entry.actor.isFormerMember ? ` ${t('activity.formerMember')}` : '';

  return (
    <div className="flex items-start gap-3 py-2.5">
      {/* Heure */}
      <span className="w-16 shrink-0 pt-0.5 text-[11.5px] font-semibold text-mf-text-mute tabular-nums">
        {formatEntryTime(entry.createdAt, t)}
      </span>

      {/* Avatar initiales */}
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mf-text text-[10px] font-bold uppercase leading-none text-mf-night dark:bg-mf-night dark:text-mf-text"
        aria-hidden
      >
        {initialsOf(entry.actor.name)}
      </span>

      {/* Contenu */}
      <div className="min-w-0 flex-1 text-sm text-mf-text-soft">
        <Icon className={cn('mr-1 inline h-4 w-4 -translate-y-px', label.tone)} aria-hidden />
        <span className="font-display font-bold text-mf-text">
          {displayName}
          {suffix}
        </span>{' '}
        {/* le libellé contient déjà le verbe + le target ; on met le target en gras */}
        {renderWithEmphasis(label.text, label.target)}
      </div>
    </div>
  );
}

function renderWithEmphasis(text: string, target: string) {
  if (!target || !text.includes(target)) return <span>{text}</span>;
  const [before, after] = text.split(target);
  return (
    <span>
      {before}
      <span className="font-semibold text-mf-text">{target}</span>
      {after}
    </span>
  );
}
