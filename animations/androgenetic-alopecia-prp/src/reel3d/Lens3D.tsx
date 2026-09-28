// Линза для 3D: круг вырезает отдельный WebGL-холст поверх приглушённого общего плана.
import React from 'react';
import {PAL, W, H} from '../reel/palette';
import {clamp, rgba} from '../reel/math';
import {Pt, handEllipse} from '../reel/geom';
import {MarkerPath} from '../reel/Marker';
import {LENS_C, LENS_R, LensState} from '../reel/scenes/Lens';

export const Lens3D: React.FC<{st: LensState; id: string; children: React.ReactNode}> = ({st, id, children}) => {
  const {u, lc, lr} = st;
  const s = lr / LENS_R;
  const chrome = clamp(u * 2 - 1);
  const ticks = Array.from({length: 72}, (_, k) => (k * Math.PI * 2) / 72);
  return (
    <>
      {st.active ? (
        <>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
            <defs>
              <mask id={`lens3d-mask-${id}`}>
                <rect width={W} height={H} fill="#fff" />
                <circle cx={lc[0]} cy={lc[1]} r={lr} fill="#000" />
              </mask>
            </defs>
            <rect width={W} height={H} fill={rgba(PAL.surface, 0.82 * u)} mask={`url(#lens3d-mask-${id})`} />
            <circle cx={lc[0]} cy={lc[1]} r={lr + 14} fill="none" stroke={rgba(PAL.ink, 0.07 * u)} strokeWidth={22} />
          </svg>
          <div style={{position: 'absolute', inset: 0, clipPath: `circle(${lr}px at ${lc[0]}px ${lc[1]}px)`, opacity: clamp(u * 3)}}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transformOrigin: `${LENS_C[0]}px ${LENS_C[1]}px`,
                transform: `translate(${lc[0] - LENS_C[0]}px, ${lc[1] - LENS_C[1]}px) scale(${s})`,
              }}
            >
              {children}
            </div>
          </div>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
            <g clipPath={`url(#lens3d-clip-${id})`}>
              <defs>
                <clipPath id={`lens3d-clip-${id}`}>
                  <circle cx={lc[0]} cy={lc[1]} r={lr} />
                </clipPath>
              </defs>
              <g transform={`translate(${lc[0]} ${lc[1]}) scale(${s})`} opacity={chrome}>
                <circle r={LENS_R - 10} fill="none" stroke={PAL.surface2} strokeWidth={26} opacity={0.9} />
                <circle r={LENS_R - 22} fill="none" stroke={rgba(PAL.ink, 0.12)} strokeWidth={1.5} />
                {ticks.map((a, k) => {
                  const len = k % 6 === 0 ? 12 : 6;
                  const r0 = LENS_R - 24;
                  return <line key={k} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * (r0 - len)} y2={Math.sin(a) * (r0 - len)} stroke={PAL.inkMuted} strokeWidth={1.4} opacity={0.45} />;
                })}
              </g>
            </g>
          </svg>
        </>
      ) : null}
      {st.pre > 0 && st.post > 0 ? (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <MarkerPath pts={handEllipse(lc[0], lc[1], lr + 12, lr + 12, 3)} progress={st.pre} alpha={st.post} />
        </svg>
      ) : null}
    </>
  );
};

// экранные координаты точки, спроецированной камерой линзы (в кадре 1080×1920), с учётом роста линзы
export const lensMap = (st: LensState, p: Pt): Pt => {
  const s = st.lr / LENS_R;
  return [st.lc[0] + (p[0] - LENS_C[0]) * s, st.lc[1] + (p[1] - LENS_C[1]) * s];
};
