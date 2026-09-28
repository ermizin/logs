// Числа, изинги, детерминированный шум — каждый кадр чистая функция времени.
export const TAU = Math.PI * 2;
export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, x: number) => clamp((x - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);

export type Ease = (t: number) => number;
export const E = {
  lin: ((t) => t) as Ease,
  inOut: ((t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)) as Ease,
  inOutQ: ((t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2)) as Ease,
  out: ((t) => 1 - Math.pow(1 - t, 3)) as Ease,
  outQ: ((t) => 1 - Math.pow(1 - t, 4)) as Ease,
  in: ((t) => t * t * t) as Ease,
  outExpo: ((t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))) as Ease,
  inOutExpo: ((t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2) as Ease,
  outBack: ((t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }) as Ease,
  outBackS: ((t) => {
    const c1 = 0.9;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }) as Ease,
};

// прогресс сегмента [a,b] с изингом
export const P = (t: number, a: number, b: number, e: Ease = E.inOut) => e(invLerp(a, b, t));
// «окно видимости»: плавно появляется в a, исчезает к b
export const env = (t: number, a: number, b: number, fi = 0.3, fo = 0.3) =>
  Math.max(0, Math.min(invLerp(a, a + fi, t), 1 - invLerp(b - fo, b, t)));
// затухающее колебание после события в момент t0
export const ring = (t: number, t0: number, freq = 3, damp = 5) =>
  t < t0 ? 0 : Math.exp(-(t - t0) * damp) * Math.sin((t - t0) * freq * TAU);

/* детерминированный шум и ГПСЧ */
export function hashI(i: number) {
  let h = Math.imul((i | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
export function noise1(x: number, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hashI(i + seed * 7919), hashI(i + 1 + seed * 7919), u) * 2 - 1;
}
export function rng(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* цвет */
export function hexRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a: string, b: string, t: number) {
  const A = hexRgb(a);
  const B = hexRgb(b);
  const r = (i: number) => Math.round(lerp(A[i], B[i], clamp(t))).toString(16).padStart(2, '0');
  return '#' + r(0) + r(1) + r(2);
}
export function rgba(h: string, a: number) {
  const [r, g, b] = hexRgb(h);
  return `rgba(${r},${g},${b},${clamp(a)})`;
}
