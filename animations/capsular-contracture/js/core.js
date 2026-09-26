'use strict';
/* Капсулярная контрактура — ядро: константы, палитра, утилиты, геометрия. */

const W = 1080, H = 1920, FPS = 30;
const TAU = Math.PI * 2;

// Палитра «День» из дизайн-системы + иллюстративные цвета (анатомия, H&E-гистология)
const PAL = {
  surface: '#f3f1ec', surface2: '#e8e4dc', line: '#cfc9be',
  ink: '#161a18', inkMuted: '#585d59', onInk: '#f3f1ec',
  scrub: '#1f4f45', scrubSoft: '#d3e0da',
  marker: '#5b3aa8', markerSoft: '#e4ddf2', markerOnFill: '#c9b8f7',
  iodine: '#a5461b', iodineSoft: '#f2ddd0',
  // анатомия, общий план
  lung: '#e3e9e4', lungLine: '#b8c6bd',
  bone: '#ece6da', boneLine: '#8a8274', marrow: '#dccfbd',
  muscle: '#c27b6b', muscleDark: '#98574a', muscleLight: '#dcaa9d',
  fat: '#f1e3c0', fatLine: '#d8c28f',
  gland: '#e6b3a6', glandDark: '#cc8b7e', duct: '#b56d62',
  skin: '#e8b9a1', skinDark: '#c38a72',
  gel: '#dce8e7', gel2: '#c3d7d5', gelHi: '#f6fbfa', shell: '#1f4f45',
  capsule: '#eee8de', capsuleFiber: '#aa9f8f',
  // микроскопия (H&E, ИГХ, окраска по Граму)
  slide: '#f8eff1', slide2: '#f0e0e6',
  eosin: '#eab0c2', eosinLight: '#f5d5df', eosinDark: '#c56b8c',
  hema: '#48398a', hemaLight: '#7263b5', hemaDark: '#2f2466',
  collagen: '#dc8fa7', collagenDense: '#b9557a',
  rbc: '#cf4a61', rbcDark: '#a8354b',
  dab: '#8b4a1c',
  gram: '#4a2a7c', gramLight: '#7b5bb0', eps: '#cfe0d6', epsLine: '#7c9d8a',
};

const FONT = {
  sans: '"Onest", "Manrope", system-ui, sans-serif',
  serif: '"Playfair Display", Georgia, serif',
  mono: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
};

/* ---------- числа и сглаживание ---------- */
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, x) => clamp((x - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);

const E = {
  lin: (t) => t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutQ: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  outQ: (t) => 1 - Math.pow(1 - t, 4),
  in: (t) => t * t * t,
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outBackS: (t) => { const c1 = 0.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};

// прогресс сегмента [a,b] с изингом
const P = (t, a, b, e = E.inOut) => e(invLerp(a, b, t));
// «окно видимости»: плавно появляется в a, исчезает к b
const env = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(invLerp(a, a + fi, t), 1 - invLerp(b - fo, b, t));
// затухающее колебание после события в момент t0
const ring = (t, t0, freq = 3, damp = 5) => (t < t0 ? 0 : Math.exp(-(t - t0) * damp) * Math.sin((t - t0) * freq * TAU));

/* ---------- детерминированный шум и ГПСЧ ---------- */
function hashI(i) {
  let h = Math.imul((i | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hashI(i + seed * 7919), hashI(i + 1 + seed * 7919), u) * 2 - 1;
}
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- цвет ---------- */
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  const r = (i) => Math.round(lerp(A[i], B[i], clamp(t))).toString(16).padStart(2, '0');
  return '#' + r(0) + r(1) + r(2);
}
function rgba(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${clamp(a)})`; }

/* ---------- геометрия ломаных ---------- */
function polyLen(pts, closed = false) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  if (closed && pts.length > 1) L += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
  return L;
}
// часть ломаной от начала до доли frac длины
function polyPartial(pts, frac) {
  if (frac >= 1) return pts;
  if (frac <= 0 || pts.length < 2) return [];
  const total = polyLen(pts), target = total * frac, out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + d >= target) {
      const k = d > 0 ? (target - acc) / d : 0;
      out.push([lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]);
      return out;
    }
    acc += d; out.push(pts[i]);
  }
  return out;
}
// равномерная передискретизация по длине
function resample(pts, n, closed = false) {
  const src = closed ? pts.concat([pts[0]]) : pts;
  const total = polyLen(src), out = [];
  let seg = 1, acc = 0;
  const cnt = closed ? n : n - 1;
  for (let k = 0; k < n; k++) {
    const target = (total * k) / cnt;
    while (seg < src.length - 1) {
      const d = Math.hypot(src[seg][0] - src[seg - 1][0], src[seg][1] - src[seg - 1][1]);
      if (acc + d >= target) break;
      acc += d; seg++;
    }
    const d = Math.hypot(src[seg][0] - src[seg - 1][0], src[seg][1] - src[seg - 1][1]);
    const f = d > 0 ? clamp((target - acc) / d) : 0;
    out.push([lerp(src[seg - 1][0], src[seg][0], f), lerp(src[seg - 1][1], src[seg][1], f)]);
  }
  return out;
}
// нормали (наружу для замкнутого контура по часовой в экранных координатах)
function normals(pts, closed = true) {
  const n = pts.length, out = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    out[i] = [dy / L, -dx / L];
  }
  return out;
}
function offsetPoly(pts, d, closed = true, nrm) {
  const N = nrm || normals(pts, closed);
  return pts.map((p, i) => [p[0] + N[i][0] * (typeof d === 'function' ? d(i) : d), p[1] + N[i][1] * (typeof d === 'function' ? d(i) : d)]);
}
function polyArea(pts) {
  let a = 0;
  for (let i = 0, n = pts.length; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; }
  return a / 2;
}
function centroid(pts) {
  let x = 0, y = 0;
  for (const p of pts) { x += p[0]; y += p[1]; }
  return [x / pts.length, y / pts.length];
}
function laplace(pts, iters = 3, fixEnds = true) {
  let a = pts.map((p) => p.slice());
  for (let k = 0; k < iters; k++) {
    const b = a.map((p) => p.slice());
    for (let i = 1; i < a.length - 1; i++) {
      b[i][0] = (a[i - 1][0] + 2 * a[i][0] + a[i + 1][0]) / 4;
      b[i][1] = (a[i - 1][1] + 2 * a[i][1] + a[i + 1][1]) / 4;
    }
    if (!fixEnds) { b[0] = a[0]; b[a.length - 1] = a[a.length - 1]; }
    a = b;
  }
  return a;
}

/* ---------- рисование путей ---------- */
// сглаженный путь (Catmull-Rom → Безье)
function smoothPath(ctx, pts, closed = false, move = true) {
  const n = pts.length;
  if (n < 2) return;
  if (move) ctx.moveTo(pts[0][0], pts[0][1]);
  const get = (i) => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
      p2[0], p2[1]
    );
  }
  if (closed) ctx.closePath();
}
function polyPath(ctx, pts, closed = false) {
  if (!pts.length) return;
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (closed) ctx.closePath();
}
function strokeSmooth(ctx, pts, color, width, alpha = 1, closed = false) {
  if (pts.length < 2 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); smoothPath(ctx, pts, closed); ctx.stroke();
  ctx.restore();
}
function fillSmooth(ctx, pts, color, alpha = 1) {
  if (pts.length < 3 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.beginPath(); smoothPath(ctx, pts, true); ctx.fill();
  ctx.restore();
}

// Фирменная линия маркера: скруглённые концы, лёгкая неровность плотности
function markerLine(ctx, pts, opt = {}) {
  const { color = PAL.marker, width = 8, alpha = 1, dash = null, closed = false, progress = 1 } = opt;
  const src = closed ? pts.concat([pts[0]]) : pts;
  const part = progress < 1 ? polyPartial(src, progress) : src;
  if (part.length < 2 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); smoothPath(ctx, part, false); ctx.stroke();
  // второй проход — «чернила легли неровно»
  ctx.globalAlpha *= 0.22;
  ctx.lineWidth = width * 0.45;
  ctx.translate(0.8, -0.9);
  ctx.beginPath(); smoothPath(ctx, part, false); ctx.stroke();
  ctx.restore();
}

// рукописный овал: чуть неровный, повёрнут на −3°, концы заходят друг на друга
function handEllipse(cx, cy, rx, ry, seed = 1, rot = -3 * Math.PI / 180, n = 72) {
  const pts = [];
  const over = 0.09; // нахлёст концов
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI * 0.62 + (TAU * (1 + over) * i) / n;
    const wob = 1 + 0.025 * noise1(i * 0.18, seed) + 0.012 * Math.sin(a * 3 + seed);
    const spiral = 1 + 0.035 * (i / n);
    const x = Math.cos(a) * rx * wob * spiral, y = Math.sin(a) * ry * wob * spiral;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return pts;
}

/* ---------- текст ---------- */
function font(ctx, weight, size, fam = 'sans', italic = false) {
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT[fam]}`;
}
// текст с трекингом (ctx.letterSpacing есть не везде)
function spacedText(ctx, str, x, y, spacing, align = 'left') {
  let w = 0;
  const widths = [...str].map((ch) => { const m = ctx.measureText(ch).width; w += m + spacing; return m; });
  w -= spacing;
  let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  const saved = ctx.textAlign;
  ctx.textAlign = 'left';
  [...str].forEach((ch, i) => { ctx.fillText(ch, cx, y); cx += widths[i] + spacing; });
  ctx.textAlign = saved;
  return w;
}
function spacedWidth(ctx, str, spacing) {
  let w = 0;
  for (const ch of str) w += ctx.measureText(ch).width + spacing;
  return w - spacing;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
