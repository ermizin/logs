'use strict';
/* Интерфейсный слой кадра: рубрика, часы, главы, субтитры, подписи, пометки маркером. */

// 2D-аффинные матрицы [a b c d e f]
const Mx = {
  I: () => [1, 0, 0, 1, 0, 0],
  mul: (m, n) => [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ],
  T: (x, y) => [1, 0, 0, 1, x, y],
  S: (s) => [s, 0, 0, s, 0, 0],
  R: (a) => [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0],
  ap: (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]],
  chain: (...ms) => ms.reduce((a, b) => Mx.mul(a, b)),
};

/* ---------- субтитры (ReelFrame: Onest 700 56/68, on-ink на плашке ink, активное слово marker-on-fill) ---------- */
const CARDS = [
  [0.9, 3.7, 'Почему грудь с имплантом может стать твёрдой'],
  [3.9, 5.8, 'Организм отгораживает любой имплант'],
  [5.8, 7.6, 'Это нормальная реакция на инородное тело'],
  [7.6, 10.0, 'За минуты оболочку покрывают белки крови'],
  [10.0, 12.6, 'Макрофаги пытаются его «съесть» — и не могут'],
  [12.6, 14.6, 'Они сливаются в гигантские клетки'],
  [14.6, 17.4, 'Фибробласты плетут вокруг коллаген'],
  [17.6, 20.2, 'Через несколько недель готова капсула'],
  [20.2, 21.8, 'Тонкая и мягкая — это норма'],
  [22.0, 23.9, 'Но иногда воспаление не затихает'],
  [23.9, 25.4, 'Точная причина неизвестна'],
  [25.4, 27.8, 'Версии: бактерии, кровь, облучение'],
  [27.8, 30.6, 'Бактерии прячутся в плёнку от иммунитета'],
  [30.6, 33.2, 'Фибробласты становятся миофибробластами'],
  [33.2, 36.4, 'Эти клетки сокращаются и стягивают коллаген'],
  [36.6, 38.3, 'Капсула толстеет и сжимается'],
  [38.3, 39.7, 'как мешок на шнурке'],
  [39.8, 42.6, 'Объём геля не меняется, а места меньше'],
  [42.6, 45.4, 'Имплант становится круглым и уходит вверх'],
  [45.4, 48.0, 'Грудь плотнеет, форма искажается'],
  [48.2, 50.8, 'Это оценивают по шкале Бейкера'],
  [50.8, 53.4, 'III–IV степень обычно лечат операцией'],
];

const _wrapCache = new Map();
// раскладка субтитра: одна строка или две сбалансированные; не влезает — кегль уменьшается
function layoutSub(ctx, text, maxW, size0 = 56) {
  const key = text + '|' + maxW + '|' + size0;
  if (_wrapCache.has(key)) return _wrapCache.get(key);
  let res = null;
  for (let size = size0; size >= 40; size -= 2) {
    font(ctx, 700, size);
    const words = text.split(' ');
    const space = ctx.measureText(' ').width;
    const ws = words.map((w) => ctx.measureText(w).width);
    const sum = (a, b) => ws.slice(a, b).reduce((x, y) => x + y, 0) + space * Math.max(0, b - a - 1);
    const mk = (a, b) => words.slice(a, b).map((w, i) => ({ w, width: ws[a + i], i: a + i }));
    if (sum(0, words.length) <= maxW) { res = { lines: [mk(0, words.length)], space, size }; break; }
    let best = null;
    for (let k = 1; k < words.length; k++) {
      const a = sum(0, k), b = sum(k, words.length);
      if (a > maxW || b > maxW) continue;
      const score = Math.max(a, b) + (b > a ? 0 : 6);
      if (!best || score < best.score) best = { k, score };
    }
    if (best) { res = { lines: [mk(0, best.k), mk(best.k, words.length)], space, size }; break; }
  }
  if (!res) { font(ctx, 700, 40); res = { lines: [text.split(' ').map((w, i) => ({ w, width: ctx.measureText(w).width, i }))], space: ctx.measureText(' ').width, size: 40 }; }
  _wrapCache.set(key, res);
  return res;
}

function drawSubtitles(ctx, t) {
  for (const [a, b, text] of CARDS) {
    if (t < a - 0.01 || t > b + 0.2) continue;
    const inK = E.outQ(invLerp(a, a + 0.22, t)), outK = invLerp(b - 0.02, b + 0.16, t);
    const alpha = inK * (1 - outK);
    if (alpha <= 0) continue;
    const { lines, space, size } = layoutSub(ctx, text, 836);
    font(ctx, 700, size);
    const nWords = lines.reduce((s, l) => s + l.length, 0);
    const speak = clamp((t - a - 0.15) / Math.max(0.6, b - a - 0.55));
    const active = Math.min(nWords - 1, Math.floor(speak * nWords));
    const lh = Math.round((size * 68) / 56), padX = 30, padY = 20;
    const widths = lines.map((l) => l.reduce((s, w) => s + w.width, 0) + space * (l.length - 1));
    const bw = Math.max(...widths) + padX * 2, bh = lines.length * lh + padY * 2;
    const cx = 510, cy = 1292;
    ctx.save();
    ctx.globalAlpha = alpha;
    const sc = lerp(0.94, 1, inK);
    ctx.translate(cx, cy + (1 - inK) * 16); ctx.scale(sc, sc);
    ctx.fillStyle = PAL.ink; roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 12); ctx.fill();
    ctx.textBaseline = 'alphabetic';
    lines.forEach((l, li) => {
      let x = -widths[li] / 2;
      const y = -bh / 2 + padY + lh * li + Math.round(size * 0.93);
      l.forEach((w) => {
        const wa = clamp((t - a - 0.05 - w.i * 0.035) / 0.18);
        ctx.globalAlpha = alpha * wa;
        ctx.fillStyle = w.i === active && speak < 1 ? PAL.markerOnFill : PAL.onInk;
        ctx.fillText(w.w, x, y + (1 - E.out(wa)) * 10);
        x += w.width + space;
      });
    });
    ctx.restore();
  }
}

/* ---------- рубрика, часы, главы ---------- */
function drawTag(ctx, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  font(ctx, 500, 26, 'mono'); ctx.fillStyle = PAL.ink; ctx.textBaseline = 'alphabetic';
  spacedText(ctx, 'РАЗБОР', 60, 276, 2.1);
  ctx.restore();
}

const CLOCK = [
  [0.0, 'ДЕНЬ 0'], [6.8, '1 МИН'], [8.8, '2 Ч'], [10.2, '2 СУТ'], [12.4, '1 НЕД'], [14.6, '3 НЕД'], [18.2, '6 НЕД'],
  [22.0, '3 МЕС'], [28.6, '6 МЕС'], [33.0, '1 ГОД'],
  [39.8, 'БЕЙКЕР II'], [41.0, 'БЕЙКЕР III'], [45.4, 'БЕЙКЕР IV'],
];
function drawClock(ctx, t, alpha) {
  if (alpha <= 0) return;
  let i = 0;
  while (i + 1 < CLOCK.length && t >= CLOCK[i + 1][0]) i++;
  const k = E.outQ(invLerp(CLOCK[i][0], CLOCK[i][0] + 0.4, t));
  const cur = CLOCK[i][1], prev = i > 0 ? CLOCK[i - 1][1] : cur;
  const baker = cur.startsWith('БЕЙКЕР');
  const hot = cur.endsWith('III') || cur.endsWith('IV');
  ctx.save(); ctx.globalAlpha = alpha;
  font(ctx, 500, 26, 'mono'); ctx.textBaseline = 'alphabetic';
  const xr = 1020, y = 276;
  // «прокрутка» значения
  ctx.save();
  ctx.beginPath(); ctx.rect(560, y - 34, 470, 46); ctx.clip();
  if (k < 1 && i > 0) {
    ctx.globalAlpha = alpha * (1 - k); ctx.fillStyle = PAL.ink;
    spacedText(ctx, prev, xr, y - k * 30, 2.1, 'right');
  }
  ctx.globalAlpha = alpha * (i > 0 ? k : 1);
  ctx.fillStyle = hot ? PAL.iodine : PAL.ink;
  const w = spacedText(ctx, cur, xr, y + (i > 0 ? (1 - k) * 30 : 0), 2.1, 'right');
  ctx.restore();
  // значок: циферблат (время) или шкала (Бейкер) — вплотную к значению
  const wp = spacedWidth(ctx, prev, 2.1);
  const ix = xr - lerp(i > 0 ? wp : w, w, k) - 34, iy = y - 9;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  if (!baker) {
    const spin = (i + k) * TAU * 0.75;
    ctx.beginPath(); ctx.arc(ix, iy, 13, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ix + Math.cos(spin - Math.PI / 2) * 9, iy + Math.sin(spin - Math.PI / 2) * 9); ctx.stroke();
  } else {
    const lvl = cur.endsWith('IV') ? 4 : cur.endsWith('III') ? 3 : 2;
    for (let j = 0; j < 4; j++) {
      ctx.fillStyle = j < lvl ? (j >= 2 ? PAL.iodine : PAL.ink) : PAL.line;
      ctx.fillRect(ix - 20 + j * 11, iy + 8 - (j + 1) * 5, 8, (j + 1) * 5);
    }
  }
  ctx.restore();
}

const CHAPTERS = [
  { n: '01', label: 'ФОРМИРОВАНИЕ', a: 3.9, b: 22.0 },
  { n: '02', label: 'СОКРАЩЕНИЕ', a: 22.0, b: 39.8 },
  { n: '03', label: 'ДЕФОРМАЦИЯ', a: 39.8, b: 53.6 },
];
function drawNav(ctx, t, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  font(ctx, 500, 24, 'mono'); ctx.textBaseline = 'alphabetic';
  const y = 336, gap = 30;
  const items = CHAPTERS.map((c) => ({ c, w: spacedWidth(ctx, c.n + ' ' + c.label, 1.6) }));
  const total = items.reduce((s, it) => s + it.w, 0) + gap * (items.length - 1);
  let x = 60;
  const sc = Math.min(1, 900 / total);
  ctx.translate(60, 0); ctx.scale(sc, 1); ctx.translate(-60, 0);
  for (const { c, w } of items) {
    const on = t >= c.a && t < c.b, done = t >= c.b;
    const act = on ? E.out(invLerp(c.a, c.a + 0.5, t)) : 0;
    ctx.globalAlpha = alpha * (on ? lerp(0.55, 1, act) : done ? 0.55 : 0.4);
    ctx.fillStyle = PAL.ink;
    spacedText(ctx, c.n + ' ' + c.label, x, y, 1.6);
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = PAL.line; ctx.fillRect(x, y + 14, w, 3);
    const pr = clamp((t - c.a) / (c.b - c.a));
    ctx.fillStyle = PAL.scrub; ctx.fillRect(x, y + 14, w * pr, 3);
    x += w + gap;
  }
  ctx.restore();
}

/* ---------- подписи на иллюстрации ---------- */
// выноска: точка на объекте, линия, подпись на подложке
function callout(ctx, anchor, pos, text, prog, alpha = 1, align = 'left') {
  if (prog <= 0 || alpha <= 0) return;
  const lp = E.out(clamp(prog * 1.6)), tp = E.out(clamp(prog * 1.6 - 0.45));
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.arc(anchor[0], anchor[1], 5 * lp, 0, TAU); ctx.fill();
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2;
  const end = [lerp(anchor[0], pos[0], lp), lerp(anchor[1], pos[1], lp)];
  ctx.beginPath(); ctx.moveTo(anchor[0], anchor[1]); ctx.lineTo(end[0], end[1]); ctx.stroke();
  if (tp > 0) {
    font(ctx, 500, 34); ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width, padX = 14, h = 50;
    const x = align === 'left' ? pos[0] + 10 : pos[0] - 10 - w - padX * 2;
    ctx.globalAlpha = alpha * tp;
    ctx.fillStyle = rgba(PAL.surface, 0.92); roundRect(ctx, x, pos[1] - h / 2, w + padX * 2, h, 12); ctx.fill();
    ctx.fillStyle = PAL.ink; ctx.fillText(text, x + padX, pos[1] + 2 + (1 - tp) * 8);
  }
  ctx.restore();
}
// пометка маркером: стрелка + слово Playfair Italic
function markerNote(ctx, from, to, text, textPos, prog, alpha = 1, size = 66) {
  if (prog <= 0 || alpha <= 0) return;
  const bend = [(from[0] + to[0]) / 2 + (to[1] - from[1]) * 0.25, (from[1] + to[1]) / 2 - (to[0] - from[0]) * 0.25];
  const curve = [];
  for (let i = 0; i <= 24; i++) {
    const s = i / 24;
    curve.push([
      (1 - s) * (1 - s) * from[0] + 2 * (1 - s) * s * bend[0] + s * s * to[0],
      (1 - s) * (1 - s) * from[1] + 2 * (1 - s) * s * bend[1] + s * s * to[1],
    ]);
  }
  const lp = E.inOut(clamp(prog * 1.4));
  markerLine(ctx, curve, { progress: lp, alpha });
  if (lp >= 1) {
    const hp = E.out(clamp((prog * 1.4 - 1) / 0.25));
    const p = curve[24], q = curve[21], ang = Math.atan2(p[1] - q[1], p[0] - q[0]);
    const head = (s) => [p[0] + Math.cos(ang + s * 2.5) * 26 * hp, p[1] + Math.sin(ang + s * 2.5) * 26 * hp];
    markerLine(ctx, [head(1), p, head(-1)], { alpha });
  }
  const tp = E.out(clamp(prog * 1.6 - 0.2));
  if (tp > 0) {
    ctx.save(); ctx.globalAlpha = alpha * tp;
    font(ctx, 500, size, 'serif', true); ctx.fillStyle = PAL.marker; ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, textPos[0], textPos[1] + (1 - tp) * 10);
    ctx.restore();
  }
}
function chip(ctx, x, y, text, alpha, colors = [PAL.iodineSoft, PAL.iodine]) {
  if (alpha <= 0) return 0;
  ctx.save(); ctx.globalAlpha = alpha;
  font(ctx, 500, 24, 'mono');
  const w = spacedWidth(ctx, text, 1.9) + 32, h = 48;
  ctx.fillStyle = colors[0]; roundRect(ctx, x, y - h / 2 + (1 - alpha) * 10, w, h, 12); ctx.fill();
  ctx.fillStyle = colors[1]; ctx.textBaseline = 'middle';
  spacedText(ctx, text, x + 16, y + 2 + (1 - alpha) * 10, 1.9);
  ctx.restore();
  return w;
}
function scaleBar(ctx, x, y, len, label, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.strokeStyle = PAL.inkMuted; ctx.lineWidth = 2.4; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.moveTo(x + len, y - 8); ctx.lineTo(x + len, y + 8); ctx.stroke();
  font(ctx, 400, 22, 'mono'); ctx.fillStyle = PAL.inkMuted; ctx.textBaseline = 'middle';
  spacedText(ctx, label, x + len + 14, y + 1, 1.2);
  ctx.restore();
}
