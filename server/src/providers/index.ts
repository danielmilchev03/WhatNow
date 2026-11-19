import { LocalJsonProvider } from './localJson';
import { ProviderRegistry } from './registry';

export function createDefaultRegistry(): ProviderRegistry {
  return new ProviderRegistry()
    .register(new LocalJsonProvider('movies'))
    .register(new LocalJsonProvider('activities'));
}

export { LocalJsonProvider, filterCards } from './localJson';
export { ProviderRegistry } from './registry';
