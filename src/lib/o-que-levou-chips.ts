/**
 * Chips de "O que ele levou" — lógica pura (sem React).
 *
 * O texto do campo é a única fonte de verdade: o estado dos chips é derivado dele.
 *
 * Regra de correspondência de tokens:
 * - O texto é dividido por "," e cada token é aparado; tokens vazios são ignorados.
 * - Tokens e chips são comparados normalizados (trim, espaços internos colapsados,
 *   minúsculas pt-BR, sem acentos) — "Tênis", "TENIS" e " tenis " são iguais.
 * - Um chip está selecionado se algum token normalizado for IGUAL ao chip ou se a
 *   PRIMEIRA PALAVRA do token for igual ao chip. Assim "calça jeans 38" mantém
 *   "Calça" selecionado; "jeans calça" e "calçado" não.
 * - Desmarcar um chip remove todos os tokens que correspondem pela mesma regra.
 */

export const LEVOU_MAX = 120;

export const LEVOU_CHIP_GROUPS: ReadonlyArray<{ label: string; chips: readonly string[] }> = [
  { label: 'Roupa', chips: ['Calça', 'Blusa', 'Vestido', 'Bermuda'] },
  { label: 'Calçado', chips: ['Tênis', 'Sandália', 'Bota', 'Sapato'] },
];

export function normalizeLevouToken(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function tokens(text: string): string[] {
  return text
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function tokenMatchesChip(token: string, chip: string): boolean {
  const t = normalizeLevouToken(token);
  const c = normalizeLevouToken(chip);
  if (!t || !c) return false;
  return t === c || t.split(' ')[0] === c;
}

export function isChipSelected(text: string, chip: string): boolean {
  return tokens(text).some((t) => tokenMatchesChip(t, chip));
}

function appendChip(text: string, chip: string): string {
  if (!text.trim()) return chip;
  return `${text.replace(/[\s,]+$/, '')}, ${chip}`;
}

export function canAddChip(text: string, chip: string, max: number = LEVOU_MAX): boolean {
  return appendChip(text, chip).length <= max;
}

export function toggleChip(text: string, chip: string, max: number = LEVOU_MAX): string {
  if (isChipSelected(text, chip)) {
    return tokens(text)
      .filter((t) => !tokenMatchesChip(t, chip))
      .join(', ');
  }
  const next = appendChip(text, chip);
  return next.length > max ? text : next;
}
