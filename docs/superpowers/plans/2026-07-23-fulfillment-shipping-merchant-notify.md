# Fulfillment + Frete Fixo + Aviso WhatsApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No `/loja`, o cliente escolhe retirada ou entrega (frete fixo), paga produtos+frete no Mercado Pago; a Voltou cobra comissão só nos produtos; o lojista vê pedidos no painel e recebe WhatsApp num número de aviso separado do WA de vendas.

**Architecture:** Estender `Store` e `Checkout` (sem entidade `Order`). Helpers puros calculam total cobrado vs comissão e validam endereço/transições. `createTransparentPayment` persiste fulfillment antes do MP; `markPaid` seta `fulfillmentStatus=awaiting` e dispara WhatsApp para `orderNotifyPhoneE164`. Painel `/painel/pedidos` lista e atualiza status.

**Tech Stack:** NestJS + Prisma (SQLite) em `voltou-api`; Next.js App Router em `voltou-web`; Jest unit tests na API; Mercado Pago Checkout transparente; WAHA via `WhatsAppService.send`.

**Spec:** [docs/superpowers/specs/2026-07-23-fulfillment-shipping-merchant-notify-design.md](../specs/2026-07-23-fulfillment-shipping-merchant-notify-design.md)

## Global Constraints

- Comissão Voltou = `round(produtosCents * commissionRateBps / 10000)` — **exclui frete**
- Total MP = `produtosCents + shippingCents` (`shippingCents = 0` se `pickup`)
- Número de aviso ≠ WhatsApp conectado para vendas/IA (`Store.orderNotifyPhoneE164`)
- Sem `orderNotifyPhoneE164` → só painel; `markPaid` não falha
- Sem entidade `Order` neste MVP
- Nunca exibir logo Voltou na `/loja` (padrão existente `StoreBrandMark`)
- Repos: API em `C:/Users/Maurício/Projects/voltou-api`; web em `C:/Users/Maurício/Projects/voltou-web`

## File map

| File | Responsibility |
|------|----------------|
| `voltou-api/prisma/schema.prisma` | Campos Store + Checkout de entrega/fulfillment |
| `voltou-api/src/checkout/fulfillment.ts` | Tipos, parse endereço, transitions, charge totals |
| `voltou-api/src/checkout/fulfillment.spec.ts` | Testes unitários dos helpers |
| `voltou-api/src/stores/stores.controller.ts` | `GET/PATCH /stores/fulfillment` |
| `voltou-api/src/stores/stores.service.ts` | Persistência settings de entrega |
| `voltou-api/src/checkout/checkout.service.ts` | Offer, pay transparente, markPaid, list, patch fulfillment, WA notify |
| `voltou-api/src/checkout/checkout.controller.ts` | List + patch fulfillment |
| `voltou-api/src/checkout/offers.controller.ts` | Body de payments com fulfillment |
| `voltou-api/src/checkout/checkout.module.ts` | Import `WhatsAppModule` |
| `voltou-web/src/lib/api.ts` | Types + clients |
| `voltou-web/src/components/painel/fulfillment-settings-card.tsx` | UI Perfil |
| `voltou-web/src/app/painel/perfil/page.tsx` | Monta o card |
| `voltou-web/src/app/loja/[slug]/[cupom]/page.tsx` | Escolha + endereço + total |
| `voltou-web/src/components/checkout/transparent-checkout-brick.tsx` | Payload fulfillment |
| `voltou-web/src/app/painel/pedidos/page.tsx` | Fila de pedidos |
| `voltou-web/src/components/painel/painel-nav.tsx` | Link Pedidos |

---

### Task 1: Schema Prisma (Store + Checkout)

**Files:**
- Modify: `C:/Users/Maurício/Projects/voltou-api/prisma/schema.prisma` (`Store` ~L38–72, `Checkout` ~L218–274)

**Interfaces:**
- Produces: colunas abaixo disponíveis via Prisma Client após `prisma generate`

- [ ] **Step 1: Add fields to `Store`**

Inside `model Store`, after branding fields:

```prisma
  /// Se false, /loja só oferece retirada
  deliveryEnabled       Boolean  @default(true)
  /// Frete fixo em centavos (0 = grátis)
  shippingCents         Int      @default(0)
  pickupAddressText     String?
  /// WhatsApp E.164 para avisos de pedido (≠ WA de vendas)
  orderNotifyPhoneE164  String?
```

- [ ] **Step 2: Add fields to `Checkout`**

Inside `model Checkout`, after `paidLinesJson` (or near status fields):

```prisma
  /// pickup | delivery | null (até o pay)
  fulfillmentMethod     String?
  shippingCents         Int      @default(0)
  shippingAddressJson   String?
  /// awaiting | ready | shipped | done | null
  fulfillmentStatus     String?
  orderNotifiedAt       DateTime?
```

- [ ] **Step 3: Apply migration locally**

Run (from `voltou-api`):

```bash
npx prisma migrate dev --name fulfillment_shipping_notify
npx prisma generate
```

Expected: migration applied, client regenerated, no schema errors.

- [ ] **Step 4: Commit (api repo)**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): store delivery settings and checkout fulfillment fields"
```

---

### Task 2: Helpers puros de fulfillment (TDD)

**Files:**
- Create: `C:/Users/Maurício/Projects/voltou-api/src/checkout/fulfillment.ts`
- Create: `C:/Users/Maurício/Projects/voltou-api/src/checkout/fulfillment.spec.ts`

**Interfaces:**
- Produces:
  - `ShippingAddress` type
  - `parseShippingAddress(raw: unknown): ShippingAddress` (throws `Error` com mensagem PT)
  - `serializeShippingAddress(a: ShippingAddress): string`
  - `resolveShippingCents(method: 'pickup' | 'delivery', storeShippingCents: number): number`
  - `computeCharge(productsCents: number, shippingCents: number): { chargeCents: number; commissionCents: number }` — **não**; commission precisa de rate → use:
  - `computePaymentAmounts(productsCents: number, shippingCents: number, commissionRateBps: number): { chargeCents: number; commissionCents: number }`
  - `assertFulfillmentTransition(method: 'pickup' | 'delivery', from: string, to: string): void`

- [ ] **Step 1: Write failing tests**

```ts
// fulfillment.spec.ts
import {
  computePaymentAmounts,
  resolveShippingCents,
  parseShippingAddress,
  assertFulfillmentTransition,
} from './fulfillment';

describe('resolveShippingCents', () => {
  it('pickup always 0', () => {
    expect(resolveShippingCents('pickup', 1500)).toBe(0);
  });
  it('delivery uses store fixed fee', () => {
    expect(resolveShippingCents('delivery', 1500)).toBe(1500);
  });
});

describe('computePaymentAmounts', () => {
  it('charges products+shipping but commissions products only', () => {
    const r = computePaymentAmounts(10_000, 1_500, 500);
    expect(r.chargeCents).toBe(11_500);
    expect(r.commissionCents).toBe(500); // 5% of 10000
  });
  it('pickup: charge equals products', () => {
    const r = computePaymentAmounts(10_000, 0, 500);
    expect(r.chargeCents).toBe(10_000);
    expect(r.commissionCents).toBe(500);
  });
});

describe('parseShippingAddress', () => {
  const valid = {
    recipientName: 'Marina Silva',
    phoneE164: '+5511999999999',
    cep: '01310100',
    street: 'Av Paulista',
    number: '1000',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
  };
  it('accepts valid address', () => {
    expect(parseShippingAddress(valid).city).toBe('São Paulo');
  });
  it('rejects missing street', () => {
    expect(() => parseShippingAddress({ ...valid, street: '' })).toThrow(/rua/i);
  });
  it('normalizes CEP digits', () => {
    expect(parseShippingAddress({ ...valid, cep: '01310-100' }).cep).toBe('01310100');
  });
});

describe('assertFulfillmentTransition', () => {
  it('allows pickup awaiting→ready→done', () => {
    expect(() => assertFulfillmentTransition('pickup', 'awaiting', 'ready')).not.toThrow();
    expect(() => assertFulfillmentTransition('pickup', 'ready', 'done')).not.toThrow();
  });
  it('allows awaiting→done shortcut', () => {
    expect(() => assertFulfillmentTransition('delivery', 'awaiting', 'done')).not.toThrow();
  });
  it('rejects pickup shipped', () => {
    expect(() => assertFulfillmentTransition('pickup', 'awaiting', 'shipped')).toThrow();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd C:/Users/Maurício/Projects/voltou-api
npx jest src/checkout/fulfillment.spec.ts -v
```

Expected: FAIL (module not found / exports missing).

- [ ] **Step 3: Implement `fulfillment.ts`**

```ts
export type ShippingAddress = {
  recipientName: string;
  phoneE164: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
};

export type FulfillmentMethod = 'pickup' | 'delivery';
export type FulfillmentStatus = 'awaiting' | 'ready' | 'shipped' | 'done';

export function resolveShippingCents(
  method: FulfillmentMethod,
  storeShippingCents: number,
): number {
  if (method === 'pickup') return 0;
  return Math.max(0, Math.floor(storeShippingCents));
}

export function computePaymentAmounts(
  productsCents: number,
  shippingCents: number,
  commissionRateBps: number,
): { chargeCents: number; commissionCents: number } {
  const products = Math.max(0, Math.floor(productsCents));
  const shipping = Math.max(0, Math.floor(shippingCents));
  return {
    chargeCents: products + shipping,
    commissionCents: Math.round((products * commissionRateBps) / 10000),
  };
}

function reqStr(v: unknown, label: string): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) throw new Error(`Informe ${label}.`);
  return s;
}

export function parseShippingAddress(raw: unknown): ShippingAddress {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Endereço de entrega obrigatório.');
  }
  const o = raw as Record<string, unknown>;
  const cepDigits = String(o.cep ?? '').replace(/\D/g, '');
  if (cepDigits.length !== 8) throw new Error('CEP inválido.');
  const state = reqStr(o.state, 'UF').toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) throw new Error('UF inválida.');
  const phoneRaw = reqStr(o.phoneE164 ?? o.phone, 'telefone');
  const phoneDigits = phoneRaw.replace(/\D/g, '');
  const phoneE164 =
    phoneDigits.startsWith('55') && phoneDigits.length >= 12
      ? `+${phoneDigits}`
      : phoneDigits.length >= 10
        ? `+55${phoneDigits}`
        : phoneRaw.startsWith('+')
          ? `+${phoneDigits}`
          : `+${phoneDigits}`;
  if (phoneDigits.replace(/^55/, '').length < 10) {
    throw new Error('Telefone inválido.');
  }
  const complement =
    typeof o.complement === 'string' && o.complement.trim()
      ? o.complement.trim()
      : undefined;
  return {
    recipientName: reqStr(o.recipientName, 'nome do destinatário'),
    phoneE164,
    cep: cepDigits,
    street: reqStr(o.street, 'rua'),
    number: reqStr(o.number, 'número'),
    complement,
    neighborhood: reqStr(o.neighborhood, 'bairro'),
    city: reqStr(o.city, 'cidade'),
    state,
  };
}

export function serializeShippingAddress(a: ShippingAddress): string {
  return JSON.stringify(a);
}

const ALLOWED: Record<FulfillmentMethod, Partial<Record<FulfillmentStatus, FulfillmentStatus[]>>> = {
  pickup: {
    awaiting: ['ready', 'done'],
    ready: ['done'],
  },
  delivery: {
    awaiting: ['shipped', 'done'],
    shipped: ['done'],
  },
};

export function assertFulfillmentTransition(
  method: FulfillmentMethod,
  from: string,
  to: string,
): void {
  const next = ALLOWED[method]?.[from as FulfillmentStatus];
  if (!next || !next.includes(to as FulfillmentStatus)) {
    throw new Error(`Transição inválida: ${from} → ${to} (${method}).`);
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest src/checkout/fulfillment.spec.ts -v
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/checkout/fulfillment.ts src/checkout/fulfillment.spec.ts
git commit -m "feat(checkout): fulfillment helpers for shipping and commission split"
```

---

### Task 3: API settings de entrega da loja

**Files:**
- Modify: `C:/Users/Maurício/Projects/voltou-api/src/stores/stores.service.ts`
- Modify: `C:/Users/Maurício/Projects/voltou-api/src/stores/stores.controller.ts`
- Modify: `C:/Users/Maurício/Projects/voltou-api/src/common/phone.util.ts` (optional: export `isValidBrMobileE164` if needed; otherwise validate inline)

**Interfaces:**
- Consumes: Prisma `Store` fields from Task 1; `normalizePhoneBr`
- Produces:
  - `getFulfillmentSettings(tenantId, storeId)`
  - `updateFulfillmentSettings(tenantId, storeId, input)`
  - Routes: `GET /stores/fulfillment?tenantId&storeId`, `PATCH /stores/fulfillment`

- [ ] **Step 1: Add service methods**

```ts
export type FulfillmentSettings = {
  storeId: string;
  deliveryEnabled: boolean;
  shippingCents: number;
  pickupAddressText: string | null;
  orderNotifyPhoneE164: string | null;
};

export type FulfillmentSettingsInput = {
  deliveryEnabled?: boolean;
  shippingCents?: number;
  pickupAddressText?: string | null;
  orderNotifyPhoneE164?: string | null;
};

// In StoresService:
async getFulfillmentSettings(tenantId: string, storeId: string): Promise<FulfillmentSettings> {
  const store = await this.prisma.store.findFirst({ where: { id: storeId, tenantId } });
  if (!store) throw new NotFoundException('Loja não encontrada.');
  return {
    storeId: store.id,
    deliveryEnabled: store.deliveryEnabled,
    shippingCents: store.shippingCents,
    pickupAddressText: store.pickupAddressText,
    orderNotifyPhoneE164: store.orderNotifyPhoneE164,
  };
}

async updateFulfillmentSettings(
  tenantId: string,
  storeId: string,
  input: FulfillmentSettingsInput,
): Promise<FulfillmentSettings> {
  const store = await this.prisma.store.findFirst({ where: { id: storeId, tenantId } });
  if (!store) throw new NotFoundException('Loja não encontrada.');

  let orderNotifyPhoneE164: string | null | undefined = undefined;
  if (input.orderNotifyPhoneE164 !== undefined) {
    const raw = input.orderNotifyPhoneE164?.trim() || '';
    if (!raw) {
      orderNotifyPhoneE164 = null;
    } else {
      const e164 = normalizePhoneBr(raw);
      const digits = e164.replace(/\D/g, '');
      if (digits.length < 12 || digits.length > 13) {
        throw new BadRequestException('WhatsApp de aviso inválido.');
      }
      orderNotifyPhoneE164 = e164;
    }
  }

  if (input.shippingCents !== undefined && input.shippingCents < 0) {
    throw new BadRequestException('Frete inválido.');
  }

  const updated = await this.prisma.store.update({
    where: { id: store.id },
    data: {
      ...(input.deliveryEnabled !== undefined ? { deliveryEnabled: input.deliveryEnabled } : {}),
      ...(input.shippingCents !== undefined ? { shippingCents: Math.floor(input.shippingCents) } : {}),
      ...(input.pickupAddressText !== undefined
        ? { pickupAddressText: input.pickupAddressText?.trim() || null }
        : {}),
      ...(orderNotifyPhoneE164 !== undefined ? { orderNotifyPhoneE164 } : {}),
    },
  });

  return {
    storeId: updated.id,
    deliveryEnabled: updated.deliveryEnabled,
    shippingCents: updated.shippingCents,
    pickupAddressText: updated.pickupAddressText,
    orderNotifyPhoneE164: updated.orderNotifyPhoneE164,
  };
}
```

Import `normalizePhoneBr` from `../common/phone.util` and `BadRequestException` / `NotFoundException` as needed.

- [ ] **Step 2: Add controller routes**

```ts
const fulfillmentSchema = z.object({
  tenantId: z.string().uuid(),
  storeId: z.string().uuid(),
  deliveryEnabled: z.boolean().optional(),
  shippingCents: z.number().int().min(0).max(1_000_000).optional(),
  pickupAddressText: z
    .union([z.string().trim().max(500), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v === '' ? null : v)),
  orderNotifyPhoneE164: z
    .union([z.string().trim().max(20), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v === '' ? null : v)),
});

@Get('fulfillment')
getFulfillment(@Query('tenantId') tenantId: string, @Query('storeId') storeId: string) {
  const q = tenantStoreQuery.safeParse({ tenantId, storeId });
  if (!q.success) throw new BadRequestException('tenantId e storeId obrigatórios.');
  return this.storesService.getFulfillmentSettings(q.data.tenantId, q.data.storeId);
}

@Patch('fulfillment')
updateFulfillment(@Body() body: unknown) {
  const parsed = fulfillmentSchema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestException(parsed.error.issues.map((i) => i.message).join(', '));
  }
  const { tenantId, storeId, ...input } = parsed.data;
  return this.storesService.updateFulfillmentSettings(tenantId, storeId, input);
}
```

- [ ] **Step 3: Smoke-test with running API** (or unit-skip if no e2e harness)

```bash
# with API up and valid JWT session as used elsewhere
curl -s "http://127.0.0.1:3010/stores/fulfillment?tenantId=...&storeId=..." -H "Authorization: Bearer ..."
```

Expected: JSON with `deliveryEnabled`, `shippingCents`, etc.

- [ ] **Step 4: Commit**

```bash
git add src/stores/stores.service.ts src/stores/stores.controller.ts
git commit -m "feat(stores): fulfillment and order-notify settings endpoints"
```

---

### Task 4: Pay path — fulfillment no pagamento transparente

**Files:**
- Modify: `C:/Users/Maurício/Projects/voltou-api/src/checkout/checkout.service.ts` (`getPublicOffer`, `createTransparentPayment`, `markPaid`)
- Modify: `C:/Users/Maurício/Projects/voltou-api/src/checkout/offers.controller.ts` (payments body)

**Interfaces:**
- Consumes: `buildPaidLines`, `computePaymentAmounts`, `resolveShippingCents`, `parseShippingAddress`, `serializeShippingAddress`
- Produces: offer fields `deliveryEnabled`, `shippingCents`, `pickupAddressText`; payments accept `fulfillmentMethod` + optional `shippingAddress`; MP `amountCents = chargeCents`; fee = product commission only

- [ ] **Step 1: Extend `getPublicOffer` return**

Load `checkout.store` (include store) and add:

```ts
deliveryEnabled: checkout.store.deliveryEnabled,
shippingCents: checkout.store.shippingCents,
pickupAddressText: checkout.store.pickupAddressText,
```

If `getPublicOffer` currently does not `include: { store: true }`, add it (or separate `findUnique` on store by `checkout.storeId`).

- [ ] **Step 2: Extend `createTransparentPayment` input + validation**

Input adds:

```ts
fulfillmentMethod: 'pickup' | 'delivery';
shippingAddress?: unknown;
```

After `buildPaidLines`:

```ts
const method = input.fulfillmentMethod;
if (method !== 'pickup' && method !== 'delivery') {
  throw new BadRequestException('Escolha retirar na loja ou receber em casa.');
}
const store = await this.prisma.store.findUniqueOrThrow({ where: { id: checkout.storeId } });
if (method === 'delivery' && !store.deliveryEnabled) {
  throw new BadRequestException('Esta loja não oferece entrega no momento.');
}
const shippingCents = resolveShippingCents(method, store.shippingCents);
let shippingAddressJson: string | null = null;
if (method === 'delivery') {
  try {
    shippingAddressJson = serializeShippingAddress(parseShippingAddress(input.shippingAddress));
  } catch (e) {
    throw new BadRequestException(e instanceof Error ? e.message : 'Endereço inválido.');
  }
}
const { chargeCents, commissionCents: feeCents } = computePaymentAmounts(
  total,
  shippingCents,
  checkout.commissionRateBps,
);
```

Use `feeCents` (not raw `commissionCents` from `buildPaidLines` alone is fine — `buildPaidLines.commissionCents` already products-only; prefer `computePaymentAmounts` so charge/fee stay consistent).

Persist before MP call:

```ts
await this.prisma.checkout.update({
  where: { id: checkout.id },
  data: {
    commissionCents: feeCents,
    paidLinesJson: serializePaidLines(lines),
    provider: 'mercadopago',
    fulfillmentMethod: method,
    shippingCents,
    shippingAddressJson,
  },
});
```

Pass to MP:

```ts
amountCents: chargeCents,
commissionCents: feeCents,
```

Return `amountCents: chargeCents`.

- [ ] **Step 3: Update offers controller Zod/body**

Ensure `POST …/payments` forwards:

```ts
fulfillmentMethod: z.enum(['pickup', 'delivery']),
shippingAddress: z.unknown().optional(),
```

- [ ] **Step 4: Update `markPaid` on pending→paid**

In the `checkout.update` when status becomes `paid`:

```ts
data: {
  status: 'paid',
  paidAt,
  amountCents:
    (paidTotalCents > 0 ? paidTotalCents : checkout.amountCents) +
    (checkout.shippingCents ?? 0),
  fulfillmentStatus: checkout.fulfillmentStatus ?? 'awaiting',
  ...(opts?.mpPaymentId ? { mpPaymentId: opts.mpPaymentId } : {}),
},
```

Sales loop stays product-lines only (unchanged). Do **not** create a Sale for shipping.

- [ ] **Step 5: Manual/unit sanity**

```bash
npx jest src/checkout/fulfillment.spec.ts src/checkout/build-paid-lines.spec.ts -v
```

Expected: PASS. (Optional: add one integration comment in PR that charge 11500 / fee 500.)

- [ ] **Step 6: Commit**

```bash
git add src/checkout/checkout.service.ts src/checkout/offers.controller.ts
git commit -m "feat(checkout): pickup/delivery and shipping on transparent pay"
```

---

### Task 5: WhatsApp de aviso no `markPaid`

**Files:**
- Modify: `C:/Users/Maurício/Projects/voltou-api/src/checkout/checkout.module.ts`
- Modify: `C:/Users/Maurício/Projects/voltou-api/src/checkout/checkout.service.ts`

**Interfaces:**
- Consumes: `WhatsAppService.send({ tenantId, storeId, to, body })`
- Produces: `notifyMerchantOrderWhatsApp(checkoutId)` called once per paid transition; sets `orderNotifiedAt`

- [ ] **Step 1: Import WhatsAppModule**

```ts
imports: [
  forwardRef(() => MercadoPagoModule),
  EmailModule,
  WhatsAppModule,
],
```

Inject `WhatsAppService` in `CheckoutService` constructor.

- [ ] **Step 2: Implement private notify**

```ts
private async notifyMerchantOrderWhatsApp(checkoutId: string) {
  const checkout = await this.prisma.checkout.findUnique({
    where: { id: checkoutId },
    include: { customer: true, store: true },
  });
  if (!checkout?.store.orderNotifyPhoneE164) return;
  if (checkout.orderNotifiedAt) return;

  const lines = parsePaidLinesJson(checkout.paidLinesJson); // use existing parser if named differently
  const items =
    lines.length > 0
      ? lines.map((l) => l.productNameSnapshot).join(', ')
      : checkout.productNameSnapshot;
  const productsCents = lines.reduce((s, l) => s + l.amountCents, 0) ||
    Math.max(0, checkout.amountCents - checkout.shippingCents);
  const method = checkout.fulfillmentMethod === 'delivery' ? 'Entrega' : 'Retirada na loja';
  let addressBlock = method;
  if (checkout.fulfillmentMethod === 'delivery' && checkout.shippingAddressJson) {
    const a = JSON.parse(checkout.shippingAddressJson) as ShippingAddress;
    addressBlock = `Entrega: ${a.recipientName}, ${a.street}, ${a.number}${a.complement ? ' ' + a.complement : ''} — ${a.neighborhood}, ${a.city}/${a.state}, CEP ${a.cep}, tel ${a.phoneE164}`;
  } else if (checkout.store.pickupAddressText) {
    addressBlock = `Retirada: ${checkout.store.pickupAddressText}`;
  }

  const body = [
    `Nova venda Voltou · ${checkout.couponCode ?? checkout.id.slice(0, 8)}`,
    items,
    `Produtos: R$ ${(productsCents / 100).toFixed(2)} · Frete: R$ ${(checkout.shippingCents / 100).toFixed(2)} · Total: R$ ${(checkout.amountCents / 100).toFixed(2)}`,
    addressBlock,
    'Abra o painel Pedidos para atualizar o status.',
  ].join('\n');

  await this.whatsapp.send({
    tenantId: checkout.tenantId,
    storeId: checkout.storeId,
    to: checkout.store.orderNotifyPhoneE164,
    body,
  });

  await this.prisma.checkout.update({
    where: { id: checkout.id },
    data: { orderNotifiedAt: new Date() },
  });
}
```

Use the real paid-lines parse helper already in the codebase (`parsePaidLines` / `parsePaidLinesJson` — match existing name in `checkout-addons.ts`).

- [ ] **Step 3: Call beside email notify**

Inside `if (result.didTransitionToPaid)` after email:

```ts
void this.notifyMerchantOrderWhatsApp(result.checkout.id).catch((err) => {
  this.logger.warn(
    `Falha ao enviar WhatsApp de pedido: ${err instanceof Error ? err.message : err}`,
  );
});
```

Keep existing `notifyMerchantPaid` email.

- [ ] **Step 4: Commit**

```bash
git add src/checkout/checkout.module.ts src/checkout/checkout.service.ts
git commit -m "feat(checkout): WhatsApp order notify to separate store phone"
```

---

### Task 6: Listagem + patch de fulfillment (API)

**Files:**
- Modify: `C:/Users/Maurício/Projects/voltou-api/src/checkout/checkout.service.ts`
- Modify: `C:/Users/Maurício/Projects/voltou-api/src/checkout/checkout.controller.ts`

**Interfaces:**
- Produces:
  - `listPaidOrders(tenantId, storeId, fulfillmentStatus?: string)`
  - `updateFulfillmentStatus(checkoutId, tenantId, storeId, status)`
  - `GET /checkouts/orders?tenantId&storeId&fulfillmentStatus?`
  - `PATCH /checkouts/:id/fulfillment` body `{ tenantId, storeId, status }`

- [ ] **Step 1: Service list**

```ts
async listPaidOrders(tenantId: string, storeId: string, fulfillmentStatus?: string) {
  const rows = await this.prisma.checkout.findMany({
    where: {
      tenantId,
      storeId,
      status: 'paid',
      ...(fulfillmentStatus ? { fulfillmentStatus } : {}),
    },
    include: { customer: true },
    orderBy: { paidAt: 'desc' },
    take: 100,
  });
  return rows.map((c) => ({
    id: c.id,
    couponCode: c.couponCode,
    productName: c.productNameSnapshot,
    amountCents: c.amountCents,
    shippingCents: c.shippingCents,
    commissionCents: c.commissionCents,
    fulfillmentMethod: c.fulfillmentMethod,
    fulfillmentStatus: c.fulfillmentStatus,
    shippingAddress: c.shippingAddressJson
      ? (JSON.parse(c.shippingAddressJson) as ShippingAddress)
      : null,
    paidLines: parsePaidLinesJson(c.paidLinesJson),
    customerName: c.customer.displayName,
    paidAt: c.paidAt,
  }));
}
```

- [ ] **Step 2: Service patch**

```ts
async updateFulfillmentStatus(
  checkoutId: string,
  tenantId: string,
  storeId: string,
  status: string,
) {
  const checkout = await this.prisma.checkout.findFirst({
    where: { id: checkoutId, tenantId, storeId, status: 'paid' },
  });
  if (!checkout) throw new NotFoundException('Pedido não encontrado.');
  const method = checkout.fulfillmentMethod;
  if (method !== 'pickup' && method !== 'delivery') {
    throw new BadRequestException('Pedido sem modalidade de entrega.');
  }
  const from = checkout.fulfillmentStatus ?? 'awaiting';
  try {
    assertFulfillmentTransition(method, from, status);
  } catch (e) {
    throw new BadRequestException(e instanceof Error ? e.message : 'Transição inválida.');
  }
  return this.prisma.checkout.update({
    where: { id: checkout.id },
    data: { fulfillmentStatus: status },
  });
}
```

- [ ] **Step 3: Controller routes** (place `GET orders` **before** `:id` routes if any conflict)

```ts
@Get('orders')
listOrders(
  @Query('tenantId') tenantId: string,
  @Query('storeId') storeId: string,
  @Query('fulfillmentStatus') fulfillmentStatus?: string,
) {
  if (!tenantId || !storeId) throw new BadRequestException('tenantId e storeId obrigatórios.');
  return this.checkoutService.listPaidOrders(tenantId, storeId, fulfillmentStatus);
}

@Patch(':id/fulfillment')
patchFulfillment(
  @Param('id') id: string,
  @Body() body: { tenantId?: string; storeId?: string; status?: string },
) {
  if (!body?.tenantId || !body?.storeId || !body?.status) {
    throw new BadRequestException('tenantId, storeId e status obrigatórios.');
  }
  return this.checkoutService.updateFulfillmentStatus(
    id,
    body.tenantId,
    body.storeId,
    body.status,
  );
}
```

Add `Patch`, `Query` imports from `@nestjs/common`.

- [ ] **Step 4: Commit**

```bash
git add src/checkout/checkout.service.ts src/checkout/checkout.controller.ts
git commit -m "feat(checkout): list and update order fulfillment status"
```

---

### Task 7: Web API client

**Files:**
- Modify: `C:/Users/Maurício/Projects/voltou-web/src/lib/api.ts`

**Interfaces:**
- Produces types/helpers used by Tasks 8–10

- [ ] **Step 1: Extend `PublicOffer`**

```ts
deliveryEnabled: boolean;
shippingCents: number;
pickupAddressText: string | null;
```

- [ ] **Step 2: Extend `createTransparentOfferPayment` payload**

```ts
fulfillmentMethod: 'pickup' | 'delivery';
shippingAddress?: {
  recipientName: string;
  phoneE164: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
};
```

- [ ] **Step 3: Add fulfillment settings + orders helpers**

```ts
export type StoreFulfillmentSettings = {
  storeId: string;
  deliveryEnabled: boolean;
  shippingCents: number;
  pickupAddressText: string | null;
  orderNotifyPhoneE164: string | null;
};

export async function getFulfillmentSettings(tenantId: string, storeId: string) {
  return jsonFetch<StoreFulfillmentSettings>(
    `/stores/fulfillment?${tenantStoreQuery(tenantId, storeId)}`,
  );
}

export async function updateFulfillmentSettings(payload: {
  tenantId: string;
  storeId: string;
  deliveryEnabled?: boolean;
  shippingCents?: number;
  pickupAddressText?: string | null;
  orderNotifyPhoneE164?: string | null;
}) {
  return jsonFetch<StoreFulfillmentSettings>('/stores/fulfillment', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export type MerchantOrder = {
  id: string;
  couponCode: string | null;
  productName: string;
  amountCents: number;
  shippingCents: number;
  commissionCents: number;
  fulfillmentMethod: string | null;
  fulfillmentStatus: string | null;
  shippingAddress: {
    recipientName: string;
    phoneE164: string;
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  } | null;
  paidLines: PublicOfferPaidLine[];
  customerName: string;
  paidAt: string | null;
};

export async function listMerchantOrders(
  tenantId: string,
  storeId: string,
  fulfillmentStatus?: string,
) {
  const q = new URLSearchParams({ tenantId, storeId });
  if (fulfillmentStatus) q.set('fulfillmentStatus', fulfillmentStatus);
  return jsonFetch<MerchantOrder[]>(`/checkouts/orders?${q.toString()}`);
}

export async function updateOrderFulfillment(payload: {
  checkoutId: string;
  tenantId: string;
  storeId: string;
  status: 'ready' | 'shipped' | 'done';
}) {
  return jsonFetch(`/checkouts/${encodeURIComponent(payload.checkoutId)}/fulfillment`, {
    method: 'PATCH',
    body: JSON.stringify({
      tenantId: payload.tenantId,
      storeId: payload.storeId,
      status: payload.status,
    }),
  });
}
```

- [ ] **Step 4: Commit (web repo)**

```bash
git add src/lib/api.ts
git commit -m "feat(api-client): fulfillment settings and merchant orders"
```

---

### Task 8: UI Perfil — Entrega e pedidos

**Files:**
- Create: `C:/Users/Maurício/Projects/voltou-web/src/components/painel/fulfillment-settings-card.tsx`
- Modify: `C:/Users/Maurício/Projects/voltou-web/src/app/painel/perfil/page.tsx`

**Interfaces:**
- Consumes: `getFulfillmentSettings`, `updateFulfillmentSettings`
- Produces: card no Perfil

- [ ] **Step 1: Build card** (follow visual patterns of `checkout-branding-card.tsx` / `payment-providers-card.tsx`: same section chrome, existing buttons/inputs)

Fields:
- Toggle `deliveryEnabled`
- Input frete em R$ → persist `Math.round(reais * 100)` as `shippingCents`
- Textarea `pickupAddressText`
- Input WhatsApp aviso + helper text: *Diferente do WhatsApp conectado para falar com clientes*
- Banner if `!orderNotifyPhoneE164`: *Pedidos só aparecem no painel até você cadastrar um WhatsApp de aviso*

- [ ] **Step 2: Mount on perfil page** near payment providers / branding

- [ ] **Step 3: Manual check** — save frete R$15 + phone, reload, values persist

- [ ] **Step 4: Commit**

```bash
git add src/components/painel/fulfillment-settings-card.tsx src/app/painel/perfil/page.tsx
git commit -m "feat(painel): fulfillment settings on profile"
```

---

### Task 9: UI `/loja` — modalidade + endereço + total

**Files:**
- Modify: `C:/Users/Maurício/Projects/voltou-web/src/app/loja/[slug]/[cupom]/page.tsx`
- Modify: `C:/Users/Maurício/Projects/voltou-web/src/components/checkout/transparent-checkout-brick.tsx`

**Interfaces:**
- Consumes: `PublicOffer.deliveryEnabled|shippingCents|pickupAddressText`
- Produces: brick receives `fulfillmentMethod` + `shippingAddress` + `amountCents` = products + shipping

- [ ] **Step 1: State on loja page**

```ts
const [fulfillmentMethod, setFulfillmentMethod] = useState<'pickup' | 'delivery'>(
  offer.deliveryEnabled ? 'delivery' : 'pickup',
);
// prefer default pickup for conversion to free option:
// useState<'pickup' | 'delivery'>('pickup')
```

Default **`pickup`**. If `!offer.deliveryEnabled`, hide delivery radio.

Address form state fields matching `ShippingAddress`.

Compute:

```ts
const productsCents = /* existing selected lines total */;
const shippingCents =
  fulfillmentMethod === 'delivery' ? offer.shippingCents : 0;
const chargeCents = productsCents + shippingCents;
```

Show summary: Produtos / Frete / Total. Show `pickupAddressText` under pickup.

- [ ] **Step 2: Pass into brick**

Extend brick props:

```ts
fulfillmentMethod: 'pickup' | 'delivery';
shippingAddress?: { ... };
amountCents: number; // charge total for brick initialization
```

In `createTransparentOfferPayment` call, include fulfillment fields. Do **not** submit pay if `delivery` and address incomplete (disable CTA / show error).

- [ ] **Step 3: Copy**

Avoid “cupom te espera sem pagar”. Use “Pague agora e retire na loja” / “Pague agora e receba em casa”.

- [ ] **Step 4: Manual test**

1. Pickup → total sem frete → pay  
2. Delivery → fill address → total + frete → pay  
3. Network payload includes `fulfillmentMethod` + `shippingAddress`

- [ ] **Step 5: Commit**

```bash
git add src/app/loja/[slug]/[cupom]/page.tsx src/components/checkout/transparent-checkout-brick.tsx
git commit -m "feat(loja): pickup vs delivery with fixed shipping before pay"
```

---

### Task 10: Painel Pedidos + nav

**Files:**
- Create: `C:/Users/Maurício/Projects/voltou-web/src/app/painel/pedidos/page.tsx`
- Modify: `C:/Users/Maurício/Projects/voltou-web/src/components/painel/painel-nav.tsx`

**Interfaces:**
- Consumes: `listMerchantOrders`, `updateOrderFulfillment`, session tenant/store (same pattern as outras páginas do painel)

- [ ] **Step 1: Add nav item** under `principal` (after Clientes or Produtos):

```ts
{
  href: '/painel/pedidos',
  label: 'Pedidos',
  short: 'Pedidos',
  mobilePrimary: true,
  icon: (
    <svg {...iconProps}>
      <path d="M6 2h12v4H6z" />
      <path d="M4 6h16l-1 14H5L4 6Z" />
      <path d="M9 10h6" />
    </svg>
  ),
},
```

- [ ] **Step 2: Build page**

- Load orders with session `tenantId`/`storeId`
- Filter chips: Todos / Aguardando / Pronto / Enviado / Concluído
- Each row: cupom, cliente, itens, total, frete, modalidade, endereço se delivery
- Actions:
  - pickup + awaiting → buttons Ready / Done
  - delivery + awaiting → Shipped / Done
  - ready/shipped → Done
- Empty state: “Nenhum pedido pago ainda.”

Follow existing painel page layout (header + list, no new design system).

- [ ] **Step 3: Manual E2E**

1. Configure notify phone + frete  
2. Pay delivery on `/loja`  
3. Pedidos shows `awaiting` + address  
4. WhatsApp arrives on notify number (not sales chat as customer)  
5. Mark shipped → done  

- [ ] **Step 4: Commit**

```bash
git add src/app/painel/pedidos/page.tsx src/components/painel/painel-nav.tsx
git commit -m "feat(painel): orders queue with fulfillment actions"
```

---

### Task 11: Deploy VPS (api + web)

**Files:** none (ops)

- [ ] **Step 1: Push both repos `main`** (only if user asked / already the deploy habit)

- [ ] **Step 2: On API VPS** — pull, `prisma migrate deploy`, rebuild/recreate `voltou-api` container

- [ ] **Step 3: On web VPS** — pull, rebuild Next, restart

- [ ] **Step 4: Verify** `GET /mercadopago/health` and open `/painel/pedidos` + perfil fulfillment card

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Store delivery fields + notify phone | 1, 3, 8 |
| Checkout fulfillment fields + orderNotifiedAt | 1, 4, 5 |
| Frete fixo + retirada | 2, 4, 9 |
| Comissão só produtos | 2, 4 |
| `/loja` escolha + endereço | 9 |
| markPaid → awaiting + WA separado | 4, 5 |
| Painel pedidos + transitions | 6, 10 |
| Sem Order entity / sem Melhor Envio / sem mensalidade | honored (non-goals) |

## Self-review notes

- No TBD placeholders.
- `buildPaidLines` remains product-only; shipping added via `computePaymentAmounts`.
- Settings live at `/stores/fulfillment` (existing codebase has no `PATCH /stores/:id`).
- Email notify kept; WhatsApp added as complementary path.
