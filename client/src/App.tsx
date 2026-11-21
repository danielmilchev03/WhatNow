import { useTranslation } from 'react-i18next';
import { MatchOverlay } from './components/MatchOverlay';
import { useRoom } from './room';
import { HomeScreen } from './screens/HomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { SwipeScreen } from './screens/SwipeScreen';

/** Picks the screen from the room state, so the server decides where everyone is. */
function CurrentScreen() {
  const { room } = useRoom();
  if (!room) return <HomeScreen />;
  if (room.status === 'lobby') return <LobbyScreen room={room} />;
  const hasCardsLeft = room.cards.some((c) => room.myVotes[c.id] === undefined);
  if (room.status === 'swiping' && hasCardsLeft) return <SwipeScreen room={room} />;
  return <ResultsScreen room={room} />;
}

function ErrorBanner() {
  const { t } = useTranslation();
  const { error, dismissError } = useRoom();
  if (!error) return null;
  return (
    <div
      role="alert"
      className="mb-4 flex items-center gap-2 rounded-lg bg-red-100 p-3 text-red-800"
    >
      <span className="flex-1">{t(`errors.${error}`)}</span>
      <button type="button" onClick={dismissError} aria-label={t('common.dismiss')}>
        ✕
      </button>
    </div>
  );
}

function MatchLayer() {
  const { room, lastMatch, dismissMatch } = useRoom();
  const card = room?.cards.find((c) => c.id === lastMatch);
  if (!card) return null;
  return <MatchOverlay key={card.id} card={card} onDismiss={() => dismissMatch(card.id)} />;
}

export function App() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col p-4">
      <header className="mb-4 text-center text-2xl font-bold">{t('app.name')}</header>
      <ErrorBanner />
      <MatchLayer />
      <main className="flex-1">
        <CurrentScreen />
      </main>
    </div>
  );
}
