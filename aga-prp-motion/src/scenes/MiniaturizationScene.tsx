import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {SceneFrame} from '../components/SceneFrame';
import {Bullets} from '../components/Bullets';
import {Reveal} from '../components/Reveal';
import {colors} from '../theme';

type FollicleProps = {
  x: number;
  skinY: number;
  stage: number; // 0 = terminal, 1 = vellus
  progress: number; // grow-in animation
  label: string;
  anagen: string;
  kind: string;
};

const Follicle: React.FC<FollicleProps> = ({x, skinY, stage, progress, label, anagen, kind}) => {
  const shaftH = interpolate(stage, [0, 1], [260, 45]) * progress;
  const shaftW = interpolate(stage, [0, 1], [16, 4]);
  const depth = interpolate(stage, [0, 1], [175, 55]) * progress;
  const bulbR = interpolate(stage, [0, 1], [24, 8]) * progress;
  const shaftColor = stage < 0.5 ? colors.hair : colors.hairLight;
  const shaftOpacity = interpolate(stage, [0, 1], [1, 0.6]);
  const bend = interpolate(stage, [0, 1], [26, 6]);
  const sheathW = interpolate(stage, [0, 1], [46, 16]);

  return (
    <g opacity={progress}>
      {/* follicle sheath below skin */}
      <path
        d={`M ${x - sheathW / 2} ${skinY} C ${x - sheathW / 2 - 4} ${skinY + depth * 0.6}, ${x - sheathW / 2} ${
          skinY + depth * 0.9
        }, ${x} ${skinY + depth} C ${x + sheathW / 2} ${skinY + depth * 0.9}, ${x + sheathW / 2 + 4} ${
          skinY + depth * 0.6
        }, ${x + sheathW / 2} ${skinY} Z`}
        fill={colors.skinDark}
        opacity={0.35}
      />
      {/* dermal papilla */}
      <ellipse cx={x} cy={skinY + depth - bulbR * 0.6} rx={bulbR * 0.55} ry={bulbR * 0.45} fill={colors.amber} />
      {/* shaft below skin */}
      <line x1={x} y1={skinY + depth - bulbR} x2={x} y2={skinY} stroke={shaftColor} strokeWidth={shaftW} opacity={shaftOpacity} />
      {/* shaft above skin */}
      <path
        d={`M ${x} ${skinY} C ${x} ${skinY - shaftH * 0.5}, ${x - bend * 0.3} ${skinY - shaftH * 0.75}, ${
          x - bend
        } ${skinY - shaftH}`}
        stroke={shaftColor}
        strokeWidth={shaftW}
        fill="none"
        strokeLinecap="round"
        opacity={shaftOpacity}
      />
      {/* labels */}
      <text x={x} y={skinY + 235} fill={colors.text} fontSize={22} fontWeight={700} textAnchor="middle">
        {label}
      </text>
      <text x={x} y={skinY + 262} fill={colors.muted} fontSize={18} textAnchor="middle">
        анаген {anagen}
      </text>
      <text x={x} y={skinY + 287} fill={stage < 0.5 ? colors.teal : colors.red} fontSize={18} textAnchor="middle" fontWeight={600}>
        {kind}
      </text>
    </g>
  );
};

const follicles = [
  {label: 'Цикл 1', anagen: '≈ 5 лет', kind: 'терминальный', stage: 0},
  {label: 'Цикл 2', anagen: '≈ 3 года', kind: 'терминальный', stage: 0.22},
  {label: 'Цикл 3', anagen: '≈ 1,5 года', kind: 'промежуточный', stage: 0.48},
  {label: 'Цикл 4', anagen: '≈ 8 мес', kind: 'промежуточный', stage: 0.74},
  {label: 'Цикл 5', anagen: '≈ 3 мес', kind: 'веллусоподобный', stage: 1},
];

const Diagram: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const W = 1080;
  const H = 640;
  const skinY = 300;
  const arrowP = spring({frame: frame - 150, fps, config: {damping: 200}, durationInFrames: 40});

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* dermis band */}
      <rect x={0} y={skinY} width={W} height={200} fill={colors.skin} opacity={0.08} />
      <line x1={0} y1={skinY} x2={W} y2={skinY} stroke={colors.skin} strokeOpacity={0.55} strokeWidth={2} />
      <text x={W - 12} y={skinY - 12} fill={colors.muted} fontSize={17} textAnchor="end">
        эпидермис
      </text>
      <text x={W - 12} y={skinY + 190} fill={colors.muted} fontSize={17} textAnchor="end">
        дерма / гиподерма
      </text>
      {follicles.map((f, i) => {
        const p = spring({frame: frame - (14 + i * 26), fps, config: {damping: 200}, durationInFrames: 36});
        return (
          <Follicle
            key={f.label}
            x={110 + i * 215}
            skinY={skinY}
            stage={f.stage}
            progress={p}
            label={f.label}
            anagen={f.anagen}
            kind={f.kind}
          />
        );
      })}
      {/* progression arrow */}
      <g opacity={arrowP}>
        <line
          x1={80}
          y1={40}
          x2={80 + 900 * arrowP}
          y2={40}
          stroke={colors.red}
          strokeWidth={3}
          strokeDasharray="10 8"
        />
        <polygon points={`${80 + 900 * arrowP},32 ${80 + 900 * arrowP + 16},40 ${80 + 900 * arrowP},48`} fill={colors.red} />
        <text x={80} y={24} fill={colors.red} fontSize={20} fontWeight={700}>
          Каждый цикл под действием DHT: анаген короче, стержень тоньше, фолликул выше в дерме
        </text>
      </g>
    </svg>
  );
};

export const MiniaturizationScene: React.FC<{index: number; total: number}> = ({index, total}) => {
  return (
    <SceneFrame index={index} total={total} kicker="Часть 2 · Патогенез" title="Миниатюризация фолликула" accent={colors.red}>
      <div style={{display: 'flex', gap: 40, height: '100%'}}>
        <Reveal delay={4} from="none" style={{flex: 'none'}}>
          <Diagram />
        </Reveal>
        <div style={{flex: 1, paddingTop: 10}}>
          <Bullets
            start={40}
            step={26}
            fontSize={25}
            gap={24}
            accent={colors.red}
            items={[
              {text: 'Диаметр стержня: терминальный > 60 мкм → веллусоподобный < 30 мкм', badge: 'fact'},
              {text: 'Соотношение анаген : телоген ≈ 12:1 → ≈ 5:1', badge: 'fact'},
              {text: 'Глубина залегания ↓: гиподерма → сосочковая дерма; объём дермального сосочка ↓', badge: 'fact'},
              {
                text: 'Стволовые клетки bulge сохранены, ↓ CD200⁺/CD34⁺ прогениторов (Garza 2011)',
                sub: 'Фолликул не гибнет до поздних стадий → теоретическое окно для реактивации, в т.ч. факторами роста',
                badge: 'hypothesis',
                badgeText: 'Факт + гипотеза',
              },
            ]}
          />
        </div>
      </div>
    </SceneFrame>
  );
};
