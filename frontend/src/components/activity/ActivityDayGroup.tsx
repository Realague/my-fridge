import type { ActivityEntry as ActivityEntryModel } from '@/services/activityService';
import { ActivityEntry } from './ActivityEntry';

interface Props {
  label: string;
  entries: ActivityEntryModel[];
  currentUserId?: string;
}

export function ActivityDayGroup({ label, entries, currentUserId }: Props) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 font-display text-sm font-extrabold uppercase tracking-wide text-mf-text-mute">
        {label}
      </h2>
      <div className="divide-y divide-border">
        {entries.map((entry) => (
          <ActivityEntry key={entry.id} entry={entry} currentUserId={currentUserId} />
        ))}
      </div>
    </section>
  );
}
