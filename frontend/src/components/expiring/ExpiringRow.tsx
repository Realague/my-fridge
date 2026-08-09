import { useTranslation } from 'react-i18next';
import { Check, Snowflake, Trash2, LucideIcon } from 'lucide-react';

import { ItemImage } from '@/components/ItemImage';
import { cn } from '@/lib/utils';
import { ExpirationUrgency, ExpiringNowItem } from '@/types/expirationNotification';
import { getTranslatedUnitLabel } from '@/utils/unitSystem';
import { formatQuantity, translateItemName } from './expiringUtils';

/**
 * Tile tint per urgency. `soon` uses the card surface rather than `elevated`,
 * which is now the row's own background — the tile would vanish into it.
 */
const TILE_TINT: Record<ExpirationUrgency, string> = {
  expired: 'bg-mf-danger-soft text-mf-danger',
  today: 'bg-mf-danger-soft text-mf-danger',
  tomorrow: 'bg-mf-warning-soft text-mf-warning',
  soon: 'bg-mf-night-surface text-mf-text-soft',
};

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Classes for the 30px glyph puck (the 44px hit area stays transparent). */
  puckClassName: string;
}

/**
 * 44x44 hit area (accessibility floor) wrapping a 30px visual puck — the mock
 * draws 40px, which would miss the 44px target the acceptance criteria require.
 */
const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  disabled,
  puckClassName,
}: ActionButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className="group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-transparent p-0 disabled:cursor-default"
  >
    <span
      className={cn(
        'inline-flex h-[30px] w-[30px] items-center justify-center rounded-full transition-colors',
        puckClassName
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
    </span>
  </button>
);

interface ExpiringRowProps {
  item: ExpiringNowItem;
  urgency: ExpirationUrgency;
  /** Freezing is only offered where it makes sense (today / tomorrow). */
  showFreeze: boolean;
  onConsume: () => void;
  onFreeze: () => void;
  onWaste: () => void;
}

export const ExpiringRow = ({
  item,
  urgency,
  showFreeze,
  onConsume,
  onFreeze,
  onWaste,
}: ExpiringRowProps) => {
  const { t } = useTranslation();

  const displayName = translateItemName(item.itemName, item.itemHouseholdId, t);
  const metaLine = `${formatQuantity(item.quantity)} ${getTranslatedUnitLabel(
    item.unit,
    item.quantity,
    t
  )} · ${item.storageAreaName}`;

  return (
    // Each row carries its own `elevated` surface (as the previous card did)
    // rather than sitting flat on the card with only a rule between rows.
    <div className="flex items-center gap-2 rounded-md bg-mf-night-elevated p-2.5 sm:gap-3 sm:p-3">
      <ItemImage
        src={item.itemImageUrl}
        alt={displayName}
        fallbackIconSize={16}
        containerClassName={cn(
          'h-8 w-8 rounded-[10px] sm:h-[34px] sm:w-[34px]',
          TILE_TINT[urgency]
        )}
      />

      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-mf-text sm:text-sm">
          {displayName}
        </div>
        <div className="truncate text-[11px] font-medium text-mf-text-soft sm:text-xs">
          {metaLine}
        </div>
      </div>

      <div className="flex shrink-0 items-center">
        <ActionButton
          icon={Check}
          label={t('pages.dashboard.expiringSoon.actionConsume')}
          onClick={onConsume}
          puckClassName="bg-mf-green-soft text-mf-green-deep group-hover:bg-mf-green group-hover:text-white"
        />
        {showFreeze && (
          <ActionButton
            icon={Snowflake}
            label={t('pages.dashboard.expiringSoon.actionFreeze')}
            onClick={onFreeze}
            puckClassName="bg-mf-night-surface text-mf-text-soft group-hover:bg-mf-blue-soft group-hover:text-mf-blue"
          />
        )}
        <ActionButton
          icon={Trash2}
          label={t('pages.dashboard.expiringSoon.actionDiscard')}
          onClick={onWaste}
          puckClassName="bg-mf-night-surface text-mf-text-soft group-hover:bg-mf-danger-soft group-hover:text-mf-danger"
        />
      </div>
    </div>
  );
};
