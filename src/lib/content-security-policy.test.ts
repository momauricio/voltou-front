import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contentSecurityPolicy } from './content-security-policy.ts';

function directive(policy: string, name: string): string | undefined {
  return policy
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `));
}

describe('contentSecurityPolicy', () => {
  it('allows Mercado Pago SDK and mlstatic scripts blocked on production', () => {
    const scriptSrc = directive(contentSecurityPolicy(), 'script-src');
    assert.ok(scriptSrc, 'script-src must be present');
    assert.match(scriptSrc, /'self'/);
    assert.match(scriptSrc, /https:\/\/sdk\.mercadopago\.com/);
    assert.match(scriptSrc, /https:\/\/\*\.mlstatic\.com/);
  });

  it('sets frame-src so Brick iframes are not blocked by default-src', () => {
    const frameSrc = directive(contentSecurityPolicy(), 'frame-src');
    assert.ok(frameSrc, 'frame-src must be present');
    assert.match(frameSrc, /https:\/\/\*\.mercadopago\.com/);
    assert.match(frameSrc, /https:\/\/\*\.mercadolibre\.com/);
    assert.match(frameSrc, /https:\/\/\*\.mlstatic\.com/);
  });

  it('keeps connect-src https: and allows MP fonts via font-src https:', () => {
    const policy = contentSecurityPolicy();
    const connectSrc = directive(policy, 'connect-src');
    const fontSrc = directive(policy, 'font-src');
    assert.ok(connectSrc?.includes("https:"));
    assert.ok(fontSrc?.includes("https:"));
  });

  it('allows Google Identity Services scripts and frames for Continuar com Google', () => {
    const policy = contentSecurityPolicy();
    const scriptSrc = directive(policy, 'script-src');
    const frameSrc = directive(policy, 'frame-src');
    assert.ok(scriptSrc, 'script-src must be present');
    assert.ok(frameSrc, 'frame-src must be present');
    assert.match(scriptSrc, /https:\/\/accounts\.google\.com/);
    assert.match(frameSrc, /https:\/\/accounts\.google\.com/);
  });
});
