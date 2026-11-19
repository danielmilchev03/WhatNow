import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  clean: true,
  // The shared package is TypeScript source, so it is bundled in instead of imported at runtime.
  noExternal: ['@whatnow/shared'],
});
