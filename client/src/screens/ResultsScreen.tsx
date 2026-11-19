import { useTranslation } from 'react-i18next';
import type { PublicRoom } from '@whatnow/shared';
import { useRoom } from '../room';

export function ResultsScreen({ room }: { room: PublicRoom }) {
  const { t } = useTranslation();
  const { leaveRoom } = useRoom();
  const matches = room.matches
    .map((id) => room.cards.find((c) => c.id === id))
    .filter((c) => c !== undefined);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-center text-xl font-semibold">{t('results.title')}</h2>
      {room.status !== 'done' && (
        <p className="text-center text-gray-500">{t('results.waitingForOthers')}</p>
      )}

      {matches.length === 0 ? (
        <p className="text-center text-gray-500">{t('results.noMatches')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {matches.map((card) => (
            <li key={card.id} className="flex items-center gap-3 rounded-lg bg-rose-50 p-3">
              <span className="text-3xl">{card.emoji}</span>
              <div>
                <p className="font-semibold">{card.title}</p>
                {card.subtitle && <p className="text-sm text-gray-500">{card.subtitle}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={leaveRoom} className="rounded-lg border p-3">
        {t('results.backHome')}
      </button>
    </div>
  );
}
