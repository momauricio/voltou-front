# Checkout Add-ons + Discount Caps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the AI attach optional product add-ons to a checkout link; the customer toggles them on `/loja`; Regras enforce max discount for 1 product vs 2+ products (per item); MP Preference and Sales reflect the final selection.

**Architecture:** Persist `addonsJson` + `paidLinesJson` on `Checkout`. Pure helpers clamp discounts using store-rules caps. `GET/POST` public offer endpoints expose addons and accept `selectedAddonIds` on pay. Mercado Pago Preference accepts multiple items; `Sale.checkoutId` uniqueness is dropped so one checkout can produce multiple sales.

**Tech Stack:** NestJS + Prisma (SQLite) in `voltou-api`; Next.js App Router in `voltou-web`; Jest for API unit tests; Mercado Pago Checkout Pro Preferences.

**Spec:** [docs/superpowers/specs/2026-07-21-checkout-addons-design.md](../specs/2026-07-21-checkout-addons-design.md)

## Global Constraints

- Commission Voltou remains **5%** (`Tenant.commissionRateBps`, default 500) on the **paid total**
- Add-ons are **AI-authored only** in this MVP (no merchant UI to attach addons)
- With 2+ selected lines, **each item’s** discount ≤ `maxDescontoDoisOuMais`
- With only principal selected, principal discount ≤ `maxDescontoUmProduto`
- Never show Voltou logo on customer checkout pages (existing `StoreBrandMark`)
- Defaults if caps unset: um produto `10%`, dois ou mais `15%`

## File map

| File | Responsibility |
|------|----------------|
| `voltou-api/src/checkout/discount-caps.ts` | Parse rules + clamp bps helpers |
| `voltou-api/src/checkout/checkout-addons.ts` | Types + JSON parse/serialize for addons / paid lines |
| `voltou-api/prisma/schema.prisma` | `addonsJson`, `paidLinesJson`; `Sale.checkoutId` non-unique |
| `voltou-api/src/stores/stores.service.ts` | `StoreRules` type fields for caps |
| `voltou-api/src/shared/schemas.ts` | `addons` on create checkout; pay body schema |
| `voltou-api/src/checkout/checkout.service.ts` | Create/get/pay/markPaid with addons |
| `voltou-api/src/checkout/offers.controller.ts` | Pass pay body |
| `voltou-api/src/checkout/payment-provider.ts` | Multi-item preference input |
| `voltou-api/src/mercadopago/mercadopago.client.ts` | Preference `items[]` |
| `voltou-api/src/mercadopago/mercadopago.service.ts` | Forward items to client |
| `voltou-web/src/lib/api.ts` | Types + `payPublicOffer` body |
| `voltou-web/src/app/painel/regras/page.tsx` | Two cap fields |
| `voltou-web/src/app/loja/[slug]/[cupom]/page.tsx` | “Leve também” + total |
| `voltou-web/src/app/obrigado/.../page.tsx` | Show paid lines if present |

---

### Task 1: Discount cap helpers (TDD)

**Files:**
- Create: `C:/Users/Maurício/Projects/voltou-api/src/checkout/discount-caps.ts`
- Create: `C:/Users/Maurício/Projects/voltou-api/src/checkout/discount-caps.spec.ts`

**Interfaces:**
- Produces:
  - `parsePercentToBps(raw: string | number | undefined | null, fallbackPercent: number): number`
  - `getDiscountCapsFromRules(rules: { maxDescontoUmProduto?: string; maxDescontoDoisOuMais?: string; descontoPadrao?: string } | null): { oneProductBps: number; twoOrMoreBps: number }`
  - `clampDiscountBps(bps: number, maxBps: number): number`
  - `effectiveLineAmountCents(listPriceCents: number, discountBps: number): number`

- [ ] **Step 1: Write failing tests**

```typescript
import {
  clampDiscountBps,
  effectiveLineAmountCents,
  getDiscountCapsFromRules,
  parsePercentToBps,
} from './discount-caps';

describe('discount-caps', () => {
  it('parses percent strings to bps', () => {
    expect(parsePercentToBps('15', 10)).toBe(1500);
    expect(parsePercentToBps('10%', 10)).toBe(1000);
  });

  it('uses defaults when rules missing', () => {
    expect(getDiscountCapsFromRules(null)).toEqual({
      oneProductBps: 1000,
      twoOrMoreBps: 1500,
    });
  });

  it('clamps and prices a line', () => {
    expect(clampDiscountBps(2000, 1500)).toBe(1500);
    expect(effectiveLineAmountCents(18900, 1000)).toBe(17010);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd C:/Users/Maurício/Projects/voltou-api && npx jest src/checkout/discount-caps.spec.ts --no-cache`
Expected: FAIL module not found

- [ ] **Step 3: Implement helpers**

```typescript
export function parsePercentToBps(
  raw: string | number | undefined | null,
  fallbackPercent: number,
): number {
  if (raw == null || raw === '') {
    return Math.round(fallbackPercent * 100);
  }
  const n =
    typeof raw === 'number'
      ? raw
      : Number(String(raw).replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || n < 0) return Math.round(fallbackPercent * 100);
  return Math.min(9000, Math.round(n * 100));
}

export function getDiscountCapsFromRules(
  rules: {
    maxDescontoUmProduto?: string;
    maxDescontoDoisOuMais?: string;
  } | null,
): { oneProductBps: number; twoOrMoreBps: number } {
  return {
    oneProductBps: parsePercentToBps(rules?.maxDescontoUmProduto, 10),
    twoOrMoreBps: parsePercentToBps(rules?.maxDescontoDoisOuMais, 15),
  };
}

export function clampDiscountBps(bps: number, maxBps: number): number {
  return Math.max(0, Math.min(bps, maxBps));
}

export function effectiveLineAmountCents(
  listPriceCents: number,
  discountBps: number,
): number {
  return Math.max(
    1,
    Math.round(listPriceCents * (1 - discountBps / 10000)),
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx jest src/checkout/discount-caps.spec.ts --no-cache`
Expected: PASS

- [ ] **Step 5: Commit** (if git identity configured)

```bash
git add src/checkout/discount-caps.ts src/checkout/discount-caps.spec.ts
git commit -m "feat(api): add discount cap helpers for checkout addons"
```

---

### Task 2: Addon types + Prisma schema

**Files:**
- Create: `C:/Users/Maurício/Projects/voltou-api/src/checkout/checkout-addons.ts`
- Modify: `C:/Users/Maurício/Projects/voltou-api/prisma/schema.prisma` (`Checkout`, `Sale`)

**Interfaces:**
- Produces:
  - `CheckoutAddon`, `PaidLine` types
  - `parseAddonsJson(raw: string | null): CheckoutAddon[]`
  - `serializeAddons(addons: CheckoutAddon[]): string`
  - `parsePaidLinesJson(raw: string | null): PaidLine[]`

- [ ] **Step 1: Add types module**

```typescript
export type CheckoutAddon = {
  id: string;
  productId: string;
  productNameSnapshot: string;
  listPriceCents: number;
  discountBps: number;
  selectedByDefault: boolean;
};

export type PaidLine = {
  kind: 'principal' | 'addon';
  addonId?: string;
  productId: string;
  productNameSnapshot: string;
  listPriceCents: number;
  discountBps: number;
  amountCents: number;
};

export function parseAddonsJson(raw: string | null | undefined): CheckoutAddon[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as CheckoutAddon[]) : [];
  } catch {
    return [];
  }
}

export function serializeAddons(addons: CheckoutAddon[]): string {
  return JSON.stringify(addons);
}

export function parsePaidLinesJson(raw: string | null | undefined): PaidLine[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as PaidLine[]) : [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Schema changes**

On `Checkout` add:
```prisma
  addonsJson    String?
  paidLinesJson String?
```

On `Sale` change:
```prisma
  checkoutId String?
  // remove @unique from checkoutId
```
Add index:
```prisma
  @@index([checkoutId])
```

- [ ] **Step 3: Push schema**

Run: `cd C:/Users/Maurício/Projects/voltou-api && npx prisma db push && npx prisma generate`
Expected: sync OK

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma src/checkout/checkout-addons.ts
git commit -m "feat(api): persist checkout addons and allow multi-sale per checkout"
```

---

### Task 3: StoreRules caps in API + Regras UI

**Files:**
- Modify: `C:/Users/Maurício/Projects/voltou-api/src/stores/stores.service.ts` (`StoreRules` type ~L14-26)
- Modify: `C:/Users/Maurício/Projects/voltou-web/src/app/painel/regras/page.tsx`
- Modify: `C:/Users/Maurício/Projects/voltou-web/src/lib/api.ts` (`StoreRules` type if duplicated)

**Interfaces:**
- Extends `StoreRules` with `maxDescontoUmProduto?: string` and `maxDescontoDoisOuMais?: string`

- [ ] **Step 1: Extend API `StoreRules` type**

```typescript
export type StoreRules = {
  // ...existing
  descontoPadrao?: string;
  margemMaxima?: string;
  maxDescontoUmProduto?: string;
  maxDescontoDoisOuMais?: string;
  // ...
};
```

- [ ] **Step 2: Regras page — state, defaults, form fields**

Defaults:
```typescript
maxDescontoUmProduto: '10',
maxDescontoDoisOuMais: '15',
```

UI (near existing discount fields): two number inputs labeled:
- “Máx. desconto — 1 produto (%)”
- “Máx. desconto — 2 ou mais produtos (%)”

Include both in `payload` on save and in `applyRules`.

Help text: “A IA não oferece cupom acima desses tetos. Com 2+ itens no checkout, o teto de 2+ vale para cada item.”

- [ ] **Step 3: Manual check**

Run web locally, open `/painel/regras`, save `12` / `18`, reload — values persist via API.

- [ ] **Step 4: Commit**

```bash
git add src/stores/stores.service.ts
# from voltou-web:
git add src/app/painel/regras/page.tsx src/lib/api.ts
git commit -m "feat: store max discount caps for 1 vs 2+ products in rules"
```

---

### Task 4: Create checkout with addons + public GET

**Files:**
- Modify: `C:/Users/Maurício/Projects/voltou-api/src/shared/schemas.ts` (`createCheckoutSchema`)
- Modify: `C:/Users/Maurício/Projects/voltou-api/src/checkout/checkout.service.ts` (`create`, `getPublicOffer`)

**Interfaces:**
- Create body addons: `{ productId: string; discountBps: number; selectedByDefault?: boolean }[]`
- `getPublicOffer` returns `addons: { id, productName, listPriceCents, amountCents, discountBps, selectedByDefault }[]` and `discountCaps: { oneProductBps, twoOrMoreBps }`

- [ ] **Step 1: Extend Zod schema**

```typescript
addons: z
  .array(
    z.object({
      productId: z.string().uuid(),
      discountBps: z.number().int().min(0).max(9000),
      selectedByDefault: z.boolean().optional().default(false),
    }),
  )
  .max(5)
  .optional()
  .default([]),
discountBps: z.number().int().min(0).max(9000).optional(),
```

(If `discountBps` omitted, keep using rules `descontoPadrao` as today.)

- [ ] **Step 2: In `create`, load caps and build addons**

Pseudo-flow:
1. Load store rules via existing `STORE_RULES_TITLE` knowledge row
2. `caps = getDiscountCapsFromRules(rules)`
3. Principal `discountBps = clamp(requested or descontoPadrao, caps.oneProductBps)`
4. For each addon input: load product; `discountBps = clamp(input.discountBps, caps.twoOrMoreBps)`; push `CheckoutAddon` with `id: randomUUID()`
5. Persist `addonsJson: serializeAddons(addons)`

- [ ] **Step 3: Extend `getPublicOffer` response**

Parse addons; map public DTO with `amountCents = effectiveLineAmountCents(list, discountBps)`; include `discountCaps`.

- [ ] **Step 4: Smoke via curl / script** (with seeded products)

Create checkout with 1 addon; GET public offer returns addon array.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(api): create and expose checkout addons on public offer"
```

---

### Task 5: Pay with selectedAddonIds + multi-item MP Preference

**Files:**
- Modify: `C:/Users/Maurício/Projects/voltou-api/src/checkout/offers.controller.ts`
- Modify: `C:/Users/Maurício/Projects/voltou-api/src/checkout/checkout.service.ts` (`payPublicOffer`)
- Modify: `C:/Users/Maurício/Projects/voltou-api/src/checkout/payment-provider.ts`
- Modify: `C:/Users/Maurício/Projects/voltou-api/src/mercadopago/mercadopago.client.ts`
- Modify: `C:/Users/Maurício/Projects/voltou-api/src/mercadopago/mercadopago.service.ts`

**Interfaces:**
- `payPublicOffer(slug, coupon, selectedAddonIds?: string[])`
- `CreatePaymentLinkInput.items?: { id: string; title: string; amountCents: number }[]` — when present, client uses them instead of single title/amount
- On pay success path: set `paidLinesJson`, update `amountCents`/`commissionCents` on checkout to paid total (snapshot)

- [ ] **Step 1: Controller accepts body**

```typescript
@Post('public/:storeSlug/:coupon/pay')
pay(@Param() ..., @Body() body: { selectedAddonIds?: string[] }) {
  return this.checkoutService.payPublicOffer(
    storeSlug,
    coupon,
    body?.selectedAddonIds ?? [],
  );
}
```

- [ ] **Step 2: Build paid lines in service**

```typescript
const addons = parseAddonsJson(checkout.addonsJson);
const selected = addons.filter((a) => selectedAddonIds.includes(a.id));
const multi = selected.length >= 1;
const caps = /* from rules */;
const maxBps = multi ? caps.twoOrMoreBps : caps.oneProductBps;

const principalBps = clampDiscountBps(checkout.discountBps, maxBps);
const lines: PaidLine[] = [
  {
    kind: 'principal',
    productId: checkout.productId!,
    productNameSnapshot: checkout.productNameSnapshot,
    listPriceCents: checkout.listPriceCents ?? checkout.amountCents,
    discountBps: principalBps,
    amountCents: effectiveLineAmountCents(
      checkout.listPriceCents ?? checkout.amountCents,
      principalBps,
    ),
  },
  ...selected.map((a) => {
    const bps = clampDiscountBps(a.discountBps, maxBps);
    return {
      kind: 'addon' as const,
      addonId: a.id,
      productId: a.productId,
      productNameSnapshot: a.productNameSnapshot,
      listPriceCents: a.listPriceCents,
      discountBps: bps,
      amountCents: effectiveLineAmountCents(a.listPriceCents, bps),
    };
  }),
];
const total = lines.reduce((s, l) => s + l.amountCents, 0);
const commissionCents = Math.round((total * checkout.commissionRateBps) / 10000);
```

Persist `paidLinesJson`, update checkout amounts, create Preference with `items: lines.map(...)`.

- [ ] **Step 3: MP client multi-items**

```typescript
items: input.items?.map((it) => ({
  id: it.id,
  title: it.title.slice(0, 256),
  quantity: 1,
  currency_id: 'BRL',
  unit_price: Number((it.amountCents / 100).toFixed(2)),
})) ?? [ /* existing single item */ ],
marketplace_fee: Number((input.marketplaceFeeCents / 100).toFixed(2)),
```

- [ ] **Step 4: Test pay path**

With stub/MP sandbox: pay with and without addon ids; verify preference totals (log or MP dashboard).

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(api): recalculate MP preference from selected checkout addons"
```

---

### Task 6: markPaid creates one Sale per paid line

**Files:**
- Modify: `C:/Users/Maurício/Projects/voltou-api/src/checkout/checkout.service.ts` (`markPaid`)

- [ ] **Step 1: Replace single sale.create**

```typescript
const lines = parsePaidLinesJson(checkout.paidLinesJson);
const toCreate =
  lines.length > 0
    ? lines
    : [
        {
          kind: 'principal' as const,
          productId: checkout.productId!,
          productNameSnapshot: checkout.productNameSnapshot,
          listPriceCents: checkout.listPriceCents ?? checkout.amountCents,
          discountBps: checkout.discountBps,
          amountCents: checkout.amountCents,
        },
      ];

for (const line of toCreate) {
  if (!line.productId) continue;
  const lineCommission = Math.round(
    (line.amountCents * checkout.commissionRateBps) / 10000,
  );
  await this.prisma.sale.create({
    data: {
      tenantId: checkout.tenantId,
      storeId: checkout.storeId,
      customerId: checkout.customerId,
      productId: line.productId,
      amountCents: line.amountCents,
      source: checkout.createdBy === 'ai' ? 'ai' : 'checkout_link',
      status: 'completed',
      checkoutId: checkout.id,
      commissionCents: lineCommission,
      commissionRateBps: checkout.commissionRateBps,
      mpPaymentId: opts?.mpPaymentId ?? null,
      soldAt: paidAt,
    },
  });
}
```

- [ ] **Step 2: Guard duplicate markPaid** — if already `paid`, return early (existing); ensure no double sales on webhook retries (check existing sales for checkoutId before insert, or rely on paid status only).

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(api): create one sale per paid checkout line including addons"
```

---

### Task 7: Web `/loja` add-on UI + API client

**Files:**
- Modify: `C:/Users/Maurício/Projects/voltou-web/src/lib/api.ts`
- Modify: `C:/Users/Maurício/Projects/voltou-web/src/app/loja/[slug]/[cupom]/page.tsx`
- Modify: `C:/Users/Maurício/Projects/voltou-web/src/app/obrigado/[slug]/[cupom]/page.tsx` (optional summary)

- [ ] **Step 1: Types**

Extend `PublicOffer` with `addons` and `discountCaps`.  
Change `payPublicOffer(slug, coupon, selectedAddonIds?: string[])` to POST JSON body.

- [ ] **Step 2: Loja page state**

```typescript
const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
// after offer loads:
setSelectedAddonIds(
  offer.addons.filter((a) => a.selectedByDefault).map((a) => a.id),
);
```

Render “Leve também” checkboxes; compute live total = principal.amountCents + sum selected addon amountCents.

CTA calls `payPublicOffer(slug, cupom, selectedAddonIds)`.

- [ ] **Step 3: Visual check**

Seed/create checkout with addon via API; open `/loja/...`; toggle; confirm total changes.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(web): optional Leve também addons on loja checkout"
```

---

### Task 8: Deploy + demo fixture (optional but recommended)

**Files:** scripts under `%TEMP%/voltou-ssh` or one-off docker exec

- [ ] **Step 1: Deploy API then web** (existing `deploy-*.js` pattern; `db push` on API container if needed)
- [ ] **Step 2: Ensure Regras caps saved on test store**
- [ ] **Step 3: Create demo checkout with principal + meia addon** for `principal` slug; paste URL for QA
- [ ] **Step 4: Verify** pay blocked without MP still shows UI; with MP, preference has 2 items when checked

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Regras max 1 / max 2+ | Task 3 |
| Cap helpers + per-item clamp | Task 1, 4, 5 |
| addonsJson on Checkout | Task 2 |
| AI create with addons | Task 4 |
| GET public addons | Task 4 |
| Pay selectedAddonIds + MP multi-item | Task 5 |
| paidLinesJson freeze | Task 5 |
| Multiple Sales per checkout | Task 2 + 6 |
| `/loja` Leve também UI | Task 7 |
| AI-only authoring (no merchant addon UI) | Non-goal honored |
| 5% commission on total | Task 5/6 |

## Placeholder scan

No TBD / “implement later” steps remaining.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-21-checkout-addons.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
