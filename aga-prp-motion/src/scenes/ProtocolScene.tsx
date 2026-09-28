import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {SceneFrame} from '../components/SceneFrame';
import {Reveal} from '../components/Reveal';
import {Badge} from '../components/Badge';
import {Card} from '../components/Card';
import {colors} from '../theme';

type Marker = {month: number; label: string; kind: 'induction' | 'maintenance' | 'control'};

const markers: Marker[] = [
  {month: 0, label: 'Сеанс 1', kind: 'induction'},
  {month: 1, label: 'Сеанс 2', kind: 'induction'},
  {month: 2, label: 'Сеанс 3', kind: 'induction'},
  {month: 3, label: 'Трихоскопия', kind: 'control'},
  {month: 6, label: 'Контроль + поддержка', kind: 'maintenance'},
  {month: 12, label: 'Поддержка', kind: 'maintenance'},
];

const kindColor: Record<Marker['kind'], string> = {
  induction: colors.teal,
  maintenance: colors.blue,
  control: colors.amber,
};

const Timeline: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const W = 1700;
  const left = 70;
  const right = W - 70;
  const y = 90;
  const xOf = (m: number) => left + ((right - left) * m) / 12;
  const axis = spring({frame: frame - 8, fps, config: {damping: 200}, durationInFrames: 50});

  return (
    <svg width={W} height={200} viewBox={`0 0 ${W} 200`}>
      <line x1={left} y1={y} x2={left + (right - left) * axis} y2={y} stroke="rgba(255,255,255,0.35)" strokeWidth={4} strokeLinecap="round" />
      {Array.from({length: 13}).map((_, m) => (
        <g key={m} opacity={axis > m / 12 ? 1 : 0}>
          <line x1={xOf(m)} y1={y - 8} x2={xOf(m)} y2={y + 8} stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
          <text x={xOf(m)} y={y + 36} fill={colors.dim} fontSize={16} textAnchor="middle">
            {m === 0 ? 'мес 0' : m}
          </text>
        </g>
      ))}
      {/* induction bracket */}
      <g opacity={spring({frame: frame - 110, fps, config: {damping: 200}, durationInFrames: 30})}>
        <path d={`M ${xOf(0)} ${y + 58} V ${y + 70} H ${xOf(2)} V ${y + 58}`} stroke={colors.teal} strokeWidth={2} fill="none" />
        <text x={xOf(1)} y={y + 96} fill={colors.teal} fontSize={18} textAnchor="middle" fontWeight={700}>
          индукция: 3 сеанса, интервал 4 нед
        </text>
      </g>
      <g opacity={spring({frame: frame - 150, fps, config: {damping: 200}, durationInFrames: 30})}>
        <path d={`M ${xOf(6)} ${y + 58} V ${y + 70} H ${xOf(12)} V ${y + 58}`} stroke={colors.blue} strokeWidth={2} fill="none" />
        <text x={xOf(9)} y={y + 96} fill={colors.blue} fontSize={18} textAnchor="middle" fontWeight={700}>
          поддержка: каждые 3–6 мес
        </text>
      </g>
      {markers.map((m, i) => {
        const p = spring({frame: frame - (30 + i * 14), fps, config: {damping: 14, stiffness: 140}, durationInFrames: 30});
        const c = kindColor[m.kind];
        return (
          <g key={m.label + m.month} transform={`translate(${xOf(m.month)} ${y})`} opacity={Math.min(1, p * 1.5)}>
            <circle r={18 * p} fill={c} />
            <circle r={26 * p} fill="none" stroke={c} strokeWidth={2} opacity={0.5} />
            <text x={0} y={-36} fill={c} fontSize={18} textAnchor="middle" fontWeight={700}>
              {m.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const params = [
  {
    title: 'Техника',
    color: colors.teal,
    lines: [
      'Интрадермально / субдермально, глубина ≈ 1,5–2,5 мм',
      '0,05–0,1 мл на точку, шаг ≈ 1 см, игла 30–32G',
      'Общий объём 3–8 мл; техника nappage или точечно',
      'Анестезия: крем / криоанестезия; лидокаин не смешивать с PRP',
    ],
  },
  {
    title: 'Подготовка',
    color: colors.amber,
    lines: [
      'ОАК с тромбоцитами, исключение противопоказаний',
      'НПВС / антиагреганты — по возможности отменить за 5–7 дн (данные ограничены)',
      'Гидратация, отсутствие инфекции на скальпе',
      'Стандартизированное фото до курса',
    ],
  },
  {
    title: 'Оценка эффекта',
    color: colors.blue,
    lines: [
      'Трихоскопия / фототрихограмма: плотность, диаметр, % веллусных',
      'Точки: исходно, 3 и 6 мес; затем каждые 6 мес',
      'Одна и та же зона (татуировочная точка / фиксированные ориентиры)',
      'Субъективные шкалы — вторичные конечные точки',
    ],
  },
];

export const ProtocolScene: React.FC<{index: number; total: number}> = ({index, total}) => {
  return (
    <SceneFrame index={index} total={total} kicker="Часть 6 · Практика" title="Типичный протокол PRP при АГА" accent={colors.blue}>
      <Reveal delay={4} from="none">
        <Timeline />
      </Reveal>
      <div style={{display: 'flex', gap: 24, marginTop: 20}}>
        {params.map((p, i) => (
          <Reveal key={p.title} delay={120 + i * 22} style={{flex: 1}}>
            <Card accent={p.color} style={{height: 290}}>
              <div style={{fontSize: 27, fontWeight: 800, color: p.color}}>{p.title}</div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14}}>
                {p.lines.map((l) => (
                  <div key={l} style={{display: 'flex', gap: 10, fontSize: 20, lineHeight: 1.3}}>
                    <span style={{color: p.color}}>•</span>
                    <span>{l}</span>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
      <Reveal delay={200}>
        <div style={{marginTop: 22, display: 'flex', gap: 14, alignItems: 'center'}}>
          <Badge kind="expert" size={15} />
          <div style={{fontSize: 20, color: colors.muted, lineHeight: 1.35}}>
            Единого стандарта нет: в РКИ интервал между сеансами 2–6 нед, число сеансов 3–6, объём и концентрация варьируют.
            Показана схема, наиболее частая в исследованиях и обзорах.
          </div>
        </div>
      </Reveal>
    </SceneFrame>
  );
};
