import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {SceneFrame} from '../components/SceneFrame';
import {Reveal} from '../components/Reveal';
import {Badge} from '../components/Badge';
import {colors} from '../theme';

type Shape = {cx: number; cy: number; rx: number; ry: number};

// Head viewed from above: front (face) is at the top. Coordinates are
// in a local system with the head centred at (0,0), rx=60, ry=76.
const HEAD_RX = 60;
const HEAD_RY = 76;

const norwood: {stage: string; bald: Shape[]; bridge?: Shape}[] = [
  {stage: 'II', bald: [{cx: -40, cy: -64, rx: 16, ry: 12}, {cx: 40, cy: -64, rx: 16, ry: 12}]},
  {
    stage: 'III vertex',
    bald: [{cx: -38, cy: -60, rx: 24, ry: 18}, {cx: 38, cy: -60, rx: 24, ry: 18}, {cx: 0, cy: 30, rx: 15, ry: 15}],
  },
  {stage: 'IV', bald: [{cx: 0, cy: -58, rx: 54, ry: 24}, {cx: 0, cy: 30, rx: 23, ry: 22}]},
  {stage: 'V', bald: [{cx: 0, cy: -52, rx: 56, ry: 30}, {cx: 0, cy: 28, rx: 31, ry: 30}]},
  {stage: 'VI', bald: [{cx: 0, cy: -42, rx: 56, ry: 40}, {cx: 0, cy: 22, rx: 38, ry: 38}, {cx: 0, cy: -8, rx: 34, ry: 26}]},
  {stage: 'VII', bald: [{cx: 0, cy: -14, rx: 52, ry: 62}]},
];

const ludwig = [
  {stage: 'I', opacity: 0.4, rx: 30, ry: 40},
  {stage: 'II', opacity: 0.65, rx: 36, ry: 46},
  {stage: 'III', opacity: 0.9, rx: 40, ry: 50},
];

const Head: React.FC<{children: React.ReactNode; progress: number; label: string; color: string}> = ({
  children,
  progress,
  label,
  color,
}) => {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg width={180} height={230} viewBox="-90 -100 180 230" style={{opacity: progress, transform: `scale(${interpolate(progress, [0, 1], [0.85, 1])})`}}>
      <defs>
        <clipPath id={`clip-${id}`}>
          <ellipse cx={0} cy={0} rx={HEAD_RX} ry={HEAD_RY} />
        </clipPath>
      </defs>
      {/* face direction marker (nose) */}
      <path d="M -8 -78 L 0 -90 L 8 -78 Z" fill={colors.skin} opacity={0.8} />
      {/* ears */}
      <ellipse cx={-64} cy={-6} rx={7} ry={13} fill={colors.skin} opacity={0.8} />
      <ellipse cx={64} cy={-6} rx={7} ry={13} fill={colors.skin} opacity={0.8} />
      {/* scalp base */}
      <ellipse cx={0} cy={0} rx={HEAD_RX} ry={HEAD_RY} fill={colors.skin} />
      {/* hair */}
      <ellipse cx={0} cy={0} rx={HEAD_RX} ry={HEAD_RY} fill={colors.hair} />
      <g clipPath={`url(#clip-${id})`}>{children}</g>
      <ellipse cx={0} cy={0} rx={HEAD_RX} ry={HEAD_RY} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
      <text x={0} y={112} fill={color} fontSize={22} fontWeight={700} textAnchor="middle">
        {label}
      </text>
    </svg>
  );
};

export const ClassificationScene: React.FC<{index: number; total: number}> = ({index, total}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const grow = (delay: number) =>
    spring({frame: frame - delay, fps, config: {damping: 200}, durationInFrames: 30});

  return (
    <SceneFrame index={index} total={total} kicker="Часть 3 · Клиника" title="Классификация и диагностика" accent={colors.blue}>
      <div style={{display: 'flex', gap: 50, height: '100%'}}>
        <div style={{flex: 'none', width: 1180}}>
          <Reveal delay={6}>
            <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
              <div style={{fontSize: 28, fontWeight: 700}}>Norwood–Hamilton</div>
              <div style={{fontSize: 20, color: colors.muted}}>мужской паттерн · вид сверху, лицо вверху</div>
            </div>
          </Reveal>
          <div style={{display: 'flex', gap: 14, marginTop: 6}}>
            {norwood.map((n, i) => {
              const p = grow(16 + i * 12);
              const baldP = grow(30 + i * 12);
              return (
                <Head key={n.stage} progress={p} label={n.stage} color={colors.text}>
                  {n.bald.map((s, j) => (
                    <ellipse
                      key={j}
                      cx={s.cx}
                      cy={s.cy}
                      rx={s.rx * baldP}
                      ry={s.ry * baldP}
                      fill={colors.skin}
                    />
                  ))}
                </Head>
              );
            })}
          </div>

          <Reveal delay={110}>
            <div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 14}}>
              <div style={{fontSize: 28, fontWeight: 700}}>Ludwig</div>
              <div style={{fontSize: 20, color: colors.muted}}>женский паттерн · диффузное поредение теменной зоны при сохранной лобной линии</div>
            </div>
          </Reveal>
          <div style={{display: 'flex', gap: 14, marginTop: 6}}>
            {ludwig.map((l, i) => {
              const p = grow(120 + i * 14);
              const thinP = grow(134 + i * 14);
              return (
                <Head key={l.stage} progress={p} label={`Ludwig ${l.stage}`} color={colors.text}>
                  <ellipse cx={0} cy={-4} rx={l.rx * thinP} ry={l.ry * thinP} fill={colors.skin} opacity={l.opacity} />
                  {/* preserved frontal hairline */}
                  <rect x={-70} y={-90} width={140} height={28} fill={colors.hair} />
                </Head>
              );
            })}
            <Reveal delay={170} style={{flex: 1, display: 'flex', alignItems: 'center'}}>
              <div style={{fontSize: 20, color: colors.muted, lineHeight: 1.4, paddingLeft: 10}}>
                Также: Sinclair (ж), BASP — универсальная, кодирует форму линии роста и плотность.
                <br />
                Стадия влияет на прогноз ответа: ранние стадии (Norwood II–IV, Ludwig I–II) отвечают лучше на любую терапию.
              </div>
            </Reveal>
          </div>
        </div>

        <div style={{flex: 1, paddingTop: 10}}>
          <Reveal delay={190}>
            <div style={{fontSize: 28, fontWeight: 700}}>Трихоскопия</div>
          </Reveal>
          <div style={{display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18}}>
            {[
              'Анизотрихоз > 20% (вариабельность диаметра) — основной критерий',
              'Доля веллусных волос > 10%',
              'Единичные волосы в фолликулярном юните (вместо 2–3)',
              'Жёлтые точки, перипилярные знаки (микровоспаление)',
              'Сравнение с окципитальной зоной — внутренний контроль',
            ].map((t, i) => (
              <Reveal key={t} delay={205 + i * 14} from="left">
                <div style={{display: 'flex', gap: 14, alignItems: 'flex-start'}}>
                  <div style={{width: 10, height: 10, borderRadius: 5, background: colors.blue, marginTop: 11, flex: 'none'}} />
                  <div style={{fontSize: 23, lineHeight: 1.3}}>{t}</div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={280}>
            <div style={{marginTop: 22, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap'}}>
              <Badge kind="expert" text="Дифдиагноз" size={15} />
              <div style={{fontSize: 19, color: colors.muted}}>
                телогеновая алопеция, диффузная гнездная, ЖДА, гипотиреоз, гиперандрогения (у женщин), лекарственная
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </SceneFrame>
  );
};
