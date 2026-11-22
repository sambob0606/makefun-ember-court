// The card pool: every card is an original Ember Court card. A card has a suit,
// an ember cost, a power number, and one effect kind:
//   strike — deal power damage to the foe
//   guard  — gain power block (absorbs damage until your next turn)
//   mend   — restore power life
//   siphon — deal power damage and heal half of it
//   surge  — deal power damage and draw a card
//   snare  — deal power damage and gain block equal to half of it
//   bloom  — heal power life and draw a card
// A card's power is what the table shows; Resonance adds +2 when it is the
// second card of its suit played in the same turn.
export const CARDS = [
  { id: 'spark-imp', name: 'Spark Imp', suit: 'ember', cost: 1, power: 3, effect: 'strike', text: 'Deal 3 damage.' },
  { id: 'cinder-fang', name: 'Cinder Fang', suit: 'ember', cost: 2, power: 5, effect: 'strike', text: 'Deal 5 damage.' },
  { id: 'burst', name: 'Ember Burst', suit: 'ember', cost: 3, power: 7, effect: 'strike', text: 'Deal 7 damage.' },
  { id: 'phoenix-rise', name: 'Phoenix Rise', suit: 'ember', cost: 5, power: 9, effect: 'siphon', text: 'Deal 9 damage. Heal 4.' },
  { id: 'drip', name: 'Drip', suit: 'tide', cost: 1, power: 2, effect: 'surge', text: 'Deal 2 damage. Draw a card.' },
  { id: 'wave', name: 'Tide Wave', suit: 'tide', cost: 2, power: 4, effect: 'strike', text: 'Deal 4 damage.' },
  { id: 'surge', name: 'High Surge', suit: 'tide', cost: 4, power: 6, effect: 'surge', text: 'Deal 6 damage. Draw a card.' },
  { id: 'spring-mend', name: 'Spring Mend', suit: 'tide', cost: 2, power: 6, effect: 'mend', text: 'Restore 6 life.' },
  { id: 'thorn', name: 'Thorn', suit: 'leaf', cost: 1, power: 2, effect: 'strike', text: 'Deal 2 damage.' },
  { id: 'vine-snare', name: 'Vine Snare', suit: 'leaf', cost: 2, power: 3, effect: 'snare', text: 'Deal 3 damage. Gain 1 block.' },
  { id: 'bloom', name: 'Bloom', suit: 'leaf', cost: 3, power: 5, effect: 'bloom', text: 'Restore 5 life. Draw a card.' },
  { id: 'oak-guard', name: 'Oak Guard', suit: 'leaf', cost: 2, power: 8, effect: 'guard', text: 'Gain 8 block.' },
  { id: 'pebble', name: 'Pebble', suit: 'stone', cost: 1, power: 2, effect: 'snare', text: 'Deal 2 damage. Gain 1 block.' },
  { id: 'stone-wall', name: 'Stone Wall', suit: 'stone', cost: 2, power: 10, effect: 'guard', text: 'Gain 10 block.' },
  { id: 'golem-slam', name: 'Golem Slam', suit: 'stone', cost: 4, power: 8, effect: 'strike', text: 'Deal 8 damage.' },
  { id: 'quake', name: 'Quake', suit: 'stone', cost: 6, power: 12, effect: 'strike', text: 'Deal 12 damage.' },
];

/** Look a card definition up by id. */
export function cardById(id) {
  for (const card of CARDS) if (card.id === id) return card;
  return null;
}

/**
 * Build a fresh 24-card deck: two copies of each of eight core cards plus one
 * copy of each of the eight finishers, then shuffle it with `random`.
 */
export function buildDeck(random) {
  const core = ['spark-imp', 'cinder-fang', 'drip', 'wave', 'thorn', 'vine-snare', 'pebble', 'stone-wall'];
  const finishers = ['burst', 'phoenix-rise', 'surge', 'spring-mend', 'bloom', 'oak-guard', 'golem-slam', 'quake'];
  const ids = [];
  for (const id of core) ids.push(id, id);
  for (const id of finishers) ids.push(id);
  const deck = ids.map((id) => ({ uid: 0, def: cardById(id) }));
  // Shuffle with the seeded random, then number the cards so the log can tell
  // two copies of one card apart.
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  deck.forEach((card, index) => {
    card.uid = index + 1;
  });
  return deck;
}
