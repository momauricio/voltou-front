/**
 * Technical SEO/GEO for the public site.
 * Home title, description and entity copy are Marketing-locked in seo-copy.ts.
 */

import {
  HOME_DESCRIPTION,
  HOME_OFFER_TERMS,
  HOME_TITLE,
  HOME_TITLE_OG,
  SITE_NAME,
  SITE_URL,
} from './seo-copy.ts';

export {
  FORBIDDEN_HOME_SEO,
  HOME_CTA_HREF,
  HOME_CTA_LABEL,
  HOME_DESCRIPTION,
  HOME_H1_LINE_1,
  HOME_H1_LINE_2,
  HOME_OFFER_SUB,
  HOME_OFFER_TERMS,
  HOME_TITLE,
  HOME_TITLE_OG,
  SITE_NAME,
  SITE_URL,
} from './seo-copy.ts';

export const NO_INDEX_ROBOTS = { index: false, follow: false } as const;

/**
 * Prefix paths without a trailing slash so `/painel` matches `/painel` and
 * `/painel/foo`. Keep `/p/` slashed so it does not prefix-match `/painel`.
 */
const ROBOTS_DISALLOW = [
  '/painel',
  '/equipe',
  '/api',
  '/entrar',
  '/esqueci-senha',
  '/redefinir-senha',
  '/verificar-email',
  '/loja',
  '/obrigado',
  '/aguardando',
  '/p/',
] as const;

export const HOME_METADATA = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
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
