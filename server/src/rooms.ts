import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type AlmostMatch,
  type Card,
  type DeckId,
  type DeckOptions,
  type ErrorCode,
  type Player,
  type PlayerProgress,
  type PublicRoom,
  type Room,
} from '@whatnow/shared';

/**
 * Room logic as pure functions: no sockets, no I/O, no mutation of inputs.
 * Every function returns a new Room, so callers (socket handlers, tests) decide what to store.
 */

export type RoomResult<T = Room> = { ok: true; value: T } | { ok: false; error: ErrorCode };

const ok = <T>(value: T): RoomResult<T> => ({ ok: true, value });
const fail = <T = Room>(error: ErrorCode): RoomResult<T> => ({ ok: false, error });

export type RandomFn = () => number;

export function generateRoomCode(
  isTaken: (code: string) => boolean,
  random: RandomFn = Math.random,
): string {
  for (;;) {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += ROOM_CODE_ALPHABET[Math.floor(random() * ROOM_CODE_ALPHABET.length)];
    }
    if (!isTaken(code)) return code;
  }
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Fisher-Yates shuffle that returns a new array. */
export function shuffle<T>(items: readonly T[], random: RandomFn = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

export function createRoom(params: {
  code: string;
  deckId: DeckId;
  options?: DeckOptions;
  host: { id: string; name: string };
}): Room {
  return {
    code: params.code,
    deckId: params.deckId,
    options: params.options ?? {},
    players: [{ id: params.host.id, name: params.host.name, isHost: true }],
    status: 'lobby',
    cards: [],
    votes: {},
    matches: [],
  };
}

export function joinRoom(room: Room, player: { id: string; name: string }): RoomResult {
  if (room.status !== 'lobby') return fail('ROOM_ALREADY_STARTED');
  const nameTaken = room.players.some(
    (p) => p.name.toLocaleLowerCase() === player.name.toLocaleLowerCase(),
  );
  if (nameTaken) return fail('NAME_TAKEN');
  const newPlayer: Player = { id: player.id, name: player.name, isHost: false };
  return ok({ ...room, players: [...room.players, newPlayer] });
}

/** Starts swiping with the given cards. The caller fetches and shuffles them, so order is fixed here. */
export function startRoom(room: Room, playerId: string, cards: Card[]): RoomResult {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return fail('NOT_IN_ROOM');
  if (!player.isHost) return fail('NOT_HOST');
  if (room.status !== 'lobby') return fail('ROOM_ALREADY_STARTED');
  if (cards.length === 0) return fail('NO_CARDS');
  return ok({ ...room, status: 'swiping', cards, votes: {}, matches: [] });
}

/** A card matches when every current player has liked it. */
export function isMatch(room: Room, cardId: string): boolean {
  const cardVotes = room.votes[cardId];
  if (!cardVotes || room.players.length === 0) return false;
  return room.players.every((p) => cardVotes[p.id] === true);
}

/** Card ids liked by every current player, in deck order. */
export function computeMatches(room: Room): string[] {
  return room.cards.filter((card) => isMatch(room, card.id)).map((card) => card.id);
}

/**
 * Cards liked by at least half of the current players but not by all of them,
 * most likes first (deck order for ties).
 */
export function computeAlmostMatches(room: Room): AlmostMatch[] {
  const total = room.players.length;
  if (total === 0) return [];
  return room.cards
    .map((card) => ({
      cardId: card.id,
      likes: room.players.filter((p) => room.votes[card.id]?.[p.id] === true).length,
    }))
    .filter(({ likes }) => likes > 0 && likes < total && likes * 2 >= total)
    .sort((a, b) => b.likes - a.likes);
}

/** True when every current player has voted on every card. */
export function isFinished(room: Room): boolean {
  return room.cards.every((card) =>
    room.players.every((p) => room.votes[card.id]?.[p.id] !== undefined),
  );
}

export function castVote(
  room: Room,
  playerId: string,
  cardId: string,
  like: boolean,
): RoomResult<{ room: Room; newMatch: boolean }> {
  if (!room.players.some((p) => p.id === playerId)) return fail('NOT_IN_ROOM');
  if (room.status !== 'swiping') return fail('NOT_SWIPING');
  if (!room.cards.some((c) => c.id === cardId)) return fail('UNKNOWN_CARD');
  if (room.votes[cardId]?.[playerId] !== undefined) return fail('ALREADY_VOTED');

  const votes = { ...room.votes, [cardId]: { ...room.votes[cardId], [playerId]: like } };
  let next: Room = { ...room, votes };

  const newMatch = !room.matches.includes(cardId) && isMatch(next, cardId);
  if (newMatch) next = { ...next, matches: [...next.matches, cardId] };
  if (isFinished(next)) next = { ...next, status: 'done' };

  return ok({ room: next, newMatch });
}

/** How many current cards each player has voted on, in `players` order. Counts only, never votes. */
export function computeProgress(room: Room): PlayerProgress[] {
  return room.players.map((p) => ({
    playerId: p.id,
    voted: room.cards.filter((card) => room.votes[card.id]?.[p.id] !== undefined).length,
  }));
}

/**
 * The room as one player is allowed to see it: other players' votes are left out.
 * Like counts are aggregates, but they would still reveal votes mid-game, so they wait for 'done'.
 */
export function toPublicRoom(room: Room, playerId: string): PublicRoom {
  const myVotes: Record<string, boolean> = {};
  for (const [cardId, cardVotes] of Object.entries(room.votes)) {
    const vote = cardVotes[playerId];
    if (vote !== undefined) myVotes[cardId] = vote;
  }
  return {
    code: room.code,
    deckId: room.deckId,
    options: room.options,
    players: room.players,
    status: room.status,
    cards: room.cards,
    matches: room.matches,
    almostMatches: room.status === 'done' ? computeAlmostMatches(room) : [],
    progress: computeProgress(room),
    selfId: playerId,
    myVotes,
  };
}
