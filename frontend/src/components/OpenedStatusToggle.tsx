import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PackageOpen, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useDateFormat } from '@/utils/dateFormatting';

interface OpenedStatusToggleProps {
  isOpened: boolean;
  openedDate?: string | null;
  daysAfterOpening?: number;
  effectiveExpirationDate?: string | null;
  onToggle: (isOpened: boolean, openedDate?: string) => void;
  className?: string;
}

export const OpenedStatusToggle = ({
  isOpened,
  openedDate,
  daysAfterOpening,
  effectiveExpirationDate,
  onToggle,
  className = '',
}: OpenedStatusToggleProps) => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const [localOpenedDate, setLocalOpenedDate] = useState(
    openedDate || format(new Date(), 'yyyy-MM-dd')
  );

  const handleToggle = (checked: boolean) => {
    if (checked) {
      onToggle(true, localOpenedDate);
    } else {
      onToggle(false);
    }
  };

  const handleDateChange = (date: string) => {
    setLocalOpenedDate(date);
    if (isOpened) {
      onToggle(true, date);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Toggle Switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOpened ? (
            <PackageOpen className="h-4 w-4 text-mf-warning" />
          ) : (
            <Package className="h-4 w-4 text-muted-foreground" />
          )}
          <Label htmlFor="opened-status" className="cursor-pointer">
            {t('storedItems.openedStatus')}
          </Label>
        </div>
        <Switch
          id="opened-status"
          checked={isOpened}
          onCheckedChange={handleToggle}
        />
      </div>

      {/* Opened Date Picker */}
      {isOpened && (
        <div className="space-y-2 animate-in fade-in-50 slide-in-from-top-2 duration-300">
          <Label htmlFor="opened-date" className="text-sm">
            {t('storedItems.openedDate')}
          </Label>
          <Input
            id="opened-date"
            type="date"
            value={localOpenedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            max={format(new Date(), 'yyyy-MM-dd')}
            className="w-full"
          />

          {/* Display effective expiration info */}
          {daysAfterOpening && effectiveExpirationDate && (
            <div className="mt-3 p-3 bg-mf-warning-soft border border-mf-warning/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="bg-mf-warning-soft text-mf-warning">
                  {t('storedItems.opened')}
                </Badge>
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">
                    {t('storedItems.consumeBy')}:{' '}
                    <span className="text-mf-warning">
                      {formatDate(new Date(effectiveExpirationDate), 'MMM d, yyyy')}
                    </span>
                  </p>
                  <p className="mt-1">
                    {t('storedItems.consumeWithinDays', { count: daysAfterOpening })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
