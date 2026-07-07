import { findStructuredRecipe } from './structuredDataExtractor';
import { mapSchemaOrgRecipe } from './schemaOrgMapper';
import { extractRecipeFromDom } from './htmlFallback';
import { ImportedRecipe, domainOfUrl } from './types';

/**
 * Pure pipeline entry point: HTML in, normalized recipe out.
 * Structured data (JSON-LD → microdata → RDFa) is authoritative; the DOM
 * fallback only runs when none is found, and that miss is logged so sites
 * needing special handling can be identified from production logs.
 *
 * Kept free of network/database concerns on purpose — integration tests run
 * it against saved fixture pages.
 */
export function extractRecipe(html: string, sourceUrl: string): ImportedRecipe | null {
  const structured = findStructuredRecipe(html);
  if (structured) {
    return mapSchemaOrgRecipe(structured.node, sourceUrl, structured.method);
  }

  console.warn(
    `[recipe-import] structured-data miss: no Schema.org Recipe found ` +
      `(domain=${domainOfUrl(sourceUrl) || 'unknown'}, url=${sourceUrl}) — trying HTML fallback`
  );
  return extractRecipeFromDom(html, sourceUrl);
}
