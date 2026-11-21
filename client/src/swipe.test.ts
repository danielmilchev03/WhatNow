import { describe, expect, it } from 'vitest';
import {
  MAX_TILT_DEG,
  canVote,
  flyOutDistance,
  initialVoteState,
  otherPlayersProgress,
  releaseDecision,
  swipeDecision,
  tiltDegrees,
  voteReducer,
} from './swipe';

describe('swipeDecision', () => {
  it('returns null below the threshold in both directions', () => {
    expect(swipeDecision(0, 300)).toBeNull();
    expect(swipeDecision(89, 300)).toBeNull();
    expect(swipeDecision(-89, 300)).toBeNull();
  });

  it('likes when dragged right past the threshold and nopes when dragged left', () => {
    expect(swipeDecision(90, 300)).toBe('like');
    expect(swipeDecision(250, 300)).toBe('like');
    expect(swipeDecision(-90, 300)).toBe('nope');
    expect(swipeDecision(-250, 300)).toBe('nope');
  });

  it('never decides for a zero-width card', () => {
    expect(swipeDecision(0, 0)).toBeNull();
  });
});

describe('tiltDegrees', () => {
  it('is zero at rest and follows the drag direction', () => {
    expect(tiltDegrees(0, 300)).toBe(0);
    expect(tiltDegrees(60, 300)).toBeGreaterThan(0);
    expect(tiltDegrees(-60, 300)).toBeLessThan(0);
  });

  it('is clamped to the maximum tilt', () => {
    expect(tiltDegrees(10_000, 300)).toBe(MAX_TILT_DEG);
    expect(tiltDegrees(-10_000, 300)).toBe(-MAX_TILT_DEG);
  });

  it('is zero for a zero-width card', () => {
    expect(tiltDegrees(50, 0)).toBe(0);
  });
});

describe('flyOutDistance', () => {
  it('moves the card fully off screen in the swipe direction', () => {
    expect(flyOutDistance('like', 400)).toBeGreaterThanOrEqual(400);
    expect(flyOutDistance('nope', 400)).toBeLessThanOrEqual(-400);
  });
});

describe('canVote', () => {
  it('allows the first vote for a card and blocks a second one for the same card', () => {
    expect(canVote(null, 'a')).toBe(true);
    expect(canVote('a', 'a')).toBe(false);
  });

  it('allows a vote for the next card after the previous one was voted', () => {
    expect(canVote('a', 'b')).toBe(true);
  });
});

describe('releaseDecision', () => {
  it('decides like swipeDecision when the drag ends normally', () => {
    expect(releaseDecision(120, 300, false)).toBe('like');
    expect(releaseDecision(-120, 300, false)).toBe('nope');
    expect(releaseDecision(10, 300, false)).toBeNull();
  });

  it('snaps back when the pointer was cancelled, even past the threshold', () => {
    expect(releaseDecision(250, 300, true)).toBeNull();
  });
});

describe('voteReducer', () => {
  it('locks the card once a vote is sent', () => {
    const state = voteReducer(initialVoteState, { type: 'voted', cardId: 'a' });
    expect(state.votedCardId).toBe('a');
    expect(canVote(state.votedCardId, 'a')).toBe(false);
  });

  it('reopens voting and remounts the card when the vote is rejected', () => {
    const voted = voteReducer(initialVoteState, { type: 'voted', cardId: 'a' });
    const rejected = voteReducer(voted, { type: 'rejected' });
    expect(rejected).toEqual({ votedCardId: null, retry: 1 });
  });

  it('recovers again when the same rejection happens twice', () => {
    let state = voteReducer(initialVoteState, { type: 'voted', cardId: 'a' });
    state = voteReducer(state, { type: 'rejected' });
    state = voteReducer(state, { type: 'voted', cardId: 'a' });
    state = voteReducer(state, { type: 'rejected' });
    expect(state).toEqual({ votedCardId: null, retry: 2 });
  });

  it('ignores a rejection when no vote is pending', () => {
    expect(voteReducer(initialVoteState, { type: 'rejected' })).toBe(initialVoteState);
  });
});

describe('otherPlayersProgress', () => {
  const players = [
    { id: 'p1', name: 'Ana', isHost: true },
    { id: 'p2', name: 'Ivan', isHost: false },
    { id: 'p3', name: 'Mia', isHost: false },
  ];
  const cards = [1, 2].map((n) => ({
    id: `c${n}`,
    title: `c${n}`,
    tags: [],
    source: 'local' as const,
  }));

  it('drops the viewer, joins by id and flags finished players', () => {
    const progress = [
      { playerId: 'p1', voted: 1 },
      { playerId: 'p2', voted: 2 },
    ];
    expect(otherPlayersProgress({ players, progress, selfId: 'p1', cards })).toEqual([
      { id: 'p2', name: 'Ivan', voted: 2, total: 2, done: true },
      { id: 'p3', name: 'Mia', voted: 0, total: 2, done: false },
    ]);
  });

  it('is never done without cards', () => {
    const result = otherPlayersProgress({ players, progress: [], selfId: 'p1', cards: [] });
    expect(result.every((p) => !p.done)).toBe(true);
  });
});
