import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  FORBIDDEN_HOME_SEO,
  HOME_CTA_HREF,
  HOME_DESCRIPTION,
  HOME_H1_LINE_1,
  HOME_H1_LINE_2,
  HOME_JSON_LD,
  HOME_METADATA,
  HOME_TITLE,
  HOME_TITLE_OG,
  SITE_NAME,
  SITE_URL,
  noIndexMetadata,
  siteRobots,
  siteSitemap,
} from './seo.ts';

const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
const home = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const hero = readFileSync(
  new URL('../components/landing/landing-hero.tsx', import.meta.url),
  'utf8',
);
const cta = readFileSync(
  new URL('../components/landing/landing-cta.tsx', import.meta.url),
  'utf8',
);
const painelLayout = readFileSync(
  new URL('../app/painel/layout.tsx', import.meta.url),
  'utf8',
);
const equipeLayout = readFileSync(
  new URL('../app/equipe/layout.tsx', import.meta.url),
  'utf8',
);
const robotsRoute = readFileSync(new URL('../app/robots.ts', import.meta.url), 'utf8');
const sitemapRoute = readFileSync(new URL('../app/sitemap.ts', import.meta.url), 'utf8');

function seoSurfaceText(): string {
  return [
    HOME_TITLE,
    HOME_TITLE_OG,
    HOME_DESCRIPTION,
    HOME_METADATA.openGraph?.title,
    HOME_METADATA.openGraph?.description,
    HOME_METADATA.twitter?.title,
    HOME_METADATA.twitter?.description,
    JSON.stringify(HOME_JSON_LD),
  ].join('\n');
}

describe('locked home SEO copy', () => {
  it('uses the Marketing title and keeps description at or under 155 chars', () => {
    assert.equal(
      HOME_TITLE,
      'A 1ª venda você fez no balcão. A 2ª venda a Voltou faz por você. | Voltou',
    );
    assert.equal(
      HOME_TITLE_OG,
      'A 1ª venda você fez no balcão. A 2ª venda a Voltou faz por você.',
    );
    assert.equal(
      HOME_DESCRIPTION,
      'A Voltou fecha a 2ª venda da sua loja física de roupa e calçado. Você cadastra nome e número no balcão. Sem mensalidade. Comissão só na venda extra.',
    );
    assert.ok(HOME_DESCRIPTION.length <= 155);
    assert.equal(SITE_NAME, 'Voltou');
    assert.equal(SITE_URL, 'https://www.voltouapp.com');
  });

  it('keeps mother lines and the locked signup CTA href', () => {
    assert.equal(HOME_H1_LINE_1, 'A 1ª venda você fez no balcão.');
    assert.equal(HOME_H1_LINE_2, 'A 2ª venda a Voltou faz por você.');
    assert.equal(HOME_CTA_HREF, '/entrar?tab=criar');
    assert.match(hero, /A 1ª venda você fez no balcão/);
    assert.match(hero, /A 2ª venda a Voltou faz por você/);
    assert.match(hero, /HOME_CTA_HREF/);
    assert.match(cta, /HOME_CTA_HREF/);
  });

  it('forbids locked-out phrases in title, meta, OG, Twitter and JSON-LD', () => {
    const surface = seoSurfaceText();
    for (const pattern of FORBIDDEN_HOME_SEO) {
      assert.doesNotMatch(surface, pattern, `forbidden SEO phrase matched: ${pattern}`);
    }
    assert.doesNotMatch(layout, /não aconteceria sozinha/);
    assert.doesNotMatch(layout, /Clientes compraram na sua loja e nunca mais voltaram/);
  });
});

describe('home metadata wiring', () => {
  it('exports locked title, description, canonical, OG and Twitter on the home page', () => {
    assert.match(home, /export const metadata/);
    assert.match(home, /HOME_METADATA/);
    assert.deepEqual(HOME_METADATA.title, { absolute: HOME_TITLE });
    assert.equal(HOME_METADATA.description, HOME_DESCRIPTION);
    assert.equal(HOME_METADATA.alternates?.canonical, '/');
    assert.equal(HOME_METADATA.openGraph?.title, HOME_TITLE_OG);
    assert.equal(HOME_METADATA.openGraph?.description, HOME_DESCRIPTION);
    assert.equal(HOME_METADATA.openGraph?.url, SITE_URL);
    assert.equal(HOME_METADATA.openGraph?.locale, 'pt_BR');
    assert.equal(HOME_METADATA.twitter?.card, 'summary_large_image');
    assert.equal(HOME_METADATA.twitter?.title, HOME_TITLE_OG);
    assert.equal(HOME_METADATA.twitter?.description, HOME_DESCRIPTION);
    assert.equal(HOME_METADATA.robots, undefined);
  });

  it('does not pin a global canonical of / on the root layout', () => {
    assert.doesNotMatch(layout, /canonical:\s*["']\/["']/);
    assert.match(layout, /lang="pt-BR"/);
  });
});

describe('GEO JSON-LD', () => {
  it('emits Organization + WebSite + SoftwareApplication from locked copy only', () => {
    assert.equal(HOME_JSON_LD['@context'], 'https://schema.org');
    const graph = HOME_JSON_LD['@graph'];
    assert.ok(Array.isArray(graph));
    const types = graph.map((node: { '@type': string }) => node['@type']);
    assert.deepEqual(types.sort(), [
      'Organization',
      'SoftwareApplication',
      'WebSite',
    ]);
    assert.ok(!types.includes('FAQPage'));
    assert.match(home, /HOME_JSON_LD/);
    assert.match(home, /application\/ld\+json/);

    for (const node of graph) {
      assert.equal(node.name, 'Voltou');
      assert.equal(node.url, SITE_URL);
      assert.equal(node.description, HOME_DESCRIPTION);
    }
  });
});

describe('robots, sitemap and noindex', () => {
  it('lists only the public home in the sitemap', () => {
    const entries = siteSitemap();
    assert.deepEqual(
      entries.map((entry) => entry.url),
      [`${SITE_URL}/`],
    );
    assert.match(sitemapRoute, /siteSitemap/);
  });

  it('disallows private, auth and transactional paths in robots.txt', () => {
    const robots = siteRobots();
    assert.equal(robots.sitemap, `${SITE_URL}/sitemap.xml`);
    const disallow = robots.rules.disallow;
    assert.ok(Array.isArray(disallow));
    for (const path of [
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
    ]) {
      assert.ok(disallow.includes(path), `robots must disallow ${path}`);
    }
    assert.match(robotsRoute, /siteRobots/);
  });

  it('marks private areas noindex/nofollow', () => {
    const hidden = noIndexMetadata();
    assert.deepEqual(hidden.robots, { index: false, follow: false });
    assert.match(painelLayout, /noIndexMetadata/);
    assert.match(equipeLayout, /noIndexMetadata/);
  });
});
