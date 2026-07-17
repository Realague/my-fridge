import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, GripVertical } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { shoppingRowMotion } from '@/lib/motion';

import { ShoppingItem } from '@/stores/shoppingStore';
import {
  Aisle,
  getAisleIcon,
  getAisleTranslationKey,
} from '@/utils/aisleMapping';

import {
  ShoppingItemRow,
  ShoppingItemRowProps,
} from './ShoppingItemRow';

type RowCallbackProps = Omit<ShoppingItemRowProps, 'shoppingItem'>;

export interface AisleSectionProps extends RowCallbackProps {
  aisle: Aisle;
  items: ShoppingItem[];
  collapsed?: boolean;
  onToggleCollapsed?: (aisle: Aisle) => void;
  /**
   * When true, renders the aisle in its compact "drag preview" form:
   * header only, no items. Used by the DragOverlay so the dragged ghost
   * stays small and easy to move around.
   */
  dragPreview?: boolean;
}

export const AisleSection = ({
  aisle,
  items,
  collapsed = false,
  onToggleCollapsed,
  dragPreview = false,
  ...rowProps
}: AisleSectionProps) => {
  const { t } = useTranslation();

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: aisle, disabled: dragPreview });

  const style: React.CSSProperties = dragPreview
    ? {}
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  const prefersReducedMotion = useReducedMotion() ?? false;
  const name = t(getAisleTranslationKey(aisle));
  const Icon = getAisleIcon(aisle);

  const contentId = `aisle-${aisle}-content`;
  const handleHeaderToggle = () => onToggleCollapsed?.(aisle);
  const effectiveCollapsed = collapsed || dragPreview;

  return (
    <section
      ref={dragPreview ? undefined : setNodeRef}
      style={style}
      className={`rounded-xl border border-border bg-card/80 backdrop-blur-sm shadow-sm ${
        isDragging ? 'opacity-30' : ''
      } ${dragPreview ? 'ring-2 ring-primary shadow-2xl cursor-grabbing' : ''}`}
      aria-label={name}
    >
      <header
        role={onToggleCollapsed ? 'button' : undefined}
        tabIndex={onToggleCollapsed ? 0 : undefined}
        aria-expanded={onToggleCollapsed ? !collapsed : undefined}
        aria-controls={onToggleCollapsed ? contentId : undefined}
        onClick={onToggleCollapsed ? handleHeaderToggle : undefined}
        onKeyDown={
          onToggleCollapsed
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleHeaderToggle();
                }
              }
            : undefined
        }
        className={`flex items-center gap-2 px-3 py-2 transition-opacity ${
          effectiveCollapsed ? '' : 'border-b border-border/60'
        } ${
          onToggleCollapsed
            ? 'cursor-pointer select-none hover:bg-accent/40'
            : ''
        }`}
      >
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="flex-shrink-0 p-1 -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-grab active:cursor-grabbing touch-none"
          aria-label={t('pages.shopping.aisles.dragHandleLabel', { name })}
          onClick={(event) => event.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>

        <Icon
          className="h-4 w-4 text-muted-foreground flex-shrink-0"
          aria-hidden
        />

        <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
          {name}
        </h3>

        <span className="ml-auto text-xs sm:text-sm text-muted-foreground tabular-nums">
          {items.length}
        </span>

        {onToggleCollapsed && (
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform ${
              effectiveCollapsed ? '-rotate-90' : ''
            }`}
            aria-hidden
          />
        )}
      </header>

      {!effectiveCollapsed && (
        <div id={contentId} className="p-2 sm:p-3 space-y-2">
          <AnimatePresence initial={false}>
            {items.map((shoppingItem) => (
              <motion.div
                key={shoppingItem.id}
                layout={!prefersReducedMotion}
                {...shoppingRowMotion(prefersReducedMotion)}
              >
                <ShoppingItemRow shoppingItem={shoppingItem} {...rowProps} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
};

export default AisleSection;
