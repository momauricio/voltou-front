import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CategoryPerf, ProductPerf } from '@/lib/mock-dashboard';
import { formatPct } from '@/lib/mock-dashboard';

export type DashboardPdfInput = {
  periodLabel: string;
  de: string;
  ate: string;
  filterLabel: string;
  totals: {
    receitaCents: number;
    contatos: number;
    interesses: number;
    retornos: number;
    taxaRetorno: number;
  };
  products: ProductPerf[];
  categories: CategoryPerf[];
  bestProductName?: string;
};

function formatCurrencyCents(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDateBr(iso: string) {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function safeFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export function exportDashboardPdf(input: DashboardPdfInput) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const marginX = 14;
  let y = 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(22, 101, 52);
  doc.text('Voltou.', marginX, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  y += 8;
  doc.text('Relatório do Dashboard', marginX, y);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  y += 6;
  doc.text(
    `Período: ${input.periodLabel} (${formatDateBr(input.de)} a ${formatDateBr(input.ate)})`,
    marginX,
    y,
  );
  y += 5;
  doc.text(`Filtro: ${input.filterLabel}`, marginX, y);
  y += 5;
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, marginX, y);

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text('Resumo', marginX, y);

  autoTable(doc, {
    startY: y + 3,
    head: [['Indicador', 'Valor']],
    body: [
      ['Receita recuperada', formatCurrencyCents(input.totals.receitaCents)],
      ['Mensagens / contatos', input.totals.contatos.toLocaleString('pt-BR')],
      ['Interesses gerados', input.totals.interesses.toLocaleString('pt-BR')],
      ['Retornos', input.totals.retornos.toLocaleString('pt-BR')],
      ['Taxa de retorno', formatPct(input.totals.taxaRetorno)],
      ['Melhor produto (retorno)', input.bestProductName ?? '—'],
    ],
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [22, 163, 74], textColor: 255 },
    columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 'auto' } },
    margin: { left: marginX, right: marginX },
  });

  const afterSummary = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY;

  y = afterSummary + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Performance por produto', marginX, y);

  autoTable(doc, {
    startY: y + 3,
    head: [['Produto', 'Categoria', 'Contatos', 'Interesses', 'Retornos', 'Receita', 'Taxa']],
    body: input.products.map((p) => [
      p.nome,
      p.categoria,
      String(p.contatos),
      String(p.interesses),
      String(p.retornos),
      formatCurrencyCents(p.receitaCents),
      formatPct(p.contatos > 0 ? p.retornos / p.contatos : 0),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [22, 163, 74], textColor: 255 },
    margin: { left: marginX, right: marginX },
  });

  const afterProducts = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY;

  y = afterProducts + 10;
  if (y > 250) {
    doc.addPage();
    y = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Performance por categoria', marginX, y);

  autoTable(doc, {
    startY: y + 3,
    head: [['Categoria', 'Contatos', 'Interesses', 'Retornos', 'Receita', 'Taxa']],
    body: input.categories.map((c) => [
      c.categoria,
      String(c.contatos),
      String(c.interesses),
      String(c.retornos),
      formatCurrencyCents(c.receitaCents),
      formatPct(c.taxaRetorno),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [22, 163, 74], textColor: 255 },
    margin: { left: marginX, right: marginX },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Voltou. — página ${i} de ${pageCount}`,
      marginX,
      doc.internal.pageSize.getHeight() - 8,
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const filterPart = safeFilename(input.filterLabel) || 'dashboard';
  doc.save(`voltou-dashboard-${filterPart}-${stamp}.pdf`);
}
