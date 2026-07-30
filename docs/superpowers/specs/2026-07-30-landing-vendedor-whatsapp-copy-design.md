# Landing — copy “vendedor WhatsApp” (RCD)

**Date:** 2026-07-30  
**Status:** Implemented (working tree; pending commit/deploy)

**Repos:** voltou-web (`src/components/landing/*`, metadata em `layout`/`page` se houver)  
**Approach:** B — contraste de categoria (“vendedor WhatsApp”), com dor em reais no H1  

---

## Goal

Reposicionar a landing de **“aviso de recompra”** para **vendedor WhatsApp da loja física**: recupera vendas de quem já comprou ou demonstrou interesse **e** vende mais (cupom, oferta, upsell). O lojista sente que está **deixando dinheiro na mesa** ao não atender esses clientes depois, de forma personalizada — e que a Voltou faz esse trabalho sem contratar ninguém.

Monetização na copy: **sem mensalidade**; só comissão quando a venda recuperada entra. Não jargão de PSP (“split Mercado Pago”) no hero/fold — benefício em linguagem de loja.

---

## Non-goals

- Redesign visual completo / nova paleta / novo layout de seções
- Novas imagens pesadas no hero (manter mock CSS do telefone)
- Pricing table GBB nesta iteração
- Prometer features que ainda não fecham E2E no n8n (inbound conversacional avançado pode aparecer como direção, não como checklist técnico)
- Alterar funil de checkout `/loja` neste card

---

## Decisions locked

| Tema | Decisão |
|------|--------|
| Abordagem de copy | **B** — categoria “vendedor WhatsApp” + H1 de dinheiro na mesa |
| ICP | Loja física / balcão sem braço nem mão de obra pra chase pós-venda |
| Promessa | Recuperar + vender mais (não só lembrar) |
| Preço na LP | Só comissão em venda recuperada · sem mensalidade · sem cartão |
| Jargão MP | Evitar “split” no copy público; falar “recebe na hora” + aviso de pedido |
| Escopo de UI | Copy-only nos componentes existentes + metadata SEO se necessário |
| Web-perf | Sem assets novos pesados; audit CWV pós-deploy (Chrome DevTools MCP ainda não configurado) |

---

## Positioning (aprovado)

- **Categoria:** O vendedor WhatsApp da loja física  
- **Não é:** CRM, disparador genérico, “lembrete de recompra”  
- **É:** IA que **vende** no timing certo — recupera valor perdido e sobe ticket  
- **Filtro:** lojista não paga pra usar; paga comissão só quando a Voltou recupera uma venda que não aconteceria sozinha  

---

## Copy — Hero (1º viewport)

| Elemento | Texto |
|----------|--------|
| Eyebrow | O vendedor WhatsApp da loja física |
| H1 | Todo mês você deixa dinheiro na mesa: clientes que **já compraram** ou **quiseram comprar** — e ninguém vende de novo pra eles. |
| Subhead | O Voltou. é o vendedor no WhatsApp: recupera essas vendas e ainda sobe o ticket com cupom, oferta e upsell. Você só paga comissão quando o dinheiro entra. |
| CTA primário | Recuperar minha primeira venda → |
| Click-trigger | Só comissão em venda recuperada · sem mensalidade · sem cartão · ~2 min |
| CTA secundário | Ver como funciona (`#como-funciona`) |

### Mock WhatsApp (prova no hero)

Alinhar o diálogo ao mecanismo (não “lembrete na loja”):

- Mensagem da loja: produto de interesse/compra + cupom/oferta ou upsell + link de pagamento  
- Resposta do cliente: confirmação de pagamento / “já paguei”  
- Chip: `Pago · +R$ …` (recuperado)

---

## Copy — Como funciona (`#como-funciona`)

**Título de seção:** Três passos. A Voltou. vende; você atende o balcão.  
**Subtítulo (opcional):** Feito pro balcão — não pra ficar logado no computador.

| # | Título | Corpo |
|---|--------|--------|
| 1 | Cadastra no balcão | Nome, WhatsApp e o que comprou ou quis. 30 segundos. |
| 2 | A IA vende no timing certo | Cupom personalizado, ofertas e upsell. Recupera valor que ia embora. |
| 3 | O dinheiro cai na sua conta | Cliente compra, você recebe na hora — e o aviso do pedido pra entregar. |

---

## Copy — Prova / ICP / CTA final

### Prova (`#resultado`)

- Manter âncora em **reais**, não engajamento.  
- Ajustar supporting copy: recuperado **e** ticket (upsell), não só “mensagem no timing”.  
- Ex.: “WhatsApp que vende: cupom, oferta e upsell. Painel em reais — quem pagou, o que levou, quanto voltou.”

### ICP (`#para-quem`)

- Reforçar: loja física **sem braço pra chase**; não precisa de funil de 12 etapas.  
- Quem já comprou **ou** demonstrou interesse — e ninguém atende depois de forma personalizada.

### CTA final

- Garantia 30 dias pode permanecer se já estiver na página.  
- Alinhar: “Você só paga quando a gente recupera. Sem cartão pra criar conta.”  
- CTA: Criar conta e cadastrar a 1ª venda →  

---

## Files to touch (implementation)

- `src/components/landing/landing-hero.tsx` — eyebrow, H1, subhead, CTAs, mock WA  
- `src/components/landing/landing-mechanism.tsx` — título + 3 passos  
- `src/components/landing/landing-proof.tsx` — supporting copy  
- `src/components/landing/landing-icp.tsx` — parágrafo ICP  
- `src/components/landing/landing-cta.tsx` — alinhamento monetização  
- Metadata (`src/app/layout.tsx` ou `page.tsx`) — title/description com categoria “vendedor WhatsApp”

---

## Linear

- Atualizar narrativa do projeto Voltou (summary/description) se a API permitir; senão issue + comentário nos épicos.  
- Issue de implementação sob **VOL-5** (Painel) ou epic de marketing/landing: *Landing: copy vendedor WhatsApp (RCD)*.  
- Ajustar descrição de **VOL-8** se ainda soar só “recompra / lembrete”.

---

## Success criteria

- Visitante em 5s entende: **o que é** (vendedor WA) + **dor** (dinheiro na mesa com quem já comprou/interessou) + **próximo passo**.  
- Copy não reduz o produto a “lembrete”.  
- Sem “split Mercado Pago” no hero/fold.  
- Lighthouse / CWV: sem regressão óbvia (sem novos assets pesados).

---

## Out of scope / follow-ups

- Audit web-perf com Chrome DevTools MCP quando configurado.  
- Deploy Hostinger da landing após implementação.  
- Fechar E2E n8n (fora deste spec de copy).
