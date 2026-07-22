# Checkout add-ons (bundle opcional) + tetos de desconto nas Regras

**Date:** 2026-07-21  
**Status:** Approved in conversation; awaiting final spec review  
**Repos:** voltou-web + voltou-api  
**Approach:** A — add-ons persistidos no Checkout; só a IA monta; cliente marca opcionalmente na `/loja`

---

## Goal

Permitir que a IA, ao gerar o link de checkout, anexe **add-ons opcionais** (“Leve também”). O cliente decide na página `/loja/[slug]/[cupom]` se leva o(s) extra(s). O total e a Preference do Mercado Pago são recalculados no pay.

O lojista define nas **Regras** dois tetos de desconto que a IA (e o servidor) devem respeitar:

1. Máximo em **1 produto**
2. Máximo em **2+ produtos** (aplica-se a **cada item** quando o pedido tiver 2 ou mais itens selecionados)

Comissão Voltou permanece **5%** sobre o total pago (`marketplace_fee`).

---

## Non-goals (MVP)

- UI do lojista para montar add-ons manualmente na ficha do cliente
- Catálogo global / reutilizável de bundles
- Pacote fechado (oferta única sem checkbox)
- Foto de produto nos add-ons (pode reutilizar placeholder atual)

---

## Business rules

### Regras da loja (`StoreKnowledge` / store-rules JSON)

| Field (proposed) | Type | Meaning |
|------------------|------|---------|
| `maxDescontoUmProduto` | string or number (percent, e.g. `"10"`) | Cap % for single-item offers |
| `maxDescontoDoisOuMais` | string or number (percent, e.g. `"15"`) | Cap % **per item** when 2+ items are in the paid selection |

Existing fields:

- `descontoPadrao` — suggested default % for the AI (not a hard cap)
- `margemMaxima` — keep as-is for now; do not conflate with the two new caps in MVP (document mapping if UI copy needs to unify later)

**Enforcement:**

- On checkout create: if only principal → each discount ≤ `maxDescontoUmProduto`
- Addon `discountBps` stored must be ≤ `maxDescontoDoisOuMais` (addons only apply when a second item can be selected)
- On pay with `selectedAddonIds.length >= 1`: clamp **every** selected line (principal + addons) to `maxDescontoDoisOuMais`
- On pay with no addons selected: principal stays at its stored single-item discount (≤ `maxDescontoUmProduto`)

Defaults if unset: e.g. um produto `10`, dois ou mais `15` (align with current `descontoPadrao` habit).

---

## Data model

### `Checkout` (extend)

Keep current principal fields. Add structured addons persistence:

**Option chosen:** JSON column on `Checkout` for MVP simplicity (SQLite-friendly), validated on write:

```ts
type CheckoutAddon = {
  id: string;              // uuid stable for client selection
  productId: string;
  productNameSnapshot: string;
  listPriceCents: number;
  discountBps: number;     // AI-suggested, already capped for 2+ context
  selectedByDefault: boolean; // default false
};
```

Field: `addonsJson String?` — `JSON.stringify(CheckoutAddon[])` or `null`/`[]`.

Alternative normalized `CheckoutAddon` table is fine if preferred in implementation; behavior must match this shape.

### Sales on payment

When paid with addons:

- Prefer **one Sale per product line** (principal + each selected addon), all linked to same `checkoutId` where schema allows  
- **Schema note:** today `Sale.checkoutId` is `@unique` — MVP must either:
  - **(Preferred)** relax to non-unique `checkoutId` + multiple sales, or
  - store addon lines in `Sale` metadata / a new `SaleLine` table

Implementation must pick one and migrate; recommended: drop `@unique` on `Sale.checkoutId` and allow multiple sales per checkout.

---

## Public UX (`/loja/[slug]/[cupom]`)

Order:

1. Store brand mark  
2. Principal product (De / Por / coupon)  
3. If `addons.length > 0`: section **“Leve também”** with checkbox per addon (name, De/Por or % off)  
4. Live **total** reflecting selection  
5. CTA “Garantir meu desconto” → pay with selected addon ids  

If no addons, page unchanged from current behavior.

`/obrigado` and `/aguardando`: show principal + selected addons summary when available (status payload).

---

## Painel — Regras UI

Add two numeric percent fields:

- “Máx. desconto — 1 produto”
- “Máx. desconto — 2 ou mais produtos”

Persist into store-rules JSON. Help text: a IA não pode oferecer cupom acima desses tetos; com 2+ itens, o teto de 2+ vale para cada item.

---

## API

### Create checkout (AI / existing `POST /checkouts`)

Extend body:

```json
{
  "productId": "uuid",
  "discountBps": 1000,
  "addons": [
    {
      "productId": "uuid",
      "discountBps": 1500,
      "selectedByDefault": false
    }
  ]
}
```

Server validates products belong to store, applies caps, snapshots names/prices, generates coupon URL as today. Requires MP connected + productId (existing rules).

### `GET /offers/public/:slug/:coupon`

Response adds:

```json
{
  "addons": [ { "id", "productName", "listPriceCents", "amountCents", "discountBps", "selectedByDefault" } ],
  "discountCaps": { "oneProductBps": 1000, "twoOrMoreBps": 1500 }
}
```

Principal amounts remain as today. `amountCents` on each addon = list after that line’s `discountBps`.

### `POST /offers/public/:slug/:coupon/pay`

Body (optional):

```json
{ "selectedAddonIds": ["uuid", "..."] }
```

Steps:

1. Resolve checkout  
2. Build line items: principal + matching addons  
3. If 2+ lines, clamp each line’s effective discount to `maxDescontoDoisOuMais`  
4. Sum totals; recompute `commissionCents` at tenant rate (5%)  
5. Create/replace MP Preference with multiple `items` (or single aggregated title if MP constraints — prefer multiple items when possible)  
6. Return `{ checkout_url }`

Idempotency: regenerating preference when selection changes is expected; store latest `providerInitPoint` / `providerRef`.

### Webhook

Unchanged entrypoint; `markPaid` creates sales for all lines that were included in the paid preference. Implementation detail: persist `selectedAddonIds` (or frozen line snapshot) on checkout at pay time so webhook/markPaid knows what was charged.

Suggested field: `paidLinesJson` set on successful preference creation / pay — snapshot of lines and amounts actually sent to MP.

---

## AI contract (later agent)

When customer shows interest in product A, agent may attach complementary product B with `discountBps ≤ maxDescontoDoisOuMais`, `selectedByDefault: false`, and mention both in WhatsApp copy + `{{link}}`.

No merchant UI for assembling addons in this MVP.

---

## Testing (acceptance)

1. Regras: save both caps; reload persists  
2. Create checkout with addon over 2+ cap → rejected or clamped  
3. `/loja` shows “Leve também”; total updates on toggle  
4. Pay without addon → MP amount = principal only; single-item cap  
5. Pay with addon → MP amount = sum; each line ≤ 2+ cap; commission 5% of total  
6. Webhook → sale line(s) recorded; dashboard recovered revenue includes addon  
7. Checkout without addons → identical UX to pre-feature  

---

## Open implementation notes (resolved preferences)

- Persist addons as JSON on Checkout for speed  
- Multiple `Sale` rows per checkout (drop unique on `checkoutId`)  
- Freeze paid lines at pay time (`paidLinesJson`)  
- AI-only authoring of addons  

---

## Out of scope follow-ups

- Merchant-picked addons in customer sheet  
- Bundle catalog  
- Product images on offer page  
- Closed fixed package SKU  
