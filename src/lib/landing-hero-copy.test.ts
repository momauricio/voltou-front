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
    assert.match(hero, /Criar conta e cadastrar o 1º cliente/);
    assert.match(hero, /href="\/entrar"/);
    assert.doesNotMatch(hero, /href="\/entrar\?tab=criar"/);
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
    assert.match(homeSource, /Cupom no nome/);
    assert.match(
      homeSource,
      /O cliente da sua loja recebe cupom com o nome e uma condição especial\./,
    );
    assert.match(homeSource, /Já está na arara/);
    assert.match(
      homeSource,
      /A peça já está no estoque\. Paga\. Parada na arara\./,
    );
  });
});

describe('homepage forbidden copy', () => {
  it('drops puxar, VIP, 5%, campanha and robô from the home', () => {
    assert.doesNotMatch(homeSource, /puxa|puxar/i);
    assert.doesNotMatch(homeSource, /A segunda ninguém puxa/);
    assert.doesNotMatch(homeSource, /\bVIP\b/);
    assert.doesNotMatch(homeSource, /(?<![0-9])5\s*%/);
    assert.doesNotMatch(homeSource, /campanha/i);
    assert.doesNotMatch(homeSource, /robô|\brobo\b/i);
    assert.doesNotMatch(homeSource, /Instagram|TikTok/i);
  });

  it('paints the landing wordmark with #0e9254', () => {
    assert.match(nav, /#0e9254/i);
  });
});
