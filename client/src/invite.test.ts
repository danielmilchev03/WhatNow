import { describe, expect, it } from 'vitest';
import { inviteCodeFromPath, inviteUrl } from './invite';

describe('inviteUrl', () => {
  it('joins origin and code', () => {
    expect(inviteUrl('http://h:5173', 'KTVZ')).toBe('http://h:5173/r/KTVZ');
  });

  it('strips a trailing slash from the origin', () => {
    expect(inviteUrl('http://h:5173/', 'KTVZ')).toBe('http://h:5173/r/KTVZ');
  });
});

describe('inviteCodeFromPath', () => {
  it.each([
    ['/r/KTVZ', 'KTVZ'],
    ['/r/ktvz/', 'KTVZ'],
  ])('accepts %s', (path, expected) => {
    expect(inviteCodeFromPath(path)).toBe(expected);
  });

  it.each(['/', '/r/', '/r/KTV', '/r/KTVZZ', '/r/KTV1', '/r/KTIZ', '/x/KTVZ'])(
    'rejects %s',
    (path) => {
      expect(inviteCodeFromPath(path)).toBeNull();
    },
  );
});
