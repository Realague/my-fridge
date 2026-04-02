import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export const UnitConversionPopover = () => {
  const { t } = useTranslation();

  const conversions = [
    'tsp_ml',
    'tsp_g',
    'tbsp_ml',
    'tbsp_g',
    'cup_ml',
    'cup_g',
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
        >
          <Info className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-72" align="end">
        <p className="font-medium text-sm mb-2">
          {t('unitConversion.title')}
        </p>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {conversions.map((key) => (
            <li key={key}>{t(`unitConversion.${key}`)}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
};
