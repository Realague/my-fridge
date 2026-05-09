import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell } from 'lucide-react';

import { useHouseholdSettingsStore } from '@/stores/householdSettingsStore';
import { useExpirationNotificationStore } from '@/stores/expirationNotificationStore';

interface Props {
  householdId: string;
}

const VALUES = Array.from({ length: 14 }, (_, i) => i + 1); // 1..14

export const HouseholdExpirationSettings = ({ householdId }: Props) => {
  const { t } = useTranslation();
  const settings = useHouseholdSettingsStore((s) => s.getSettings(householdId));
  const fetch = useHouseholdSettingsStore((s) => s.fetch);
  const update = useHouseholdSettingsStore((s) => s.update);
  const refreshExpiration = useExpirationNotificationStore((s) => s.fetchAll);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (householdId) {
      fetch(householdId);
    }
  }, [householdId, fetch]);

  const currentValue = settings?.expirationAlertDays ?? 3;

  const handleChange = async (value: string) => {
    const days = Number(value);
    if (!Number.isInteger(days) || days < 1 || days > 14) return;
    setSaving(true);
    try {
      await update(householdId, { expirationAlertDays: days });
      await refreshExpiration(householdId);
      toast.success(t('pages.household.expirationAlerts.savedToast'));
    } catch (error) {
      console.error('update household settings failed', error);
      toast.error(t('messages.error.requestFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-card/90 backdrop-blur-sm border border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          {t('pages.household.expirationAlerts.title')}
        </CardTitle>
        <CardDescription>
          {t('pages.household.expirationAlerts.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {t('pages.household.expirationAlerts.label')}
          </span>
          <Select value={String(currentValue)} onValueChange={handleChange} disabled={saving}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VALUES.map((v) => (
                <SelectItem key={v} value={String(v)}>
                  {t('pages.household.expirationAlerts.option', { count: v })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {t('pages.household.expirationAlerts.note')}
        </p>
      </CardContent>
    </Card>
  );
};
