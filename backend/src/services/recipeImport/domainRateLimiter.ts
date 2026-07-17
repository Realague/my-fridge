/**
 * Per-domain politeness throttle. Requests to the same domain are spaced by
 * a minimum interval (configurable per source, raised by robots.txt
 * Crawl-delay) and serialized; failures trigger exponential backoff so a
 * struggling site is not hammered.
 */

interface DomainState {
  /** Timestamp before which no request to this domain may start. */
  nextAllowedAt: number;
  /** Serialization chain: each new request queues behind the previous one. */
  queue: Promise<void>;
  /** Current backoff multiplier (1 = nominal interval). */
  backoffFactor: number;
}

const MAX_BACKOFF_FACTOR = 8;

export class DomainRateLimiter {
  private domains = new Map<string, DomainState>();

  constructor(private readonly sleep: (ms: number) => Promise<void> = defaultSleep) {}

  /**
   * Resolves when a request slot for `domain` is available. Callers must
   * await this before every outbound request.
   */
  async acquire(domain: string, minIntervalMs: number): Promise<void> {
    const state = this.getState(domain);

    const run = state.queue.then(async () => {
      const now = Date.now();
      const waitMs = state.nextAllowedAt - now;
      if (waitMs > 0) {
        await this.sleep(waitMs);
      }
      state.nextAllowedAt = Date.now() + minIntervalMs * state.backoffFactor;
    });

    // The chain must survive rejections so one failed caller does not block
    // the queue forever.
    state.queue = run.catch(() => undefined);
    return run;
  }

  /** Doubles the wait after throttling/server errors (429, 5xx). */
  reportFailure(domain: string): void {
    const state = this.getState(domain);
    state.backoffFactor = Math.min(state.backoffFactor * 2, MAX_BACKOFF_FACTOR);
  }

  /** Resets backoff after a successful request. */
  reportSuccess(domain: string): void {
    const state = this.getState(domain);
    state.backoffFactor = 1;
  }

  private getState(domain: string): DomainState {
    let state = this.domains.get(domain);
    if (!state) {
      state = { nextAllowedAt: 0, queue: Promise.resolve(), backoffFactor: 1 };
      this.domains.set(domain, state);
    }
    return state;
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
