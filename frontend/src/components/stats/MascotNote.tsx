import { cn } from '@/lib/utils';

interface MascotNoteProps {
  children: React.ReactNode;
  /** yellow = "come back later", green = team-spirit nudge. */
  tone?: 'yellow' | 'green';
  className?: string;
}

/**
 * Chef Aetchebibeast banner used for the "foyer récent" and "esprit d'équipe"
 * messages. The design calls for expression variants (hungry_light / thumbs_up /
 * idontknow); only `chef-happy` is shipped today, so every slot reuses it.
 */
export function MascotNote({ children, tone = 'yellow', className }: MascotNoteProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg p-3.5 sm:gap-3.5 sm:p-4',
        tone === 'green' ? 'bg-mf-green-soft' : 'bg-mf-yellow-soft',
        className,
      )}
    >
      <img
        src="/mascot/chef-happy.png"
        alt=""
        aria-hidden
        className="h-[68px] w-[68px] shrink-0 object-contain"
      />
      <p
        className={cn(
          'm-0 text-[12.5px] font-medium leading-snug sm:text-sm',
          tone === 'green' ? 'font-semibold text-mf-green-deep' : 'text-mf-text',
        )}
      >
        {children}
      </p>
    </div>
  );
}
