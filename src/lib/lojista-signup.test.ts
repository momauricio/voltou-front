import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { ApiHttpError } from './api-error.ts';
import { isValidCnpj } from './cnpj.ts';
import {
  CNPJ_INACTIVE_MESSAGE,
  CNPJ_LOOKUP_ERROR_MESSAGE,
  assertCnpjActiveForSignup,
  buildGoogleAuthPayload,
  buildLoginPayload,
  buildRegisterPayload,
  formatLojistaLoginIdentifierInput,
  isCnpjStatusActive,
  isGoogleSignupIncompleteError,
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
  it('uses GET { ok, active } only — never razao_social or Receita fields', () => {
    assert.equal(CNPJ_INACTIVE_MESSAGE, 'CNPJ precisa estar ativo na Receita.');
    assert.equal(isCnpjStatusActive({ ok: true, active: true }), true);
    assert.equal(isCnpjStatusActive({ ok: true, active: false }), false);
    assert.equal(isCnpjStatusActive({ ok: false, active: false }), false);
    assert.equal(isCnpjStatusActive({ active: true }), false);
    assert.equal(
      isCnpjStatusActive({ razao_social: 'ACME', descricao_situacao_cadastral: 'ATIVA' }),
      false,
    );
    assert.doesNotMatch(api, /razao_social/);
    assert.match(api, /ok:\s*boolean/);
    assert.match(api, /active:\s*boolean/);
  });

  it('blocks submit after valid check-digits when the CNPJ is not active', async () => {
    const validCnpj = '04252011000110';
    assert.equal(isValidCnpj(validCnpj), true);

    const inactive = await assertCnpjActiveForSignup(validCnpj, async () => ({
      ok: true,
      active: false,
    }));
    assert.deepEqual(inactive, { ok: false, error: CNPJ_INACTIVE_MESSAGE });

    const active = await assertCnpjActiveForSignup(validCnpj, async () => ({
      ok: true,
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

    const badRequest = await assertCnpjActiveForSignup(validCnpj, async () => {
      throw new ApiHttpError('CNPJ inválido.', 400);
    });
    assert.deepEqual(badRequest, {
      ok: false,
      error: 'CNPJ inválido. Confira os dígitos.',
    });

    const down = await assertCnpjActiveForSignup(validCnpj, async () => {
      throw new ApiHttpError(
        'Não foi possível validar o CNPJ agora. Tente novamente.',
        503,
      );
    });
    assert.deepEqual(down, { ok: false, error: CNPJ_LOOKUP_ERROR_MESSAGE });
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
      ownerPhone: '11999999999',
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
      { identifier: '11999999999', password: 'secret-12' },
    );
    assert.match(api, /identifier\?:\s*string/);
    assert.doesNotMatch(
      api.slice(api.indexOf('export type LoginPayload'), api.indexOf('export type CnpjStatusResponse')),
      /phoneE164/,
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
    assert.match(googleBtn, /onError=/);
    assert.match(googleBtn, /useEffect/);
    assert.match(googleBtn, /Carregando Google/);
    assert.doesNotMatch(googleBtn, /fake-google-client/i);
    assert.match(authForm, /GoogleContinueButton/);
    assert.match(api, /export async function googleAuth/);
    assert.match(api, /\/auth\/google/);

    const helper = readFileSync(
      new URL('./lojista-signup.ts', import.meta.url),
      'utf8',
    );
    assert.match(
      helper,
      /NEXT_PUBLIC_GOOGLE_CLIENT_ID:\s*process\.env\.NEXT_PUBLIC_GOOGLE_CLIENT_ID/,
    );
  });

  it('keeps a new-account Google token so Entrar does not drop the credential', () => {
    assert.match(authForm, /pendingGoogleIdToken/);
    assert.match(authForm, /Conta Google nova/);
    assert.match(authForm, /completeGoogleSignup/);
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
        ownerPhone: '11987654321',
      }),
      {
        idToken: 'tok',
        ownerName: 'Carlos',
        storeName: 'Sapataria',
        cnpj: '04252011000110',
        ownerPhone: '11987654321',
      },
    );
    assert.equal(
      isGoogleSignupIncompleteError(
        new ApiHttpError('Informe o nome da loja para criar a conta.', 400),
      ),
      true,
    );
    assert.equal(
      isGoogleSignupIncompleteError(new ApiHttpError('Token inválido.', 401)),
      false,
    );
    assert.match(authForm, /isGoogleSignupIncompleteError/);
    assert.match(api, /ownerPhone\?:/);
  });
});

describe('register payload keeps cadastro WhatsApp separate from Perfil', () => {
  it('sends ownerPhone as national digits, never +55 or store session WhatsApp', () => {
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
      assert.equal(payload.body.ownerPhone, '11987654321');
      assert.equal(payload.body.email, 'carlos@loja.com.br');
      assert.equal(payload.body.cnpj, '04252011000110');
      assert.equal('phoneE164' in payload.body, false);
      assert.equal('sessionName' in payload.body, false);
      assert.equal(payload.body.ownerPhone.includes('+'), false);
    }
    assert.match(api, /ownerPhone: string/);
    const registerType = api.slice(
      api.indexOf('export type RegisterPayload'),
      api.indexOf('export type RegisterResponse'),
    );
    assert.equal(registerType.includes('phoneE164'), false);
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
