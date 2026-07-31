# Landing Voltou — story ladder (RCD)

**Date:** 2026-07-30  
**Status:** Approved for implementation  
**Repo:** voltou-web (`src/components/landing/*`, `src/app/page.tsx`, `src/app/layout.tsx`)

---

## Goal

Redesenhar a landing com **story ladder** para quem não conhece o produto: dor → fluxo → prova (WhatsApp da loja) → confiança → só comissão → ICP → CTA.

Hero curto no 1º viewport (sem mock). Marca **Voltou** (sem `.`). Posicionamento de **recuperação de vendas** (não “vendedor WhatsApp”).

---

## Decisions locked

| Tema | Decisão |
|------|--------|
| Abordagem | Story ladder |
| 1º viewport | Copy curta + CTA only |
| Posicionamento | Recuperamos vendas perdidas |
| Marca | Voltou (sem ponto) |
| Preço | Sem mensalidade · sem cartão · só comissão |
| WA | Número da própria loja |

---

## Page order

1. Hero  
2. Fluxo (`#fluxo`) — 4 passos  
3. Prova — mock WhatsApp  
4. Confiança — WA da loja  
5. Só comissão  
6. ICP  
7. CTA final  

---

## Copy locked

### Hero

- **Eyebrow:** Recuperamos as vendas que você perde todo dia  
- **H1:** Clientes compram uma vez — e ninguém vende de novo pra eles.  
- **Subhead:** A Voltou recupera e vende pra esses clientes que compraram só uma vez na sua loja. A IA escolhe o produto, personaliza o cupom e fecha no WhatsApp da loja.  
- **CTA:** Recuperar minha primeira venda →  
- **Click-trigger:** Sem mensalidade · sem cartão · só comissão · ~2 min  
- **Secundário:** Ver como funciona → `#fluxo`

### Fluxo

- **Título:** Assim recuperamos mais vendas pra você  
- **Sub:** Do balcão ao dinheiro na conta — sem você precisar atender o WhatsApp o dia inteiro.  
- Passos: Cadastra → IA escolhe e vende → Cliente paga no WA da loja → Você recebe + aviso  

### Prova (mock)

- **Título:** Parece a loja falando. Porque é a loja.  
- **Caption:** Mensagem no WhatsApp da sua loja · cupom · link de pagamento  

### Confiança

- **Título:** O cliente não desconfia — porque é o WhatsApp da loja  
- **Corpo:** A Voltou usa o número que o cliente já conhece. Sem perfil novo, sem “oi sumida” de desconhecido.  

### Só comissão

- **Título:** Sem mensalidade. Sem cartão. Só comissão na venda recuperada.  
- **Corpo:** Você cria a conta sem cartão. Paga só quando a Voltou recupera uma venda que não aconteceria sozinha.  

### ICP

- **Título:** Feito pra loja física que perde a segunda venda  
- **Corpo:** Quem já comprou (ou quis comprar) e ninguém atende de novo — é venda perdida todo dia. A Voltou recupera isso no WhatsApp da loja.  

### CTA final

- **Título:** Comece hoje. Se em 30 dias não recuperar pelo menos 2 vendas, você cancela.  
- **Corpo:** Sem mensalidade. Sem cartão pra criar a conta. Só comissão quando a venda entrar.  
- **CTA:** Criar conta e cadastrar a 1ª venda →  

---

## Out of scope

- Nova paleta / redesign total  
- Assets pesados  
- Pricing table GBB  
- Funil `/loja` / API  
