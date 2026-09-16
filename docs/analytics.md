# Analytics — GTM + GA4 + PostHog

This app ships **one** browser loader for Google: Google Tag Manager container `GTM-W93ND43T` in the root Next.js layout (`src/app/layout.tsx`). Schwartz / Jack events also go to PostHog.

## Do not install gtag.js

**Never** add `gtag.js`, `gtag('config', ...)`, or a `G-XXXX` script to the Next layout. GTM already loads Google tags. A second gtag snippet would **double-count** pageviews and conversions.

GA4 Measurement ID (Mauricio): **`G-2YWN3RYNNF`**

Wire that ID **inside GTM**, not in this repo’s frontend.

## GTM checklist (Mauricio)

Container: `GTM-W93ND43T`

1. Create a tag **Google Analytics: GA4 Configuration**
   - Measurement ID: `G-2YWN3RYNNF`
   - Trigger: **All Pages**
2. Create **GA4 Event** tags that read `dataLayer` events from the locked taxonomy below (event name = dataLayer `event`). Suggested mapping: one GA4 Event tag per name, trigger = Custom Event with that name.
3. Publish the container.

Do **not** create a second GA4 config via `gtag('config', 'G-2YWN3RYNNF')` in Next.

## PostHog

- Project: **611758** (Voltou)
- Client API key: `phc_C4xU3pGsWVQbxMiYPmEccxfqJuuAZT3JhTXPK6BwCrec` (public by design)
- `api_host`: `https://us.i.posthog.com`

Env (preferred; Hostinger Docker / Vercel must bake `NEXT_PUBLIC_*` at **build** time):

```
NEXT_PUBLIC_POSTHOG_KEY=phc_C4xU3pGsWVQbxMiYPmEccxfqJuuAZT3JhTXPK6BwCrec
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

The app falls back to those values if env is missing so a build still works. See `.env.example` and `Dockerfile` `ARG`s.

Init is once on the client (`AnalyticsProvider`). `person_profiles: identified_only`. On `sign_up`, `posthog.identify` uses `store_id` when the signup response has it (Google), otherwise a non-PII `signup_<uuid>`. No email, phone, or name on the person.

## Locked event taxonomy

Every event is sent to **both** `window.dataLayer.push` and `posthog.capture(event, props)`.

| Event | Properties |
| --- | --- |
| `view_landing` | `page_path`, `referrer` |
| `click_cta_criar_conta` | `cta_location`: `hero` \| `footer` \| `nav`, `page_path` |
| `sign_up` | `method`: `email` \| `google` \| `whatsapp` |
| `onboarding_step_complete` | `step`: 1–5, `step_name`: `cliente` \| `produto` \| `regras` \| `mercado_pago` \| `retirada` |
| `onboarding_complete` | `steps_done`: 5 |
| `checkout_created` | `store_id`, `order_id`, `amount_brl` |
| `payment_approved` | `store_id`, `order_id`, `amount_brl` |
| `commission_earned` | `store_id`, `order_id`, `amount_brl`, `commission_brl` |

**Never** in dataLayer or PostHog: phone, WhatsApp, final customer name, merchant email, document/CNPJ.

`commission_earned` is exported as a helper; there is no front webhook yet (payment/commission often complete server-side).
