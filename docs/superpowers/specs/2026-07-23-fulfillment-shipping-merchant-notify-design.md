# Entrega (retirada/frete fixo) + aviso de pedido ao lojista

**Date:** 2026-07-23  
**Status:** Approved in conversation; awaiting final spec review  
**Repos:** voltou-web + voltou-api  
**Approach:** 1 — estender o `Checkout` (sem entidade `Order` no MVP)

---

## Goal

Após o pagamento no link (`/loja`), o lojista precisa **saber o que despachar** e o cliente precisa escolher **retirar na loja** ou **receber em casa** (frete fixo). A Voltou continua **só na comissão**, cobrada no split do Mercado Pago **apenas sobre o valor dos produtos** (frete 100% do lojista).

Princípio de monetização: o cliente **paga no link**. Não existe cupom presencial válido sem pagamento — “retirar na loja” é modalidade de cumprimento **depois** do pago.

---

## Non-goals (MVP)

- Faixas de frete por CEP/bairro
- Integração com transportadora (Melhor Envio, etc.)
- Entidade `Order` separada do `Checkout`
- Mensalidade / taxa fixa além da comissão
- Cupom usável na loja física sem passar pelo checkout pago
- PKCE no OAuth MP (já fora deste escopo)
- E-mail de aviso de pedido

---

## Decisions locked

| Tema | Decisão |
|------|--------|
| Modalidades | Retirada na loja (grátis) **ou** entrega em casa |
| Frete | Valor **fixo por loja** |
| Comissão | Só sobre **produtos**; frete fora da base |
| Modelo de dados | Estender `Checkout` (abordagem 1) |
| Aviso ao lojista | Painel + WhatsApp |
| Número do WhatsApp de aviso | **Separado** do WhatsApp conectado para vendas/IA |
| Se número de aviso vazio | Só painel; UI avisa que alertas WA estão desligados |

---

## Business rules

### Configuração da loja (`Store`)

| Field | Type | Meaning |
|-------|------|---------|
| `deliveryEnabled` | boolean (default `true`) | Se `false`, `/loja` só oferece retirada |
| `shippingCents` | int ≥ 0 | Frete fixo em centavos; obrigatório > 0 se `deliveryEnabled` e loja quiser cobrar frete; `0` = entrega grátis |
| `pickupAddressText` | string? | Texto livre (endereço/horário) exibido na opção retirada |
| `orderNotifyPhoneE164` | string? | WhatsApp destino dos avisos de pedido (E.164 BR). **Não** é o número WAHA de vendas |

Validação:

- Se `deliveryEnabled` e o cliente escolhe entrega → cobrar `shippingCents` no total (pode ser 0).
- `orderNotifyPhoneE164` normalizado com o mesmo util de telefone BR já usado no projeto; inválido → 400 na API de update.

### Checkout / pagamento

- Total MP = `sum(produtos selecionados)` + `shippingCents` (0 se `pickup`).
- `application_fee` / comissão Voltou = `round(produtos * commissionRateBps / 10000)` — **exclui frete**.
- `Sale.commissionCents` / `Checkout.commissionCents` seguem a mesma base (só produtos).
- Sem `fulfillmentMethod` no payload de pagamento → 400.
- Entrega sem endereço mínimo (nome, telefone, CEP, rua, número, bairro, cidade, UF) → 400.

### Cumprimento (fulfillment)

Status no checkout pago:

| Status | Meaning |
|--------|---------|
| `awaiting` | Pago; aguardando ação do lojista |
| `ready` | Pronto para retirada |
| `shipped` | Enviado (entrega) |
| `done` | Concluído (retirado ou entregue) |

Transições MVP (lojista autenticado, dono da loja):

- `pickup` + `awaiting` → `ready` → `done`
- `delivery` + `awaiting` → `shipped` → `done`
- Atalho permitido: `awaiting` → `done` (loja pequena)

Checkouts não pagos não entram na fila de pedidos.

---

## Data model

### `Store` (extend)

```ts
deliveryEnabled: boolean;       // default true
shippingCents: number;          // default 0
pickupAddressText: string | null;
orderNotifyPhoneE164: string | null;
```

### `Checkout` (extend)

```ts
fulfillmentMethod: 'pickup' | 'delivery' | null; // null até o cliente escolher no pay
shippingCents: number;          // snapshot no momento do pagamento (0 se pickup)
shippingAddressJson: string | null; // JSON abaixo; null se pickup
fulfillmentStatus: 'awaiting' | 'ready' | 'shipped' | 'done' | null;
// null enquanto pending; 'awaiting' no markPaid
```

Endereço (JSON):

```ts
type ShippingAddress = {
  recipientName: string;
  phoneE164: string;
  cep: string;          // 8 dígitos
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;        // UF 2 letras
};
```

Não criar tabela `Order` neste MVP.

---

## API

### Lojista (autenticado)

- `PATCH /stores/:id` (ou endpoint de settings existente) — campos de entrega + `orderNotifyPhoneE164`
- `GET /checkouts?status=paid&fulfillmentStatus=awaiting|…` — fila de pedidos (paginada)
- `PATCH /checkouts/:id/fulfillment` — `{ status: 'ready' | 'shipped' | 'done' }` com validação de transição

### Público (`/loja`)

- `GET` offer pública já existente passa a incluir:
  - `deliveryEnabled`, `shippingCents`, `pickupAddressText`
- `POST …/payments` (transparente) passa a exigir no body:
  - `fulfillmentMethod`
  - `shippingAddress` se `delivery`
  - total enviado pelo brick deve bater com `produtos + shipping` recalculado no servidor (servidor é fonte da verdade)

### Webhook MP (já existente)

No `markPaid` / fluxo equivalente:

1. Persistir `fulfillmentMethod`, `shippingCents`, `shippingAddressJson` (já recebidos no create payment) e `fulfillmentStatus = awaiting`
2. Criar/atualizar `Sale`(s) com comissão só sobre produtos
3. Enfileirar/enviar WhatsApp de aviso se `store.orderNotifyPhoneE164` estiver setado
4. Idempotência: não reenviar aviso se já notificado (flag `orderNotifiedAt DateTime?` no Checkout)

---

## UI

### Perfil (lojista)

Bloco **Entrega e pedidos**:

- Toggle entrega em casa
- Input frete fixo (R$)
- Texto retirada
- Input “WhatsApp para avisos de pedido” + helper: *diferente do número conectado para falar com clientes*
- Se aviso vazio: banner “Pedidos só aparecem no painel”

### `/loja` (cliente)

Antes do Payment Brick:

1. Escolha Retirar | Receber (se `deliveryEnabled`)
2. Se receber → formulário de endereço
3. Resumo: subtotal produtos, frete, total
4. Brick cobra o total

Copy: evitar “cupom te espera na loja sem pagar”. Preferir “pague agora e retire” / “pague agora e receba”.

### Painel — Pedidos

Lista de checkouts `paid` com fulfillment:

- Cupom, cliente, itens, total, frete, modalidade, endereço (se houver)
- Ações de status conforme tabela acima
- Empty state se nenhum pedido

---

## WhatsApp de aviso

- Destino: `Store.orderNotifyPhoneE164` apenas
- Canal: mesma infra WAHA já usada para envio outbound (sessão da loja), mas **chat id** = número de aviso, não o cliente
- Template mínimo (texto):

```
Nova venda Voltou · {cupom}
{itens resumidos}
Produtos: R$ X · Frete: R$ Y · Total: R$ Z
{Retirada na loja | Entrega: endereço formatado}
Abra o painel para atualizar o status.
```

- Se WAHA desconectado ou número vazio: log + pedido ainda visível no painel (não falha o `markPaid`)

---

## Commission / MP alignment

- Transparent checkout já usa `application_fee` no `POST /v1/payments`
- Recalcular fee = f(produtos only)
- Frete entra como valor no pagamento (item/linha ou soma no `transaction_amount`) sem entrar na fee
- Preferência Checkout Pro (se ainda existir path legado) deve seguir a mesma regra se usado; foco do MVP é o brick transparente

---

## Testing (manual)

1. Configurar frete R$ 15 + número de aviso ≠ WA de vendas
2. `/loja`: retirada → total sem frete → pagar → painel `awaiting` + WA no número de aviso
3. `/loja`: entrega → endereço → total +15 → comissão = 5% só produtos
4. Atualizar status até `done`
5. Sem número de aviso → pago ok, sem WA, banner no perfil
6. Confirmar que a sessão WA de vendas **não** recebe o aviso como se fosse conversa de cliente misturada (destino explícito)

---

## Out of scope follow-ups

- Entidade `Order` + múltiplos envios / trocas
- Frete por CEP / Melhor Envio
- Mensalidade + comissão menor
- Homologação / quality score MP
