// Геометрия ломаных и «рукописных» контуров; пути отдаются как SVG d-строки.
import {TAU, clamp, lerp, noise1} from './math';

export type Pt = [number, number];

export function polyLen(pts: Pt[], closed = false) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  if (closed && pts.length > 1) L += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
  return L;
}

// часть ломаной от начала до доли frac длины
export function polyPartial(pts: Pt[], frac: number): Pt[] {
  if (frac >= 1) return pts;
  if (frac <= 0 || pts.length < 2) return [];
  const total = polyLen(pts);
  const target = total * frac;
  const out: Pt[] = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + d >= target) {
      const k = d > 0 ? (target - acc) / d : 0;
      out.push([lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]);
      return out;
    }
    acc += d;
    out.push(pts[i]);
  }
  return out;
}

// равномерная передискретизация по длине
export function resample(pts: Pt[], n: number, closed = false): Pt[] {
  const src = closed ? pts.concat([pts[0]]) : pts;
  const total = polyLen(src);
  const out: Pt[] = [];
  let seg = 1;
  let acc = 0;
  const cnt = closed ? n : n - 1;
  for (let k = 0; k < n; k++) {
    const target = (total * k) / cnt;
    while (seg < src.length - 1) {
      const d = Math.hypot(src[seg][0] - src[seg - 1][0], src[seg][1] - src[seg - 1][1]);
      if (acc + d >= target) break;
      acc += d;
      seg++;
    }
    const d = Math.hypot(src[seg][0] - src[seg - 1][0], src[seg][1] - src[seg - 1][1]);
    const f = d > 0 ? clamp((target - acc) / d) : 0;
    out.push([lerp(src[seg - 1][0], src[seg][0], f), lerp(src[seg - 1][1], src[seg][1], f)]);
  }
  return out;
}

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

// сглаженный путь (Catmull-Rom → Безье)
export function smoothD(pts: Pt[], closed = false): string {
  const n = pts.length;
  if (n < 2) return '';
  const get = (i: number) => (closed ? pts[((i % n) + n) % n] : pts[clamp(i, 0, n - 1)]);
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(
      p2[1] - (p3[1] - p1[1]) / 6,
    )} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  if (closed) d += 'Z';
  return d;
}

export function polyD(pts: Pt[], closed = false): string {
  if (!pts.length) return '';
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) d += `L${f1(pts[i][0])} ${f1(pts[i][1])}`;
  if (closed) d += 'Z';
  return d;
}

// рукописный овал: чуть неровный, повёрнут на −3°, концы заходят друг на друга
export function handEllipse(cx: number, cy: number, rx: number, ry: number, seed = 1, rot = (-3 * Math.PI) / 180, n = 72): Pt[] {
  const pts: Pt[] = [];
  const over = 0.09;
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI * 0.62 + (TAU * (1 + over) * i) / n;
    const wob = 1 + 0.025 * noise1(i * 0.18, seed) + 0.012 * Math.sin(a * 3 + seed);
    const spiral = 1 + 0.035 * (i / n);
    const x = Math.cos(a) * rx * wob * spiral;
    const y = Math.sin(a) * ry * wob * spiral;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return pts;
}

// квадратичная дуга между точками с изгибом в сторону
export function bentCurve(from: Pt, to: Pt, bendK = 0.25, n = 24): Pt[] {
  const bend: Pt = [(from[0] + to[0]) / 2 + (to[1] - from[1]) * bendK, (from[1] + to[1]) / 2 - (to[0] - from[0]) * bendK];
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    out.push([
      (1 - s) * (1 - s) * from[0] + 2 * (1 - s) * s * bend[0] + s * s * to[0],
      (1 - s) * (1 - s) * from[1] + 2 * (1 - s) * s * bend[1] + s * s * to[1],
    ]);
  }
  return out;
}

// слегка волнистая линия (подчёркивание маркером)
export function wavyLine(x0: number, y0: number, len: number, n = 20, amp = 5): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    pts.push([x0 + s * len, y0 + amp * Math.sin(s * 5.5) - s * 6]);
  }
  return pts;
}

// контур «живой» клетки: радиус с шумом, растяжение, поворот
export function blob(
  cx: number,
  cy: number,
  r: number,
  opt: {sx?: number; sy?: number; rot?: number; seed?: number; t?: number; amp?: number; n?: number; pods?: {a: number; h: number; w: number}[]} = {},
): Pt[] {
  const {sx = 1, sy = 1, rot = 0, seed = 1, t = 0, amp = 0.06, n = 40, pods} = opt;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (TAU * i) / n;
    let k = 1 + amp * (noise1(a * 1.6 + t * 0.9, seed) * 0.7 + noise1(a * 3.1 - t * 1.3, seed + 5) * 0.3);
    if (pods) {
      for (const p of pods) {
        const d = Math.atan2(Math.sin(a - p.a), Math.cos(a - p.a));
        k += p.h * Math.exp(-(d * d) / (p.w * p.w));
      }
    }
    const x = Math.cos(a) * r * k * sx;
    const y = Math.sin(a) * r * k * sy;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return pts;
}
