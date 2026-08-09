import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import type { HouseholdContribution } from '@/services/statsService';
import { ContributionDonut, type DonutSegment } from './ContributionDonut';
import { MascotNote } from './MascotNote';
import { memberColor } from './statsColors';

interface HouseholdBlockProps {
  household: HouseholdContribution;
}

/**
 * Bloc 3 — Foyer. Contributions are listed, never ranked or compared: no
 * "most active member", no individual percentages, and a stable member order
 * that carries no meaning.
 */
export function HouseholdBlock({ household }: HouseholdBlockProps) {
  const { t } = useTranslation();
  const { members, totals, isSolo, showTeamNudge } = household;

  const memberName = (name: string | null, index: number) =>
    name ?? t('stats.household.unknownMember', { index: index + 1 });

  const segments = (pick: (m: (typeof members)[number]) => number): DonutSegment[] =>
    members.map((member, index) => ({
      key: member.userId,
      label: memberName(member.name, index),
      value: pick(member),
      color: memberColor(index),
    }));

  return (
    <section id="stats-household" className="flex scroll-mt-4 flex-col gap-3.5">
      <header className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] bg-mf-blue-soft text-mf-info"
        >
          <Users className="h-[17px] w-[17px]" strokeWidth={2.3} />
        </span>
        <h2 className="m-0 font-display text-lg font-bold tracking-tight text-mf-text sm:text-xl">
          {t('stats.household.title')}
        </h2>
      </header>

      {showTeamNudge && <MascotNote tone="green">{t('stats.household.teamNudge')}</MascotNote>}

      {isSolo ? (
        // Solo household: no "members", just what you did.
        <div className="rounded-xl border border-mf-night-line bg-mf-night-surface p-[18px] sm:p-5">
          <p className="m-0 text-sm font-medium leading-relaxed text-mf-text sm:text-[15px]">
            {t('stats.household.soloIntro', {
              adds: totals.adds,
              cooks: totals.cooks,
              checks: totals.shoppingChecks,
            })}
          </p>
          <div className="mt-3.5 grid grid-cols-3 gap-2.5">
            <SoloFigure label={t('stats.household.adds')} value={totals.adds} />
            <SoloFigure label={t('stats.household.cooks')} value={totals.cooks} />
            <SoloFigure label={t('stats.household.checks')} value={totals.shoppingChecks} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-xl border border-mf-night-line bg-mf-night-surface p-[18px] sm:p-5">
          <p className="m-0 text-sm font-medium leading-relaxed text-mf-text sm:text-[15px]">
            {t('stats.household.sharedIntro', { count: totals.adds })}
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            <ContributionDonut
              title={t('stats.household.adds')}
              segments={segments((m) => m.adds)}
              totalLabel={t('stats.household.unitItems')}
              ariaLabel={t('stats.household.addsA11y', { count: totals.adds })}
            />
            <ContributionDonut
              title={t('stats.household.cooks')}
              segments={segments((m) => m.cooks)}
              totalLabel={t('stats.household.unitRecipes')}
              ariaLabel={t('stats.household.cooksA11y', { count: totals.cooks })}
            />
            <ContributionDonut
              title={t('stats.household.checks')}
              segments={segments((m) => m.shoppingChecks)}
              totalLabel={t('stats.household.unitItems')}
              ariaLabel={t('stats.household.checksA11y', { count: totals.shoppingChecks })}
            />
          </div>
          <p className="m-0 text-[12.5px] leading-relaxed text-mf-text-mute">
            {t('stats.household.disclaimer')}
          </p>
        </div>
      )}
    </section>
  );
}

function SoloFigure({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="mf-eyebrow text-mf-text-mute">{label}</span>
      <span className="font-display text-[26px] font-bold leading-tight tracking-tight text-mf-text sm:text-3xl">
        {value}
      </span>
    </div>
  );
}
