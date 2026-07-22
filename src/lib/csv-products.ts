/** Minimal CSV parser: supports comma or semicolon, quoted fields, header row. */

export function parseCsv(text: string): string[][] {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    const next = normalized[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',' || ch === ';') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.trim());
      cell = '';
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }

  row.push(cell.trim());
  if (row.some((c) => c.length > 0)) rows.push(row);
  return rows;
}

export function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function parsePrice(raw: string): number | null {
  const cleaned = raw.trim().replace(/R\$\s?/i, '').replace(/\s/g, '');
  if (!cleaned) return null;
  // 1.234,56 or 1234,56 or 1234.56
  let normalized = cleaned;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.');
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export type ProductCsvRow = {
  nome: string;
  sku: string;
  categoria: string;
  preco: number;
  estoque: number;
};

export type ProductCsvParseResult = {
  rows: ProductCsvRow[];
  errors: string[];
  skipped: number;
};

const HEADER_ALIASES: Record<keyof ProductCsvRow, string[]> = {
  nome: ['nome', 'name', 'produto', 'product', 'titulo', 'title'],
  sku: ['sku', 'codigo', 'code', 'ref', 'referencia'],
  categoria: ['categoria', 'category', 'cat'],
  preco: ['preco', 'price', 'valor', 'preco_r'],
  estoque: ['estoque', 'stock', 'qtd', 'quantidade', 'qty'],
};

function mapHeaders(headers: string[]): Partial<Record<keyof ProductCsvRow, number>> {
  const normalized = headers.map(normalizeHeader);
  const map: Partial<Record<keyof ProductCsvRow, number>> = {};
  (Object.keys(HEADER_ALIASES) as (keyof ProductCsvRow)[]).forEach((key) => {
    const idx = normalized.findIndex((h) => HEADER_ALIASES[key].includes(h));
    if (idx >= 0) map[key] = idx;
  });
  return map;
}

export function parseProductCsv(text: string): ProductCsvParseResult {
  const table = parseCsv(text);
  if (table.length < 2) {
    return {
      rows: [],
      errors: ['O CSV precisa de cabeçalho e pelo menos uma linha de dados.'],
      skipped: 0,
    };
  }

  const headerMap = mapHeaders(table[0]);
  if (headerMap.nome == null || headerMap.preco == null) {
    return {
      rows: [],
      errors: [
        'Cabeçalho inválido. Inclua ao menos as colunas: nome, preco (opcionais: sku, categoria, estoque).',
      ],
      skipped: 0,
    };
  }

  const rows: ProductCsvRow[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (let i = 1; i < table.length; i++) {
    const line = table[i];
    const lineNo = i + 1;
    const nome = (line[headerMap.nome!] ?? '').trim();
    const precoRaw = (line[headerMap.preco!] ?? '').trim();
    const preco = parsePrice(precoRaw);
    const sku =
      headerMap.sku != null
        ? (line[headerMap.sku] ?? '').trim().toUpperCase()
        : '';
    const categoria =
      headerMap.categoria != null
        ? (line[headerMap.categoria] ?? '').trim() || 'Geral'
        : 'Geral';
    const estoqueRaw =
      headerMap.estoque != null ? (line[headerMap.estoque] ?? '').trim() : '0';
    const estoque = Number(estoqueRaw.replace(/\D/g, '')) || 0;

    if (!nome) {
      errors.push(`Linha ${lineNo}: nome vazio.`);
      skipped++;
      continue;
    }
    if (preco == null || preco < 0) {
      errors.push(`Linha ${lineNo}: preço inválido ("${precoRaw}").`);
      skipped++;
      continue;
    }

    rows.push({
      nome,
      sku: sku || `SKU-${lineNo}`,
      categoria,
      preco,
      estoque,
    });
  }

  return { rows, errors, skipped };
}

export function downloadProductCsvTemplate() {
  const content =
    'nome,sku,categoria,preco,estoque\n' +
    'Tênis Exemplo,TEN-001,Tênis,199.90,10\n' +
    'Bolsa Couro,BOL-002,Bolsas,"249,50",5\n' +
    'Meia Performance,MEI-003,Meias,29.90,40\n';
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'voltou-produtos-modelo.csv';
  a.click();
  URL.revokeObjectURL(url);
}
