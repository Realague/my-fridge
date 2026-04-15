import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { BarcodeFormat } from '@/types/enums';

interface BarcodeDisplayProps {
  data: string;
  format: BarcodeFormat;
  width?: number;
  height?: number;
  className?: string;
}

const BWIP_BCID: Partial<Record<BarcodeFormat, string>> = {
  [BarcodeFormat.DATA_MATRIX]: 'datamatrix',
  [BarcodeFormat.PDF417]: 'pdf417',
  [BarcodeFormat.AZTEC]: 'aztec',
};

const isBwip2dFormat = (format: BarcodeFormat): format is BarcodeFormat.DATA_MATRIX | BarcodeFormat.PDF417 | BarcodeFormat.AZTEC =>
  format === BarcodeFormat.DATA_MATRIX || format === BarcodeFormat.PDF417 || format === BarcodeFormat.AZTEC;

const detectBestFormat = (data: string, hint: BarcodeFormat): string => {
  if (hint === BarcodeFormat.QR) return 'QR';

  const digitsOnly = /^\d+$/.test(data);

  if (digitsOnly) {
    if (data.length === 13 && hint === BarcodeFormat.EAN13) return 'EAN13';
    if (data.length === 8 && hint === BarcodeFormat.EAN8) return 'EAN8';
    if (data.length === 13) return 'EAN13';
    if (data.length === 8) return 'EAN8';
  }

  return 'CODE128';
};

const BarcodeDisplay = ({ data, format, height, className = '' }: BarcodeDisplayProps) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [linearError, setLinearError] = useState(false);
  const [bwipError, setBwipError] = useState(false);

  useEffect(() => {
    if (!isBwip2dFormat(format) || !canvasRef.current || !data) return;
    setBwipError(false);
    const bcid = BWIP_BCID[format];
    if (!bcid) return;
    let cancelled = false;

    void (async () => {
      try {
        const bwipmod = await import('bwip-js/browser');
        const toCanvas = bwipmod.toCanvas ?? bwipmod.default?.toCanvas;
        if (!toCanvas) throw new Error('bwip-js toCanvas unavailable');
        if (cancelled || !canvasRef.current) return;
        toCanvas(canvasRef.current, {
          bcid,
          text: data,
          scale: 2,
          backgroundcolor: 'FFFFFF',
          barcolor: '000000',
          includetext: true,
          textsize: 10,
        });
      } catch {
        if (!cancelled) setBwipError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data, format]);

  useEffect(() => {
    if (format === BarcodeFormat.QR || isBwip2dFormat(format) || !svgRef.current || !data) return;

    setLinearError(false);

    while (svgRef.current.firstChild) {
      svgRef.current.removeChild(svgRef.current.firstChild);
    }

    const bestFormat = detectBestFormat(data, format);

    const render = (fmt: string) => {
      JsBarcode(svgRef.current!, data, {
        format: fmt,
        width: 2,
        height: height || 80,
        displayValue: true,
        fontSize: 14,
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000',
      });
    };

    try {
      render(bestFormat);
    } catch {
      try {
        while (svgRef.current.firstChild) {
          svgRef.current.removeChild(svgRef.current.firstChild);
        }
        render('CODE128');
      } catch {
        while (svgRef.current.firstChild) {
          svgRef.current.removeChild(svgRef.current.firstChild);
        }
        setLinearError(true);
      }
    }
  }, [data, format, height]);

  if (!data) return null;

  if (format === BarcodeFormat.QR) {
    return (
      <div className={`flex justify-center bg-white p-4 rounded-lg ${className}`}>
        <QRCodeSVG value={data} size={200} />
      </div>
    );
  }

  if (isBwip2dFormat(format)) {
    if (bwipError) {
      return (
        <div
          className={`flex justify-center items-center bg-white p-4 rounded-lg text-center text-sm text-muted-foreground max-w-sm ${className}`}
        >
          {t('loyaltyCards.barcodeDisplay.renderUnavailable')}
        </div>
      );
    }
    return (
      <div className={`flex justify-center bg-white p-4 rounded-lg overflow-auto ${className}`}>
        <canvas ref={canvasRef} />
      </div>
    );
  }

  if (linearError) {
    return (
      <div
        className={`flex justify-center items-center bg-white p-4 rounded-lg text-center text-sm text-muted-foreground max-w-sm ${className}`}
      >
        {t('loyaltyCards.barcodeDisplay.renderUnavailable')}
      </div>
    );
  }

  return (
    <div className={`flex justify-center bg-white p-2 rounded-lg ${className}`}>
      <svg ref={svgRef} />
    </div>
  );
};

export default BarcodeDisplay;
