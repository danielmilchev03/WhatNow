import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DECK_IDS, ERROR_CODES } from '@whatnow/shared';
import en from './en.json';

const SRC_DIR = join(import.meta.dirname, '..');

function hasKey(key: string): boolean {
  const parts = key.split('.');
  const last = parts.pop()!;
  let node: unknown = en;
  for (const part of parts) {
    if (typeof node !== 'object' || node === null) return false;
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node !== 'object' || node === null) return false;
  const obj = node as Record<string, unknown>;
  // Plural keys are stored as key_one / key_other.
  return typeof obj[last] === 'string' || typeof obj[`${last}_other`] === 'string';
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !name.endsWith('.test.ts') ? [path] : [];
  });
}

describe('en.json', () => {
  it('has every key used with a literal t() call', () => {
    const missing: string[] = [];
    for (const file of sourceFiles(SRC_DIR)) {
      const source = readFileSync(file, 'utf8');
      for (const [, key] of source.matchAll(/\bt\(\s*'([^'`$]+)'/g)) {
        if (key && !hasKey(key)) missing.push(`${key} (${file})`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('has a message for every error code', () => {
    expect(ERROR_CODES.filter((code) => !hasKey(`errors.${code}`))).toEqual([]);
  });

  it('has a name for every deck', () => {
    expect(DECK_IDS.filter((id) => !hasKey(`decks.${id}`))).toEqual([]);
  });
});
