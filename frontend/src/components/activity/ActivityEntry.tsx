import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { ActivityEntry as ActivityEntryModel } from '@/services/activityService';
import { buildActivityLabel } from './activityLabel';
import { formatEntryDateTime } from './activityTime';

function initialsOf(name?: string | null): string {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((w) => w.charAt(0)).slice(0, 2).join('').toUpperCase();
}

interface Props {
  entry: ActivityEntryModel;
  currentUserId?: string;
  /**
   * Affiche le jour (« Hier », « 24 juil. ») au-dessus de l'heure quand l'entrée
   * n'est pas d'aujourd'hui. À activer dans les contextes non groupés par jour
   * (carte du dashboard) ; laissé off sur /activity où le jour est déjà en titre.
   */
  showDate?: boolean;
}

export function ActivityEntry({ entry, currentUserId, showDate = false }: Props) {
  const { t } = useTranslation();
  const isCurrentUser = !!currentUserId && entry.actor.id === currentUserId;
  const label = buildActivityLabel(entry, t, isCurrentUser);
  const Icon = label.icon;
  const { day, time } = formatEntryDateTime(entry.createdAt, t);


  // actor.name is string | null (backend returns null when it has no name on
  // file). Guard the null and fall back to a localized label.
  const firstName = entry.actor.name ? entry.actor.name.trim().split(/\s+/)[0] : null;
  const displayName = isCurrentUser ? t('activity.you') : (firstName ?? t('activity.unknownMember'));
  const suffix = entry.actor.isFormerMember ? ` ${t('activity.formerMember')}` : '';

  return (
    <div className="flex items-start gap-3 py-2.5">
      {/* Jour (optionnel) + heure */}
      <span className="flex w-16 shrink-0 flex-col pt-0.5 text-[11.5px] font-semibold text-mf-text-mute tabular-nums">
        {showDate && day && (
          <span className="font-display font-bold text-mf-text-soft">{day}</span>
        )}
        <span>{time}</span>
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
        {/* Quantité + unité, chip discret en fin de ligne (actions article seulement) */}
        {label.amount && (
          <span className="ml-1.5 inline-flex items-center whitespace-nowrap rounded-full bg-mf-night-elevated px-2 py-0.5 font-display text-[11.5px] font-bold text-mf-text-soft align-middle">
            {label.amount}
          </span>
        )}
      </div>
    </div>
  );
}

function renderWithEmphasis(text: string, target: string) {
  const idx = target ? text.indexOf(target) : -1;
  if (idx === -1) return <span>{text}</span>;
  // indexOf + slice (not split): a target that appears more than once — e.g. an
  // item literally named a connector word — would make split() drop the tail.
  const before = text.slice(0, idx);
  const after = text.slice(idx + target.length);
  return (
    <span>
      {before}
      <span className="font-semibold text-mf-text">{target}</span>
      {after}
    </span>
  );
}
