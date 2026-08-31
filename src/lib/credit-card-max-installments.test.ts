import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { creditCardMaxInstallments } from './credit-card-max-installments.ts';

const brickPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../components/checkout/transparent-checkout-brick.tsx',
);

describe('creditCardMaxInstallments', () => {
  it('keeps R$ 5 à vista so the Brick cannot advertise a false 2x', () => {
    assert.equal(creditCardMaxInstallments(500), 1);
  });

  it('stays at 1x while each parcela would be below R$ 5', () => {
    assert.equal(creditCardMaxInstallments(499), 1);
    assert.equal(creditCardMaxInstallments(999), 1);
  });

  it('offers 2x once the amount covers two R$ 5 parcelas', () => {
    assert.equal(creditCardMaxInstallments(1000), 2);
    assert.equal(creditCardMaxInstallments(1500), 3);
  });

  it('caps at 12x for amounts that support it', () => {
    assert.equal(creditCardMaxInstallments(5999), 11);
    assert.equal(creditCardMaxInstallments(6000), 12);
    assert.equal(creditCardMaxInstallments(50_000), 12);
  });

  it('never returns 0 or more than 12', () => {
    assert.equal(creditCardMaxInstallments(0), 1);
    assert.equal(creditCardMaxInstallments(-100), 1);
    assert.equal(creditCardMaxInstallments(Number.NaN), 1);
    assert.equal(creditCardMaxInstallments(Number.POSITIVE_INFINITY), 1);
  });
});

describe('Payment Brick installment config', () => {
  it('passes a computed maxInstallments instead of a hardcoded 12', () => {
    const brick = readFileSync(brickPath, 'utf8');
    assert.ok(
      brick.includes('creditCardMaxInstallments(amountCents)'),
      'Brick must compute maxInstallments from the charged amount',
    );
    assert.match(
      brick,
      /creditCard:\s*'all',\s*bankTransfer:\s*'all',\s*maxInstallments,/,
      'Brick must pass the computed max into Payment customization',
    );
    assert.ok(
      !/maxInstallments:\s*12/.test(brick),
      'Brick must not hardcode maxInstallments: 12 (false parcelamento badge)',
    );
  });
});
