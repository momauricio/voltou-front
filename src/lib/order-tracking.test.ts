import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  normalizeTrackingCode,
  orderAllowsTrackingCode,
} from './order-tracking.ts';

const pedidos = readFileSync(
  new URL('../app/painel/pedidos/page.tsx', import.meta.url),
  'utf8',
);
const api = readFileSync(new URL('./api.ts', import.meta.url), 'utf8');

describe('orderAllowsTrackingCode', () => {
  it('allows the field only for home delivery, not Retirada/pickup', () => {
    assert.equal(orderAllowsTrackingCode('delivery'), true);
    assert.equal(orderAllowsTrackingCode('pickup'), false);
    assert.equal(orderAllowsTrackingCode('retirada'), false);
    assert.equal(orderAllowsTrackingCode(null), false);
    assert.equal(orderAllowsTrackingCode(undefined), false);
    assert.equal(orderAllowsTrackingCode(''), false);
  });
});

describe('normalizeTrackingCode', () => {
  it('trims free text and treats blank as null without inventing a URL', () => {
    assert.equal(normalizeTrackingCode('  AB123456789BR  '), 'AB123456789BR');
    assert.equal(normalizeTrackingCode('   '), null);
    assert.equal(normalizeTrackingCode(''), null);
    assert.equal(normalizeTrackingCode(null), null);
    assert.equal(normalizeTrackingCode(undefined), null);
    assert.equal(normalizeTrackingCode('codigo-lojista'), 'codigo-lojista');
    assert.notEqual(
      normalizeTrackingCode('codigo-lojista')?.startsWith('http'),
      true,
    );
  });
});

describe('Pedidos tracking field (source)', () => {
  it('exposes a create/edit Código de rastreio field for delivery on list and detail', () => {
    assert.match(pedidos, /Código de rastreio/);
    assert.match(pedidos, /orderAllowsTrackingCode/);
    assert.match(pedidos, /<input/);
    assert.match(pedidos, /PedidoTrackingField|htmlFor=.*tracking/);
    assert.match(pedidos, /onSaveTracking|updateOrderTracking|handleSaveTracking/);
    assert.equal(pedidos.includes('window.prompt'), false);
  });

  it('hides or disables the field for Retirada and does not invent carrier URLs', () => {
    assert.match(pedidos, /orderAllowsTrackingCode\(order\.fulfillmentMethod\)/);
    assert.equal(/correios/i.test(pedidos), false);
    assert.equal(/melhor envio/i.test(pedidos), false);
    assert.equal(/rastreamento\.(com|br)/i.test(pedidos), false);
    assert.equal(pedidos.includes('trackingUrl'), false);
  });

  it('persists trackingCode on the merchant order via owner-scoped PATCH/GET', () => {
    assert.match(api, /trackingCode\?: string \| null/);
    assert.match(
      api,
      /\/checkouts\/\$\{encodeURIComponent\([^)]+\)\}\/fulfillment/,
    );
    assert.match(api, /trackingCode: payload\.trackingCode/);
    assert.match(api, /listMerchantOrders/);
    assert.match(
      api,
      /export async function updateOrder(Fulfillment|Tracking)/,
    );
    assert.equal(api.includes('application_fee'), false);
  });
});
