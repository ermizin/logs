import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {SceneFrame} from '../components/SceneFrame';
import {Bullets} from '../components/Bullets';
import {Reveal} from '../components/Reveal';
import {colors} from '../theme';

const factors = [
  {name: 'PDGF', color: colors.teal},
  {name: 'TGF-β', color: colors.blue},
  {name: 'VEGF', color: colors.red},
  {name: 'IGF-1', color: colors.amber},
  {name: 'FGF-2', color: colors.violet},
  {name: 'EGF', color: colors.green},
  {name: 'HGF', color: colors.teal},
];

const Diagram: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const W = 1000;
  const H = 640;
  const plate = {x: 190, y: 330};
  const target = {x: 740, y: 470}; // dermal papilla
  const skinY = 150;

  const pulse = 1 + 0.04 * Math.sin(frame / 6);
  const glow = spring({frame: frame - 120, fps, config: {damping: 200}, durationInFrames: 60});
  const vessels = spring({frame: frame - 150, fps, config: {damping: 200}, durationInFrames: 70});
  const shaftGrow = spring({frame: frame - 190, fps, config: {damping: 200}, durationInFrames: 80});

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* skin */}
      <rect x={520} y={skinY} width={460} height={H - skinY - 20} rx={20} fill={colors.skin} opacity={0.08} />
      <line x1={520} y1={skinY} x2={980} y2={skinY} stroke={colors.skin} strokeOpacity={0.55} strokeWidth={2} />

      {/* follicle */}
      <path
        d={`M 700 ${skinY} C 690 300, 690 420, 740 500 C 790 420, 790 300, 780 ${skinY} Z`}
        fill={colors.skinDark}
        opacity={0.35}
      />
      {/* dermal papilla with glow */}
      <circle cx={target.x} cy={target.y} r={40 * glow + 22} fill={colors.teal} opacity={0.18 * glow} />
      <ellipse cx={target.x} cy={target.y} rx={22} ry={18} fill={colors.amber} />
      <text x={target.x} y={target.y + 60} fill={colors.amber} fontSize={18} textAnchor="middle" fontWeight={700}>
        дермальный сосочек
      </text>
      {/* hair shaft, thickening */}
      <path
        d={`M 740 480 C 738 380, 736 260, 734 ${skinY} C 732 ${skinY - 60 - 120 * shaftGrow}, 720 ${
          skinY - 90 - 150 * shaftGrow
        }, ${700 - 30 * shaftGrow} ${skinY - 100 - 170 * shaftGrow}`}
        stroke={colors.hair}
        strokeWidth={6 + 8 * shaftGrow}
        fill="none"
        strokeLinecap="round"
      />
      <text x={760} y={skinY - 60} fill={colors.teal} fontSize={18} opacity={shaftGrow} fontWeight={600}>
        ↑ диаметр, анаген ↑
      </text>

      {/* angiogenesis: capillaries growing towards papilla */}
      {[0, 1, 2, 3].map((i) => {
        const a = -20 + i * 40;
        const rad = ((a + 90) * Math.PI) / 180;
        const len = 110 * vessels;
        const ex = target.x + Math.cos(rad) * len;
        const ey = target.y + 20 + Math.sin(rad) * len * 0.6;
        return (
          <path
            key={i}
            d={`M ${ex} ${ey} Q ${(ex + target.x) / 2 + (i % 2 ? 20 : -20)} ${(ey + target.y) / 2 + 30} ${target.x} ${target.y + 20}`}
            stroke={colors.red}
            strokeWidth={3}
            fill="none"
            opacity={vessels * 0.9}
            strokeLinecap="round"
          />
        );
      })}
      <text x={target.x} y={H - 40} fill={colors.red} fontSize={18} textAnchor="middle" opacity={vessels} fontWeight={600}>
        ангиогенез (VEGF, PDGF)
      </text>

      {/* platelet */}
      <g transform={`translate(${plate.x} ${plate.y}) scale(${pulse})`}>
        <ellipse rx={120} ry={70} fill="#F6E7D8" />
        <ellipse rx={120} ry={70} fill="none" stroke={colors.teal} strokeWidth={3} />
        {[
          [-60, -20],
          [-25, 25],
          [10, -28],
          [45, 15],
          [-5, 5],
          [70, -15],
          [-70, 20],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={9} fill={colors.violet} opacity={0.85} />
        ))}
      </g>
      <text x={plate.x} y={plate.y + 110} fill={colors.text} fontSize={22} textAnchor="middle" fontWeight={700}>
        Тромбоцит
      </text>
      <text x={plate.x} y={plate.y + 136} fill={colors.muted} fontSize={17} textAnchor="middle">
        α‑гранулы → факторы роста при активации
      </text>

      {/* growth factor chips travelling to the papilla */}
      {factors.map((f, i) => {
        const start = 30 + i * 12;
        const t = interpolate(frame, [start, start + 70], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const eased = 1 - Math.pow(1 - t, 2);
        const spread = (i - 3) * 48;
        const sx = plate.x + 100;
        const sy = plate.y + spread * 0.6;
        const ex = target.x - 40;
        const ey = target.y - 10 + spread * 0.25;
        const cx = (sx + ex) / 2;
        const cy = (sy + ey) / 2 - 60 + spread;
        // quadratic bezier point
        const x = (1 - eased) * (1 - eased) * sx + 2 * (1 - eased) * eased * cx + eased * eased * ex;
        const y = (1 - eased) * (1 - eased) * sy + 2 * (1 - eased) * eased * cy + eased * eased * ey;
        const opacity = frame < start ? 0 : interpolate(t, [0, 0.1, 0.85, 1], [0, 1, 1, 0]);
        return (
          <g key={f.name} transform={`translate(${x} ${y})`} opacity={opacity}>
            <rect x={-38} y={-16} width={76} height={32} rx={16} fill={f.color} />
            <text x={0} y={6} fill={colors.bg} fontSize={16} fontWeight={800} textAnchor="middle">
              {f.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export const PrpMechanismScene: React.FC<{index: number; total: number}> = ({index, total}) => {
  return (
    <SceneFrame index={index} total={total} kicker="Часть 5 · PRP" title="Предполагаемый механизм действия" accent={colors.teal}>
      <div style={{display: 'flex', gap: 30, height: '100%'}}>
        <Reveal delay={4} from="none" style={{flex: 'none'}}>
          <Diagram />
        </Reveal>
        <div style={{flex: 1, paddingTop: 6}}>
          <Bullets
            start={30}
            step={30}
            fontSize={22}
            gap={12}
            accent={colors.teal}
            items={[
              {
                text: 'Факторы роста α‑гранул: PDGF, TGF‑β, VEGF, IGF‑1, FGF‑2, EGF, HGF',
                badge: 'fact',
              },
              {
                text: '↑ пролиферация и выживание клеток дермального сосочка',
                sub: 'Akt/ERK, ↑ Bcl‑2, ↓ апоптоза; ↑ FGF‑7 (KGF)',
                badge: 'preclinical',
              },
              {
                text: 'Активация Wnt/β‑catenin → переход телоген → анаген',
                sub: 'Антагонизм с DKK‑1‑опосредованным подавлением при DHT',
                badge: 'preclinical',
              },
              {
                text: 'Ангиогенез и перифолликулярная перфузия',
                sub: '↑ сосудов в биоптатах после курса PRP (малые серии)',
                badge: 'clinical',
              },
              {
                text: '↑ Ki‑67 в эпидермисе и фолликулах после PRP (Gentile 2015)',
                badge: 'clinical',
              },
              {
                text: 'Итог: удлинение анагена, ↑ диаметра и плотности',
                sub: 'На DHT и AR не влияет → причину не устраняет, модулирует микроокружение',
                badge: 'clinical',
              },
            ]}
          />
        </div>
      </div>
    </SceneFrame>
  );
};
