import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, font} from '../theme';

type Props = {
  index: number;
  total: number;
  kicker: string;
  title: string;
  accent?: string;
  children: React.ReactNode;
};

const Grid: React.FC = () => (
  <svg
    width="100%"
    height="100%"
    style={{position: 'absolute', inset: 0, opacity: 0.5}}
    aria-hidden
  >
    <defs>
      <pattern id="dots" width="48" height="48" patternUnits="userSpaceOnUse">
        <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(255,255,255,0.07)" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#dots)" />
  </svg>
);

export const Background: React.FC<{accent?: string}> = ({accent = colors.teal}) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 30;
  return (
    <>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1400px 900px at 18% 8%, ${colors.bg2} 0%, ${colors.bg} 60%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -300 + drift,
          bottom: -380,
          width: 1000,
          height: 1000,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}22 0%, transparent 60%)`,
        }}
      />
      <Grid />
    </>
  );
};

export const SceneFrame: React.FC<Props> = ({
  index,
  total,
  kicker,
  title,
  accent = colors.teal,
  children,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 200}, durationInFrames: 28});
  const lineP = spring({frame: frame - 8, fps, config: {damping: 200}, durationInFrames: 34});
  const titleY = interpolate(p, [0, 1], [30, 0]);

  return (
    <AbsoluteFill style={{fontFamily: font, color: colors.text}}>
      <Background accent={accent} />

      <div style={{position: 'absolute', top: 60, left: 96, right: 96}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14, opacity: p}}>
          <div style={{width: 12, height: 12, borderRadius: 6, background: accent}} />
          <div
            style={{
              fontSize: 22,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: colors.muted,
              fontWeight: 600,
            }}
          >
            {kicker}
          </div>
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            marginTop: 10,
            opacity: p,
            transform: `translateY(${titleY}px)`,
            letterSpacing: -0.5,
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
        <div
          style={{
            height: 3,
            marginTop: 16,
            width: 560,
            background: `linear-gradient(90deg, ${accent}, transparent)`,
            transformOrigin: 'left',
            transform: `scaleX(${lineP})`,
          }}
        />
      </div>

      <div style={{position: 'absolute', top: 232, left: 96, right: 96, bottom: 96}}>{children}</div>

      <div
        style={{
          position: 'absolute',
          left: 96,
          right: 96,
          bottom: 40,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: colors.dim,
          fontSize: 20,
          fontWeight: 500,
          letterSpacing: 1,
        }}
      >
        <div>АНДРОГЕНЕТИЧЕСКАЯ АЛОПЕЦИЯ · PRP</div>
        <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
          {Array.from({length: total}).map((_, i) => (
            <div
              key={i}
              style={{
                width: i + 1 === index ? 28 : 8,
                height: 8,
                borderRadius: 4,
                background: i + 1 <= index ? accent : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
          <div style={{marginLeft: 12, fontVariantNumeric: 'tabular-nums'}}>
            {String(index).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
