import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {SceneFrame} from '../components/SceneFrame';
import {Bullets} from '../components/Bullets';
import {Reveal} from '../components/Reveal';
import {colors} from '../theme';

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return {x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad)};
};

const arcPath = (cx: number, cy: number, r: number, start: number, end: number) => {
  if (end - start <= 0.01) return '';
  const s = polar(cx, cy, r, start);
  const e = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
};

type Phase = {name: string; dur: string; share: string; from: number; to: number; color: string};

const phases: Phase[] = [
  {name: 'Анаген', dur: '2–6 лет', share: '≈ 85–90% фолликулов', from: 0, to: 268, color: colors.teal},
  {name: 'Катаген', dur: '2–3 нед', share: '≈ 1–2%', from: 270, to: 284, color: colors.amber},
  {name: 'Телоген', dur: '2–3 мес', share: '≈ 10–15%', from: 286, to: 358, color: colors.red},
];

const CycleWheel: React.FC = () => {
  const frame = useCurrentFrame();
  const size = 860;
  const height = 600;
  const cx = 400;
  const cy = height / 2;
  const r = 200;
  const drawn = interpolate(frame, [12, 110], [0, 360], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const markerAngle = frame > 110 ? ((frame - 110) * 1.2) % 360 : 0;
  const marker = polar(cx, cy, r, markerAngle);

  return (
    <svg width={size} height={height} viewBox={`0 0 ${size} ${height}`}>
      <circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={34} fill="none" />
      {phases.map((ph) => {
        const end = Math.min(ph.to, drawn);
        const visible = end > ph.from;
        const mid = polar(cx, cy, r + 70, (ph.from + ph.to) / 2);
        const labelOpacity = interpolate(drawn, [ph.from, ph.from + 12], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const anchor = mid.x < cx - 30 ? 'end' : mid.x > cx + 30 ? 'start' : 'middle';
        return (
          <g key={ph.name}>
            {visible ? (
              <path
                d={arcPath(cx, cy, r, ph.from, end)}
                stroke={ph.color}
                strokeWidth={34}
                fill="none"
                strokeLinecap="butt"
              />
            ) : null}
            <g opacity={labelOpacity}>
              <text
                x={mid.x}
                y={mid.y - 6}
                fill={ph.color}
                fontSize={26}
                fontWeight={700}
                textAnchor={anchor}
              >
                {ph.name}
              </text>
              <text x={mid.x} y={mid.y + 22} fill={colors.text} fontSize={20} textAnchor={anchor}>
                {ph.dur}
              </text>
              <text x={mid.x} y={mid.y + 46} fill={colors.muted} fontSize={18} textAnchor={anchor}>
                {ph.share}
              </text>
            </g>
          </g>
        );
      })}
      {frame > 110 ? (
        <circle cx={marker.x} cy={marker.y} r={12} fill="#fff" stroke={colors.bg} strokeWidth={4} />
      ) : null}
      <text x={cx} y={cy - 14} fill={colors.text} fontSize={30} fontWeight={700} textAnchor="middle">
        Цикл волоса
      </text>
      <text x={cx} y={cy + 22} fill={colors.muted} fontSize={19} textAnchor="middle">
        асинхронный, ≈ 100 000 фолликулов
      </text>
      <text x={cx} y={cy + 48} fill={colors.muted} fontSize={19} textAnchor="middle">
        норма выпадения 50–100/сут
      </text>
    </svg>
  );
};

export const BasicsScene: React.FC<{index: number; total: number}> = ({index, total}) => {
  return (
    <SceneFrame index={index} total={total} kicker="Часть 1 · Основы" title="АГА: самая частая форма выпадения волос" accent={colors.teal}>
      <div style={{display: 'flex', gap: 30, height: '100%'}}>
        <div style={{flex: 1, paddingTop: 10}}>
          <Bullets
            start={14}
            step={22}
            fontSize={28}
            gap={28}
            items={[
              {
                text: 'Распространённость: ≈ 50% мужчин к 50 годам, до 80% к 70; у женщин ≈ 40% к 70 годам',
                sub: 'Данные преимущественно для европеоидов; у восточноазиатских популяций ниже',
                badge: 'fact',
              },
              {
                text: 'Полигенное наследование',
                sub: 'Локусы AR/EDA2R (Xq12), 20p11 и >200 ассоциированных вариантов по GWAS',
                badge: 'fact',
              },
              {
                text: 'Механизм: андроген-зависимая прогрессирующая миниатюризация фолликулов',
                sub: 'Уровень тестостерона обычно нормальный — ключевая роль локальной чувствительности',
                badge: 'fact',
              },
              {
                text: 'Паттерн: фронто-темпоральная и вертексная зоны; затылок сохранён',
                sub: 'Окципитальные фолликулы — андроген-независимые → донорская зона для трансплантации',
                badge: 'fact',
              },
            ]}
          />
        </div>
        <Reveal delay={6} from="scale" style={{flex: 'none', display: 'flex', alignItems: 'center'}}>
          <CycleWheel />
        </Reveal>
      </div>
    </SceneFrame>
  );
};
