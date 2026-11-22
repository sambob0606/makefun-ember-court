// Ember Court — every tuning number, colour and suit in one place.
// The table is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds. */
export const STEP = 1 / 60;

/** Starting life for both duelists, and the most life either can hold. */
export const MAX_HP = 30;

/** Ember (mana) starts at 1 a turn and grows by 1 each turn, up to this. */
export const MAX_EMBER = 10;

/** Cards drawn at the start of each of your turns (after the opening hand). */
export const DRAW_PER_TURN = 2;

/** Opening hand size for both duelists. */
export const OPENING_HAND = 5;

/** Most cards a hand can hold; draws past this are discarded. */
export const MAX_HAND = 7;

/** Playing a second card of the same suit in one turn adds this much power. */
export const RESONANCE_BONUS = 2;

/** Suits: each has a colour, a darker edge, and a glyph the renderer draws. */
export const SUITS = {
  ember: { name: 'Ember', color: '#ff7a3c', dark: '#c2410c', glyph: 'flame' },
  tide: { name: 'Tide', color: '#38bdf8', dark: '#0369a1', glyph: 'drop' },
  leaf: { name: 'Leaf', color: '#4ade80', dark: '#15803d', glyph: 'leaf' },
  stone: { name: 'Stone', color: '#cbd5e1', dark: '#64748b', glyph: 'gem' },
};

export const PALETTE = {
  backdrop: '#17120e',
  table: '#2b1d12',
  tableEdge: '#4a2f1a',
  felt: '#3d2a18',
  panel: '#241a12',
  panelEdge: '#6b4a2a',
  text: '#f5ead9',
  muted: '#b8a88f',
  gold: '#f2c94c',
  hp: '#e5534b',
  hpBack: '#3a2320',
  block: '#7dd3fc',
  ember: '#fb923c',
  emberEmpty: '#4a3527',
  enemy: '#8b5cf6',
  player: '#f2c94c',
  win: '#f2c94c',
  loss: '#94a3b8',
  cardBack: '#5b21b6',
  cardFace: '#fdf6e3',
  cardInk: '#2b2118',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'ember-court.best';

/** Card size on the table, in logical pixels. */
export const CARD = { width: 148, height: 208, gap: 14 };
