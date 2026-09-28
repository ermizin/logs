import React from 'react';
import {BadgeKind, badgeStyle} from '../theme';

export const Badge: React.FC<{kind: BadgeKind; text?: string; size?: number}> = ({
  kind,
  text,
  size = 16,
}) => {
  const {label, color} = badgeStyle[kind];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: `${size * 0.3}px ${size * 0.7}px`,
        borderRadius: 999,
        border: `1.5px solid ${color}`,
        color,
        fontSize: size,
        fontWeight: 600,
        letterSpacing: 0.4,
        whiteSpace: 'nowrap',
        background: `${color}14`,
        lineHeight: 1.2,
      }}
    >
      <span style={{width: size * 0.45, height: size * 0.45, borderRadius: '50%', background: color}} />
      {text ?? label}
    </span>
  );
};
