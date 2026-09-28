// Общий план: срез кожи головы с тремя фолликулами. Состояние — чистая функция времени:
// цикл волоса (анаген → телоген → выпадение → новый анаген), миниатюризация по циклам,
// инъекция PRP и частичное восстановление.
import React from 'react';
import {PAL} from '../palette';
import {E, P, clamp, lerp, mix, noise1, rng} from '../math';
import {Pt, blob, smoothD, polyD} from '../geom';

export const SURF_Y = 600;
export const surfY = (x: number) => SURF_Y + 0.00012 * (x - 540) * (x - 540);
const TILT = 0.17; // наклон фолликула: dx на единицу глубины
const THETA = Math.atan2(1, TILT);
const DIR: Pt = [Math.cos(THETA), Math.sin(THETA)];
const NRM: Pt = [Math.cos(THETA - Math.PI / 2), Math.sin(THETA - Math.PI / 2)]; // «правая» сторона
export const FOLL_X = [330, 540, 750];
const DEPTH_T = 520;
const DEPTH_V = 190;
const BULB_T = 42;
const BULB_V = 15;
const SHAFT_T = 14;
const SHAFT_V = 4.5;
const LEN_T = 320;
const LEN_V = 55;
export const PX_PER_MM = 115; // глубина терминального фолликула ≈ 4,5 мм

export type FollicleState = {
  m: number; // миниатюризация 0..1
  depthK: number; // доля глубины (телоген ≈ 0.42)
  lenK: number; // длина стержня над кожей, доля от нормы для данного m
  lift: number; // подъём выпадающего волоса, px
  hairAlpha: number;
  club: number; // колба телогенового волоса
  newHair: number; // 0..1.6 — новый стержень растёт из луковицы
};

export type ScalpState = {
  f: FollicleState[];
  needle: number; // 0..1 глубина входа иглы
  needleAlpha: number;
  depot: number[]; // радиус депо PRP у каждого фолликула
  depotAlpha: number[];
};

const baseF = (): FollicleState => ({m: 0, depthK: 1, lenK: 1, lift: 0, hairAlpha: 1, club: 0, newHair: 0});

// миниатюризация по циклам (глава 1) и частичное восстановление после сеансов (глава 2)
function miniat(t: number, lag: number, scale: number) {
  const steps: [number, number][] = [
    [16.2, 0.28],
    [18.7, 0.58],
    [20.4, 0.9],
  ];
  let m = 0;
  let prev = 0;
  for (const [tk, target] of steps) {
    m = lerp(prev, target, P(t, tk + lag, tk + lag + 1.3, E.inOut));
    if (t < tk + lag) break;
    prev = target;
  }
  const sessions = [38.6, 40.9, 42.6];
  let rec = 0;
  for (const ts of sessions) rec += 0.085 * P(t, ts, ts + 1.4, E.inOut);
  return clamp(m * scale - rec * scale, 0, 1);
}

export function scalpState(t: number): ScalpState {
  const f = [baseF(), baseF(), baseF()];
  f[0].m = miniat(t, 0.35, 0.78);
  f[1].m = miniat(t, 0, 1);
  f[2].m = miniat(t, 0.6, 0.6);
  // цикл среднего волоса (4.0–9.4)
  const mid = f[1];
  if (t < 9.4) {
    mid.lenK = lerp(0.86, 1, P(t, 4.0, 6.4, E.lin));
    const cat = P(t, 6.5, 7.2, E.inOut);
    mid.depthK = lerp(1, 0.42, cat);
    mid.club = cat;
    mid.lift = 130 * P(t, 7.2, 8.2, E.in);
    mid.hairAlpha = 1 - P(t, 7.6, 8.2, E.lin);
    const re = P(t, 8.2, 9.2, E.inOut);
    mid.depthK = lerp(mid.depthK, 1, re);
    mid.newHair = 1.6 * P(t, 8.4, 9.4, E.out);
    if (t >= 8.2) {
      mid.club = 1 - re;
    }
  } else {
    mid.hairAlpha = 1;
    mid.lenK = lerp(0.3, 1, P(t, 9.4, 16.0, E.lin));
  }
  // игла и депо PRP (глава 2)
  const needle = P(t, 38.5, 39.3, E.inOut) * (1 - P(t, 40.6, 41.2, E.inOut));
  const needleAlpha = P(t, 38.45, 38.8) * (1 - P(t, 41.0, 41.4));
  const depot = [0, 1, 2].map((i) => {
    const t0 = [40.9, 39.3, 42.6][i];
    return 95 * P(t, t0, t0 + 1.1, E.out);
  });
  const depotAlpha = [0, 1, 2].map((i) => {
    const t0 = [40.9, 39.3, 42.6][i];
    return P(t, t0, t0 + 0.4) * lerp(0.62, 0.28, P(t, t0 + 1.2, t0 + 3.0));
  });
  return {f, needle, needleAlpha, depot, depotAlpha};
}

/* ---------- геометрия фолликула ---------- */
type Geo = {x0: number; y0: number; depth: number; R: number; sw: number; at: (s: number) => Pt; bulb: Pt};

function geo(i: number, st: FollicleState): Geo {
  const depthFull = lerp(DEPTH_T, DEPTH_V, st.m);
  const depth = depthFull * st.depthK;
  const R = lerp(BULB_T, BULB_V, st.m) * lerp(0.7, 1, st.depthK);
  const sw = lerp(SHAFT_T, SHAFT_V, st.m);
  const x0 = FOLL_X[i];
  const y0 = surfY(x0);
  const at = (s: number): Pt => [x0 + TILT * depth * s, y0 + depth * s];
  return {x0, y0, depth, R, sw, at, bulb: at(1)};
}

function sheathOutline(g: Geo): Pt[] {
  const A: Pt[] = [];
  const B: Pt[] = [];
  const n = 10;
  for (let k = 0; k <= n; k++) {
    const s = k / n;
    const c = g.at(s);
    const w = lerp(g.R * 1.35, g.R * 1.95, s) / 2;
    A.push([c[0] + NRM[0] * w, c[1] + NRM[1] * w]);
    B.push([c[0] - NRM[0] * w, c[1] - NRM[1] * w]);
  }
  const arc: Pt[] = [];
  const r = g.R * 0.975;
  for (let k = 1; k < 12; k++) {
    const a = THETA - Math.PI / 2 + (Math.PI * k) / 12;
    arc.push([g.bulb[0] + Math.cos(a) * r, g.bulb[1] + Math.sin(a) * r]);
  }
  return [...A, ...arc, ...B.reverse()];
}

// контур среднего фолликула для пунктирной «заставки» (в мировых координатах)
export function follicleLoopOutline(): Pt[] {
  const g = geo(1, baseF());
  const pts = sheathOutline(g);
  // добавить стержень над кожей как петлю: просто вернуть контур оболочки, замкнутый
  return pts;
}

/* ---------- отрисовка ---------- */
const Follicle: React.FC<{i: number; st: FollicleState; t: number}> = ({i, st, t}) => {
  const g = geo(i, st);
  const outline = sheathOutline(g);
  const hairCol = mix(PAL.hair, PAL.hairLight, st.m * 0.9);
  const hairAlpha = lerp(1, 0.75, st.m);
  const len = lerp(LEN_T, LEN_V, st.m) * st.lenK;
  const bendK = lerp(1, 0.25, st.m);
  // сальная железа и мышца — на фиксированной глубине, не зависят от миниатюризации
  const gAt = (d: number): Pt => [g.x0 + TILT * d, g.y0 + d];
  const gc = gAt(130);
  const gland1 = blob(gc[0] + NRM[0] * 66, gc[1] + NRM[1] * 66, 30, {sx: 1.25, sy: 0.9, seed: 11 + i, n: 28, amp: 0.08});
  const gland2 = blob(gc[0] + NRM[0] * 96 + 12, gc[1] + NRM[1] * 96 + 22, 22, {sx: 1.1, sy: 0.9, seed: 17 + i, n: 24, amp: 0.08});
  const mAt = gAt(250);
  const mStart: Pt = [mAt[0] + NRM[0] * 26, mAt[1] + NRM[1] * 26];
  const mEnd: Pt = [g.x0 + 165, surfY(g.x0 + 165) + 30];
  // капилляр к сосочку
  const cap: Pt[] = [];
  const capBase: Pt = [g.x0 + 95, SURF_Y + 690];
  const papTip: Pt = [g.bulb[0] + DIR[0] * g.R * 0.75, g.bulb[1] + DIR[1] * g.R * 0.75];
  for (let k = 0; k <= 12; k++) {
    const s = k / 12;
    cap.push([lerp(capBase[0], papTip[0], s) + 10 * noise1(s * 4 + i, 3), lerp(capBase[1], papTip[1], s)]);
  }
  // сосочек
  const pc: Pt = [g.bulb[0] + DIR[0] * g.R * 0.32, g.bulb[1] + DIR[1] * g.R * 0.32];
  const rotDeg = ((THETA - Math.PI / 2) * 180) / Math.PI;
  // стержень: внутри канала и над кожей
  const inTop = g.at(0);
  const inBot: Pt = [g.bulb[0] - DIR[0] * g.R * 0.15, g.bulb[1] - DIR[1] * g.R * 0.15];
  const above = `M${inTop[0]} ${inTop[1]} C${inTop[0] + 12} ${inTop[1] - len * 0.45}, ${inTop[0] - 18 * bendK} ${inTop[1] - len * 0.82}, ${
    inTop[0] - 62 * bendK
  } ${inTop[1] - len}`;
  const lift = st.lift;
  // новый волос
  const nh = st.newHair;
  const nhTop = nh > 0 ? g.at(clamp(1 - Math.min(nh, 1))) : null;
  const nhLen = Math.max(0, nh - 1) * LEN_T * 0.5;
  return (
    <g>
      {/* мышца, поднимающая волос */}
      <path
        d={`M${mStart[0]} ${mStart[1]} Q${(mStart[0] + mEnd[0]) / 2 - 20} ${(mStart[1] + mEnd[1]) / 2 + 30} ${mEnd[0]} ${mEnd[1]}`}
        stroke={PAL.muscle}
        strokeWidth={11}
        fill="none"
        strokeLinecap="round"
        opacity={0.5}
      />
      {/* капилляр */}
      <path d={smoothD(cap)} stroke={PAL.vessel} strokeWidth={3.2} fill="none" strokeLinecap="round" opacity={0.85} />
      {/* депо PRP рисуется снаружи */}
      {/* оболочка: проход обводкой, затем заливка — внутренние границы исчезают */}
      <path d={smoothD(outline, true)} fill={PAL.sheathLine} stroke={PAL.sheathLine} strokeWidth={4.5} strokeLinejoin="round" />
      <path d={smoothD(outline, true)} fill={PAL.sheath} />
      {/* матрикс луковицы */}
      <circle cx={g.bulb[0]} cy={g.bulb[1]} r={g.R * 0.86} fill="#e3cdb3" opacity={0.75} />
      {/* сосочек */}
      <ellipse
        cx={pc[0]}
        cy={pc[1]}
        rx={g.R * 0.4}
        ry={g.R * 0.56}
        transform={`rotate(${rotDeg} ${pc[0]} ${pc[1]})`}
        fill={PAL.papilla}
        stroke={PAL.papillaDark}
        strokeWidth={1.5}
      />
      {/* сальная железа */}
      <line x1={gland1[0][0]} y1={gland1[0][1]} x2={gc[0] + NRM[0] * 20} y2={gc[1] + NRM[1] * 20} stroke={PAL.glandDark} strokeWidth={7} strokeLinecap="round" opacity={0.6} />
      <path d={smoothD(gland2, true)} fill={PAL.gland} stroke={PAL.glandDark} strokeWidth={2} />
      <path d={smoothD(gland1, true)} fill={PAL.gland} stroke={PAL.glandDark} strokeWidth={2} />
      {[...Array(6)].map((_, k) => {
        const r = rng(50 + i * 9 + k);
        return <circle key={k} cx={gland1[0][0] - 30 + r() * 44} cy={gland1[0][1] - 22 + r() * 34} r={3} fill={PAL.glandDark} opacity={0.35} />;
      })}
      {/* старый стержень */}
      {st.hairAlpha > 0 ? (
        <g transform={`translate(0 ${-lift})`} opacity={st.hairAlpha * hairAlpha}>
          <line x1={inBot[0]} y1={inBot[1]} x2={inTop[0]} y2={inTop[1]} stroke={hairCol} strokeWidth={g.sw} strokeLinecap="round" />
          {st.club > 0 ? <ellipse cx={inBot[0]} cy={inBot[1]} rx={g.sw * 0.9} ry={g.sw * 1.3} fill={hairCol} opacity={st.club} /> : null}
          <path d={above} stroke={hairCol} strokeWidth={g.sw} fill="none" strokeLinecap="round" />
        </g>
      ) : null}
      {/* новый стержень */}
      {nhTop ? (
        <g opacity={hairAlpha}>
          <line x1={inBot[0]} y1={inBot[1]} x2={nhTop[0]} y2={nhTop[1]} stroke={hairCol} strokeWidth={g.sw} strokeLinecap="round" />
          {nhLen > 0 ? (
            <path
              d={`M${inTop[0]} ${inTop[1]} C${inTop[0] + 6} ${inTop[1] - nhLen * 0.5}, ${inTop[0] - 6} ${inTop[1] - nhLen * 0.8}, ${inTop[0] - 14} ${inTop[1] - nhLen}`}
              stroke={hairCol}
              strokeWidth={g.sw}
              fill="none"
              strokeLinecap="round"
            />
          ) : null}
        </g>
      ) : null}
    </g>
  );
};

const Layers: React.FC = () => {
  const xs = Array.from({length: 23}, (_, k) => -20 + k * 50);
  const surf = xs.map((x): Pt => [x, surfY(x)]);
  const epi = [...surf, ...xs.map((x): Pt => [x, surfY(x) + 34]).reverse()];
  const derm = [...xs.map((x): Pt => [x, surfY(x) + 34]), [1100, SURF_Y + 400] as Pt, [-20, SURF_Y + 400] as Pt];
  const r = rng(77);
  const lobules = Array.from({length: 46}, () => ({x: r() * 1120 - 20, y: SURF_Y + 420 + r() * 330, rr: 24 + r() * 26}));
  const fibers = Array.from({length: 7}, (_, k) => {
    const y = SURF_Y + 95 + k * 42;
    const pts: Pt[] = [];
    for (let x = -20; x <= 1100; x += 40) pts.push([x, y + 9 * noise1(x / 90 + k * 3, k)]);
    return pts;
  });
  return (
    <g>
      <rect x={-20} y={SURF_Y + 380} width={1120} height={800} fill={PAL.fat} />
      {lobules.map((l, k) => (
        <circle key={k} cx={l.x} cy={l.y} r={l.rr} fill="none" stroke={PAL.fatLine} strokeWidth={1.6} opacity={0.55} />
      ))}
      <path d={polyD(derm, true)} fill={PAL.dermis} />
      {fibers.map((f, k) => (
        <path key={k} d={smoothD(f)} stroke={PAL.dermisLine} strokeWidth={2} fill="none" opacity={0.35} />
      ))}
      {/* сосуды дермы */}
      {[150, 930].map((x, k) => {
        const pts: Pt[] = [];
        for (let y = SURF_Y + 60; y <= SURF_Y + 700; y += 40) pts.push([x + 14 * noise1(y / 70, k + 9), y]);
        return <path key={k} d={smoothD(pts)} stroke={PAL.vessel} strokeWidth={3} fill="none" opacity={0.4} />;
      })}
      <path d={smoothD(epi, true)} fill={PAL.epidermis} />
      <path d={smoothD(surf)} stroke={PAL.skinDark} strokeWidth={3} fill="none" />
    </g>
  );
};

// точки для подписей (в мировых координатах)
export function anchors(st: ScalpState) {
  const g = [0, 1, 2].map((i) => geo(i, st.f[i]));
  return {
    papilla: (i: number): Pt => [g[i].bulb[0] + DIR[0] * g[i].R * 0.32, g[i].bulb[1] + DIR[1] * g[i].R * 0.32],
    sheath: (i: number, s: number): Pt => {
      const c = g[i].at(s);
      const w = lerp(g[i].R * 1.35, g[i].R * 1.95, s) / 2;
      return [c[0] - NRM[0] * w, c[1] - NRM[1] * w];
    },
    hairTip: (i: number): Pt => {
      const st1 = st.f[i];
      const len = lerp(LEN_T, LEN_V, st1.m) * st1.lenK;
      const top = g[i].at(0);
      return [top[0] - 62 * lerp(1, 0.25, st1.m), top[1] - len - st1.lift];
    },
    gland: (i: number): Pt => {
      const c: Pt = [g[i].x0 + TILT * 130, g[i].y0 + 130];
      return [c[0] + NRM[0] * 66, c[1] + NRM[1] * 66];
    },
    injectPoint: (i: number): Pt => {
      const c: Pt = [g[i].x0 + TILT * 150, g[i].y0 + 150];
      return [c[0] + NRM[0] * 46, c[1] + NRM[1] * 46];
    },
    bulbR: (i: number) => g[i].R,
  };
}

const Needle: React.FC<{st: ScalpState}> = ({st}) => {
  if (st.needleAlpha <= 0) return null;
  const a = anchors(st);
  const target = a.injectPoint(1);
  const dir: Pt = [Math.cos(-0.95), Math.sin(-0.95)]; // вверх-вправо
  const start: Pt = [target[0] + dir[0] * 520, target[1] + dir[1] * 520];
  const tip: Pt = [lerp(start[0], target[0], st.needle), lerp(start[1], target[1], st.needle)];
  const nLen = 210;
  const hub: Pt = [tip[0] + dir[0] * nLen, tip[1] + dir[1] * nLen];
  const barrelEnd: Pt = [hub[0] + dir[0] * 300, hub[1] + dir[1] * 300];
  const ang = (Math.atan2(dir[1], dir[0]) * 180) / Math.PI;
  return (
    <g opacity={st.needleAlpha}>
      <line x1={tip[0]} y1={tip[1]} x2={hub[0]} y2={hub[1]} stroke={PAL.inkMuted} strokeWidth={4} strokeLinecap="round" />
      <g transform={`translate(${hub[0]} ${hub[1]}) rotate(${ang})`}>
        <rect x={0} y={-22} width={300} height={44} rx={6} fill={PAL.surface} stroke={PAL.ink} strokeWidth={3} />
        <rect x={0} y={-14} width={130} height={28} fill={PAL.markerSoft} opacity={0.9} />
        <rect x={130} y={-19} width={6} height={38} fill={PAL.ink} />
        <line x1={136} y1={0} x2={300} y2={0} stroke={PAL.ink} strokeWidth={5} />
        <rect x={296} y={-30} width={10} height={60} rx={3} fill={PAL.ink} />
      </g>
      <circle cx={barrelEnd[0]} cy={barrelEnd[1]} r={0} />
    </g>
  );
};

export const ScalpMacro: React.FC<{t: number; st: ScalpState}> = ({t, st}) => {
  const a = anchors(st);
  return (
    <g>
      <Layers />
      {[0, 1, 2].map((i) => {
        const p = a.injectPoint(i);
        return st.depotAlpha[i] > 0 ? (
          <path key={i} d={smoothD(blob(p[0], p[1], st.depot[i], {sx: 1.15, sy: 0.85, seed: 31 + i, n: 32, amp: 0.1}), true)} fill={PAL.markerSoft} stroke={PAL.marker} strokeWidth={2} strokeDasharray="10 8" opacity={st.depotAlpha[i]} />
        ) : null;
      })}
      {[0, 1, 2].map((i) => (
        <Follicle key={i} i={i} st={st.f[i]} t={t} />
      ))}
      <Needle st={st} />
    </g>
  );
};
