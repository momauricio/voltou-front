'use client';

import { useRef, useState } from 'react';
import { Modal } from '@/components/painel/modal';
import {
  commitImport,
  previewImport,
  remapImport,
  type ImportCommitSummary,
  type ImportPreviewResult,
  type ImportSheetKind,
  type ImportSheetMeta,
} from '@/lib/api';

type Tab = 'vendas' | 'clientes' | 'produtos';
type Step = 'upload' | 'map' | 'preview' | 'done';

const KIND_LABELS: Record<ImportSheetKind, string> = {
  customers: 'Lista de clientes',
  products: 'Lista de produtos',
  sales: 'Vendas (clientes + produtos)',
  ambiguous: 'Não identificado',
};

const FIELD_LABELS: Record<string, string> = {
  cliente: 'Nome do cliente',
  telefone: 'Telefone / WhatsApp',
  cpf: 'CPF / CNPJ',
  email: 'E-mail',
  produto: 'Nome do produto',
  sku: 'SKU / código',
  categoria: 'Categoria',
  preco: 'Preço',
  custo: 'Custo',
  estoque: 'Estoque',
  quantidade: 'Quantidade',
  valor_total: 'Valor total',
  data: 'Data',
};

function formatCents(cents?: number) {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function readFileAsPayload(
  file: File,
): Promise<{ name: string; content: string; encoding?: 'utf8' | 'base64' }> {
  const isExcel = /\.xlsx?$/i.test(file.name);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Falha ao ler ${file.name}`));
    if (isExcel) {
      reader.onload = () => {
        const buf = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]!);
        }
        resolve({
          name: file.name,
          content: btoa(binary),
          encoding: 'base64',
        });
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = () =>
        resolve({
          name: file.name,
          content: String(reader.result ?? ''),
          encoding: 'utf8',
        });
      reader.readAsText(file, 'UTF-8');
    }
  });
}

export function ImportCenter({
  open,
  onClose,
  tenantId,
  storeId,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  storeId: string;
  onImported?: (summary: ImportCommitSummary) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [remapping, setRemapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportPreviewResult | null>(null);
  const [summary, setSummary] = useState<ImportCommitSummary | null>(null);
  const [tab, setTab] = useState<Tab>('vendas');
  const [step, setStep] = useState<Step>('upload');
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [draftKind, setDraftKind] = useState<ImportSheetKind>('products');
  const [draftMap, setDraftMap] = useState<Record<string, number>>({});

  function reset() {
    setError(null);
    setResult(null);
    setSummary(null);
    setLoading(false);
    setCommitting(false);
    setRemapping(false);
    setStep('upload');
    setActiveSheet(null);
    setDraftMap({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose() {
    reset();
    onClose();
  }

  function applyResult(preview: ImportPreviewResult, nextStep?: Step) {
    setResult(preview);
    const p = preview.preview;
    setTab(
      p.sales.length > 0
        ? 'vendas'
        : p.customers.length > 0
          ? 'clientes'
          : 'produtos',
    );

    const sheets = preview.sheets ?? [];
    const focus =
      preview.needsUserChoice?.sheet ??
      sheets.find((s) => s.kind === 'ambiguous' || s.confidence < 0.6)?.name ??
      sheets[0]?.name ??
      null;

    if (focus && sheets.length > 0) {
      const sheet = sheets.find((s) => s.name === focus) ?? sheets[0]!;
      setActiveSheet(sheet.name);
      setDraftKind(sheet.kind === 'ambiguous' ? 'products' : sheet.kind);
      const map: Record<string, number> = {};
      for (const [field, m] of Object.entries(sheet.columnMap)) {
        if (m) map[field] = m.index;
      }
      setDraftMap(map);
      setStep(nextStep ?? (preview.needsUserChoice ? 'map' : 'map'));
    } else {
      setStep(nextStep ?? 'preview');
    }
  }

  async function handleFiles(fileList: FileList | File[] | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((f) =>
      /\.(csv|txt|xml|xlsx|xls)$/i.test(f.name),
    );
    if (files.length === 0) {
      setError('Envie arquivos .csv, .xlsx ou .xml (NF-e/NFC-e).');
      return;
    }

    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const payload = await Promise.all(files.map(readFileAsPayload));
      const preview = await previewImport({ tenantId, storeId, files: payload });
      applyResult(preview);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível processar os arquivos.',
      );
    } finally {
      setLoading(false);
    }
  }

  function selectSheet(sheet: ImportSheetMeta) {
    setActiveSheet(sheet.name);
    setDraftKind(sheet.kind === 'ambiguous' ? 'products' : sheet.kind);
    const map: Record<string, number> = {};
    for (const [field, m] of Object.entries(sheet.columnMap)) {
      if (m) map[field] = m.index;
    }
    setDraftMap(map);
  }

  async function handleConfirmMapping() {
    if (!result || !activeSheet) {
      setStep('preview');
      return;
    }
    setRemapping(true);
    setError(null);
    try {
      const updated = await remapImport({
        tenantId,
        jobId: result.jobId,
        sheetName: activeSheet,
        kind: draftKind === 'ambiguous' ? 'products' : draftKind,
        columnMap: draftMap,
      });
      applyResult(updated, 'preview');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível ajustar o mapeamento.',
      );
    } finally {
      setRemapping(false);
    }
  }

  async function handleCommit() {
    if (!result) return;
    setCommitting(true);
    setError(null);
    try {
      const s = await commitImport(tenantId, result.jobId);
      setSummary(s);
      setResult(null);
      setStep('done');
      onImported?.(s);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Falha ao confirmar importação.',
      );
    } finally {
      setCommitting(false);
    }
  }

  const preview = result?.preview;
  const sheets = result?.sheets ?? [];
  const currentSheet =
    sheets.find((s) => s.name === activeSheet) ?? sheets[0] ?? null;

  const tabs: { key: Tab; label: string; count: number }[] = preview
    ? [
        { key: 'vendas', label: 'Vendas', count: preview.sales.length },
        { key: 'clientes', label: 'Clientes', count: preview.customers.length },
        { key: 'produtos', label: 'Produtos', count: preview.products.length },
      ]
    : [];

  const mappableFields =
    draftKind === 'customers'
      ? ['cliente', 'telefone', 'cpf', 'email']
      : draftKind === 'products'
        ? ['produto', 'sku', 'categoria', 'preco', 'custo', 'estoque']
        : [
            'cliente',
            'telefone',
            'cpf',
            'produto',
            'sku',
            'preco',
            'quantidade',
            'valor_total',
            'data',
          ];

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      title="Importar dados"
      description="Jogue a planilha da loja — a Voltou identifica clientes e produtos automaticamente."
    >
      <div className="space-y-4">
        {step !== 'upload' && step !== 'done' && (
          <ol className="flex gap-2 text-[11px] font-medium text-muted-foreground">
            {[
              { id: 'map', label: '1. Confirmar' },
              { id: 'preview', label: '2. Revisar' },
            ].map((s) => (
              <li
                key={s.id}
                className={`rounded-full px-2.5 py-1 ${
                  step === s.id
                    ? 'bg-accent text-primary'
                    : 'bg-muted/60'
                }`}
              >
                {s.label}
              </li>
            ))}
          </ol>
        )}

        {step === 'upload' && (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
                dragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-muted/30 hover:border-primary/50'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 text-primary"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v12" />
                <path d="m7 8 5-5 5 5" />
                <path d="M5 21h14" />
              </svg>
              <p className="text-sm font-medium text-foreground">
                {loading
                  ? 'Processando…'
                  : 'Arraste arquivos ou clique para escolher'}
              </p>
              <p className="text-xs text-muted-foreground">
                CSV, Excel (.xlsx) ou XML de NF-e — pode enviar vários
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.txt,.xml,.xlsx,.xls,text/csv,text/xml,application/xml,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <p className="text-xs text-muted-foreground">
              Não precisa formatar: detectamos se é lista de clientes, produtos
              ou relatório de vendas. Você confirma antes de gravar.
            </p>
          </>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {step === 'map' && result && currentSheet && (
          <div className="space-y-4">
            {sheets.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {sheets.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => selectSheet(s)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      s.name === currentSheet.name
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {s.name.split(' · ').pop()}
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                O que é este arquivo?
              </p>
              <p className="mt-1 text-sm text-foreground">
                Detectamos:{' '}
                <span className="font-semibold">
                  {KIND_LABELS[currentSheet.kind]}
                </span>
                {currentSheet.confidence < 0.6 && (
                  <span className="text-amber-700"> (baixa confiança — confirme)</span>
                )}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(
                  [
                    'customers',
                    'products',
                    'sales',
                  ] as ImportSheetKind[]
                ).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDraftKind(k)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${
                      draftKind === k
                        ? 'border-primary bg-accent text-primary'
                        : 'border-border bg-card text-foreground hover:border-primary/40'
                    }`}
                  >
                    {KIND_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Suas colunas → campos Voltou
              </p>
              <ul className="space-y-2">
                {mappableFields.map((field) => (
                  <li
                    key={field}
                    className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {FIELD_LABELS[field] ?? field}
                    </span>
                    <select
                      value={draftMap[field] ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraftMap((prev) => {
                          const next = { ...prev };
                          if (v === '') delete next[field];
                          else next[field] = Number(v);
                          return next;
                        });
                      }}
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                    >
                      <option value="">— ignorar —</option>
                      {(currentSheet.headers?.length
                        ? currentSheet.headers
                        : Object.values(currentSheet.columnMap)
                            .filter(Boolean)
                            .sort((a, b) => a!.index - b!.index)
                            .map((m) => m!.header)
                      ).map((label, i) => (
                        <option key={`${label}-${i}`} value={i}>
                          {label || `Coluna ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>

            {currentSheet.sampleRows.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-border">
                <p className="border-b border-border bg-muted/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                  Amostra
                </p>
                <table className="w-full min-w-[320px] text-left text-xs">
                  <tbody className="divide-y divide-border">
                    {currentSheet.sampleRows.slice(0, 3).map((row, i) => (
                      <tr key={i}>
                        {row.slice(0, 6).map((cell, j) => (
                          <td
                            key={j}
                            className="max-w-[8rem] truncate px-2 py-1.5 text-muted-foreground"
                          >
                            {cell || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium"
              >
                Outros arquivos
              </button>
              <button
                type="button"
                disabled={remapping}
                onClick={() => void handleConfirmMapping()}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {remapping ? 'Aplicando…' : 'Continuar para prévia'}
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && preview && (
          <>
            {preview.warnings.length > 0 && (
              <div className="max-h-24 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {preview.warnings.slice(0, 6).map((w) => (
                  <p key={w}>{w}</p>
                ))}
                {preview.warnings.length > 6 && (
                  <p>…e mais {preview.warnings.length - 6} aviso(s).</p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                    tab === t.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label} ({t.count})
                </button>
              ))}
            </div>

            <div className="max-h-64 overflow-auto rounded-xl border border-border">
              {tab === 'vendas' && (
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="sticky top-0 bg-muted/80 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Cliente</th>
                      <th className="px-3 py-2 font-medium">Produto</th>
                      <th className="px-3 py-2 font-medium">Qtde</th>
                      <th className="px-3 py-2 font-medium">Valor</th>
                      <th className="px-3 py-2 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.sales.slice(0, 50).map((s, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          {s.customerName ?? 'Consumidor final'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {s.productName}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {s.quantity}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatCents(s.amountCents)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {s.soldAt
                            ? new Date(s.soldAt).toLocaleDateString('pt-BR')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                    {preview.sales.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-6 text-center text-muted-foreground"
                        >
                          Nenhuma venda detectada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {tab === 'clientes' && (
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="sticky top-0 bg-muted/80 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Nome</th>
                      <th className="px-3 py-2 font-medium">Telefone</th>
                      <th className="px-3 py-2 font-medium">CPF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.customers.slice(0, 50).map((c, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{c.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {c.phone ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {c.cpf
                            ? `•••${c.cpf.replace(/\D/g, '').slice(-4)}`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                    {preview.customers.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-3 py-6 text-center text-muted-foreground"
                        >
                          Nenhum cliente detectado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {tab === 'produtos' && (
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="sticky top-0 bg-muted/80 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Produto</th>
                      <th className="px-3 py-2 font-medium">SKU</th>
                      <th className="px-3 py-2 font-medium">Categoria</th>
                      <th className="px-3 py-2 font-medium">Preço</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.products.slice(0, 50).map((p, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{p.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {p.sku ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {p.category ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatCents(p.priceCents)}
                        </td>
                      </tr>
                    ))}
                    {preview.products.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-6 text-center text-muted-foreground"
                        >
                          Nenhum produto detectado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setStep('map')}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium"
              >
                Ajustar mapeamento
              </button>
              <button
                type="button"
                disabled={committing}
                onClick={() => void handleCommit()}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {committing
                  ? 'Importando…'
                  : `Confirmar (${
                      preview.sales.length +
                      preview.customers.length +
                      preview.products.length
                    } itens)`}
              </button>
            </div>
          </>
        )}

        {step === 'done' && summary && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-accent/50 px-4 py-3 text-sm text-foreground">
              <p className="font-medium">Importação concluída</p>
              <p className="mt-1 text-muted-foreground">
                {summary.salesCreated} venda(s)
                {summary.salesSkipped
                  ? ` (${summary.salesSkipped} já existiam)`
                  : ''}{' '}
                · {summary.customersCreated} cliente(s) novo(s) (
                {summary.customersUpdated} já existiam) ·{' '}
                {summary.productsCreated} produto(s) novo(s) (
                {summary.productsUpdated} atualizados)
              </p>
            </div>
            {summary.warnings.length > 0 && (
              <div className="max-h-24 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {summary.warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium"
              >
                Importar mais
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
              >
                Concluir
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
