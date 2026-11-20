import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { Card } from '@whatnow/shared';
import { flyOutDistance, releaseDecision, tiltDegrees } from '../swipe';
import type { SwipeDecision } from '../swipe';
import { CardView } from './CardView';

const FLY_OUT_MS = 250;

type Props = {
  card: Card;
  /** Called once the card has flown off screen; `liked` is true for a right swipe. */
  onSwipe: (liked: boolean) => void;
};

export function SwipeableCard({ card, onSwipe }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const activePointer = useRef<number | null>(null);
  const [pose, setPose] = useState({ dx: 0, tilt: 0 });
  const [dragging, setDragging] = useState(false);
  const onSwipeRef = useRef(onSwipe);
  const [exit, setExit] = useState<SwipeDecision | null>(null);

  useEffect(() => {
    onSwipeRef.current = onSwipe;
  });

  // Fires the vote after the fly-off animation; unmounting (e.g. a button vote) cancels it.
  useEffect(() => {
    if (!exit) return;
    const timer = setTimeout(() => onSwipeRef.current(exit === 'like'), FLY_OUT_MS);
    return () => clearTimeout(timer);
  }, [exit]);

  const width = () => ref.current?.offsetWidth ?? 0;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (exit || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (activePointer.current !== null) return;
    activePointer.current = e.pointerId;
    startX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (startX.current === null || e.pointerId !== activePointer.current) return;
    const dx = e.clientX - startX.current;
    setPose({ dx, tilt: tiltDegrees(dx, width()) });
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (startX.current === null || e.pointerId !== activePointer.current) return;
    const offset = e.clientX - startX.current;
    startX.current = null;
    activePointer.current = null;
    setDragging(false);
    const decision = releaseDecision(offset, width(), e.type === 'pointercancel');
    if (decision) {
      const dx = flyOutDistance(decision, window.innerWidth);
      setPose({ dx, tilt: tiltDegrees(dx, width()) });
      setExit(decision);
    } else {
      setPose({ dx: 0, tilt: 0 });
    }
  };

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onDragStart={(e) => e.preventDefault()}
      className="cursor-grab touch-pan-y select-none active:cursor-grabbing"
      style={{
        transform: `translateX(${pose.dx}px) rotate(${pose.tilt}deg)`,
        transition: dragging ? 'none' : `transform ${FLY_OUT_MS}ms ease-out`,
      }}
    >
      <CardView card={card} />
    </div>
  );
}
