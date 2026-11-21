import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Card } from '@whatnow/shared';
import { CONFETTI_COUNT, MATCH_OVERLAY_MS, confettiPieces } from '../match';

const CONFETTI_COLORS = [
  'bg-rose-500',
  'bg-amber-400',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-pink-300',
];

/** Full-screen "It's a match!" celebration. Dismisses itself after MATCH_OVERLAY_MS or on tap. */
export function MatchOverlay({ card, onDismiss }: { card: Card; onDismiss: () => void }) {
  const { t } = useTranslation();
  const [pieces] = useState(() => confettiPieces(CONFETTI_COUNT, Math.random));
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    const timer = setTimeout(() => onDismissRef.current(), MATCH_OVERLAY_MS);
    return () => clearTimeout(timer);
  }, [card.id]);

  return (
    <button
      type="button"
      onClick={onDismiss}
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 overflow-hidden bg-rose-600/95 p-6 text-center text-white"
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-0">
        {pieces.map((piece, i) => (
          <span
            key={i}
            className={`confetti-piece absolute top-0 block rounded-sm ${CONFETTI_COLORS[piece.colorIndex]}`}
            style={{
              left: `${piece.left}%`,
              width: piece.sizePx,
              height: piece.sizePx * 1.6,
              rotate: `${piece.rotateDeg}deg`,
              animationDelay: `${piece.delayMs}ms`,
              animationDuration: `${piece.durationMs}ms`,
            }}
          />
        ))}
      </span>
      <span className="relative text-4xl font-extrabold">{t('match.title')}</span>
      <span className="relative text-7xl" aria-hidden="true">
        {card.emoji}
      </span>
      <span className="relative text-2xl font-semibold">{card.title}</span>
      <span className="relative mt-6 text-sm opacity-80">{t('match.dismissHint')}</span>
    </button>
  );
}
