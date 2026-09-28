// Пробирка: кровь → центрифуга → плазма / тромбоцитарный слой / эритроциты.
import React from 'react';
import {PAL} from '../palette';
import {E, P, clamp, lerp, mix, rng} from '../math';

export const TUBE = {x: 420, y: 470, w: 240, h: 660, liquidTop: 540};

export function tubeState(t: number) {
  const draw = P(t, 24.0, 24.8, E.outQ);
  const fill = P(t, 24.3, 25.5, E.inOut);
  const spin = t >= 26.3 && t < 28.4 ? (t - 26.3) * 4 : 0;
  const spinA = P(t, 26.1, 26.5) * (1 - P(t, 28.3, 28.8));
  const sep = P(t, 26.6, 28.8, E.inOut);
  const wob = spinA > 0 ? Math.sin(t * 55) * 2 * spinA : 0;
  return {draw, fill, spin, spinA, sep, wob};
}

export type TubeState = ReturnType<typeof tubeState>;

export function buffyY(st: TubeState) {
  const liquidH = TUBE.y + TUBE.h - TUBE.liquidTop;
  return TUBE.liquidTop + liquidH * 0.55 * st.sep;
}

export const TubeMacro: React.FC<{st: TubeState}> = ({st}) => {
  const {x, y, w, h} = TUBE;
  const r = w / 2;
  const glassD = `M${x} ${y} H${x + w} V${y + h - r} A${r} ${r} 0 0 1 ${x} ${y + h - r} Z`;
  const liquidH = (y + h - TUBE.liquidTop) * st.fill;
  const top = y + h - liquidH;
  const plasmaH = liquidH * 0.55 * st.sep;
  const buffyH = 16 * st.sep;
  const R = rng(19);
  const sparks = Array.from({length: 26}, () => ({x: x + 14 + R() * (w - 28), y: R() * 70, s: 0.4 + R() * 0.6}));
  return (
    <g opacity={st.draw} transform={`translate(${540 + st.wob} 800) scale(${lerp(0.96, 1, st.draw)}) translate(-540 -800)`}>
      <defs>
        <clipPath id="tube-clip">
          <path d={glassD} />
        </clipPath>
      </defs>
      <g clipPath="url(#tube-clip)">
        <rect x={x} y={top} width={w} height={liquidH + 4} fill={mix(PAL.rbc, PAL.rbcDark, 0.5)} />
        <rect x={x} y={top} width={w} height={plasmaH} fill={PAL.plasma} opacity={clamp(st.sep * 2)} />
        <rect x={x} y={top + plasmaH} width={w} height={buffyH} fill={PAL.buffy} />
        {sparks.map((s, k) => (
          <circle key={k} cx={s.x} cy={top + plasmaH - 6 - s.y} r={2.6} fill={PAL.platelet} opacity={st.sep * s.s} />
        ))}
        {/* блик */}
        <rect x={x + 18} y={y} width={16} height={h} fill="#fff" opacity={0.28} />
      </g>
      <path d={glassD} fill={PAL.glass} fillOpacity={0.18} stroke={PAL.inkMuted} strokeWidth={3} />
      <rect x={x - 8} y={y - 16} width={w + 16} height={30} rx={7} fill={PAL.surface2} stroke={PAL.inkMuted} strokeWidth={2.5} />
      {/* ротор центрифуги */}
      <g transform={`translate(880 600) rotate(${(st.spin * 360) % 360})`} opacity={st.spinA}>
        <circle r={46} fill="none" stroke={PAL.inkMuted} strokeWidth={4} />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <line key={a} x1={0} y1={0} x2={46 * Math.cos((a * Math.PI) / 180)} y2={46 * Math.sin((a * Math.PI) / 180)} stroke={PAL.inkMuted} strokeWidth={4} />
        ))}
        <circle r={9} fill={PAL.inkMuted} />
      </g>
    </g>
  );
};
