// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens: title,
// play, paused, win and loss.
//
// ?seed=N fixes the shuffled decks. ?shot=title|table|win|loss (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_OVER } from './world.js';
import { ACTION_CONFIRM, ACTION_END_TURN, ACTION_PAUSE, createInput } from './input.js';
import {
  SCREEN_LOSS, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(scene.screen, world.state, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Your move — 1 ember.');
  }

  function endGame() {
    screen = world.state.winner === 'player' ? SCREEN_WIN : SCREEN_LOSS;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(world.state.winner === 'player'
      ? `Victory. Score ${world.state.score}. Best ${best}.`
      : `Defeat. Score ${world.state.score}. Best ${best}.`);
  }

  function handleClick(point) {
    if (!point) return;
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSS) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const end = renderer.endTurnRect();
    if (point.x >= end.x && point.x <= end.x + end.width && point.y >= end.y && point.y <= end.y + end.height) {
      if (world.endPlayerTurn()) announce('The Warden takes its turn.');
      return;
    }
    const rects = renderer.playerHandRects(world.state);
    for (let i = rects.length - 1; i >= 0; i -= 1) {
      const rect = rects[i];
      if (point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height) {
        playHandIndex(i);
        return;
      }
    }
  }

  function playHandIndex(index) {
    if (screen !== SCREEN_PLAY || world.state.phase !== PHASE_PLAYER) return;
    const card = world.state.player.hand[index];
    if (!card) return;
    if (card.def.cost > world.state.player.ember) {
      announce(`Not enough ember for ${card.def.name}.`);
      return;
    }
    world.playCard('player', index);
    if (world.state.winner) endGame();
    else announce(`Played ${card.def.name}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    const played = input.takePlayedIndex();
    handleClick(input.takeClick());
    if (played >= 0) playHandIndex(played);
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSS)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (actions & ACTION_END_TURN && screen === SCREEN_PLAY) {
      if (world.endPlayerTurn()) announce('The Warden takes its turn.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        const events = world.step(STEP);
        accumulator -= STEP;
        if (events & EVENT_OVER) endGame();
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(screen, world.state, best);
  }

  // Leaving the tab pauses a running game rather than letting the Warden play unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Ember Court. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
