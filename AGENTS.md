# Agent notes — Voltou

## n8n

This project uses n8n. When working with workflows, nodes, expressions, or the n8n MCP tools, always start by loading the `using-n8n-skills-official` meta-skill and follow its routing into the matching capability skill before acting.

For Voltou sales automations (vendedor WhatsApp, campanhas, recompra, cupons, StoreRules, fulfillment notify), also load `voltou-n8n-vendedor` and apply its domain rules on top of the official n8n skills.
