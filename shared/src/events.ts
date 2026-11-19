import type { DeckId, DeckOptions, ErrorCode, PublicRoom } from './types';

export interface CreateRoomPayload {
  deckId: DeckId;
  name: string;
  options?: DeckOptions;
}

export interface JoinRoomPayload {
  code: string;
  name: string;
}

export interface VotePayload {
  cardId: string;
  like: boolean;
}

export interface ErrorPayload {
  code: ErrorCode;
  /** English, for logs only. The UI translates `code`. */
  message: string;
}

export interface ClientToServerEvents {
  'room:create': (payload: CreateRoomPayload) => void;
  'room:join': (payload: JoinRoomPayload) => void;
  /** Host only. */
  'room:start': () => void;
  'card:vote': (payload: VotePayload) => void;
}

export interface ServerToClientEvents {
  'room:state': (room: PublicRoom) => void;
  match: (payload: { cardId: string }) => void;
  error: (payload: ErrorPayload) => void;
}
