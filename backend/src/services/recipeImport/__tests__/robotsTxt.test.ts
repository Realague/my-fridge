import { describe, expect, it } from 'vitest';
import { parseRobotsTxt, RobotsChecker } from '../robotsTxt';

describe('parseRobotsTxt', () => {
  const sample = `
# commentaire
User-agent: *
Disallow: /admin/
Disallow: /private
Allow: /private/recettes
Crawl-delay: 3

User-agent: MyFridgeBot
Disallow: /interdit/
`;

  it('applies the matching user-agent group over *', () => {
    const policy = parseRobotsTxt(sample, 'MyFridgeBot');
    expect(policy.isAllowed('/interdit/page')).toBe(false);
    // The * group's rules do not apply to our specific group.
    expect(policy.isAllowed('/admin/x')).toBe(true);
  });

  it('falls back to the * group for unknown agents', () => {
    const policy = parseRobotsTxt(sample, 'OtherBot');
    expect(policy.isAllowed('/admin/x')).toBe(false);
    expect(policy.isAllowed('/recettes/tarte')).toBe(true);
  });

  it('longest match wins — Allow can re-open a subtree', () => {
    const policy = parseRobotsTxt(sample, 'OtherBot');
    expect(policy.isAllowed('/private/autre')).toBe(false);
    expect(policy.isAllowed('/private/recettes/tarte')).toBe(true);
  });

  it('reads Crawl-delay for the selected group', () => {
    expect(parseRobotsTxt(sample, 'OtherBot').crawlDelaySeconds).toBe(3);
    expect(parseRobotsTxt(sample, 'MyFridgeBot').crawlDelaySeconds).toBeNull();
  });

  it('supports * wildcards and $ anchors in paths', () => {
    const policy = parseRobotsTxt(
      `User-agent: *\nDisallow: /*.pdf$\nDisallow: /tmp*/`,
      'MyFridgeBot'
    );
    expect(policy.isAllowed('/doc/guide.pdf')).toBe(false);
    expect(policy.isAllowed('/doc/guide.pdf?page=2')).toBe(true);
    expect(policy.isAllowed('/tmp123/x')).toBe(false);
  });

  it('allows everything when the file is empty', () => {
    const policy = parseRobotsTxt('', 'MyFridgeBot');
    expect(policy.isAllowed('/anything')).toBe(true);
  });

  it('handles a full Disallow: /', () => {
    const policy = parseRobotsTxt(`User-agent: *\nDisallow: /`, 'MyFridgeBot');
    expect(policy.isAllowed('/')).toBe(false);
    expect(policy.isAllowed('/recette')).toBe(false);
  });
});

describe('RobotsChecker', () => {
  it('fetches robots.txt once per origin (cache)', async () => {
    let calls = 0;
    const checker = new RobotsChecker(async () => {
      calls++;
      return { status: 200, body: 'User-agent: *\nDisallow: /admin/' };
    }, 'MyFridgeBot');

    expect((await checker.isAllowed('https://site.test/recette/1')).allowed).toBe(true);
    expect((await checker.isAllowed('https://site.test/admin/x')).allowed).toBe(false);
    expect(calls).toBe(1);
  });

  it('missing robots.txt (404) → everything allowed', async () => {
    const checker = new RobotsChecker(async () => ({ status: 404, body: '' }), 'MyFridgeBot');
    expect((await checker.isAllowed('https://site.test/x')).allowed).toBe(true);
  });

  it('server error or unreachable → conservative deny', async () => {
    const failing = new RobotsChecker(async () => ({ status: 503, body: '' }), 'MyFridgeBot');
    expect((await failing.isAllowed('https://down.test/x')).allowed).toBe(false);

    const throwing = new RobotsChecker(async () => {
      throw new Error('ECONNREFUSED');
    }, 'MyFridgeBot');
    expect((await throwing.isAllowed('https://gone.test/x')).allowed).toBe(false);
  });

  it('propagates crawl-delay to the caller', async () => {
    const checker = new RobotsChecker(
      async () => ({ status: 200, body: 'User-agent: *\nCrawl-delay: 5' }),
      'MyFridgeBot'
    );
    expect((await checker.isAllowed('https://slow.test/x')).crawlDelaySeconds).toBe(5);
  });
});
