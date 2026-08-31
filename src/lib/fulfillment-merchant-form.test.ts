import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateFulfillmentMerchantForm } from './br-mobile-national.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('validateFulfillmentMerchantForm', () => {
  it('blocks empty pickup address with an inline error', () => {
    const result = validateFulfillmentMerchantForm({
      pickupAddressText: '   ',
      orderNotifyPhone: '(11) 9 8765-4321',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.errors.pickupAddressText, 'Informe o endereço de retirada.');
    assert.equal(result.errors.orderNotifyPhone, undefined);
  });

  it('blocks empty order-alert WhatsApp with an inline error', () => {
    const result = validateFulfillmentMerchantForm({
      pickupAddressText: 'Rua Exemplo, 100 — Centro — São Paulo/SP',
      orderNotifyPhone: '',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(
      result.errors.orderNotifyPhone,
      'Informe o WhatsApp para avisos de pedido.',
    );
  });

  it('blocks both empty fields at once for existing stores', () => {
    const result = validateFulfillmentMerchantForm({
      pickupAddressText: '',
      orderNotifyPhone: '',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.errors.pickupAddressText);
    assert.ok(result.errors.orderNotifyPhone);
  });

  it('rejects an invalid phone with the national mask in the message and no +55', () => {
    const result = validateFulfillmentMerchantForm({
      pickupAddressText: 'Rua A, 1',
      orderNotifyPhone: '11999',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.errors.orderNotifyPhone ?? '', /\(11\) 9 9999-9999/);
    assert.equal((result.errors.orderNotifyPhone ?? '').includes('+55'), false);
  });

  it('accepts filled fields and returns E.164 only for the API payload', () => {
    const result = validateFulfillmentMerchantForm({
      pickupAddressText: '  Rua Exemplo, 100  ',
      orderNotifyPhone: '(11) 9 8765-4321',
    });
    assert.deepEqual(result, {
      ok: true,
      pickupAddressText: 'Rua Exemplo, 100',
      orderNotifyPhoneE164: '+5511987654321',
    });
  });
});

describe('Entrega e pedidos merchant panel contract', () => {
  it('hosts the form on Regras, not on Perfil store WhatsApp', () => {
    const regras = readFileSync(join(root, 'src/app/painel/regras/page.tsx'), 'utf8');
    const perfil = readFileSync(join(root, 'src/app/painel/perfil/page.tsx'), 'utf8');
    assert.match(regras, /FulfillmentSettingsCard/);
    assert.equal(perfil.includes('FulfillmentSettingsCard'), false);
    assert.match(perfil, /WhatsappConnectCard/);
  });

  it('requires pickup and notify phone with national mask and no +55 on the form', () => {
    const card = readFileSync(
      join(root, 'src/components/painel/fulfillment-settings-card.tsx'),
      'utf8',
    );
    assert.match(card, /validateFulfillmentMerchantForm/);
    assert.match(card, /BR_MOBILE_NATIONAL_PLACEHOLDER|formatBrMobileNational/);
    assert.match(card, /pickupAddressText/);
    assert.match(card, /orderNotifyPhoneE164/);
    assert.match(card, /getFulfillmentSettings/);
    assert.match(card, /updateFulfillmentSettings/);
    assert.equal(card.includes('+55'), false);
    assert.equal(card.includes('+5511999999999'), false);
    assert.match(card, /fieldErrors/);
  });
});
