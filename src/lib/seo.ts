/**
 * Technical SEO/GEO for the public site.
 * Home title, description and entity copy are Marketing-locked.
 * Do not invent slogans, FAQ answers, or route-level marketing meta here.
 */

export const SITE_NAME = 'Voltou';
export const SITE_URL = 'https://www.voltouapp.com';

export const HOME_H1_LINE_1 = 'A 1ª venda você fez no balcão.';
export const HOME_H1_LINE_2 = 'A 2ª venda a Voltou faz por você.';

export const HOME_TITLE =
  'A 1ª venda você fez no balcão. A 2ª venda a Voltou faz por você. | Voltou';

/** OG/Twitter title may drop the trailing "| Voltou" — siteName already carries it. */
export const HOME_TITLE_OG =
  'A 1ª venda você fez no balcão. A 2ª venda a Voltou faz por você.';

export const HOME_DESCRIPTION =
  'A Voltou fecha a 2ª venda da sua loja física de roupa e calçado. Você cadastra nome e número no balcão. Sem mensalidade. Comissão só na venda extra.';

export const HOME_OFFER_SUB =
  'A Voltou fecha a venda e te dá lucro. O cliente da sua loja, atendimento requintado.';

export const HOME_OFFER_TERMS =
  'Sem mensalidade. Sem cartão. Comissão só na venda extra.';

export const HOME_CTA_LABEL = 'Criar conta e cadastrar o 1º cliente';
export const HOME_CTA_HREF = '/entrar?tab=criar';

/** Primary themes + entity. Secondary phrases stay in page copy, not stuffed here. */
export const HOME_KEYWORDS = [
  '2ª venda loja física',
  'segunda venda balcão',
  'recuperar venda loja de roupa',
  'loja de calçado segunda venda',
  'Voltou',
  'voltouapp.com',
];

/** Forbidden in title / meta / H1 / OG / Twitter / JSON-LD (Marketing lock). */
export const FORBIDDEN_HOME_SEO = [
  /puxa|puxar/i,
  /trata VIP/i,
  /5%/,
  /robô/i,
  /disparo/i,
  /WhatsApp da loja/i,
  /não aconteceria sozinha/i,
] as const;

export const NO_INDEX_ROBOTS = { index: false, follow: false } as const;

const ROBOTS_DISALLOW = [
  '/painel/',
  '/equipe/',
  '/api/',
  '/entrar',
  '/esqueci-senha',
  '/redefinir-senha',
  '/verificar-email',
  '/loja/',
  '/obrigado/',
  '/aguardando/',
  '/p/',
] as const;

export const HOME_METADATA = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  keywords: HOME_KEYWORDS,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website' as const,
    locale: 'pt_BR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: HOME_TITLE_OG,
    description: HOME_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: HOME_TITLE_OG,
    description: HOME_DESCRIPTION,
  },
};

export const HOME_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      description: HOME_DESCRIPTION,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: 'pt-BR',
      description: HOME_DESCRIPTION,
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: SITE_URL,
      description: HOME_DESCRIPTION,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: 'pt-BR',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'BRL',
        description: HOME_OFFER_TERMS,
      },
    },
  ],
};

export function noIndexMetadata(title?: string) {
  return title
    ? { title, robots: { ...NO_INDEX_ROBOTS } }
    : { robots: { ...NO_INDEX_ROBOTS } };
}

export function siteRobots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [...ROBOTS_DISALLOW],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

export function siteSitemap() {
  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
  ];
}
