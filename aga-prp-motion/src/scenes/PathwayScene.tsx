import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {SceneFrame} from '../components/SceneFrame';
import {Reveal, useReveal} from '../components/Reveal';
import {Arrow} from '../components/Arrow';
import {Badge} from '../components/Badge';
import {Card} from '../components/Card';
import {BadgeKind, colors} from '../theme';

type NodeProps = {
  delay: number;
  title: string;
  sub: string;
  color: string;
  pulse?: boolean;
};

const Node: React.FC<NodeProps> = ({delay, title, sub, color, pulse}) => {
  const p = useReveal(delay, 28);
  const frame = useCurrentFrame();
  const glow = pulse ? 0.35 + 0.25 * Math.sin((frame - delay) / 9) : 0;
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [24, 0])}px)`,
      }}
    >
      <div
        style={{
          borderRadius: 20,
          padding: '20px 20px',
          background: `linear-gradient(180deg, ${color}26, ${color}10)`,
          border: `1.5px solid ${color}`,
          boxShadow: pulse ? `0 0 ${40 * glow}px ${color}` : 'none',
          height: 250,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <div style={{fontSize: 25, fontWeight: 800, color, lineHeight: 1.15}}>{title}</div>
        <div style={{fontSize: 18, color: colors.text, marginTop: 10, lineHeight: 1.3, opacity: 0.9}}>{sub}</div>
      </div>
    </div>
  );
};

const callouts: {badge: BadgeKind; title: string; text: string}[] = [
  {
    badge: 'fact',
    title: 'Локальная гиперчувствительность',
    text: 'Сывороточный тестостерон обычно в норме. При врождённом дефиците 5α-редуктазы II АГА не развивается.',
  },
  {
    badge: 'fact',
    title: 'Региональная разница',
    text: 'Во фронто-вертексных фолликулах ↑ экспрессия AR и 5αR-II; в окципитальных — низкая → они сохраняются.',
  },
  {
    badge: 'hypothesis',
    title: 'Дополнительные факторы',
    text: 'PGD2 через рецептор GPR44, микровоспаление, перифолликулярный фиброз, оксидативный стресс — вклад обсуждается.',
  },
];

export const PathwayScene: React.FC<{index: number; total: number}> = ({index, total}) => {
  const step = 26;
  return (
    <SceneFrame index={index} total={total} kicker="Часть 2 · Патогенез" title="Каскад DHT → миниатюризация" accent={colors.amber}>
      <div style={{display: 'flex', alignItems: 'center', gap: 4, marginTop: 6}}>
        <Node
          delay={10}
          title="Тестостерон"
          sub="Циркулирующий + локальный синтез из DHEA и андростендиона"
          color={colors.blue}
        />
        <Arrow delay={10 + step * 0.6} width={110} label="5α-редуктаза II" />
        <Node
          delay={10 + step}
          title="DHT"
          sub="Аффинность к AR ≈ ×5, медленная диссоциация → сильный агонист"
          color={colors.amber}
          pulse
        />
        <Arrow delay={10 + step * 1.6} width={110} label="связывание" />
        <Node
          delay={10 + step * 2}
          title="Андрогеновый рецептор"
          sub="Клетки дермального сосочка; ядерная транскрипционная программа"
          color={colors.violet}
        />
        <Arrow delay={10 + step * 2.6} width={110} label="паракринно" />
        <Node
          delay={10 + step * 3}
          title="TGF-β · DKK-1 · IL-6"
          sub="↓ Wnt/β-catenin, ↓ пролиферации матрикса, апоптоз кератиноцитов"
          color={colors.red}
        />
        <Arrow delay={10 + step * 3.6} width={110} />
        <Node
          delay={10 + step * 4}
          title="Укорочение анагена"
          sub="↑ доли телогена и кеногена → миниатюризация: терминальный → веллус"
          color={colors.red}
        />
      </div>

      <div style={{display: 'flex', gap: 26, marginTop: 44}}>
        {callouts.map((c, i) => (
          <Reveal key={c.title} delay={150 + i * 22} style={{flex: 1}}>
            <Card accent={c.badge === 'fact' ? colors.green : colors.violet} style={{height: 230}}>
              <Badge kind={c.badge} size={15} />
              <div style={{fontSize: 26, fontWeight: 700, marginTop: 14}}>{c.title}</div>
              <div style={{fontSize: 20, color: colors.muted, marginTop: 10, lineHeight: 1.35}}>{c.text}</div>
            </Card>
          </Reveal>
        ))}
      </div>
    </SceneFrame>
  );
};
