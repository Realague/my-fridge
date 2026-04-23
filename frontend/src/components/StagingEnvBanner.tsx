import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const SESSION_KEY = "myfridge_staging_banner_dismissed";
const UNKNOWN = "(inconnu)";
const BRANCH_MAX_CHARS = 36;

function displayValue(raw: string | undefined): string {
  const s = raw?.trim() ?? "";
  return s.length > 0 ? s : UNKNOWN;
}

function shortSha(raw: string | undefined): string {
  const s = raw?.trim() ?? "";
  if (!s) return UNKNOWN;
  const hex = s.replace(/^sha256:/i, "");
  if (hex.length <= 7) return hex;
  return hex.slice(0, 7);
}

function formatDeployDate(iso: string | undefined): string {
  const s = iso?.trim() ?? "";
  if (!s) return UNKNOWN;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return UNKNOWN;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function StagingEnvBanner() {
  if (import.meta.env.VITE_SHOW_ENV_BANNER !== "true") {
    return null;
  }
  return <StagingEnvBannerInner />;
}

function StagingEnvBannerInner() {
  const branchRaw = import.meta.env.VITE_DEPLOY_BRANCH ?? "";
  const commitRaw = import.meta.env.VITE_DEPLOY_COMMIT ?? "";
  const buildDateRaw = import.meta.env.VITE_BUILD_DATE ?? "";

  const branchFull = displayValue(branchRaw);
  const branchTruncated =
    branchFull !== UNKNOWN && branchFull.length > BRANCH_MAX_CHARS
      ? `${branchFull.slice(0, BRANCH_MAX_CHARS)}…`
      : branchFull;

  const showBranchTooltip = branchFull !== UNKNOWN && branchFull.length > BRANCH_MAX_CHARS;

  const [dismissed, setDismissed] = useState(readDismissed);
  const bannerRef = useRef<HTMLDivElement>(null);
  const [spacerHeight, setSpacerHeight] = useState(48);

  const updateSpacerHeight = useCallback(() => {
    const el = bannerRef.current;
    if (!el) return;
    setSpacerHeight(el.offsetHeight);
  }, []);

  useLayoutEffect(() => {
    if (dismissed) return;
    updateSpacerHeight();
    const el = bannerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => updateSpacerHeight());
    ro.observe(el);
    return () => ro.disconnect();
  }, [dismissed, updateSpacerHeight]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const sha = shortSha(commitRaw);
  const deployLabel = formatDeployDate(buildDateRaw);

  const summaryLabel = `Environnement staging · branche ${branchFull} · commit ${sha} · déployé le ${deployLabel}`;

  return (
    <>
      {!dismissed && (
        <>
          <div
            ref={bannerRef}
            role="region"
            aria-label={summaryLabel}
            className={cn(
              "fixed left-0 right-0 top-0 z-40 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-amber-700/40",
              "bg-amber-500 px-3 py-2 text-sm font-medium text-amber-950 shadow-sm",
            )}
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-950" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="shrink-0 font-semibold">STAGING</span>
              <span className="text-amber-950/70" aria-hidden>
                ·
              </span>
              {showBranchTooltip ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="max-w-[min(100%,28rem)] cursor-default truncate"
                      title={branchFull}
                    >
                      {branchTruncated}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-sm break-all">
                    {branchFull}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <span className="max-w-[min(100%,28rem)] truncate" title={branchFull}>
                  {branchTruncated}
                </span>
              )}
              <span className="text-amber-950/70" aria-hidden>
                ·
              </span>
              <span className="shrink-0 font-mono text-xs sm:text-sm">{sha}</span>
              <span className="text-amber-950/70" aria-hidden>
                ·
              </span>
              <span className="min-w-0 shrink-0">
                Déployé le {deployLabel}
              </span>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className={cn(
                "ml-auto shrink-0 rounded-md p-1 text-amber-950",
                "hover:bg-amber-600/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-950",
              )}
              aria-label="Fermer le bandeau d'environnement staging"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div aria-hidden className="w-full shrink-0" style={{ height: spacerHeight }} />
        </>
      )}
      {dismissed && (
        <div
          role="status"
          aria-label="Environnement staging (STG)"
          className={cn(
            "pointer-events-none fixed right-2 top-2 z-40 select-none rounded px-1.5 py-0.5",
            "border border-amber-700/50 bg-amber-500 text-[10px] font-semibold uppercase tracking-wide text-amber-950 shadow-sm",
          )}
        >
          STG
        </div>
      )}
    </>
  );
}

