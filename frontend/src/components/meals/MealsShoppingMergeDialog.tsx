import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ShoppingPreviewItemDto } from '@/services/mealService';
import { getItemDisplayName } from '@/utils/itemUtils';

export interface MergePreviewItem extends ShoppingPreviewItemDto {
  selectedQuantity: number; // qty effectivement à envoyer (ce que l'utilisateur a coché)
}

export interface MergePreview {
  newOnes: MergePreviewItem[];
  merged: Array<MergePreviewItem & { previousQuantity: number; nextQuantity: number }>;
  alreadyCovered: Array<MergePreviewItem & { existingQuantity: number }>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: MergePreview | null;
  saving: boolean;
  onConfirm: () => void;
}

export const MealsShoppingMergeDialog = ({
  open,
  onOpenChange,
  preview,
  saving,
  onConfirm,
}: Props) => {
  const { t } = useTranslation();
  if (!preview) return null;

  const total =
    preview.newOnes.length + preview.merged.length + preview.alreadyCovered.length;

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
          <div className="mf-eyebrow mb-1">{t('pages.mealsShopping.merge.kicker')}</div>
          <DialogTitle className="mf-display text-[22px] leading-tight text-[color:var(--mf-text)]">
            {t('pages.mealsShopping.merge.title')}
          </DialogTitle>
          <p className="mt-1 text-[13px] text-[color:var(--mf-text-soft)]">
            {t('pages.mealsShopping.merge.subtitle', { count: total })}
          </p>
        </DialogHeader>

        <div className="mt-3 space-y-4">
          {preview.newOnes.length > 0 ? (
            <Section
              icon={<Plus className="h-3.5 w-3.5" strokeWidth={2} />}
              tone="green"
              title={t('pages.mealsShopping.merge.newSection', { count: preview.newOnes.length })}
            >
              {preview.newOnes.map((item) => (
                <Row
                  key={`n-${item.itemId}-${item.unit}`}
                  name={getItemDisplayName(
                    { name: item.itemName, householdId: item.itemHouseholdId } as any,
                    t
                  )}
                  imageUrl={item.itemImageUrl}
                >
                  <span className="mf-mono text-[12px] text-[color:var(--mf-green-leaf)]">
                    +{item.selectedQuantity} {item.unit}
                  </span>
                </Row>
              ))}
            </Section>
          ) : null}

          {preview.merged.length > 0 ? (
            <Section
              icon={<ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />}
              tone="info"
              title={t('pages.mealsShopping.merge.mergedSection', { count: preview.merged.length })}
            >
              {preview.merged.map((item) => (
                <Row
                  key={`m-${item.itemId}-${item.unit}`}
                  name={getItemDisplayName(
                    { name: item.itemName, householdId: item.itemHouseholdId } as any,
                    t
                  )}
                  imageUrl={item.itemImageUrl}
                >
                  <span className="mf-mono text-[12px] text-[color:var(--mf-text-mute)]">
                    <s>
                      {item.previousQuantity} {item.unit}
                    </s>
                  </span>
                  <ArrowRight
                    className="h-3 w-3 text-[color:var(--mf-text-mute)]"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span className="mf-mono text-[12px] font-semibold text-[color:var(--mf-info)]">
                    {item.nextQuantity} {item.unit}
                  </span>
                </Row>
              ))}
            </Section>
          ) : null}

          {preview.alreadyCovered.length > 0 ? (
            <Section
              icon={<Check className="h-3.5 w-3.5" strokeWidth={2} />}
              tone="muted"
              title={t('pages.mealsShopping.merge.coveredSection', {
                count: preview.alreadyCovered.length,
              })}
            >
              {preview.alreadyCovered.map((item) => (
                <Row
                  key={`c-${item.itemId}-${item.unit}`}
                  name={getItemDisplayName(
                    { name: item.itemName, householdId: item.itemHouseholdId } as any,
                    t
                  )}
                  imageUrl={item.itemImageUrl}
                >
                  <span className="mf-mono text-[12px] text-[color:var(--mf-text-mute)]">
                    {item.existingQuantity} {item.unit}
                  </span>
                </Row>
              ))}
            </Section>
          ) : null}

          {total === 0 ? (
            <p className="text-center text-[13px] text-[color:var(--mf-text-soft)]">
              {t('pages.mealsShopping.merge.empty')}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onConfirm}
          disabled={saving || total === 0}
          className="mf-btn mf-btn-primary mt-5 w-full"
        >
          {t('pages.mealsShopping.merge.confirm')}
        </button>
      </DialogContent>
    </Dialog>
  );
};

interface SectionProps {
  icon: React.ReactNode;
  tone: 'green' | 'info' | 'muted';
  title: string;
  children: React.ReactNode;
}
const Section = ({ icon, tone, title, children }: SectionProps) => {
  const color =
    tone === 'green'
      ? 'var(--mf-green-leaf)'
      : tone === 'info'
        ? 'var(--mf-info)'
        : 'var(--mf-text-mute)';
  return (
    <div>
      <div
        className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em]"
        style={{ color }}
      >
        {icon}
        {title}
      </div>
      <div className="mf-card-elevated divide-y divide-[color:var(--mf-night-line)]">
        {children}
      </div>
    </div>
  );
};

interface RowProps {
  name: string;
  imageUrl?: string | null;
  children: React.ReactNode;
}
const Row = ({ name, imageUrl, children }: RowProps) => (
  <div className="flex items-center justify-between gap-3 px-3 py-2.5">
    <div className="flex items-center gap-2.5 min-w-0">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-8 w-8 flex-shrink-0 rounded-[8px] border border-[color:var(--mf-night-line)] object-cover"
        />
      ) : null}
      <span className="text-[14px] text-[color:var(--mf-text)] truncate">{name}</span>
    </div>
    <span className="flex items-center gap-2 flex-shrink-0">{children}</span>
  </div>
);
