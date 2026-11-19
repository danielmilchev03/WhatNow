import { join } from 'node:path';
import { REPO_ROOT } from './paths';

// Values from .env at the repo root, if present. Real environment variables win.
try {
  process.loadEnvFile(join(REPO_ROOT, '.env'));
} catch {
  // No .env file: everything is optional.
}

const env = (name: string): string | undefined => process.env[name]?.trim() || undefined;

/** Set by `npm run dev`. */
const isDev = process.argv.includes('--dev');

export const config = {
  // PORT is what hosting platforms set. In dev, tools often set PORT for the Vite server instead,
  // so the dev API ignores it and uses API_PORT (default 3001), which the Vite proxy points at.
  port: Number(env('API_PORT') ?? (isDev ? undefined : env('PORT')) ?? 3001),
  region: env('REGION') ?? 'BG',
  tmdbApiKey: env('TMDB_API_KEY'),
  overpassUrl: env('OVERPASS_URL') ?? 'https://overpass-api.de/api/interpreter',
  userAgent: env('APP_USER_AGENT') ?? 'WhatNow/0.1',
};
