import { MOCK_PRODUCTS, PRODUCT_CATEGORIES } from '@/lib/mock-customers';

export type ProductPerf = {
  productId: string;
  nome: string;
  categoria: string;
  /** Contatos/disparos ligados a este produto no período. */
  contatos: number;
  /** Interesses registrados pelos clientes finais. */
  interesses: number;
  /** Clientes que voltaram a comprar após o contato. */
  retornos: number;
  receitaCents: number;
};

/** Performance mock por produto (período ~30 dias, base “todos”). */
const BASE_PRODUCT_PERF: Omit<ProductPerf, 'nome' | 'categoria'>[] = [
  { productId: '1', contatos: 210, interesses: 86, retornos: 42, receitaCents: 623000 },
  { productId: '2', contatos: 168, interesses: 54, retornos: 28, receitaCents: 412000 },
  { productId: '3', contatos: 124, interesses: 41, retornos: 19, receitaCents: 264000 },
  { productId: '4', contatos: 98, interesses: 33, retornos: 11, receitaCents: 98000 },
  { productId: '5', contatos: 76, interesses: 29, retornos: 14, receitaCents: 72000 },
  { productId: '6', contatos: 142, interesses: 61, retornos: 31, receitaCents: 486000 },
  { productId: '7', contatos: 110, interesses: 47, retornos: 22, receitaCents: 198000 },
  { productId: '8', contatos: 88, interesses: 36, retornos: 16, receitaCents: 221000 },
];

const PERIOD_SCALE: Record<string, number> = {
  '7d': 0.28,
  '30d': 1,
  mes: 0.45,
  '90d': 2.6,
};

export function getProductPerformance(periodKey: string): ProductPerf[] {
  const scale = PERIOD_SCALE[periodKey] ?? 1;
  return BASE_PRODUCT_PERF.map((row) => {
    const product = MOCK_PRODUCTS.find((p) => p.id === row.productId);
    return {
      ...row,
      nome: product?.nome ?? row.productId,
      categoria: product?.categoria ?? 'Geral',
      contatos: Math.round(row.contatos * scale),
      interesses: Math.round(row.interesses * scale),
      retornos: Math.round(row.retornos * scale),
      receitaCents: Math.round(row.receitaCents * scale),
    };
  });
}

export type CategoryPerf = {
  categoria: string;
  contatos: number;
  interesses: number;
  retornos: number;
  receitaCents: number;
  produtos: number;
  taxaRetorno: number;
};

export function aggregateByCategory(products: ProductPerf[]): CategoryPerf[] {
  const map = new Map<string, CategoryPerf>();

  for (const cat of PRODUCT_CATEGORIES) {
    map.set(cat, {
      categoria: cat,
      contatos: 0,
      interesses: 0,
      retornos: 0,
      receitaCents: 0,
      produtos: 0,
      taxaRetorno: 0,
    });
  }

  for (const p of products) {
    const row = map.get(p.categoria) ?? {
      categoria: p.categoria,
      contatos: 0,
      interesses: 0,
      retornos: 0,
      receitaCents: 0,
      produtos: 0,
      taxaRetorno: 0,
    };
    row.contatos += p.contatos;
    row.interesses += p.interesses;
    row.retornos += p.retornos;
    row.receitaCents += p.receitaCents;
    row.produtos += 1;
    map.set(p.categoria, row);
  }

  return [...map.values()]
    .map((row) => ({
      ...row,
      taxaRetorno: row.contatos > 0 ? row.retornos / row.contatos : 0,
    }))
    .filter((row) => row.produtos > 0)
    .sort((a, b) => b.receitaCents - a.receitaCents);
}

export function filterProductPerformance(
  products: ProductPerf[],
  categoria: string,
  productName: string,
): ProductPerf[] {
  return products.filter((p) => {
    const matchCat = categoria === 'todas' || p.categoria === categoria;
    const matchProd = productName === 'todos' || p.nome === productName;
    return matchCat && matchProd;
  });
}

export function sumPerformance(products: ProductPerf[]) {
  return products.reduce(
    (acc, p) => {
      acc.contatos += p.contatos;
      acc.interesses += p.interesses;
      acc.retornos += p.retornos;
      acc.receitaCents += p.receitaCents;
      return acc;
    },
    { contatos: 0, interesses: 0, retornos: 0, receitaCents: 0 },
  );
}

export function formatPct(ratio: number) {
  return `${(ratio * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}
