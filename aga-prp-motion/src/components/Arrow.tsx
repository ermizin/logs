import React from 'react';
import {interpolate} from 'remotion';
import {colors} from '../theme';
import {useReveal} from './Reveal';

type Props = {
  delay: number;
  width?: number;
  label?: string;
  color?: string;
  direction?: 'right' | 'down';
};

// Animated arrow that draws itself from tail to head.
export const Arrow: React.FC<Props> = ({
  delay,
  width = 90,
  label,
  color = colors.muted,
  direction = 'right',
}) => {
  const p = useReveal(delay, 24);
  const len = interpolate(p, [0, 1], [0, width - 14]);
  const isRight = direction === 'right';
  const svgW = isRight ? width : 40;
  const svgH = isRight ? 40 : width;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        flex: 'none',
      }}
    >
      {label ? (
        <div
          style={{
            fontSize: 15,
            color: colors.muted,
            textAlign: 'center',
            width: isRight ? width + 24 : 150,
            lineHeight: 1.2,
            opacity: p,
            wordBreak: 'break-word',
          }}
        >
          {label}
        </div>
      ) : null}
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        {isRight ? (
          <>
            <line x1={0} y1={20} x2={len} y2={20} stroke={color} strokeWidth={3} strokeLinecap="round" />
            <polygon
              points={`${len},12 ${len + 14},20 ${len},28`}
              fill={color}
              opacity={p}
            />
          </>
        ) : (
          <>
            <line x1={20} y1={0} x2={20} y2={len} stroke={color} strokeWidth={3} strokeLinecap="round" />
            <polygon points={`12,${len} 20,${len + 14} 28,${len}`} fill={color} opacity={p} />
          </>
        )}
      </svg>
    </div>
  );
};
