import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {SceneFrame} from '../components/SceneFrame';
import {Bullets} from '../components/Bullets';
import {Reveal} from '../components/Reveal';
import {Badge} from '../components/Badge';
import {colors} from '../theme';

const Tube: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // 0–50: whole blood; 50–170: centrifugation separates layers; 190+: PRP highlighted.
  const fill = spring({frame: frame - 6, fps, config: {damping: 200}, durationInFrames: 40});
  const sep = interpolate(frame, [55, 170], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const spinning = frame > 50 && frame < 175;
  const rot = spinning ? (frame - 50) * 28 : 0;
  const highlight = spring({frame: frame - 190, fps, config: {damping: 200}, durationInFrames: 30});
  const wobble = spinning ? Math.sin(frame * 1.7) * 1.5 : 0;

  const tubeX = 250;
  const tubeY = 40;
  const tubeW = 130;
  const tubeH = 480;
  const liquidTop = tubeY + 40;
  const liquidH = (tubeH - 60) * fill;
  const liquidBottom = liquidTop + liquidH;

  // Final proportions: plasma ~55%, buffy coat ~1–2% (exaggerated for visibility), RBC ~45%.
  const plasmaH = liquidH * 0.55 * sep;
  const buffyH = Math.max(0, 14 * sep);
  const plasmaColor = interpolate(sep, [0, 1], [0, 1]);

  return (
    <svg width={660} height={580} viewBox="0 0 660 580">
      <defs>
        <clipPath id="tubeClip">
          <path
            d={`M ${tubeX} ${tubeY} H ${tubeX + tubeW} V ${tubeY + tubeH - 50} A ${tubeW / 2} 50 0 0 1 ${tubeX} ${
              tubeY + tubeH - 50
            } Z`}
          />
        </clipPath>
      </defs>
      <g transform={`translate(${wobble} 0)`}>
        {/* liquid */}
        <g clipPath="url(#tubeClip)">
          <rect x={tubeX} y={liquidTop} width={tubeW} height={liquidH} fill={colors.blood} />
          <rect
            x={tubeX}
            y={liquidTop}
            width={tubeW}
            height={plasmaH}
            fill={colors.plasma}
            opacity={plasmaColor}
          />
          <rect x={tubeX} y={liquidTop + plasmaH} width={tubeW} height={buffyH} fill={colors.buffy} />
          {/* platelets sparkles in plasma bottom (PRP zone) */}
          {Array.from({length: 22}).map((_, i) => {
            const px = tubeX + 10 + ((i * 37) % (tubeW - 20));
            const py = liquidTop + plasmaH - 8 - ((i * 23) % 70);
            return (
              <circle key={i} cx={px} cy={py} r={2.4} fill={colors.teal} opacity={sep * (0.5 + ((i * 7) % 5) / 10)} />
            );
          })}
        </g>
        {/* glass */}
        <path
          d={`M ${tubeX} ${tubeY} H ${tubeX + tubeW} V ${tubeY + tubeH - 50} A ${tubeW / 2} 50 0 0 1 ${tubeX} ${
            tubeY + tubeH - 50
          } Z`}
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={3}
        />
        <rect x={tubeX - 6} y={tubeY - 14} width={tubeW + 12} height={26} rx={6} fill="#5B6B85" />
      </g>

      {/* layer labels */}
      <g opacity={sep}>
        <text x={tubeX + tubeW + 26} y={liquidTop + plasmaH * 0.35} fill={colors.plasma} fontSize={20} fontWeight={700}>
          PPP
        </text>
        <text x={tubeX + tubeW + 26} y={liquidTop + plasmaH * 0.35 + 22} fill={colors.muted} fontSize={16}>
          плазма, бедная тромбоцитами
        </text>
        <text x={tubeX + tubeW + 26} y={liquidTop + plasmaH + 4} fill={colors.buffy} fontSize={20} fontWeight={700}>
          Buffy coat
        </text>
        <text x={tubeX + tubeW + 26} y={liquidTop + plasmaH + 26} fill={colors.muted} fontSize={16}>
          тромбоциты + лейкоциты
        </text>
        <text x={tubeX + tubeW + 26} y={liquidBottom - 90} fill={colors.red} fontSize={20} fontWeight={700}>
          Эритроциты
        </text>
      </g>

      {/* PRP bracket */}
      <g opacity={highlight}>
        <rect
          x={tubeX - 14}
          y={liquidTop + plasmaH - 78}
          width={tubeW + 28}
          height={96}
          rx={12}
          fill="none"
          stroke={colors.teal}
          strokeWidth={3}
          strokeDasharray="10 6"
        />
        <text x={tubeX - 26} y={liquidTop + plasmaH - 40} fill={colors.teal} fontSize={22} fontWeight={800} textAnchor="end">
          PRP
        </text>
        <text x={tubeX - 26} y={liquidTop + plasmaH - 14} fill={colors.teal} fontSize={17} textAnchor="end">
          тромбоциты ×3–5
        </text>
        <text x={tubeX - 26} y={liquidTop + plasmaH + 8} fill={colors.muted} fontSize={15} textAnchor="end">
          нижняя часть плазмы
        </text>
      </g>

      {/* centrifuge icon */}
      <g transform={`translate(560 470) rotate(${rot})`} opacity={spinning ? 1 : 0.35}>
        <circle r={44} fill="none" stroke={colors.muted} strokeWidth={4} />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <line key={a} x1={0} y1={0} x2={44 * Math.cos((a * Math.PI) / 180)} y2={44 * Math.sin((a * Math.PI) / 180)} stroke={colors.muted} strokeWidth={4} />
        ))}
        <circle r={8} fill={colors.muted} />
      </g>
      <text x={560} y={540} fill={colors.muted} fontSize={17} textAnchor="middle">
        {spinning ? 'центрифугирование' : frame >= 175 ? 'готово' : 'цельная кровь'}
      </text>
    </svg>
  );
};

export const PrpPrepScene: React.FC<{index: number; total: number}> = ({index, total}) => {
  return (
    <SceneFrame index={index} total={total} kicker="Часть 5 · PRP" title="PRP: приготовление аутологичного концентрата" accent={colors.teal}>
      <div style={{display: 'flex', gap: 40, height: '100%'}}>
        <Reveal delay={4} from="none" style={{flex: 'none'}}>
          <Tube />
        </Reveal>
        <div style={{flex: 1, paddingTop: 4}}>
          <Bullets
            marker="number"
            start={20}
            step={30}
            fontSize={25}
            gap={20}
            accent={colors.teal}
            items={[
              {
                text: 'Забор венозной крови 10–60 мл в пробирки с антикоагулянтом',
                sub: 'ACD‑A или цитрат натрия; без ЭДТА (повреждает тромбоциты)',
              },
              {
                text: 'Центрифугирование: одно- или двухэтапное',
                sub: 'Мягкий спин ≈ 200–400 g → жёсткий ≈ 700–1500 g; параметры зависят от системы и не стандартизированы',
              },
              {
                text: 'Разделение слоёв: PPP · buffy coat · эритроциты',
                sub: 'Тромбоциты концентрируются на границе плазмы и лейкоцитарного слоя',
              },
              {
                text: 'Отбор PRP: концентрация тромбоцитов ×3–5 от исходной',
                sub: 'Целевая ≈ 1–1,5 млн/мкл; объём 3–8 мл на сессию; сверхвысокие концентрации — возможен ингибирующий эффект',
              },
              {
                text: '± Активация (CaCl₂, тромбин) непосредственно перед инъекцией',
                sub: 'Без активации тромбоциты активирует коллаген дермы in vivo; преимущества одного подхода не доказаны',
              },
            ]}
          />
          <Reveal delay={200}>
            <div style={{marginTop: 22, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap'}}>
              <Badge kind="hypothesis" text="Неопределённость" size={15} />
              <div style={{fontSize: 19, color: colors.muted, lineHeight: 1.35}}>
                L‑PRP (с лейкоцитами) vs P‑PRP, активированная vs нативная, одно- vs двухэтапная — прямых сравнений при АГА мало;
                классификации PAW / DEPA описывают продукт, но не предсказывают результат.
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </SceneFrame>
  );
};
