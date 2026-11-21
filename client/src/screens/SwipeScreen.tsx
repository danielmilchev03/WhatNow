import { useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PublicRoom } from '@whatnow/shared';
import { SwipeableCard } from '../components/SwipeableCard';
import { useRoom } from '../room';
import { canVote, initialVoteState, otherPlayersProgress, voteReducer } from '../swipe';

export function SwipeScreen({ room }: { room: PublicRoom }) {
  const { t } = useTranslation();
  const { vote, errorSeq } = useRoom();
  const [{ votedCardId, retry }, dispatch] = useReducer(voteReducer, initialVoteState);
  const [seenErrorSeq, setSeenErrorSeq] = useState(errorSeq);
  const index = room.cards.findIndex((c) => room.myVotes[c.id] === undefined);
  const card = room.cards[index];

  // A rejected vote leaves the card unvoted on the server: reopen voting and bring the card back.
  if (errorSeq !== seenErrorSeq) {
    setSeenErrorSeq(errorSeq);
    dispatch({ type: 'rejected' });
  }

  if (!card) return null;

  const others = otherPlayersProgress(room);
  const pending = !canVote(votedCardId, card.id);

  const voteOnce = (liked: boolean) => {
    if (!canVote(votedCardId, card.id)) return;
    dispatch({ type: 'voted', cardId: card.id });
    vote(card.id, liked);
  };

  return (
    <div className="flex flex-col gap-4 overflow-x-hidden">
      <p className="text-center text-sm text-gray-500">
        {t('swipe.progress', { current: index + 1, total: room.cards.length })}
      </p>
      {others.length > 0 && (
        <ul
          aria-label={t('swipe.othersProgress')}
          className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500"
        >
          {others.map((p) => (
            <li key={p.id} className="max-w-full truncate">
              {t('swipe.playerProgress', { name: p.name, voted: p.voted, total: p.total })}
              {p.done && (
                <span role="img" aria-label={t('swipe.playerDone', { name: p.name })}>
                  {' '}
                  ✓
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <SwipeableCard key={`${card.id}-${retry}`} card={card} onSwipe={voteOnce} />
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => voteOnce(false)}
          disabled={pending}
          className="rounded-full bg-gray-200 p-4 text-3xl disabled:opacity-50"
          aria-label={t('swipe.nope')}
        >
          👎
        </button>
        <button
          type="button"
          onClick={() => voteOnce(true)}
          disabled={pending}
          className="rounded-full bg-rose-600 p-4 text-3xl disabled:opacity-50"
          aria-label={t('swipe.like')}
        >
          👍
        </button>
      </div>
    </div>
  );
}
