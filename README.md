# Voltou Web

Frontend Next.js do Voltou (comercio e campanhas via WhatsApp).

A API roda em repositorio separado: `../voltou-api`. URL padrao da API: `http://localhost:3001`.

## Como rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Configure a URL da API nas variaveis de ambiente do Next quando integrar chamadas HTTP (ex.: `NEXT_PUBLIC_API_URL`).

Regras de seguranca e LGPD ficam no repositorio da API (`voltou-api`).