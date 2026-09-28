// Интерфейсный слой кадра: рубрика, часы, главы, субтитры, хук, финал.
import React from 'react';
import {PAL, FONT, W} from './palette';
import {E, P, clamp, env, invLerp, lerp} from './math';
import {wavyLine} from './geom';
import {ClipLine, Layer, MarkerPath, Txt} from './Marker';
import {CARDS, CHAPTERS, CLOCK} from './script';

/* ---------- рубрика ---------- */
export const Tag: React.FC<{alpha: number}> = ({alpha}) => (
  <Txt x={60} y={276} size={26} weight={500} family="mono" spacing={2.1} alpha={alpha}>
    РАЗБОР
  </Txt>
);

/* ---------- часы: значение прокручивается, значок — циферблат или шкала ---------- */
export const Clock: React.FC<{t: number; alpha: number}> = ({t, alpha}) => {
  if (alpha <= 0) return null;
  let i = 0;
  while (i + 1 < CLOCK.length && t >= CLOCK[i + 1][0]) i++;
  const k = E.outQ(invLerp(CLOCK[i][0], CLOCK[i][0] + 0.4, t));
  const cur = CLOCK[i][1];
  const prev = i > 0 ? CLOCK[i - 1][1] : cur;
  const grade = cur.startsWith('GRADE');
  const hot = grade;
  const xr = 1020;
  const y = 276;
  const spin = (i + k) * Math.PI * 2 * 0.75;
  const iconW = 34;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: alpha, pointerEvents: 'none'}}>
      {/* значение: клип 46px, старое уезжает вверх, новое въезжает снизу */}
      <div style={{position: 'absolute', left: 560, top: y - 34, width: xr - 560, height: 46, overflow: 'hidden'}}>
        {k < 1 && i > 0 ? (
          <Txt x={W} y={34 - k * 30} size={26} weight={500} family="mono" spacing={2.1} align="right" alpha={1 - k}>
            {prev}
          </Txt>
        ) : null}
        <Txt
          x={W}
          y={34 + (i > 0 ? (1 - k) * 30 : 0)}
          size={26}
          weight={500}
          family="mono"
          spacing={2.1}
          align="right"
          alpha={i > 0 ? k : 1}
          color={hot ? PAL.iodine : PAL.ink}
        >
          {cur}
        </Txt>
      </div>
      {/* значок слева от значения: ширина значения ≈ 16px на символ моно-шрифта + трекинг */}
      {(() => {
        const wCur = cur.length * (26 * 0.6) + (cur.length - 1) * 2.1;
        const wPrev = prev.length * (26 * 0.6) + (prev.length - 1) * 2.1;
        const ix = xr - lerp(i > 0 ? wPrev : wCur, wCur, k) - iconW;
        const iy = y - 9;
        return (
          <Layer>
            {!grade ? (
              <g stroke={PAL.ink} strokeWidth={2.4} strokeLinecap="round" fill="none">
                <circle cx={ix} cy={iy} r={13} />
                <line x1={ix} y1={iy} x2={ix + Math.cos(spin - Math.PI / 2) * 9} y2={iy + Math.sin(spin - Math.PI / 2) * 9} />
              </g>
            ) : (
              <g>
                {[0, 1, 2, 3].map((j) => (
                  <rect
                    key={j}
                    x={ix - 20 + j * 11}
                    y={iy + 8 - (j + 1) * 5}
                    width={8}
                    height={(j + 1) * 5}
                    fill={j < 2 ? PAL.iodine : PAL.line}
                  />
                ))}
              </g>
            )}
          </Layer>
        );
      })()}
    </div>
  );
};

/* ---------- главы с прогрессом ---------- */
export const Nav: React.FC<{t: number; alpha: number}> = ({t, alpha}) => {
  if (alpha <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        top: 336 - 24 * 0.74,
        display: 'flex',
        gap: 30,
        opacity: alpha,
        fontFamily: FONT.mono,
        fontWeight: 500,
        fontSize: 24,
        letterSpacing: 1.6,
        lineHeight: 1,
        color: PAL.ink,
        whiteSpace: 'nowrap',
      }}
    >
      {CHAPTERS.map((c) => {
        const on = t >= c.a && t < c.b;
        const done = t >= c.b;
        const act = on ? E.out(invLerp(c.a, c.a + 0.5, t)) : 0;
        const pr = clamp((t - c.a) / (c.b - c.a));
        return (
          <div key={c.n} style={{position: 'relative', opacity: on ? lerp(0.55, 1, act) : done ? 0.55 : 0.4}}>
            {c.n} {c.label}
            <div style={{position: 'absolute', left: 0, right: 0, top: 24 * 0.74 + 14, height: 3, background: PAL.line}}>
              <div style={{width: `${pr * 100}%`, height: '100%', background: PAL.scrub}} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- субтитры (Onest 700 56/68, on-ink на плашке ink, активное слово marker-on-fill) ---------- */
// Оценка ширины слова без измерения DOM: Onest 700 ≈ 0.6em на символ кириллицы.
const estW = (w: string, size: number) => {
  let s = 0;
  for (const ch of w) {
    if (/[A-ZА-ЯЁ]/.test(ch)) s += 0.68;
    else if (/[a-zа-яё]/.test(ch)) s += 0.58;
    else if (/[0-9]/.test(ch)) s += 0.6;
    else if (/[ ,.:;]/.test(ch)) s += 0.28;
    else s += 0.55;
  }
  return s * size;
};

// одна строка или две сбалансированные; не влезает — кегль уменьшается
function layoutSub(words: string[], maxW: number, size0 = 56): {lines: number[][]; size: number} {
  for (let size = size0; size >= 40; size -= 2) {
    const space = 0.28 * size;
    const ws = words.map((w) => estW(w, size));
    const sum = (a: number, b: number) => ws.slice(a, b).reduce((x, y) => x + y, 0) + space * Math.max(0, b - a - 1);
    const idx = (a: number, b: number) => words.slice(a, b).map((_, i) => a + i);
    if (sum(0, words.length) <= maxW) return {lines: [idx(0, words.length)], size};
    let best: {k: number; score: number} | null = null;
    for (let k = 1; k < words.length; k++) {
      const a = sum(0, k);
      const b = sum(k, words.length);
      if (a > maxW || b > maxW) continue;
      const score = Math.max(a, b) + (b > a ? 0 : 6);
      if (!best || score < best.score) best = {k, score};
    }
    if (best) return {lines: [idx(0, best.k), idx(best.k, words.length)], size};
  }
  return {lines: [words.map((_, i) => i)], size: 40};
}

export const Subtitles: React.FC<{t: number}> = ({t}) => {
  return (
    <>
      {CARDS.map(([a, b, text]) => {
        if (t < a - 0.01 || t > b + 0.2) return null;
        const inK = E.outQ(invLerp(a, a + 0.22, t));
        const outK = invLerp(b - 0.02, b + 0.16, t);
        const alpha = inK * (1 - outK);
        if (alpha <= 0) return null;
        const words = text.split(' ');
        const {lines, size} = layoutSub(words, 836 * 0.97);
        const lh = Math.round((size * 68) / 56);
        const speak = clamp((t - a - 0.15) / Math.max(0.6, b - a - 0.55));
        const active = Math.min(words.length - 1, Math.floor(speak * words.length));
        const sc = lerp(0.94, 1, inK);
        return (
          <div
            key={a}
            style={{
              position: 'absolute',
              left: 510,
              top: 1292,
              transform: `translate(-50%, -50%) translateY(${(1 - inK) * 16}px) scale(${sc})`,
              padding: '20px 30px',
              borderRadius: 12,
              background: PAL.ink,
              color: PAL.onInk,
              fontFamily: FONT.sans,
              fontWeight: 700,
              fontSize: size,
              lineHeight: `${lh}px`,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              opacity: alpha,
            }}
          >
            {lines.map((line, li) => (
              <div key={li}>
                {line.map((i) => {
                  const wa = clamp((t - a - 0.05 - i * 0.035) / 0.18);
                  return (
                    <span
                      key={i}
                      style={{
                        display: 'inline-block',
                        opacity: wa,
                        transform: `translateY(${(1 - E.out(wa)) * 10}px)`,
                        color: i === active && speak < 1 ? PAL.markerOnFill : PAL.onInk,
                        marginRight: i < line[line.length - 1] ? '0.26em' : 0,
                      }}
                    >
                      {words[i]}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
};

/* ---------- заголовок-хук ---------- */
export const Hook: React.FC<{t: number}> = ({t}) => {
  if (t < 0.6 || t > 4.1) return null;
  const out = E.inOut(invLerp(3.4, 4.0, t));
  const k1 = E.outQ(invLerp(0.65, 1.2, t));
  const k2 = E.outQ(invLerp(0.8, 1.35, t));
  const up = P(t, 1.25, 1.8, E.inOut);
  const w2 = 470; // ширина слова «алопеция» в Playfair Italic 104 ≈ 470px
  return (
    <div style={{position: 'absolute', inset: 0, opacity: 1 - out, transform: `translateY(${-out * 60}px)`}}>
      <ClipLine y={432 - 104} h={136} k={k1}>
        <Txt x={56} y={104} size={84} weight={800} style={{letterSpacing: '-0.03em'}}>
          Андрогенетическая
        </Txt>
      </ClipLine>
      <ClipLine y={540 - 104} h={136} k={k2}>
        <Txt x={60} y={104} size={104} weight={500} family="serif" italic>
          алопеция
        </Txt>
      </ClipLine>
      <Layer>
        <MarkerPath pts={wavyLine(64, 574, w2 - 4)} progress={up} />
      </Layer>
    </div>
  );
};

/* ---------- финальная фраза ---------- */
export const Outro: React.FC<{t: number}> = ({t}) => {
  const a = env(t, 57.9, 63.1, 0.01, 0.5);
  if (a <= 0) return null;
  const l1 = E.outQ(invLerp(57.9, 58.5, t));
  const l2 = E.outQ(invLerp(58.3, 58.9, t));
  const l3 = E.outQ(invLerp(58.5, 59.1, t));
  const fa = env(t, 58.6, 63.1, 0.5, 0.5);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: a}}>
      <ClipLine y={470 - 92} h={118} k={l1}>
        <div style={{position: 'absolute', left: 60, top: 92 - 80 * 0.74, display: 'flex', alignItems: 'baseline', whiteSpace: 'nowrap'}}>
          <span style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 80, color: PAL.ink, lineHeight: 1}}>DHT —&nbsp;</span>
          <span style={{fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 500, fontSize: 88, color: PAL.iodine, lineHeight: 1}}>причина.</span>
        </div>
      </ClipLine>
      <ClipLine y={566 - 92} h={118} k={l2}>
        <div style={{position: 'absolute', left: 60, top: 92 - 80 * 0.74, display: 'flex', alignItems: 'baseline', whiteSpace: 'nowrap'}}>
          <span style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 80, color: PAL.ink, lineHeight: 1}}>Финастерид —&nbsp;</span>
          <span style={{fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 500, fontSize: 88, color: PAL.scrub, lineHeight: 1}}>основа.</span>
        </div>
      </ClipLine>
      <ClipLine y={662 - 92} h={118} k={l3}>
        <div style={{position: 'absolute', left: 60, top: 92 - 80 * 0.74, display: 'flex', alignItems: 'baseline', whiteSpace: 'nowrap'}}>
          <span style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 80, color: PAL.ink, lineHeight: 1}}>PRP —&nbsp;</span>
          <span style={{fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 500, fontSize: 88, color: PAL.marker, lineHeight: 1}}>дополнение.</span>
        </div>
      </ClipLine>
      <div style={{position: 'absolute', left: 60, top: 1386, width: 900, height: 2, background: PAL.line, opacity: fa}} />
      <Txt x={60} y={1428} size={24} color={PAL.inkMuted} alpha={fa}>
        Информация носит образовательный характер
      </Txt>
      <Txt x={60} y={1460} size={24} color={PAL.inkMuted} alpha={fa}>
        и не заменяет очную консультацию врача.
      </Txt>
    </div>
  );
};

export const hudEnv = env;
export const hudW = W;
