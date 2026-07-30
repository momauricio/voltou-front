# Voltou — domínio para workflows n8n

Referência sob demanda. Carregar quando precisar de contratos ou decisões de produto.

## Produto

- **Quem vende:** Voltou atua como vendedor digital no WhatsApp **do lojista**.
- **ICP:** lojas físicas / de bairro que querem recompra e recuperação de clientes.
- **Monetização Voltou:** comissão no split Mercado Pago sobre **valor dos produtos** (frete fora da base).
- **Repos:** `voltou-web` + `voltou-api`; n8n orquestra automações e agentes.

## Entidades úteis

| Conceito | Notas |
|---|---|
| Tenant / Store | Isolamento multi-loja; todo request autenticado/contextualizado |
| Customer | Nome, telefone, opt-out, histórico de compras/interesses |
| StoreRules | Personalidade, horários, follow-up, tetos de desconto, cupons |
| Campaign / OutreachMessage | Draft → aprovação → envio; contadores por status |
| Offer / Checkout | Link público pago; cupom no path da URL |
| Fulfillment | `awaiting` \| `ready` \| `shipped` \| `done` no checkout pago |
| WhatsApp connection | Sessão de vendas (painel `/painel/whatsapp`) |
| orderNotifyPhoneE164 | WA separado só para alertas de pedido ao lojista |

## Segmentos (`SegmentId`)

| Id | Intenção |
|---|---|
| `checkout_pendente` | Abandonou / não concluiu pagamento |
| `interesse_aberto` | Demonstrou interesse sem fechar |
| `inativos` | Sem compra recente (ciclo `followUpDias`) |
| `sem_compra` | Cadastrado sem compra |

Campos de audiência relevantes: `optedOut`, `readyToContact`, `reason`, `productName`, `lastSaleAt`.

## StoreRules (shape)

Espelhado em `src/lib/api.ts`:

```ts
type StoreRules = {
  sobreNegocio?: string;
  personalidade?: string;
  instrucoesExtras?: string;
  horaInicio?: string;
  horaFim?: string;
  diasAtivos?: string[];
  followUpDias?: string;
  descontoPadrao?: string;
  margemMaxima?: string;
  maxDescontoUmProduto?: string;
  maxDescontoDoisOuMais?: string;
  aniversario?: boolean;
  cupons?: { id: string; codigo: string; desconto: string; validade: string }[];
};
```

Endpoints espelhados no web: `getStoreRules` / `saveStoreRules` → `/stores/rules`.

## Campanhas (API mirror)

- `GET /customers/segments`
- `GET/POST /campaigns` (+ mensagens / aprovação conforme API)
- Contagens: `pendingApproval`, `approved`, `sent`, `replied`, `rejected`, `failed`

Ao automatizar envio em massa no n8n, alinhar com o estado de aprovação do produto — não bypassar se o painel exige review.

## Oferta pública

- Path: `/loja/{slug}/{cupom}`
- Pagamento → fulfillment + notificação lojista
- Retirada na loja ou entrega (frete fixo por loja); comissão só sobre produtos

## Padrões de workflow sugeridos

### A — Recompra pós-venda (multi-loja)

Schedule global → `GET /internal/stores/active` → por loja `GET /internal/stores/context` → se WA + janela → `POST /internal/campaigns` (`inativos`). Importável: `docs/n8n/workflows/`.

### B — Campanha por segmento

Trigger manual/webhook painel → carregar segmento → filtrar → draft em lote → aprovação → send com rate limit / batch (`n8n-loops-official`).

### C — Agente conversacional (próximo)

WA inbound (vendas) → reutilizar `Resolve store context` → agent com tools API → respeitar tetos → emitir link checkout → log outcome.

### D — Aviso de pedido

Webhook pagamento confirmado → formatar itens + fulfillment → send para `orderNotifyPhoneE164` (se vazio: só painel; não usar sessão de vendas).

## Naming

- Workflows: `voltou / {loja ou shared} / {job}`
- Sub-workflows: tag `subworkflow` + `voltou`
- Stickies: *porquê* de negócio (ex.: “respeita followUpDias da loja”)

## Fora de escopo típico (MVP)

- Cupom presencial sem pagamento no link
- Unificar WA de vendas com WA de aviso de pedido
- Inventar política comercial sem `StoreRules` / API
