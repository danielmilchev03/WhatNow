export type SwipeDecision = 'like' | 'nope';

/** Fraction of the card width the drag must cover for a release to count as a swipe. */
export const SWIPE_THRESHOLD_RATIO = 0.3;
/** Tilt, in degrees, reached at one card width of drag; never exceeded. */
export const MAX_TILT_DEG = 15;

/** What a release at horizontal offset `dx` means: a vote, or null to snap back. */
export function swipeDecision(dx: number, cardWidth: number): SwipeDecision | null {
  if (cardWidth <= 0) return null;
  const threshold = cardWidth * SWIPE_THRESHOLD_RATIO;
  if (dx >= threshold) return 'like';
  if (dx <= -threshold) return 'nope';
  return null;
}

/** Card rotation for a drag offset, in degrees, clamped to ±MAX_TILT_DEG. */
export function tiltDegrees(dx: number, cardWidth: number): number {
  if (cardWidth <= 0) return 0;
  const tilt = (dx / cardWidth) * MAX_TILT_DEG;
  return Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, tilt));
}

/** Horizontal offset that puts the card fully off screen on the decided side. */
export function flyOutDistance(decision: SwipeDecision, viewportWidth: number): number {
  const distance = viewportWidth * 1.5;
  return decision === 'like' ? distance : -distance;
}

/** Whether a vote may be sent: at most one vote per card, whether it comes from a swipe or a button. */
export function canVote(votedCardId: string | null, cardId: string): boolean {
  return votedCardId !== cardId;
}

/** What releasing a drag means; a cancelled pointer (the browser took over) always snaps back. */
export function releaseDecision(
  dx: number,
  cardWidth: number,
  cancelled: boolean,
): SwipeDecision | null {
  return cancelled ? null : swipeDecision(dx, cardWidth);
}

export interface VoteState {
  /** The card a vote was sent for and not yet answered, or null. */
  votedCardId: string | null;
  /** Bumped when a vote is rejected; used as part of the card's key to remount it. */
  retry: number;
}

export type VoteEvent = { type: 'voted'; cardId: string } | { type: 'rejected' };

export const initialVoteState: VoteState = { votedCardId: null, retry: 0 };

/** Pending-vote transitions: a vote locks its card; a rejection reopens voting and brings the card back. */
export function voteReducer(state: VoteState, event: VoteEvent): VoteState {
  switch (event.type) {
    case 'voted':
      return { ...state, votedCardId: event.cardId };
    case 'rejected':
      if (state.votedCardId === null) return state;
      return { votedCardId: null, retry: state.retry + 1 };
  }
}
