/**
 * Import-source configuration: which domains we may ingest from and under
 * what terms. The pipeline itself is source-agnostic — this registry is the
 * single place deciding what gets ingested.
 *
 * Licence semantics:
 *  - 'allowed'        → import permitted (user-triggered and batch).
 *  - 'restricted'     → blocked; requires a product/legal green light first.
 *  - 'research-only'  → blocked outside development (fixtures, local tests).
 */
export type SourceLicence = 'allowed' | 'restricted' | 'research-only';

export interface ImportSourceConfig {
  /** Bare domain, matched against the URL host (subdomains included). */
  domain: string;
  licence: SourceLicence;
  /** Minimum delay between two requests to this domain (ms). */
  requestIntervalMs?: number;
  /** Free-text note: where the authorization comes from, restrictions, etc. */
  note?: string;
}

/**
 * Explicit per-domain entries. Add a domain here when its terms are known —
 * either to authorize bulk ingestion or to hard-block a site whose CGU
 * forbid scraping.
 */
const SOURCES: ImportSourceConfig[] = [
  {
    domain: 'marmiton.org',
    licence: 'allowed',
    requestIntervalMs: 2000,
    note: 'Import interactif à la demande d’un utilisateur (une URL à la fois).',
  },
];

/**
 * Licence applied to domains absent from the registry. Defaults to 'allowed'
 * because the interactive import is a single user-requested page fetch
 * (robots.txt and rate limiting still apply); batch/crawl tooling must set
 * IMPORT_DEFAULT_SOURCE_LICENCE=restricted so only vetted sources pass.
 */
function defaultLicence(): SourceLicence {
  const fromEnv = (process.env.IMPORT_DEFAULT_SOURCE_LICENCE ?? '').toLowerCase();
  if (fromEnv === 'restricted' || fromEnv === 'research-only' || fromEnv === 'allowed') {
    return fromEnv;
  }
  return 'allowed';
}

export const DEFAULT_REQUEST_INTERVAL_MS = parseInt(
  process.env.IMPORT_REQUEST_INTERVAL_MS ?? '2000',
  10
);

export function getSourceConfig(domain: string): ImportSourceConfig {
  const normalized = domain.toLowerCase().replace(/^www\./, '');
  const entry = SOURCES.find(
    (source) => normalized === source.domain || normalized.endsWith(`.${source.domain}`)
  );
  if (entry) return entry;
  return {
    domain: normalized,
    licence: defaultLicence(),
    requestIntervalMs: DEFAULT_REQUEST_INTERVAL_MS,
  };
}

/** True when the licence permits fetching in the current environment. */
export function isSourceAllowed(config: ImportSourceConfig): boolean {
  if (config.licence === 'allowed') return true;
  if (config.licence === 'research-only') {
    return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  }
  return false;
}
