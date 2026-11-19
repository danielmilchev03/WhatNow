import type { CardProvider, DeckId, DeckInfo } from '@whatnow/shared';

/**
 * Card providers per deck, in priority order. The first available provider wins,
 * so an API-backed provider can sit in front of the local JSON fallback.
 */
export class ProviderRegistry {
  private readonly providers = new Map<DeckId, CardProvider[]>();

  register(provider: CardProvider): this {
    const list = this.providers.get(provider.deckId) ?? [];
    this.providers.set(provider.deckId, [...list, provider]);
    return this;
  }

  get(deckId: DeckId): CardProvider | undefined {
    return this.providers.get(deckId)?.find((p) => p.isAvailable());
  }

  list(): DeckInfo[] {
    return [...this.providers.keys()].map((id) => ({ id, available: this.get(id) !== undefined }));
  }
}
