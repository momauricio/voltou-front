/**
 * /llms.txt and /llms-full.txt (https://llmstxt.org) built from the same
 * copy the public home renders. Public pages only; every sentence goes through
 * isAgentSafe so Marketing-locked words never reach agents.
 */

import {
  LANDING_ANGLES,
  LANDING_DATA_PRIVACY,
  LANDING_GUARANTEE,
  LANDING_ICP,
  LANDING_JOURNEY_STEPS,
  LANDING_MECHANISM,
  LANDING_PRICING,
  LANDING_PROOF,
} from './landing-copy.ts';
import {
  HOME_DESCRIPTION,
  HOME_H1_LINE_1,
  HOME_H1_LINE_2,
  HOME_OFFER_SUB,
  HOME_OFFER_TERMS,
  LLMS_FULL_TXT_PATH,
  LLMS_TXT_PATH,
  SITE_NAME,
  SITE_URL,
  agentSafeFaq,
  isAgentSafe,
} from './seo.ts';

/** Drops any sentence that hits the agent-surface forbidden list. */
export function safeText(text: string): string {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.trim() && isAgentSafe(sentence))
    .join(' ');
}

function link(title: string, path: string, description: string): string {
  return `- [${title}](${SITE_URL}${path}): ${safeText(description)}`;
}

function pageLinks(): string[] {
  return [
    link('Página inicial', '/', `${HOME_H1_LINE_1} ${HOME_H1_LINE_2}`),
    link('Como funciona na prática', '/#fluxo', LANDING_MECHANISM.body),
    link('Preço', '/#preco', LANDING_PRICING.title),
    link('Para quem é', '/#para-quem', `${LANDING_ICP.title}.`),
    link('Perguntas frequentes', '/#faq', 'Perguntas frequentes da página inicial.'),
  ];
}

/** `withSummary` repeats mechanism + guarantee for the short file only. */
function header(withSummary: boolean): string[] {
  const lines = [
    `# ${SITE_NAME}`,
    '',
    `> ${safeText(HOME_DESCRIPTION)}`,
    '',
    safeText(`${HOME_H1_LINE_1} ${HOME_H1_LINE_2} ${HOME_OFFER_SUB}`),
    '',
    safeText(HOME_OFFER_TERMS),
  ];
  if (withSummary) {
    lines.push(
      '',
      safeText(LANDING_MECHANISM.body),
      '',
      `Garantia: ${safeText(LANDING_GUARANTEE)}`,
    );
  }
  return lines;
}

export function buildLlmsTxt(): string {
  return [
    ...header(true),
    '',
    '## Site',
    '',
    ...pageLinks(),
    '',
    '## Para agentes',
    '',
    link(
      'llms-full.txt',
      LLMS_FULL_TXT_PATH,
      'Conteúdo público completo da página inicial em markdown: como funciona, preço, garantia, para quem é e perguntas frequentes.',
    ),
    '',
  ].join('\n');
}

export function buildLlmsFullTxt(): string {
  const lines = [...header(false), ''];

  lines.push(`## ${LANDING_MECHANISM.title}`, '', safeText(LANDING_MECHANISM.body), '');
  for (const step of LANDING_JOURNEY_STEPS) {
    lines.push(`${step.n}. **${safeText(step.title)}** — ${safeText(step.body)}`);
  }
  lines.push('');

  lines.push(`## ${safeText(LANDING_PROOF.title)}`, '', safeText(LANDING_PROOF.body), '');

  lines.push('## A 2ª venda', '');
  for (const angle of LANDING_ANGLES) {
    lines.push(`### ${safeText(angle.title)}`, '', safeText(angle.body), '');
  }

  lines.push(`## Preço`, '', `**${safeText(LANDING_PRICING.title)}**`, '');
  for (const paragraph of LANDING_PRICING.paragraphs) {
    lines.push(safeText(paragraph), '');
  }

  lines.push('## Garantia', '', safeText(LANDING_GUARANTEE), '');

  lines.push(`## ${LANDING_ICP.title}`, '', `${LANDING_ICP.fitLabel}:`, '');
  for (const item of LANDING_ICP.fit) lines.push(`- ${safeText(item)}`);
  lines.push('', `${LANDING_ICP.notFitLabel}:`, '');
  for (const item of LANDING_ICP.notFit) lines.push(`- ${safeText(item)}`);
  lines.push('');

  lines.push('## Dados dos clientes', '', safeText(LANDING_DATA_PRIVACY), '');

  const faq = agentSafeFaq();
  if (faq.length > 0) {
    lines.push('## Perguntas frequentes', '');
    for (const item of faq) lines.push(`### ${item.q}`, '', item.a, '');
  }

  lines.push(
    '## Site',
    '',
    ...pageLinks(),
    link('llms.txt', LLMS_TXT_PATH, 'Resumo do site para agentes.'),
    '',
  );
  return lines.join('\n');
}
