import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, Trash2, Utensils, PackageX, ChevronRight } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { StockExitType } from '@/types/enums';
import type { StoredItem } from '@/services/storedItemService';
import type { Item } from '@/services/itemService';
import { ItemImage } from '@/components/ItemImage';
import { getItemDisplayName } from '@/utils/itemUtils';
import { formatQuantityWithUnit } from '@/utils/unitSystem';

interface ExitActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storedItem: StoredItem;
  item: Item | undefined;
  /** Called with the chosen exit type and quantity. */
  onExit: (type: StockExitType, quantity: number) => void;
}

/**
 * Shared Fresh-style modal offering the 3 stock-exit actions
 * (Consommé / Jeté / Retiré) with a quantity stepper.
 */
export function ExitActionModal({
  open,
  onOpenChange,
  storedItem,
  item,
  onExit,
}: ExitActionModalProps) {
  const { t } = useTranslation();

  const total = Math.max(0, Number(storedItem.quantity) || 0);
  const isInteger = Number.isInteger(total);
  // Whole-unit items step by 1; measured/fractional stock (e.g. 0.5 kg) lets the
  // user type any partial amount up to the total.
  const step = isInteger ? 1 : 0.1;
  const minQuantity = isInteger ? 1 : 0;
  // Show the quantity control whenever there is more than one unit OR the stock is
  // fractional (so a sub-unit amount can be chosen).
  const hasMultiple = total > 1 || !isInteger;
  // Default: whole-unit stock exits 1 at a time; fractional stock defaults to all.
  const defaultQuantity = isInteger ? 1 : total;
  const [quantity, setQuantity] = useState(defaultQuantity);

  // Reset the stepper whenever the modal (re)opens for a different item.
  useEffect(() => {
    if (open) setQuantity(defaultQuantity);
  }, [open, storedItem.id]);

  const clamp = (n: number) => {
    const bounded = Math.min(total, Math.max(minQuantity, n));
    // Avoid floating-point noise from repeated 0.1 additions.
    return Math.round(bounded * 1000) / 1000;
  };

  const handleExit = (type: StockExitType) => {
    const qty = clamp(quantity);
    if (qty <= 0) return;
    onExit(type, qty);
    onOpenChange(false);
  };

  const displayName = item ? getItemDisplayName(item, t) : storedItem.item?.name ?? '';

  const actions: {
    type: StockExitType;
    icon: typeof Utensils;
    className: string;
    iconClassName: string;
  }[] = [
    {
      type: StockExitType.CONSUMED,
      icon: Utensils,
      className: 'bg-mf-green text-white',
      iconClassName: 'bg-white/20 text-white',
    },
    {
      type: StockExitType.WASTED,
      icon: Trash2,
      className: 'bg-card text-foreground border-[1.5px] border-mf-danger-soft',
      iconClassName: 'bg-mf-danger-soft text-mf-danger',
    },
    {
      type: StockExitType.REMOVED,
      icon: PackageX,
      className: 'bg-card text-foreground border-[1.5px] border-border',
      iconClassName: 'bg-muted text-muted-foreground',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:rounded-[24px] max-w-[460px]">
        <DialogHeader>
          <div className="flex items-center gap-3.5 text-left">
            <ItemImage
              src={item?.imageUrl ?? null}
              alt={displayName}
              containerClassName="w-14 h-14 rounded-[15px] shrink-0"
              fallbackIconSize={26}
              category={item?.category ?? storedItem.item?.category}
            />
            <div className="min-w-0">
              <DialogTitle className="font-display text-xl font-bold tracking-tight truncate">
                {displayName}
              </DialogTitle>
              <div className="text-sm text-muted-foreground mt-0.5">
                {formatQuantityWithUnit(storedItem.quantity, storedItem.unit, t, {
                  item,
                  itemName: displayName,
                })}
              </div>
            </div>
          </div>
        </DialogHeader>

        {hasMultiple && (
          <div className="mt-2">
            <div className="font-display font-bold text-[13px] text-muted-foreground mb-2.5">
              {t('stockExit.quantityLabel')}
            </div>
            <div className="flex items-center gap-4 bg-muted rounded-2xl px-3.5 py-2.5">
              <button
                type="button"
                onClick={() => setQuantity((q) => clamp(q - step))}
                disabled={quantity <= minQuantity}
                className="w-11 h-11 rounded-[13px] bg-card text-foreground shadow-sm flex items-center justify-center disabled:opacity-40 disabled:cursor-default"
                aria-label={t('stockExit.decrease')}
              >
                <Minus className="h-5 w-5" />
              </button>
              <div className="flex-1 text-center">
                <input
                  type="number"
                  inputMode="decimal"
                  min={minQuantity}
                  max={total}
                  step={step}
                  value={quantity}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setQuantity(Number.isNaN(v) ? minQuantity : v);
                  }}
                  onBlur={() => setQuantity((q) => clamp(q))}
                  aria-label={t('stockExit.quantityLabel')}
                  className="w-full bg-transparent border-0 outline-none text-center font-display font-extrabold text-[30px] leading-none tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {t('stockExit.ofTotal', { count: total })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuantity((q) => clamp(q + step))}
                disabled={quantity >= total}
                className="w-11 h-11 rounded-[13px] bg-card text-foreground shadow-sm flex items-center justify-center disabled:opacity-40 disabled:cursor-default"
                aria-label={t('stockExit.increase')}
              >
                <Plus className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setQuantity(total)}
                className="font-display font-bold text-[12.5px] text-mf-green-deep px-1.5 py-2"
              >
                {t('stockExit.all')}
              </button>
            </div>
          </div>
        )}

        <div className="font-display font-bold text-[13px] text-muted-foreground mt-3 mb-1">
          {t('stockExit.whatHappened')}
        </div>
        <div className="flex flex-col gap-2.5">
          {actions.map(({ type, icon: Icon, className, iconClassName }) => (
            <button
              key={type}
              type="button"
              onClick={() => handleExit(type)}
              className={cn(
                'appearance-none text-left rounded-[15px] px-4 py-3.5 flex items-center gap-3.5 font-display transition-transform hover:translate-x-0.5',
                className
              )}
            >
              <span
                className={cn(
                  'w-[42px] h-[42px] rounded-xl shrink-0 flex items-center justify-center',
                  iconClassName
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-[15px] leading-tight">
                  {t(`stockExit.${type}`)}
                </span>
                <span className="block text-xs font-medium mt-0.5 opacity-85">
                  {t(`stockExit.${type}Desc`)}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 opacity-50 shrink-0" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
