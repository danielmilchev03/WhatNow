import { describe, expect, it } from 'vitest';
import { ROOM_CODE_ALPHABET, type Card, type Room } from '@whatnow/shared';
import {
  castVote,
  computeAlmostMatches,
  computeMatches,
  createRoom,
  generateRoomCode,
  isFinished,
  joinRoom,
  normalizeRoomCode,
  shuffle,
  startRoom,
  toPublicRoom,
  type RoomResult,
} from './rooms';

const card = (id: string): Card => ({ id, title: id, tags: [], source: 'local' });
const CARDS = [card('a'), card('b'), card('c')];

function unwrap<T>(result: RoomResult<T>): T {
  if (!result.ok) throw new Error(`Expected ok, got ${result.error}`);
  return result.value;
}

function lobby(): Room {
  const room = createRoom({ code: 'ABCD', deckId: 'movies', host: { id: 'p1', name: 'Ana' } });
  return unwrap(joinRoom(room, { id: 'p2', name: 'Ivan' }));
}

function swiping(): Room {
  return unwrap(startRoom(lobby(), 'p1', CARDS));
}

function vote(room: Room, playerId: string, cardId: string, like: boolean): Room {
  return unwrap(castVote(room, playerId, cardId, like)).room;
}

describe('generateRoomCode', () => {
  it('makes a 4-letter code from the unambiguous alphabet', () => {
    const code = generateRoomCode(() => false);
    expect(code).toMatch(/^[A-Z]{4}$/);
    for (const ch of code) expect(ROOM_CODE_ALPHABET).toContain(ch);
  });

  it('retries until it finds a free code', () => {
    const taken = new Set(['AAAA']);
    const values = [0, 0, 0, 0, 0.99, 0.99, 0.99, 0.99];
    const code = generateRoomCode(
      (c) => taken.has(c),
      () => values.shift() ?? 0,
    );
    expect(code).toBe('ZZZZ');
  });
});

describe('normalizeRoomCode', () => {
  it('trims and upper-cases', () => {
    expect(normalizeRoomCode('  ktvz ')).toBe('KTVZ');
  });
});

describe('shuffle', () => {
  it('keeps every item and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input, () => 0.3);
    expect(result).toHaveLength(5);
    expect([...result].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });

  it('is deterministic for the same random source', () => {
    expect(shuffle([1, 2, 3, 4], () => 0.5)).toEqual(shuffle([1, 2, 3, 4], () => 0.5));
  });
});

describe('createRoom', () => {
  it('creates a lobby with the host as the only player', () => {
    const room = createRoom({ code: 'ABCD', deckId: 'movies', host: { id: 'p1', name: 'Ana' } });
    expect(room.status).toBe('lobby');
    expect(room.players).toEqual([{ id: 'p1', name: 'Ana', isHost: true }]);
    expect(room.options).toEqual({});
  });
});

describe('joinRoom', () => {
  it('adds a non-host player', () => {
    expect(lobby().players[1]).toEqual({ id: 'p2', name: 'Ivan', isHost: false });
  });

  it('rejects a name already in the room, ignoring case', () => {
    expect(joinRoom(lobby(), { id: 'p3', name: 'ana' })).toEqual({
      ok: false,
      error: 'NAME_TAKEN',
    });
  });

  it('rejects joining after the start', () => {
    expect(joinRoom(swiping(), { id: 'p3', name: 'Maria' })).toEqual({
      ok: false,
      error: 'ROOM_ALREADY_STARTED',
    });
  });
});

describe('startRoom', () => {
  it('starts swiping with the given cards in the given order', () => {
    const room = swiping();
    expect(room.status).toBe('swiping');
    expect(room.cards.map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('only lets the host start', () => {
    expect(startRoom(lobby(), 'p2', CARDS)).toEqual({ ok: false, error: 'NOT_HOST' });
  });

  it('rejects players who are not in the room', () => {
    expect(startRoom(lobby(), 'nobody', CARDS)).toEqual({ ok: false, error: 'NOT_IN_ROOM' });
  });

  it('rejects starting twice', () => {
    expect(startRoom(swiping(), 'p1', CARDS)).toEqual({ ok: false, error: 'ROOM_ALREADY_STARTED' });
  });

  it('rejects an empty deck', () => {
    expect(startRoom(lobby(), 'p1', [])).toEqual({ ok: false, error: 'NO_CARDS' });
  });
});

describe('castVote', () => {
  it('records a vote without a match while others have not voted', () => {
    const result = unwrap(castVote(swiping(), 'p1', 'a', true));
    expect(result.newMatch).toBe(false);
    expect(result.room.votes).toEqual({ a: { p1: true } });
    expect(result.room.matches).toEqual([]);
  });

  it('reports a match when every player likes the card', () => {
    const room = vote(swiping(), 'p1', 'a', true);
    const result = unwrap(castVote(room, 'p2', 'a', true));
    expect(result.newMatch).toBe(true);
    expect(result.room.matches).toEqual(['a']);
  });

  it('does not match when someone says nope', () => {
    const room = vote(swiping(), 'p1', 'a', true);
    const result = unwrap(castVote(room, 'p2', 'a', false));
    expect(result.newMatch).toBe(false);
    expect(result.room.matches).toEqual([]);
  });

  it('keeps matches in the order they happened', () => {
    let room = swiping();
    room = vote(room, 'p1', 'c', true);
    room = vote(room, 'p2', 'c', true);
    room = vote(room, 'p1', 'a', true);
    room = vote(room, 'p2', 'a', true);
    expect(room.matches).toEqual(['c', 'a']);
  });

  it('does not mutate the original room', () => {
    const room = swiping();
    castVote(room, 'p1', 'a', true);
    expect(room.votes).toEqual({});
  });

  it('marks the room done when everyone has voted on every card', () => {
    let room = swiping();
    for (const id of ['a', 'b', 'c']) {
      room = vote(room, 'p1', id, true);
      expect(room.status).toBe('swiping');
      room = vote(room, 'p2', id, id !== 'b');
    }
    expect(room.status).toBe('done');
    expect(room.matches).toEqual(['a', 'c']);
  });

  it('rejects a second vote on the same card', () => {
    const room = vote(swiping(), 'p1', 'a', true);
    expect(castVote(room, 'p1', 'a', false)).toEqual({ ok: false, error: 'ALREADY_VOTED' });
  });

  it('rejects unknown cards, unknown players and votes outside swiping', () => {
    expect(castVote(swiping(), 'p1', 'zzz', true)).toEqual({ ok: false, error: 'UNKNOWN_CARD' });
    expect(castVote(swiping(), 'nobody', 'a', true)).toEqual({ ok: false, error: 'NOT_IN_ROOM' });
    expect(castVote(lobby(), 'p1', 'a', true)).toEqual({ ok: false, error: 'NOT_SWIPING' });
  });
});

describe('computeMatches / isFinished', () => {
  it('only counts cards liked by all current players, in deck order', () => {
    const room: Room = {
      ...swiping(),
      votes: { c: { p1: true, p2: true }, a: { p1: true, p2: true }, b: { p1: true } },
    };
    expect(computeMatches(room)).toEqual(['a', 'c']);
    expect(isFinished(room)).toBe(false);
  });

  it('recomputes for the remaining players when someone is gone', () => {
    const room: Room = { ...swiping(), votes: { a: { p1: true, p2: false } } };
    const withoutIvan: Room = { ...room, players: room.players.filter((p) => p.id !== 'p2') };
    expect(computeMatches(room)).toEqual([]);
    expect(computeMatches(withoutIvan)).toEqual(['a']);
  });
});

describe('computeAlmostMatches', () => {
  function fourPlayers(votes: Room['votes']): Room {
    const base = swiping();
    const extra = ['p3', 'p4'].map((id) => ({ id, name: id, isHost: false }));
    return {
      ...base,
      players: [...base.players, ...extra],
      cards: [card('a'), card('b'), card('c'), card('d')],
      votes,
    };
  }

  it('includes cards liked by at least half of the players, sorted by likes', () => {
    const room = fourPlayers({
      a: { p1: true, p2: true, p3: false, p4: false },
      b: { p1: true, p2: true, p3: true, p4: false },
      c: { p1: true, p2: false, p3: false, p4: false },
      d: { p1: true, p2: true, p3: true, p4: true },
    });
    expect(computeAlmostMatches(room)).toEqual([
      { cardId: 'b', likes: 3 },
      { cardId: 'a', likes: 2 },
    ]);
  });

  it('excludes full matches and keeps deck order for equal likes', () => {
    const room = fourPlayers({
      a: { p1: true, p2: true, p3: true, p4: true },
      b: { p1: false, p2: true, p3: true, p4: false },
      c: { p1: true, p2: false, p3: false, p4: true },
    });
    expect(computeAlmostMatches(room).map((m) => m.cardId)).toEqual(['b', 'c']);
  });

  it('treats exactly 50% as almost, but not less', () => {
    const room = fourPlayers({
      a: { p1: true, p2: true },
      b: { p1: true },
    });
    expect(computeAlmostMatches(room).map((m) => m.cardId)).toEqual(['a']);
  });

  it('counts only current players and ignores cards nobody liked', () => {
    const room: Room = {
      ...swiping(),
      votes: { a: { p1: true, p2: false, gone: true }, b: { p1: false, p2: false } },
    };
    expect(computeAlmostMatches(room)).toEqual([{ cardId: 'a', likes: 1 }]);
  });

  it('is empty when there are no votes or no players', () => {
    expect(computeAlmostMatches(swiping())).toEqual([]);
    expect(computeAlmostMatches({ ...swiping(), players: [] })).toEqual([]);
  });
});

describe('toPublicRoom', () => {
  it("hides other players' votes and exposes only the viewer's", () => {
    let room = swiping();
    room = vote(room, 'p1', 'a', true);
    room = vote(room, 'p2', 'a', false);
    room = vote(room, 'p2', 'b', true);

    const view = toPublicRoom(room, 'p1');
    expect(view.selfId).toBe('p1');
    expect(view.myVotes).toEqual({ a: true });
    expect(view).not.toHaveProperty('votes');
    expect(JSON.stringify(view)).not.toContain('p2":');
  });

  it('reveals almost matches only once the room is done', () => {
    let room = swiping();
    room = vote(room, 'p1', 'a', true);
    room = vote(room, 'p2', 'a', false);
    expect(toPublicRoom(room, 'p1').almostMatches).toEqual([]);

    for (const id of ['b', 'c']) {
      room = vote(room, 'p1', id, false);
      room = vote(room, 'p2', id, false);
    }
    expect(room.status).toBe('done');
    expect(toPublicRoom(room, 'p2').almostMatches).toEqual([{ cardId: 'a', likes: 1 }]);
  });
});
