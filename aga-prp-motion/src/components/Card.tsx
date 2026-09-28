import React from 'react';
import {colors} from '../theme';

type Props = {
  accent?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  padding?: number;
};

export const Card: React.FC<Props> = ({accent, style, children, padding = 24}) => (
  <div
    style={{
      background: colors.panel,
      border: `1px solid ${colors.panelBorder}`,
      borderLeft: accent ? `4px solid ${accent}` : `1px solid ${colors.panelBorder}`,
      borderRadius: 18,
      padding,
      boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
      ...style,
    }}
  >
    {children}
  </div>
);
