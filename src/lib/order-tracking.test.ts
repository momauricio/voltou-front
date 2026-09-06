import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  TRACKING_CODE_MAX,
  buildOrderTrackingPatchBody,
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
    assert.equal(orderAllowsTrackingCode('DELIVERY'), true);
    assert.equal(orderAllowsTrackingCode('home'), true);
    assert.equal(orderAllowsTrackingCode('entrega'), true);
    assert.equal(orderAllowsTrackingCode('pickup'), false);
    assert.equal(orderAllowsTrackingCode('retirada'), false);
    assert.equal(orderAllowsTrackingCode('PICKUP'), false);
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
    assert.equal(TRACKING_CODE_MAX, 120);
    assert.equal(
      normalizeTrackingCode('x'.repeat(TRACKING_CODE_MAX))?.length,
      TRACKING_CODE_MAX,
    );
  });
});

describe('buildOrderTrackingPatchBody', () => {
  it('sends tenant/store/trackingCode and omits status so fulfillment is unchanged', () => {
    const set = buildOrderTrackingPatchBody({
      tenantId: '11111111-1111-1111-1111-111111111111',
      storeId: '22222222-2222-2222-2222-222222222222',
      trackingCode: 'AB123456789BR',
    });
    assert.deepEqual(set, {
      tenantId: '11111111-1111-1111-1111-111111111111',
      storeId: '22222222-2222-2222-2222-222222222222',
      trackingCode: 'AB123456789BR',
    });
    assert.equal(Object.hasOwn(set, 'status'), false);

    const cleared = buildOrderTrackingPatchBody({
      tenantId: '11111111-1111-1111-1111-111111111111',
      storeId: '22222222-2222-2222-2222-222222222222',
      trackingCode: null,
    });
    assert.equal(cleared.trackingCode, null);
    assert.equal(Object.hasOwn(cleared, 'status'), false);
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
    assert.match(pedidos, /tracking-\$\{variant\}-/);
    assert.match(pedidos, /variant="card"/);
    assert.match(pedidos, /variant="row"/);
    assert.match(pedidos, /maxLength=\{TRACKING_CODE_MAX\}|maxLength=\{120\}/);
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
    assert.match(api, /buildOrderTrackingPatchBody|buildOrderFulfillmentPatchBody/);
    assert.match(api, /listMerchantOrders/);
    assert.match(
      api,
      /export async function updateOrder(Fulfillment|Tracking)/,
    );
    assert.equal(api.includes('application_fee'), false);
  });
});
