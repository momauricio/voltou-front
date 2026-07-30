# n8n — orquestrador multi-loja (passo a passo)

Amanhã use este guia para subir os workflows em `https://n8n.brprosoft.com`.

## O que você vai importar

| Arquivo | Função |
|---|---|
| `resolve-store-context.json` | Sub-workflow: contexto de **uma** loja (regras, WA, janela) |
| `create-daily-inactive-repurchase-campaigns.json` | Job diário 09:00: lista **todas** as lojas ativas e cria campanha `inativos` |

Arquivo antigo `create-daily-inactive-repurchase-campaign.json` (loja única) ficou obsoleto — não importe.

## Pré-requisito na API (obrigatório)

1. No servidor da `voltou-api`, defina no `.env` (ou secrets do host):

```bash
INTERNAL_API_KEY=cole-aqui-uma-chave-longa-e-aleatoria
```

2. Faça redeploy / reinicie a API.
3. Teste rápido (PowerShell):

```powershell
curl.exe -sS "https://api.voltouapp.com/internal/stores/active" -H "x-api-key: SUA_CHAVE"
```

Resposta esperada: JSON `{ "stores": [ ... ] }` (pode ser lista vazia se nenhuma loja tiver WA `WORKING`). Sem a chave → `401`.

## No n8n

### 1) Criar a credencial

1. Abra n8n → **Credentials** → **Add credential**
2. Tipo: **Header Auth**
3. Nome da credencial: `Voltou Internal API`
4. **Name** (nome do header): `x-api-key`
5. **Value**: a mesma `INTERNAL_API_KEY` da API
6. Salve

### 2) Importar o sub-workflow

1. Menu **…** (ou **Workflows**) → **Import from File**
2. Escolha `resolve-store-context.json`
3. Abra o nó **Fetch store context**
4. Em Authentication, selecione a credencial `Voltou Internal API`
5. Salve o workflow (não precisa publicar ainda se for só sub)

### 3) Importar o orquestrador diário

1. **Import from File** → `create-daily-inactive-repurchase-campaigns.json`
2. Em **cada** nó HTTP abaixo, selecione a mesma credencial:
   - **Fetch active stores**
   - **Fetch store context**
   - **Create inactive campaign**
3. Confirme no nó **Set global config** que `apiBase` = `https://api.voltouapp.com` (sem barra no final está ok)
4. Salve

### 4) Testar sem esperar 09:00

1. No workflow **Create daily inactive repurchase campaigns**, clique em **Test workflow** / execute pelo trigger **When clicking Test**
2. Olhe a execução:
   - Se `stores` vier vazio → nenhuma loja com WhatsApp `WORKING`
   - Se loja fora da janela → nó **Skip store**
   - Se ok → **Create inactive campaign** retorna `id` + `messagesCreated`
3. No painel Voltou (`/painel/campanhas`), entre na loja correspondente e confira a campanha na **fila de aprovação**

### 5) Ativar o schedule

1. Só depois do teste ok, **Active** / Publish o workflow diário
2. Cron: `0 9 * * *` no timezone `America/Sao_Paulo` (já no JSON)
3. Envio real no WhatsApp continua sendo o scheduler da API **depois** da aprovação humana no painel

## Checklist rápido

- [ ] `INTERNAL_API_KEY` na API + redeploy
- [ ] curl `/internal/stores/active` com a chave funciona
- [ ] Credencial Header Auth no n8n
- [ ] Sub-workflow importado + credencial no HTTP
- [ ] Orquestrador importado + credencial nos 3 HTTPs
- [ ] Test manual ok
- [ ] Campanha aparece no painel
- [ ] Só então ativar o schedule

## Se der erro

| Sintoma | Causa provável |
|---|---|
| 401 na API | Chave errada / não deployada / header não é `x-api-key` |
| `stores: []` | Nenhuma conexão WA com status `WORKING` |
| Campanha não aparece | Loja fora da janela de regras, ou falha no POST (ver execução n8n) |
| 401 no POST `/internal/campaigns` | Credencial não ligada nesse nó |

## Depois (não é para amanhã)

- Ligar o sub-workflow via **Execute Workflow** no orquestrador (hoje o contexto está inline para importar sem ID)
- Enriquecer campos de **Regras** para a IA
- Inbound conversacional reusando `Resolve store context`
