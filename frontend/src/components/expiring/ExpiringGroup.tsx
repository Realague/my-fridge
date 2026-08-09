import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { ExpirationUrgency, ExpiringNowItem } from '@/types/expirationNotification';
import { shoppingRowMotion } from '@/lib/motion';
import { ExpiringRow } from './ExpiringRow';
import { canFreezeGroup } from './useExpiringSoon';

/** Eyebrow colour carries the urgency — rows themselves stay untinted. */
const EYEBROW_TONE: Record<ExpirationUrgency, string> = {
  expired: 'text-mf-danger',
  today: 'text-mf-danger',
  tomorrow: 'text-mf-warning',
  soon: 'text-mf-text-mute',
};

interface ExpiringGroupProps {
  urgency: ExpirationUrgency;
  items: ExpiringNowItem[];
  onConsume: (item: ExpiringNowItem) => void;
  onFreeze: (item: ExpiringNowItem) => void;
  onWaste: (item: ExpiringNowItem) => void;
}

export const ExpiringGroup = ({
  urgency,
  items,
  onConsume,
  onFreeze,
  onWaste,
}: ExpiringGroupProps) => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const showFreeze = canFreezeGroup(urgency);

  return (
    <section className="pt-2.5 sm:pt-3">
      <span className={cn('mf-eyebrow', EYEBROW_TONE[urgency])}>
        {t(`pages.dashboard.expiringSoon.group.${urgency}`)}
      </span>
      {/* Rows own their surface, so they are spaced rather than ruled. */}
      <div className="mt-1.5 space-y-2">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div key={item.storedItemId} layout {...shoppingRowMotion(prefersReducedMotion)}>
              <ExpiringRow
                item={item}
                urgency={urgency}
                showFreeze={showFreeze}
                onConsume={() => onConsume(item)}
                onFreeze={() => onFreeze(item)}
                onWaste={() => onWaste(item)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
};
