import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  LEVOU_CHIP_GROUPS,
  LEVOU_MAX,
  canAddChip,
  isChipSelected,
  normalizeLevouToken,
  toggleChip,
} from './o-que-levou-chips.ts';

describe('o-que-levou-chips', () => {
  it('exports max and groups', () => {
    assert.equal(LEVOU_MAX, 120);
    assert.deepEqual(
      LEVOU_CHIP_GROUPS.map((g) => g.label),
      ['Roupa', 'Calçado'],
    );
  });

  it('normalizes case, accents and whitespace', () => {
    assert.equal(normalizeLevouToken('Tênis'), 'tenis');
    assert.equal(normalizeLevouToken('TENIS'), 'tenis');
    assert.equal(normalizeLevouToken(' tenis '), 'tenis');
    assert.equal(normalizeLevouToken('  Calça   Jeans '), 'calca jeans');
  });

  it('appends to empty text', () => {
    assert.equal(toggleChip('', 'Calça'), 'Calça');
    assert.equal(toggleChip('   ', 'Calça'), 'Calça');
  });

  it('appends with ", "', () => {
    assert.equal(toggleChip('Calça', 'Tênis'), 'Calça, Tênis');
  });

  it('handles trailing commas and whitespace when appending', () => {
    assert.equal(toggleChip('Calça, ', 'Tênis'), 'Calça, Tênis');
    assert.equal(toggleChip('Calça ,, ', 'Bota'), 'Calça, Bota');
  });

  it('removes a selected chip', () => {
    assert.equal(toggleChip('Calça, Tênis', 'Calça'), 'Tênis');
    assert.equal(toggleChip('Calça, Tênis, Bota', 'Tênis'), 'Calça, Bota');
    assert.equal(toggleChip('Calça', 'Calça'), '');
  });

  it('is case and accent insensitive', () => {
    assert.equal(isChipSelected('TENIS', 'Tênis'), true);
    assert.equal(isChipSelected(' tenis , calca', 'Calça'), true);
    assert.equal(toggleChip('calca, TENIS', 'Tênis'), 'calca');
  });

  it('matches by first word of the token', () => {
    assert.equal(isChipSelected('calça jeans 38', 'Calça'), true);
    assert.equal(toggleChip('calça jeans 38, Bota', 'Calça'), 'Bota');
    assert.equal(isChipSelected('jeans calça', 'Calça'), false);
    assert.equal(isChipSelected('calçado', 'Calça'), false);
  });

  it('unselects when the word is deleted', () => {
    assert.equal(isChipSelected('Calça, Tênis', 'Tênis'), true);
    assert.equal(isChipSelected('Calça, ', 'Tênis'), false);
    assert.equal(isChipSelected('', 'Calça'), false);
  });

  it('never exceeds 120 chars', () => {
    const full = 'x'.repeat(120);
    assert.equal(canAddChip(full, 'Bota'), false);
    assert.equal(toggleChip(full, 'Bota'), full);

    const almost = 'x'.repeat(114); // + ", Bota" = 120
    assert.equal(canAddChip(almost, 'Bota'), true);
    assert.equal(toggleChip(almost, 'Bota').length, 120);
    assert.equal(canAddChip(almost, 'Sandália'), false);
    assert.equal(toggleChip(almost, 'Sandália'), almost);
  });
});
