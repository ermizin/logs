// Фирменная разметка маркером, выноски, чипы, масштаб. SVG-примитивы для слоя 1080×1920.
import React from 'react';
import {PAL, FONT, W, H} from './palette';
import {E, clamp, invLerp, lerp, rgba} from './math';
import {Pt, bentCurve, handEllipse, polyPartial, smoothD} from './geom';

// Полноэкранный SVG-слой в координатах кадра.
export const Layer: React.FC<{children: React.ReactNode; style?: React.CSSProperties; opacity?: number}> = ({children, style, opacity = 1}) => (
  <svg
    width={W}
    height={H}
    viewBox={`0 0 ${W} ${H}`}
    style={{position: 'absolute', inset: 0, overflow: 'visible', opacity, ...style}}
  >
    {children}
  </svg>
);

type MarkerOpt = {
  color?: string;
  width?: number;
  alpha?: number;
  dash?: number[] | null;
  closed?: boolean;
  progress?: number;
};

// Линия маркера: скруглённые концы, второй проход — «чернила легли неровно».
export const MarkerPath: React.FC<{pts: Pt[]} & MarkerOpt> = ({
  pts,
  color = PAL.marker,
  width = 8,
  alpha = 1,
  dash = null,
  closed = false,
  progress = 1,
}) => {
  const src = closed ? pts.concat([pts[0]]) : pts;
  const part = progress < 1 ? polyPartial(src, progress) : src;
  if (part.length < 2 || alpha <= 0) return null;
  const d = smoothD(part, false);
  const dashA = dash ? dash.join(' ') : undefined;
  return (
    <g opacity={alpha} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d={d} stroke={color} strokeWidth={width} strokeDasharray={dashA} />
      <path d={d} stroke={color} strokeWidth={width * 0.45} strokeDasharray={dashA} opacity={0.22} transform="translate(0.8 -0.9)" />
    </g>
  );
};

export const HandEllipse: React.FC<{cx: number; cy: number; rx: number; ry: number; seed?: number} & MarkerOpt> = ({
  cx,
  cy,
  rx,
  ry,
  seed = 1,
  ...opt
}) => <MarkerPath pts={handEllipse(cx, cy, rx, ry, seed)} {...opt} />;

// Текст с базовой линией в координатах кадра (HTML-слой поверх SVG).
export const Txt: React.FC<{
  x: number;
  y: number; // базовая линия
  size: number;
  weight?: number;
  family?: 'sans' | 'serif' | 'mono';
  italic?: boolean;
  color?: string;
  spacing?: number;
  align?: 'left' | 'right' | 'center';
  alpha?: number;
  dy?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({x, y, size, weight = 400, family = 'sans', italic, color = PAL.ink, spacing = 0, align = 'left', alpha = 1, dy = 0, children, style}) => {
  if (alpha <= 0) return null;
  const asc = family === 'serif' ? 0.72 : family === 'mono' ? 0.74 : 0.74;
  const base: React.CSSProperties = {
    position: 'absolute',
    top: y - size * asc + dy,
    fontFamily: FONT[family],
    fontSize: size,
    fontWeight: weight,
    fontStyle: italic ? 'italic' : 'normal',
    color,
    letterSpacing: spacing,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    opacity: alpha,
    ...style,
  };
  if (align === 'left') base.left = x;
  else if (align === 'right') base.right = W - x;
  else {
    base.left = x;
    base.transform = `translateX(-50%) ${style?.transform ?? ''}`;
  }
  return <div style={base}>{children}</div>;
};

// Выноска: точка на объекте, линия, подпись на подложке.
export const Callout: React.FC<{anchor: Pt; pos: Pt; text: string; prog: number; alpha?: number; align?: 'left' | 'right'}> = ({
  anchor,
  pos,
  text,
  prog,
  alpha = 1,
  align = 'left',
}) => {
  if (prog <= 0 || alpha <= 0) return null;
  const lp = E.out(clamp(prog * 1.6));
  const tp = E.out(clamp(prog * 1.6 - 0.45));
  const end: Pt = [lerp(anchor[0], pos[0], lp), lerp(anchor[1], pos[1], lp)];
  return (
    <>
      <Layer opacity={alpha}>
        <circle cx={anchor[0]} cy={anchor[1]} r={5 * lp} fill={PAL.ink} />
        <line x1={anchor[0]} y1={anchor[1]} x2={end[0]} y2={end[1]} stroke={PAL.ink} strokeWidth={2} />
      </Layer>
      {tp > 0 ? (
        <div
          style={{
            position: 'absolute',
            top: pos[1] - 25 + (1 - tp) * 8,
            ...(align === 'left' ? {left: pos[0] + 10} : {right: W - pos[0] + 10}),
            height: 50,
            padding: '0 14px',
            borderRadius: 12,
            background: rgba(PAL.surface, 0.92),
            color: PAL.ink,
            fontFamily: FONT.sans,
            fontWeight: 500,
            fontSize: 34,
            lineHeight: '50px',
            whiteSpace: 'nowrap',
            opacity: alpha * tp,
          }}
        >
          {text}
        </div>
      ) : null}
    </>
  );
};

// Пометка маркером: изогнутая стрелка + слово Playfair Italic.
export const MarkerNote: React.FC<{from: Pt; to: Pt; text: string; textPos: Pt; prog: number; alpha?: number; size?: number; color?: string}> = ({
  from,
  to,
  text,
  textPos,
  prog,
  alpha = 1,
  size = 66,
  color = PAL.marker,
}) => {
  if (prog <= 0 || alpha <= 0) return null;
  const curve = bentCurve(from, to, 0.25, 24);
  const lp = E.inOut(clamp(prog * 1.4));
  const hp = E.out(clamp((prog * 1.4 - 1) / 0.25));
  const p = curve[24];
  const q = curve[21];
  const ang = Math.atan2(p[1] - q[1], p[0] - q[0]);
  const head = (s: number): Pt => [p[0] + Math.cos(ang + s * 2.5) * 26 * hp, p[1] + Math.sin(ang + s * 2.5) * 26 * hp];
  const tp = E.out(clamp(prog * 1.6 - 0.2));
  return (
    <>
      <Layer>
        <MarkerPath pts={curve} progress={lp} alpha={alpha} color={color} />
        {lp >= 1 ? <MarkerPath pts={[head(1), p, head(-1)]} alpha={alpha} color={color} /> : null}
      </Layer>
      <Txt x={textPos[0]} y={textPos[1]} size={size} weight={500} family="serif" italic color={color} alpha={alpha * tp} dy={(1 - tp) * 10}>
        {text}
      </Txt>
    </>
  );
};

// Чип: моноширинная подпись капслоком на мягкой подложке.
export const Chip: React.FC<{x: number; y: number; text: string; alpha: number; colors?: [string, string]; align?: 'left' | 'right'}> = ({
  x,
  y,
  text,
  alpha,
  colors = [PAL.iodineSoft, PAL.iodine],
  align = 'left',
}) => {
  if (alpha <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: y - 24 + (1 - alpha) * 10,
        ...(align === 'left' ? {left: x} : {right: W - x}),
        height: 48,
        padding: '0 16px',
        borderRadius: 12,
        background: colors[0],
        color: colors[1],
        fontFamily: FONT.mono,
        fontWeight: 500,
        fontSize: 24,
        letterSpacing: 1.9,
        lineHeight: '48px',
        whiteSpace: 'nowrap',
        opacity: alpha,
      }}
    >
      {text}
    </div>
  );
};

export const ScaleBar: React.FC<{x: number; y: number; len: number; label: string; alpha: number}> = ({x, y, len, label, alpha}) => {
  if (alpha <= 0) return null;
  return (
    <>
      <Layer opacity={alpha}>
        <g stroke={PAL.inkMuted} strokeWidth={2.4} fill="none">
          <line x1={x} y1={y - 8} x2={x} y2={y + 8} />
          <line x1={x} y1={y} x2={x + len} y2={y} />
          <line x1={x + len} y1={y - 8} x2={x + len} y2={y + 8} />
        </g>
      </Layer>
      <Txt x={x + len + 14} y={y + 8} size={22} family="mono" color={PAL.inkMuted} spacing={1.2} alpha={alpha}>
        {label}
      </Txt>
    </>
  );
};

// Полоска-«окно» для строк заголовка: строка въезжает снизу в пределах клипа.
export const ClipLine: React.FC<{y: number; h: number; k: number; alpha?: number; extraY?: number; children: React.ReactNode}> = ({
  y,
  h,
  k,
  alpha = 1,
  extraY = 0,
  children,
}) => (
  <div style={{position: 'absolute', left: 0, top: y, width: W, height: h, overflow: 'hidden', opacity: alpha}}>
    <div style={{position: 'absolute', inset: 0, transform: `translateY(${(1 - k) * h * 0.85 + extraY}px)`}}>{children}</div>
  </div>
);

export const invL = invLerp;
