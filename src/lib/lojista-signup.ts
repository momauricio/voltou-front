import {
  BR_MOBILE_NATIONAL_PLACEHOLDER,
  formatBrMobileNational,
  nationalBrMobileToE164,
} from './br-mobile-national.ts';
import { ApiHttpError } from './api-error.ts';
import { isValidCnpj, stripCnpj } from './cnpj.ts';

export { BR_MOBILE_NATIONAL_PLACEHOLDER };

export const CNPJ_INACTIVE_MESSAGE = 'CNPJ precisa estar ativo na Receita.';
export const CNPJ_LOOKUP_ERROR_MESSAGE =
  'Não foi possível validar o CNPJ agora. Tente novamente.';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function publicGoogleClientId(
  env: Record<string, string | undefined> = {
    // Next only inlines a static `process.env.NEXT_PUBLIC_*` member access
    // in the client bundle. Do not read it via `process.env` as an object.
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  },
): string | null {
  const raw = env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  return raw ? raw : null;
}

/** 11 national digits. API normalizes to E.164; the UI never sends +55. */
export function ownerPhoneNationalDigits(raw: string): string | null {
  const e164 = nationalBrMobileToE164(raw);
  return e164 ? e164.slice(3) : null;
}

export function isCnpjStatusActive(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const record = body as Record<string, unknown>;
  return record.ok === true && record.active === true;
}

export async function assertCnpjActiveForSignup(
  cnpjDigits: string,
  lookup: (cnpj: string) => Promise<unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidCnpj(cnpjDigits)) {
    return { ok: false, error: 'CNPJ inválido. Confira os dígitos.' };
  }

  try {
    const body = await lookup(cnpjDigits);
    if (!isCnpjStatusActive(body)) {
      return { ok: false, error: CNPJ_INACTIVE_MESSAGE };
    }
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiHttpError) {
      if (err.status === 400) {
        return { ok: false, error: 'CNPJ inválido. Confira os dígitos.' };
      }
      if (err.status === 503) {
        return { ok: false, error: CNPJ_LOOKUP_ERROR_MESSAGE };
      }
      if (/ativo na Receita/i.test(err.message)) {
        return { ok: false, error: CNPJ_INACTIVE_MESSAGE };
      }
    }
    const message = err instanceof Error ? err.message : '';
    if (/ativo na Receita/i.test(message)) {
      return { ok: false, error: CNPJ_INACTIVE_MESSAGE };
    }
    return { ok: false, error: CNPJ_LOOKUP_ERROR_MESSAGE };
  }
}

export function isGoogleSignupIncompleteError(err: unknown): boolean {
  if (!(err instanceof ApiHttpError) || err.status !== 400) return false;
  return /nome da loja|CNPJ da loja|WhatsApp|celular|lojista|ownerPhone/i.test(
    err.message,
  );
}

export type LojistaLoginIdentifier =
  | { kind: 'email'; email: string }
  | { kind: 'phone'; ownerPhone: string }
  | { kind: 'invalid'; error: string };

export function parseLojistaLoginIdentifier(raw: string): LojistaLoginIdentifier {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { kind: 'invalid', error: 'Informe o email ou o WhatsApp.' };
  }
  if (trimmed.includes('@')) {
    const email = trimmed.toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return { kind: 'invalid', error: 'Informe um email válido.' };
    }
    return { kind: 'email', email };
  }
  const ownerPhone = ownerPhoneNationalDigits(trimmed);
  if (!ownerPhone) {
    return {
      kind: 'invalid',
      error:
        'Informe um email válido ou um celular no formato (11) 9 9999-9999.',
    };
  }
  return { kind: 'phone', ownerPhone };
}

export function formatLojistaLoginIdentifierInput(raw: string): string {
  if (raw.includes('@') || /[A-Za-z]/.test(raw)) return raw;
  return formatBrMobileNational(raw);
}

export function buildLoginPayload(opts: {
  identifier: LojistaLoginIdentifier;
  password: string;
}): { email: string; password: string } | { identifier: string; password: string } | null {
  if (opts.identifier.kind === 'email') {
    return { email: opts.identifier.email, password: opts.password };
  }
  if (opts.identifier.kind === 'phone') {
    return { identifier: opts.identifier.ownerPhone, password: opts.password };
  }
  return null;
}

export type RegisterBody = {
  ownerName: string;
  storeName: string;
  cnpj: string;
  email: string;
  password: string;
  ownerPhone: string;
};

export function buildRegisterPayload(input: {
  ownerName: string;
  storeName: string;
  cnpj: string;
  email: string;
  password: string;
  whatsapp: string;
}): { ok: true; body: RegisterBody } | { ok: false; error: string } {
  const ownerName = input.ownerName.trim();
  const storeName = input.storeName.trim();
  const email = input.email.trim().toLowerCase();
  const cnpj = stripCnpj(input.cnpj);
  const ownerPhone = ownerPhoneNationalDigits(input.whatsapp);

  if (!ownerPhone) {
    return {
      ok: false,
      error: 'Informe um celular no formato (11) 9 9999-9999.',
    };
  }
  if (!ownerName) {
    return { ok: false, error: 'Informe o nome do dono.' };
  }
  if (!storeName) {
    return { ok: false, error: 'Informe o nome da loja.' };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: 'Informe um email válido.' };
  }
  if (input.password.length < 8) {
    return { ok: false, error: 'A senha deve ter pelo menos 8 caracteres.' };
  }
  if (!isValidCnpj(cnpj)) {
    return { ok: false, error: 'CNPJ inválido. Confira os dígitos.' };
  }

  return {
    ok: true,
    body: {
      ownerName,
      storeName,
      cnpj,
      email,
      password: input.password,
      ownerPhone,
    },
  };
}

export type GoogleAuthBody = {
  idToken: string;
  ownerName?: string;
  storeName?: string;
  cnpj?: string;
  ownerPhone?: string;
};

export function buildGoogleAuthPayload(input: {
  idToken: string;
  mode: 'entrar' | 'criar';
  ownerName?: string;
  storeName?: string;
  cnpj?: string;
  ownerPhone?: string;
}): GoogleAuthBody {
  if (input.mode === 'entrar') {
    return { idToken: input.idToken };
  }
  return {
    idToken: input.idToken,
    ownerName: input.ownerName?.trim(),
    storeName: input.storeName?.trim(),
    cnpj: input.cnpj,
    ownerPhone: input.ownerPhone,
  };
}
