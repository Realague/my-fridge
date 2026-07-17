import { describe, expect, it } from 'vitest';
import { DomainRateLimiter } from '../domainRateLimiter';

describe('DomainRateLimiter', () => {
  it('spaces consecutive requests to the same domain by the interval', async () => {
    const sleeps: number[] = [];
    const limiter = new DomainRateLimiter(async (ms) => {
      sleeps.push(ms);
    });

    await limiter.acquire('site.test', 1000);
    await limiter.acquire('site.test', 1000);

    expect(sleeps).toHaveLength(1);
    expect(sleeps[0]).toBeGreaterThan(900);
    expect(sleeps[0]).toBeLessThanOrEqual(1000);
  });

  it('does not throttle across different domains', async () => {
    const sleeps: number[] = [];
    const limiter = new DomainRateLimiter(async (ms) => {
      sleeps.push(ms);
    });

    await limiter.acquire('a.test', 1000);
    await limiter.acquire('b.test', 1000);

    expect(sleeps).toHaveLength(0);
  });

  it('doubles the wait after failures (backoff) and resets on success', async () => {
    const sleeps: number[] = [];
    const limiter = new DomainRateLimiter(async (ms) => {
      sleeps.push(ms);
    });

    await limiter.acquire('site.test', 1000); // sets next slot at +1000×1
    limiter.reportFailure('site.test'); // factor 2
    await limiter.acquire('site.test', 1000); // waits ~1000, sets +1000×2
    await limiter.acquire('site.test', 1000); // waits ~2000

    expect(sleeps).toHaveLength(2);
    expect(sleeps[1]).toBeGreaterThan(1500);

    limiter.reportSuccess('site.test'); // factor back to 1
    await limiter.acquire('site.test', 1000);
    const lastSleep = sleeps[sleeps.length - 1] ?? 0;
    expect(lastSleep).toBeLessThanOrEqual(2000);
  });

  it('serializes concurrent callers on the same domain', async () => {
    const order: number[] = [];
    const limiter = new DomainRateLimiter(async () => undefined);

    await Promise.all([
      limiter.acquire('site.test', 10).then(() => order.push(1)),
      limiter.acquire('site.test', 10).then(() => order.push(2)),
      limiter.acquire('site.test', 10).then(() => order.push(3)),
    ]);

    expect(order).toEqual([1, 2, 3]);
  });
});
