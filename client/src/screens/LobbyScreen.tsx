import { useTranslation } from 'react-i18next';
import type { PublicRoom } from '@whatnow/shared';
import { InviteShare } from '../components/InviteShare';
import { useRoom } from '../room';

export function LobbyScreen({ room }: { room: PublicRoom }) {
  const { t } = useTranslation();
  const { startRoom, leaveRoom } = useRoom();
  const isHost = room.players.some((p) => p.id === room.selfId && p.isHost);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <p className="text-sm text-gray-500">{t('lobby.codeLabel')}</p>
        <p className="font-mono text-5xl font-bold tracking-widest">{room.code}</p>
        <p className="mt-1 text-sm text-gray-500">{t(`decks.${room.deckId}`)}</p>
      </div>

      <InviteShare code={room.code} />

      <section>
        <h2 className="mb-2 font-semibold">{t('lobby.players', { count: room.players.length })}</h2>
        <ul className="flex flex-col gap-1">
          {room.players.map((player) => (
            <li key={player.id} className="rounded-lg bg-gray-100 p-2">
              {player.name}
              {player.isHost && ` · ${t('lobby.host')}`}
              {player.id === room.selfId && ` · ${t('lobby.you')}`}
            </li>
          ))}
        </ul>
      </section>

      {isHost ? (
        <button
          type="button"
          onClick={startRoom}
          className="rounded-lg bg-rose-600 p-3 font-semibold text-white"
        >
          {t('lobby.startButton')}
        </button>
      ) : (
        <p className="text-center text-gray-500">{t('lobby.waitingForHost')}</p>
      )}

      <button type="button" onClick={leaveRoom} className="text-sm text-gray-500 underline">
        {t('common.leave')}
      </button>
    </div>
  );
}
