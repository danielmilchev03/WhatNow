import { z } from 'zod';
import { DECK_IDS, PLAYER_NAME_MAX_LENGTH, ROOM_CODE_LENGTH } from '@whatnow/shared';

// Runtime validation for socket payloads: TypeScript types do not exist at runtime,
// so anything a client sends is checked here before it reaches the room logic.

const name = z.string().trim().min(1).max(PLAYER_NAME_MAX_LENGTH);

const deckOptions = z.object({
  tags: z.array(z.string().max(50)).max(50).optional(),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180),
      radiusMeters: z.number().positive().max(50_000),
    })
    .optional(),
  region: z.string().length(2).optional(),
  limit: z.number().int().positive().max(200).optional(),
});

export const createRoomSchema = z.object({
  deckId: z.enum(DECK_IDS),
  name,
  options: deckOptions.optional(),
});

export const joinRoomSchema = z.object({
  code: z.string().trim().length(ROOM_CODE_LENGTH),
  name,
});

export const voteSchema = z.object({
  cardId: z.string().min(1).max(200),
  like: z.boolean(),
});
