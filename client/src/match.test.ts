import { describe, expect, it } from 'vitest';
import { CONFETTI_COUNT, MATCH_OVERLAY_MS, clearMatchIf, confettiPieces } from './match';

describe('clearMatchIf', () => {
  it('clears the match it was raised for', () => {
    expect(clearMatchIf('a', 'a')).toBeNull();
  });

  it('leaves a newer match in place on a stale dismiss', () => {
    expect(clearMatchIf('b', 'a')).toBe('b');
  });

  it('stays null when nothing is showing', () => {
    expect(clearMatchIf(null, 'a')).toBeNull();
  });
});

describe('MATCH_OVERLAY_MS', () => {
  it('is 3 seconds', () => {
    expect(MATCH_OVERLAY_MS).toBe(3000);
  });
});

describe('confettiPieces', () => {
  it.each([0, 0.5, 0.999])('returns count pieces within range for random() = %s', (value) => {
    const pieces = confettiPieces(CONFETTI_COUNT, () => value);
    expect(pieces).toHaveLength(CONFETTI_COUNT);
    for (const piece of pieces) {
      expect(piece.left).toBeGreaterThanOrEqual(0);
      expect(piece.left).toBeLessThanOrEqual(100);
      expect(piece.delayMs).toBeGreaterThanOrEqual(0);
      expect(piece.durationMs).toBeGreaterThanOrEqual(1800);
      expect(piece.delayMs + piece.durationMs).toBeLessThanOrEqual(MATCH_OVERLAY_MS);
      expect(Number.isInteger(piece.colorIndex)).toBe(true);
      expect(piece.colorIndex).toBeGreaterThanOrEqual(0);
      expect(piece.colorIndex).toBeLessThanOrEqual(5);
    }
  });

  it('is deterministic for a given random source', () => {
    const make = () => {
      let n = 0;
      return () => (n++ * 0.37) % 1;
    };
    expect(confettiPieces(5, make())).toEqual(confettiPieces(5, make()));
  });

  it.each([0, -1])('returns no pieces for count %s', (count) => {
    expect(confettiPieces(count, () => 0.5)).toEqual([]);
  });
});
