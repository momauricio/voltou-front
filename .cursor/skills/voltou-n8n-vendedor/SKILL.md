---
name: voltou-n8n-vendedor
description: >-
  Domínio Voltou para automações n8n do vendedor WhatsApp dos lojistas
  (recompra, campanhas, cupons, follow-up, fulfillment). Use when building or
  editing n8n workflows for Voltou, the AI salesperson, WhatsApp outreach,
  campanhas, StoreRules, segmentos, ofertas/cupons, or merchant sales automation.
---

# Voltou n8n — Vendedor

O Voltou é o **vendedor WhatsApp** dos lojistas: recupera clientes, dispara campanhas no timing certo e converte em venda via link com cupom. Automações n8n servem esse produto — não são genéricas.

## Protocolo obrigatório

1. Carregar `using-n8n-skills-official` e seguir o roteamento para a skill de capacidade (lifecycle, agents, expressions, etc.).
2. Aplicar **este** skill de domínio antes de desenhar nós, prompts de agente ou webhooks Voltou.
3. Validar/verificar workflows conforme as skills oficiais; nunca publicar às cegas.

Stack: `voltou-web` (Next) + `voltou-api` (HTTP) + n8n (orquestração) + WhatsApp (sessão de vendas distinta do número de aviso de pedido).

## Objetivo de negócio

Cada workflow deve responder: **como isso gera mais vendas para o lojista?**

Prioridades típicas:

| Job | Resultado |
|---|---|
| Pós-venda / recompra | Cliente volta no ciclo (`followUpDias` das regras) |
| Campanha por segmento | Mensagens aprováveis → envio → reply → oferta |
| Conversa do vendedor | Tom da loja + limites de desconto → link `/loja/{slug}/{cupom}` |
| Fulfillment | Lojista avisado no WA de **notificação** (não no WA de vendas) |

## Multi-tenant (sempre)

Todo fluxo carrega e propaga `tenantId` + `storeId`.

- Nunca misturar dados entre lojas.
- Credenciais e sessões WhatsApp são por loja.
- Tags de workflow: `voltou`, `vendedor`, e quando fizer sentido `subworkflow`, `campanha`, `fulfillment`.

## Fonte da verdade da loja

Antes de gerar mensagem ou oferecer desconto, ler regras via API (`GET /stores/rules?tenantId&storeId`):

| Campo | Uso no vendedor |
|---|---|
| `sobreNegocio` | Contexto do negócio no system prompt |
| `personalidade` | Tom (amigável, direto, estilo balcão) |
| `instrucoesExtras` | Hard rules (ex.: não citar concorrentes; escalar reclamação) |
| `horaInicio` / `horaFim` / `diasAtivos` | Janela de envio — fora disso, agendar ou não enviar |
| `followUpDias` | Timing de recompra / segmento inativos |
| `descontoPadrao`, `margemMaxima`, `maxDescontoUmProduto`, `maxDescontoDoisOuMais` | Teto de oferta |
| `aniversario` | Campanhas de aniversário on/off |
| `cupons` | Códigos permitidos / validade |

Se a API não responder regras, **não improvisar desconto** — falhar com erro claro ou usar só mensagem sem oferta.

## Segmentos e campanhas

Segmentos conhecidos (`SegmentId`):

- `checkout_pendente`
- `interesse_aberto`
- `inativos`
- `sem_compra`

Respeitar flags do cliente:

- `optedOut` → **nunca** contatar
- `readyToContact` → pré-requisito para outreach automático

Campanhas passam por estados de mensagem (`pendingApproval` → `approved` → `sent` / `failed`). Não pular aprovação humana se o produto exigir.

## WhatsApp: dois números

| Canal | Uso |
|---|---|
| Sessão de vendas (WAHA / conexões do painel) | Conversa do vendedor, campanhas, IA |
| `orderNotifyPhoneE164` | Só aviso de pedido pago ao lojista |

Não unificar esses canais em um único nó “WhatsApp genérico”.

## Vendedor (agente)

Ao usar Agent / LangChain no n8n:

1. Carregar `n8n-agents-official`.
2. System prompt modular: identidade Voltou + `sobreNegocio` + `personalidade` + `instrucoesExtras` + limites de desconto + janela horária.
3. Tools com nomes descritivos (ex.: `buscar_cliente_loja`, `criar_oferta_cupom`, `enviar_link_checkout`) — descrição da tool = parte do prompt.
4. Output estruturado quando for criar oferta (código, % dentro do teto, validade, URL pública).
5. Escalation: reclamação / pedido humano → handoff, sem insistir em venda.

Tom padrão (se regras vazias): amigável e direto como vendedor de loja física; cumprimenta pelo nome; oferece ajuda antes de empurrar oferta.

## Ofertas e conversão

- Conversão acontece no link público de oferta/checkout (`/loja/[slug]/[cupom]`), não em “cupom presencial sem pagamento”.
- Comissão Voltou é sobre **produtos**; frete é do lojista (não misturar na lógica de comissão do vendedor).
- Após pagamento: fulfillment (`awaiting` → `ready` / `shipped` → `done`) e notificação ao lojista no canal certo.

## Guardrails (não negociáveis)

- LGPD / opt-out: honrar sempre.
- Sem spam: respeitar janela e frequência implícita dos segmentos.
- Sem secrets em campos de texto — credenciais n8n (`n8n-credentials-and-security-official`).
- Sem inventar estoque, preço ou política fora das regras/API.
- Português do Brasil nas mensagens ao cliente final, salvo regra da loja em contrário.
- Side effects reais (`test_workflow`, envio WA): pedir confirmação antes — ver lifecycle oficial.

## Desenho de workflows Voltou

Preferir sub-workflows reutilizáveis e stateless:

1. `voltou-resolve-store-context` — tenant/store + rules + conexão WA
2. `voltou-segment-audience` — busca segmento, filtra opt-out
3. `voltou-draft-outreach` — gera texto (template ou agente)
4. `voltou-send-whatsapp` — envio com error branch
5. `voltou-create-offer-link` — cupom + URL pública
6. `voltou-notify-merchant-order` — aviso de pedido no número de notificação

Buscar existentes com `search_workflows` (`tags: ['voltou']` / `subworkflow`) antes de criar.

## Checklist rápido

- [ ] `using-n8n-skills-official` + skill de capacidade carregadas
- [ ] `tenantId` + `storeId` em todo caminho feliz e de erro
- [ ] Regras da loja aplicadas (tom, horário, teto de desconto)
- [ ] Opt-out / `readyToContact` respeitados
- [ ] Canal WA correto (vendas vs aviso de pedido)
- [ ] Error branches em HTTP/WA; sem secrets em texto
- [ ] Nome/descrição/sticky notes explicam o *porquê* de negócio

## Referências

- Domínio detalhado e contratos: [domain.md](domain.md)
- Skills oficiais: pasta irmã `using-n8n-skills-official` e `n8n-*-official`
- API frontend mirror: `src/lib/api.ts` (`StoreRules`, campaigns, WhatsApp, offers)
- Spec fulfillment: `docs/superpowers/specs/2026-07-23-fulfillment-shipping-merchant-notify-design.md`
