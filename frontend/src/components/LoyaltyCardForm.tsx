import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Keyboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BarcodeFormat } from '@/types/enums';
import { Brand } from '@/services/brandService';
import StoreSelector from './StoreSelector';
import BarcodeScanner from './BarcodeScanner';
import { CreateLoyaltyCardRequest } from '@/services/loyaltyCardService';
import { Checkbox } from '@/components/ui/checkbox';

interface LoyaltyCardFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateLoyaltyCardRequest) => Promise<void>;
}

type Step = 'store' | 'barcode' | 'details';

type BarcodeEntrySource = 'scan' | 'manual' | null;

const LoyaltyCardForm = ({ open, onOpenChange, onSubmit }: LoyaltyCardFormProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('store');
  const [selectedStore, setSelectedStore] = useState<Brand | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [barcodeData, setBarcodeData] = useState('');
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat | undefined>();
  const [notes, setNotes] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entrySource, setEntrySource] = useState<BarcodeEntrySource>(null);
  const [manualGenerate2D, setManualGenerate2D] = useState(false);

  const reset = () => {
    setStep('store');
    setSelectedStore(null);
    setCardNumber('');
    setBarcodeData('');
    setBarcodeFormat(undefined);
    setNotes('');
    setShowScanner(false);
    setIsSubmitting(false);
    setEntrySource(null);
    setManualGenerate2D(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  const handleStoreSelect = (brand: Brand) => {
    setSelectedStore(brand);
    setStep('barcode');
  };

  const handleScan = (data: string, format: BarcodeFormat) => {
    setEntrySource('scan');
    setBarcodeData(data);
    setBarcodeFormat(format);
    setCardNumber(data);
    setManualGenerate2D(false);
    setShowScanner(false);
    setStep('details');
  };

  const handleManualEntry = () => {
    setBarcodeData('');
    setBarcodeFormat(undefined);
    setCardNumber('');
    setManualGenerate2D(false);
    setEntrySource('manual');
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
      const finalFormat =
        entrySource === 'manual' && manualGenerate2D
          ? BarcodeFormat.QR
          : barcodeFormat ?? detectFormat(finalBarcodeData);

      const data: CreateLoyaltyCardRequest = {
        storeName: selectedStore?.name ?? '',
        storeSlug: selectedStore?.id,
        cardNumber: cardNumber.trim(),
        barcodeData: finalBarcodeData,
        barcodeFormat: finalFormat,
        notes: notes.trim() || undefined,
        color: selectedStore?.color ?? undefined,
      };

      await onSubmit(data);
      handleOpenChange(false);
    } catch {
      // Error handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange} modal={!showScanner}>
        <DialogContent
          className="sm:max-w-md max-h-[90vh] overflow-y-auto"
          aria-describedby={undefined}
          onEscapeKeyDown={(e) => {
            if (showScanner) {
              e.preventDefault();
              setShowScanner(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('loyaltyCards.form.title')}</DialogTitle>
          </DialogHeader>

          {step === 'store' && (
            <StoreSelector onSelect={handleStoreSelect} />
          )}

          {step === 'barcode' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">
                {t('loyaltyCards.form.addBarcode', { store: selectedStore?.name })}
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
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder={t('loyaltyCards.form.cardNumberPlaceholder')}
                  autoFocus={!barcodeData}
                />
              </div>

              {entrySource === 'manual' && (
                <div className="flex items-start gap-3 rounded-md border border-border p-3">
                  <Checkbox
                    id="generate2d"
                    checked={manualGenerate2D}
                    onCheckedChange={(v) => setManualGenerate2D(v === true)}
                    className="mt-0.5"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="generate2d" className="cursor-pointer font-medium">
                      {t('loyaltyCards.form.generateAs2D')}
                    </Label>
                    <p className="text-sm text-muted-foreground">{t('loyaltyCards.form.generateAs2DHint')}</p>
                  </div>
                </div>
              )}

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
      {open && showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
};

export default LoyaltyCardForm;
