// Бумага: зерно, виньетка, растворение краёв под интерфейсом Instagram.
import React from 'react';
import {PAL, W, H} from './palette';
import {E, P, lerp, rgba} from './math';

export const PaperGrain: React.FC = () => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
    <defs>
      <filter id="paper-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" seed="5" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.075" />
        </feComponentTransfer>
      </filter>
      <radialGradient id="paper-vignette" cx="50%" cy="45%" r="78%">
        <stop offset="45%" stopColor="rgba(60,50,30,0)" />
        <stop offset="100%" stopColor="rgba(60,50,30,0.07)" />
      </radialGradient>
    </defs>
    <rect width={W} height={H} filter="url(#paper-grain)" />
    <rect width={W} height={H} fill="url(#paper-vignette)" />
  </svg>
);

// Иллюстрация растворяется в бумаге под HUD и в нижней зоне интерфейса.
export const EdgeFade: React.FC<{t: number; hookDeep?: boolean}> = ({t, hookDeep = true}) => {
  const k = hookDeep ? P(t, 3.2, 4.4, E.inOut) : 1;
  const c = (a: number) => rgba(PAL.surface, a);
  const stops = [
    [0, 1],
    [lerp(600, 150, k) / H, 1],
    [lerp(700, 300, k) / H, lerp(0.85, 0.78, k)],
    [lerp(820, 430, k) / H, 0],
    [1360 / H, 0],
    [1560 / H, 0.85],
    [1, 1],
  ];
  const grad = `linear-gradient(180deg, ${stops.map(([o, a]) => `${c(a)} ${(o * 100).toFixed(2)}%`).join(', ')})`;
  return <div style={{position: 'absolute', inset: 0, background: grad, pointerEvents: 'none'}} />;
};

export const Paper: React.FC = () => <div style={{position: 'absolute', inset: 0, background: PAL.surface}} />;
