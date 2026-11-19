import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Finds the repo root by walking up from this file until `data/decks` exists.
 * Works both from `server/src` (dev, tests) and from the bundled `server/dist`.
 */
function findRepoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    if (existsSync(join(dir, 'data', 'decks'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error('Could not find the repo root (no data/decks folder)');
    dir = parent;
  }
}

export const REPO_ROOT = findRepoRoot();
export const DECKS_DIR = join(REPO_ROOT, 'data', 'decks');
export const CLIENT_DIST_DIR = join(REPO_ROOT, 'client', 'dist');
