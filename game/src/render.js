// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 table is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Flat shapes and canvas text for the HUD, the
// cards and the panels.
import { CARD, FIELD, FONT, MAX_EMBER, MAX_HP, PALETTE, SUITS } from './config.js';
import { PHASE_ENEMY, PHASE_OVER, PHASE_PLAYER } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';

const ENEMY_CARD = { width: 92, height: 128 };
const END_TURN = { x: 1060, y: 300, width: 170, height: 56 };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The four suit glyphs, drawn as paths so no image file is needed. */
function drawGlyph(ctx, glyph, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.08);
  const s = size;
  if (glyph === 'flame') {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.5);
    ctx.bezierCurveTo(s * 0.42, -s * 0.1, s * 0.38, s * 0.28, s * 0.12, s * 0.42);
    ctx.bezierCurveTo(s * 0.05, s * 0.5, -s * 0.05, s * 0.5, -s * 0.12, s * 0.42);
    ctx.bezierCurveTo(-s * 0.38, s * 0.28, -s * 0.42, -s * 0.1, 0, -s * 0.5);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.12);
    ctx.bezierCurveTo(s * 0.2, s * 0.08, s * 0.16, s * 0.28, 0, s * 0.34);
    ctx.bezierCurveTo(-s * 0.16, s * 0.28, -s * 0.2, s * 0.08, 0, -s * 0.12);
    ctx.fill();
  } else if (glyph === 'drop') {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.55);
    ctx.bezierCurveTo(s * 0.4, -s * 0.05, s * 0.38, s * 0.32, 0, s * 0.45);
    ctx.bezierCurveTo(-s * 0.38, s * 0.32, -s * 0.4, -s * 0.05, 0, -s * 0.55);
    ctx.fill();
  } else if (glyph === 'leaf') {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.5);
    ctx.bezierCurveTo(s * 0.5, -s * 0.25, s * 0.45, s * 0.35, 0, s * 0.5);
    ctx.bezierCurveTo(-s * 0.45, s * 0.35, -s * 0.5, -s * 0.25, 0, -s * 0.5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.42);
    ctx.lineTo(0, s * 0.44);
    ctx.stroke();
  } else {
    // gem: a cut stone
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.5);
    ctx.lineTo(s * 0.4, -s * 0.12);
    ctx.lineTo(s * 0.28, s * 0.45);
    ctx.lineTo(-s * 0.28, s * 0.45);
    ctx.lineTo(-s * 0.4, -s * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, -s * 0.12);
    ctx.lineTo(s * 0.4, -s * 0.12);
    ctx.moveTo(0, -s * 0.5);
    ctx.lineTo(0, s * 0.45);
    ctx.stroke();
  }
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, bold) {
    const key = `${size}|${bold ? 1 : 0}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    ctx.font = fonts.get(key);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function bar(x, y, w, h, frac, fill, back) {
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = back;
    ctx.fill();
    if (frac > 0) {
      roundRect(ctx, x, y, Math.max(h, w * frac), h, h / 2);
      ctx.fillStyle = fill;
      ctx.fill();
    }
  }

  function emberPips(x, y, ember, max, size) {
    for (let i = 0; i < max; i += 1) {
      ctx.beginPath();
      ctx.arc(x + i * (size + 6) + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = i < ember ? PALETTE.ember : PALETTE.emberEmpty;
      ctx.fill();
      if (i < ember) {
        ctx.fillStyle = '#fff7ed';
        ctx.beginPath();
        ctx.arc(x + i * (size + 6) + size / 2 - 1, y + size / 2 - 1, size / 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawCardBack(x, y, w, h) {
    roundRect(ctx, x, y, w, h, 10);
    ctx.fillStyle = PALETTE.cardBack;
    ctx.fill();
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2;
    ctx.stroke();
    roundRect(ctx, x + 8, y + 8, w - 16, h - 16, 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.stroke();
    drawGlyph(ctx, 'flame', x + w / 2, y + h / 2, Math.min(w, h) * 0.42, '#c4b5fd');
  }

  function drawCard(card, x, y, w, h, opts) {
    const def = card.def;
    const suit = SUITS[def.suit];
    const playable = opts && opts.playable;
    const selected = opts && opts.selected;
    const scale = w / CARD.width;
    if (selected) y -= 14;
    ctx.save();
    if (!playable && opts && opts.dim) ctx.globalAlpha = 0.55;
    roundRect(ctx, x, y, w, h, 12 * scale);
    ctx.fillStyle = PALETTE.cardFace;
    ctx.fill();
    ctx.lineWidth = selected ? 4 : 2;
    ctx.strokeStyle = selected ? PALETTE.gold : suit.dark;
    ctx.stroke();
    // Suit band at the top.
    ctx.save();
    roundRect(ctx, x, y, w, 34 * scale, 12 * scale);
    ctx.fillStyle = suit.color;
    ctx.fill();
    ctx.fillRect(x, y + 22 * scale, w, 12 * scale);
    ctx.restore();
    // In a fanned hand the next card covers the right edge: centre the name
    // and the effect text on the visible part of the card instead.
    const overlap = opts && opts.overlap;
    const textCx = overlap ? x + (w - 32 * scale) / 2 : x + w / 2;
    const textW = overlap ? w - 48 * scale : w - 16 * scale;
    text(def.name, textCx, y + 24 * scale, Math.round(15 * scale), '#ffffff', 'center', true);
    // Cost circle, top left.
    ctx.beginPath();
    ctx.arc(x + 20 * scale, y + 52 * scale, 17 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#7c2d12';
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    text(String(def.cost), x + 20 * scale, y + 59 * scale, Math.round(20 * scale), '#ffffff', 'center', true);
    // Suit glyph and power number.
    drawGlyph(ctx, suit.glyph, x + w / 2, y + 96 * scale, 52 * scale, suit.color);
    text(String(def.power), x + w / 2, y + 148 * scale, Math.round(34 * scale), PALETTE.cardInk, 'center', true);
    text(suit.name, x + w / 2, y + 168 * scale, Math.round(13 * scale), suit.dark, 'center', true);
    // Effect text.
    ctx.fillStyle = PALETTE.cardInk;
    ctx.font = `${Math.round(12.5 * scale)}px ${FONT}`;
    ctx.textAlign = 'center';
    const words = def.text.split(' ');
    let line = '';
    let ly = y + 188 * scale;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > textW && line) {
        ctx.fillText(line, textCx, ly);
        line = word;
        ly += 15 * scale;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, textCx, ly);
    if (playable) {
      roundRect(ctx, x, y, w, h, 12 * scale);
      ctx.strokeStyle = 'rgba(242,201,76,0.9)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    if (opts && opts.resonance) {
      roundRect(ctx, x - 4, y - 4, w + 8, h + 8, 14 * scale);
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 3;
      ctx.stroke();
      text('Resonance +2', x + w / 2, y + h + 38, 14, PALETTE.gold, 'center', true);
    }
    ctx.restore();
  }

  function drawPortrait(cx, cy, r, label, color, glyph) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.stroke();
    drawGlyph(ctx, glyph, cx, cy + 2, r * 0.9, 'rgba(255,255,255,0.9)');
    text(label, cx, cy + r + 22, 15, PALETTE.text, 'center', true);
  }

  function drawEnemySide(side) {
    const cx = 150;
    const cy = 210;
    drawPortrait(cx, cy, 34, 'The Ashen Warden', PALETTE.enemy, 'gem');
    const barX = cx + 62;
    const barW = 210;
    bar(barX, cy - 26, barW, 20, side.hp / MAX_HP, PALETTE.hp, PALETTE.hpBack);
    text(`${side.hp} / ${side.maxHp}`, barX + barW / 2, cy - 11, 14, '#ffffff', 'center', true);
    text('LIFE', barX + barW + 10, cy - 11, 12, PALETTE.muted, 'left', true);
    if (side.block > 0) {
      text(`+${side.block} BLOCK`, barX, cy + 44, 13, PALETTE.block, 'left', true);
    }
    text('EMBER', barX, cy + 22, 12, PALETTE.muted, 'left', true);
    emberPips(barX + 58, cy + 10, side.ember, Math.max(side.emberMax, 1), 15);
  }

  function drawPlayerSide(side) {
    const cx = 105;
    const cy = 578;
    drawPortrait(cx, cy, 30, 'You — Ember Warden', '#92400e', 'flame');
    const barX = 15;
    const barW = 190;
    bar(barX, 640, barW, 18, side.hp / MAX_HP, PALETTE.hp, PALETTE.hpBack);
    text(`${side.hp} / ${side.maxHp}`, barX + barW / 2, 654, 13, '#ffffff', 'center', true);
    if (side.block > 0) {
      text(`+${side.block} BLOCK`, barX, 706, 13, PALETTE.block, 'left', true);
    }
    text('EMBER', barX, 682, 12, PALETTE.muted, 'left', true);
    emberPips(barX + 52, 670, side.ember, Math.max(side.emberMax, 1), 11);
  }

  function handRects(hand, y) {
    const w = CARD.width;
    // A full hand fans with overlap so it never reaches the player panel.
    const gap = hand.length > 5 ? -32 : CARD.gap;
    const total = hand.length * w + (hand.length - 1) * gap;
    const startX = (FIELD.width - total) / 2;
    return hand.map((card, i) => ({
      card,
      x: startX + i * (w + gap),
      y,
      width: w,
      height: CARD.height,
    }));
  }

  function drawTable(state) {
    // Felt table.
    ctx.fillStyle = PALETTE.table;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.beginPath();
    ctx.ellipse(640, 360, 560, 250, 0, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.felt;
    ctx.fill();
    ctx.strokeStyle = PALETTE.tableEdge;
    ctx.lineWidth = 3;
    ctx.stroke();
    // Enemy hand, face down, fanned across the top.
    const enemyHand = state.enemy.hand;
    const ew = ENEMY_CARD.width;
    const eTotal = enemyHand.length * (ew + 8) - 8;
    const eStart = (FIELD.width - eTotal) / 2;
    enemyHand.forEach((card, i) => {
      drawCardBack(eStart + i * (ew + 8), 12, ew, ENEMY_CARD.height);
    });
    // Enemy side panel (right of the portrait row).
    drawEnemySide(state.enemy);
    // Centre: last played card and the duel log.
    if (state.lastPlayed) {
      const lp = state.lastPlayed;
      const lx = 640 - CARD.width / 2;
      const ly = 218;
      drawCard(lp.card, lx, ly, CARD.width, CARD.height, { resonance: lp.resonance });
      text(
        lp.by === 'player' ? 'You played' : 'Warden played',
        640, ly + CARD.height + 18, 13, PALETTE.muted, 'center', true,
      );
    } else {
      text('No card played yet', 640, 330, 15, PALETTE.muted, 'center');
    }
    // Log panel, left centre.
    roundRect(ctx, 36, 290, 300, 130, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    state.log.slice(-4).forEach((line, i) => {
      text(line, 50, 318 + i * 28, 13.5, PALETTE.text, 'left');
    });
    // End Turn button.
    const canEnd = state.phase === PHASE_PLAYER && !state.winner;
    roundRect(ctx, END_TURN.x, END_TURN.y, END_TURN.width, END_TURN.height, 10);
    ctx.fillStyle = canEnd ? PALETTE.gold : '#5b4a35';
    ctx.fill();
    text('END TURN', END_TURN.x + END_TURN.width / 2, END_TURN.y + 36, 19, canEnd ? '#3a2a00' : '#d6c9b4', 'center', true);
    text('keys 1-7 play a card · E ends turn', END_TURN.x + END_TURN.width / 2, END_TURN.y + 78, 12.5, PALETTE.muted, 'center');
    // Turn and score.
    text(`TURN ${state.turn}`, 640, 168, 15, PALETTE.muted, 'center', true);
    text(`SCORE ${state.score}`, 1110, 120, 15, PALETTE.gold, 'center', true);
    text(`Deck ${state.player.deck.length} · Discard ${state.player.discard.length}`, 1110, 142, 12.5, PALETTE.muted, 'center');
    if (state.phase === PHASE_ENEMY) {
      text('The Warden is thinking…', 640, 470, 16, '#c4b5fd', 'center', true);
    }
    // Player side panel (left column, clear of the hand) and hand.
    const rects = handRects(state.player.hand, 720 - CARD.height - 24);
    const fanned = state.player.hand.length > 5;
    rects.forEach((rect, i) => {
      const playable = state.phase === PHASE_PLAYER && rect.card.def.cost <= state.player.ember;
      drawCard(rect.card, rect.x, rect.y, rect.width, rect.height, {
        playable, dim: state.phase === PHASE_PLAYER && !playable, selected: false, overlap: fanned,
      });
      text(String(i + 1), rect.x + rect.width / 2, rect.y + rect.height + 2, 11, PALETTE.muted, 'center');
    });
    drawPlayerSide(state.player);
    // Floating damage / heal numbers.
    for (const fx of state.fx) {
      const alpha = Math.max(0, Math.min(1, fx.ttl / 0.6));
      ctx.globalAlpha = alpha;
      text(fx.text, fx.x, fx.y, 30, fx.color, 'center', true);
      ctx.globalAlpha = 1;
    }
  }

  function drawPanel(title, lines, accent) {
    const width = 640;
    const height = 150 + lines.length * 34;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    roundRect(ctx, x, y, width, height, 16);
    ctx.fillStyle = 'rgba(20,14,10,0.92)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = accent;
    ctx.stroke();
    text(title, 640, y + 72, 52, accent, 'center', true);
    lines.forEach((line, i) => {
      text(line, 640, y + 118 + i * 34, 19, PALETTE.text, 'center');
    });
    return { x, y, width, height };
  }

  function drawTitle(state, best) {
    // Drifting embers behind the title.
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (let i = 0; i < 26; i += 1) {
      const px = (i * 137.5 + state.elapsed * (12 + (i % 5) * 6)) % FIELD.width;
      const py = FIELD.height - ((i * 89.3 + state.elapsed * (20 + (i % 4) * 9)) % (FIELD.height + 40)) + 20;
      ctx.globalAlpha = 0.25 + (i % 3) * 0.15;
      drawGlyph(ctx, 'flame', px, py, 14 + (i % 3) * 6, i % 2 ? '#ff7a3c' : '#f2c94c');
    }
    ctx.globalAlpha = 1;
    // Three sample cards fanned under the title.
    const samples = [
      { def: { id: 'x', name: 'Cinder Fang', suit: 'ember', cost: 2, power: 5, effect: 'strike', text: 'Deal 5 damage.' } },
      { def: { id: 'y', name: 'Phoenix Rise', suit: 'ember', cost: 5, power: 9, effect: 'siphon', text: 'Deal 9 damage. Heal 4.' } },
      { def: { id: 'z', name: 'Stone Wall', suit: 'stone', cost: 2, power: 10, effect: 'guard', text: 'Gain 10 block.' } },
    ];
    samples.forEach((card, i) => {
      const x = 640 - CARD.width / 2 + (i - 1) * (CARD.width + 22);
      drawCard(card, x, 470, CARD.width, CARD.height, {});
    });
    text('EMBER COURT', 640, 168, 84, PALETTE.gold, 'center', true);
    text('A duel of cards, suits and embers — you against the Ashen Warden', 640, 214, 22, PALETTE.text, 'center');
    text('Play cards with the mouse or keys 1-7 · End your turn with E or the button', 640, 252, 17, PALETTE.muted, 'center');
    text('Same suit twice in a turn: Resonance +2 power · First to 0 life loses', 640, 282, 17, PALETTE.muted, 'center');
    text('PRESS SPACE OR CLICK TO BEGIN', 640, 340, 24, '#ffffff', 'center', true);
    if (best > 0) text(`Best score ${best}`, 640, 440, 17, PALETTE.gold, 'center', true);
  }

  function draw(screen, state, best) {
    resize();
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(-view.x / view.scale, -view.y / view.scale, FIELD.width + (2 * view.x) / view.scale, FIELD.height + (2 * view.y) / view.scale);
    if (screen === SCREEN_TITLE) {
      drawTitle(state, best);
      return;
    }
    drawTable(state);
    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      drawPanel('PAUSED', ['Press P or Esc to keep playing.'], PALETTE.muted);
    } else if (screen === SCREEN_WIN) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      drawPanel('VICTORY', [
        'The Ashen Warden falls — the Ember Court is yours.',
        `Score ${state.score} · Best ${Math.max(best, state.score)}`,
        'Press Space to duel again.',
      ], PALETTE.win);
    } else if (screen === SCREEN_LOSS) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      drawPanel('DEFEAT', [
        'Your embers fade. The Warden keeps the court… this time.',
        `Score ${state.score} · Best ${best}`,
        'Press Space to try again.',
      ], PALETTE.loss);
    }
  }

  return {
    draw,
    /** The player's hand rectangles, for click hit-testing (same layout as drawn). */
    playerHandRects(state) {
      return handRects(state.player.hand, 720 - CARD.height - 24);
    },
    endTurnRect() {
      return { ...END_TURN };
    },
  };
}
