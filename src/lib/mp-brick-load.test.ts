import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MP_BRICK_LOAD_ERROR,
  isMercadoPagoResource,
} from './mp-brick-load.ts';

describe('mp brick load', () => {
  it('treats Mercado Pago and mlstatic URLs as brick resources', () => {
    assert.equal(
      isMercadoPagoResource('https://sdk.mercadopago.com/js/v2'),
      true,
    );
    assert.equal(
      isMercadoPagoResource('https://http2.mlstatic.com/storage/foo.js'),
      true,
    );
    assert.equal(isMercadoPagoResource('https://voltouapp.com/app.js'), false);
  });

  it('exposes a visible Portuguese error when the Brick never loads', () => {
    assert.match(MP_BRICK_LOAD_ERROR, /Pix/i);
    assert.match(MP_BRICK_LOAD_ERROR, /cartão/i);
  });
});
