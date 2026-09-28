import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, font} from '../theme';
import {Background} from '../components/SceneFrame';

// Deterministic pseudo-random for particle placement.
const hash = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const Particles: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const items = Array.from({length: 46});
  return (
    <AbsoluteFill>
      {items.map((_, i) => {
        const baseX = hash(i, 1) * width;
        const baseY = hash(i, 2) * height;
        const speed = 0.25 + hash(i, 3) * 0.6;
        const size = 5 + hash(i, 4) * 9;
        const y = ((baseY - frame * speed) % (height + 40) + height + 40) % (height + 40) - 20;
        const x = baseX + Math.sin((frame + i * 10) / 40) * 12;
        const color = i % 3 === 0 ? colors.amber : colors.teal;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size,
              height: size * 0.55,
              borderRadius: '50%',
              background: color,
              opacity: 0.18 + hash(i, 5) * 0.25,
              transform: `rotate(${hash(i, 6) * 180 + frame * 0.3}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const FollicleMark: React.FC<{progress: number}> = ({progress}) => {
  // A stylised follicle with a hair shaft, drawn progressively.
  const shaft = interpolate(progress, [0, 1], [0, 1]);
  return (
    <svg width={260} height={300} viewBox="0 0 260 300">
      <defs>
        <linearGradient id="shaftGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.teal} />
          <stop offset="100%" stopColor={colors.hairLight} />
        </linearGradient>
      </defs>
      {/* skin surface */}
      <rect x={20} y={150} width={220} height={130} rx={18} fill={colors.skin} opacity={0.12} />
      <line x1={20} y1={150} x2={240} y2={150} stroke={colors.skin} strokeOpacity={0.5} strokeWidth={2} />
      {/* follicle sheath */}
      <path
        d="M105 150 C 100 200, 100 240, 130 262 C 160 240, 160 200, 155 150 Z"
        fill={colors.skinDark}
        opacity={0.35 * progress}
      />
      {/* dermal papilla */}
      <ellipse cx={130} cy={246} rx={12} ry={10} fill={colors.amber} opacity={progress} />
      {/* hair shaft */}
      <path
        d={`M130 262 C 128 220, 126 180, 124 150 C 120 ${150 - 110 * shaft}, 110 ${150 - 125 * shaft}, ${
          128 - 40 * shaft
        } ${150 - 135 * shaft}`}
        stroke="url(#shaftGrad)"
        strokeWidth={9}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const TitleScene: React.FC<{index: number; total: number}> = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p1 = spring({frame, fps, config: {damping: 200}, durationInFrames: 40});
  const p2 = spring({frame: frame - 18, fps, config: {damping: 200}, durationInFrames: 40});
  const p3 = spring({frame: frame - 36, fps, config: {damping: 200}, durationInFrames: 40});
  const p4 = spring({frame: frame - 55, fps, config: {damping: 200}, durationInFrames: 40});
  const shaft = spring({frame: frame - 25, fps, config: {damping: 30, stiffness: 60}, durationInFrames: 70});

  return (
    <AbsoluteFill style={{fontFamily: font, color: colors.text}}>
      <Background accent={colors.amber} />
      <Particles />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 90,
          padding: '0 140px',
        }}
      >
        <div style={{flex: 1, maxWidth: 1100}}>
          <div
            style={{
              fontSize: 24,
              letterSpacing: 6,
              color: colors.muted,
              fontWeight: 600,
              textTransform: 'uppercase',
              opacity: p1,
              transform: `translateY(${interpolate(p1, [0, 1], [20, 0])}px)`,
            }}
          >
            Трихология · Регенеративная медицина
          </div>
          <div
            style={{
              fontSize: 92,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: -2,
              marginTop: 26,
              opacity: p2,
              transform: `translateY(${interpolate(p2, [0, 1], [30, 0])}px)`,
            }}
          >
            Андрогенетическая
            <br />
            алопеция
          </div>
          <div
            style={{
              fontSize: 92,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: -2,
              color: colors.teal,
              opacity: p3,
              transform: `translateY(${interpolate(p3, [0, 1], [30, 0])}px)`,
            }}
          >
            и PRP-терапия
          </div>
          <div
            style={{
              marginTop: 34,
              fontSize: 28,
              color: colors.muted,
              lineHeight: 1.4,
              opacity: p4,
              transform: `translateY(${interpolate(p4, [0, 1], [20, 0])}px)`,
            }}
          >
            Патогенез · Стандарт терапии · Механизм PRP · Доказательная база · Протокол
          </div>
        </div>
        <div style={{flex: 'none', opacity: p2, transform: `scale(${interpolate(p2, [0, 1], [0.9, 1])})`}}>
          <FollicleMark progress={shaft} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
