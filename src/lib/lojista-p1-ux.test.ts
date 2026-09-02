import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  formatDatePtBr,
  formatDateTimePtBr,
  merchantCustomerPhone,
  merchantOrderRefs,
  merchantVoltouOrderLabel,
  uniqueCheckouts,
} from './lojista-panel-ux.ts';

const dashboard = readFileSync(
  new URL('../app/painel/page.tsx', import.meta.url),
  'utf8',
);
const clientes = readFileSync(
  new URL('../app/painel/clientes/page.tsx', import.meta.url),
  'utf8',
);
const ficha = readFileSync(
  new URL('../app/painel/clientes/[id]/page.tsx', import.meta.url),
  'utf8',
);
const pedidos = readFileSync(
  new URL('../app/painel/pedidos/page.tsx', import.meta.url),
  'utf8',
);
const regras = readFileSync(
  new URL('../app/painel/regras/page.tsx', import.meta.url),
  'utf8',
);
const adapter = readFileSync(
  new URL('./customers-api-adapter.ts', import.meta.url),
  'utf8',
);
const mockCustomers = readFileSync(
  new URL('./mock-customers.ts', import.meta.url),
  'utf8',
);

describe('formatDatePtBr (merchant-facing dd/mm/aaaa)', () => {
  it('formats ISO calendar dates as dd/mm/aaaa without US mm/dd or leftover ISO', () => {
    assert.equal(formatDatePtBr('2026-09-02'), '02/09/2026');
    assert.equal(formatDatePtBr('2026-01-15'), '15/01/2026');
    assert.notEqual(formatDatePtBr('2026-09-02'), '09/02/2026');
    assert.notEqual(formatDatePtBr('2026-09-02'), '9/2/2026');
    assert.equal(formatDatePtBr('2026-09-02').includes('-'), false);
    assert.match(formatDatePtBr('2026-09-02'), /^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('does not shift a date-only ISO day when interpreted in America/Sao_Paulo', () => {
    // YYYY-MM-DD is a calendar date, not UTC midnight.
    assert.equal(formatDatePtBr('2026-09-02'), '02/09/2026');
    assert.equal(formatDatePtBr('2026-01-01'), '01/01/2026');
  });

  it('formats ISO datetimes as the São Paulo calendar day', () => {
    assert.equal(formatDatePtBr('2026-09-02T18:00:00.000Z'), '02/09/2026');
    assert.equal(formatDatePtBr('2026-09-02T03:00:00.000Z'), '02/09/2026');
    // Still 1 Sep in Brazil (UTC-3)
    assert.equal(formatDatePtBr('2026-09-02T02:00:00.000Z'), '01/09/2026');
  });

  it('passes through an already Brazilian dd/mm/aaaa and empty as em dash', () => {
    assert.equal(formatDatePtBr('02/09/2026'), '02/09/2026');
    assert.equal(formatDatePtBr('31/08/2026'), '31/08/2026');
    assert.equal(formatDatePtBr(null), '—');
    assert.equal(formatDatePtBr(undefined), '—');
    assert.equal(formatDatePtBr(''), '—');
    assert.equal(formatDatePtBr('   '), '—');
  });

  it('formats date+time for timestamps the merchant sees', () => {
    const shown = formatDateTimePtBr('2026-09-02T18:00:00.000Z');
    assert.match(shown, /^02\/09\/2026/);
    assert.equal(shown.includes('T'), false);
    assert.equal(shown.includes('-'), false);
    assert.match(shown, /15:00/);
    assert.equal(formatDateTimePtBr(null), '—');
  });
});

describe('ficha checkout list unique by id', () => {
  it('dedupes by checkout id, keeping the first of each id', () => {
    const a = { id: 'chk-1', couponCode: 'A', createdAt: '2026-09-01' };
    const aDup = { id: 'chk-1', couponCode: 'A', createdAt: '2026-09-01' };
    const b = { id: 'chk-2', couponCode: 'B', createdAt: '2026-09-02' };
    assert.deepEqual(
      uniqueCheckouts([a, aDup, b]).map((c) => c.id),
      ['chk-1', 'chk-2'],
    );
  });

  it('falls back to coupon+createdAt when id is missing', () => {
    const row = { id: '', couponCode: 'VOLTA10', createdAt: '2026-09-02T12:00:00.000Z' };
    const dup = { id: '', couponCode: 'VOLTA10', createdAt: '2026-09-02T12:00:00.000Z' };
    const other = { id: '', couponCode: 'VOLTA10', createdAt: '2026-09-03T12:00:00.000Z' };
    assert.equal(uniqueCheckouts([row, dup, other]).length, 2);
  });
});

describe('Voltou order label vs Cupom vs Mercado Pago', () => {
  it('uses a sequential Voltou number when the API already has one', () => {
    assert.equal(
      merchantVoltouOrderLabel({
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        orderNumber: '42',
        couponCode: 'CLIENTE1',
        mpPaymentId: '1115',
      }),
      '42',
    );
  });

  it('falls back to coupon, then short checkout id — never a fake MP receipt', () => {
    assert.equal(
      merchantVoltouOrderLabel({
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        couponCode: 'CLIENTE1',
        mpPaymentId: '1115',
      }),
      'CLIENTE1',
    );
    assert.equal(
      merchantVoltouOrderLabel({
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        mpPaymentId: '1115',
      }),
      'AAAAAAAA',
    );
    assert.notEqual(
      merchantVoltouOrderLabel({
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        mpPaymentId: '1115',
      }),
      '1115',
    );
    assert.notEqual(
      merchantVoltouOrderLabel({
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        mpPaymentId: '1115',
      }),
      '#1115',
    );
  });

  it('labels Cupom and Mercado Pago separately from the Voltou number', () => {
    const refs = merchantOrderRefs({
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      orderNumber: '7',
      couponCode: 'VOLTA10',
      mpPaymentId: '1115',
    });
    assert.equal(refs.voltou.value, '7');
    assert.equal(refs.voltou.label, 'Voltou');
    assert.equal(refs.coupon?.label, 'Cupom');
    assert.equal(refs.coupon?.value, 'VOLTA10');
    assert.equal(refs.mercadoPago?.label, 'Mercado Pago');
    assert.equal(refs.mercadoPago?.value, '1115');
  });
});

describe('ficha WhatsApp for the lojista', () => {
  it('prefers a display phone the owner API already returned', () => {
    const full = merchantCustomerPhone({
      phoneDisplay: '(11) 91234-5678',
      phoneMasked: '(11) *****-5678',
    });
    assert.equal(full.display, '(11) 91234-5678');
    assert.equal(full.masked, false);

    const e164 = merchantCustomerPhone({
      phoneE164: '+5511987654321',
      phoneMasked: '(11) *****-4321',
    });
    assert.equal(e164.masked, false);
    assert.match(e164.display, /98765|8765/);
    assert.equal(e164.display.includes('*'), false);
  });

  it('shows the masked number clearly and never uses phoneEnc', () => {
    const masked = merchantCustomerPhone({
      phoneMasked: '(11) *****-0001',
      phoneEnc: 'should-not-appear',
    });
    assert.equal(masked.display, '(11) *****-0001');
    assert.equal(masked.masked, true);
    assert.equal(masked.display.includes('should-not-appear'), false);
    assert.equal(merchantCustomerPhone({}).display, '—');
  });

  it('adapter maps owner display phone and unique checkouts through the helpers', () => {
    assert.match(adapter, /merchantCustomerPhone/);
    assert.match(adapter, /phoneIsMasked/);
    assert.match(adapter, /uniqueCheckouts/);
  });
});

describe('P1 panel wiring (source)', () => {
  it('uses the pt-BR helper on dashboard, clientes, ficha, pedidos and regras', () => {
    assert.match(mockCustomers, /formatDatePtBr/);
    assert.match(dashboard, /formatDatePtBr/);
    assert.match(clientes, /formatDatePtBr|formatDate\(/);
    assert.match(ficha, /formatDatePtBr|formatDate\(/);
    assert.match(pedidos, /formatDateTimePtBr|formatDatePtBr/);
    assert.match(regras, /formatDatePtBr|formatDateTimePtBr/);
    assert.equal(dashboard.includes("toLocaleDateString('pt-BR')"), false);
    assert.equal(pedidos.includes('toLocaleDateString'), false);
    assert.equal(/toLocaleString\('pt-BR',\s*\{[\s\S]*?day:/.test(pedidos), false);
  });

  it('shows a Voltou order label on pedidos and ficha, not a fake MP #1115', () => {
    assert.match(pedidos, /merchantVoltouOrderLabel|merchantOrderRefs/);
    assert.match(ficha, /merchantVoltouOrderLabel|merchantOrderRefs/);
    assert.equal(pedidos.includes('#1115'), false);
    assert.equal(ficha.includes('#1115'), false);
  });

  it('dedupes ficha checkouts and shows WhatsApp without a revelar control', () => {
    assert.match(adapter, /uniqueCheckouts/);
    assert.match(ficha, /WhatsApp|merchantCustomerPhone|phoneIsMasked/);
    assert.equal(/revelar/i.test(ficha), false);
    assert.equal(ficha.includes('phoneEnc'), false);
    assert.equal(clientes.includes('phoneEnc'), false);
  });
});

describe('P0 honesty still holds (source)', () => {
  it('does not bring back demo KPIs, campaign queue, or a second Regras save', () => {
    assert.equal(dashboard.includes('23740'), false);
    assert.equal(dashboard.includes('getProductPerformance'), false);
    assert.equal(dashboard.includes('listCampaigns'), false);
    assert.equal(dashboard.includes('Fila de campanhas'), false);
    assert.equal(clientes.includes('dados de demonstração'), false);
    assert.equal(regras.includes('Salvar regras'), false);
    assert.equal(
      readFileSync(
        new URL('../components/painel/fulfillment-settings-card.tsx', import.meta.url),
        'utf8',
      ).includes('Salvar entrega e pedidos'),
      false,
    );
  });
});
