import React, { useRef, useState } from 'react';
import {
  Archive,
  Cookie,
  EggFried,
  Hash,
  Leaf,
  Plus,
  Salad,
  Soup,
  Tags,
  UtensilsCrossed,
  WheatOff,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export interface TagSuggestion {
  key: string;
  label: string;
}

interface RecipeTagsPanelProps {
  tags: string[];
  suggestions: TagSuggestion[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

/** Suggestion keys shipped by default — keep in sync with the i18n `suggestedTags` block. */
export const SUGGESTED_TAG_KEYS = [
  'mainCourse',
  'vegetarian',
  'quick',
  'dessert',
  'glutenFree',
  'starter',
  'batchCooking',
] as const;

const SUGGESTION_ICONS: Record<string, LucideIcon> = {
  mainCourse: UtensilsCrossed,
  starter: Salad,
  dessert: Cookie,
  vegetarian: Leaf,
  quick: Zap,
  glutenFree: WheatOff,
  batchCooking: Archive,
  soup: Soup,
  breakfast: EggFried,
};

/**
 * Resolve the Lucide icon of a tag by matching its label against the
 * translated suggested tags (shared by the editor and the details screen).
 */
export const iconForTagLabel = (
  label: string,
  t: (key: string, options?: Record<string, unknown>) => string
): LucideIcon => {
  const match = Object.entries(SUGGESTION_ICONS).find(
    ([key]) =>
      t(`pages.recipes.editor.suggestedTags.${key}`, { defaultValue: '' }).toLowerCase() ===
      label.toLowerCase()
  );
  return match ? match[1] : Hash;
};

/**
 * Tags panel: colored pill chips inside a single input zone
 * (Enter / comma to add, Backspace to pop) + dashed suggestion pills.
 */
export const RecipeTagsPanel = ({ tags, suggestions, onAddTag, onRemoveTag }: RecipeTagsPanelProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  const iconForTag = (tag: string): LucideIcon => iconForTagLabel(tag, t);

  const commitTag = (raw: string) => {
    const name = raw.trim().replace(/,$/, '').trim();
    if (!name) return;
    onAddTag(name);
    setValue('');
  };

  const isUsed = (label: string) => tags.some((tag) => tag.toLowerCase() === label.toLowerCase());
  const visibleSuggestions = suggestions.filter((s) => !isUsed(s.label));

  return (
    <div className="rounded-[22px] bg-card p-5 shadow-[var(--mf-shadow-2)] sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-mf-purple-soft">
          <Tags className="h-[17px] w-[17px] text-mf-purple-deep" />
        </span>
        <h3 className="font-display text-lg font-bold tracking-tight">{t('pages.recipes.tags')}</h3>
        <span className="ml-auto font-display text-[13px] font-bold text-mf-text-mute">{tags.length}</span>
      </div>
      <p className="mb-3 ml-11 text-[12.5px] text-mf-text-soft">
        {t('pages.recipes.editor.tagsSubtitle')}
      </p>

      {/* Chips + input */}
      <div
        className="flex cursor-text flex-wrap items-center gap-2 rounded-md border-[1.5px] border-transparent bg-muted px-2.5 py-2 transition-colors focus-within:border-mf-green focus-within:bg-card"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => {
          const Icon = iconForTag(tag);
          return (
            <span
              key={tag}
              className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-1.5 pl-3 pr-1.5 font-display text-[13px] font-bold',
                'border border-mf-night-line bg-card text-mf-text-soft'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tag}
              <button
                type="button"
                onClick={() => onRemoveTag(tag)}
                aria-label={t('messages.action.delete')}
                className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black/5 hover:bg-black/15 dark:bg-white/10 dark:hover:bg-white/20"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commitTag(value);
            } else if (e.key === 'Backspace' && !value && tags.length > 0) {
              onRemoveTag(tags[tags.length - 1]);
            }
          }}
          onBlur={() => commitTag(value)}
          placeholder={t('pages.recipes.editor.tagPlaceholder')}
          autoComplete="off"
          className="min-w-[130px] flex-1 border-0 bg-transparent px-0.5 py-1 text-sm text-foreground outline-none placeholder:text-mf-text-mute"
        />
      </div>

      {/* Suggestions */}
      {visibleSuggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="mr-0.5 font-display text-[11.5px] font-bold tracking-wide text-mf-text-mute">
            {t('pages.recipes.editor.suggestions')}
          </span>
          {visibleSuggestions.map((suggestion) => (
            <button
              key={suggestion.key}
              type="button"
              onClick={() => onAddTag(suggestion.label)}
              className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-mf-night-line px-3 py-1.5 font-display text-[12.5px] font-semibold text-mf-text-soft transition-colors hover:border-solid hover:border-mf-green hover:bg-mf-green-soft hover:text-mf-green-deep"
            >
              <Plus className="h-3 w-3" />
              {suggestion.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
