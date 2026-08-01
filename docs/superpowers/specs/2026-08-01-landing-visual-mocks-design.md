# Landing Voltou — mocks e blocos visuais (RCD)

**Date:** 2026-08-01  
**Status:** Approved for implementation  
**Repo:** voltou-web (`src/components/landing/*`, `src/app/page.tsx`)

---

## Goal

Reduzir densidade de texto com blocos didáticos: título curto + 1 frase + mock CSS autoexplicativo. Preservar tipografia/cores e hero locked. Números = **Exemplo** (não cases inventados).

---

## Page order

1. Hero (copy locked)  
2. Jornada visual `#fluxo`  
3. Bloco segunda venda + WA mock  
4. Bloco loja física + cadastro/antes-depois  
5. Bloco WA da loja + contraste confiança  
6. Bloco só comissão + chips  
7. Painel exemplo R$ recuperado  
8. ICP compacto  
9. CTA final  

---

## Copy dos blocos

| Bloco | Título | Frase |
|-------|--------|--------|
| Jornada | Assim recuperamos mais vendas pra você | Do balcão ao dinheiro na conta — sem você precisar atender o WhatsApp o dia inteiro. |
| Segunda venda | Vendemos de novo pra aquele cliente que comprou só uma vez | A IA escolhe o produto, personaliza o cupom e fecha no timing certo. |
| Loja física | Feito pra loja física — não pra e-commerce de carrinho abandonado | Cadastro no balcão em 30s; a Voltou chase quem já comprou ou quis comprar. |
| Confiança | O cliente não desconfia — é o WhatsApp da loja | Sem número estranho. Sem “oi sumida” de desconhecido. |
| Comissão | Sem mensalidade. Sem cartão. Só comissão na venda recuperada. | Você paga quando a Voltou recupera uma venda que não aconteceria sozinha. |
| Painel | Você vê o dinheiro voltar — não “engajamento” | Painel em reais: quem pagou, o que levou, quanto voltou. |

---

## Decisions

- Mocks CSS only  
- Badge **Exemplo** em dashboard e caption do WA  
- Sem fotos stock / cases falsos  
