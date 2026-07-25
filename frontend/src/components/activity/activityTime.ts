import type { TFunction } from 'i18next';
import i18n from '@/i18n/config';
import type { ActivityEntry } from '@/services/activityService';

export function formatEntryTime(createdAt: string, t: TFunction): string {
  const d = new Date(createdAt);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t('activity.justNow');
  if (diffMin < 60) return t('activity.relativeMinutes', { count: diffMin });
  return d.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
}

export interface EntryTimeParts {
  /** Jour (« Hier », « 24 juil. ») ou null quand l'entrée est du jour même / relative. */
  day: string | null;
  time: string;
}

/**
 * Comme formatEntryTime, mais expose aussi le jour quand l'entrée n'est pas
 * d'aujourd'hui — pour les contextes non groupés par jour (carte du dashboard).
 * Les temps relatifs (« à l'instant », « il y a N min ») sont toujours du jour
 * même, donc `day` reste null.
 */
export function formatEntryDateTime(createdAt: string, t: TFunction): EntryTimeParts {
  const d = new Date(createdAt);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return { day: null, time: t('activity.justNow') };
  if (diffMin < 60) return { day: null, time: t('activity.relativeMinutes', { count: diffMin }) };

  const time = d.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  const todayKey = dayKey(now);
  const yKey = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const key = dayKey(d);

  let day: string | null = null;
  if (key !== todayKey) {
    day = key === yKey
      ? t('activity.yesterday')
      : d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
  }
  return { day, time };
}

export interface DayGroup {
  key: string;
  label: string;
  entries: ActivityEntry[];
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function groupByDay(entries: ActivityEntry[], t: TFunction): DayGroup[] {
  const now = new Date();
  const todayKey = dayKey(now);
  const yKey = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

  const groups: DayGroup[] = [];
  const index = new Map<string, DayGroup>();

  for (const entry of entries) {
    const d = new Date(entry.createdAt);
    const key = dayKey(d);
    let g = index.get(key);
    if (!g) {
      let label: string;
      if (key === todayKey) label = t('activity.today');
      else if (key === yKey) label = t('activity.yesterday');
      else label = d.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' });
      g = { key, label, entries: [] };
      index.set(key, g);
      groups.push(g);
    }
    g.entries.push(entry);
  }
  return groups; // entrées déjà triées desc par l'API
}
