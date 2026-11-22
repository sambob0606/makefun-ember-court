// The screenshot scenes behind ?shot=title|table|win|loss. Each one plays the
// real rules forward from a fresh duel for a fixed number of turns, steered by
// an autopilot, so the frame is what a real game looks like and the same seed
// always gives the same frame. The table scene stops mid-duel; the win scene
// plays well and wins; the loss scene dawdles and loses.
import { STEP } from './config.js';
import { SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/** Play the best affordable card, then end the turn. */
function goodTurn(world) {
  const state = world.state;
  for (;;) {
    const plan = world.planPlays(state.player, state.enemy);
    if (plan.length === 0) break;
    const index = state.player.hand.findIndex((card) => card.uid === plan[0]);
    if (index < 0) break;
    world.playCard('player', index);
    if (state.winner) return;
  }
  world.endPlayerTurn();
  world.fastForwardEnemy();
}

/** Play only the cheapest card, if any, then end the turn. */
function poorTurn(world) {
  const state = world.state;
  let cheapest = -1;
  for (let i = 0; i < state.player.hand.length; i += 1) {
    const card = state.player.hand[i];
    if (card.def.cost <= state.player.ember && (cheapest < 0 || card.def.cost < state.player.hand[cheapest].def.cost)) {
      cheapest = i;
    }
  }
  if (cheapest >= 0) world.playCard('player', cheapest);
  if (!state.winner) {
    world.endPlayerTurn();
    world.fastForwardEnemy();
  }
}

/**
 * Set `world` to the named scene (title, table, win or loss; any other name
 * is title) and return the screen to draw over it.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'table' && name !== 'win' && name !== 'loss') {
    // Title: let the embers drift for a few seconds behind the title card.
    for (let index = 0; index < 5 / STEP; index += 1) world.step(STEP);
    return { screen: SCREEN_TITLE };
  }
  if (name === 'table') {
    // Five good turns of real play: both hands on the table, life lost,
    // ember spent, a card mid-table.
    for (let turn = 0; turn < 5 && !state.winner; turn += 1) goodTurn(world);
    state.fx = [];
    return { screen: SCREEN_PLAY };
  }
  if (name === 'win') {
    // Play well until the Warden falls (or 40 turns pass, which never
    // happens with these decks: the good line wins by turn 12 or so).
    for (let turn = 0; turn < 40 && !state.winner; turn += 1) goodTurn(world);
    state.fx = [];
    return { screen: state.winner === 'player' ? SCREEN_WIN : SCREEN_PLAY };
  }
  // loss: dawdle while the Warden plays well.
  for (let turn = 0; turn < 40 && !state.winner; turn += 1) poorTurn(world);
  state.fx = [];
  return { screen: state.winner === 'enemy' ? SCREEN_LOSS : SCREEN_PLAY };
}
