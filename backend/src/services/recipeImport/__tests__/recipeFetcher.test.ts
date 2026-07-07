import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosInstance } from 'axios';
import { RecipeFetcher } from '../recipeFetcher';
import { RobotsChecker } from '../robotsTxt';
import { DomainRateLimiter } from '../domainRateLimiter';
import { RobotsDisallowedError, SourceNotAllowedError, FetchFailedError } from '../errors';

/**
 * Conformité de la couche fetch, testée sur un domaine mocké : aucun accès
 * réseau (HTTP et robots.txt sont injectés).
 */

interface FakeResponse {
  status: number;
  data?: string;
  headers?: Record<string, string>;
}

function fakeHttp(responses: FakeResponse[]): { http: AxiosInstance; calls: string[] } {
  const calls: string[] = [];
  let index = 0;
  const http = {
    get: vi.fn(async (url: string) => {
      calls.push(url);
      const response = responses[Math.min(index, responses.length - 1)];
      index++;
      return { ...response, data: response?.data ?? '', request: {} };
    }),
  } as unknown as AxiosInstance;
  return { http, calls };
}

function robotsWith(body: string): RobotsChecker {
  return new RobotsChecker(async () => ({ status: 200, body }), 'MyFridgeBot');
}

const instantLimiter = () => new DomainRateLimiter(async () => undefined);

afterEach(() => {
  delete process.env.IMPORT_DEFAULT_SOURCE_LICENCE;
});

describe('RecipeFetcher — conformité', () => {
  it('refuse un chemin interdit par robots.txt sans fetcher la page', async () => {
    const { http, calls } = fakeHttp([{ status: 200, data: '<html></html>' }]);
    const fetcher = new RecipeFetcher({
      http,
      robots: robotsWith('User-agent: *\nDisallow: /recettes/'),
      limiter: instantLimiter(),
    });

    await expect(
      fetcher.fetchHtml('https://site.test/recettes/tarte')
    ).rejects.toBeInstanceOf(RobotsDisallowedError);
    expect(calls).toHaveLength(0); // la page n'a jamais été demandée
  });

  it('fetch une page autorisée', async () => {
    const { http, calls } = fakeHttp([{ status: 200, data: '<html>ok</html>' }]);
    const fetcher = new RecipeFetcher({
      http,
      robots: robotsWith('User-agent: *\nDisallow: /admin/'),
      limiter: instantLimiter(),
    });

    const page = await fetcher.fetchHtml('https://site.test/recettes/tarte');
    expect(page.html).toBe('<html>ok</html>');
    expect(calls).toEqual(['https://site.test/recettes/tarte']);
  });

  it('applique le rate limiting par domaine entre deux requêtes', async () => {
    const sleeps: number[] = [];
    const limiter = new DomainRateLimiter(async (ms) => {
      sleeps.push(ms);
    });
    const { http } = fakeHttp([{ status: 200, data: 'x' }]);
    const fetcher = new RecipeFetcher({ http, robots: robotsWith(''), limiter });

    await fetcher.fetchHtml('https://site.test/a');
    await fetcher.fetchHtml('https://site.test/b');

    // Deuxième requête retardée d'environ l'intervalle configuré (2s défaut).
    expect(sleeps).toHaveLength(1);
    expect(sleeps[0]).toBeGreaterThan(1500);
  });

  it('respecte le Crawl-delay de robots.txt quand il dépasse l\'intervalle', async () => {
    const sleeps: number[] = [];
    const limiter = new DomainRateLimiter(async (ms) => {
      sleeps.push(ms);
    });
    const { http } = fakeHttp([{ status: 200, data: 'x' }]);
    const fetcher = new RecipeFetcher({
      http,
      robots: robotsWith('User-agent: *\nCrawl-delay: 10'),
      limiter,
    });

    await fetcher.fetchHtml('https://slow.test/a');
    await fetcher.fetchHtml('https://slow.test/b');

    expect(sleeps[0]).toBeGreaterThan(9000);
  });

  it('réessaie une fois sur 429 puis réussit', async () => {
    const { http, calls } = fakeHttp([
      { status: 429, headers: {} },
      { status: 200, data: '<html>enfin</html>' },
    ]);
    const fetcher = new RecipeFetcher({ http, robots: robotsWith(''), limiter: instantLimiter() });

    const page = await fetcher.fetchHtml('https://site.test/x');
    expect(page.html).toBe('<html>enfin</html>');
    expect(calls).toHaveLength(2);
  });

  it('échec persistant → FetchFailedError avec le statut', async () => {
    const { http } = fakeHttp([{ status: 503 }]);
    const fetcher = new RecipeFetcher({ http, robots: robotsWith(''), limiter: instantLimiter() });

    await expect(fetcher.fetchHtml('https://down.test/x')).rejects.toMatchObject({
      name: 'FetchFailedError',
      statusCode: 503,
    });
  });

  it('erreur 4xx non réessayable → FetchFailedError direct', async () => {
    const { http, calls } = fakeHttp([{ status: 404 }]);
    const fetcher = new RecipeFetcher({ http, robots: robotsWith(''), limiter: instantLimiter() });

    await expect(fetcher.fetchHtml('https://site.test/x')).rejects.toBeInstanceOf(FetchFailedError);
    expect(calls).toHaveLength(1);
  });

  it('licence par défaut "restricted" → domaine inconnu bloqué', async () => {
    process.env.IMPORT_DEFAULT_SOURCE_LICENCE = 'restricted';
    const { http, calls } = fakeHttp([{ status: 200, data: 'x' }]);
    const fetcher = new RecipeFetcher({ http, robots: robotsWith(''), limiter: instantLimiter() });

    await expect(
      fetcher.fetchHtml('https://inconnu.test/recette')
    ).rejects.toBeInstanceOf(SourceNotAllowedError);
    expect(calls).toHaveLength(0);

    // marmiton.org reste explicitement autorisé dans le registre des sources.
    await expect(fetcher.fetchHtml('https://www.marmiton.org/recettes/x')).resolves.toBeDefined();
  });
});
