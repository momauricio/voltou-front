/**
 * Marketing-locked public-home copy. Technical SEO reads from here.
 * Do not invent slogans, FAQ answers, or extra keywords.
 */

export const SITE_NAME = 'Voltou';
export const SITE_URL = 'https://www.voltouapp.com';

export const HOME_H1_LINE_1 = 'A 1ª venda você fez no balcão.';
export const HOME_H1_LINE_2 = 'A 2ª venda a Voltou faz por você.';

export const HOME_TITLE =
  'A 1ª venda você fez no balcão. A 2ª venda a Voltou faz por você. | Voltou';

/** OG/Twitter title may drop the trailing "| Voltou" — siteName already carries it. */
export const HOME_TITLE_OG =
  'A 1ª venda você fez no balcão. A 2ª venda a Voltou faz por você.';

export const HOME_DESCRIPTION =
  'A Voltou fecha a 2ª venda da sua loja física de roupa e calçado. Você cadastra nome e número no balcão. Sem mensalidade. Comissão só na venda extra.';

export const HOME_OFFER_SUB =
  'A Voltou fecha a venda e te dá lucro. O cliente da sua loja, atendimento requintado.';

export const HOME_OFFER_TERMS =
  'Sem mensalidade. Sem cartão. Comissão só na venda extra.';

export const HOME_CTA_LABEL = 'Criar conta e cadastrar o 1º cliente';
export const HOME_CTA_HREF = '/entrar?tab=criar';

/** Forbidden in title / meta / H1 / OG / Twitter / JSON-LD (Marketing lock). */
export const FORBIDDEN_HOME_SEO = [
  /puxa|puxar/i,
  /trata VIP/i,
  /5%/,
  /robô/i,
  /disparo/i,
  /WhatsApp da loja/i,
  /não aconteceria sozinha/i,
] as const;
