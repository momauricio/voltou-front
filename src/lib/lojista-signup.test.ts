import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { isValidCnpj } from './cnpj.ts';
import {
  CNPJ_INACTIVE_MESSAGE,
  assertCnpjActiveForSignup,
  buildGoogleAuthPayload,
  buildLoginPayload,
  buildRegisterPayload,
  formatLojistaLoginIdentifierInput,
  isCnpjStatusActive,
  parseLojistaLoginIdentifier,
  publicGoogleClientId,
} from './lojista-signup.ts';
import { formatBrMobileNational } from './br-mobile-national.ts';

const authForm = readFileSync(
  new URL('../components/auth/auth-form.tsx', import.meta.url),
  'utf8',
);
const googleBtn = readFileSync(
  new URL('../components/auth/google-continue-button.tsx', import.meta.url),
  'utf8',
);
const staffForm = readFileSync(
  new URL('../components/auth/staff-login-form.tsx', import.meta.url),
  'utf8',
);
const staffPage = readFileSync(
  new URL('../app/equipe/entrar/page.tsx', import.meta.url),
  'utf8',
);
const api = readFileSync(new URL('./api.ts', import.meta.url), 'utf8');
const policy = readFileSync(
  new URL('./lojista-panel-policy.ts', import.meta.url),
  'utf8',
);

describe('lojista signup WhatsApp mask', () => {
  it('masks the cadastro WhatsApp as (xx) 9 9999-9999 and never shows +55', () => {
    assert.match(authForm, /formatBrMobileNational/);
    assert.match(authForm, /BR_MOBILE_NATIONAL_PLACEHOLDER/);
    assert.match(authForm, /id="signupWhatsapp"/);
    assert.equal(authForm.includes('+55'), false);
    assert.equal(googleBtn.includes('+55'), false);
    assert.equal(
      formatBrMobileNational('11999999999'),
      '(11) 9 9999-9999',
    );
    assert.equal(formatBrMobileNational('+5511999999999').includes('+55'), false);
  });

  it('puts WhatsApp first on Criar conta, then owner, store, email, password, CNPJ', () => {
    const whatsapp = authForm.indexOf('id="signupWhatsapp"');
    const owner = authForm.indexOf('id="ownerName"');
    const store = authForm.indexOf('id="storeName"');
    const email = authForm.indexOf('id="email"');
    const password = authForm.indexOf('id="password"');
    const cnpj = authForm.indexOf('id="cnpj"');
    assert.ok(whatsapp >= 0, 'Criar conta must have WhatsApp field');
    assert.ok(owner > whatsapp, 'owner name after WhatsApp');
    assert.ok(store > owner, 'store name after owner');
    assert.ok(email > store, 'email after store');
    assert.ok(password > email, 'password after email');
    assert.ok(cnpj > password, 'CNPJ last');
  });

  it('treats this phone as cadastro identity, not store WhatsApp on Perfil', () => {
    assert.match(authForm, /cadastro|pessoal/i);
    assert.doesNotMatch(authForm, /WhatsappConnectCard/);
    assert.doesNotMatch(authForm, /listWhatsappConnections/);
    assert.doesNotMatch(authForm, /orderNotifyPhone/);
  });
});

describe('CNPJ ativo gate', () => {
  it('uses the Receita copy and only accepts an active status', () => {
    assert.equal(CNPJ_INACTIVE_MESSAGE, 'CNPJ precisa estar ativo na Receita.');
    assert.equal(isCnpjStatusActive({ active: true }), true);
    assert.equal(isCnpjStatusActive({ active: false }), false);
    assert.equal(
      isCnpjStatusActive({ descricao_situacao_cadastral: 'ATIVA' }),
      true,
    );
    assert.equal(
      isCnpjStatusActive({ descricao_situacao_cadastral: 'SUSPENSA' }),
      false,
    );
    assert.equal(isCnpjStatusActive({ situacao_cadastral: 2 }), true);
    assert.equal(isCnpjStatusActive({ situacao_cadastral: '08' }), false);
    assert.equal(isCnpjStatusActive({}), false);
  });

  it('blocks submit after valid check-digits when the CNPJ is not active', async () => {
    const validCnpj = '04252011000110';
    assert.equal(isValidCnpj(validCnpj), true);

    const inactive = await assertCnpjActiveForSignup(validCnpj, async () => ({
      active: false,
    }));
    assert.deepEqual(inactive, { ok: false, error: CNPJ_INACTIVE_MESSAGE });

    const active = await assertCnpjActiveForSignup(validCnpj, async () => ({
      active: true,
    }));
    assert.deepEqual(active, { ok: true });

    const invalid = await assertCnpjActiveForSignup('11111111111111', async () => {
      throw new Error('lookup must not run for invalid digits');
    });
    assert.equal(invalid.ok, false);
    if (invalid.ok === false) {
      assert.match(invalid.error, /CNPJ inválido/);
    }
  });

  it('calls GET /auth/cnpj-status before register and Google signup', () => {
    assert.match(api, /export async function getCnpjStatus/);
    assert.match(api, /\/auth\/cnpj-status\?/);
    assert.match(authForm, /getCnpjStatus/);
    assert.match(authForm, /assertCnpjActiveForSignup/);
    assert.match(authForm, /CNPJ_INACTIVE_MESSAGE/);
  });
});

describe('lojista login identifier', () => {
  it('keeps email login and accepts national WhatsApp when the identifier is a mobile', () => {
    assert.deepEqual(parseLojistaLoginIdentifier('voce@loja.com.br'), {
      kind: 'email',
      email: 'voce@loja.com.br',
    });
    assert.deepEqual(parseLojistaLoginIdentifier('(11) 9 9999-9999'), {
      kind: 'phone',
      phoneE164: '+5511999999999',
    });
    assert.equal(parseLojistaLoginIdentifier('abc').kind, 'invalid');
    assert.equal(
      formatLojistaLoginIdentifierInput('11999999999'),
      '(11) 9 9999-9999',
    );
    assert.equal(
      formatLojistaLoginIdentifierInput('voce@loja.com.br'),
      'voce@loja.com.br',
    );
    assert.deepEqual(
      buildLoginPayload({
        identifier: parseLojistaLoginIdentifier('voce@loja.com.br'),
        password: 'secret-12',
      }),
      { email: 'voce@loja.com.br', password: 'secret-12' },
    );
    assert.deepEqual(
      buildLoginPayload({
        identifier: parseLojistaLoginIdentifier('11999999999'),
        password: 'secret-12',
      }),
      { phoneE164: '+5511999999999', password: 'secret-12' },
    );
  });
});

describe('Google GIS on lojista /entrar', () => {
  it('hides Continuar com Google when NEXT_PUBLIC_GOOGLE_CLIENT_ID is absent', () => {
    assert.equal(publicGoogleClientId({}), null);
    assert.equal(publicGoogleClientId({ NEXT_PUBLIC_GOOGLE_CLIENT_ID: '' }), null);
    assert.equal(
      publicGoogleClientId({ NEXT_PUBLIC_GOOGLE_CLIENT_ID: '  ' }),
      null,
    );
    assert.equal(
      publicGoogleClientId({ NEXT_PUBLIC_GOOGLE_CLIENT_ID: 'abc.apps.googleusercontent.com' }),
      'abc.apps.googleusercontent.com',
    );
    assert.match(googleBtn, /publicGoogleClientId/);
    assert.match(googleBtn, /Continuar com Google/);
    assert.match(googleBtn, /accounts\.google\.com\/gsi\/client/);
    assert.doesNotMatch(googleBtn, /fake-google-client/i);
    assert.match(authForm, /GoogleContinueButton/);
    assert.match(api, /export async function googleAuth/);
    assert.match(api, /\/auth\/google/);
  });

  it('sends idToken plus signup fields only for a new Google account', () => {
    assert.deepEqual(
      buildGoogleAuthPayload({
        idToken: 'tok',
        mode: 'entrar',
      }),
      { idToken: 'tok' },
    );
    assert.deepEqual(
      buildGoogleAuthPayload({
        idToken: 'tok',
        mode: 'criar',
        ownerName: 'Carlos',
        storeName: 'Sapataria',
        cnpj: '04252011000110',
        phoneE164: '+5511987654321',
      }),
      {
        idToken: 'tok',
        ownerName: 'Carlos',
        storeName: 'Sapataria',
        cnpj: '04252011000110',
        phoneE164: '+5511987654321',
      },
    );
  });
});

describe('register payload keeps cadastro WhatsApp separate from Perfil', () => {
  it('includes phoneE164 from the national mask, not store session WhatsApp', () => {
    const payload = buildRegisterPayload({
      ownerName: 'Carlos Silva',
      storeName: 'Sapataria do Carlos',
      cnpj: '04.252.011/0001-10',
      email: 'Carlos@loja.com.br',
      password: 'secret-12',
      whatsapp: '(11) 9 8765-4321',
    });
    assert.equal(payload.ok, true);
    if (payload.ok) {
      assert.equal(payload.body.phoneE164, '+5511987654321');
      assert.equal(payload.body.email, 'carlos@loja.com.br');
      assert.equal(payload.body.cnpj, '04252011000110');
      assert.equal('sessionName' in payload.body, false);
    }
    assert.match(api, /phoneE164: string/);
    assert.match(api, /export async function registerAccount/);
  });
});

describe('staff login path isolation', () => {
  it('keeps /equipe/entrar without criar conta and without Google', () => {
    assert.doesNotMatch(staffPage, /criar conta/i);
    assert.doesNotMatch(staffForm, /criar conta/i);
    assert.doesNotMatch(staffForm, /registerAccount/);
    assert.doesNotMatch(staffForm, /GoogleContinueButton/);
    assert.doesNotMatch(staffForm, /gsi\/client/);
    assert.doesNotMatch(staffForm, /Continuar com Google/);
    assert.doesNotMatch(staffForm, /getCnpjStatus/);
    assert.doesNotMatch(staffForm, /signupWhatsapp/);
    assert.match(staffForm, /persistStaffSession/);
    assert.doesNotMatch(staffForm, /persistClientSession/);
    assert.match(authForm, /lojistaLoginOutcome/);
    assert.doesNotMatch(authForm, /persistStaffSession/);
  });
});

describe('lojista dispatch guard stays locked', () => {
  it('does not restore disparo from the signup change', () => {
    assert.match(policy, /assertLojistaCannotDispatch/);
    const start = api.indexOf('export async function createApiCheckout');
    const rest = api.slice(start);
    const nextExport = rest.indexOf('\nexport ', 1);
    const body = nextExport === -1 ? rest : rest.slice(0, nextExport);
    assert.match(body, /assertLojistaCannotDispatch/);
    assert.equal(authForm.includes('createCampaign'), false);
    assert.equal(authForm.includes('Novo disparo'), false);
  });
});
