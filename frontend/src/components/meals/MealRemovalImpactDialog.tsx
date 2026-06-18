import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, ArrowRight, ShoppingCart, Snowflake } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  MealRemovalActionDto,
  MealRemovalImpactDto,
  MealRemovalShoppingItemDto,
  MealRemovalNoImpactItemDto,
} from '@/services/mealService';
import { getItemDisplayName } from '@/utils/itemUtils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  impact: MealRemovalImpactDto | null;
  saving: boolean;
  onConfirm: (actions: MealRemovalActionDto[]) => void;
}

type SelectedMap = Record<string, boolean>;

export const MealRemovalImpactDialog = ({
  open,
  onOpenChange,
  impact,
  saving,
  onConfirm,
}: Props) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<SelectedMap>({});

  // Reset defaults: toRemove cochés, toReduce cochés, alreadyPurchased décochés.
  useEffect(() => {
    if (!impact) return;
    const next: SelectedMap = {};
    impact.toRemove.forEach((it) => (next[it.shoppingItemId] = true));
    impact.toReduce.forEach((it) => (next[it.shoppingItemId] = true));
    impact.alreadyPurchased.forEach((it) => (next[it.shoppingItemId] = false));
    setSelected(next);
  }, [impact]);

  const toggle = (id: string) =>
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const totalChanges = useMemo(() => {
    if (!impact) return 0;
    return (
      impact.toRemove.length + impact.toReduce.length + impact.alreadyPurchased.length
    );
  }, [impact]);

  const handleConfirm = () => {
    if (!impact) return;
    const actions: MealRemovalActionDto[] = [];
    impact.toRemove.forEach((it) => {
      if (selected[it.shoppingItemId]) {
        actions.push({ shoppingItemId: it.shoppingItemId, action: 'remove' });
      }
    });
    impact.toReduce.forEach((it) => {
      if (selected[it.shoppingItemId]) {
        actions.push({
          shoppingItemId: it.shoppingItemId,
          action: 'reduce',
          newQuantity: it.remainingQuantity,
        });
      }
    });
    impact.alreadyPurchased.forEach((it) => {
      if (selected[it.shoppingItemId]) {
        actions.push({ shoppingItemId: it.shoppingItemId, action: 'remove' });
      }
    });
    onConfirm(actions);
  };

  if (!impact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        style={{
          background: 'var(--mf-night-surface)',
          border: '1px solid var(--mf-night-line)',
          borderRadius: 'var(--mf-radius-xl)',
          color: 'var(--mf-text)',
          fontFamily: 'var(--mf-font-body)',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <DialogHeader>
          <div className="mf-eyebrow mb-1">{t('pages.mealRemoval.kicker')}</div>
          <DialogTitle className="mf-display text-[22px] leading-tight text-[color:var(--mf-text)]">
            {t('pages.mealRemoval.title', { title: impact.recipeTitle })}
          </DialogTitle>
          <p className="mt-1 text-[13px] text-[color:var(--mf-text-soft)]">
            {totalChanges === 0
              ? t('pages.mealRemoval.subtitleEmpty')
              : t('pages.mealRemoval.subtitle')}
          </p>
        </DialogHeader>

        <div className="mt-3 space-y-4">
          {impact.toRemove.length > 0 ? (
            <ImpactSection
              tone="danger"
              icon={<Trash2 className="h-3.5 w-3.5" strokeWidth={2} />}
              title={t('pages.mealRemoval.toRemoveTitle')}
              hint={t('pages.mealRemoval.toRemoveHint')}
            >
              {impact.toRemove.map((item) => (
                <ActionRow
                  key={item.shoppingItemId}
                  item={item}
                  checked={!!selected[item.shoppingItemId]}
                  onToggle={() => toggle(item.shoppingItemId)}
                  showStrike
                />
              ))}
            </ImpactSection>
          ) : null}

          {impact.toReduce.length > 0 ? (
            <ImpactSection
              tone="info"
              icon={<ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />}
              title={t('pages.mealRemoval.toReduceTitle')}
              hint={t('pages.mealRemoval.toReduceHint')}
            >
              {impact.toReduce.map((item) => (
                <ActionRow
                  key={item.shoppingItemId}
                  item={item}
                  checked={!!selected[item.shoppingItemId]}
                  onToggle={() => toggle(item.shoppingItemId)}
                  showQtyChange
                />
              ))}
            </ImpactSection>
          ) : null}

          {impact.alreadyPurchased.length > 0 ? (
            <ImpactSection
              tone="warn"
              icon={<ShoppingCart className="h-3.5 w-3.5" strokeWidth={2} />}
              title={t('pages.mealRemoval.alreadyPurchasedTitle')}
              hint={t('pages.mealRemoval.alreadyPurchasedHint')}
            >
              {impact.alreadyPurchased.map((item) => (
                <ActionRow
                  key={item.shoppingItemId}
                  item={item}
                  checked={!!selected[item.shoppingItemId]}
                  onToggle={() => toggle(item.shoppingItemId)}
                  alreadyPurchased
                />
              ))}
            </ImpactSection>
          ) : null}

          {impact.noImpact.length > 0 ? (
            <ImpactSection
              tone="muted"
              icon={<Snowflake className="h-3.5 w-3.5" strokeWidth={2} />}
              title={t('pages.mealRemoval.noImpactTitle')}
              hint={t('pages.mealRemoval.noImpactHint')}
            >
              {impact.noImpact.map((item) => (
                <NoImpactRow key={item.itemId} item={item} />
              ))}
            </ImpactSection>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving}
          className="mf-btn mf-btn-danger mt-5 w-full"
        >
          {t('pages.mealRemoval.confirm', { title: impact.recipeTitle })}
        </button>
      </DialogContent>
    </Dialog>
  );
};

interface SectionProps {
  tone: 'danger' | 'info' | 'warn' | 'muted';
  icon: React.ReactNode;
  title: string;
  hint: string;
  children: React.ReactNode;
}
const ImpactSection = ({ tone, icon, title, hint, children }: SectionProps) => {
  const color =
    tone === 'danger'
      ? 'var(--mf-danger)'
      : tone === 'info'
        ? 'var(--mf-info)'
        : tone === 'warn'
          ? 'var(--mf-warning)'
          : 'var(--mf-text-mute)';
  return (
    <div>
      <div className="mb-2">
        <div
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em]"
          style={{ color }}
        >
          {icon}
          {title}
        </div>
        <p className="mt-1 text-[12px] text-[color:var(--mf-text-mute)]">{hint}</p>
      </div>
      <div className="mf-card-elevated divide-y divide-[color:var(--mf-night-line)]">
        {children}
      </div>
    </div>
  );
};

interface ActionRowProps {
  item: MealRemovalShoppingItemDto;
  checked: boolean;
  onToggle: () => void;
  showStrike?: boolean;
  showQtyChange?: boolean;
  alreadyPurchased?: boolean;
}
const ActionRow = ({
  item,
  checked,
  onToggle,
  showStrike,
  showQtyChange,
  alreadyPurchased,
}: ActionRowProps) => {
  const { t } = useTranslation();
  const displayName = getItemDisplayName(
    { name: item.itemName, householdId: item.itemHouseholdId } as any,
    t
  );
  const struck = showStrike && checked;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={checked}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-[color:var(--mf-night-line)]"
    >
      <span
        className={`mf-checkbox${checked ? ' is-checked' : ''} flex flex-shrink-0 items-center justify-center`}
        aria-hidden
      >
        {checked ? <span className="text-[12px] text-white leading-none">✓</span> : null}
      </span>

      {item.itemImageUrl ? (
        <img
          src={item.itemImageUrl}
          alt=""
          className="h-9 w-9 flex-shrink-0 rounded-sm border border-[color:var(--mf-night-line)] object-cover"
        />
      ) : null}

      <div className="flex flex-1 min-w-0 flex-col gap-0.5">
        <div
          className={`text-[14px] truncate ${
            struck
              ? 'line-through text-[color:var(--mf-text-mute)]'
              : 'text-[color:var(--mf-text)]'
          }`}
        >
          {displayName}
        </div>

        {showQtyChange ? (
          <div className="flex items-center gap-2 text-[12px]">
            <span className="mf-mono text-[color:var(--mf-text-mute)]">
              <s>
                {item.currentQuantity} {item.unit}
              </s>
            </span>
            <ArrowRight
              className="h-3 w-3 text-[color:var(--mf-text-mute)]"
              strokeWidth={2}
              aria-hidden
            />
            <span
              className="mf-mono font-semibold"
              style={{ color: checked ? 'var(--mf-info)' : 'var(--mf-text-mute)' }}
            >
              {item.remainingQuantity} {item.unit}
            </span>
          </div>
        ) : (
          <div className="text-[12px] text-[color:var(--mf-text-mute)]">
            {item.currentQuantity} {item.unit}
          </div>
        )}

        {item.otherRecipes && item.otherRecipes.length > 0 ? (
          <div className="mt-0.5 text-[12px] text-[color:var(--mf-text-soft)]">
            {t('pages.mealRemoval.sharedReason', {
              count: item.reductionQuantity,
              unit: item.unit,
              others: item.otherRecipes.join(' · '),
            })}
          </div>
        ) : null}

        {alreadyPurchased ? (
          <div className="mt-0.5 text-[12px] text-[color:var(--mf-warning)]">
            {t('pages.mealRemoval.alreadyPurchasedReason')}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const NoImpactRow = ({ item }: { item: MealRemovalNoImpactItemDto }) => {
  const { t } = useTranslation();
  const displayName = getItemDisplayName(
    { name: item.itemName, householdId: item.itemHouseholdId } as any,
    t
  );
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      {item.itemImageUrl ? (
        <img
          src={item.itemImageUrl}
          alt=""
          className="h-9 w-9 flex-shrink-0 rounded-sm border border-[color:var(--mf-night-line)] object-cover"
        />
      ) : null}
      <div className="flex-1 min-w-0">
        <div className="text-[14px] text-[color:var(--mf-text)] truncate">{displayName}</div>
        <div className="text-[12px] text-[color:var(--mf-text-mute)]">
          {item.needed} {item.unit}
        </div>
      </div>
    </div>
  );
};
