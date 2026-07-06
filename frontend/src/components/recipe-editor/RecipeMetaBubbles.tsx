import React, { useState } from 'react';
import { Check, ChevronDown, Flame, Gauge, Timer, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RecipeDifficulty } from '@/services/recipeService';
import { cn } from '@/lib/utils';

interface RecipeMetaBubblesProps {
  prepTime: string;
  cookTime: string;
  servings: string;
  difficulty: RecipeDifficulty;
  onPrepTimeChange: (value: string) => void;
  onCookTimeChange: (value: string) => void;
  onServingsChange: (value: string) => void;
  onDifficultyChange: (value: RecipeDifficulty) => void;
}

const DIFFICULTY_LEVELS: { value: RecipeDifficulty; dots: number }[] = [
  { value: 'Easy', dots: 1 },
  { value: 'Medium', dots: 2 },
  { value: 'Hard', dots: 3 },
];

const numberFieldClass =
  'w-full min-w-0 border-0 bg-transparent p-0 font-display text-[26px] font-extrabold leading-none tracking-[-0.02em] outline-none placeholder:opacity-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

const Bubble = ({
  tone,
  icon,
  label,
  children,
}: {
  tone: string;
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      'rounded-[20px] border-[1.5px] border-transparent p-4 transition-colors focus-within:border-foreground/10',
      tone
    )}
  >
    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-card">{icon}</div>
    {children}
    <div className="mt-1.5 font-display text-[12.5px] font-semibold text-mf-text-soft">{label}</div>
  </div>
);

const DifficultyDots = ({ level, className }: { level: number; className?: string }) => (
  <span className={cn('inline-flex items-center gap-1', className)}>
    {[1, 2, 3].map((i) => (
      <i
        key={i}
        className={cn(
          'h-2 w-2 rounded-full',
          i <= level ? 'bg-mf-yellow' : 'bg-mf-night-line'
        )}
      />
    ))}
  </span>
);

/**
 * The four colored metadata bubbles of the recipe editor:
 * prep time (blue), cook time (orange), servings (green) and a custom
 * difficulty dropdown (yellow) with level dots — as in the Fresh mock.
 */
export const RecipeMetaBubbles = ({
  prepTime,
  cookTime,
  servings,
  difficulty,
  onPrepTimeChange,
  onCookTimeChange,
  onServingsChange,
  onDifficultyChange,
}: RecipeMetaBubblesProps) => {
  const { t } = useTranslation();
  const [difficultyOpen, setDifficultyOpen] = useState(false);

  const difficultyLabel = (value: RecipeDifficulty) =>
    t(`pages.recipes.difficultyOptions.${value.toLowerCase()}`);

  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      <Bubble
        tone="bg-mf-blue-soft"
        icon={<Timer className="h-5 w-5 text-mf-blue" />}
        label={t('pages.recipes.editor.prep')}
      >
        <div className="flex items-baseline gap-1">
          <input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="0"
            value={prepTime}
            onChange={(e) => onPrepTimeChange(e.target.value)}
            aria-label={t('pages.recipes.editor.prep')}
            className={cn(numberFieldClass, 'text-mf-blue')}
          />
          <span className="font-display text-[15px] font-bold text-mf-blue/60">
            {t('pages.recipes.editor.minutesUnit')}
          </span>
        </div>
      </Bubble>

      <Bubble
        tone="bg-mf-orange-soft"
        icon={<Flame className="h-5 w-5 text-mf-orange" />}
        label={t('pages.recipes.editor.cook')}
      >
        <div className="flex items-baseline gap-1">
          <input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="0"
            value={cookTime}
            onChange={(e) => onCookTimeChange(e.target.value)}
            aria-label={t('pages.recipes.editor.cook')}
            className={cn(numberFieldClass, 'text-mf-orange')}
          />
          <span className="font-display text-[15px] font-bold text-mf-orange/60">
            {t('pages.recipes.editor.minutesUnit')}
          </span>
        </div>
      </Bubble>

      <Bubble
        tone="bg-mf-green-soft"
        icon={<Users className="h-5 w-5 text-mf-green" />}
        label={t('pages.recipes.editor.servingsLabel')}
      >
        <div className="flex items-baseline gap-1">
          <input
            type="number"
            min="1"
            inputMode="numeric"
            placeholder="4"
            value={servings}
            onChange={(e) => onServingsChange(e.target.value)}
            aria-label={t('pages.recipes.editor.servingsLabel')}
            className={cn(numberFieldClass, 'text-mf-green-deep')}
          />
          <span className="font-display text-[15px] font-bold text-mf-green-deep/60">
            {t('pages.recipes.editor.servingsUnit')}
          </span>
        </div>
      </Bubble>

      <Bubble
        tone="bg-mf-yellow-soft"
        icon={<Gauge className="h-5 w-5 text-mf-yellow" />}
        label={t('pages.recipes.editor.difficultyLabel')}
      >
        <Popover open={difficultyOpen} onOpenChange={setDifficultyOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 font-display text-[22px] font-extrabold leading-none tracking-[-0.02em] text-mf-brown"
            >
              {difficultyLabel(difficulty)}
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-card">
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-mf-yellow transition-transform',
                    difficultyOpen && 'rotate-180'
                  )}
                />
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={6} className="w-56 rounded-md border-mf-night-line p-1.5 shadow-[var(--mf-shadow-3)]">
            {DIFFICULTY_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => {
                  onDifficultyChange(level.value);
                  setDifficultyOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2.5 text-left font-display text-sm font-bold text-foreground hover:bg-muted"
              >
                <DifficultyDots level={level.dots} />
                {difficultyLabel(level.value)}
                {level.value === difficulty && (
                  <Check className="ml-auto h-4 w-4 text-mf-green" />
                )}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </Bubble>
    </div>
  );
};
