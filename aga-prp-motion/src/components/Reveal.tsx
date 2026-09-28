import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

type Props = {
  delay?: number;
  from?: 'bottom' | 'left' | 'right' | 'scale' | 'none';
  duration?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export const useReveal = (delay: number, duration = 30) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: {damping: 200},
    durationInFrames: duration,
  });
};

export const Reveal: React.FC<Props> = ({
  delay = 0,
  from = 'bottom',
  duration = 30,
  style,
  children,
}) => {
  const p = useReveal(delay, duration);
  const y = from === 'bottom' ? interpolate(p, [0, 1], [26, 0]) : 0;
  const x =
    from === 'left'
      ? interpolate(p, [0, 1], [-30, 0])
      : from === 'right'
        ? interpolate(p, [0, 1], [30, 0])
        : 0;
  const s = from === 'scale' ? interpolate(p, [0, 1], [0.85, 1]) : 1;
  return (
    <div
      style={{
        opacity: p,
        transform: `translate(${x}px, ${y}px) scale(${s})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
