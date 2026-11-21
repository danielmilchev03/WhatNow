/** How long the "It's a match!" overlay stays up before it dismisses itself. */
export const MATCH_OVERLAY_MS = 3000;
export const CONFETTI_COUNT = 40;
const CONFETTI_COLORS = 6;

/** The match to show after a dismiss meant for `id`: a stale dismiss leaves a newer match in place. */
export function clearMatchIf(current: string | null, id: string): string | null {
  return current === id ? null : current;
}

export interface ConfettiPiece {
  /** Horizontal start position, 0–100 (% of the screen width). */
  left: number;
  /** 0–600 ms. */
  delayMs: number;
  /** 1800–2400 ms, so delay + duration never outlasts MATCH_OVERLAY_MS. */
  durationMs: number;
  sizePx: number;
  rotateDeg: number;
  /** 0–5, an index into the palette. */
  colorIndex: number;
}

/** Builds `count` confetti pieces from `random` (values in [0, 1)); same source, same output. */
export function confettiPieces(count: number, random: () => number): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = [];
  for (let i = 0; i < count; i++) {
    pieces.push({
      left: random() * 100,
      delayMs: Math.floor(random() * 601),
      durationMs: 1800 + Math.floor(random() * 601),
      sizePx: 6 + Math.floor(random() * 8),
      rotateDeg: Math.floor(random() * 360),
      colorIndex: Math.min(CONFETTI_COLORS - 1, Math.floor(random() * CONFETTI_COLORS)),
    });
  }
  return pieces;
}
