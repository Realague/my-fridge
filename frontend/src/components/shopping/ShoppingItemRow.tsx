import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  PackageCheck,
  PenLine,
  Save,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ItemImage } from '@/components/ItemImage';
import { QuantitySelector } from '@/components/QuantitySelector';

import { Item } from '@/services/itemService';
import { ShoppingItem } from '@/stores/shoppingStore';
import { CategoryIcon } from '@/utils/categoryIcons';
import { getCategoryColor, getItemDisplayName } from '@/utils/itemUtils';
import { formatQuantityWithUnit } from '@/utils/unitSystem';
import { useDateFormat } from '@/utils/dateFormatting';

export type ShoppingItemRowVariant = 'to-buy' | 'to-store';

export interface ShoppingItemRowProps {
  shoppingItem: ShoppingItem;
  /** "to-buy" = À acheter (empty checkbox), "to-store" = À ranger (filled check). */
  variant: ShoppingItemRowVariant;
  currentUserId?: string;
  editingItemId: string | null;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, quantity: string, unit: string) => void;
  onDelete: (id: string) => void;
  /** to-buy: tap the checkbox → move the item to "À ranger". */
  onCheck: (id: string) => void;
  /** to-store: open the guided storage assistant for this single item. */
  onOpenAssistant: (id: string) => void;
  /** to-store: send the item back to "À acheter". */
  onMoveBack: (id: string) => void;
}

export const ShoppingItemRow = ({
  shoppingItem,
  variant,
  currentUserId,
  editingItemId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onCheck,
  onOpenAssistant,
  onMoveBack,
}: ShoppingItemRowProps) => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();

  const [editQuantity, setEditQuantity] = useState(shoppingItem.quantity);
  const [editUnit, setEditUnit] = useState(shoppingItem.unit);

  const isEditing = editingItemId === shoppingItem.id;
  const isToStore = variant === 'to-store';
  const itemData = (shoppingItem.item || null) as Item | null;

  const handleSave = () => {
    onSaveEdit(shoppingItem.id, editQuantity, editUnit);
  };

  const handleCancel = () => {
    setEditQuantity(shoppingItem.quantity);
    setEditUnit(shoppingItem.unit);
    onCancelEdit();
  };

  const itemName = itemData ? getItemDisplayName(itemData, t) : 'Unknown Item';
  const categoryLabel =
    t(`items.categories.${shoppingItem.item?.category}`) ||
    t('items.categories.other');

  if (!itemData) {
    return null;
  }

  // In "to-store" mode the whole row is a tap target that opens the assistant.
  const rowClickable = isToStore && !isEditing;

  return (
    <div
      className={`group flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg transition-colors ${
        isToStore
          ? 'bg-card border border-mf-green/30 hover:border-mf-green/60 cursor-pointer'
          : 'bg-muted hover:bg-accent'
      }`}
      {...(rowClickable
        ? {
            role: 'button',
            tabIndex: 0,
            onClick: () => onOpenAssistant(shoppingItem.id),
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenAssistant(shoppingItem.id);
              }
            },
          }
        : {})}
    >
      {/* Checkbox / done marker */}
      {isToStore ? (
        <span
          aria-hidden
          className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary"
        >
          <Check className="h-4 w-4 text-white" />
        </span>
      ) : (
        <button
          type="button"
          role="checkbox"
          aria-checked={false}
          aria-label={t('a11y.shopping.markComplete', { name: itemName })}
          onClick={() => onCheck(shoppingItem.id)}
          className="group/chk flex-shrink-0 -my-2 -ml-2 sm:-ml-2.5 flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-border bg-card transition-colors group-hover/chk:border-primary"
          />
        </button>
      )}

      <ItemImage
        src={shoppingItem.item?.imageUrl}
        alt={itemName}
        containerClassName="w-10 h-10 rounded-md shrink-0"
        fallbackIconSize={22}
        category={shoppingItem.item?.category}
      />

      <div className="flex-1 min-w-0">
        <div className="min-w-0 flex items-center gap-2">
          <span className="font-medium truncate min-w-0 text-foreground">
            {itemName}
          </span>
          <Badge
            className={`${getCategoryColor(
              shoppingItem.item?.category
            )} inline-flex items-center gap-1 shrink-0`}
            aria-label={categoryLabel}
            title={categoryLabel}
          >
            <CategoryIcon
              category={shoppingItem.item?.category}
              className="h-3.5 w-3.5"
            />
            <span className="hidden sm:inline">{categoryLabel}</span>
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {isEditing ? (
            <QuantitySelector
              item={itemData}
              initialQuantity={editQuantity}
              initialUnit={editUnit}
              onQuantityChange={(quantity, unit) => {
                setEditQuantity(quantity);
                setEditUnit(unit);
              }}
              className="w-full"
            />
          ) : (
            <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
              <span>
                {formatQuantityWithUnit(shoppingItem.quantity, shoppingItem.unit, t, {
                  item: itemData,
                  itemName,
                })}
              </span>
              {shoppingItem.creator && (() => {
                const authorName =
                  shoppingItem.creator.id === currentUserId
                    ? t('common.you')
                    : shoppingItem.creator.displayName;
                const initials = shoppingItem.creator.displayName
                  .trim()
                  .split(/\s+/)
                  .map((w) => w.charAt(0))
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                return (
                  <>
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-mf-night-surface py-1 pl-1 pr-3 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mf-text text-mf-night dark:bg-mf-night dark:text-mf-text text-[11px] font-bold uppercase leading-none">
                        {initials}
                      </span>
                      <span className="text-[13px] font-medium truncate">{authorName}</span>
                    </span>
                    <span className="sm:hidden inline-flex items-center gap-1.5 min-w-0">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-mf-night-surface pl-0.5 pr-2 py-0.5">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-mf-text text-mf-night dark:bg-mf-night dark:text-mf-text text-[9px] font-bold uppercase leading-none">
                          {initials}
                        </span>
                        <span className="text-[11px] font-medium truncate">{authorName}</span>
                      </span>
                      <span className="text-[11px] whitespace-nowrap">
                        · {formatDate(new Date(shoppingItem.createdAt), 'd MMM')}
                      </span>
                    </span>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-1 shrink-0 self-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isEditing ? (
          <>
            <Button variant="outline" size="sm" onClick={handleSave} className="h-8 px-2">
              <Save className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleCancel} className="h-8 px-2">
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : isToStore ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMoveBack(shoppingItem.id)}
              title={t('pages.shopping.moveBackToBuy')}
              aria-label={t('pages.shopping.moveBackToBuy')}
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-mf-green-soft hover:text-mf-green-deep"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(shoppingItem.id)}
              title={t('common.delete')}
              aria-label={t('common.delete')}
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-mf-danger hover:bg-mf-danger-soft"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="green"
              size="sm"
              onClick={() => onOpenAssistant(shoppingItem.id)}
              className="h-8 gap-1.5 px-3"
            >
              <PackageCheck className="h-4 w-4" />
              <span className="hidden sm:inline">{t('pages.shopping.store')}</span>
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStartEdit(shoppingItem.id)}
              className="h-8 w-8 p-0 opacity-70 hover:opacity-100 transition-opacity hover:bg-primary/10"
            >
              <PenLine className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(shoppingItem.id)}
              className="h-8 w-8 p-0 text-mf-danger hover:bg-mf-danger-soft"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default ShoppingItemRow;
