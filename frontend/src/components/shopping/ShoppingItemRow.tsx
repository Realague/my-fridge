import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CalendarIcon,
  Check,
  PenLine,
  Save,
  Trash2,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ItemImage } from '@/components/ItemImage';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { QuantitySelector } from '@/components/QuantitySelector';

import { Item } from '@/services/itemService';
import { StorageArea } from '@/services/storageAreaService';
import { ShoppingItem } from '@/stores/shoppingStore';
import { StorageAreaType } from '@/types/enums';
import { CategoryIcon } from '@/utils/categoryIcons';
import { getSuggestedStorageAreaId } from '@/utils/categoryStorageMapping';
import { getCategoryColor, getItemDisplayName } from '@/utils/itemUtils';
import { formatQuantityWithUnit } from '@/utils/unitSystem';
import { useDateFormat } from '@/utils/dateFormatting';

export interface ShoppingItemRowProps {
  shoppingItem: ShoppingItem;
  isCompleted?: boolean;
  currentUserId?: string;
  storageAreas: StorageArea[];
  editingItemId: string | null;
  quickStoreItemId: string | null;
  quickStoreDate: string;
  onToggleComplete: (id: string) => void;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, quantity: string, unit: string) => void;
  onDelete: (id: string) => void;
  onQuickStore: (id: string) => void;
  onSkipQuickStore: (id: string) => void;
  onCancelQuickStore: () => void;
  onQuickStoreDateChange: (date: string) => void;
}

export const ShoppingItemRow = ({
  shoppingItem,
  isCompleted = false,
  currentUserId,
  storageAreas,
  editingItemId,
  quickStoreItemId,
  quickStoreDate,
  onToggleComplete,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onQuickStore,
  onSkipQuickStore,
  onCancelQuickStore,
  onQuickStoreDateChange,
}: ShoppingItemRowProps) => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();

  const [editQuantity, setEditQuantity] = useState(shoppingItem.quantity);
  const [editUnit, setEditUnit] = useState(shoppingItem.unit);

  const isEditing = editingItemId === shoppingItem.id;
  const isQuickStoring = quickStoreItemId === shoppingItem.id;
  const itemData = (shoppingItem.item || null) as Item | null;

  const suggestedAreaId = getSuggestedStorageAreaId(
    shoppingItem.item?.category,
    storageAreas
  );
  const suggestedArea = storageAreas.find((a) => a.id === suggestedAreaId);
  const isFreezerArea = suggestedArea?.type === StorageAreaType.FREEZER;

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

  return (
    <div className="space-y-0">
      <div
        className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg hover:bg-accent transition-colors ${
          isCompleted
            ? 'bg-accent opacity-75'
            : isQuickStoring
              ? 'bg-mf-green-soft rounded-b-none'
              : 'bg-muted'
        }`}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={isCompleted}
          aria-label={t(isCompleted ? 'a11y.shopping.markIncomplete' : 'a11y.shopping.markComplete', { name: itemName })}
          onClick={() => onToggleComplete(shoppingItem.id)}
          className="group flex-shrink-0 -my-2 -ml-2 sm:-ml-2.5 flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span
            aria-hidden
            className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
              isCompleted
                ? 'bg-primary'
                : 'border-2 border-border bg-card group-hover:border-primary'
            }`}
          >
            {isCompleted && <Check className="h-4 w-4 text-white" />}
          </span>
        </button>

        <ItemImage
          src={shoppingItem.item?.imageUrl}
          alt={itemName}
          containerClassName="w-10 h-10 rounded-md shrink-0"
          fallbackIconSize={22}
          category={shoppingItem.item?.category}
        />

        <div className="flex-1 min-w-0">
          <div className="min-w-0 flex items-center gap-2">
            <span
              className={`font-medium truncate min-w-0 ${
                isCompleted
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground'
              }`}
            >
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
                  // Avatar initials always come from the real name (never "T" for "Toi").
                  const initials = shoppingItem.creator.displayName
                    .trim()
                    .split(/\s+/)
                    .map((w) => w.charAt(0))
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  return (
                    <>
                      {/* Desktop: avatar + name chip (pill), no "Ajouté par" prefix. */}
                      <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-mf-night-surface py-1 pl-1 pr-3 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mf-text text-mf-night dark:bg-mf-night dark:text-mf-text text-[11px] font-bold uppercase leading-none">
                          {initials}
                        </span>
                        <span className="text-[13px] font-medium truncate">{authorName}</span>
                      </span>
                      {/* Mobile: compact avatar chip + date. */}
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

        <div className="flex items-center gap-1 shrink-0 self-center">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                className="h-8 px-2"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="h-8 px-2"
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <>
              {!isCompleted && !isQuickStoring && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onStartEdit(shoppingItem.id)}
                  className="h-8 w-8 p-0 opacity-70 hover:opacity-100 transition-opacity hover:bg-primary/10"
                >
                  <PenLine className="h-4 w-4" />
                </Button>
              )}
              {!isEditing && !isQuickStoring && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(shoppingItem.id)}
                  className="h-8 w-8 p-0 text-mf-danger hover:bg-mf-danger-soft"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {isQuickStoring && (
        <div className="bg-mf-green-soft border border-t-0 border-mf-green/30 rounded-b-lg px-3 pb-3 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            {suggestedArea && (
              <span className="text-xs font-medium text-mf-green-deep">
                {t('pages.shopping.suggestedArea', {
                  area: suggestedArea.name,
                })}
              </span>
            )}
            {!isFreezerArea && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5 bg-white dark:bg-background font-normal"
                  >
                    <CalendarIcon className="h-3 w-3" />
                    {quickStoreDate
                      ? format(new Date(quickStoreDate), 'dd/MM/yyyy', {
                          locale: fr,
                        })
                      : t('pages.shopping.expirationDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      quickStoreDate ? new Date(quickStoreDate) : undefined
                    }
                    onSelect={(date) =>
                      onQuickStoreDateChange(
                        date ? format(date, 'yyyy-MM-dd') : ''
                      )
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
            <div className="flex gap-1 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSkipQuickStore(shoppingItem.id)}
                className="h-7 px-2 text-xs text-muted-foreground"
              >
                {t('pages.shopping.skip')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelQuickStore}
                className="h-7 px-2 text-xs"
              >
                <X className="h-3 w-3" />
              </Button>
              <Button
                variant="green"
                size="sm"
                onClick={() => onQuickStore(shoppingItem.id)}
                className="h-7 px-2 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                {t('pages.shopping.validate')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingItemRow;
