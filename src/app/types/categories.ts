/**
 * Every category the API accepts, in display order. Keep in sync with
 * GAME_CATEGORIES in the backend (src/games/domain/game.model.ts).
 */
export const GAME_CATEGORIES = [
  'Action',
  'Adventure',
  'RPG',
  'FPS',
  'MOBA',
  'MMO',
  'Sports',
  'Strategy',
  'Indie',
] as const;

export type gameCategory = (typeof GAME_CATEGORIES)[number];

export const isGameCategory = (value: unknown): value is gameCategory =>
  typeof value === 'string' &&
  (GAME_CATEGORIES as readonly string[]).includes(value);
