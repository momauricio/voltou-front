#!/usr/bin/env node
/**
 * Guards the lojista panel: no campaign/dispatch/payment-link UI entry points.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = join(root, 'src/lib/lojista-panel-policy.ts');
const policy = readFileSync(policyPath, 'utf8');

const forbidden = [
  '/painel/campanhas',
  'Novo disparo',
  'Disparar WhatsApp',
  'Enviar link de pagamento',
  'Disparar a 1ª recuperação',
  'disparos ficam em Campanhas',
  'Ir às campanhas',
  'Mais opções',
  'Fila de campanhas',
  'Fila de aprovação',
  'Fila de envio',
];

for (const needle of forbidden) {
  if (!policy.includes(`'${needle}'`)) {
    throw new Error(`Policy missing forbidden token: ${needle}`);
  }
}

if (!policy.includes('export function assertLojistaCannotDispatch')) {
  throw new Error('Policy is missing assertLojistaCannotDispatch');
}

const scanRoots = [
  join(root, 'src/app/painel'),
  join(root, 'src/components/painel'),
];

const allowHrefIn = new Set([
  'src/app/painel/campanhas/page.tsx',
]);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (['.ts', '.tsx', '.js', '.jsx'].includes(extname(name))) files.push(full);
  }
  return files;
}

const files = scanRoots.flatMap((dir) => walk(dir));
const hits = [];

for (const file of files) {
  const rel = relative(root, file);
  const text = readFileSync(file, 'utf8');
  for (const needle of forbidden) {
    if (!text.includes(needle)) continue;
    if (needle === '/painel/campanhas' && allowHrefIn.has(rel)) continue;
    hits.push(`${rel}: ${needle}`);
  }
}

if (hits.length) {
  throw new Error(
    `Lojista panel still exposes dispatch/campaign UI:\n${hits.map((h) => `  - ${h}`).join('\n')}`,
  );
}

const api = readFileSync(join(root, 'src/lib/api.ts'), 'utf8');
for (const fn of [
  'createCampaign',
  'approveOutreachMessage',
  'rejectOutreachMessage',
  'approveAllOutreach',
  'createApiCheckout',
]) {
  const re = new RegExp(`export async function ${fn}[\\s\\S]*?assertLojistaCannotDispatch`);
  if (!re.test(api)) {
    throw new Error(`${fn} is not gated by assertLojistaCannotDispatch`);
  }
}

const onboarding = readFileSync(
  join(root, 'src/components/painel/onboarding-wizard.tsx'),
  'utf8',
);
if (!onboarding.includes("id: 'whatsapp'")) {
  throw new Error('Onboarding lost the WhatsApp step');
}
if (!onboarding.includes('optional: true')) {
  throw new Error('WhatsApp onboarding step must be optional');
}
if (onboarding.includes('Disparar a 1ª recuperação')) {
  throw new Error('Onboarding still requires the first blast');
}

const regras = readFileSync(join(root, 'src/app/painel/regras/page.tsx'), 'utf8');
if (regras.includes("localStorage.setItem('voltou_regras'")) {
  throw new Error('Regras still persist to localStorage');
}
if (!regras.includes('saveStoreRules')) {
  throw new Error('Regras must persist via saveStoreRules');
}
if (!regras.includes('canSave') || !regras.includes("loadState === 'ready'")) {
  throw new Error('Regras must refuse save until the account rules load');
}

const clientes = readFileSync(join(root, 'src/app/painel/clientes/page.tsx'), 'utf8');
if (clientes.includes('>Disparo<') || clientes.includes('Disparo {')) {
  throw new Error('Clientes list still labels outreach as Disparo');
}

const nav = readFileSync(join(root, 'src/components/painel/painel-nav.tsx'), 'utf8');
const navItemHrefs = [...nav.matchAll(/href: '(\/painel(?:\/[a-z]+)?)'/g)].map(
  (m) => m[1],
);
const expectedNavHrefs = [
  '/painel',
  '/painel/clientes',
  '/painel/produtos',
  '/painel/pedidos',
  '/painel/regras',
];
if (JSON.stringify(navItemHrefs) !== JSON.stringify(expectedNavHrefs)) {
  throw new Error(
    `Painel nav must be exactly ${expectedNavHrefs.join(', ')}; got ${navItemHrefs.join(', ') || '(none)'}`,
  );
}
if (!nav.includes("label: 'Dashboard'")) {
  throw new Error('First-class nav must label the home tab Dashboard');
}
if (nav.includes("short: 'Início'") || /short:\s*'Início'/.test(nav)) {
  throw new Error('Painel nav must not use Início as a mobile short label');
}
if (/href=["']\/painel\/whatsapp/.test(nav) || /href=["']\/painel\/campanhas/.test(nav)) {
  throw new Error('Painel nav still links WhatsApp or Campanhas as a tab');
}
if (/\bMais\b/.test(nav) && /aria-expanded/.test(nav)) {
  throw new Error('Painel nav still has a Mais overflow tab');
}

if (onboarding.includes("href: '/painel/whatsapp'")) {
  throw new Error('Onboarding WhatsApp step must open Perfil, not a WhatsApp tab');
}

const perfil = readFileSync(join(root, 'src/app/painel/perfil/page.tsx'), 'utf8');
if (!perfil.includes('WhatsappConnectCard')) {
  throw new Error('Perfil must host WhatsApp connect');
}
if (!perfil.includes('Sair')) {
  throw new Error('Perfil must include Sair');
}

const waPage = readFileSync(join(root, 'src/app/painel/whatsapp/page.tsx'), 'utf8');
if (!waPage.includes("redirect('/painel/perfil")) {
  throw new Error('/painel/whatsapp must redirect to Perfil');
}

console.log(
  `ok: scanned ${files.length} painel files, dispatch UI gone, Mais sheet gone, WhatsApp lives on Perfil`,
);
