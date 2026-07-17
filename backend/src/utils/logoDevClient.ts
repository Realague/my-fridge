import { uploadImageFromUrl } from './imageUploader';

/**
 * Builds the logo.dev image API URL for a domain using the publishable key.
 * Returns null when no domain or no key is configured.
 */
export function logoDevUrlForDomain(domain: string | null | undefined): string | null {
  const key = process.env.LOGODEV_PUBLISHABLE_KEY;
  if (!domain || !key) {
    return null;
  }
  const clean = domain.trim().toLowerCase();
  return `https://img.logo.dev/${encodeURIComponent(clean)}?token=${key}&format=png`;
}

/**
 * Fetches a logo from logo.dev (by domain) and hosts it on Cloudinary under
 * folder `brands` with the given publicId. Best-effort: returns null if the
 * domain is missing, the key is unset, or Cloudinary fails. Never throws.
 */
export async function fetchAndHostLogo(
  domain: string | null | undefined,
  publicId: string
): Promise<string | null> {
  const url = logoDevUrlForDomain(domain);
  if (!url) {
    return null;
  }
  return await uploadImageFromUrl(url, publicId, 'brands');
}
