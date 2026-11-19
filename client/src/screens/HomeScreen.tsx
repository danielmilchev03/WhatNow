import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PLAYER_NAME_MAX_LENGTH,
  ROOM_CODE_LENGTH,
  type DeckId,
  type DeckInfo,
} from '@whatnow/shared';
import { useRoom } from '../room';

export function HomeScreen() {
  const { t } = useTranslation();
  const { createRoom, joinRoom } = useRoom();
  const [decks, setDecks] = useState<DeckInfo[]>([]);
  const [deckId, setDeckId] = useState<DeckId>('movies');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    fetch('/api/decks')
      .then((res) => res.json() as Promise<DeckInfo[]>)
      .then(setDecks)
      .catch(() => setDecks([]));
  }, []);

  const trimmedName = name.trim();

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    if (trimmedName) createRoom(deckId, trimmedName);
  };

  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    if (trimmedName && code.trim().length === ROOM_CODE_LENGTH) joinRoom(code.trim(), trimmedName);
  };

  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-1">
        <span className="font-medium">{t('home.nameLabel')}</span>
        <input
          className="rounded-lg border p-3"
          value={name}
          maxLength={PLAYER_NAME_MAX_LENGTH}
          placeholder={t('home.namePlaceholder')}
          onChange={(e) => setName(e.target.value)}
          autoComplete="nickname"
        />
      </label>

      <form onSubmit={onCreate} className="flex flex-col gap-3 rounded-xl border p-4">
        <h2 className="text-lg font-semibold">{t('home.createTitle')}</h2>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-medium">{t('home.deckLabel')}</legend>
          {decks.map((deck) => (
            <label key={deck.id} className="flex items-center gap-2">
              <input
                type="radio"
                name="deck"
                value={deck.id}
                checked={deckId === deck.id}
                disabled={!deck.available}
                onChange={() => setDeckId(deck.id)}
              />
              {t(`decks.${deck.id}`)}
            </label>
          ))}
        </fieldset>
        <button
          type="submit"
          disabled={!trimmedName}
          className="rounded-lg bg-rose-600 p-3 font-semibold text-white disabled:opacity-50"
        >
          {t('home.createButton')}
        </button>
      </form>

      <form onSubmit={onJoin} className="flex flex-col gap-3 rounded-xl border p-4">
        <h2 className="text-lg font-semibold">{t('home.joinTitle')}</h2>
        <input
          className="rounded-lg border p-3 text-center text-2xl tracking-widest uppercase"
          value={code}
          maxLength={ROOM_CODE_LENGTH}
          placeholder={t('home.codePlaceholder')}
          aria-label={t('home.codeLabel')}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!trimmedName || code.trim().length !== ROOM_CODE_LENGTH}
          className="rounded-lg border-2 border-rose-600 p-3 font-semibold text-rose-600 disabled:opacity-50"
        >
          {t('home.joinButton')}
        </button>
      </form>
    </div>
  );
}
