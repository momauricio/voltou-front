import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { LANDING_FAQ, LANDING_GUARANTEE } from './landing-copy.ts';
import { buildLlmsFullTxt, buildLlmsTxt } from './llms-txt.ts';
import {
  AI_AGENT_USER_AGENTS,
  HOME_JSON_LD,
  HOME_METADATA,
  PUBLIC_PATHS,
  ROBOTS_DISALLOW,
  SITE_URL,
  agentSafeFaq,
  serializeJsonLd,
  siteRobots,
  siteSitemap,
} from './seo.ts';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const faqComponent = read('../components/landing/landing-faq.tsx');
const ctaComponent = read('../components/landing/landing-cta.tsx');
const homePage = read('../app/page.tsx');
const llmsRoute = read('../app/llms.txt/route.ts');
const llmsFullRoute = read('../app/llms-full.txt/route.ts');

/** The words the brief bans from every agent surface. */
const BANNED = [/puxar/i, /VIP/i, /5%/, /robô/i, /disparo/i, /sem pagar nada/i];

const PRIVATE_PREFIXES = [
  '/painel',
  '/equipe',
  '/entrar',
  '/esqueci-senha',
  '/redefinir-senha',
  '/verificar-email',
  '/aguardando',
  '/obrigado',
  '/loja',
  '/p/',
  '/api',
];

function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some((prefix) =>
    prefix.endsWith('/')
      ? pathname.startsWith(prefix)
      : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function urlsIn(text: string): URL[] {
  return [...text.matchAll(/https?:\/\/[^\s)>"]+/g)].map((m) => new URL(m[0]));
}

/** Longest-match robots evaluation (Google semantics) for one group. */
function robotsAllows(group: { allow: string; disallow: string[] }, path: string): boolean {
  const longest = (rules: string[]) =>
    Math.max(-1, ...rules.filter((r) => path.startsWith(r)).map((r) => r.length));
  return longest([group.allow]) >= longest(group.disallow);
}

function groupFor(agent: string) {
  const rules = siteRobots().rules;
  return (
    rules.find((r) => Array.isArray(r.userAgent) && r.userAgent.includes(agent)) ??
    rules.find((r) => r.userAgent === '*')!
  );
}

describe('robots.txt for AI agents', () => {
  it('gives every listed AI agent an explicit allow "/" group', () => {
    for (const agent of [
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
    ]) {
      assert.ok(
        (AI_AGENT_USER_AGENTS as readonly string[]).includes(agent),
        `${agent} must have an explicit group`,
      );
      const group = groupFor(agent);
      assert.notEqual(group.userAgent, '*');
      assert.equal(group.allow, '/');
      assert.ok(robotsAllows(group, '/'), `${agent} must not be blocked from /`);
    }
  });

  it('keeps the same private disallow list on every group', () => {
    const robots = siteRobots();
    assert.equal(robots.rules.length, 2);
    for (const group of robots.rules) {
      assert.deepEqual(group.disallow, [...ROBOTS_DISALLOW]);
      for (const path of ['/painel', '/painel/clientes', '/equipe', '/entrar', '/loja/abc', '/p/tok', '/api/x', '/obrigado', '/aguardando', '/esqueci-senha', '/redefinir-senha', '/verificar-email']) {
        assert.ok(!robotsAllows(group, path), `${path} must be disallowed`);
      }
      for (const path of PUBLIC_PATHS) {
        assert.ok(robotsAllows(group, path), `${path} must stay crawlable`);
      }
    }
    assert.equal(robots.host, SITE_URL);
    assert.equal(robots.sitemap, `${SITE_URL}/sitemap.xml`);
  });
});

describe('sitemap', () => {
  it('lists only public URLs on the canonical host', () => {
    const urls = siteSitemap().map((entry) => new URL(entry.url));
    assert.ok(urls.length > 0);
    for (const url of urls) {
      assert.equal(url.origin, SITE_URL);
      assert.ok(!isPrivatePath(url.pathname), `sitemap leaks ${url.pathname}`);
      assert.ok((PUBLIC_PATHS as readonly string[]).includes(url.pathname));
    }
    assert.deepEqual(
      urls.map((u) => u.pathname),
      ['/', '/llms.txt', '/llms-full.txt'],
    );
  });

  it('advertises llms.txt from the home head', () => {
    assert.equal(HOME_METADATA.alternates.types['text/plain'], '/llms.txt');
  });
});

describe('llms.txt and llms-full.txt', () => {
  for (const [name, build] of [
    ['llms.txt', buildLlmsTxt],
    ['llms-full.txt', buildLlmsFullTxt],
  ] as const) {
    it(`${name} follows llmstxt.org shape`, () => {
      const text = build();
      assert.ok(text.startsWith('# Voltou\n'), 'must start with "# Voltou"');
      assert.match(text, /^> \S.*$/m, 'needs a blockquote summary');
      assert.match(text, /^## /m, 'needs ## sections');
      assert.match(text, /^- \[[^\]]+\]\(https:\/\/www\.voltouapp\.com\/[^)]*\): \S/m);
    });

    it(`${name} has no private paths and no banned words`, () => {
      const text = build();
      for (const url of urlsIn(text)) {
        assert.equal(url.origin, SITE_URL);
        assert.ok(!isPrivatePath(url.pathname), `${name} links ${url.pathname}`);
      }
      for (const prefix of PRIVATE_PREFIXES) {
        assert.ok(!text.includes(prefix), `${name} mentions ${prefix}`);
      }
      for (const pattern of BANNED) {
        assert.doesNotMatch(text, pattern);
      }
    });
  }

  it('llms-full carries the visible guarantee and the agent-safe FAQ', () => {
    const full = buildLlmsFullTxt();
    assert.ok(full.includes(LANDING_GUARANTEE));
    assert.ok(ctaComponent.includes(LANDING_GUARANTEE), 'CTA guarantee drifted from landing-copy');
    assert.ok(homePage.includes(LANDING_GUARANTEE), 'footer guarantee drifted from landing-copy');
    for (const item of agentSafeFaq()) {
      assert.ok(full.includes(`### ${item.q}`));
      assert.ok(full.includes(item.a));
    }
    assert.ok(buildLlmsTxt().includes('/llms-full.txt'));
  });

  it('serves both files as static text/plain route handlers', () => {
    for (const source of [llmsRoute, llmsFullRoute]) {
      assert.match(source, /export const dynamic = 'force-static'/);
      assert.match(source, /text\/plain; charset=utf-8/);
      assert.match(source, /from '@\/lib\/llms-txt'/);
    }
  });
});

describe('home JSON-LD graph', () => {
  const parsed = JSON.parse(serializeJsonLd(HOME_JSON_LD)) as {
    '@context': string;
    '@graph': Record<string, unknown>[];
  };
  const byType = (type: string) => parsed['@graph'].find((n) => n['@type'] === type);

  it('parses and contains the expected linked types', () => {
    assert.equal(parsed['@context'], 'https://schema.org');
    const types = parsed['@graph'].map((n) => n['@type']).sort();
    assert.deepEqual(types, ['FAQPage', 'Organization', 'SoftwareApplication', 'WebSite']);
    const ids = new Set(parsed['@graph'].map((n) => n['@id']));
    const refs = JSON.stringify(parsed).match(/"@id":"[^"]+"/g) ?? [];
    for (const ref of refs) assert.ok(ids.has(JSON.parse(`{${ref}}`)['@id']));
  });

  it('describes the SoftwareApplication from locked copy, no rating, no fake price', () => {
    const app = byType('SoftwareApplication')!;
    assert.equal(app.applicationCategory, 'BusinessApplication');
    assert.equal(app.operatingSystem, 'Web');
    assert.equal(app.inLanguage, 'pt-BR');
    assert.equal(app.url, SITE_URL);
    assert.deepEqual(app.audience, {
      '@type': 'BusinessAudience',
      audienceType: 'Lojas físicas de roupa e calçado',
    });
    const offer = app.offers as Record<string, unknown>;
    assert.equal(offer['@type'], 'Offer');
    assert.match(String(offer.description), /Sem mensalidade/);
    assert.match(String(offer.description), /Comissão só na venda extra/);
    assert.equal('price' in offer, false);
    const json = JSON.stringify(parsed);
    assert.doesNotMatch(json, /aggregateRating|"review"/);
    for (const pattern of BANNED) assert.doesNotMatch(json, pattern);
  });

  it('includes FAQPage exactly when the home renders a FAQ, from the same array', () => {
    const rendersFaq =
      /LANDING_FAQ\.map/.test(faqComponent) && /<LandingFaq\s*\/>/.test(homePage);
    const faqPage = byType('FAQPage');
    assert.equal(Boolean(faqPage), rendersFaq && agentSafeFaq().length > 0);
    const questions = (faqPage!.mainEntity as { name: string; acceptedAnswer: { text: string } }[]);
    const visible = new Map<string, string>(LANDING_FAQ.map((i) => [i.q, i.a]));
    assert.equal(questions.length, agentSafeFaq().length);
    for (const q of questions) {
      assert.equal(visible.get(q.name), q.acceptedAnswer.text, 'FAQPage must mirror visible FAQ');
    }
    // The 5% commission line stays in the visible FAQ only.
    assert.ok(LANDING_FAQ.some((i) => i.a.includes('5%')));
    assert.ok(!questions.some((q) => q.acceptedAnswer.text.includes('5%')));
  });

  it('escapes "<" so the script tag cannot be broken out of', () => {
    const out = serializeJsonLd({ x: '</script><script>alert(1)</script>' });
    assert.ok(!out.includes('<'));
    assert.deepEqual(JSON.parse(out), { x: '</script><script>alert(1)</script>' });
  });
});
