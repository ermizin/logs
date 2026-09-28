// Микромир в линзе: луковица волоса в разрезе (H&E-стилистика). Локальные координаты,
// центр (0,0), радиус 400. Два эпизода: 'dht' — тестостерон → DHT → рецепторы → сигналы;
// 'prp' — тромбоцит активируется, факторы роста будят клетки сосочка, растут сосуды.
import React from 'react';
import {PAL, FONT} from '../palette';
import {E, P, clamp, env, lerp, mix, noise1, ring, rng, TAU} from '../math';
import {Pt, bentCurve, blob, polyPartial, smoothD} from '../geom';

const LR = 400;
const PAP: {c: Pt; rx: number; ry: number} = {c: [0, 130], rx: 175, ry: 225};

type Cell = {x: number; y: number; r: number; seed: number; rot: number};

const MIC = (() => {
  const r = rng(2026);
  // клетки сосочка (фибробласты): вытянутые, внутри эллипса
  const fibro: Cell[] = [];
  for (let i = 0; i < 9; i++) {
    const a = r() * TAU;
    const k = 0.25 + r() * 0.6;
    fibro.push({x: PAP.c[0] + Math.cos(a) * PAP.rx * k, y: PAP.c[1] + Math.sin(a) * PAP.ry * k, r: 26 + r() * 8, seed: 100 + i, rot: r() * Math.PI});
  }
  // матрикс: клетки-кубики вокруг верхней половины сосочка
  const matrix: Cell[] = [];
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * 1.02 + (Math.PI * 0.96 * i) / 25; // от левого бока через верх к правому
    const layer = i % 2;
    const rr = 1 + 0.22 + layer * 0.34;
    matrix.push({x: PAP.c[0] + Math.cos(a) * PAP.rx * rr, y: PAP.c[1] + Math.sin(a) * PAP.ry * rr + 10, r: 27 + r() * 6, seed: 200 + i, rot: a});
  }
  const bokeh = Array.from({length: 8}, () => ({x: -420 + r() * 840, y: -420 + r() * 840, rr: 40 + r() * 70, c: r() < 0.5 ? PAL.eosinLight : PAL.slide2}));
  // молекулы тестостерона: стартуют в капилляре, идут к фибробластам
  const mol = Array.from({length: 9}, (_, i) => {
    const target = fibro[i % fibro.length];
    return {t0: 0.25 + i * 0.16, sx: -22 + r() * 44, sy: 380 + r() * 40, tx: target.x + (r() - 0.5) * 70, ty: target.y + 28 + (r() - 0.5) * 40, target: i % fibro.length, seed: 300 + i};
  });
  const rbc = Array.from({length: 7}, (_, i) => ({o: i / 7, s: 0.85 + r() * 0.3}));
  return {fibro, matrix, bokeh, mol, rbc};
})();

const hexD = (r: number) => {
  let d = '';
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k - Math.PI / 6;
    d += `${k ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
  }
  return d + 'Z';
};

const Nucleus: React.FC<{x: number; y: number; r: number; sx?: number; rot?: number; seed: number; glow?: number; glowColor?: string; alpha?: number}> = ({
  x,
  y,
  r,
  sx = 1,
  rot = 0,
  seed,
  glow = 0,
  glowColor = PAL.marker,
  alpha = 1,
}) => {
  const s = blob(x, y, r, {sx, sy: 1, rot, seed, amp: 0.05, n: 24});
  const R = rng(seed * 31);
  const dots = Array.from({length: 4}, () => [x + (R() - 0.5) * r * sx, y + (R() - 0.5) * r]);
  return (
    <g opacity={alpha}>
      {glow > 0 ? <circle cx={x} cy={y} r={r * 1.9} fill={glowColor} opacity={0.35 * glow} /> : null}
      <path d={smoothD(s, true)} fill={glow > 0 ? mix(PAL.hema, glowColor, glow * 0.6) : PAL.hema} />
      {dots.map(([dx, dy], k) => (
        <circle key={k} cx={dx} cy={dy} r={1.6} fill={PAL.hemaLight} />
      ))}
      <circle cx={x + r * 0.15} cy={y - r * 0.1} r={Math.max(1.6, r * 0.18)} fill={PAL.hemaDark} />
    </g>
  );
};

const Capillary: React.FC<{tau: number; sprout?: number}> = ({tau, sprout = 0}) => {
  const path: Pt[] = [];
  for (let k = 0; k <= 10; k++) {
    const s = k / 10;
    path.push([lerp(0, 0, s) + 12 * noise1(s * 3, 8), lerp(430, 250, s)]);
  }
  const d = smoothD(path);
  const branches: Pt[][] = [
    bentCurve([-6, 330], [-120, 200], 0.3, 16),
    bentCurve([6, 340], [128, 215], -0.3, 16),
    bentCurve([-2, 300], [-60, 100], 0.25, 16),
  ];
  return (
    <g>
      <path d={d} stroke={PAL.rbcDark} strokeWidth={36} fill="none" strokeLinecap="round" opacity={0.35} />
      <path d={d} stroke={PAL.slide} strokeWidth={28} fill="none" strokeLinecap="round" />
      {MIC.rbc.map((c, k) => {
        const o = (c.o + tau * 0.09) % 1;
        const y = lerp(430, 250, o);
        const x = 12 * noise1(o * 3, 8);
        return <ellipse key={k} cx={x} cy={y} rx={11 * c.s} ry={7 * c.s} fill={PAL.rbc} opacity={0.9} />;
      })}
      {sprout > 0
        ? branches.map((b, k) => {
            const pr = clamp(sprout * 1.4 - k * 0.2);
            return <path key={k} d={smoothD(polyPartial(b, pr))} stroke={PAL.rbc} strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.85} />;
          })
        : null}
    </g>
  );
};

// подписи-чипы внутри линзы (SVG-текст моно, ширина считается по моноширинности)
const SvgChip: React.FC<{x: number; y: number; text: string; alpha: number; colors?: [string, string]}> = ({x, y, text, alpha, colors = [PAL.scrubSoft, PAL.scrub]}) => {
  if (alpha <= 0) return null;
  const w = text.length * 24 * 0.62 + (text.length - 1) * 1.9 + 32;
  return (
    <g opacity={alpha} transform={`translate(${x} ${y + (1 - alpha) * 10})`}>
      <rect x={-w / 2} y={-24} width={w} height={48} rx={12} fill={colors[0]} />
      <text x={0} y={9} textAnchor="middle" fontFamily={FONT.mono} fontSize={24} fontWeight={500} letterSpacing={1.9} fill={colors[1]}>
        {text}
      </text>
    </g>
  );
};

export const BulbMicro: React.FC<{ep: 'dht' | 'prp'; tau: number}> = ({ep, tau}) => {
  const D = ep === 'dht';
  // dht: молекулы 0.25–2.0, конверсия 2.0–3.5, стыковка 3.6–5.6, сигналы 5.5–6.6
  const conv = D ? P(tau, 2.0, 3.4) : 0;
  const dock = D ? P(tau, 3.6, 5.4) : 0;
  const sig = D ? P(tau, 5.5, 6.4, E.out) : 0;
  const shrink = D ? P(tau, 5.8, 7.0) : 0;
  // prp: активация 0.4–1.4, факторы 1.2–3.4, ответ 3.0–4.8, сосуды 4.4–6.4
  const act = D ? 0 : P(tau, 0.4, 1.4, E.out);
  const wake = D ? 0 : P(tau, 3.0, 4.6);
  const sprout = D ? 0 : P(tau, 4.4, 6.4, E.inOut);

  const papOutline = blob(PAP.c[0], PAP.c[1], 1, {sx: PAP.rx, sy: PAP.ry, seed: 5, amp: 0.03, n: 48});
  const factors = ['PDGF', 'VEGF', 'IGF-1', 'TGF-β', 'FGF-2'];
  return (
    <g>
      <rect x={-LR - 20} y={-LR - 20} width={LR * 2 + 40} height={LR * 2 + 40} fill={PAL.slide} />
      {MIC.bokeh.map((b, k) => (
        <circle key={k} cx={b.x} cy={b.y} r={b.rr} fill={b.c} opacity={0.5} />
      ))}
      {/* соединительная ткань вокруг: волокна */}
      {[...Array(6)].map((_, k) => {
        const pts: Pt[] = [];
        for (let x = -420; x <= 420; x += 40) pts.push([x, -300 + k * 130 + 18 * noise1(x / 80 + k, k + 20)]);
        return <path key={k} d={smoothD(pts)} stroke={PAL.collagen} strokeWidth={3} fill="none" opacity={0.18} />;
      })}
      {/* матрикс: клетки вокруг сосочка */}
      {MIC.matrix.map((c, k) => {
        const sc = lerp(1, 0.72, shrink * (0.6 + 0.4 * ((k * 7) % 5) / 4));
        const s = blob(c.x, c.y, c.r * sc, {seed: c.seed, amp: 0.08, n: 28, sx: 1.05, rot: c.rot});
        return (
          <g key={k}>
            <path d={smoothD(s, true)} fill={PAL.eosin} stroke={PAL.eosinDark} strokeWidth={1.5} opacity={lerp(1, 0.7, shrink)} />
            <Nucleus x={c.x} y={c.y} r={11 * sc} seed={c.seed} alpha={lerp(1, 0.55, shrink)} />
          </g>
        );
      })}
      {/* дермальный сосочек */}
      <path d={smoothD(papOutline, true)} fill={PAL.eosinLight} stroke={PAL.eosin} strokeWidth={2.5} />
      <Capillary tau={tau} sprout={sprout} />
      {MIC.fibro.map((c, k) => {
        const s = blob(c.x, c.y, c.r, {sx: 1.9, sy: 0.8, rot: c.rot, seed: c.seed, amp: 0.07, n: 30});
        const glowD = dock * (k < 6 ? 1 : 0.5);
        const glowP = wake * (k < 7 ? 1 : 0.4);
        return (
          <g key={k}>
            <path d={smoothD(s, true)} fill={PAL.eosin} opacity={0.85} />
            <Nucleus x={c.x} y={c.y} r={10} sx={1.7} rot={c.rot} seed={c.seed} glow={D ? glowD : glowP} glowColor={D ? PAL.marker : PAL.scrub} />
            {/* рецептор AR: полукольцо у ядра, появляется к моменту стыковки */}
            {D ? (
              <path
                d={`M${c.x + Math.cos(c.rot) * 26} ${c.y + Math.sin(c.rot) * 26} a9 9 0 1 0 0.01 0`}
                fill="none"
                stroke={PAL.marker}
                strokeWidth={2.4}
                opacity={P(tau, 3.2, 3.8) * 0.9}
              />
            ) : null}
          </g>
        );
      })}
      {/* эпизод DHT: молекулы */}
      {D
        ? MIC.mol.map((m, k) => {
            const tr = P(tau, m.t0, m.t0 + 1.6, E.out);
            if (tr <= 0) return null;
            const ck = clamp((conv - k * 0.06) * 1.5);
            const target = MIC.fibro[m.target];
            const dk = clamp((dock - k * 0.05) * 1.4);
            const rx = lerp(m.sx, m.tx, tr) + 6 * noise1(tau * 0.8 + k, k);
            const ry = lerp(m.sy, m.ty, tr) + 6 * noise1(tau * 0.7 + k * 2, k + 1);
            const x = lerp(rx, target.x + Math.cos(target.rot) * 26, E.inOut(dk));
            const y = lerp(ry, target.y + Math.sin(target.rot) * 26, E.inOut(dk));
            const flash = Math.max(0, ring(tau, 2.0 + k * 0.1, 1.2, 2.2));
            const fill = mix(PAL.slide, PAL.marker, ck);
            const stroke = mix(PAL.molecule, PAL.marker, ck);
            return (
              <g key={k} transform={`translate(${x} ${y})`}>
                {flash > 0 ? <circle r={16 + 10 * flash} fill="none" stroke={PAL.marker} strokeWidth={2} opacity={flash} /> : null}
                <path d={hexD(9)} fill={fill} stroke={stroke} strokeWidth={2.4} />
              </g>
            );
          })
        : null}
      {/* эпизод DHT: сигналы к матриксу */}
      {D && sig > 0
        ? [0, 2, 4].map((k) => {
            const from = MIC.fibro[k];
            const to = MIC.matrix[6 + k * 4];
            const pts = bentCurve([from.x, from.y - 20], [to.x, to.y + 20], 0.15, 16);
            const part = polyPartial(pts, sig);
            return <path key={k} d={smoothD(part)} stroke={PAL.ink} strokeWidth={2.4} fill="none" strokeDasharray="6 6" strokeLinecap="round" opacity={0.8} />;
          })
        : null}
      {D ? <SvgChip x={0} y={-330} text="5α-РЕДУКТАЗА II" alpha={env(tau, 1.9, 3.6, 0.25, 0.3)} colors={[PAL.iodineSoft, PAL.iodine]} /> : null}
      {D ? <SvgChip x={-150} y={-250} text="TGF-β" alpha={env(tau, 5.5, 7.4, 0.25, 0.3)} colors={[PAL.iodineSoft, PAL.iodine]} /> : null}
      {D ? <SvgChip x={150} y={-250} text="DKK-1" alpha={env(tau, 5.7, 7.4, 0.25, 0.3)} colors={[PAL.iodineSoft, PAL.iodine]} /> : null}

      {/* эпизод PRP: тромбоцит и факторы роста */}
      {!D ? (
        <g>
          {(() => {
            const cx = -250;
            const cy = -140;
            const pods = [0, 1.25, 2.5, 3.75, 5].map((a) => ({a, h: 0.55 * act, w: 0.3}));
            const s = blob(cx, cy, 62, {seed: 9, amp: 0.05 + 0.08 * act, n: 44, pods, t: tau});
            const R = rng(41);
            return (
              <g>
                <path d={smoothD(s, true)} fill={PAL.platelet} stroke={PAL.plateletDark} strokeWidth={2.4} />
                {[...Array(8)].map((_, k) => (
                  <circle key={k} cx={cx + (R() - 0.5) * 70} cy={cy + (R() - 0.5) * 60} r={6} fill={PAL.plateletDark} opacity={0.9 * (1 - act)} />
                ))}
              </g>
            );
          })()}
          {factors.map((name, k) => {
            const t0 = 1.2 + k * 0.28;
            const pr = P(tau, t0, t0 + 1.5, E.inOut);
            if (pr <= 0) return null;
            const target = MIC.fibro[(k * 2) % MIC.fibro.length];
            const pts = bentCurve([-250 + 40, -140 + (k - 2) * 12], [target.x - 10, target.y - 30], 0.25 - k * 0.1, 24);
            const idx = Math.min(24, Math.floor(pr * 24));
            const p = pts[idx];
            const alpha = Math.min(1, pr * 6) * (1 - P(pr, 0.9, 1));
            return <SvgChip key={name} x={p[0]} y={p[1]} text={name} alpha={alpha} />;
          })}
          <SvgChip x={0} y={-330} text="WNT / β-CATENIN" alpha={env(tau, 3.6, 6.6, 0.3, 0.3)} />
        </g>
      ) : null}
    </g>
  );
};
