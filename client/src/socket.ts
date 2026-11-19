import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@whatnow/shared';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Connects to the same origin the page came from (Vite proxies it in dev). */
export const socket: AppSocket = io({ autoConnect: true });
