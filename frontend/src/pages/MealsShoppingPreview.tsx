import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useMealStore } from '@/stores/mealStore';
import type { ShoppingPreviewDto, ShoppingPreviewItemDto } from '@/services/mealService';
import {
  MealsShoppingMergeDialog,
  type MergePreview,
} from '@/components/meals/MealsShoppingMergeDialog';
import { getItemDisplayName } from '@/utils/itemUtils';

type SelectedMap = Record<string, boolean>; // key = `${itemId}|${unit}`
type QuantityOverride = Record<string, number>;

const itemKey = (item: ShoppingPreviewItemDto) => `${item.itemId}|${item.unit}`;

const CATEGORY_EMOJI: Record<string, string> = {
  vegetables: '🥬',
  fruits: '🍎',
  meat: '🥩',
  fish: '🐟',
  seafood: '🦐',
  dairy: '🥛',
  grains: '🌾',
  spices: '🌶️',
  beverages: '🧃',
  snacks: '🍪',
  condiments: '🫙',
  frozen: '❄️',
  canned: '🥫',
  meal: '🍽️',
  preparation: '👨‍🍳',
  cleaning_products: '🧴',
  other: '📦',
};
const categoryEmoji = (cat: string) => CATEGORY_EMOJI[cat] ?? '📦';

const MealsShoppingPreview = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedHouseholdId } = useProtectedRoute();
  const { fetchShoppingPreview, commitShopping } = useMealStore();

  const [preview, setPreview] = useState<ShoppingPreviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedMap>({});
  const [quantities, setQuantities] = useState<QuantityOverride>({});
  const [showInStock, setShowInStock] = useState(false);
  const [showInShoppingList, setShowInShoppingList] = useState(false);
  const [showBasics, setShowBasics] = useState(false);
  const [mergePreview, setMergePreview] = useState<MergePreview | null>(null);
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    if (!selectedHouseholdId) return;
    let cancelled = false;
    setLoading(true);
    fetchShoppingPreview()
      .then((data) => {
        if (cancelled) return;
        setPreview(data);
        const initial: SelectedMap = {};
        data.toBuy.forEach((it) => (initial[itemKey(it)] = true));
        data.basics.forEach((it) => (initial[itemKey(it)] = false));
        setSelected(initial);
      })
      .catch((error) => {
        toast({
          title: t('messages.error.somethingWentWrong'),
          variant: 'destructive',
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedHouseholdId, fetchShoppingPreview, toast, t]);

  // Group toBuy by category (rayon)
  const toBuyByAisle = useMemo(() => {
    const map = new Map<string, ShoppingPreviewItemDto[]>();
    (preview?.toBuy ?? []).forEach((it) => {
      const list = map.get(it.itemCategory) ?? [];
      list.push(it);
      map.set(it.itemCategory, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [preview]);

  const toggleOne = (key: string) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const adjustQty = (item: ShoppingPreviewItemDto, delta: number) => {
    const key = itemKey(item);
    const current = quantities[key] ?? item.toBuy ?? item.needed;
    const next = Math.max(0, +(current + delta).toFixed(3));
    setQuantities((prev) => ({ ...prev, [key]: next }));
  };

  const effectiveQty = (item: ShoppingPreviewItemDto): number => {
    const key = itemKey(item);
    if (key in quantities) return quantities[key]!;
    // Pour les basiques, la quantité par défaut suggérée est ce qui est nécessaire (toBuy=0
    // car on ne sait pas vraiment) — on suggère `needed` comme point de départ.
    return item.toBuy > 0 ? item.toBuy : item.needed;
  };

  const buildMergePreview = (): MergePreview => {
    const allCandidates = [...(preview?.toBuy ?? []), ...(preview?.basics ?? [])];
    const newOnes: MergePreview['newOnes'] = [];
    const merged: MergePreview['merged'] = [];
    const alreadyCovered: MergePreview['alreadyCovered'] = [];

    allCandidates.forEach((item) => {
      const key = itemKey(item);
      if (!selected[key]) return;
      const qty = effectiveQty(item);
      if (qty <= 0) return;

      const existing = item.existingShoppingQty || 0;
      const enriched = { ...item, selectedQuantity: qty };

      if (!existing) {
        newOnes.push(enriched);
      } else if (existing >= qty) {
        alreadyCovered.push({ ...enriched, existingQuantity: existing });
      } else {
        merged.push({
          ...enriched,
          previousQuantity: existing,
          nextQuantity: +(existing + qty).toFixed(3),
        });
      }
    });

    return { newOnes, merged, alreadyCovered };
  };

  const openMerge = () => {
    setMergePreview(buildMergePreview());
  };

  const closeMerge = (open: boolean) => {
    if (!open) setMergePreview(null);
  };

  const confirmMerge = async () => {
    if (!mergePreview) return;
    const items = [
      ...mergePreview.newOnes.map((it) => ({
        itemId: it.itemId,
        quantity: it.selectedQuantity,
        unit: it.unit,
        recipes: it.recipes,
      })),
      ...mergePreview.merged.map((it) => ({
        itemId: it.itemId,
        quantity: it.selectedQuantity,
        unit: it.unit,
        recipes: it.recipes,
      })),
      // alreadyCovered : on les passe quand même au backend qui les renverra dans alreadyCovered
      ...mergePreview.alreadyCovered.map((it) => ({
        itemId: it.itemId,
        quantity: it.selectedQuantity,
        unit: it.unit,
        recipes: it.recipes,
      })),
    ];

    setCommitting(true);
    try {
      const result = await commitShopping(items);
      const total =
        result.newItems.length + result.mergedItems.length + result.alreadyCoveredItems.length;
      toast({
        title: t('pages.mealsShopping.toasts.commitDone'),
        description: t('pages.mealsShopping.toasts.commitDoneDescription', { count: total }),
      });
      setMergePreview(null);
      navigate('/shopping');
    } catch (error) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        variant: 'destructive',
      });
    } finally {
      setCommitting(false);
    }
  };

  const selectedCount = useMemo(() => {
    if (!preview) return 0;
    return [...preview.toBuy, ...preview.basics].filter((it) => selected[itemKey(it)]).length;
  }, [preview, selected]);

  return (
    <div className="mf-page min-h-screen pb-32">
      <div className="px-4 pt-6 sm:px-8 sm:pt-10">
        <header className="mf-card flex items-center gap-4 p-4">
          <button
            type="button"
            onClick={() => navigate('/meals')}
            className="mf-icon-btn h-10 w-10 text-[color:var(--mf-text)]"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <div>
            <div className="mf-eyebrow mb-1">{t('pages.mealsShopping.kicker')}</div>
            <h1 className="mf-display text-[20px] leading-tight text-[color:var(--mf-text)]">
              {t('pages.mealsShopping.title')}
            </h1>
          </div>
        </header>

        {loading ? (
          <div className="mf-card mt-4 p-10 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--mf-green)] border-t-transparent" />
          </div>
        ) : !preview ? null : preview.toBuy.length + preview.basics.length + preview.inStock.length + preview.inShoppingList.length === 0 ? (
          <div className="mf-card mt-4 p-10 text-center">
            <p className="text-[15px] text-[color:var(--mf-text)]">
              {t('pages.mealsShopping.empty.title')}
            </p>
            <p className="mt-2 text-[13px] text-[color:var(--mf-text-soft)]">
              {t('pages.mealsShopping.empty.subtitle')}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-5 mf-fade-in">
            {/* Sections "à acheter" par rayon */}
            {toBuyByAisle.map(([aisle, items]) => (
              <section key={aisle} className="mf-list">
                <div className="mf-list-header">
                  <div className="flex items-center gap-2 text-[15px] font-semibold text-[color:var(--mf-text)]">
                    <span className="text-[color:var(--mf-green-leaf)]">●</span>
                    {t(`items.categories.${aisle}`, { defaultValue: aisle })}
                  </div>
                  <span className="text-[13px] text-[color:var(--mf-text-soft)]">
                    {items.length}
                  </span>
                </div>
                {items.map((item) => (
                  <PreviewRow
                    key={itemKey(item)}
                    item={item}
                    checked={!!selected[itemKey(item)]}
                    quantity={effectiveQty(item)}
                    onToggle={() => toggleOne(itemKey(item))}
                    onIncrement={() => adjustQty(item, 1)}
                    onDecrement={() => adjustQty(item, -1)}
                  />
                ))}
              </section>
            ))}

            {/* Section "Basiques à vérifier" — repliée par défaut */}
            {preview.basics.length > 0 ? (
              <CollapsibleSection
                title={t('pages.mealsShopping.basicsTitle')}
                hint={t('pages.mealsShopping.basicsHint')}
                count={preview.basics.length}
                open={showBasics}
                onToggle={() => setShowBasics((v) => !v)}
              >
                {preview.basics.map((item) => (
                  <PreviewRow
                    key={itemKey(item)}
                    item={item}
                    checked={!!selected[itemKey(item)]}
                    quantity={effectiveQty(item)}
                    onToggle={() => toggleOne(itemKey(item))}
                    onIncrement={() => adjustQty(item, 1)}
                    onDecrement={() => adjustQty(item, -1)}
                  />
                ))}
              </CollapsibleSection>
            ) : null}

            {/* Section "Déjà dans ta liste de courses" — repliée par défaut */}
            {preview.inShoppingList.length > 0 ? (
              <CollapsibleSection
                title={t('pages.mealsShopping.inShoppingListTitle')}
                hint={t('pages.mealsShopping.inShoppingListHint')}
                count={preview.inShoppingList.length}
                open={showInShoppingList}
                onToggle={() => setShowInShoppingList((v) => !v)}
              >
                {preview.inShoppingList.map((item) => {
                  const name = getItemDisplayName(
                    { name: item.itemName, householdId: item.itemHouseholdId } as any,
                    t
                  );
                  return (
                    <div key={itemKey(item)} className="mf-list-row">
                      {item.itemImageUrl ? (
                        <img
                          src={item.itemImageUrl}
                          alt=""
                          className="h-11 w-11 flex-shrink-0 rounded-md border border-[color:var(--mf-night-line)] object-cover"
                        />
                      ) : (
                        <span className="mf-thumb">{categoryEmoji(item.itemCategory)}</span>
                      )}
                      <div>
                        <div className="text-[14px] text-[color:var(--mf-text)]">{name}</div>
                        <div className="mt-0.5 text-[12px] text-[color:var(--mf-text-mute)]">
                          {t('pages.mealsShopping.partial.alreadyOnList', {
                            qty: item.existingShoppingQty,
                            unit: item.unit,
                          })}
                        </div>
                      </div>
                      <span />
                    </div>
                  );
                })}
              </CollapsibleSection>
            ) : null}

            {/* Section "Déjà dans le frigo" — repliée par défaut */}
            {preview.inStock.length > 0 ? (
              <CollapsibleSection
                title={t('pages.mealsShopping.inStockTitle')}
                hint={t('pages.mealsShopping.inStockHint')}
                count={preview.inStock.length}
                open={showInStock}
                onToggle={() => setShowInStock((v) => !v)}
              >
                {preview.inStock.map((item) => {
                  const name = getItemDisplayName(
                    { name: item.itemName, householdId: item.itemHouseholdId } as any,
                    t
                  );
                  return (
                    <div key={itemKey(item)} className="mf-list-row">
                      {item.itemImageUrl ? (
                        <img
                          src={item.itemImageUrl}
                          alt=""
                          className="h-11 w-11 flex-shrink-0 rounded-md border border-[color:var(--mf-night-line)] object-cover"
                        />
                      ) : (
                        <span className="mf-thumb">{categoryEmoji(item.itemCategory)}</span>
                      )}
                      <div>
                        <div className="text-[14px] text-[color:var(--mf-text)]">{name}</div>
                        <div className="mt-0.5 text-[12px] text-[color:var(--mf-text-mute)]">
                          {t('pages.mealsShopping.partial.have', {
                            have: item.inStock,
                            unit: item.unit,
                          })}
                        </div>
                      </div>
                      <span />
                    </div>
                  );
                })}
              </CollapsibleSection>
            ) : null}
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      {preview && preview.toBuy.length + preview.basics.length > 0 ? (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur"
          style={{
            borderColor: 'var(--mf-night-line)',
            background: 'color-mix(in srgb, var(--mf-night) 92%, transparent)',
          }}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-8">
            <div className="text-[13px] text-[color:var(--mf-text-soft)]">
              {t('pages.mealsShopping.selectedCount', { count: selectedCount })}
            </div>
            <button
              type="button"
              onClick={openMerge}
              disabled={selectedCount === 0}
              className="mf-btn mf-btn-primary"
            >
              <ShoppingCart className="h-4 w-4" strokeWidth={2} aria-hidden />
              {t('pages.mealsShopping.send')}
            </button>
          </div>
        </div>
      ) : null}

      <MealsShoppingMergeDialog
        open={!!mergePreview}
        onOpenChange={closeMerge}
        preview={mergePreview}
        saving={committing}
        onConfirm={confirmMerge}
      />
    </div>
  );
};

interface CollapsibleProps {
  title: string;
  hint: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}
const CollapsibleSection = ({
  title,
  hint,
  count,
  open,
  onToggle,
  children,
}: CollapsibleProps) => (
  <section className="mf-list">
    <button
      type="button"
      onClick={onToggle}
      className="mf-list-header w-full text-left"
    >
      <div>
        <div className="flex items-center gap-2 text-[15px] font-semibold text-[color:var(--mf-text)]">
          {title}
          <span className="text-[13px] font-normal text-[color:var(--mf-text-soft)]">
            · {count}
          </span>
        </div>
        <div className="mt-1 text-[12px] text-[color:var(--mf-text-mute)]">{hint}</div>
      </div>
      <div className="mf-icon-btn">
        {open ? (
          <ChevronUp className="h-4 w-4" strokeWidth={1.8} />
        ) : (
          <ChevronDown className="h-4 w-4" strokeWidth={1.8} />
        )}
      </div>
    </button>
    {open ? children : null}
  </section>
);

interface PreviewRowProps {
  item: ShoppingPreviewItemDto;
  checked: boolean;
  quantity: number;
  onToggle: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}
const PreviewRow = ({
  item,
  checked,
  quantity,
  onToggle,
  onIncrement,
  onDecrement,
}: PreviewRowProps) => {
  const { t } = useTranslation();
  const displayName = getItemDisplayName(
    { name: item.itemName, householdId: item.itemHouseholdId } as any,
    t
  );
  const consolidated = item.recipes.length > 1;
  const partial = item.inStock > 0 && item.toBuy > 0;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={checked}
      aria-label={displayName}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      className="mf-list-row cursor-pointer transition-colors hover:bg-[color:var(--mf-night-elevated)]"
    >
      <span
        aria-hidden
        className={`mf-checkbox${checked ? ' is-checked' : ''} flex items-center justify-center`}
      >
        {checked ? <span className="text-[12px] text-white leading-none">✓</span> : null}
      </span>

      {item.itemImageUrl ? (
        <img
          src={item.itemImageUrl}
          alt=""
          className="h-11 w-11 flex-shrink-0 rounded-md border border-[color:var(--mf-night-line)] object-cover"
        />
      ) : (
        <span className="mf-thumb">{categoryEmoji(item.itemCategory)}</span>
      )}

      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[15px] font-semibold text-[color:var(--mf-text)]">
            {displayName}
          </span>
          <span className="mf-mono text-[12px] text-[color:var(--mf-text-soft)]">
            {quantity} {item.unit}
          </span>
        </div>

        {/* Recettes (consolidé) */}
        {item.recipes.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {consolidated ? (
              <span className="mf-mono text-[10px] uppercase tracking-[.12em] text-[color:var(--mf-text-mute)]">
                {t('pages.mealsShopping.consolidatedFrom')}
              </span>
            ) : null}
            {item.recipes.map((recipe) => (
              <span key={recipe} className="mf-badge mf-badge-neutral">
                {recipe}
              </span>
            ))}
          </div>
        ) : null}

        {/* Quantité partielle (frigo) */}
        {partial ? (
          <div className="mt-1.5 text-[12px] text-[color:var(--mf-warning)]">
            {t('pages.mealsShopping.partial.line', {
              have: item.inStock,
              missing: item.toBuy,
              total: item.needed,
              unit: item.unit,
            })}
          </div>
        ) : null}

        {/* Quantité déjà dans la liste de courses */}
        {item.existingShoppingQty > 0 ? (
          <div className="mt-1 text-[12px] text-[color:var(--mf-info)]">
            {t('pages.mealsShopping.partial.alreadyOnList', {
              qty: item.existingShoppingQty,
              unit: item.unit,
            })}
          </div>
        ) : null}

        {/* Stepper qty */}
        {checked ? (
          <div className="mt-2 inline-flex items-center gap-1" onClick={stop}>
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                onDecrement();
              }}
              className="mf-stepper-btn h-7 w-7 text-[12px]"
              aria-label={t('pages.mealsShopping.decreaseQty')}
            >
              −
            </button>
            <span className="mf-mono min-w-[3rem] text-center text-[12px] text-[color:var(--mf-text)]">
              {quantity} {item.unit}
            </span>
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                onIncrement();
              }}
              className="mf-stepper-btn h-7 w-7 text-[12px]"
              aria-label={t('pages.mealsShopping.increaseQty')}
            >
              +
            </button>
          </div>
        ) : null}
      </div>

      <span /> {/* trailing spacer (grid 4 cols) */}
    </div>
  );
};

export default MealsShoppingPreview;
