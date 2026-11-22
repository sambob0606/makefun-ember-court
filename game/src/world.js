// The duel's rules and state, with no drawing and no browser in it: hands,
// decks, ember, block, life, turns, the Warden's choices and the score.
// step() advances one fixed step and returns what happened as bit flags, so
// the caller can react without the world knowing about screens or sound.
import {
  DRAW_PER_TURN, MAX_EMBER, MAX_HAND, MAX_HP, OPENING_HAND, RESONANCE_BONUS, STEP,
} from './config.js';
import { buildDeck } from './cards.js';

export const PHASE_PLAYER = 'player';
export const PHASE_ENEMY = 'enemy';
export const PHASE_OVER = 'over';

export const EVENT_PLAYED = 1;
export const EVENT_OVER = 2;
export const EVENT_TURN = 4;

/** Seconds the Warden waits between its plays, so its turn reads on screen. */
const ENEMY_PACE = 0.55;
/** Seconds after its last play before the Warden hands the turn back. */
const ENEMY_END_PAUSE = 0.5;

function newSide(deck) {
  return {
    hp: MAX_HP, maxHp: MAX_HP, block: 0,
    ember: 0, emberMax: 0,
    deck, hand: [], discard: [],
    playedSuits: [],
  };
}

/**
 * Score one card for the side about to play it: damage per ember first, then
 * defence when hurt, then draw. `lethal` is the damage that would end the
 * duel on the spot.
 */
function scoreCard(card, self, foe, lethal) {
  const def = card.def;
  const affordable = def.cost <= self.ember;
  if (!affordable) return -1;
  const resonance = self.playedSuits.includes(def.suit) ? RESONANCE_BONUS : 0;
  const power = def.power + resonance;
  if (def.effect === 'strike' || def.effect === 'siphon' || def.effect === 'surge' || def.effect === 'snare') {
    if (power >= lethal) return 1000 + power;
    return power * 10 - def.cost * 3 + (def.effect === 'surge' ? 6 : 0) + (def.effect === 'siphon' ? 4 : 0);
  }
  if (def.effect === 'guard') {
    if (self.hp <= 12) return 120 + power;
    return self.hp < MAX_HP - 4 ? 30 + power : 8;
  }
  if (def.effect === 'mend' || def.effect === 'bloom') {
    const missing = MAX_HP - self.hp;
    if (missing <= 0) return 2;
    return 60 + Math.min(power, missing) * 4 + (def.effect === 'bloom' ? 6 : 0);
  }
  return 5;
}

/** Pick the plays a side makes this turn, best first, until its ember runs out. */
function planPlays(self, foe) {
  const plan = [];
  const hand = self.hand.slice();
  let ember = self.ember;
  let hp = self.hp;
  const lethalBase = foe.hp + foe.block;
  for (;;) {
    let best = -1;
    let bestScore = 0;
    for (let i = 0; i < hand.length; i += 1) {
      const probe = { ...self, ember, hp, hand };
      const score = scoreCard(hand[i], probe, foe, lethalBase);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best < 0) break;
    const card = hand[best];
    plan.push(card.uid);
    ember -= card.def.cost;
    if (card.def.effect === 'mend' || card.def.effect === 'bloom') hp = Math.min(MAX_HP, hp + card.def.power);
    hand.splice(best, 1);
  }
  return plan;
}

export function createWorld(random) {
  const state = {
    turn: 0,
    phase: PHASE_PLAYER,
    winner: null,
    player: null,
    enemy: null,
    log: [],
    fx: [],
    lastPlayed: null,
    score: 0,
    wins: 0,
    enemyTimer: 0,
    enemyPlan: [],
    elapsed: 0,
  };

  function log(line) {
    state.log.push(line);
    if (state.log.length > 4) state.log.shift();
  }

  function drawCards(side, count) {
    for (let n = 0; n < count; n += 1) {
      if (side.deck.length === 0) {
        if (side.discard.length === 0) return;
        side.deck = side.discard;
        side.discard = [];
        for (let i = side.deck.length - 1; i > 0; i -= 1) {
          const j = Math.floor(random() * (i + 1));
          const tmp = side.deck[i];
          side.deck[i] = side.deck[j];
          side.deck[j] = tmp;
        }
      }
      if (side.hand.length >= MAX_HAND) {
        side.discard.push(side.deck.pop());
      } else {
        side.hand.push(side.deck.pop());
      }
    }
  }

  function dealDamage(target, amount, sourceName) {
    let left = amount;
    if (target.block > 0) {
      const absorbed = Math.min(target.block, left);
      target.block -= absorbed;
      left -= absorbed;
    }
    if (left > 0) target.hp = Math.max(0, target.hp - left);
    return left;
  }

  function heal(target, amount) {
    target.hp = Math.min(target.maxHp, target.hp + amount);
  }

  function addFx(x, y, text, color) {
    state.fx.push({ x, y, text, color, ttl: 1.2 });
  }

  /** Play the card at `handIndex` for `sideName` ('player' or 'enemy'). */
  function playCard(sideName, handIndex) {
    const self = state[sideName];
    const foe = state[sideName === 'player' ? 'enemy' : 'player'];
    if (state.phase !== sideName || state.winner) return false;
    if (handIndex < 0 || handIndex >= self.hand.length) return false;
    const card = self.hand[handIndex];
    const def = card.def;
    if (def.cost > self.ember) return false;
    self.ember -= def.cost;
    self.hand.splice(handIndex, 1);
    self.discard.push(card);
    const resonance = self.playedSuits.includes(def.suit);
    const power = def.power + (resonance ? RESONANCE_BONUS : 0);
    self.playedSuits.push(def.suit);
    state.lastPlayed = { card, by: sideName, power, resonance };
    const who = sideName === 'player' ? 'You' : 'Warden';
    // Floating numbers land in the clear strip above or below the table's
    // centre card: damage by the foe's side, healing by the healer's side.
    const dmgPos = sideName === 'player' ? { x: 640, y: 205 } : { x: 640, y: 472 };
    const healPos = sideName === 'player' ? { x: 640, y: 472 } : { x: 640, y: 205 };
    if (def.effect === 'strike' || def.effect === 'surge' || def.effect === 'snare') {
      const dealt = dealDamage(foe, power, who);
      addFx(dmgPos.x, dmgPos.y, `-${dealt}`, '#ff6b5e');
      if (sideName === 'player') state.score += dealt;
      log(`${who} played ${def.name} — ${dealt} damage${resonance ? ' (Resonance +2)' : ''}.`);
    } else if (def.effect === 'siphon') {
      const dealt = dealDamage(foe, power, who);
      heal(self, 4);
      addFx(dmgPos.x, dmgPos.y, `-${dealt}`, '#ff6b5e');
      addFx(healPos.x, healPos.y, '+4', '#4ade80');
      if (sideName === 'player') state.score += dealt;
      log(`${who} played ${def.name} — ${dealt} damage, healed 4.`);
    } else if (def.effect === 'guard') {
      self.block += power;
      log(`${who} played ${def.name} — gained ${power} block.`);
    } else if (def.effect === 'mend') {
      heal(self, power);
      log(`${who} played ${def.name} — restored ${power} life.`);
    } else if (def.effect === 'bloom') {
      heal(self, power);
      drawCards(self, 1);
      log(`${who} played ${def.name} — restored ${power} life, drew a card.`);
    }
    if (def.effect === 'surge') drawCards(self, 1);
    if (def.effect === 'snare') self.block += Math.floor(power / 2);
    if (foe.hp <= 0) {
      state.winner = sideName;
      state.phase = PHASE_OVER;
      if (sideName === 'player') {
        state.wins += 1;
        state.score += 50;
      }
      log(sideName === 'player' ? 'The Ashen Warden falls. Victory!' : 'Your embers fade. Defeat.');
      return true;
    }
    return true;
  }

  function startPlayerTurn() {
    state.turn += 1;
    const self = state.player;
    self.emberMax = Math.min(MAX_EMBER, state.turn);
    self.ember = self.emberMax;
    self.block = 0;
    self.playedSuits = [];
    drawCards(self, state.turn === 1 ? 0 : DRAW_PER_TURN);
    state.phase = PHASE_PLAYER;
    state.enemyPlan = [];
    log(`Turn ${state.turn} — your move. ${self.ember} ember.`);
  }

  function startEnemyTurn() {
    const self = state.enemy;
    self.emberMax = Math.min(MAX_EMBER, state.turn);
    self.ember = self.emberMax;
    self.block = 0;
    self.playedSuits = [];
    drawCards(self, DRAW_PER_TURN);
    state.phase = PHASE_ENEMY;
    state.enemyPlan = planPlays(self, state.player);
    state.enemyTimer = 0.4;
    log('The Warden takes its turn…');
  }

  function endPlayerTurn() {
    if (state.phase !== PHASE_PLAYER || state.winner) return false;
    startEnemyTurn();
    return true;
  }

  /** Play every planned Warden card at once (the screenshot scenes use this). */
  function fastForwardEnemy() {
    while (state.phase === PHASE_ENEMY && !state.winner) {
      if (state.enemyPlan.length === 0) {
        startPlayerTurn();
        break;
      }
      const uid = state.enemyPlan.shift();
      const index = state.enemy.hand.findIndex((card) => card.uid === uid);
      if (index >= 0) playCard('enemy', index);
    }
  }

  function reset() {
    state.turn = 0;
    state.winner = null;
    state.phase = PHASE_PLAYER;
    state.log = [];
    state.fx = [];
    state.lastPlayed = null;
    state.score = 0;
    state.enemyPlan = [];
    state.enemyTimer = 0;
    state.player = newSide(buildDeck(random));
    state.enemy = newSide(buildDeck(random));
    drawCards(state.player, OPENING_HAND);
    drawCards(state.enemy, OPENING_HAND);
    state.turn = 1;
    state.player.emberMax = 1;
    state.player.ember = 1;
    state.player.playedSuits = [];
    log('The duel begins. You hold 1 ember.');
  }

  /**
   * One fixed step. During the Warden's turn it plays one planned card per
   * beat, then hands the turn back. `events` says what happened.
   */
  function step(dt) {
    let events = 0;
    state.elapsed += dt;
    for (let i = state.fx.length - 1; i >= 0; i -= 1) {
      state.fx[i].ttl -= dt;
      state.fx[i].y -= 26 * dt;
      if (state.fx[i].ttl <= 0) state.fx.splice(i, 1);
    }
    if (state.phase === PHASE_ENEMY && !state.winner) {
      state.enemyTimer -= dt;
      if (state.enemyTimer <= 0) {
        if (state.enemyPlan.length > 0) {
          const uid = state.enemyPlan.shift();
          const index = state.enemy.hand.findIndex((card) => card.uid === uid);
          if (index >= 0) playCard('enemy', index);
          events |= EVENT_PLAYED;
          state.enemyTimer = ENEMY_PACE;
        } else if (state.enemyPlan !== null) {
          // Plan drained: pause one beat, then hand the turn back.
          state.enemyPlan = null;
          state.enemyTimer = ENEMY_END_PAUSE;
        } else {
          startPlayerTurn();
          events |= EVENT_TURN;
        }
      }
    }
    if (state.winner) events |= EVENT_OVER;
    return events;
  }

  return {
    state,
    reset,
    playCard,
    endPlayerTurn,
    startPlayerTurn,
    startEnemyTurn,
    fastForwardEnemy,
    planPlays,
    drawCards,
    step,
  };
}

/** The step size the world advances in, re-exported for the loop. */
export { STEP };
