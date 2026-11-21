import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@whatnow/shared';

/** The link that opens the join screen for `code`. A trailing slash on `origin` is ignored. */
export function inviteUrl(origin: string, code: string): string {
  return `${origin.replace(/\/$/, '')}/r/${code}`;
}

/** The room code in a `/r/CODE` path, uppercased, or null when the path isn't a valid invite. */
export function inviteCodeFromPath(pathname: string): string | null {
  const match = /^\/r\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  const code = match[1]!.toUpperCase();
  if (code.length !== ROOM_CODE_LENGTH) return null;
  return [...code].every((letter) => ROOM_CODE_ALPHABET.includes(letter)) ? code : null;
}
