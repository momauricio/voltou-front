import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const landingDir = join(here, '../components/landing');
const page = readFileSync(join(here, '../app/page.tsx'), 'utf8');
const hero = readFileSync(join(landingDir, 'landing-hero.tsx'), 'utf8');
const nav = readFileSync(join(landingDir, 'landing-nav.tsx'), 'utf8');
const faq = readFileSync(join(landingDir, 'landing-faq.tsx'), 'utf8');
const cta = readFileSync(join(landingDir, 'landing-cta.tsx'), 'utf8');
const brand = readFileSync(join(landingDir, 'landing-brand.tsx'), 'utf8');

function walkTsx(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walkTsx(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

const homeSource = [
  join(here, '../app/page.tsx'),
  ...walkTsx(landingDir),
]
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n');

function extractH1(source: string): string {
  const match = source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/);
  assert.ok(match, 'landing hero must render an H1');
  return match[1];
}

describe('homepage hero copy', () => {
  it('locks the H1 to two beats without puxar', () => {
    const h1 = extractH1(hero);
    assert.match(h1, /A 1ª venda você fez no balcão/);
    assert.match(h1, /A 2ª venda a Voltou faz por você/);
    assert.doesNotMatch(h1, /puxa|puxar/i);
    assert.doesNotMatch(h1, /A segunda ninguém puxa/);
  });

  it('locks the hero sub and extra-sale commission line', () => {
    assert.match(
      hero,
      /A Voltou fecha a venda e te dá lucro\. O cliente da sua loja, atendimento requintado\./,
    );
    assert.match(
      hero,
      /Sem mensalidade\. Sem cartão\. Comissão só na venda extra\./,
    );
  });

  it('locks the hero CTA to /entrar', () => {
    assert.match(hero, /HOME_CTA_LABEL/);
    assert.match(hero, /HOME_CTA_HREF/);
    assert.match(hero, /from '@\/lib\/seo-copy'/);
  });
});

describe('homepage marketing angles', () => {
  it('places the three locked angles on the public home', () => {
    assert.match(page, /LandingAngles/);
    assert.match(homeSource, /Os dois/);
    assert.match(
      homeSource,
      /Quem levou a peça\. Quem experimentou, gostou, deixou o número\./,
    );
    assert.match(homeSource, /cupom personalizado para o cliente/);
    assert.doesNotMatch(homeSource, /cupom no nome/i);
    assert.doesNotMatch(homeSource, /cupom com o nome/i);
    assert.match(
      homeSource,
      /Tem cupom personalizado para o cliente e uma condição especial\./,
    );
    assert.match(homeSource, /Já está na arara/);
    assert.match(
      homeSource,
      /A peça já está no estoque\. Paga\. Parada na arara\./,
    );
  });
});

describe('homepage forbidden copy', () => {
  it('drops puxar from the entire home, not just the H1', () => {
    assert.doesNotMatch(homeSource, /puxa|puxar/i);
    assert.doesNotMatch(homeSource, /A segunda ninguém puxa/);
  });

  it('locks the public header to the Dieter brand, not an h1', () => {
    assert.match(brand, /aria-label="Voltou, página inicial"/);
    assert.match(brand, /aria-hidden="true"/);
    assert.match(brand, /viewBox="306 173 465 770"/);
    assert.match(brand, /fill="#0e9254"/);
    assert.match(brand, /fill="#f6fbf6"/);
    assert.match(brand, /text-\[#111e15\]/);
    assert.match(brand, /tracking-\[-0\.01em\]/);
    assert.match(brand, /Especialista na 2ª venda\./);
    const symbol = brand.slice(brand.indexOf('<svg'), brand.indexOf('</svg>'));
    assert.doesNotMatch(symbol, /role=|aria-label=/);
    assert.doesNotMatch(brand, /<h1\b/);
    assert.match(nav, /bg-\[#f6fbf6\]/);
    assert.match(nav, /h-14/);
    assert.match(nav, /md:h-16/);
    assert.doesNotMatch(nav, /logo_completo/);
    assert.doesNotMatch(`${nav}\n${brand}`, /<h1\b/);
  });

  it('keeps one green CTA and drops store-WhatsApp outreach promises', () => {
    assert.match(nav, /bg-\[#0e9254\]/);
    assert.doesNotMatch(homeSource, /WhatsApp da sua loja/i);
    assert.doesNotMatch(homeSource, /WhatsApp da loja/i);
    assert.doesNotMatch(homeSource, /número da sua loja/i);
    assert.doesNotMatch(homeSource, /número que o cliente já conhece/i);
    assert.doesNotMatch(homeSource, /sem pagar nada/i);
    assert.match(
      cta,
      /Em 30 dias, pelo menos 2 vendas\. Se não der, você para de usar quando quiser, sem multa\./,
    );
    assert.match(
      page,
      /Em 30 dias, pelo menos 2 vendas\. Se não der, você para de usar quando quiser, sem multa\./,
    );
  });

  it('keeps the FAQ 5% commission line in the FAQ only', () => {
    assert.match(faq, /5% sobre o valor dos produtos da venda recuperada/);
  });
});
