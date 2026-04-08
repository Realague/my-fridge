export interface StoreCatalogEntry {
  slug: string;
  name: string;
  logoUrl: string;
  color: string;
  country: 'fr' | 'be' | 'both';
}

const siIcon = (slug: string, color: string) =>
  `https://cdn.simpleicons.org/${slug}/${color.replace('#', '')}`;

const favicon = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

export const storeCatalog: StoreCatalogEntry[] = [
  // France
  {
    slug: 'carrefour',
    name: 'Carrefour',
    logoUrl: siIcon('carrefour', '#004E9F'),
    color: '#004E9F',
    country: 'both',
  },
  {
    slug: 'leclerc',
    name: 'E.Leclerc',
    logoUrl: siIcon('edotleclerc', '#005BAA'),
    color: '#005BAA',
    country: 'fr',
  },
  {
    slug: 'auchan',
    name: 'Auchan',
    logoUrl: siIcon('auchan', '#E00034'),
    color: '#E00034',
    country: 'fr',
  },
  {
    slug: 'intermarche',
    name: 'Intermarché',
    logoUrl: siIcon('intermarche', '#E31E25'),
    color: '#E31E25',
    country: 'fr',
  },
  {
    slug: 'lidl',
    name: 'Lidl',
    logoUrl: siIcon('lidl', '#0050AA'),
    color: '#0050AA',
    country: 'both',
  },
  {
    slug: 'aldi',
    name: 'Aldi',
    logoUrl: siIcon('aldinord', '#00005F'),
    color: '#00005F',
    country: 'both',
  },
  {
    slug: 'casino',
    name: 'Casino',
    logoUrl: favicon('casino.fr'),
    color: '#E30613',
    country: 'fr',
  },
  {
    slug: 'monoprix',
    name: 'Monoprix',
    logoUrl: siIcon('monoprix', '#E4002B'),
    color: '#E4002B',
    country: 'fr',
  },
  {
    slug: 'franprix',
    name: 'Franprix',
    logoUrl: siIcon('franprix', '#ED1C24'),
    color: '#ED1C24',
    country: 'fr',
  },
  {
    slug: 'picard',
    name: 'Picard',
    logoUrl: siIcon('picardsurgeles', '#003DA5'),
    color: '#003DA5',
    country: 'fr',
  },
  {
    slug: 'grand-frais',
    name: 'Grand Frais',
    logoUrl: siIcon('grandfrais', '#6BAE42'),
    color: '#6BAE42',
    country: 'fr',
  },
  {
    slug: 'biocoop',
    name: 'Biocoop',
    logoUrl: favicon('biocoop.fr'),
    color: '#8DC63F',
    country: 'fr',
  },
  {
    slug: 'naturalia',
    name: 'Naturalia',
    logoUrl: favicon('naturalia.fr'),
    color: '#6B8E23',
    country: 'fr',
  },
  {
    slug: 'cora',
    name: 'Cora',
    logoUrl: siIcon('cora', '#E30613'),
    color: '#E30613',
    country: 'both',
  },
  {
    slug: 'systeme-u',
    name: 'Système U',
    logoUrl: favicon('magasins-u.com'),
    color: '#E30613',
    country: 'fr',
  },
  {
    slug: 'match',
    name: 'Match',
    logoUrl: favicon('supermarchesmatch.fr'),
    color: '#ED1C24',
    country: 'both',
  },
  {
    slug: 'netto',
    name: 'Netto',
    logoUrl: siIcon('netto', '#FFD700'),
    color: '#FFD700',
    country: 'fr',
  },
  {
    slug: 'leader-price',
    name: 'Leader Price',
    logoUrl: siIcon('leaderprice', '#003DA5'),
    color: '#003DA5',
    country: 'fr',
  },

  // Belgique
  {
    slug: 'colruyt',
    name: 'Colruyt',
    logoUrl: favicon('colruyt.be'),
    color: '#E30613',
    country: 'be',
  },
  {
    slug: 'delhaize',
    name: 'Delhaize',
    logoUrl: favicon('delhaize.be'),
    color: '#E30613',
    country: 'be',
  },
  {
    slug: 'albert-heijn',
    name: 'Albert Heijn',
    logoUrl: siIcon('albertheijn', '#00A0E2'),
    color: '#00A0E2',
    country: 'be',
  },
  {
    slug: 'proxy-delhaize',
    name: 'Proxy Delhaize',
    logoUrl: favicon('delhaize.be'),
    color: '#E30613',
    country: 'be',
  },
  {
    slug: 'spar',
    name: 'Spar',
    logoUrl: favicon('spar.be'),
    color: '#00843D',
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
