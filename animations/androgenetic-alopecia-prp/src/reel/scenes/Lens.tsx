// Линза: переход в микромир. Круг вырезает микромир поверх затемнённого общего плана,
// обводка маркером становится оправой линзы.
import React from 'react';
import {PAL, W, H} from '../palette';
import {E, P, clamp, lerp, rgba} from '../math';
import {Pt, handEllipse} from '../geom';
import {MarkerPath} from '../Marker';

export const LENS_C: Pt = [540, 780];
export const LENS_R = 385;
export const LR = 400; // радиус локальных координат микромира

export type LensSpec = {in0: number; in1: number; out0: number; out1: number; tau0: number; seed: number};

export type LensState = {
  u: number;
  tau: number;
  lc: Pt;
  lr: number;
  scale: number;
  map: (p: Pt) => Pt; // локальные координаты микромира → экран
  pre: number;
  post: number;
  active: boolean;
};

export function lensState(t: number, Z: LensSpec, anchor: Pt): LensState {
  const u = P(t, Z.in0, Z.in1, E.inOut) * (1 - P(t, Z.out0, Z.out1, E.inOut));
  const tau = Math.max(0, t - Z.tau0);
  const lc: Pt = [lerp(anchor[0], LENS_C[0], u), lerp(anchor[1], LENS_C[1], u)];
  const lr = lerp(66, LENS_R, E.inOut(u));
  const dolly = 1 + 0.045 * E.inOut(clamp(tau / 10));
  const scale = (lr / LR) * dolly;
  const oy = -150 * (1 - u);
  const map = (p: Pt): Pt => [lc[0] + p[0] * scale, lc[1] + (p[1] + oy) * scale];
  const pre = P(t, Z.in0 - 0.62, Z.in0 - 0.05, E.inOut);
  const post = 1 - P(t, Z.out1, Z.out1 + 0.45);
  return {u, tau, lc, lr, scale, map, pre, post, active: u > 0.001};
}

export const Lens: React.FC<{st: LensState; id: string; children: React.ReactNode}> = ({st, id, children}) => {
  const {u, lc, lr, scale} = st;
  const oy = -150 * (1 - u);
  const chrome = clamp(u * 2 - 1);
  const ticks = Array.from({length: 72}, (_, k) => (k * Math.PI * 2) / 72);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <defs>
        <clipPath id={`lens-clip-${id}`}>
          <circle cx={lc[0]} cy={lc[1]} r={lr} />
        </clipPath>
        <mask id={`lens-mask-${id}`}>
          <rect width={W} height={H} fill="#fff" />
          <circle cx={lc[0]} cy={lc[1]} r={lr} fill="#000" />
        </mask>
      </defs>
      {st.active ? (
        <>
          {/* затемнение общего плана бумагой */}
          <rect width={W} height={H} fill={rgba(PAL.surface, 0.82 * u)} mask={`url(#lens-mask-${id})`} />
          <circle cx={lc[0]} cy={lc[1]} r={lr + 14} fill="none" stroke={rgba(PAL.ink, 0.07 * u)} strokeWidth={22} />
          <g clipPath={`url(#lens-clip-${id})`}>
            <g transform={`translate(${lc[0]} ${lc[1]}) scale(${scale}) translate(0 ${oy})`} opacity={clamp(u * 3)}>
              {children}
            </g>
            {/* оправа: светлое кольцо и риски */}
            <g transform={`translate(${lc[0]} ${lc[1]}) scale(${lr / LR})`} opacity={chrome}>
              <circle r={LR - 10} fill="none" stroke={PAL.surface2} strokeWidth={26} opacity={0.9} />
              <circle r={LR - 22} fill="none" stroke={rgba(PAL.ink, 0.12)} strokeWidth={1.5} />
              {ticks.map((a, k) => {
                const len = k % 6 === 0 ? 12 : 6;
                const r0 = LR - 24;
                return (
                  <line
                    key={k}
                    x1={Math.cos(a) * r0}
                    y1={Math.sin(a) * r0}
                    x2={Math.cos(a) * (r0 - len)}
                    y2={Math.sin(a) * (r0 - len)}
                    stroke={PAL.inkMuted}
                    strokeWidth={1.4}
                    opacity={0.45}
                  />
                );
              })}
            </g>
          </g>
        </>
      ) : null}
      {st.pre > 0 && st.post > 0 ? (
        <MarkerPath pts={handEllipse(lc[0], lc[1], lr + 12, lr + 12, 3)} progress={st.pre} alpha={st.post} />
      ) : null}
    </svg>
  );
};
