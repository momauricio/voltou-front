import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BR_MOBILE_NATIONAL_PLACEHOLDER,
  e164ToBrMobileNational,
  formatBrMobileNational,
  nationalBrMobileToE164,
} from './br-mobile-national.ts';

describe('Brazilian national mobile mask', () => {
  it('uses (xx) 9 9999-9999 as placeholder with no +55', () => {
    assert.equal(BR_MOBILE_NATIONAL_PLACEHOLDER, '(11) 9 9999-9999');
    assert.equal(BR_MOBILE_NATIONAL_PLACEHOLDER.includes('+55'), false);
    assert.equal(BR_MOBILE_NATIONAL_PLACEHOLDER.includes('+'), false);
  });

  it('masks digits progressively as (xx) 9 9999-9999', () => {
    assert.equal(formatBrMobileNational(''), '');
    assert.equal(formatBrMobileNational('1'), '(1');
    assert.equal(formatBrMobileNational('11'), '(11)');
    assert.equal(formatBrMobileNational('119'), '(11) 9');
    assert.equal(formatBrMobileNational('1199'), '(11) 9 9');
    assert.equal(formatBrMobileNational('1199999'), '(11) 9 9999');
    assert.equal(formatBrMobileNational('11999999'), '(11) 9 9999-9');
    assert.equal(formatBrMobileNational('11999999999'), '(11) 9 9999-9999');
  });

  it('never shows +55 when pasting E.164 or country-code digits', () => {
    assert.equal(formatBrMobileNational('+5511999999999'), '(11) 9 9999-9999');
    assert.equal(formatBrMobileNational('5511999999999'), '(11) 9 9999-9999');
    assert.equal(formatBrMobileNational('+55 (11) 9 8765-4321'), '(11) 9 8765-4321');
    assert.equal(formatBrMobileNational('(11) 9 9999-9999').includes('+'), false);
  });

  it('keeps DDD 55 (RS) when the national number is already 11 digits', () => {
    assert.equal(formatBrMobileNational('55987654321'), '(55) 9 8765-4321');
    assert.equal(formatBrMobileNational('+5555987654321'), '(55) 9 8765-4321');
  });

  it('converts a valid national mobile to E.164 for storage', () => {
    assert.equal(nationalBrMobileToE164('(11) 9 9999-9999'), '+5511999999999');
    assert.equal(nationalBrMobileToE164('11987654321'), '+5511987654321');
    assert.equal(nationalBrMobileToE164('+5511987654321'), '+5511987654321');
    assert.equal(nationalBrMobileToE164('(55) 9 8765-4321'), '+5555987654321');
  });

  it('rejects empty, incomplete, landline, and non-mobile numbers', () => {
    assert.equal(nationalBrMobileToE164(''), null);
    assert.equal(nationalBrMobileToE164('   '), null);
    assert.equal(nationalBrMobileToE164('(11) 9 9999'), null);
    assert.equal(nationalBrMobileToE164('(11) 3333-4444'), null);
    assert.equal(nationalBrMobileToE164('1133334444'), null);
    assert.equal(nationalBrMobileToE164('(11) 8 9999-9999'), null);
  });

  it('displays stored E.164 as national mask only', () => {
    assert.equal(e164ToBrMobileNational('+5511999999999'), '(11) 9 9999-9999');
    assert.equal(e164ToBrMobileNational(null), '');
    assert.equal(e164ToBrMobileNational(''), '');
    assert.equal(e164ToBrMobileNational('+5511999999999').includes('+55'), false);
  });
});
