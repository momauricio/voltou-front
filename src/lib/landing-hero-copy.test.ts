import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const hero = readFileSync(
  new URL('../components/landing/landing-hero.tsx', import.meta.url),
  'utf8',
);

function extractH1(source: string): string {
  const match = source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/);
  assert.ok(match, 'landing hero must render an H1');
  return match[1];
}

describe('homepage hero copy', () => {
  it('locks the H1 to the 2ª venda line without puxar', () => {
    const h1 = extractH1(hero);
    assert.match(h1, /A 2ª venda a Voltou faz por você/);
    assert.doesNotMatch(h1, /puxa|puxar/i);
  });
});
