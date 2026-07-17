import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  CameraOff,
  Check,
  Flashlight,
  FlashlightOff,
  Globe,
  Loader2,
  PackagePlus,
  PackageSearch,
  PenLine,
  ScanBarcode,
  SearchX,
  ShieldCheck,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategoryIcon } from '@/utils/categoryIcons';
import { getTranslatedUnitLabel, VISIBLE_STORAGE_UNITS } from '@/utils/unitSystem';
import { BarcodeFormat, ITEM_CATEGORIES } from '@/types/enums';
import { ShoppingItemStatus } from '@/types/enums';
import { useShoppingStore } from '@/stores/shoppingStore';
import { itemService } from '@/services/itemService';
import { barcodeService, OffProduct } from '@/services/barcodeService';
import type { Item } from '@/services/itemService';

const READER_ID = 'shopping-barcode-reader';
const CAM_GRANTED_KEY = 'mf-scan-cam-granted';
const RESCAN_COOLDOWN_MS = 3000;

const FORMATS_TO_SUPPORT = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
];

const mapHtml5Format = (format: string): BarcodeFormat => {
  const formatMap: Record<string, BarcodeFormat> = {
    EAN_13: BarcodeFormat.EAN13,
    EAN_8: BarcodeFormat.EAN8,
    CODE_128: BarcodeFormat.CODE128,
    CODE_39: BarcodeFormat.CODE39,
  };
  return formatMap[format] || BarcodeFormat.OTHER;
};

type CamState = 'prompt' | 'starting' | 'active' | 'refused';

type ScanResult =
  | { type: 'catalog'; item: Item; barcode: string; format: BarcodeFormat }
  | { type: 'off'; product: OffProduct; barcode: string; format: BarcodeFormat }
  | { type: 'unknown'; barcode: string }
  | { type: 'offline'; barcode: string };

type ToastKind = 'ok' | 'info' | 'warn';

interface ShoppingBarcodeScannerProps {
  householdId: string;
  onClose: () => void;
  /** Cas 2 — scanned item already in "À ranger": open the guided assistant. */
  onOpenAssistant: (shoppingItemId: string) => void;
  /** Cas 5/offline — user chooses to add the item by hand. */
  onManualAdd: () => void;
}

/**
 * Continuous barcode scanner for the shopping list. Reuses the proven
 * html5-qrcode setup but stays in "scan continu" mode: the camera keeps running
 * after each successful read so the user can chain scans without touching the
 * screen. Handles the five resolution cases from the spec + offline.
 */
const ShoppingBarcodeScanner = ({
  householdId,
  onClose,
  onOpenAssistant,
  onManualAdd,
}: ShoppingBarcodeScannerProps) => {
  const { t } = useTranslation();

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const stopRequestedRef = useRef(false);
  const processingRef = useRef(false);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  // The html5-qrcode success callback is registered once; route through a ref so
  // it always calls the latest handler (fresh state/closures).
  const onDecodedRef = useRef<(text: string, format: string) => void>(() => {});

  const [camState, setCamState] = useState<CamState>(
    () => (typeof window !== 'undefined' && localStorage.getItem(CAM_GRANTED_KEY) ? 'starting' : 'prompt')
  );
  const [result, setResult] = useState<ScanResult | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [detected, setDetected] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: ToastKind } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, kind: ToastKind = 'ok') => {
    setToast({ msg, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  // --- camera lifecycle --------------------------------------------------
  const stopScanner = useCallback(() => {
    if (stopRequestedRef.current || !scannerRef.current) return;
    stopRequestedRef.current = true;
    try {
      void Promise.resolve(scannerRef.current.stop()).catch(() => {});
    } catch {
      // html5-qrcode can throw synchronously if already stopped.
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (scannerRef.current) return;
    const onScanSuccess = (decodedText: string, decodedResult: { result?: { format?: { formatName?: string } } }) => {
      const rawFormatName = decodedResult?.result?.format?.formatName;
      onDecodedRef.current(decodedText, rawFormatName || '');
    };

    const scanner = new Html5Qrcode(READER_ID, { formatsToSupport: FORMATS_TO_SUPPORT });
    scannerRef.current = scanner;

    // Prefer the rear camera (mobile), but fall back to whatever camera exists —
    // a desktop webcam usually only reports as front-facing, and requesting
    // `facingMode: environment` can be rejected on such devices.
    const startWith = (camera: MediaTrackConstraints | string) =>
      scanner.start(camera, { fps: 10 }, onScanSuccess, () => {});

    try {
      try {
        await startWith({ facingMode: 'environment' });
      } catch {
        // Fallback: pick the first available camera by id.
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) throw new Error('no-camera');
        await startWith(cameras[cameras.length - 1].id);
      }

      localStorage.setItem(CAM_GRANTED_KEY, '1');
      setStartError(null);
      setCamState('active');

      // Best-effort torch capability detection.
      try {
        const capabilities = (scanner as unknown as {
          getRunningTrackCapabilities?: () => MediaTrackCapabilities;
        }).getRunningTrackCapabilities?.();
        setTorchSupported(!!capabilities && 'torch' in (capabilities as Record<string, unknown>));
      } catch {
        setTorchSupported(false);
      }
    } catch (err) {
      // Surface the real reason so it can be diagnosed (permission denied vs no
      // camera vs busy device) instead of a generic "unavailable".
      console.error('[ShoppingBarcodeScanner] camera failed to start:', err);
      const e = err as { name?: string; message?: string };
      setStartError(e?.name ? `${e.name}${e.message ? `: ${e.message}` : ''}` : String(e?.message || err));
      scannerRef.current = null;
      setCamState('refused');
    }
  }, []);

  // Kick off the camera once the reader element is mounted (state === starting).
  useEffect(() => {
    if (camState === 'starting') void startScanner();
  }, [camState, startScanner]);

  // Stop the camera on unmount — releases the MediaStream tracks.
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      stopScanner();
    };
  }, [stopScanner]);

  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current) return;
    const next = !torchOn;
    try {
      await (scannerRef.current as unknown as {
        applyVideoConstraints: (c: MediaTrackConstraints) => Promise<void>;
      }).applyVideoConstraints({ advanced: [{ torch: next }] } as unknown as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }, [torchOn]);

  // --- scan resolution ---------------------------------------------------
  const addCatalogItemToStore = useCallback(
    async (item: Item, barcode: string, format: BarcodeFormat) => {
      const created = await useShoppingStore.getState().createShoppingItem({
        itemId: item.id,
        quantity: '1',
        unit: item.defaultUnit,
        status: ShoppingItemStatus.TO_STORE,
      });
      if (created) {
        void barcodeService.confirmMapping(householdId, barcode, item.id, format);
        showToast(t('pages.shopping.scanner.toast.addedToStore', { name: item.name }), 'ok');
      } else {
        showToast(t('pages.shopping.scanner.toast.addFailed'), 'warn');
      }
      setResult(null);
    },
    [householdId, showToast, t]
  );

  const handleDecoded = useCallback(
    async (decodedText: string, rawFormat: string) => {
      // Ignore reads while a result sheet is open or a scan is in flight.
      if (processingRef.current || result !== null) return;

      const code = decodedText.trim();
      const now = Date.now();
      if (lastScanRef.current.code === code && now - lastScanRef.current.at < RESCAN_COOLDOWN_MS) return;
      lastScanRef.current = { code, at: now };

      const format = mapHtml5Format(rawFormat);
      processingRef.current = true;
      setFlash(true);
      setDetected(true);
      setTimeout(() => setFlash(false), 400);
      setTimeout(() => setDetected(false), 1400);

      try {
        const res = await barcodeService.lookup(householdId, code);

        if (res.match === 'catalog') {
          const itemId = res.item.id;
          const items = useShoppingStore.getState().items;

          const inBuy = items.find(
            (i) => i.status === ShoppingItemStatus.TO_BUY && i.item?.id === itemId
          );
          if (inBuy) {
            // Cas 1 — flip "À acheter" → "À ranger" like a manual check.
            const ok = await useShoppingStore.getState().moveToStore(inBuy.id);
            if (ok) {
              void barcodeService.confirmMapping(householdId, code, itemId, format);
              showToast(t('pages.shopping.scanner.toast.movedToStore', { name: res.item.name }), 'ok');
            }
            return;
          }

          const inStore = items.find(
            (i) => i.status === ShoppingItemStatus.TO_STORE && i.item?.id === itemId
          );
          if (inStore) {
            // Cas 2 — already in "À ranger": open the guided assistant.
            void barcodeService.confirmMapping(householdId, code, itemId, format);
            onOpenAssistant(inStore.id);
            return;
          }

          // Cas 3 — off-list but in the catalog.
          setResult({ type: 'catalog', item: res.item, barcode: code, format });
          return;
        }

        if (res.match === 'off') {
          // Cas 4 — unknown to the catalog, found on Open Food Facts.
          setResult({ type: 'off', product: res.product, barcode: code, format });
          return;
        }

        // Cas 5 — not identified.
        setResult({ type: 'unknown', barcode: code });
      } catch {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setResult({ type: 'offline', barcode: code });
        } else {
          showToast(t('pages.shopping.scanner.toast.lookupError'), 'warn');
        }
      } finally {
        processingRef.current = false;
      }
    },
    [householdId, onOpenAssistant, result, showToast, t]
  );

  // Keep the ref pointing at the latest handler.
  useEffect(() => {
    onDecodedRef.current = (text, format) => void handleDecoded(text, format);
  }, [handleDecoded]);

  // --- render helpers ----------------------------------------------------
  const renderPermission = () => (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-mf-green/20 text-mf-green">
        <Camera className="h-8 w-8" />
      </span>
      <h2 className="font-display text-xl font-extrabold tracking-tight text-white">
        {t('pages.shopping.scanner.permission.title')}
      </h2>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
        {t('pages.shopping.scanner.permission.body')}
      </p>
      <Button variant="green" className="mt-6 w-full max-w-xs gap-2 rounded-full" onClick={() => setCamState('starting')}>
        <Camera className="h-5 w-5" />
        {t('pages.shopping.scanner.permission.enable')}
      </Button>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 rounded-full px-4 py-3 text-sm font-semibold text-white/70 hover:text-white"
      >
        {t('pages.shopping.scanner.permission.later')}
      </button>
      <span className="mt-4 inline-flex items-center gap-1.5 text-xs text-white/50">
        <ShieldCheck className="h-3.5 w-3.5" />
        {t('pages.shopping.scanner.permission.privacy')}
      </span>
    </div>
  );

  const renderRefused = () => (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-mf-danger/20 text-mf-danger">
        <CameraOff className="h-8 w-8" />
      </span>
      <h2 className="font-display text-xl font-extrabold tracking-tight text-white">
        {t('pages.shopping.scanner.refused.title')}
      </h2>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
        {t('pages.shopping.scanner.refused.body')}
      </p>
      {startError && (
        <p className="mt-3 max-w-xs break-words font-mono text-xs text-white/40">{startError}</p>
      )}
      <Button variant="green" className="mt-6 w-full max-w-xs gap-2 rounded-full" onClick={() => { setStartError(null); setCamState('starting'); }}>
        <Camera className="h-5 w-5" />
        {t('pages.shopping.scanner.refused.retry')}
      </Button>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 rounded-full px-4 py-3 text-sm font-semibold text-white/70 hover:text-white"
      >
        {t('buttons.close')}
      </button>
    </div>
  );

  const renderCamera = () => (
    <div className="relative flex flex-1 flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={toggleTorch}
          disabled={!torchSupported || camState !== 'active'}
          aria-label={t('pages.shopping.scanner.torch')}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors disabled:opacity-30 ${
            torchOn ? 'bg-mf-yellow text-mf-text' : 'bg-white/15 text-white'
          }`}
        >
          {torchOn ? <Flashlight className="h-5 w-5" /> : <FlashlightOff className="h-5 w-5" />}
        </button>
        <span className="font-display text-sm font-bold text-white">{t('pages.shopping.scanner.title')}</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white"
        >
          {t('pages.shopping.scanner.done')}
        </button>
      </div>

      {/* Viewfinder */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-5">
        {/* html5-qrcode forces `position: relative` + inline width/height on the
            reader element and its <video>. We wrap it in an absolutely-positioned
            box and force the injected <video> to cover with !important (Tailwind
            `!`), otherwise the stream is laid out off-screen / collapsed. */}
        <div className="absolute inset-0 overflow-hidden bg-black">
          <div
            id={READER_ID}
            className="h-full w-full [&_video]:!absolute [&_video]:!inset-0 [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover"
          />
        </div>
        <div className="pointer-events-none relative h-40 w-64 max-w-[80vw] rounded-xl shadow-[0_0_0_2000px_rgba(10,11,13,0.34)]">
          <Corner className="left-0 top-0 rounded-tl-xl border-l-[3px] border-t-[3px]" />
          <Corner className="right-0 top-0 rounded-tr-xl border-r-[3px] border-t-[3px]" />
          <Corner className="bottom-0 left-0 rounded-bl-xl border-b-[3px] border-l-[3px]" />
          <Corner className="bottom-0 right-0 rounded-br-xl border-b-[3px] border-r-[3px]" />
          {camState === 'active' && (
            <motion.div
              className="absolute inset-x-2 h-0.5 rounded-full bg-mf-green shadow-[0_0_12px_var(--mf-green)]"
              initial={{ top: '10%' }}
              animate={{ top: ['10%', '90%', '10%'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>
        <span className="pointer-events-none rounded-full bg-black/40 px-3.5 py-1.5 text-sm font-semibold text-white/90">
          {camState === 'starting'
            ? t('pages.shopping.scanner.starting')
            : detected
              ? t('pages.shopping.scanner.detected')
              : t('pages.shopping.scanner.hint')}
        </span>
        {camState === 'starting' && (
          <Loader2 className="h-6 w-6 animate-spin text-white/70" aria-hidden />
        )}
      </div>

      {/* Green flash on detection */}
      <div
        className={`pointer-events-none absolute inset-0 bg-mf-green transition-opacity duration-500 ${
          flash ? 'opacity-25' : 'opacity-0'
        }`}
      />

      {/* In-camera confirmation toast */}
      {toast && (
        <div className="pointer-events-none absolute inset-x-4 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-10 flex items-center gap-3 rounded-2xl bg-neutral-900/95 px-4 py-3 text-white shadow-xl">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white ${
              toast.kind === 'warn' ? 'bg-mf-orange' : toast.kind === 'info' ? 'bg-mf-blue' : 'bg-mf-green'
            }`}
          >
            <Check className="h-4 w-4" />
          </span>
          <span className="font-display text-sm font-semibold">{toast.msg}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gradient-to-b from-[#2b2f33] via-[#141618] to-[#0b0c0d]">
      {camState === 'refused' ? renderRefused() : camState === 'prompt' ? renderPermission() : renderCamera()}

      {/* Result bottom-sheet (Cas 3/4/5/offline) */}
      {result && (
        <ScanResultSheet
          result={result}
          householdId={householdId}
          onDismiss={() => setResult(null)}
          onAddCatalog={addCatalogItemToStore}
          onManualAdd={() => {
            setResult(null);
            onManualAdd();
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
};

const Corner = ({ className }: { className: string }) => (
  <span className={`absolute h-7 w-7 border-mf-green ${className}`} />
);

// ---------------------------------------------------------------------------
// Result bottom-sheet
// ---------------------------------------------------------------------------

interface ScanResultSheetProps {
  result: ScanResult;
  householdId: string;
  onDismiss: () => void;
  onAddCatalog: (item: Item, barcode: string, format: BarcodeFormat) => Promise<void>;
  onManualAdd: () => void;
  showToast: (msg: string, kind?: ToastKind) => void;
}

const ScanResultSheet = ({
  result,
  householdId,
  onDismiss,
  onAddCatalog,
  onManualAdd,
  showToast,
}: ScanResultSheetProps) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  // OFF create-form state.
  const offProduct = result.type === 'off' ? result.product : null;
  const [offName, setOffName] = useState(offProduct?.name ?? '');
  const [offCategory, setOffCategory] = useState(offProduct?.category ?? 'other');
  const [offUnit, setOffUnit] = useState(offProduct?.suggestedUnit ?? 'piece');

  const handleAddCatalog = async () => {
    if (result.type !== 'catalog' || submitting) return;
    setSubmitting(true);
    try {
      await onAddCatalog(result.item, result.barcode, result.format);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateFromOff = async () => {
    if (result.type !== 'off' || submitting) return;
    const name = offName.trim() || result.product.name;
    setSubmitting(true);
    try {
      const newItem = await itemService.createItem({
        name,
        category: offCategory,
        householdId,
        defaultUnit: offUnit,
        availableUnits: [offUnit],
        imageUrl: result.product.imageUrl,
      });
      const created = await useShoppingStore.getState().createShoppingItem({
        itemId: newItem.id,
        quantity: '1',
        unit: offUnit,
        status: ShoppingItemStatus.TO_STORE,
      });
      if (created) {
        void barcodeService.confirmMapping(householdId, result.barcode, newItem.id, result.format);
        showToast(t('pages.shopping.scanner.toast.created', { name }), 'ok');
        onDismiss();
      } else {
        showToast(t('pages.shopping.scanner.toast.addFailed'), 'warn');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('pages.shopping.scanner.toast.createFailed'), 'warn');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="absolute inset-0 z-20 bg-black/50" onClick={submitting ? undefined : onDismiss} aria-hidden />
      <motion.div
        className="absolute inset-x-0 bottom-0 z-30 max-h-[88%] overflow-y-auto rounded-t-3xl bg-mf-page-bg px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-3"
        initial={{ y: '110%' }}
        animate={{ y: 0 }}
        exit={{ y: '110%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto mb-3.5 h-1.5 w-10 rounded-full bg-mf-night-line/40" />

        {result.type === 'catalog' && (
          <>
            <Eyebrow tone="blue" icon={<PackageSearch className="h-3.5 w-3.5" />}>
              {t('pages.shopping.scanner.catalog.eyebrow')}
            </Eyebrow>
            <h3 className="font-display text-lg font-extrabold tracking-tight text-mf-text">
              {t('pages.shopping.scanner.catalog.title')}
            </h3>
            <p className="mb-4 mt-1 text-sm leading-relaxed text-mf-text-soft">
              {t('pages.shopping.scanner.catalog.body')}
            </p>
            <ProductPreview
              name={result.item.name}
              meta={t(`items.categories.${result.item.category}`)}
              imageUrl={result.item.imageUrl}
              category={result.item.category}
            />
            <div className="mt-4 flex gap-2.5">
              <Button variant="outline" className="flex-none rounded-full" onClick={onDismiss} disabled={submitting}>
                {t('common.cancel')}
              </Button>
              <Button variant="green" className="flex-1 gap-2 rounded-full" onClick={handleAddCatalog} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
                {t('pages.shopping.scanner.catalog.add')}
              </Button>
            </div>
          </>
        )}

        {result.type === 'off' && offProduct && (
          <>
            <Eyebrow tone="yellow" icon={<Globe className="h-3.5 w-3.5" />}>
              {t('pages.shopping.scanner.off.eyebrow')}
            </Eyebrow>
            <h3 className="font-display text-lg font-extrabold tracking-tight text-mf-text">
              {t('pages.shopping.scanner.off.title')}
            </h3>
            <p className="mb-4 mt-1 text-sm leading-relaxed text-mf-text-soft">
              {t('pages.shopping.scanner.off.body')}
            </p>
            <ProductPreview
              name={offProduct.name}
              meta={[offProduct.quantity, t('pages.shopping.scanner.off.code', { code: offProduct.barcode })]
                .filter(Boolean)
                .join(' · ')}
              imageUrl={offProduct.imageUrl}
              category={offCategory}
            />

            <FieldLabel>{t('pages.shopping.scanner.off.name')}</FieldLabel>
            <Input value={offName} onChange={(e) => setOffName(e.target.value)} className="rounded-xl bg-white" />

            <FieldLabel>{t('pages.shopping.scanner.off.category')}</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {ITEM_CATEGORIES.map((cat) => (
                <Chip key={cat} selected={offCategory === cat} onClick={() => setOffCategory(cat)}>
                  <CategoryIcon category={cat} className="h-3.5 w-3.5" />
                  {t(`items.categories.${cat}`)}
                </Chip>
              ))}
            </div>

            <FieldLabel>{t('pages.shopping.scanner.off.unit')}</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {VISIBLE_STORAGE_UNITS.map((unit) => (
                <Chip key={unit} selected={offUnit === unit} onClick={() => setOffUnit(unit)}>
                  {getTranslatedUnitLabel(unit, 1, t)}
                </Chip>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-xl bg-mf-green-soft px-3 py-2.5 text-xs font-semibold leading-snug text-mf-green-deep">
              <Users className="h-4 w-4 shrink-0" />
              {t('pages.shopping.scanner.off.mappingNote')}
            </div>

            <div className="mt-4 flex gap-2.5">
              <Button variant="outline" className="flex-none rounded-full" onClick={onDismiss} disabled={submitting}>
                {t('common.cancel')}
              </Button>
              <Button variant="green" className="flex-1 gap-2 rounded-full" onClick={handleCreateFromOff} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {t('pages.shopping.scanner.off.create')}
              </Button>
            </div>
          </>
        )}

        {(result.type === 'unknown' || result.type === 'offline') && (
          <>
            <Eyebrow
              tone={result.type === 'offline' ? 'orange' : 'neutral'}
              icon={result.type === 'offline' ? <WifiOff className="h-3.5 w-3.5" /> : <SearchX className="h-3.5 w-3.5" />}
            >
              {result.type === 'offline'
                ? t('pages.shopping.scanner.offline.eyebrow')
                : t('pages.shopping.scanner.unknown.eyebrow')}
            </Eyebrow>
            <h3 className="font-display text-lg font-extrabold tracking-tight text-mf-text">
              {result.type === 'offline'
                ? t('pages.shopping.scanner.offline.title')
                : t('pages.shopping.scanner.unknown.title')}
            </h3>
            <p className="mb-4 mt-1 text-sm leading-relaxed text-mf-text-soft">
              {result.type === 'offline'
                ? t('pages.shopping.scanner.offline.body')
                : t('pages.shopping.scanner.unknown.body', { code: result.barcode })}
            </p>
            <div className="mt-2 flex gap-2.5">
              <Button variant="outline" className="flex-1 rounded-full" onClick={onDismiss}>
                {result.type === 'offline'
                  ? t('buttons.close')
                  : t('pages.shopping.scanner.unknown.continue')}
              </Button>
              <Button variant="green" className="flex-1 gap-2 rounded-full" onClick={onManualAdd}>
                <PenLine className="h-4 w-4" />
                {t('pages.shopping.scanner.addManually')}
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
};

// --- small presentational helpers -----------------------------------------

const Eyebrow = ({
  tone,
  icon,
  children,
}: {
  tone: 'blue' | 'yellow' | 'orange' | 'neutral';
  icon: React.ReactNode;
  children: React.ReactNode;
}) => {
  const tones: Record<string, string> = {
    blue: 'bg-mf-blue-soft text-mf-blue',
    yellow: 'bg-mf-yellow-soft text-mf-brown',
    orange: 'bg-mf-orange-soft text-mf-orange',
    neutral: 'bg-black/5 text-mf-text-soft',
  };
  return (
    <span
      className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-display text-[10.5px] font-bold uppercase tracking-wider ${tones[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
};

const ProductPreview = ({
  name,
  meta,
  imageUrl,
  category,
}: {
  name: string;
  meta: string;
  imageUrl: string | null;
  category: string;
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = imageUrl && !imgFailed;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-mf-night-line/30 bg-white p-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-mf-green-soft text-mf-green-deep">
        {showImage ? (
          <img
            src={imageUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <CategoryIcon category={category} className="h-6 w-6" />
        )}
      </span>
      <div className="min-w-0">
        <div className="font-display text-base font-extrabold text-mf-text">{name}</div>
        {meta && <div className="mt-0.5 truncate text-xs text-mf-text-soft">{meta}</div>}
      </div>
    </div>
  );
};

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="mb-2 mt-4 block font-display text-xs font-bold text-mf-text-soft">{children}</label>
);

const Chip = ({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 font-display text-xs font-semibold transition-colors ${
      selected
        ? 'border-mf-green bg-mf-green-soft text-mf-green-deep'
        : 'border-mf-night-line/40 bg-white text-mf-text-soft'
    }`}
  >
    {children}
  </button>
);

export { ScanBarcode };
export default ShoppingBarcodeScanner;
