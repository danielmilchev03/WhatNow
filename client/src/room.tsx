import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DeckId, ErrorCode, PublicRoom } from '@whatnow/shared';
import { socket } from './socket';

interface RoomContextValue {
  room: PublicRoom | null;
  error: ErrorCode | null;
  /** Counts every error event, so a repeated identical code is still observable as a change. */
  errorSeq: number;
  /** Card id of the most recent match, until dismissed. */
  lastMatch: string | null;
  createRoom: (deckId: DeckId, name: string) => void;
  joinRoom: (code: string, name: string) => void;
  startRoom: () => void;
  vote: (cardId: string, like: boolean) => void;
  dismissError: () => void;
  dismissMatch: () => void;
  leaveRoom: () => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

/** Holds the room state pushed by the server. The server is the source of truth; this only mirrors it. */
export function RoomProvider({ children }: { children: ReactNode }) {
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [errorSeq, setErrorSeq] = useState(0);
  const [lastMatch, setLastMatch] = useState<string | null>(null);

  useEffect(() => {
    const onState = (next: PublicRoom) => {
      setRoom(next);
      setError(null);
    };
    const onMatch = ({ cardId }: { cardId: string }) => setLastMatch(cardId);
    const onError = ({ code }: { code: ErrorCode }) => {
      setError(code);
      setErrorSeq((n) => n + 1);
    };

    socket.on('room:state', onState);
    socket.on('match', onMatch);
    socket.on('error', onError);
    return () => {
      socket.off('room:state', onState);
      socket.off('match', onMatch);
      socket.off('error', onError);
    };
  }, []);

  const value = useMemo<RoomContextValue>(
    () => ({
      room,
      error,
      errorSeq,
      lastMatch,
      createRoom: (deckId, name) => socket.emit('room:create', { deckId, name }),
      joinRoom: (code, name) => socket.emit('room:join', { code, name }),
      startRoom: () => socket.emit('room:start'),
      vote: (cardId, like) => socket.emit('card:vote', { cardId, like }),
      dismissError: () => setError(null),
      dismissMatch: () => setLastMatch(null),
      leaveRoom: () => {
        // A fresh connection means the server stops sending this tab updates for the old room.
        socket.disconnect().connect();
        setRoom(null);
        setLastMatch(null);
      },
    }),
    [room, error, errorSeq, lastMatch],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used inside <RoomProvider>');
  return ctx;
}
