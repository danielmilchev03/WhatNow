import type { Card } from '@whatnow/shared';

export function CardView({ card }: { card: Card }) {
  return (
    <article className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-2xl border p-6 text-center shadow-lg">
      {card.imageUrl ? (
        <img src={card.imageUrl} alt="" className="max-h-64 rounded-lg" />
      ) : (
        <span className="text-7xl">{card.emoji}</span>
      )}
      <h2 className="text-2xl font-bold">{card.title}</h2>
      {card.subtitle && <p className="text-gray-500">{card.subtitle}</p>}
      {card.description && <p>{card.description}</p>}
    </article>
  );
}
