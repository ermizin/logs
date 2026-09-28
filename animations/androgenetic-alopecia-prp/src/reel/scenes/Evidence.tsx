// Глава 3 (для пациента): чего ждать. Шкала ожиданий, честные оговорки и три карточки:
// основа лечения и дополнение.
import React from 'react';
import {PAL, FONT} from '../palette';
import {E, P, env, invLerp, lerp} from '../math';
import {Pt} from '../geom';
import {Chip, Layer, MarkerPath, Txt} from '../Marker';

const X0 = 100;
const X1 = 980;
const xOf = (k: number) => X0 + (X1 - X0) * k; // k — доля шкалы 0..1

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
  const A = env(t, 44.0, 52.7, 0.01, 0.45);
  const B = env(t, 52.6, 57.8, 0.35, 0.01);
  const titleK = E.outQ(invLerp(44.05, 44.6, t));
  const bar = P(t, 44.4, 45.3, E.inOut);
  const spread = P(t, 46.5, 47.4, E.inOut);
  const cross = P(t, 45.6, 46.2, E.inOut);
  const cards = [0, 1, 2].map((i) => E.outQ(invLerp(52.8 + i * 0.25, 53.4 + i * 0.25, t)));
  const bracket = P(t, 55.1, 55.9, E.inOut);
  const baseK = E.out(P(t, 55.4, 55.9));
  const addon = P(t, 56.3, 56.9, E.outQ);
  const bracketPts: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const s = i / 20;
    bracketPts.push([120 + s * 560, 1004 + Math.sin(s * Math.PI) * 14 + 3 * Math.sin(s * 9)]);
  }
  // марка «как в 18» зачёркнута маркером
  const crossPts: Pt[] = [
    [X1 - 168, 904],
    [X1 - 80, 893],
    [X1 + 8, 880],
  ];
  return (
    <div style={{position: 'absolute', inset: 0, opacity: page}}>
      {/* заголовок страницы */}
      <div style={{position: 'absolute', left: 60, top: 548 - 76 * 0.74, opacity: titleK, transform: `translateY(${(1 - titleK) * 40}px)`, whiteSpace: 'nowrap', display: 'flex', alignItems: 'baseline'}}>
        <span style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 76, color: PAL.ink, lineHeight: 1, letterSpacing: '-0.02em'}}>Чего&nbsp;</span>
        <span style={{fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 500, fontSize: 84, color: PAL.ink, lineHeight: 1}}>ждать</span>
      </div>

      {/* блок A: шкала ожиданий */}
      <div style={{position: 'absolute', inset: 0, opacity: A}}>
        <Chip x={60} y={650} text="ЕСЛИ ДЕЛАТЬ КУРС" alpha={A * P(t, 44.1, 44.5)} colors={[PAL.scrubSoft, PAL.scrub]} />
        <Layer>
          <line x1={X0} y1={840} x2={X1} y2={840} stroke={PAL.ink} strokeWidth={2} opacity={0.55} />
          {[0, 0.5, 1].map((k) => (
            <line key={k} x1={xOf(k)} y1={832} x2={xOf(k)} y2={848} stroke={PAL.ink} strokeWidth={2} opacity={0.55} />
          ))}
          {/* разброс: у кого-то меньше, у кого-то больше */}
          <g opacity={spread > 0 ? 1 : 0}>
            <line x1={lerp(xOf(0.35), xOf(0.12), spread)} y1={780} x2={lerp(xOf(0.35), xOf(0.62), spread)} y2={780} stroke={PAL.ink} strokeWidth={2.4} />
            <line x1={lerp(xOf(0.35), xOf(0.12), spread)} y1={770} x2={lerp(xOf(0.35), xOf(0.12), spread)} y2={790} stroke={PAL.ink} strokeWidth={2.4} />
            <line x1={lerp(xOf(0.35), xOf(0.62), spread)} y1={770} x2={lerp(xOf(0.35), xOf(0.62), spread)} y2={790} stroke={PAL.ink} strokeWidth={2.4} />
          </g>
          <MarkerPath pts={[[xOf(0.25), 780], [xOf(0.3), 778], [xOf(0.35), 781], [xOf(0.4), 779], [xOf(0.45), 780]]} width={16} progress={bar} />
          <MarkerPath pts={crossPts} width={7} progress={cross} />
        </Layer>
        <Txt x={xOf(0.35)} y={738} size={34} weight={500} align="center" alpha={P(t, 44.9, 45.4)}>
          +15–30 волос на см²
        </Txt>
        <Txt x={X0} y={898} size={20} family="mono" color={PAL.inkMuted} spacing={1} alpha={P(t, 44.4, 44.8)}>
          БЕЗ ИЗМЕНЕНИЙ
        </Txt>
        <Txt x={xOf(0.5)} y={898} size={20} family="mono" color={PAL.scrub} spacing={1} align="center" alpha={P(t, 44.6, 45.0)}>
          ЗАМЕТНО ГУЩЕ
        </Txt>
        <Txt x={X1} y={898} size={20} family="mono" color={PAL.inkMuted} spacing={1} align="right" alpha={P(t, 44.8, 45.2)}>
          КАК В 18
        </Txt>
        <Txt x={xOf(0.62) + 14} y={788} size={20} family="mono" color={PAL.inkMuted} spacing={1} alpha={P(t, 47.2, 47.6)}>
          РАЗБРОС
        </Txt>
        {[
          ['ПОМОГАЕТ НЕ ВСЕМ', 47.3],
          ['ЛУЧШЕ НА РАННИХ СТАДИЯХ', 48.8],
          ['ЭФФЕКТ ЧЕРЕЗ 3–6 МЕС', 50.8],
          ['НУЖНА ПОДДЕРЖКА', 51.4],
        ].map(([text, t0], i) => (
          <Chip key={String(text)} x={60} y={960 + i * 62} text={String(text)} alpha={E.out(P(t, Number(t0), Number(t0) + 0.4))} />
        ))}
      </div>

      {/* блок B: карточки */}
      <div style={{position: 'absolute', inset: 0, opacity: B}}>
        <Layer>
          <Card cx={200} k={cards[0]} title="Таблетки" caption="блокируют DHT">
            <path d={hexD(44)} fill={PAL.marker} opacity={0.9} />
            <circle r={66} fill="none" stroke={PAL.ink} strokeWidth={7} />
            <line x1={-47} y1={47} x2={47} y2={-47} stroke={PAL.ink} strokeWidth={7} strokeLinecap="round" />
          </Card>
          <Card cx={540} k={cards[1]} title="Миноксидил" caption="усиливает рост">
            <path d="M-10 70 C-6 20, -2 -20, -22 -70" stroke={PAL.hair} strokeWidth={12} fill="none" strokeLinecap="round" />
            <path d="M30 40 V-50 M8 -28 L30 -52 L52 -28" stroke={PAL.scrub} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Card>
          <Card cx={880} k={cards[2]} title="PRP" caption="помогает корню">
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
        <Txt x={400} y={1096} size={60} weight={500} family="serif" italic align="center" alpha={baseK} dy={(1 - baseK) * 10}>
          основа
        </Txt>
        <Txt x={850} y={1096} size={60} weight={500} family="serif" italic color={PAL.marker} align="center" alpha={addon} dy={(1 - addon) * 10}>
          дополнение
        </Txt>
      </div>
    </div>
  );
};
