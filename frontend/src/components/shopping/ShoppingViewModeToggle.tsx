import { useTranslation } from 'react-i18next';
import { ArrowDownAZ, LayoutList } from 'lucide-react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ShoppingViewMode } from '@/hooks/useShoppingPreferences';
import { cn } from '@/lib/utils';

export interface ShoppingViewModeToggleProps {
  value: ShoppingViewMode;
  onChange: (mode: ShoppingViewMode) => void;
  className?: string;
}

export const ShoppingViewModeToggle = ({
  value,
  onChange,
  className,
}: ShoppingViewModeToggleProps) => {
  const { t } = useTranslation();

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        // Radix may emit an empty string when the active item is clicked again;
        // keep the current selection instead of deselecting everything.
        if (next === 'aisle' || next === 'alpha') {
          onChange(next);
        }
      }}
      aria-label={t('pages.shopping.viewMode.label')}
      className={cn(
        'inline-flex rounded-md border border-border bg-muted p-0.5 gap-0',
        className
      )}
    >
      <ToggleGroupItem
        value="aisle"
        aria-label={t('pages.shopping.viewMode.byAisle')}
        className={cn(
          'h-8 px-3 gap-1.5 rounded-sm text-sm font-medium text-muted-foreground',
          'data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm'
        )}
      >
        <LayoutList className="h-4 w-4" aria-hidden />
        <span>{t('pages.shopping.viewMode.byAisle')}</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="alpha"
        aria-label={t('pages.shopping.viewMode.alphabetical')}
        className={cn(
          'h-8 px-3 gap-1.5 rounded-sm text-sm font-medium text-muted-foreground',
          'data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm'
        )}
      >
        <ArrowDownAZ className="h-4 w-4" aria-hidden />
        <span>{t('pages.shopping.viewMode.alphabetical')}</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default ShoppingViewModeToggle;
