export interface StoreCatalogEntry {
  slug: string;
  name: string;
  /** Primary: full-color brand mark (Clearbit company logo by domain). */
  logoUrl: string;
  /** Secondary: monochrome Simple Icons mark if primary fails to load. */
  logoFallbackUrl?: string;
  color: string;
  country: 'fr' | 'be' | 'both';
}

/** Full-color logos from registered domain (falls back via component if unavailable). */
const brandLogo = (domain: string) =>
  `https://logo.clearbit.com/${encodeURIComponent(domain)}`;

const siIcon = (slug: string, color: string) =>
  `https://cdn.simpleicons.org/${slug}/${color.replace('#', '')}`;

/** Larger favicon when Simple Icons has no good match for a brand. */
const faviconHi = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=256`;

/** Brand tints for cards / initials — aligned with public signage & chartes when distinct from generic “hyper red”. */
export const storeCatalog: StoreCatalogEntry[] = [
  // France
  {
    slug: 'carrefour',
    name: 'Carrefour',
    logoUrl: brandLogo('carrefour.com'),
    logoFallbackUrl: siIcon('carrefour', '#00529B'),
    color: '#00529B',
    country: 'both',
  },
  {
    slug: 'leclerc',
    name: 'E.Leclerc',
    logoUrl: brandLogo('leclerc.fr'),
    logoFallbackUrl: siIcon('edotleclerc', '#004F9F'),
    color: '#004F9F',
    country: 'fr',
  },
  {
    slug: 'auchan',
    name: 'Auchan',
    logoUrl: brandLogo('auchan.fr'),
    logoFallbackUrl: siIcon('auchan', '#E2001A'),
    color: '#E2001A',
    country: 'fr',
  },
  {
    slug: 'intermarche',
    name: 'Intermarché',
    logoUrl: brandLogo('intermarche.com'),
    logoFallbackUrl: siIcon('intermarche', '#E30613'),
    color: '#E30613',
    country: 'fr',
  },
  {
    slug: 'lidl',
    name: 'Lidl',
    logoUrl: brandLogo('lidl.fr'),
    logoFallbackUrl: siIcon('lidl', '#0050AA'),
    color: '#0050AA',
    country: 'both',
  },
  {
    slug: 'aldi',
    name: 'Aldi',
    logoUrl: brandLogo('aldi.fr'),
    logoFallbackUrl: siIcon('aldinord', '#00457C'),
    color: '#00457C',
    country: 'both',
  },
  {
    slug: 'casino',
    name: 'Casino',
    logoUrl: brandLogo('casino.fr'),
    logoFallbackUrl: faviconHi('casino.fr'),
    color: '#009639',
    country: 'fr',
  },
  {
    slug: 'monoprix',
    name: 'Monoprix',
    logoUrl: brandLogo('monoprix.fr'),
    logoFallbackUrl: siIcon('monoprix', '#E2007A'),
    color: '#E2007A',
    country: 'fr',
  },
  {
    slug: 'franprix',
    name: 'Franprix',
    logoUrl: brandLogo('franprix.fr'),
    logoFallbackUrl: siIcon('franprix', '#F47920'),
    color: '#F47920',
    country: 'fr',
  },
  {
    slug: 'picard',
    name: 'Picard',
    logoUrl: brandLogo('picard.fr'),
    logoFallbackUrl: siIcon('picardsurgeles', '#001489'),
    color: '#001489',
    country: 'fr',
  },
  {
    slug: 'grand-frais',
    name: 'Grand Frais',
    logoUrl: brandLogo('grandfrais.com'),
    logoFallbackUrl: siIcon('grandfrais', '#76B82A'),
    color: '#76B82A',
    country: 'fr',
  },
  {
    slug: 'biocoop',
    name: 'Biocoop',
    logoUrl: brandLogo('biocoop.fr'),
    logoFallbackUrl: faviconHi('biocoop.fr'),
    color: '#7CB518',
    country: 'fr',
  },
  {
    slug: 'naturalia',
    name: 'Naturalia',
    logoUrl: brandLogo('naturalia.fr'),
    logoFallbackUrl: faviconHi('naturalia.fr'),
    color: '#558B2F',
    country: 'fr',
  },
  {
    slug: 'cora',
    name: 'Cora',
    logoUrl: brandLogo('cora.fr'),
    logoFallbackUrl: siIcon('cora', '#0055A4'),
    color: '#0055A4',
    country: 'both',
  },
  {
    slug: 'systeme-u',
    name: 'Système U',
    logoUrl: brandLogo('magasins-u.com'),
    logoFallbackUrl: faviconHi('magasins-u.com'),
    color: '#004F9F',
    country: 'fr',
  },
  {
    slug: 'match',
    name: 'Match',
    logoUrl: brandLogo('supermarchesmatch.fr'),
    logoFallbackUrl: faviconHi('supermarchesmatch.fr'),
    color: '#E30613',
    country: 'both',
  },
  {
    slug: 'netto',
    name: 'Netto',
    logoUrl: brandLogo('netto.fr'),
    logoFallbackUrl: siIcon('netto', '#E30613'),
    color: '#E30613',
    country: 'fr',
  },
  {
    slug: 'leader-price',
    name: 'Leader Price',
    logoUrl: brandLogo('leaderprice.fr'),
    logoFallbackUrl: siIcon('leaderprice', '#004F9F'),
    color: '#004F9F',
    country: 'fr',
  },

  // Belgique
  {
    slug: 'colruyt',
    name: 'Colruyt',
    logoUrl: brandLogo('colruyt.be'),
    logoFallbackUrl: siIcon('colruyt', '#F39200'),
    color: '#F39200',
    country: 'be',
  },
  {
    slug: 'delhaize',
    name: 'Delhaize',
    logoUrl: brandLogo('delhaize.be'),
    logoFallbackUrl: siIcon('delhaize', '#E2001A'),
    color: '#E2001A',
    country: 'be',
  },
  {
    slug: 'albert-heijn',
    name: 'Albert Heijn',
    logoUrl: brandLogo('ah.nl'),
    logoFallbackUrl: siIcon('albertheijn', '#00ADE6'),
    color: '#00ADE6',
    country: 'be',
  },
  {
    slug: 'proxy-delhaize',
    name: 'Proxy Delhaize',
    logoUrl: brandLogo('delhaize.be'),
    logoFallbackUrl: siIcon('delhaize', '#E2001A'),
    color: '#E2001A',
    country: 'be',
  },
  {
    slug: 'spar',
    name: 'Spar',
    logoUrl: brandLogo('spar.be'),
    logoFallbackUrl: siIcon('spar', '#008C45'),
    color: '#008C45',
    country: 'be',
  },
];

export const getStoreBySlug = (slug: string): StoreCatalogEntry | undefined => {
  return storeCatalog.find(store => store.slug === slug);
};

export const searchStores = (query: string): StoreCatalogEntry[] => {
  const lower = query.toLowerCase();
  return storeCatalog.filter(store =>
    store.name.toLowerCase().includes(lower)
  );
};
