# Landing Copy — Vendedor WhatsApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition the public landing from “recompra reminder” to **vendedor WhatsApp da loja física** (recover + upsell), using the locked RCD copy in the approved spec.

**Architecture:** Copy-only edits to existing landing section components and root `metadata`. Keep layout, motion classes, CSS phone mock, and section IDs (`#como-funciona`, `#resultado`, `#para-quem`). No new assets, no new dependencies, no `/loja` changes.

**Tech Stack:** Next.js App Router (`voltou-web`), React client components under `src/components/landing/`, `Metadata` in `src/app/layout.tsx`.

**Spec:** [docs/superpowers/specs/2026-07-30-landing-vendedor-whatsapp-copy-design.md](../specs/2026-07-30-landing-vendedor-whatsapp-copy-design.md)  
**Linear:** [VOL-15](https://linear.app/voltouapp/issue/VOL-15/landing-copy-vendedor-whatsapp-rcd)

## Global Constraints

- Use **verbatim** locked strings from the spec (hero, fold, monetization) — do not invent softer “lembrete” language
- Never write `split Mercado Pago` (or “split”) on the landing
- Never reduce the product to “só avisa / lembrete” in hero/subhead/mechanism
- **Web-perf:** no new image/font/script assets; keep CSS phone mock; do not add heavy libraries
- No visual redesign (colors, section structure, card grids stay)
- Do not change `/loja`, painel, or API in this plan
- Repo: `C:/Users/Maurício/Projects/voltou-web`
- Commits: only if git `user.name`/`user.email` already work; otherwise leave staged and note for the human

## File map

| File | Responsibility |
|------|----------------|
| `src/components/landing/landing-hero.tsx` | Eyebrow, H1, subhead, CTA microcopy, WhatsApp mock thread, caption under phone |
| `src/components/landing/landing-mechanism.tsx` | Section title + `STEPS` (3 passos) |
| `src/components/landing/landing-proof.tsx` | Supporting copy + 3 feature bullets under the R$ card |
| `src/components/landing/landing-icp.tsx` | ICP headline supporting paragraph + “É pra você se” bullets |
| `src/components/landing/landing-cta.tsx` | Final CTA block monetization alignment |
| `src/app/layout.tsx` | `metadata` title/description/Open Graph/Twitter for SEO category |

---

### Task 1: Hero — eyebrow, H1, subhead, CTAs

**Files:**
- Modify: `src/components/landing/landing-hero.tsx`

**Interfaces:**
- Consumes: none (leaf UI)
- Produces: locked hero strings visible at `/`

- [ ] **Step 1: Replace eyebrow + H1 + subhead + click-trigger**

In `landing-hero.tsx`, set:

- Eyebrow: `O vendedor WhatsApp da loja física`
- H1 structure (keep underline SVG on the emphasized phrase): emphasize **já compraram** and **quiseram comprar** with the existing primary underline treatment on one span — prefer wrapping `já compraram` OR use two emphasized words without breaking layout. Spec H1 full text:

```
Todo mês você deixa dinheiro na mesa: clientes que já compraram ou quiseram comprar — e ninguém vende de novo pra eles.
```

Recommended markup: underline the phrase `dinheiro na mesa` (loss aversion) **or** `já compraram` — pick **`dinheiro na mesa`** as the single underlined span (clearest RCD signal). Rest of H1 as plain text.

- Subhead:

```
O Voltou. é o vendedor no WhatsApp: recupera essas vendas e ainda sobe o ticket com cupom, oferta e upsell. Você só paga comissão quando o dinheiro entra.
```

- Click-trigger under primary CTA:

```
Só comissão em venda recuperada · sem mensalidade · sem cartão · ~2 min
```

- Primary CTA label stays: `Recuperar minha primeira venda` + `→`
- Secondary stays: `Ver como funciona` → `#como-funciona`

Example H1 block:

```tsx
<p className="landing-reveal text-sm font-medium text-primary">
  O vendedor WhatsApp da loja física
</p>

<h1 className="landing-reveal landing-reveal-delay-0 mt-4 text-[2.05rem] font-bold leading-[1.12] tracking-tight text-foreground sm:text-5xl sm:leading-[1.08]">
  Todo mês você deixa{' '}
  <span className="relative inline-block text-primary">
    dinheiro na mesa
    <svg
      aria-hidden
      className="pointer-events-none absolute -bottom-1 left-0 h-3 w-full text-primary/70 sm:-bottom-1.5 sm:h-3.5"
      viewBox="0 0 200 12"
      preserveAspectRatio="none"
    >
      <path
        d="M2 8c40-6 80-8 120-4s56 6 76 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  </span>
  : clientes que já compraram ou quiseram comprar — e ninguém vende de novo pra
  eles.
</h1>

<p className="landing-reveal landing-reveal-delay-1 mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
  O Voltou. é o vendedor no WhatsApp: recupera essas vendas e ainda sobe o
  ticket com cupom, oferta e upsell. Você só paga comissão quando o dinheiro
  entra.
</p>
```

And click-trigger:

```tsx
<p className="mt-2 text-center text-xs text-muted-foreground">
  Só comissão em venda recuperada · sem mensalidade · sem cartão · ~2 min
</p>
```

- [ ] **Step 2: Verify strings**

Run (PowerShell):

```powershell
Select-String -Path "src/components/landing/landing-hero.tsx" -Pattern "vendedor WhatsApp|dinheiro na mesa|sobe o ticket|Só comissão em venda recuperada"
Select-String -Path "src/components/landing/landing-hero.tsx" -Pattern "avisa no WhatsApp|lembrete|split"
```

Expected: first command matches; second command **no matches** for `avisa no WhatsApp`, `lembrete`, or `split`.

- [ ] **Step 3: Commit (if git identity works)**

```powershell
git add src/components/landing/landing-hero.tsx
git commit -m "Rewrite landing hero for WhatsApp seller positioning."
```

If commit fails on missing identity, leave staged and continue.

---

### Task 2: Hero — WhatsApp mock + caption

**Files:**
- Modify: `src/components/landing/landing-hero.tsx` (mock block ~lines 88–122)

**Interfaces:**
- Consumes: Task 1 hero shell
- Produces: mock proving pay + recover (not “te espera na loja” without pay)

- [ ] **Step 1: Replace mock thread copy**

Store bubble (outbound):

```tsx
<div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-[#005c4b] px-3 py-2 text-left text-[13px] leading-snug text-white shadow-sm">
  Oi Marina! O tênis Nike Run que você levou — e a meia técnica que combina
  com ele.
  <br />
  <br />
  Cupom{' '}
  <span className="font-semibold tracking-wide">VOLTOU12</span>
  + meia com desconto. Pague no link e retire ou receba em casa 👟
  <span className="mt-1 block text-right text-[10px] text-white/55">
    10:42 ✓✓
  </span>
</div>
```

Customer bubble:

```tsx
<div className="mr-auto max-w-[75%] rounded-2xl rounded-tl-sm bg-[#1f2c34] px-3 py-2 text-left text-[13px] leading-snug text-white shadow-sm">
  Paguei! Quero retirar amanhã 💚
  <span className="mt-1 block text-right text-[10px] text-white/45">
    10:44
  </span>
</div>
```

Chip (keep):

```tsx
Pago · +R$ 329 recuperados
```

Caption under phone — align with commission filter (replace “já pagam a ferramenta” if it implies subscription):

```tsx
<p className="mt-5 text-center text-sm text-muted-foreground">
  <span className="font-medium text-foreground">
    Você só paga comissão
  </span>{' '}
  quando a venda entra.
</p>
```

- [ ] **Step 2: Verify no “lembrete” in mock**

```powershell
Select-String -Path "src/components/landing/landing-hero.tsx" -Pattern "Passando pra lembrar|lembrete|te espera na loja"
```

Expected: no matches.

- [ ] **Step 3: Commit (if possible)**

```powershell
git add src/components/landing/landing-hero.tsx
git commit -m "Align hero WhatsApp mock with upsell and paid recovery."
```

---

### Task 3: Mechanism section (fold)

**Files:**
- Modify: `src/components/landing/landing-mechanism.tsx`

**Interfaces:**
- Consumes: `#como-funciona` anchor from hero secondary CTA
- Produces: three steps locked in spec

- [ ] **Step 1: Replace STEPS + titles**

```tsx
const STEPS = [
  {
    n: '1',
    title: 'Cadastra no balcão',
    body: 'Nome, WhatsApp e o que comprou ou quis. 30 segundos.',
  },
  {
    n: '2',
    title: 'A IA vende no timing certo',
    body: 'Cupom personalizado, ofertas e upsell. Recupera valor que ia embora.',
  },
  {
    n: '3',
    title: 'O dinheiro cai na sua conta',
    body: 'Cliente compra, você recebe na hora — e o aviso do pedido pra entregar.',
  },
];
```

Section H2:

```tsx
Três passos. A Voltou. vende; você atende o balcão.
```

Keep subtitle:

```tsx
Feito pro balcão — não pra ficar logado no computador.
```

- [ ] **Step 2: Verify**

```powershell
Select-String -Path "src/components/landing/landing-mechanism.tsx" -Pattern "A IA vende|recebe na hora|split|lembrete"
```

Expected: matches for `A IA vende` and `recebe na hora`; **no** `split` or `lembrete`.

- [ ] **Step 3: Commit (if possible)**

```powershell
git add src/components/landing/landing-mechanism.tsx
git commit -m "Rewrite landing mechanism as AI seller recovery loop."
```

---

### Task 4: Proof + ICP + final CTA

**Files:**
- Modify: `src/components/landing/landing-proof.tsx`
- Modify: `src/components/landing/landing-icp.tsx`
- Modify: `src/components/landing/landing-cta.tsx`

**Interfaces:**
- Consumes: narrative from Tasks 1–3
- Produces: consistent R$ proof + ICP filter + monetization CTA

- [ ] **Step 1: Update proof supporting copy + bullets**

Supporting paragraph under H2:

```tsx
WhatsApp que vende: cupom, oferta e upsell. Painel em reais — quem pagou, o
que levou, quanto voltou.
```

Replace the three bottom bullets (still “Timing / Cupom / 30s” titles OK, bodies must not say blast/lembrete-only):

```tsx
{[
  {
    title: 'Vende de verdade',
    body: 'Cupom, oferta e upsell no timing certo — não é blast genérico.',
  },
  {
    title: 'Ticket maior',
    body: 'Recupera a venda e sobe o valor com o que faz sentido pro cliente.',
  },
  {
    title: '30 segundos',
    body: 'Cadastro no balcão — nome, WhatsApp e o que comprou ou quis.',
  },
].map(/* keep existing map markup */)}
```

Keep H2: `Você vê o dinheiro voltar — não “engajamento”.`  
Keep demo numbers (R$ 18.420 / 18 vendas) — illustrative, not a live claim change.

- [ ] **Step 2: Update ICP paragraph + one bullet**

Supporting paragraph:

```tsx
Loja física sem braço pra chase depois da venda. Quem já comprou ou
demonstrou interesse — e ninguém atende de forma personalizada — é dinheiro
na mesa. A Voltou. vende por você no WhatsApp.
```

Change the third “É pra você se” bullet from CRM wording to:

```tsx
Não tem equipe pra chase pós-venda — e deixa recompra e upsell pra depois
```

Keep “Provavelmente não, se” list as-is (still a good filter).

- [ ] **Step 3: Update final CTA body + click-trigger**

Keep H2 guarantee (30 dias / 2 vendas) unless product can no longer honor it — **keep**.

Replace supporting paragraph:

```tsx
Você só paga quando a gente recupera. Sem cartão pra criar a conta. Você
controla o que sai no WhatsApp.
```

Click-trigger under button:

```tsx
Leva ~2 minutos · sem mensalidade · sem cartão
```

CTA label stays: `Criar conta e cadastrar a 1ª venda`.

- [ ] **Step 4: Verify across three files**

```powershell
Select-String -Path "src/components/landing/landing-proof.tsx","src/components/landing/landing-icp.tsx","src/components/landing/landing-cta.tsx" -Pattern "WhatsApp que vende|braço pra chase|só paga quando|split|lembrete de recompra"
```

Expected: positive phrases match; no `split`; no `lembrete de recompra`.

- [ ] **Step 5: Commit (if possible)**

```powershell
git add src/components/landing/landing-proof.tsx src/components/landing/landing-icp.tsx src/components/landing/landing-cta.tsx
git commit -m "Align proof, ICP, and CTA with seller recovery narrative."
```

---

### Task 5: Metadata (SEO) + smoke checklist

**Files:**
- Modify: `src/app/layout.tsx` (metadata block)

**Interfaces:**
- Consumes: positioning “vendedor WhatsApp”
- Produces: consistent title/description for crawlers and share cards

- [ ] **Step 1: Update metadata strings**

Set (adjust only text values; keep URLs/structure):

```ts
title: {
  default: "Vendedor WhatsApp para loja física | Voltou.",
  // keep template if one exists
},
description:
  "Recupere quem já comprou ou quis comprar — e venda mais no WhatsApp com cupom, oferta e upsell. Só comissão em venda recuperada.",
```

Mirror the same `description` (or a ≤160 char cut) into `openGraph` and `twitter` title/description fields that currently say “Recuperar clientes…” / reminder-like copy.

Also replace `keywords` array with category-aligned terms (no “só recompra” framing):

```ts
keywords: [
  "vendedor whatsapp loja física",
  "recuperar vendas whatsapp",
  "upsell whatsapp loja",
  "cupom personalizado whatsapp",
  "recompra e upsell loja de bairro",
  "comissão venda recuperada",
],
```

Open Graph title example:

```ts
title: "Vendedor WhatsApp para loja física | Voltou.",
description:
  "Recupere quem já comprou ou quis comprar — e venda mais. Só comissão quando o dinheiro entra.",
```

- [ ] **Step 2: Local smoke**

```powershell
npm run dev
```

Open `http://localhost:3000` and check:

1. Eyebrow = vendedor WhatsApp  
2. H1 contains `dinheiro na mesa` + `já compraram` / `quiseram comprar`  
3. Subhead mentions recovers + ticket + comissão  
4. Mock shows upsell + pago  
5. `#como-funciona` step 2 = “A IA vende…”; step 3 = recebe na hora / aviso pedido  
6. View-source / Network document: meta description updated  
7. No `split` anywhere on the page  

- [ ] **Step 3: Web-perf note (no chrome-devtools MCP)**

Chrome DevTools MCP is **not** configured in this workspace. Do **not** invent CWV numbers. After deploy to `https://www.voltouapp.com/`, either:

- Ask human to enable chrome-devtools MCP and re-run web-perf skill, or  
- Spot-check: Network tab → no new image requests from landing components; LCP still text/CSS phone.

- [ ] **Step 4: Mark Linear VOL-15**

When copy is live on a branch/PR or main: move [VOL-15](https://linear.app/voltouapp/issue/VOL-15/landing-copy-vendedor-whatsapp-rcd) to In Progress / Done as appropriate; link PR if any.

- [ ] **Step 5: Commit metadata (if possible)**

```powershell
git add src/app/layout.tsx
git commit -m "Update root metadata for WhatsApp seller positioning."
```

- [ ] **Step 6: Update spec status line**

In `docs/superpowers/specs/2026-07-30-landing-vendedor-whatsapp-copy-design.md`, set:

```markdown
**Status:** Approved; implementation plan ready
```

(Only after Tasks 1–5 code is done, if this task runs last — otherwise skip until execution completes.)

---

## Spec coverage checklist (plan self-review)

| Spec requirement | Task |
|------------------|------|
| Hero eyebrow / H1 / subhead / CTAs | Task 1 |
| Mock WA upsell + pago | Task 2 |
| Mechanism 3 steps + section title | Task 3 |
| Proof supporting + ICP + CTA final | Task 4 |
| Metadata SEO | Task 5 |
| No split / no lembrete-only | Tasks 1–4 verify steps |
| No new heavy assets | Global Constraints + Task 5 web-perf note |
| Linear VOL-15 | Task 5 |

**Placeholder scan:** none intentional.  
**Type consistency:** N/A (copy-only).

---

## Out of scope (do not do in this plan)

- Hostinger deploy (separate request)
- n8n E2E / Meta Cloud
- Pricing GBB table
- Visual redesign
