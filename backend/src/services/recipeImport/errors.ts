/**
 * Typed errors for the import pipeline. The controller maps them to HTTP
 * statuses; keeping them separate from CustomErrors avoids leaking
 * import-specific semantics into the generic error handler.
 */

/** The source's licence flag forbids importing from this domain. */
export class SourceNotAllowedError extends Error {
  public override name = 'SourceNotAllowedError';

  constructor(public readonly domain: string, licence: string) {
    super(`Importing from "${domain}" is not allowed (source licence: ${licence})`);
  }
}

/** robots.txt of the target domain disallows fetching this path. */
export class RobotsDisallowedError extends Error {
  public override name = 'RobotsDisallowedError';

  constructor(public readonly url: string) {
    super(`robots.txt disallows fetching ${url}`);
  }
}

/** Network / HTTP failure while fetching the page. */
export class FetchFailedError extends Error {
  public override name = 'FetchFailedError';

  constructor(url: string, public readonly statusCode?: number) {
    super(
      statusCode
        ? `Failed to fetch ${url} (HTTP ${statusCode})`
        : `Failed to fetch ${url}`
    );
  }
}

/** The page was fetched but no recipe could be extracted from it. */
export class NoRecipeFoundError extends Error {
  public override name = 'NoRecipeFoundError';

  constructor(url: string) {
    super(`No recipe data found on ${url}`);
  }
}
