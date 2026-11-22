// Keyboard and pointer input. Number keys play a card from the hand, E ends
// the turn, Space or Enter confirms (start or restart), P or Escape pauses.
// One-shot presses are queued as bit flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_END_TURN = 4;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const END_TURN = new Set(['KeyE']);
const NUMBER_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7'];

export function createInput(canvas) {
  let actions = 0;
  let playedIndex = -1;
  let clicked = null;

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (END_TURN.has(event.code)) {
      if (!event.repeat) actions |= ACTION_END_TURN;
    } else if (NUMBER_KEYS.includes(event.code)) {
      playedIndex = NUMBER_KEYS.indexOf(event.code);
    } else {
      return;
    }
    event.preventDefault();
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    clicked = {
      x: (event.clientX - rect.left) * (1280 / rect.width),
      y: (event.clientY - rect.top) * (720 / rect.height),
    };
    actions |= ACTION_CONFIRM;
  });

  return {
    /** One-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The hand index a number key asked to play, or -1. */
    takePlayedIndex() {
      const index = playedIndex;
      playedIndex = -1;
      return index;
    },
    /** The last pointer position in table coordinates, or null. */
    takeClick() {
      const point = clicked;
      clicked = null;
      return point;
    },
  };
}
