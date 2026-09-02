import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const listPage = readFileSync(
  new URL('../app/painel/clientes/page.tsx', import.meta.url),
  'utf8',
);
const fichaPage = readFileSync(
  new URL('../app/painel/clientes/[id]/page.tsx', import.meta.url),
  'utf8',
);

function extractFunction(source: string, name: string): string {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const rest = source.slice(start);
  const nextFn = rest.indexOf('\nfunction ', 1);
  return nextFn === -1 ? rest : rest.slice(0, nextFn);
}

describe('merchant Clientes list actions', () => {
  it('mobile cards and desktop rows expose Ver ficha only — no kebab', () => {
    assert.match(listPage, /Ver ficha/);
    assert.equal(listPage.includes('Mais ações'), false);
    assert.equal(listPage.includes('menuOpenId'), false);
    assert.equal(listPage.includes('onToggleMenu'), false);
    assert.equal(listPage.includes('function MenuItem'), false);
    assert.equal(listPage.includes('type MenuAcao'), false);

    const card = extractFunction(listPage, 'ClienteCard');
    const row = extractFunction(listPage, 'ClienteRow');

    for (const [name, block] of [
      ['ClienteCard', card],
      ['ClienteRow', row],
    ] as const) {
      assert.match(block, />\s*Ver ficha\s*</, `${name} must keep Ver ficha`);
      assert.equal(block.includes('Registrar interesse'), false, name);
      assert.equal(block.includes('Ver histórico'), false, name);
      assert.equal(block.includes('Remover'), false, name);
      assert.equal(block.includes('cx="12" cy="5"'), false, name);
      assert.equal(
        [...block.matchAll(/>\s*Ver ficha\s*</g)].length,
        1,
        `${name} must show Ver ficha once`,
      );
    }
  });

  it('does not leave list-level remove or kebab navigation helpers', () => {
    const inner = extractFunction(listPage, 'ClientesPageInner');
    assert.equal(inner.includes('handleRemoveCliente'), false);
    assert.equal(inner.includes('navigateAcao'), false);
    assert.equal(inner.includes('deleteApiCustomer'), false);
    assert.equal(inner.includes('removeCustomer'), false);
  });
});

describe('customer ficha keeps the moved actions', () => {
  it('keeps Registrar interesse and the unified history section', () => {
    assert.match(fichaPage, /label="Registrar interesse"/);
    assert.match(fichaPage, /id="historico"/);
    assert.match(fichaPage, /Histórico unificado/);
  });

  it('exposes Remover with confirm, then returns to the list', () => {
    const handler = extractFunction(fichaPage, 'handleRemoveCliente');
    assert.match(
      handler,
      /Remover este cliente da base da loja\? Esta ação não pode ser desfeita\./,
    );
    assert.match(handler, /window\.confirm/);
    assert.match(handler, /deleteApiCustomer/);
    assert.match(handler, /removeCustomer/);
    assert.match(handler, /router\.push\('\/painel\/clientes'\)/);

    assert.match(fichaPage, /onClick=\{\(\) => void handleRemoveCliente\(\)\}/);
    assert.match(fichaPage, /\{removing \? 'Removendo…' : 'Remover'\}/);
  });
});

describe('lojista dispatch guard stays locked', () => {
  it('createApiCheckout still asserts the lojista cannot dispatch', () => {
    const api = readFileSync(new URL('./api.ts', import.meta.url), 'utf8');
    const start = api.indexOf('export async function createApiCheckout');
    assert.ok(start >= 0, 'createApiCheckout must exist');
    const rest = api.slice(start);
    const nextExport = rest.indexOf('\nexport ', 1);
    const body = nextExport === -1 ? rest : rest.slice(0, nextExport);
    assert.match(body, /assertLojistaCannotDispatch/);
  });
});
