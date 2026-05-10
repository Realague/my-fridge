import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

/**
 * Surface a Zustand store's transient `error` field as a destructive toast,
 * then clear it so the same error is not re-toasted on every re-render.
 *
 * Use this on pages whose initial fetch happens in a `useEffect` and whose
 * store currently swallows failures (`console.error` only, page renders empty).
 *
 * The toast is emitted with a shared `id` so multiple parallel fetch failures
 * on the same page (e.g. Dashboard) stack into a single visible toast instead
 * of carpeting the screen.
 *
 * Title is charter-aligned ("Action interrompue. Réessaie."). The store's raw
 * error message is shown as the description so the user gets context.
 */
export function useStoreErrorToast(
  error: string | null,
  setError: (next: string | null) => void
) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!error) return;
    toast.error(t('messages.error.fetchFailed'), {
      id: 'store-fetch-error',
      description: error,
    });
    setError(null);
  }, [error, setError, t]);
}
