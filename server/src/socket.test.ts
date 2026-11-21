import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as connect, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ErrorPayload,
  PublicRoom,
  ServerToClientEvents,
} from '@whatnow/shared';
import { createAppServer } from './app';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let url: string;
const { httpServer, io } = createAppServer();
const clients: ClientSocket[] = [];

beforeAll(async () => {
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
});

afterAll(async () => {
  for (const c of clients) c.disconnect();
  await io.close();
});

function client(): ClientSocket {
  const socket: ClientSocket = connect(url, { transports: ['websocket'], forceNew: true });
  clients.push(socket);
  return socket;
}

/** Resolves with the next room:state that satisfies the predicate. */
function nextState(socket: ClientSocket, predicate: (room: PublicRoom) => boolean = () => true) {
  return new Promise<PublicRoom>((resolve) => {
    const listener = (room: PublicRoom) => {
      if (!predicate(room)) return;
      socket.off('room:state', listener);
      resolve(room);
    };
    socket.on('room:state', listener);
  });
}

const nextError = (socket: ClientSocket) =>
  new Promise<ErrorPayload>((resolve) => socket.once('error', resolve));

describe('socket flow', () => {
  it('two players create, join, start, both like a card and both get the match', async () => {
    const host = client();
    const guest = client();

    const created = nextState(host);
    host.emit('room:create', { deckId: 'movies', name: 'Ana' });
    const { code } = await created;
    expect(code).toMatch(/^[A-Z]{4}$/);

    const hostSeesGuest = nextState(host, (r) => r.players.length === 2);
    const guestJoined = nextState(guest);
    guest.emit('room:join', { code: code.toLowerCase(), name: 'Ivan' });
    const guestView = await guestJoined;
    await hostSeesGuest;
    expect(guestView.players.map((p) => p.name)).toEqual(['Ana', 'Ivan']);

    const hostSwiping = nextState(host, (r) => r.status === 'swiping');
    const guestSwiping = nextState(guest, (r) => r.status === 'swiping');
    host.emit('room:start');
    const [hostRoom, guestRoom] = await Promise.all([hostSwiping, guestSwiping]);
    expect(hostRoom.cards.length).toBeGreaterThan(0);
    expect(guestRoom.cards.map((c) => c.id)).toEqual(hostRoom.cards.map((c) => c.id));

    const cardId = hostRoom.cards[0]!.id;
    const hostMatch = new Promise((resolve) => host.once('match', resolve));
    const guestMatch = new Promise((resolve) => guest.once('match', resolve));
    host.emit('card:vote', { cardId, like: true });
    guest.emit('card:vote', { cardId, like: true });

    expect(await hostMatch).toEqual({ cardId });
    expect(await guestMatch).toEqual({ cardId });
  });

  it("does not leak other players' votes", async () => {
    const host = client();
    const guest = client();
    const created = nextState(host);
    host.emit('room:create', { deckId: 'activities', name: 'Ana' });
    const { code } = await created;

    const joined = nextState(host, (r) => r.players.length === 2);
    guest.emit('room:join', { code, name: 'Ivan' });
    await joined;

    const swiping = nextState(host, (r) => r.status === 'swiping');
    host.emit('room:start');
    const room = await swiping;

    const hostSeesVote = nextState(host);
    guest.emit('card:vote', { cardId: room.cards[0]!.id, like: true });
    const view = await hostSeesVote;
    expect(view.myVotes).toEqual({});
    expect(view).not.toHaveProperty('votes');
  });

  it("sends everyone's progress counts after a vote", async () => {
    const host = client();
    const guest = client();
    const created = nextState(host);
    host.emit('room:create', { deckId: 'activities', name: 'Ana' });
    const { code } = await created;

    const joined = nextState(host, (r) => r.players.length === 2);
    guest.emit('room:join', { code, name: 'Ivan' });
    await joined;

    const swiping = nextState(host, (r) => r.status === 'swiping');
    host.emit('room:start');
    const room = await swiping;

    const hostView = nextState(host, (r) => r.progress.some((p) => p.voted === 1));
    const guestView = nextState(guest, (r) => r.progress.some((p) => p.voted === 1));
    host.emit('card:vote', { cardId: room.cards[0]!.id, like: true });
    for (const view of await Promise.all([hostView, guestView])) {
      expect(view.progress.map((p) => p.voted)).toEqual([1, 0]);
    }
  });

  it('sends error codes for bad input', async () => {
    const socket = client();

    const invalid = nextError(socket);
    socket.emit('room:create', { deckId: 'nope', name: '' } as never);
    expect((await invalid).code).toBe('INVALID_PAYLOAD');

    const notFound = nextError(socket);
    socket.emit('room:join', { code: 'QQQQ', name: 'Ana' });
    expect((await notFound).code).toBe('ROOM_NOT_FOUND');

    const unavailable = nextError(socket);
    socket.emit('room:create', { deckId: 'places', name: 'Ana' });
    expect((await unavailable).code).toBe('DECK_UNAVAILABLE');
  });

  it('only lets the host start', async () => {
    const host = client();
    const guest = client();
    const created = nextState(host);
    host.emit('room:create', { deckId: 'movies', name: 'Ana' });
    const { code } = await created;

    const joined = nextState(guest);
    guest.emit('room:join', { code, name: 'Ivan' });
    await joined;

    const error = nextError(guest);
    guest.emit('room:start');
    expect((await error).code).toBe('NOT_HOST');
  });
});
