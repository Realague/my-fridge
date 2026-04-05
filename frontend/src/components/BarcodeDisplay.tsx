import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';
import { BarcodeFormat } from '@/types/enums';

interface BarcodeDisplayProps {
  data: string;
  format: BarcodeFormat;
  width?: number;
  height?: number;
  className?: string;
}

const detectBestFormat = (data: string, hint: BarcodeFormat): string => {
  if (hint === BarcodeFormat.QR) return 'QR';

  const digitsOnly = /^\d+$/.test(data);

  if (digitsOnly) {
    if (data.length === 13 && hint === BarcodeFormat.EAN13) return 'EAN13';
    if (data.length === 8 && hint === BarcodeFormat.EAN8) return 'EAN8';
    if (data.length === 13) return 'EAN13';
    if (data.length === 8) return 'EAN8';
  }

  // CODE128 handles any ASCII data and any length
  return 'CODE128';
};

const BarcodeDisplay = ({ data, format, height, className = '' }: BarcodeDisplayProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (format === BarcodeFormat.QR || !svgRef.current || !data) return;

    // Clear previous render
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
      // If detected format fails, always fall back to CODE128
      try {
        while (svgRef.current.firstChild) {
          svgRef.current.removeChild(svgRef.current.firstChild);
        }
        render('CODE128');
      } catch {
        // Last resort: clear SVG
        while (svgRef.current.firstChild) {
          svgRef.current.removeChild(svgRef.current.firstChild);
        }
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

  return (
    <div className={`flex justify-center bg-white p-2 rounded-lg ${className}`}>
      <svg ref={svgRef} />
    </div>
  );
};

export default BarcodeDisplay;
