import { useTranslation } from 'react-i18next';
import type { PublicRoom } from '@whatnow/shared';
import { CardView } from '../components/CardView';
import { useRoom } from '../room';

export function SwipeScreen({ room }: { room: PublicRoom }) {
  const { t } = useTranslation();
  const { vote } = useRoom();
  const index = room.cards.findIndex((c) => room.myVotes[c.id] === undefined);
  const card = room.cards[index];
  if (!card) return null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-gray-500">
        {t('swipe.progress', { current: index + 1, total: room.cards.length })}
      </p>
      <CardView card={card} />
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => vote(card.id, false)}
          className="rounded-full bg-gray-200 p-4 text-3xl"
          aria-label={t('swipe.nope')}
        >
          👎
        </button>
        <button
          type="button"
          onClick={() => vote(card.id, true)}
          className="rounded-full bg-rose-600 p-4 text-3xl"
          aria-label={t('swipe.like')}
        >
          👍
        </button>
      </div>
    </div>
  );
}
