import type { ActivityEntry as ActivityEntryModel } from '@/services/activityService';
import { ActivityEntry } from './ActivityEntry';

interface Props {
  label: string;
  entries: ActivityEntryModel[];
  currentUserId?: string;
}

export function ActivityDayGroup({ label, entries, currentUserId }: Props) {
  return (
    <section>
      <h2 className="mb-2 px-1 font-display text-xs font-bold uppercase tracking-[0.08em] text-mf-text-mute">
        {label}
      </h2>
      {/* Surface crème bordée — même shell que la carte « Activité récente » du dashboard. */}
      <div className="overflow-hidden rounded-xl border border-mf-night-line bg-mf-night-surface px-4 shadow-[0_1px_2px_rgba(20,15,5,0.05)] sm:px-5">
        <div className="divide-y divide-border">
          {entries.map((entry) => (
            <ActivityEntry key={entry.id} entry={entry} currentUserId={currentUserId} />
          ))}
        </div>
      </div>
    </section>
  );
}
