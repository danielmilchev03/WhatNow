import { randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import type { ZodType } from 'zod';
import type { ClientToServerEvents, ErrorCode, ServerToClientEvents } from '@whatnow/shared';
import type { ProviderRegistry } from './providers';
import {
  castVote,
  createRoom,
  generateRoomCode,
  joinRoom,
  normalizeRoomCode,
  shuffle,
  startRoom,
  toPublicRoom,
} from './rooms';
import { createRoomSchema, joinRoomSchema, voteSchema } from './schemas';
import type { RoomStore } from './store';

interface SocketData {
  playerId?: string;
  roomCode?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type InterServerEvents = {};

export type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export interface SocketDeps {
  registry: ProviderRegistry;
  store: RoomStore;
}

/** Thin glue between Socket.IO and the pure room logic in rooms.ts. */
export function attachSocketHandlers(io: TypedServer, { registry, store }: SocketDeps): void {
  const sendError = (socket: TypedSocket, code: ErrorCode, message: string = code) => {
    socket.emit('error', { code, message });
  };

  /** Sends every socket in the room its own view of the room. */
  const broadcastRoom = (code: string) => {
    const room = store.get(code);
    if (!room) return;
    for (const socketId of io.sockets.adapter.rooms.get(code) ?? []) {
      const playerId = io.sockets.sockets.get(socketId)?.data.playerId;
      if (playerId) io.to(socketId).emit('room:state', toPublicRoom(room, playerId));
    }
  };

  const enterRoom = (socket: TypedSocket, code: string, playerId: string) => {
    if (socket.data.roomCode) void socket.leave(socket.data.roomCode);
    socket.data = { playerId, roomCode: code };
    void socket.join(code);
  };

  io.on('connection', (socket) => {
    /** Validates the payload and reports errors, so handlers only see valid input. */
    const on = <T>(
      event: keyof ClientToServerEvents,
      schema: ZodType<T> | null,
      handler: (payload: T) => Promise<void> | void,
    ) => {
      const listener = async (raw: unknown) => {
        let payload: T;
        if (schema) {
          const parsed = schema.safeParse(raw);
          if (!parsed.success) return sendError(socket, 'INVALID_PAYLOAD', parsed.error.message);
          payload = parsed.data;
        } else {
          payload = undefined as T;
        }
        try {
          await handler(payload);
        } catch (err) {
          console.error(`[socket] ${event} failed`, err);
          sendError(socket, 'INTERNAL', 'Something went wrong');
        }
      };
      // Payloads are validated above, so the listener takes `unknown` instead of the typed payload.
      socket.on(event, listener as ClientToServerEvents[typeof event]);
    };

    /** The room this socket is in, or undefined after sending NOT_IN_ROOM. */
    const currentRoom = () => {
      const { roomCode, playerId } = socket.data;
      const room = roomCode ? store.get(roomCode) : undefined;
      if (!room || !playerId) {
        sendError(socket, 'NOT_IN_ROOM');
        return undefined;
      }
      return { room, playerId };
    };

    on('room:create', createRoomSchema, ({ deckId, name, options }) => {
      if (!registry.get(deckId)) return sendError(socket, 'DECK_UNAVAILABLE');
      const code = generateRoomCode((c) => store.has(c));
      const playerId = randomUUID();
      store.set(createRoom({ code, deckId, options, host: { id: playerId, name } }));
      enterRoom(socket, code, playerId);
      broadcastRoom(code);
    });

    on('room:join', joinRoomSchema, ({ code: rawCode, name }) => {
      const code = normalizeRoomCode(rawCode);
      const room = store.get(code);
      if (!room) return sendError(socket, 'ROOM_NOT_FOUND');
      const playerId = randomUUID();
      const result = joinRoom(room, { id: playerId, name });
      if (!result.ok) return sendError(socket, result.error);
      store.set(result.value);
      enterRoom(socket, code, playerId);
      broadcastRoom(code);
    });

    on('room:start', null, async () => {
      const ctx = currentRoom();
      if (!ctx) return;
      const provider = registry.get(ctx.room.deckId);
      if (!provider) return sendError(socket, 'DECK_UNAVAILABLE');
      const cards = shuffle(await provider.getCards(ctx.room.options));

      // Re-read after the await: the room may have changed while cards were loading.
      const room = store.get(ctx.room.code);
      if (!room) return sendError(socket, 'ROOM_NOT_FOUND');
      const result = startRoom(room, ctx.playerId, cards);
      if (!result.ok) return sendError(socket, result.error);
      store.set(result.value);
      broadcastRoom(room.code);
    });

    on('card:vote', voteSchema, ({ cardId, like }) => {
      const ctx = currentRoom();
      if (!ctx) return;
      const result = castVote(ctx.room, ctx.playerId, cardId, like);
      if (!result.ok) return sendError(socket, result.error);
      store.set(result.value.room);
      broadcastRoom(ctx.room.code);
      if (result.value.newMatch) io.to(ctx.room.code).emit('match', { cardId });
    });
  });
}
