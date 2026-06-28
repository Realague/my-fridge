import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultServings: number;
  recipeTitle: string;
  saving: boolean;
  onConfirm: (servings: number) => void;
}

export const ConfirmServingsDialog = ({
  open,
  onOpenChange,
  defaultServings,
  recipeTitle,
  saving,
  onConfirm,
}: Props) => {
  const { t } = useTranslation();
  const [servings, setServings] = useState(defaultServings);

  useEffect(() => {
    if (open) setServings(Math.max(1, defaultServings || 1));
  }, [open, defaultServings]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-sm"
        style={{
          background: 'var(--mf-night-surface)',
          border: '1px solid var(--mf-night-line)',
          borderRadius: 'var(--mf-radius-xl)',
          color: 'var(--mf-text)',
          fontFamily: 'var(--mf-font-body)',
        }}
      >
        <DialogHeader>
          <div className="mf-eyebrow mb-1">
            {t('pages.meals.selector.confirmServings.kicker')}
          </div>
          <DialogTitle
            className="mf-display text-[24px] leading-tight text-[color:var(--mf-text)]"
          >
            {t('pages.meals.selector.confirmServings.title')}
          </DialogTitle>
          <p className="mt-1 text-[13px] text-[color:var(--mf-text-soft)]">{recipeTitle}</p>
        </DialogHeader>

        <div className="flex items-center justify-center gap-5 py-4">
          <button
            type="button"
            onClick={() => setServings((s) => Math.max(1, s - 1))}
            disabled={saving || servings <= 1}
            className="mf-stepper-btn h-11 w-11"
            aria-label={t('pages.meals.decreaseServings')}
          >
            <Minus className="h-5 w-5" strokeWidth={2} />
          </button>
          <span className="mf-display tabular-nums min-w-[3rem] text-center text-[44px] leading-none text-[color:var(--mf-green)]">
            {servings}
          </span>
          <button
            type="button"
            onClick={() => setServings((s) => Math.min(100, s + 1))}
            disabled={saving || servings >= 100}
            className="mf-stepper-btn h-11 w-11"
            aria-label={t('pages.meals.increaseServings')}
          >
            <Plus className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <p className="mb-4 text-center text-[13px] text-[color:var(--mf-text-mute)]">
          {t('pages.meals.selector.confirmServings.helper', { count: servings })}
        </p>

        <button
          type="button"
          onClick={() => onConfirm(servings)}
          disabled={saving}
          className="mf-btn mf-btn-primary w-full"
        >
          {t('pages.meals.selector.confirmServings.add')}
        </button>
      </DialogContent>
    </Dialog>
  );
};
