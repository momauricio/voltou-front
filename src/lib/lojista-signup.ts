import {
  BR_MOBILE_NATIONAL_PLACEHOLDER,
  formatBrMobileNational,
  nationalBrMobileToE164,
} from './br-mobile-national.ts';
import { isValidCnpj, stripCnpj } from './cnpj.ts';

export { BR_MOBILE_NATIONAL_PLACEHOLDER };

export const CNPJ_INACTIVE_MESSAGE = 'CNPJ precisa estar ativo na Receita.';
export const CNPJ_LOOKUP_ERROR_MESSAGE =
  'Não foi possível validar o CNPJ agora. Tente novamente.';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function publicGoogleClientId(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  return raw ? raw : null;
}

function normalizeSituation(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export function isCnpjStatusActive(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const record = body as Record<string, unknown>;
  if (typeof record.active === 'boolean') return record.active;
  if (typeof record.isActive === 'boolean') return record.isActive;

  const situation = normalizeSituation(
    record.descricao_situacao_cadastral ??
      record.situacao ??
      record.status ??
      record.situacao_cadastral,
  );
  if (!situation) return false;
  return situation.includes('ATIVA') || situation === '2';
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
    const message = err instanceof Error ? err.message : '';
    if (/ativo na Receita/i.test(message)) {
      return { ok: false, error: CNPJ_INACTIVE_MESSAGE };
    }
    return { ok: false, error: CNPJ_LOOKUP_ERROR_MESSAGE };
  }
}

export type LojistaLoginIdentifier =
  | { kind: 'email'; email: string }
  | { kind: 'phone'; phoneE164: string }
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
  const phoneE164 = nationalBrMobileToE164(trimmed);
  if (!phoneE164) {
    return {
      kind: 'invalid',
      error:
        'Informe um email válido ou um celular no formato (11) 9 9999-9999.',
    };
  }
  return { kind: 'phone', phoneE164 };
}

export function formatLojistaLoginIdentifierInput(raw: string): string {
  if (raw.includes('@') || /[A-Za-z]/.test(raw)) return raw;
  return formatBrMobileNational(raw);
}

export function buildLoginPayload(opts: {
  identifier: LojistaLoginIdentifier;
  password: string;
}): { email: string; password: string } | { phoneE164: string; password: string } | null {
  if (opts.identifier.kind === 'email') {
    return { email: opts.identifier.email, password: opts.password };
  }
  if (opts.identifier.kind === 'phone') {
    return { phoneE164: opts.identifier.phoneE164, password: opts.password };
  }
  return null;
}

export type RegisterBody = {
  ownerName: string;
  storeName: string;
  cnpj: string;
  email: string;
  password: string;
  phoneE164: string;
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
  const phoneE164 = nationalBrMobileToE164(input.whatsapp);

  if (!phoneE164) {
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
      phoneE164,
    },
  };
}

export type GoogleAuthBody = {
  idToken: string;
  ownerName?: string;
  storeName?: string;
  cnpj?: string;
  phoneE164?: string;
};

export function buildGoogleAuthPayload(input: {
  idToken: string;
  mode: 'entrar' | 'criar';
  ownerName?: string;
  storeName?: string;
  cnpj?: string;
  phoneE164?: string;
}): GoogleAuthBody {
  if (input.mode === 'entrar') {
    return { idToken: input.idToken };
  }
  return {
    idToken: input.idToken,
    ownerName: input.ownerName?.trim(),
    storeName: input.storeName?.trim(),
    cnpj: input.cnpj,
    phoneE164: input.phoneE164,
  };
}
