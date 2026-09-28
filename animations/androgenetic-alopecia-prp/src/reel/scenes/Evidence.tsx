// Глава 3: что говорят данные. Оценка мета-анализов и три карточки: основа и дополнение.
import React from 'react';
import {PAL, FONT} from '../palette';
import {E, P, env, invLerp, lerp} from '../math';
import {Pt} from '../geom';
import {Chip, Layer, MarkerPath, Txt} from '../Marker';

const xOf = (v: number) => 100 + ((v + 10) / 70) * 880;

const Card: React.FC<{cx: number; k: number; title: string; caption: string; children: React.ReactNode}> = ({cx, k, title, caption, children}) => {
  const sc = lerp(0.9, 1, E.outBackS(k));
  return (
    <g transform={`translate(${cx} 760) scale(${sc}) translate(${-cx} -760)`} opacity={Math.min(1, k * 1.5)}>
      <rect x={cx - 140} y={620} width={280} height={280} rx={32} fill={PAL.surface2} />
      <text x={cx} y={672} textAnchor="middle" fontFamily={FONT.sans} fontWeight={600} fontSize={30} fill={PAL.ink}>
        {title}
      </text>
      <g transform={`translate(${cx} 790)`}>{children}</g>
      <text x={cx} y={950} textAnchor="middle" fontFamily={FONT.sans} fontWeight={400} fontSize={28} fill={PAL.inkMuted}>
        {caption}
      </text>
    </g>
  );
};

const hexD = (r: number) => {
  let d = '';
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k - Math.PI / 6;
    d += `${k ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
  }
  return d + 'Z';
};

export const Evidence: React.FC<{t: number}> = ({t}) => {
  const page = env(t, 44.0, 57.8, 0.35, 0.5);
  if (page <= 0) return null;
  const A = env(t, 44.0, 51.2, 0.01, 0.45);
  const B = env(t, 51.2, 57.8, 0.35, 0.01);
  const titleK = E.outQ(invLerp(44.05, 44.6, t));
  const ci = P(t, 44.6, 45.6, E.inOut);
  const bar = P(t, 44.4, 45.3, E.inOut);
  const ticks = [-10, 0, 10, 20, 30, 40, 50, 60];
  const cards = [0, 1, 2].map((i) => E.outQ(invLerp(51.4 + i * 0.25, 52.0 + i * 0.25, t)));
  const bracket = P(t, 53.6, 54.4, E.inOut);
  const addon = P(t, 55.8, 56.4, E.outQ);
  const bracketPts: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const s = i / 20;
    bracketPts.push([120 + s * 560, 1004 + Math.sin(s * Math.PI) * 14 + 3 * Math.sin(s * 9)]);
  }
  return (
    <div style={{position: 'absolute', inset: 0, opacity: page}}>
      {/* заголовок страницы */}
      <div style={{position: 'absolute', left: 60, top: 548 - 76 * 0.74, opacity: titleK, transform: `translateY(${(1 - titleK) * 40}px)`, whiteSpace: 'nowrap', display: 'flex', alignItems: 'baseline'}}>
        <span style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 76, color: PAL.ink, lineHeight: 1, letterSpacing: '-0.02em'}}>Что говорят&nbsp;</span>
        <span style={{fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 500, fontSize: 84, color: PAL.ink, lineHeight: 1}}>данные</span>
      </div>

      {/* блок A: оценка мета-анализов */}
      <div style={{position: 'absolute', inset: 0, opacity: A}}>
        <Chip x={60} y={650} text="МЕТА-АНАЛИЗЫ 2017–2022" alpha={A * P(t, 44.1, 44.5)} colors={[PAL.scrubSoft, PAL.scrub]} />
        <Layer>
          <line x1={xOf(-10)} y1={860} x2={xOf(60)} y2={860} stroke={PAL.ink} strokeWidth={2} opacity={0.55} />
          {ticks.map((v) => (
            <g key={v}>
              <line x1={xOf(v)} y1={854} x2={xOf(v)} y2={866} stroke={PAL.ink} strokeWidth={2} opacity={0.55} />
              <text x={xOf(v)} y={898} textAnchor="middle" fontFamily={FONT.mono} fontSize={20} fill={PAL.inkMuted} letterSpacing={1}>
                {v > 0 ? `+${v}` : v}
              </text>
            </g>
          ))}
          <line x1={xOf(0)} y1={740} x2={xOf(0)} y2={850} stroke={PAL.iodine} strokeWidth={2} strokeDasharray="6 6" opacity={0.8} />
          {/* 95% ДИ: тонкая линия с засечками */}
          <g opacity={ci > 0 ? 1 : 0}>
            <line x1={lerp(xOf(22), xOf(2), ci)} y1={780} x2={lerp(xOf(22), xOf(59), ci)} y2={780} stroke={PAL.ink} strokeWidth={2.4} />
            <line x1={lerp(xOf(22), xOf(2), ci)} y1={770} x2={lerp(xOf(22), xOf(2), ci)} y2={790} stroke={PAL.ink} strokeWidth={2.4} />
            <line x1={lerp(xOf(22), xOf(59), ci)} y1={770} x2={lerp(xOf(22), xOf(59), ci)} y2={790} stroke={PAL.ink} strokeWidth={2.4} />
          </g>
          <MarkerPath pts={[[xOf(15), 780], [xOf(19), 778], [xOf(23), 781], [xOf(27), 779], [xOf(30), 780]]} width={16} progress={bar} />
        </Layer>
        <Txt x={xOf(22.5)} y={738} size={34} weight={500} align="center" alpha={P(t, 44.9, 45.4)}>
          +15…+30 волос/см²
        </Txt>
        <Txt x={xOf(59) + 14} y={788} size={20} family="mono" color={PAL.inkMuted} spacing={1} alpha={P(t, 45.4, 45.8)}>
          95% ДИ
        </Txt>
        <Txt x={xOf(0)} y={728} size={20} family="mono" color={PAL.iodine} spacing={1} align="center" alpha={P(t, 44.6, 45.0)}>
          НЕТ ЭФФЕКТА
        </Txt>
        {[
          ['N ≈ 20–40 В ГРУППЕ', 46.9],
          ['I² ВЫСОКИЙ', 47.3],
          ['РАЗНЫЕ ПРОТОКОЛЫ', 49.0],
          ['3–6 МЕС НАБЛЮДЕНИЯ', 49.5],
        ].map(([text, t0], i) => (
          <Chip key={String(text)} x={60} y={960 + i * 62} text={String(text)} alpha={E.out(P(t, Number(t0), Number(t0) + 0.4))} />
        ))}
      </div>

      {/* блок B: карточки */}
      <div style={{position: 'absolute', inset: 0, opacity: B}}>
        <Layer>
          <Card cx={200} k={cards[0]} title="Финастерид" caption="блокирует DHT">
            <path d={hexD(44)} fill={PAL.marker} opacity={0.9} />
            <circle r={66} fill="none" stroke={PAL.ink} strokeWidth={7} />
            <line x1={-47} y1={47} x2={47} y2={-47} stroke={PAL.ink} strokeWidth={7} strokeLinecap="round" />
          </Card>
          <Card cx={540} k={cards[1]} title="Миноксидил" caption="продлевает анаген">
            <path d="M-10 70 C-6 20, -2 -20, -22 -70" stroke={PAL.hair} strokeWidth={12} fill="none" strokeLinecap="round" />
            <path d="M30 40 V-50 M8 -28 L30 -52 L52 -28" stroke={PAL.scrub} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Card>
          <Card cx={880} k={cards[2]} title="PRP" caption="факторы роста">
            <ellipse rx={54} ry={34} fill={PAL.platelet} stroke={PAL.plateletDark} strokeWidth={2.5} />
            {[[-20, -8], [4, 6], [22, -10], [-4, -14]].map(([x, y], k) => (
              <circle key={k} cx={x} cy={y} r={5} fill={PAL.plateletDark} />
            ))}
            {[[76, -30], [84, 4], [70, 34]].map(([x, y], k) => (
              <circle key={k} cx={x} cy={y} r={8} fill={PAL.scrub} opacity={0.9} />
            ))}
          </Card>
          <MarkerPath pts={bracketPts} progress={bracket} width={7} />
        </Layer>
        <Txt x={400} y={1096} size={60} weight={500} family="serif" italic align="center" alpha={E.out(P(t, 53.9, 54.4))} dy={(1 - E.out(P(t, 53.9, 54.4))) * 10}>
          основа
        </Txt>
        <Txt x={850} y={1096} size={60} weight={500} family="serif" italic color={PAL.marker} align="center" alpha={addon} dy={(1 - addon) * 10}>
          дополнение
        </Txt>
      </div>
    </div>
  );
};
