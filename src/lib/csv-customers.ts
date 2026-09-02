import { normalizeHeader, parseCsv } from '@/lib/csv-products';
import { formatDatePtBr } from '@/lib/lojista-panel-ux';

export type CustomerCsvRow = {
  nome: string;
  telefone: string;
  /** Digits only, for dedupe. */
  telefoneDigits: string;
  produto: string;
  /** ISO date when parseable; null if empty. */
  dataCompra: string | null;
  dataCompraLabel: string;
};

export type CustomerCsvParseResult = {
  rows: CustomerCsvRow[];
  errors: string[];
  skipped: number;
};

const HEADER_ALIASES: Record<'nome' | 'telefone' | 'produto' | 'data_compra', string[]> = {
  nome: ['nome', 'name', 'cliente', 'customer', 'nome_cliente'],
  telefone: [
    'telefone',
    'phone',
    'whatsapp',
    'celular',
    'fone',
    'tel',
    'numero',
    'mobile',
  ],
  produto: [
    'produto',
    'product',
    'produto_interesse',
    'ultimo_produto',
    'item',
    'sku_produto',
  ],
  data_compra: [
    'data_compra',
    'datacompra',
    'compra',
    'data',
    'ultima_compra',
    'purchase_date',
    'bought_at',
  ],
};

function mapHeaders(
  headers: string[],
): Partial<Record<'nome' | 'telefone' | 'produto' | 'data_compra', number>> {
  const normalized = headers.map(normalizeHeader);
  const map: Partial<Record<'nome' | 'telefone' | 'produto' | 'data_compra', number>> = {};
  (Object.keys(HEADER_ALIASES) as (keyof typeof HEADER_ALIASES)[]).forEach((key) => {
    const idx = normalized.findIndex((h) => HEADER_ALIASES[key].includes(h));
    if (idx >= 0) map[key] = idx;
  });
  return map;
}

/** Digits only; strips country code 55 when present (11+ digits). */
export function normalizePhoneDigits(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2);
  }
  return digits;
}

export function formatPhoneDisplay(digits: string): string {
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

/**
 * Accepts DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, or Excel serial-ish numbers are rejected.
 */
export function parsePurchaseDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  const br = value.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (br) {
    const day = Number(br[1]);
    const month = Number(br[2]);
    let year = Number(br[3]);
    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(year, month - 1, day, 12, 0, 0, 0);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
      return null;
    }
    return d.toISOString();
  }

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const d = new Date(year, month - 1, day, 12, 0, 0, 0);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
      return null;
    }
    return d.toISOString();
  }

  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
  }

  return null;
}

export function parseCustomerCsv(text: string): CustomerCsvParseResult {
  const table = parseCsv(text);
  if (table.length < 2) {
    return {
      rows: [],
      errors: ['O CSV precisa de cabeçalho e pelo menos uma linha de dados.'],
      skipped: 0,
    };
  }

  const headerMap = mapHeaders(table[0]);
  if (headerMap.nome == null || headerMap.telefone == null) {
    return {
      rows: [],
      errors: [
        'Cabeçalho inválido. Inclua ao menos as colunas: nome, telefone (opcionais: produto, data_compra).',
      ],
      skipped: 0,
    };
  }

  const rows: CustomerCsvRow[] = [];
  const errors: string[] = [];
  let skipped = 0;
  const seenPhones = new Set<string>();

  for (let i = 1; i < table.length; i++) {
    const line = table[i];
    const lineNo = i + 1;
    const nome = (line[headerMap.nome!] ?? '').trim();
    const telefoneRaw = (line[headerMap.telefone!] ?? '').trim();
    const telefoneDigits = normalizePhoneDigits(telefoneRaw);
    const produto =
      headerMap.produto != null
        ? (line[headerMap.produto] ?? '').trim()
        : '';
    const dataRaw =
      headerMap.data_compra != null
        ? (line[headerMap.data_compra] ?? '').trim()
        : '';

    if (!nome) {
      errors.push(`Linha ${lineNo}: nome vazio.`);
      skipped++;
      continue;
    }
    if (telefoneDigits.length < 10 || telefoneDigits.length > 11) {
      errors.push(
        `Linha ${lineNo}: telefone inválido ("${telefoneRaw}"). Use DDD + número (10 ou 11 dígitos).`,
      );
      skipped++;
      continue;
    }
    if (seenPhones.has(telefoneDigits)) {
      errors.push(`Linha ${lineNo}: telefone duplicado no arquivo ("${telefoneRaw}").`);
      skipped++;
      continue;
    }

    let dataCompra: string | null = null;
    if (dataRaw) {
      dataCompra = parsePurchaseDate(dataRaw);
      if (!dataCompra) {
        errors.push(`Linha ${lineNo}: data_compra inválida ("${dataRaw}"). Use DD/MM/AAAA.`);
        skipped++;
        continue;
      }
    }

    seenPhones.add(telefoneDigits);
    rows.push({
      nome,
      telefone: formatPhoneDisplay(telefoneDigits),
      telefoneDigits,
      produto: produto || '—',
      dataCompra,
      dataCompraLabel: dataCompra ? formatDatePtBr(dataCompra) : '—',
    });
  }

  return { rows, errors, skipped };
}

export function downloadCustomerCsvTemplate() {
  const content =
    'nome,telefone,produto,data_compra\n' +
    'Ana Souza,11987654321,Tênis Runner Pro,15/03/2026\n' +
    'Bruno Lima,(11) 98888-7777,Jaqueta Windbreaker,02/04/2026\n' +
    'Carla Mendes,21977776666,Mochila Urban,\n';
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'voltou-clientes-modelo.csv';
  a.click();
  URL.revokeObjectURL(url);
}
