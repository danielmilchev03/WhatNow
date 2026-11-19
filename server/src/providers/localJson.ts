import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import type { Card, CardProvider, DeckId, DeckOptions } from '@whatnow/shared';
import { DECKS_DIR } from '../paths';

const localCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  emoji: z.string().optional(),
  imageUrl: z.string().optional(),
  tags: z.array(z.string()),
  link: z.string().optional(),
  meta: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

const deckFileSchema = z.array(localCardSchema);

/** Keeps cards that have at least one of the requested tags, then applies the limit. */
export function filterCards(cards: Card[], options: DeckOptions): Card[] {
  const tags = options.tags?.length ? new Set(options.tags) : undefined;
  const filtered = tags ? cards.filter((card) => card.tags.some((t) => tags.has(t))) : cards;
  return options.limit !== undefined ? filtered.slice(0, options.limit) : filtered;
}

/** Reads `data/decks/<deckId>.json`. Always available; the fallback for every deck. */
export class LocalJsonProvider implements CardProvider {
  private cache: Promise<Card[]> | undefined;

  constructor(
    readonly deckId: DeckId,
    private readonly filePath: string = join(DECKS_DIR, `${deckId}.json`),
  ) {}

  isAvailable(): boolean {
    return true;
  }

  async getCards(options: DeckOptions): Promise<Card[]> {
    this.cache ??= this.load();
    return filterCards(await this.cache, options);
  }

  private async load(): Promise<Card[]> {
    const raw: unknown = JSON.parse(await readFile(this.filePath, 'utf8'));
    return deckFileSchema.parse(raw).map((card) => ({ ...card, source: 'local' as const }));
  }
}
