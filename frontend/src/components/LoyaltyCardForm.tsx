import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Keyboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BarcodeFormat } from '@/types/enums';
import { StoreCatalogEntry } from '@/data/storeCatalog';
import StoreSelector from './StoreSelector';
import BarcodeScanner from './BarcodeScanner';
import { CreateLoyaltyCardRequest } from '@/services/loyaltyCardService';

interface LoyaltyCardFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateLoyaltyCardRequest) => Promise<void>;
}

type Step = 'store' | 'barcode' | 'details';

const LoyaltyCardForm = ({ open, onOpenChange, onSubmit }: LoyaltyCardFormProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('store');
  const [selectedStore, setSelectedStore] = useState<StoreCatalogEntry | null>(null);
  const [customStoreName, setCustomStoreName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [barcodeData, setBarcodeData] = useState('');
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat | undefined>();
  const [notes, setNotes] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setStep('store');
    setSelectedStore(null);
    setCustomStoreName('');
    setCardNumber('');
    setBarcodeData('');
    setBarcodeFormat(undefined);
    setNotes('');
    setShowScanner(false);
    setIsSubmitting(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  const handleStoreSelect = (store: StoreCatalogEntry | null, customName?: string) => {
    setSelectedStore(store);
    if (customName) setCustomStoreName(customName);
    setStep('barcode');
  };

  const handleScan = (data: string, format: BarcodeFormat) => {
    setBarcodeData(data);
    setBarcodeFormat(format);
    setCardNumber(data);
    setShowScanner(false);
    setStep('details');
  };

  const handleManualEntry = () => {
    setStep('details');
  };

  const detectFormat = (value: string): BarcodeFormat => {
    const trimmed = value.trim();
    const digitsOnly = /^\d+$/.test(trimmed);
    if (digitsOnly && trimmed.length === 13) return BarcodeFormat.EAN13;
    if (digitsOnly && trimmed.length === 8) return BarcodeFormat.EAN8;
    return BarcodeFormat.CODE128;
  };

  const handleSubmit = async () => {
    if (!cardNumber.trim()) return;

    setIsSubmitting(true);
    try {
      const finalBarcodeData = barcodeData || cardNumber.trim();
      const finalFormat = barcodeFormat || detectFormat(finalBarcodeData);

      const data: CreateLoyaltyCardRequest = {
        storeName: selectedStore?.name || customStoreName,
        storeSlug: selectedStore?.slug,
        cardNumber: cardNumber.trim(),
        barcodeData: finalBarcodeData,
        barcodeFormat: finalFormat,
        notes: notes.trim() || undefined,
        color: selectedStore?.color,
      };

      await onSubmit(data);
      handleOpenChange(false);
    } catch {
      // Error handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showScanner) {
    return (
      <BarcodeScanner
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('loyaltyCards.form.title')}</DialogTitle>
        </DialogHeader>

        {step === 'store' && (
          <StoreSelector onSelect={handleStoreSelect} />
        )}

        {step === 'barcode' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">
              {t('loyaltyCards.form.addBarcode', { store: selectedStore?.name || customStoreName })}
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2"
                onClick={() => setShowScanner(true)}
              >
                <Camera className="h-6 w-6" />
                <span>{t('loyaltyCards.form.scanBarcode')}</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2"
                onClick={handleManualEntry}
              >
                <Keyboard className="h-6 w-6" />
                <span>{t('loyaltyCards.form.manualEntry')}</span>
              </Button>
            </div>
            <Button variant="ghost" onClick={() => setStep('store')} className="w-full">
              {t('buttons.back')}
            </Button>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">{t('loyaltyCards.form.cardNumber')}</Label>
              <Input
                id="cardNumber"
                value={cardNumber}
                onChange={(e) => {
                  setCardNumber(e.target.value);
                  if (!barcodeData) setBarcodeData(e.target.value);
                }}
                placeholder={t('loyaltyCards.form.cardNumberPlaceholder')}
                autoFocus={!barcodeData}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('loyaltyCards.form.notes')}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('loyaltyCards.form.notesPlaceholder')}
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('barcode')} className="flex-1">
                {t('buttons.back')}
              </Button>
              <Button
                variant="green"
                onClick={handleSubmit}
                disabled={!cardNumber.trim() || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? t('common.loading') : t('buttons.save')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LoyaltyCardForm;
