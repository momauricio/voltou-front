/**
 * Technical SEO/GEO for the public site.
 * Home title, description and entity copy are Marketing-locked in seo-copy.ts.
 */

import { LANDING_FAQ, type LandingFaqItem } from './landing-copy.ts';
import {
  FORBIDDEN_HOME_SEO,
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
export const ROBOTS_DISALLOW = [
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

/**
 * AI crawlers / agents that get an explicit allow group in robots.txt.
 * A crawler that matches a named group ignores the `*` group, so every group
 * repeats ROBOTS_DISALLOW. Bytespider is intentionally not listed: it is a
 * bulk training crawler with no user-facing answer surface; it still falls
 * under the `*` group like any other bot.
 */
export const AI_AGENT_USER_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
] as const;

export const LLMS_TXT_PATH = '/llms.txt';
export const LLMS_FULL_TXT_PATH = '/llms-full.txt';

/** Public URLs only — never add a ROBOTS_DISALLOW path here. */
export const PUBLIC_PATHS = ['/', LLMS_TXT_PATH, LLMS_FULL_TXT_PATH] as const;

/**
 * Forbidden on every agent-readable surface (llms*.txt, JSON-LD): the
 * Marketing lock plus the extra words that must never leave the FAQ.
 */
export const AGENT_SURFACE_FORBIDDEN: readonly RegExp[] = [
  ...FORBIDDEN_HOME_SEO,
  /puxar/i,
  /VIP/i,
  /robô/i,
  /sem pagar nada/i,
];

export function isAgentSafe(text: string): boolean {
  return !AGENT_SURFACE_FORBIDDEN.some((pattern) => pattern.test(text));
}

/**
 * The one visible FAQ Q&A that may carry an otherwise forbidden term (the 5%
 * commission) on agent surfaces. Approved by Mauricio on 2026-11-14 15:22.
 * Matched by exact question; its text is always the live LANDING_FAQ copy.
 */
export const APPROVED_COMMISSION_FAQ_Q = 'Qual a porcentagem de comissão?';

function findApprovedCommissionFaq(): LandingFaqItem {
  const item = LANDING_FAQ.find((i) => i.q === APPROVED_COMMISSION_FAQ_Q);
  if (!item) throw new Error(`LANDING_FAQ is missing "${APPROVED_COMMISSION_FAQ_Q}"`);
  return item;
}

export const APPROVED_COMMISSION_FAQ: LandingFaqItem = findApprovedCommissionFaq();

/**
 * Removes the exact approved commission question and answer strings, so the
 * forbidden-word scan still applies to everything else. Any edit to that Q&A
 * that is not mirrored in LANDING_FAQ stops matching and gets scanned again.
 */
export function withoutApprovedFaq(text: string): string {
  return text
    .split(APPROVED_COMMISSION_FAQ.a)
    .join('')
    .split(APPROVED_COMMISSION_FAQ.q)
    .join('');
}

/**
 * Visible FAQ items repeated on agent surfaces (FAQPage JSON-LD, llms-full.txt):
 * same array, same order, word for word. Only the approved commission Q&A is
 * exempt from the forbidden list; any other item that hits it is dropped.
 */
export function agentSafeFaq(): LandingFaqItem[] {
  return LANDING_FAQ.filter(
    (item) =>
      isAgentSafe(withoutApprovedFaq(item.q)) && isAgentSafe(withoutApprovedFaq(item.a)),
  );
}

export const HOME_METADATA = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: '/',
    types: {
      'text/plain': LLMS_TXT_PATH,
    },
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

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const APP_ID = `${SITE_URL}/#app`;
const FAQ_ID = `${SITE_URL}/#faq`;

export function buildHomeJsonLd() {
  const faq = agentSafeFaq();
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'Organization',
      '@id': ORG_ID,
      name: SITE_NAME,
      url: SITE_URL,
      description: HOME_DESCRIPTION,
      logo: `${SITE_URL}/icon-512.png`,
      slogan: 'Especialista na 2ª venda.',
    },
    {
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: 'pt-BR',
      description: HOME_DESCRIPTION,
      publisher: { '@id': ORG_ID },
      about: { '@id': APP_ID },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': APP_ID,
      name: SITE_NAME,
      url: SITE_URL,
      description: HOME_DESCRIPTION,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: 'pt-BR',
      publisher: { '@id': ORG_ID },
      audience: {
        '@type': 'BusinessAudience',
        audienceType: 'Lojas físicas de roupa e calçado',
      },
      // No numeric price: the copy states the model, not an amount.
      offers: {
        '@type': 'Offer',
        description: HOME_OFFER_TERMS,
        url: SITE_URL,
        seller: { '@id': ORG_ID },
      },
    },
  ];
  if (faq.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': FAQ_ID,
      url: SITE_URL,
      inLanguage: 'pt-BR',
      isPartOf: { '@id': WEBSITE_ID },
      about: { '@id': APP_ID },
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

export const HOME_JSON_LD = buildHomeJsonLd();

/** Serialized for a <script type="application/ld+json">; escapes "<" against breakout. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function noIndexMetadata(title?: string) {
  return title
    ? { title, robots: { ...NO_INDEX_ROBOTS } }
    : { robots: { ...NO_INDEX_ROBOTS } };
}

export function siteRobots() {
  const disallow = [...ROBOTS_DISALLOW];
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      { userAgent: [...AI_AGENT_USER_AGENTS], allow: '/', disallow: [...disallow] },
    ],
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
    {
      url: `${SITE_URL}${LLMS_TXT_PATH}`,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
    {
      url: `${SITE_URL}${LLMS_FULL_TXT_PATH}`,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
  ];
}
