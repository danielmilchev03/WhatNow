import { existsSync } from 'node:fs';
import { createServer, type Server as HttpServer } from 'node:http';
import { join } from 'node:path';
import express from 'express';
import { Server } from 'socket.io';
import { CLIENT_DIST_DIR } from './paths';
import { createDefaultRegistry, type ProviderRegistry } from './providers';
import { attachSocketHandlers, type TypedServer } from './socket';
import { RoomStore } from './store';

export interface AppDeps {
  registry?: ProviderRegistry;
  store?: RoomStore;
}

/**
 * HTTP + Socket.IO on one origin. In production Express also serves the built client,
 * so there is no CORS to configure; in dev the Vite server proxies /api and /socket.io here.
 */
export function createAppServer(deps: AppDeps = {}): { httpServer: HttpServer; io: TypedServer } {
  const registry = deps.registry ?? createDefaultRegistry();
  const store = deps.store ?? new RoomStore();

  const app = express();
  app.disable('x-powered-by');

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/decks', (_req, res) => {
    res.json(registry.list());
  });

  if (existsSync(CLIENT_DIST_DIR)) {
    app.use(express.static(CLIENT_DIST_DIR));
    // Single-page app: unknown non-API paths (e.g. /r/KTVZ later) get index.html.
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
      res.sendFile(join(CLIENT_DIST_DIR, 'index.html'));
    });
  }

  const httpServer = createServer(app);
  const io: TypedServer = new Server(httpServer);
  attachSocketHandlers(io, { registry, store });
  return { httpServer, io };
}
