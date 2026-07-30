# Multi-store daily repurchase orchestrator (base)

**Date:** 2026-07-28  
**Status:** Approved in conversation (approach 1)  
**Repos:** voltou-api + n8n (JSON import) + voltou-web docs  
**Out of scope (later):** inbound conversational agent, richer StoreRules fields, auto-approve

---

## Goal

One Voltou-global daily job walks **all active physical stores** (across all merchant logins), resolves each store’s seller context, and creates an `inativos` campaign that lands in the existing approval queue. WhatsApp send stays in `CampaignsScheduler` (already window-aware).

## Domain model (locked)

- **1 User login → 1 Tenant → N Stores**
- Each Store has its own WhatsApp connection, StoreRules, products, customers
- Orchestration is **per store**, not per login

## Architecture

```
n8n Schedule 09:00 America/Sao_Paulo
  → GET /internal/stores/active          (x-api-key)
  → for each store:
       → Execute Workflow: Resolve store context
            → GET /internal/stores/context?tenantId&storeId
       → if window.open && whatsapp WORKING:
            → POST /internal/campaigns   (segment inativos, pending approval)
       → else skip (log reason)
```

### Why internal API key (not merchant JWT)

`AccessTokenGuard` binds `tenantId` to the logged-in merchant. A platform-wide job must create campaigns for **many** tenants → machine credential `INTERNAL_API_KEY` via `x-api-key`, routes marked `@Public()` + `InternalApiKeyGuard`.

### Reuse of existing Voltou pieces

- `CampaignsService.create` — builds outreach + `pending_approval`
- `CampaignsScheduler.dispatchApprovedMessages` — sends inside store window after human approval
- `StoreKnowledge` title `store-rules` — StoreRules JSON

## API contracts

### `GET /internal/stores/active`

Auth: `x-api-key: <INTERNAL_API_KEY>`

Active = store has ≥1 `WhatsAppConnection` with `status = WORKING`.

```json
{
  "stores": [
    {
      "tenantId": "uuid",
      "storeId": "uuid",
      "storeName": "string",
      "storeSlug": "string",
      "timezone": "America/Sao_Paulo",
      "whatsappStatus": "WORKING",
      "hasRules": true
    }
  ]
}
```

### `GET /internal/stores/context?tenantId=&storeId=`

```json
{
  "tenantId": "uuid",
  "storeId": "uuid",
  "storeName": "string",
  "storeSlug": "string",
  "timezone": "America/Sao_Paulo",
  "rules": { "...StoreRules" },
  "whatsapp": { "connected": true, "status": "WORKING", "phoneE164": "+55..." },
  "window": {
    "start": "09:00",
    "end": "20:00",
    "days": ["Seg","Ter","Qua","Qui","Sex","Sáb"],
    "open": true
  }
}
```

### `POST /internal/campaigns`

Same body as `POST /campaigns` (`tenantId`, `storeId`, `name`, `segment`, `messageTemplate`, optional `autoApprove`). MVP: `autoApprove` omitted/false.

## n8n workflows

| Name | Tags | Role |
|---|---|---|
| `Resolve store context` | `subworkflow`, `voltou`, `vendedor` | Input: tenantId, storeId → context JSON |
| `Create daily inactive repurchase campaigns` | `voltou`, `vendedor`, `campanha` | Schedule + loop + call sub + create campaign |

MCP instance tools today cannot `create_workflow_from_code` — ship **importable JSON** under `voltou-web/docs/n8n/workflows/`.

## Non-goals this slice

- Conversational inbound agent
- New StoreRules fields / onboarding copy for richer AI context
- Auto-approve / auto-send without painel review
- Per-tenant n8n workflow copies

## Follow-ups (documented only)

1. Rename UI “Horários de disparo” → janela de atendimento (outbound + inbound)
2. Enrich rules (FAQ, top products blurb, objections)
3. Inbound WA → same `Resolve store context` → Agent
