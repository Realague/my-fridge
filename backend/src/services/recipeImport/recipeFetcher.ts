import axios, { AxiosInstance } from 'axios';
import { RobotsChecker, TextFetcher } from './robotsTxt';
import { DomainRateLimiter } from './domainRateLimiter';
import { getSourceConfig, isSourceAllowed, DEFAULT_REQUEST_INTERVAL_MS } from './sourceRegistry';
import { FetchFailedError, RobotsDisallowedError, SourceNotAllowedError } from './errors';
import { domainOfUrl } from './types';

/**
 * Compliance-gated HTTP layer of the import pipeline. Every outbound request
 * goes through, in order: source-licence check → robots.txt check →
 * per-domain rate limiting → fetch with an identifiable User-Agent.
 * One retry with backoff on 429/5xx (honouring Retry-After when present).
 */

export const IMPORT_USER_AGENT =
  process.env.IMPORT_USER_AGENT ??
  'MyFridgeBot/1.0 (+https://github.com/Realague/my-fridge; recipe import)';

/** Token used to match our bot in robots.txt user-agent groups. */
export const IMPORT_USER_AGENT_TOKEN = 'MyFridgeBot';

const FETCH_TIMEOUT_MS = 15000;
const MAX_CONTENT_LENGTH = 5 * 1024 * 1024; // 5 MB of HTML is already generous

export interface FetchedPage {
  html: string;
  /** URL after redirects when the HTTP client exposes it, else the input. */
  finalUrl: string;
}

export class RecipeFetcher {
  private readonly http: AxiosInstance;
  private readonly robots: RobotsChecker;
  private readonly limiter: DomainRateLimiter;

  constructor(options?: {
    http?: AxiosInstance;
    robots?: RobotsChecker;
    limiter?: DomainRateLimiter;
  }) {
    this.http =
      options?.http ??
      axios.create({
        timeout: FETCH_TIMEOUT_MS,
        maxContentLength: MAX_CONTENT_LENGTH,
        maxRedirects: 5,
        headers: {
          'User-Agent': IMPORT_USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.7',
        },
        validateStatus: () => true,
      });

    const robotsFetcher: TextFetcher = async (url) => {
      const response = await this.http.get<string>(url, {
        responseType: 'text',
        // robots.txt is small and must not tie up the pipeline.
        timeout: 5000,
      });
      return { status: response.status, body: typeof response.data === 'string' ? response.data : '' };
    };

    this.robots = options?.robots ?? new RobotsChecker(robotsFetcher, IMPORT_USER_AGENT_TOKEN);
    this.limiter = options?.limiter ?? new DomainRateLimiter();
  }

  async fetchHtml(url: string): Promise<FetchedPage> {
    const parsed = new URL(url); // throws on invalid URL — caller validates first
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new FetchFailedError(url);
    }

    const domain = domainOfUrl(url);
    const source = getSourceConfig(domain);
    if (!isSourceAllowed(source)) {
      throw new SourceNotAllowedError(domain, source.licence);
    }

    const { allowed, crawlDelaySeconds } = await this.robots.isAllowed(url);
    if (!allowed) {
      throw new RobotsDisallowedError(url);
    }

    const configuredInterval = source.requestIntervalMs ?? DEFAULT_REQUEST_INTERVAL_MS;
    const intervalMs = Math.max(configuredInterval, (crawlDelaySeconds ?? 0) * 1000);

    let lastStatus: number | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      await this.limiter.acquire(domain, intervalMs);

      let response;
      try {
        response = await this.http.get<string>(url, { responseType: 'text' });
      } catch (error) {
        this.limiter.reportFailure(domain);
        throw new FetchFailedError(url);
      }

      if (response.status >= 200 && response.status < 300) {
        this.limiter.reportSuccess(domain);
        const finalUrl =
          (response.request?.res?.responseUrl as string | undefined) ?? url;
        return { html: String(response.data ?? ''), finalUrl };
      }

      lastStatus = response.status;
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === 1) break;

      this.limiter.reportFailure(domain);
      const retryAfterSeconds = parseFloat(String(response.headers?.['retry-after'] ?? ''));
      if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(retryAfterSeconds, 30) * 1000)
        );
      }
    }

    throw new FetchFailedError(url, lastStatus);
  }
}
