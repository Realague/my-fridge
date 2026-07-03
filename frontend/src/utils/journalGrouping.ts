// Grouping + per-day summaries for the Journal des sorties timeline.
import { StockExitType } from '@/types/enums';
import type { StockExitDto } from '@/services/stockExitService';

export interface JournalDayGroup {
  /** Local start-of-day for this group (used as a stable key + for labels). */
  dayStart: Date;
  entries: StockExitDto[];
}

/**
 * Group exits by local calendar day, most recent day first. Entries arrive
 * newest-first from the API, so their intra-day order is preserved.
 */
export function groupExitsByDay(entries: StockExitDto[]): JournalDayGroup[] {
  const map = new Map<number, JournalDayGroup>();

  for (const entry of entries) {
    const d = new Date(entry.createdAt);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const key = dayStart.getTime();
    const group = map.get(key);
    if (group) {
      group.entries.push(entry);
    } else {
      map.set(key, { dayStart, entries: [entry] });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.dayStart.getTime() - a.dayStart.getTime());
}

export interface DaySummary {
  total: number;
  consumed: number;
  wasted: number;
}

export function summariseDay(entries: StockExitDto[]): DaySummary {
  let consumed = 0;
  let wasted = 0;
  for (const entry of entries) {
    if (entry.exitType === StockExitType.CONSUMED) consumed += 1;
    else if (entry.exitType === StockExitType.WASTED) wasted += 1;
  }
  return { total: entries.length, consumed, wasted };
}

export type DayRelativeLabel = 'today' | 'yesterday' | null;

/** Relative label for a day header: today / yesterday / null (use the date). */
export function dayRelativeLabel(dayStart: Date, now: Date): DayRelativeLabel {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((todayStart.getTime() - dayStart.getTime()) / 86_400_000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  return null;
}
