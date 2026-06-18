import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BarcodeFormat } from '@/types/enums';

interface BarcodeScannerProps {
  onScan: (data: string, format: BarcodeFormat) => void;
  onClose: () => void;
}

const FORMATS_TO_SUPPORT = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.AZTEC,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.PDF_417,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
];

const mapHtml5Format = (format: string): BarcodeFormat => {
  const formatMap: Record<string, BarcodeFormat> = {
    EAN_13: BarcodeFormat.EAN13,
    EAN_8: BarcodeFormat.EAN8,
    CODE_128: BarcodeFormat.CODE128,
    CODE_39: BarcodeFormat.CODE39,
    QR_CODE: BarcodeFormat.QR,
    DATA_MATRIX: BarcodeFormat.DATA_MATRIX,
    PDF_417: BarcodeFormat.PDF417,
    AZTEC: BarcodeFormat.AZTEC,
  };
  return formatMap[format] || BarcodeFormat.OTHER;
};

const BarcodeScanner = ({ onScan, onClose }: BarcodeScannerProps) => {
  const { t } = useTranslation();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const stopAlreadyRequestedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    const readerId = 'barcode-reader';
    let mounted = true;

    const safeStop = () => {
      if (stopAlreadyRequestedRef.current || !scannerRef.current) return;
      stopAlreadyRequestedRef.current = true;
      try {
        void Promise.resolve(scannerRef.current.stop()).catch(() => {});
      } catch {
        // html5-qrcode can throw synchronously if already stopped
      }
    };

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(readerId, { formatsToSupport: FORMATS_TO_SUPPORT });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const box = Math.floor(minEdge * 0.72);
              return { width: box, height: box };
            },
          },
          (decodedText, decodedResult) => {
            if (!mounted) return;
            const rawFormatName = decodedResult?.result?.format?.formatName;
            const format = mapHtml5Format(rawFormatName || '');
            safeStop();
            onScan(decodedText, format);
          },
          () => {}
        );

        if (mounted) setIsStarting(false);
      } catch (err) {
        if (mounted) {
          setError(t('loyaltyCards.scanner.cameraError'));
          setIsStarting(false);
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      safeStop();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Camera className="h-5 w-5" />
          {t('loyaltyCards.scanner.title')}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
          aria-label={t('buttons.close')}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4" ref={containerRef}>
        <div className="w-full max-w-md">
          {isStarting && !error && (
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3" />
              <p>{t('loyaltyCards.scanner.starting')}</p>
            </div>
          )}
          {error && (
            <div className="text-center text-white">
              <p className="text-mf-danger mb-4">{error}</p>
              <Button variant="outline" onClick={onClose}>
                {t('buttons.close')}
              </Button>
            </div>
          )}
          <div id="barcode-reader" className="rounded-lg overflow-hidden" />
        </div>
      </div>

      <div className="p-4 text-center">
        <p className="text-white/70 text-sm">{t('loyaltyCards.scanner.hint')}</p>
      </div>
    </div>
  );
};

export default BarcodeScanner;
