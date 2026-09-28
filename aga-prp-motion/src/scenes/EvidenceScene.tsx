import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {SceneFrame} from '../components/SceneFrame';
import {Bullets} from '../components/Bullets';
import {Reveal} from '../components/Reveal';
import {Badge} from '../components/Badge';
import {colors} from '../theme';

type Row = {label: string; sub: string; md: number; lo: number; hi: number; color: string};

// Values are rounded from published pooled estimates; confidence intervals are wide.
const rows: Row[] = [
  {label: 'Giordano 2017', sub: '6 исследований, n ≈ 177', md: 18, lo: 6, hi: 30, color: colors.teal},
  {label: 'Gupta 2019', sub: 'РКИ, плотность волос', md: 30, lo: 2, hi: 59, color: colors.teal},
];

const ForestPlot: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const W = 940;
  const H = 480;
  const left = 300;
  const right = W - 40;
  const min = -10;
  const max = 60;
  const xOf = (v: number) => left + ((right - left) * (v - min)) / (max - min);
  const axis = spring({frame: frame - 8, fps, config: {damping: 200}, durationInFrames: 40});
  const band = spring({frame: frame - 130, fps, config: {damping: 200}, durationInFrames: 40});

  const rowY = (i: number) => 110 + i * 100;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <text x={left} y={40} fill={colors.text} fontSize={22} fontWeight={700}>
        Δ плотности волос vs контроль, волос/см²
      </text>
      <text x={left} y={66} fill={colors.muted} fontSize={17}>
        средняя разница (MD) и 95% ДИ · значения округлены
      </text>

      {/* pooled range band */}
      <g opacity={band}>
        <rect x={xOf(15)} y={90} width={xOf(30) - xOf(15)} height={H - 170} fill={colors.teal} opacity={0.1} />
        <text x={xOf(22.5)} y={rowY(2) + 8} fill={colors.teal} fontSize={18} textAnchor="middle" fontWeight={700}>
          диапазон пуловых оценок
        </text>
        <text x={xOf(22.5)} y={rowY(2) + 32} fill={colors.teal} fontSize={18} textAnchor="middle" fontWeight={700}>
          мета-анализов 2017–2022: ≈ +15…+30
        </text>
        <text x={40} y={rowY(2) + 8} fill={colors.text} fontSize={21} fontWeight={700}>
          Mao 2019 · Evans 2020
        </text>
        <text x={40} y={rowY(2) + 32} fill={colors.muted} fontSize={16}>
          Dervishi 2020 и др.
        </text>
      </g>

      {/* axis */}
      <g opacity={axis}>
        <line x1={left} y1={H - 80} x2={right} y2={H - 80} stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
        {[-10, 0, 10, 20, 30, 40, 50, 60].map((v) => (
          <g key={v}>
            <line x1={xOf(v)} y1={H - 86} x2={xOf(v)} y2={H - 74} stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
            <text x={xOf(v)} y={H - 50} fill={colors.dim} fontSize={16} textAnchor="middle">
              {v > 0 ? `+${v}` : v}
            </text>
          </g>
        ))}
        <line x1={xOf(0)} y1={84} x2={xOf(0)} y2={H - 80} stroke={colors.red} strokeWidth={2} strokeDasharray="6 6" opacity={0.8} />
        <text x={xOf(0)} y={H - 22} fill={colors.red} fontSize={16} textAnchor="middle">
          нет эффекта
        </text>
      </g>

      {rows.map((r, i) => {
        const p = spring({frame: frame - (40 + i * 30), fps, config: {damping: 200}, durationInFrames: 40});
        const y = rowY(i);
        const lo = interpolate(p, [0, 1], [r.md, r.lo]);
        const hi = interpolate(p, [0, 1], [r.md, r.hi]);
        return (
          <g key={r.label} opacity={Math.min(1, p * 2)}>
            <text x={40} y={y + 6} fill={colors.text} fontSize={22} fontWeight={700}>
              {r.label}
            </text>
            <text x={40} y={y + 30} fill={colors.muted} fontSize={16}>
              {r.sub}
            </text>
            <line x1={xOf(lo)} y1={y} x2={xOf(hi)} y2={y} stroke={r.color} strokeWidth={4} strokeLinecap="round" />
            <line x1={xOf(lo)} y1={y - 10} x2={xOf(lo)} y2={y + 10} stroke={r.color} strokeWidth={3} />
            <line x1={xOf(hi)} y1={y - 10} x2={xOf(hi)} y2={y + 10} stroke={r.color} strokeWidth={3} />
            <rect x={xOf(r.md) - 11} y={y - 11} width={22} height={22} fill={r.color} transform={`rotate(45 ${xOf(r.md)} ${y})`} />
            <text x={40} y={y + 54} fill={r.color} fontSize={18} fontWeight={700} opacity={p}>
              MD ≈ +{r.md} [{r.lo}; {r.hi}]
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export const EvidenceScene: React.FC<{index: number; total: number}> = ({index, total}) => {
  return (
    <SceneFrame index={index} total={total} kicker="Часть 7 · Доказательства" title="Что показывают мета-анализы" accent={colors.violet}>
      <div style={{display: 'flex', gap: 40, height: '100%'}}>
        <Reveal delay={4} from="none" style={{flex: 'none'}}>
          <ForestPlot />
        </Reveal>
        <div style={{flex: 1, paddingTop: 4}}>
          <Reveal delay={30}>
            <div style={{fontSize: 27, fontWeight: 800, marginBottom: 14}}>Ограничения базы</div>
          </Reveal>
          <Bullets
            start={45}
            step={24}
            fontSize={22}
            gap={14}
            accent={colors.violet}
            items={[
              {text: 'Малые выборки (обычно n = 20–40), наблюдение 3–6 мес, редко 12'},
              {text: 'Гетерогенность протоколов: набор, центрифуга, активация, число сеансов; I² высокий'},
              {text: 'Разные конечные точки: плотность, диаметр, фототрихограмма, самооценка'},
              {text: 'Часть работ без ослепления/плацебо; split‑scalp дизайн с возможным системным эффектом'},
              {text: 'Мало прямых сравнений с финастеридом/миноксидилом; комбинация > монотерапии в малых РКИ'},
            ]}
          />
          <Reveal delay={200}>
            <div
              style={{
                marginTop: 24,
                padding: '16px 22px',
                borderRadius: 16,
                background: `${colors.violet}14`,
                border: `1.5px solid ${colors.violet}`,
              }}
            >
              <div style={{display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center'}}>
                <Badge kind="B" text="GRADE: низкая–умеренная" size={15} />
                <Badge kind="expert" size={15} />
              </div>
              <div style={{fontSize: 20, marginTop: 12, lineHeight: 1.35}}>
                Эффект статистически значимый, но умеренный по величине и неустойчивый между исследованиями.
                Европейское S3‑руководство (Kanti 2018): данных для рекомендации недостаточно; позиция экспертов —
                адъювант к базовой терапии при ранних стадиях.
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </SceneFrame>
  );
};
