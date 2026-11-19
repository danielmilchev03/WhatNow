import { describe, expect, it } from 'vitest';
import type { Card } from '@whatnow/shared';
import { LocalJsonProvider, filterCards } from './localJson';

const card = (id: string, tags: string[]): Card => ({ id, title: id, tags, source: 'local' });

describe('filterCards', () => {
  const cards = [card('a', ['drama']), card('b', ['comedy']), card('c', ['drama', 'comedy'])];

  it('returns everything without filters', () => {
    expect(filterCards(cards, {})).toEqual(cards);
  });

  it('keeps cards with at least one of the tags', () => {
    expect(filterCards(cards, { tags: ['comedy'] }).map((c) => c.id)).toEqual(['b', 'c']);
  });

  it('applies the limit after filtering', () => {
    expect(filterCards(cards, { tags: ['drama'], limit: 1 }).map((c) => c.id)).toEqual(['a']);
  });
});

describe.each([
  ['movies', 30],
  ['activities', 20],
] as const)('LocalJsonProvider(%s)', (deckId, minCards) => {
  const provider = new LocalJsonProvider(deckId);

  it('loads valid cards with unique ids', async () => {
    const cards = await provider.getCards({});
    expect(cards.length).toBeGreaterThanOrEqual(minCards);
    expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length);
    for (const c of cards) {
      expect(c.source).toBe('local');
      expect(c.emoji).toBeTruthy();
      expect(c.tags.length).toBeGreaterThan(0);
    }
  });
});
