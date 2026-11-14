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
  APPROVED_COMMISSION_FAQ,
  SITE_URL,
  agentSafeFaq,
  withoutApprovedFaq,
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

const COMMISSION_Q = 'Qual a porcentagem de comissão?';
const COMMISSION_A =
  '5% sobre o valor dos produtos da venda recuperada. Frete não entra na base da comissão. Se o cliente não pagar, você não paga comissão.';

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

    it(`${name} has no private paths and no banned words outside the approved FAQ Q&A`, () => {
      const text = build();
      for (const url of urlsIn(text)) {
        assert.equal(url.origin, SITE_URL);
        assert.ok(!isPrivatePath(url.pathname), `${name} links ${url.pathname}`);
      }
      for (const prefix of PRIVATE_PREFIXES) {
        assert.ok(!text.includes(prefix), `${name} mentions ${prefix}`);
      }
      // Strip exactly one "### Q\n\nA" block (the approved commission item).
      const approvedBlock = `### ${COMMISSION_Q}\n\n${COMMISSION_A}\n`;
      const rest = text.replace(approvedBlock, '');
      for (const pattern of BANNED) {
        assert.doesNotMatch(rest, pattern, `${name} leaks ${pattern} outside the approved FAQ`);
      }
    });
  }

  it('llms.txt has no FAQ text and no 5%', () => {
    const short = buildLlmsTxt();
    assert.doesNotMatch(short, /5%/);
    for (const item of LANDING_FAQ) {
      assert.ok(!short.includes(item.q), `llms.txt repeats FAQ question "${item.q}"`);
      assert.ok(!short.includes(item.a), `llms.txt repeats FAQ answer "${item.q}"`);
    }
  });

  it('llms-full carries the approved 5% commission Q&A once, word for word', () => {
    const full = buildLlmsFullTxt();
    const block = `### ${COMMISSION_Q}\n\n${COMMISSION_A}\n`;
    assert.ok(full.includes(block));
    assert.equal(full.split('5%').length - 1, 1, '5% must appear only in the approved answer');
    assert.equal(full.split(COMMISSION_A).length - 1, 1);
  });

  it('llms-full FAQ section lists all visible FAQ items in the same order', () => {
    const full = buildLlmsFullTxt();
    const section = full.slice(full.indexOf('## Perguntas frequentes\n'));
    const expected = LANDING_FAQ.map((i) => `### ${i.q}\n\n${i.a}\n`).join('\n');
    assert.ok(section.startsWith(`## Perguntas frequentes\n\n${expected}`));
  });

  it('the 5% allowance is narrow: only the exact approved Q&A is exempt', () => {
    assert.equal(APPROVED_COMMISSION_FAQ.q, COMMISSION_Q);
    assert.equal(APPROVED_COMMISSION_FAQ.a, COMMISSION_A);
    assert.equal(withoutApprovedFaq(`${COMMISSION_Q} ${COMMISSION_A}`).trim(), '');
    // Anything else with 5% is still caught.
    assert.match(withoutApprovedFaq('Comissão de 5% na venda.'), /5%/);
    assert.match(withoutApprovedFaq(`${COMMISSION_A} Agora com 5% off.`), /5%/);
    assert.match(withoutApprovedFaq(COMMISSION_A.replace('Frete', 'O frete')), /5%/);
  });

  it('llms-full carries the visible guarantee and the full visible FAQ', () => {
    const full = buildLlmsFullTxt();
    assert.ok(full.includes(LANDING_GUARANTEE));
    assert.ok(ctaComponent.includes(LANDING_GUARANTEE), 'CTA guarantee drifted from landing-copy');
    assert.ok(homePage.includes(LANDING_GUARANTEE), 'footer guarantee drifted from landing-copy');
    assert.equal(agentSafeFaq().length, 6);
    for (const item of LANDING_FAQ) {
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
  });

  it('has no banned words in non-FAQ nodes, nor in FAQPage outside the approved Q&A', () => {
    const nonFaq = JSON.stringify(parsed['@graph'].filter((n) => n['@type'] !== 'FAQPage'));
    for (const pattern of BANNED) assert.doesNotMatch(nonFaq, pattern);
    const faqPage = byType('FAQPage')!;
    const items = faqPage.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
    const others = items.filter((q) => q.name !== COMMISSION_Q);
    assert.equal(others.length, 5);
    const rest = JSON.stringify({ ...faqPage, mainEntity: others });
    for (const pattern of BANNED) assert.doesNotMatch(rest, pattern);
  });

  it('includes FAQPage exactly when the home renders a FAQ, from the same array', () => {
    const rendersFaq =
      /LANDING_FAQ\.map/.test(faqComponent) && /<LandingFaq\s*\/>/.test(homePage);
    const faqPage = byType('FAQPage');
    assert.equal(Boolean(faqPage), rendersFaq);
    const questions = (faqPage!.mainEntity as {
      '@type': string;
      name: string;
      acceptedAnswer: { '@type': string; text: string };
    }[]);
    assert.equal(LANDING_FAQ.length, 6);
    assert.equal(questions.length, LANDING_FAQ.length, 'FAQPage must have every visible item');
    LANDING_FAQ.forEach((item, i) => {
      assert.equal(questions[i]['@type'], 'Question');
      assert.equal(questions[i].acceptedAnswer['@type'], 'Answer');
      assert.equal(questions[i].name, item.q, `FAQPage item ${i} question drifted`);
      assert.equal(questions[i].acceptedAnswer.text, item.a, `FAQPage item ${i} answer drifted`);
    });
    // The 5% commission line is visible and, approved 2026-11-14, also in FAQPage.
    assert.ok(LANDING_FAQ.some((i) => i.a.includes('5%')));
    const commission = questions.find((q) => q.name === COMMISSION_Q);
    assert.equal(commission?.acceptedAnswer.text, COMMISSION_A);
    assert.equal(questions.filter((q) => q.acceptedAnswer.text.includes('5%')).length, 1);
  });

  it('escapes "<" so the script tag cannot be broken out of', () => {
    const out = serializeJsonLd({ x: '</script><script>alert(1)</script>' });
    assert.ok(!out.includes('<'));
    assert.deepEqual(JSON.parse(out), { x: '</script><script>alert(1)</script>' });
  });
});
