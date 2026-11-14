/**
 * Visible public-home copy, shared by the landing components and the
 * agent-readable surfaces (llms.txt, llms-full.txt, FAQPage JSON-LD) so the
 * two can't drift. Plain TS (no JSX, no "@/" aliases) so node --test can load it.
 * Do not invent copy here — edit only with Marketing-approved text.
 */

export const LANDING_ANGLES = [
  {
    title: 'Os dois',
    body: 'Quem levou a peça. Quem experimentou, gostou, deixou o número. Os dois já passaram no seu balcão. A Voltou oferece a condição e fecha. Lucro em cima de quem já entrou na sua loja.',
  },
  {
    title: 'cupom personalizado para o cliente',
    body: 'Tem cupom personalizado para o cliente e uma condição especial. Atendimento requintado. A Voltou fecha a 2ª venda. Você lucra. A loja continua sendo a da sua cliente.',
  },
  {
    title: 'Já está na arara',
    body: 'A peça já está no estoque. Paga. Parada na arara. Você atende a fila. A Voltou fecha a 2ª venda. Lucro em cima do que você já tem, sem sair do balcão.',
  },
] as const;

export const LANDING_MECHANISM = {
  title: 'Como funciona na prática',
  body: 'Você cadastra nome e contato no balcão. O time e a IA da Voltou entram em contato e fecham a 2ª venda. Quando o cliente paga, o dinheiro cai e você recebe o aviso pra preparar a entrega.',
} as const;

export const LANDING_JOURNEY_STEPS = [
  {
    n: '1',
    title: 'Você cadastra no balcão',
    body: 'Nome, contato e o que a pessoa comprou ou quis — uns 30 segundos.',
  },
  {
    n: '2',
    title: 'A Voltou vende de novo',
    body: 'Time e IA chamam com o produto certo e um cupom personalizado para o cliente.',
  },
  {
    n: '3',
    title: 'O cliente paga no link',
    body: 'Você não fica cobrando. Quando paga, o dinheiro cai pra você.',
  },
  {
    n: '4',
    title: 'Você só prepara a entrega',
    body: 'Recebe o aviso do pedido e entrega — retirada ou envio.',
  },
] as const;

export const LANDING_PROOF = {
  title: 'A Voltou chama. Você não dispara.',
  body: 'No balcão, nome e contato. O time e a IA da Voltou fazem o contato, com cupom personalizado para o cliente. O cliente paga no link e você recebe o aviso pra entregar.',
} as const;

export const LANDING_PRICING = {
  title: 'Sem mensalidade. Sem cartão. Você só paga se a venda entrar.',
  paragraphs: [
    'A Voltou só ganha comissão quando recupera uma venda que não aconteceria sozinha. Se o cliente não pagar, você não paga a gente. Conta grátis pra começar — sem taxa fixa pra manter aberta.',
    'Não é custo de ferramenta. É divisão só no resultado.',
  ],
} as const;

export const LANDING_ICP = {
  title: 'Pra loja física que perde a segunda venda',
  fitLabel: 'Faz sentido se',
  fit: [
    'Você tem loja física — calçado, moda, acessórios, presente',
    'Na venda, você anota nome e contato do cliente',
    'Não sobra gente pra chamar o cliente de volta depois da venda',
  ],
  notFitLabel: 'Provavelmente não, se',
  notFit: [
    'Só vende em marketplace e não tem o contato do cliente',
    'Quer mandar a mesma mensagem pra todo mundo',
    'Precisa de ERP ou PDV fiscal — isso não é o nosso foco',
  ],
} as const;

export const LANDING_GUARANTEE =
  'Em 30 dias, pelo menos 2 vendas. Se não der, você para de usar quando quiser, sem multa.';

export const LANDING_DATA_PRIVACY =
  'Os dados dos clientes da sua loja não são vendidos nem compartilhados com terceiros para marketing.';

/**
 * FAQ alinhado ao ICP (loja física / contato feito pela Voltou / só comissão) e às objeções
 * mais comuns no Linear (doc 01 — Visão & ICP + princípios do produto).
 * Ajuste fino comercial: validar com o dono antes de tratar como policy legal.
 * Rendered by landing-faq.tsx; also feeds FAQPage JSON-LD and llms-full.txt
 * word for word; the 5% item is the only one exempt from the agent-surface
 * forbidden list (see APPROVED_COMMISSION_FAQ in seo.ts).
 */
export const LANDING_FAQ = [
  {
    q: 'Quem fala com o cliente?',
    a: 'O time e a IA da Voltou. Você só cadastra nome e contato no balcão. Você não dispara a mensagem.',
  },
  {
    q: 'Como funciona a comissão? Vocês processam o pagamento?',
    a: 'O cliente paga no link da sua loja (hoje pelo Mercado Pago; outras formas de checkout vão entrar depois). O dinheiro da venda vai pra você. A Voltou só fica com a comissão quando essa venda recuperada entra. Sem mensalidade e sem cartão pra abrir a conta.',
  },
  {
    q: 'Qual a porcentagem de comissão?',
    a: '5% sobre o valor dos produtos da venda recuperada. Frete não entra na base da comissão. Se o cliente não pagar, você não paga comissão.',
  },
  {
    q: 'E se o cliente não quiser mais receber mensagem?',
    a: 'Se o cliente pedir pra parar, a gente respeita. Ele deixa de receber ofertas da loja por aqui — sem insistir, sem mandar de novo “só mais uma vez”.',
  },
  {
    q: 'Vocês vendem ou compartilham os dados dos meus clientes?',
    a: 'Não. Nome, telefone e o que a pessoa comprou ficam pra recuperar a venda e avisar pedido. Não vendemos lista de clientes e não passamos esses dados pra terceiros fazerem marketing. Quem faz o contato é o time e a IA da Voltou.',
  },
  {
    q: 'Preciso entender de tecnologia pra usar?',
    a: 'Não. No balcão você anota nome, contato e o que a pessoa comprou (ou quis) em cerca de 30 segundos. O restante — quando chamar, o que oferecer e o link de pagamento — a Voltou cuida. Não precisa de sistema de caixa nem de equipe de TI.',
  },
] as const;

export type LandingFaqItem = (typeof LANDING_FAQ)[number];
