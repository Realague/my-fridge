/**
 * Minimal robots.txt support (RFC 9309 subset): user-agent groups,
 * Allow/Disallow with `*` wildcards and `$` end anchor, longest-match
 * precedence (Allow wins ties), plus Crawl-delay.
 *
 * The checker caches parsed files per origin and takes an injectable
 * fetcher so tests never touch the network.
 */

interface RobotsRule {
  allow: boolean;
  pattern: string;
}

interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
  crawlDelaySeconds: number | null;
}

export interface RobotsPolicy {
  isAllowed(path: string): boolean;
  crawlDelaySeconds: number | null;
}

export function parseRobotsTxt(content: string, userAgentToken: string): RobotsPolicy {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let lastLineWasAgent = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;

    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === 'user-agent') {
      if (!lastLineWasAgent || !current) {
        current = { agents: [], rules: [], crawlDelaySeconds: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastLineWasAgent = true;
      continue;
    }

    lastLineWasAgent = false;
    if (!current) continue;

    if (field === 'allow' || field === 'disallow') {
      // An empty Disallow means "everything allowed" — no rule to record.
      if (value === '') continue;
      current.rules.push({ allow: field === 'allow', pattern: value });
    } else if (field === 'crawl-delay') {
      const parsed = parseFloat(value);
      if (Number.isFinite(parsed) && parsed >= 0) {
        current.crawlDelaySeconds = parsed;
      }
    }
  }

  // Pick the group with the most specific matching agent token, else '*'.
  const token = userAgentToken.toLowerCase();
  let selected: RobotsGroup | null = null;
  let selectedSpecificity = -1;
  for (const group of groups) {
    for (const agent of group.agents) {
      if (agent === '*') {
        if (selectedSpecificity < 0) {
          selected = group;
          selectedSpecificity = 0;
        }
      } else if (token.includes(agent) && agent.length > selectedSpecificity) {
        selected = group;
        selectedSpecificity = agent.length;
      }
    }
  }

  if (!selected) {
    return { isAllowed: () => true, crawlDelaySeconds: null };
  }

  const rules = selected.rules;
  const crawlDelaySeconds = selected.crawlDelaySeconds;

  return {
    crawlDelaySeconds,
    isAllowed(path: string): boolean {
      const target = path || '/';
      let bestMatchLength = -1;
      let bestAllow = true;
      for (const rule of rules) {
        if (!patternMatches(rule.pattern, target)) continue;
        const length = rule.pattern.length;
        if (
          length > bestMatchLength ||
          // Longest match wins; Allow wins exact ties.
          (length === bestMatchLength && rule.allow && !bestAllow)
        ) {
          bestMatchLength = length;
          bestAllow = rule.allow;
        }
      }
      return bestMatchLength === -1 ? true : bestAllow;
    },
  };
}

/** robots.txt path patterns: literal prefix with `*` wildcards, `$` anchor. */
function patternMatches(pattern: string, path: string): boolean {
  let regexSource = '';
  for (const char of pattern) {
    if (char === '*') regexSource += '.*';
    else if (char === '$') regexSource += '$';
    else regexSource += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  try {
    return new RegExp(`^${regexSource}`).test(path);
  } catch {
    return false;
  }
}

export type TextFetcher = (url: string) => Promise<{ status: number; body: string }>;

interface CacheEntry {
  policy: RobotsPolicy;
  expiresAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export class RobotsChecker {
  private cache = new Map<string, CacheEntry>();

  constructor(
    private readonly fetchText: TextFetcher,
    private readonly userAgentToken: string
  ) {}

  /**
   * Whether our crawler may fetch `url`, according to the domain's
   * robots.txt. Missing file (4xx) → everything allowed; unreachable or
   * server error → conservative deny.
   */
  async isAllowed(url: string): Promise<{ allowed: boolean; crawlDelaySeconds: number | null }> {
    const parsed = new URL(url);
    const policy = await this.getPolicy(parsed.origin);
    return {
      allowed: policy.isAllowed(parsed.pathname + parsed.search),
      crawlDelaySeconds: policy.crawlDelaySeconds,
    };
  }

  private async getPolicy(origin: string): Promise<RobotsPolicy> {
    const cached = this.cache.get(origin);
    if (cached && cached.expiresAt > Date.now()) return cached.policy;

    let policy: RobotsPolicy;
    try {
      const response = await this.fetchText(`${origin}/robots.txt`);
      if (response.status >= 200 && response.status < 300) {
        policy = parseRobotsTxt(response.body, this.userAgentToken);
      } else if (response.status >= 400 && response.status < 500) {
        // No robots.txt → no restrictions.
        policy = { isAllowed: () => true, crawlDelaySeconds: null };
      } else {
        console.warn(`[recipe-import] robots.txt fetch got HTTP ${response.status} for ${origin} — denying`);
        policy = { isAllowed: () => false, crawlDelaySeconds: null };
      }
    } catch (error) {
      console.warn(`[recipe-import] robots.txt unreachable for ${origin} — denying`, error);
      policy = { isAllowed: () => false, crawlDelaySeconds: null };
    }

    this.cache.set(origin, { policy, expiresAt: Date.now() + CACHE_TTL_MS });
    return policy;
  }
}
