import React from 'react';
import {colors, BadgeKind} from '../theme';
import {Badge} from './Badge';
import {Reveal} from './Reveal';

export type BulletItem = {
  text: React.ReactNode;
  sub?: React.ReactNode;
  badge?: BadgeKind;
  badgeText?: string;
  color?: string;
};

type Props = {
  items: BulletItem[];
  start?: number;
  step?: number;
  fontSize?: number;
  gap?: number;
  accent?: string;
  marker?: 'dot' | 'check' | 'number';
};

export const Bullets: React.FC<Props> = ({
  items,
  start = 10,
  step = 14,
  fontSize = 28,
  gap = 22,
  accent = colors.teal,
  marker = 'dot',
}) => {
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap}}>
      {items.map((item, i) => {
        const color = item.color ?? accent;
        return (
          <Reveal key={i} delay={start + i * step} from="left">
            <div style={{display: 'flex', gap: 18, alignItems: 'flex-start'}}>
              <div
                style={{
                  flex: 'none',
                  width: marker === 'dot' ? 12 : 34,
                  height: marker === 'dot' ? 12 : 34,
                  marginTop: marker === 'dot' ? fontSize * 0.45 : 0,
                  borderRadius: marker === 'dot' ? 6 : 10,
                  background: marker === 'dot' ? color : `${color}22`,
                  border: marker === 'dot' ? 'none' : `1.5px solid ${color}`,
                  color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {marker === 'check' ? '✓' : marker === 'number' ? i + 1 : null}
              </div>
              <div style={{flex: 1}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap'}}>
                  <div style={{fontSize, lineHeight: 1.3, fontWeight: 500}}>{item.text}</div>
                  {item.badge ? <Badge kind={item.badge} text={item.badgeText} size={15} /> : null}
                </div>
                {item.sub ? (
                  <div
                    style={{
                      fontSize: fontSize * 0.75,
                      color: colors.muted,
                      marginTop: 6,
                      lineHeight: 1.35,
                    }}
                  >
                    {item.sub}
                  </div>
                ) : null}
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
};
