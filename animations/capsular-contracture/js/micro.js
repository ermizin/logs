'use strict';
/* Микроскопия в «линзе»: граница имплант–ткань. Стилистика H&E, α-SMA — коричневый DAB, бактерии — по Граму.
   Координаты — локальные, центр линзы (0,0), радиус 400. Имплант снизу. */

const LR = 400;
// поверхность импланта (выпуклый «горизонт»); squeeze — складки при контрактуре
const surfY = (x, sq = 0) => 150 + (x * x) / 5200 + sq * (5 * Math.sin(x / 23) + 3 * Math.sin(x / 9.5 + 1));

/* ---------- рисование клеток ---------- */
// контур «живой» клетки: радиус с шумом, растяжение, поворот
function blob(cx, cy, r, opt = {}) {
  const { sx = 1, sy = 1, rot = 0, seed = 1, t = 0, amp = 0.06, n = 40, pods = null, floorY = null } = opt;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (TAU * i) / n;
    let k = 1 + amp * (noise1(a * 1.6 + t * 0.9, seed) * 0.7 + noise1(a * 3.1 - t * 1.3, seed + 5) * 0.3);
    if (pods) for (const p of pods) { const d = Math.atan2(Math.sin(a - p.a), Math.cos(a - p.a)); k += p.h * Math.exp(-(d * d) / (p.w * p.w)); }
    let x = Math.cos(a) * r * k * sx, y = Math.sin(a) * r * k * sy;
    const X = cx + x * Math.cos(rot) - y * Math.sin(rot);
    let Y = cy + x * Math.sin(rot) + y * Math.cos(rot);
    if (floorY !== null) Y = Math.min(Y, floorY(X));
    pts.push([X, Y]);
  }
  return pts;
}
// объединение контуров: сначала обводка шириной 2*sw, потом заливка — внутренние границы исчезают
function unionFill(ctx, shapes, fill, stroke, sw = 2.2, alpha = 1) {
  if (!shapes.length || alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke; ctx.fillStyle = stroke; ctx.lineWidth = sw * 2;
  for (const s of shapes) { ctx.beginPath(); smoothPath(ctx, s, true); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = fill;
  for (const s of shapes) { ctx.beginPath(); smoothPath(ctx, s, true); ctx.fill(); }
  ctx.restore();
}
function nucleus(ctx, x, y, r, opt = {}) {
  const { sx = 1, sy = 1, rot = 0, seed = 3, alpha = 1, kidney = 0 } = opt;
  const pods = kidney ? [{ a: -Math.PI / 2, h: -kidney, w: 0.5 }] : null;
  const s = blob(x, y, r, { sx, sy, rot, seed, amp: 0.05, n: 24, pods });
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = PAL.hema; ctx.beginPath(); smoothPath(ctx, s, true); ctx.fill();
  ctx.fillStyle = PAL.hemaLight;
  const R = rng(seed * 31);
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x + (R() - 0.5) * r * sx, y + (R() - 0.5) * r * sy, 1.3 + R() * 1.5, 0, TAU); ctx.fill(); }
  ctx.fillStyle = PAL.hemaDark; ctx.beginPath(); ctx.arc(x + r * 0.15, y - r * 0.1, Math.max(1.6, r * 0.18), 0, TAU); ctx.fill();
  ctx.restore();
}
function cellShade(ctx, shape, cx, cy, r) {
  // мягкий объём: светлее сверху слева
  ctx.save();
  ctx.beginPath(); smoothPath(ctx, shape, true); ctx.clip();
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.1, cx, cy, r * 1.25);
  g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(0.6, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(120,40,70,0.10)');
  ctx.fillStyle = g; ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
  ctx.restore();
}

/* ---------- сцена ---------- */
const MIC = (() => {
  const r = rng(2024);
  // белки: 0 альбумин, 1 IgG, 2 фибриноген, 3 фибронектин
  const prot = [];
  for (let i = 0; i < 96; i++) {
    const type = i < 30 ? 0 : i < 50 ? 1 : i < 80 ? 2 : 3;
    const lx = -380 + r() * 760;
    prot.push({
      type, lx, sx: lx + (r() - 0.5) * 260, sy: -380 + r() * 420,
      tl: type === 0 ? 0.3 + r() * 1.2 : 0.9 + r() * 1.9,
      td: type === 0 && r() < 0.55 ? 2.4 + r() * 1.2 : null, // эффект Вромана: альбумин вытесняется
      rot: (r() - 0.5) * 0.5, seed: i, lift: r() * 7,
    });
  }
  const neut = [0, 1, 2, 3].map((i) => ({ x: -300 + i * 190 + (r() - 0.5) * 40, t0: 2.3 + i * 0.22, seed: 40 + i, from: (r() - 0.5) * 600 }));
  const mac = [-285, -140, 0, 140, 290].map((x, i) => ({ x, t0: 3.0 + i * 0.28 + r() * 0.2, seed: 60 + i, from: [x + (r() - 0.5) * 300, -470] }));
  const fib = [
    { y: -52, dir: 1, x0: -470, t0: 7.3, seed: 81 }, { y: -68, dir: -1, x0: 470, t0: 7.6, seed: 82 },
    { y: -84, dir: 1, x0: -470, t0: 7.9, seed: 83 }, { y: -100, dir: -1, x0: 470, t0: 8.15, seed: 84 },
    { y: -116, dir: 1, x0: -470, t0: 8.4, seed: 85 }, { y: -132, dir: -1, x0: 470, t0: 8.6, seed: 86 },
  ];
  const bokeh = [];
  for (let i = 0; i < 9; i++) bokeh.push({ x: -420 + r() * 840, y: -400 + r() * 480, r: 30 + r() * 60, d: 0.3 + r() * 0.7, c: r() < 0.5 ? PAL.eosinLight : PAL.slide2 });
  const rbc = [];
  for (let i = 0; i < 9; i++) rbc.push({ o: i / 9, s: 0.85 + r() * 0.3 });
  const bact = [];
  [[-250, 0], [215, 1]].forEach(([cx, col]) => {
    for (let i = 0; i < 26; i++) {
      const gen = i < 3 ? 0 : i < 6 ? 1 : i < 12 ? 2 : 3;
      const ang = Math.PI + r() * Math.PI, rad = 6 + Math.sqrt(i) * 9.5;
      bact.push({ col, gen, dx: Math.cos(ang) * rad * 1.35, dy: Math.sin(ang) * rad * 0.85, seed: 200 + i + col * 40 });
    }
  });
  return { prot, neut, mac, fib, bokeh, rbc, bact };
})();

function drawProtein(ctx, p, x, y, rot, a) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= a;
  ctx.lineCap = 'round';
  if (p.type === 0) { ctx.fillStyle = '#9d91cc'; ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 4.6, 0, 0, TAU); ctx.fill(); }
  else if (p.type === 1) {
    ctx.strokeStyle = '#6f60b0'; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(0, -1); ctx.lineTo(-6, -8); ctx.moveTo(0, -1); ctx.lineTo(6, -8); ctx.stroke();
  } else if (p.type === 2) {
    ctx.strokeStyle = PAL.eosinDark; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(13, 0); ctx.stroke();
    ctx.fillStyle = PAL.eosinDark;
    for (const cx of [-13, 0, 13]) { ctx.beginPath(); ctx.arc(cx, 0, cx === 0 ? 4.2 : 3.4, 0, TAU); ctx.fill(); }
  } else {
    ctx.strokeStyle = '#8c63ad'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(0, 5); ctx.lineTo(10, -8); ctx.stroke();
    ctx.fillStyle = '#8c63ad';
    for (const [cx, cy] of [[-10, -8], [10, -8], [0, 5]]) { ctx.beginPath(); ctx.arc(cx, cy, 2.8, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}

// волокна коллагена: слой над поверхностью; crimp — «гофр», squeeze — сжатие к центру
function fiberPath(y0, x0, x1, crimp, phase, sq, dens) {
  const pts = [];
  for (let x = x0; x <= x1 + 0.1; x += 8) {
    const xs = x * (1 - 0.16 * sq);
    const yb = surfY(xs, 0) + y0 * dens;
    pts.push([xs, yb + crimp * Math.sin(x / 19 + phase) + crimp * 0.4 * Math.sin(x / 7.3 + phase * 2)]);
  }
  return pts;
}

/* Состояние линзы. ep: 'F' — формирование (τ 0…11), 'K' — контрактура (τ 0…9) */
function drawMicro(ctx, ep, tau) {
  const F = ep === 'F', K = ep === 'K';
  const tf = F ? tau : 11; // время «формирования» (в K всё уже сформировано)
  const tk = K ? tau : 0;
  // параметры контрактуры
  const myo = K ? P(tk, 2.8, 4.6) : 0;        // превращение в миофибробласты
  const con = K ? P(tk, 4.4, 8.4, E.inOut) : 0; // сокращение
  const pulse = K ? Math.max(0, ring(tk, 4.6, 1.1, 1.6), ring(tk, 5.6, 1.1, 1.6), ring(tk, 6.6, 1.1, 1.6)) : 0;
  const sq = con * 0.9;

  /* фон: предметное стекло, дальние клетки */
  ctx.fillStyle = PAL.slide; ctx.fillRect(-LR - 20, -LR - 20, LR * 2 + 40, LR * 2 + 40);
  for (const b of MIC.bokeh) {
    const x = b.x + Math.sin(tau * 0.3 + b.d * 5) * 14 * b.d, y = b.y + Math.cos(tau * 0.25 + b.d * 3) * 8;
    const g = ctx.createRadialGradient(x, y, 0, x, y, b.r);
    g.addColorStop(0, rgba(b.c, 0.85)); g.addColorStop(0.7, rgba(b.c, 0.5)); g.addColorStop(1, rgba(b.c, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, b.r, 0, TAU); ctx.fill();
  }

  /* плазма: взвесь частиц медленно оседает, нити фибрина — временный матрикс */
  const fibA = F ? P(tf, 1.5, 4.0) * 0.16 : 0.16;
  if (fibA > 0) {
    ctx.save(); ctx.strokeStyle = PAL.eosinDark; ctx.lineWidth = 1.4; ctx.globalAlpha = fibA;
    for (let j = 0; j < 6; j++) {
      ctx.beginPath();
      for (let x = -LR - 20; x <= LR + 20; x += 14) {
        const y = -330 + j * 62 + 22 * Math.sin(x / 70 + j * 1.9 + tau * 0.15) + 9 * Math.sin(x / 23 + j);
        x === -LR - 20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.save();
  for (let i = 0; i < 80; i++) {
    const sp = 0.35 + hashI(i * 3 + 2) * 0.9;
    const x = hashI(i * 3 + 1) * 880 - 440 + Math.sin(tau * 0.5 + i) * 10;
    const y = -440 + ((hashI(i * 3 + 3) * 700 + tau * 16 * sp) % 640);
    if (y > surfY(x) - 8) continue;
    ctx.globalAlpha = 0.22 + 0.2 * sp; ctx.fillStyle = i % 3 ? PAL.hemaLight : PAL.eosinDark;
    ctx.beginPath(); ctx.arc(x, y, 1.1 + sp * 1.7, 0, TAU); ctx.fill();
  }
  ctx.restore();

  /* капилляр (неоангиогенез) */
  const cap = F ? P(tf, 8.0, 10.6, E.out) : 1;
  if (cap > 0) {
    const path = [];
    for (let i = 0; i <= 40; i++) { const s = i / 40; path.push([lerp(430, -120, s) + 70 * Math.sin(s * 3.2), lerp(-300, -205, s) + 60 * Math.sin(s * Math.PI) * -0.6 - 40 * s * s]); }
    const part = polyPartial(path, cap);
    strokeSmooth(ctx, part, PAL.rbcDark, 30, 0.9);
    strokeSmooth(ctx, part, '#f3cdd5', 22, 1);
    if (cap >= 1) {
      for (const c of MIC.rbc) {
        const s = (c.o + tau * 0.09) % 1, i = Math.floor(s * 40), f = s * 40 - i;
        const p = path[Math.min(39, i)], q = path[Math.min(40, i + 1)];
        const x = lerp(p[0], q[0], f), y = lerp(p[1], q[1], f), ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang + 1.2);
        ctx.fillStyle = PAL.rbc; ctx.beginPath(); ctx.ellipse(0, 0, 8 * c.s, 5.5 * c.s, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = rgba('#ffffff', 0.25); ctx.beginPath(); ctx.ellipse(0, 0, 3.5 * c.s, 2.2 * c.s, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
  }

  /* коллаген: рыхлый слой (формирование) → плотный, прямой, толстый (контрактура) */
  const dens = lerp(1, 0.84, con);
  const crimp = lerp(5.5, 0.4, con);
  const colC = mix(PAL.collagen, PAL.collagenDense, con * 0.9);
  for (let j = 0; j < 16; j++) {
    let vis = 0, x0 = -LR - 40, x1 = LR + 40;
    if (F) {
      const f = MIC.fib[j % 6], k = Math.floor(j / 6); // первые 6 — от фибробластов, остальные — позже
      if (j < 6) {
        const pr = P(tf, f.t0, f.t0 + 2.6, E.inOut);
        if (pr <= 0) continue;
        const head = lerp(f.x0, -f.x0, pr);
        if (f.dir > 0) x1 = head; else x0 = head;
        vis = 1;
      } else if (j < 8) { vis = P(tf, 9.8 + (j - 6) * 0.3, 10.8); }
      else continue;
      if (k > 1) continue;
    } else {
      vis = j < 8 ? 1 : P(tk, 4.8 + (j - 8) * 0.35, 5.6 + (j - 8) * 0.35);
    }
    if (vis <= 0) continue;
    const y0 = -52 - j * 16;
    const pts = fiberPath(y0, x0, x1, crimp * (1 + (j % 3) * 0.2), j * 1.3 + tau * 0.35, sq, dens);
    strokeSmooth(ctx, pts, mix(colC, '#ffffff', 0.15), lerp(5, 6.5, con), vis * 0.9);
    strokeSmooth(ctx, pts, mix(colC, PAL.eosinDark, 0.35), 1.4, vis * 0.6);
    // поперечная исчерченность — показывает, куда «едет» матрикс при сжатии
    if (K && j % 2 === 0) {
      ctx.save(); ctx.globalAlpha *= vis * 0.55; ctx.fillStyle = PAL.eosinDark;
      for (let x = -LR; x <= LR; x += 46) {
        const xs = x * (1 - 0.16 * sq), yb = surfY(xs) + y0 * dens + crimp * Math.sin(x / 19 + j * 1.3 + tau * 0.35);
        ctx.beginPath(); ctx.arc(xs, yb, 2.2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  /* имплант: оболочка и гель */
  const sqS = K ? con * 0.8 : 0;
  const surf = [];
  for (let x = -LR - 30; x <= LR + 30; x += 6) surf.push([x, surfY(x, sqS)]);
  ctx.save();
  const gg = ctx.createLinearGradient(0, 120, 0, LR);
  gg.addColorStop(0, PAL.gel2); gg.addColorStop(0.25, PAL.gel); gg.addColorStop(1, mix(PAL.gel, '#ffffff', 0.35));
  ctx.fillStyle = gg;
  ctx.beginPath(); polyPath(ctx, surf); ctx.lineTo(LR + 30, LR + 30); ctx.lineTo(-LR - 30, LR + 30); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(PAL.gel2, 0.9); ctx.lineWidth = 1.5;
  for (let k = 1; k <= 4; k++) {
    ctx.beginPath();
    for (let x = -LR - 30; x <= LR + 30; x += 10) { const y = surfY(x, sqS * 0.5) + 30 + k * 34 + 5 * Math.sin(x / 60 + k + tau * 0.4); x === -LR - 30 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.restore();
  strokeSmooth(ctx, surf.map((p) => [p[0], p[1] + 8]), mix(PAL.gel2, PAL.shell, 0.25), 14, 0.9);
  strokeSmooth(ctx, surf, PAL.shell, 2.6);

  /* белки (минуты): эффект Вромана — альбумин садится первым и вытесняется фибриногеном */
  for (const p of MIC.prot) {
    const land = F ? invLerp(p.tl - 0.9, p.tl, tf) : 1;
    if (land <= 0) continue;
    let a = 1, x, y, rot;
    const ly = surfY(p.lx, sqS) - 5 - p.lift * 0.5;
    if (land < 1) {
      const e = E.inOut(land);
      x = lerp(p.sx, p.lx, e) + noise1(tf * 2 + p.seed, p.seed) * 14 * (1 - e);
      y = lerp(p.sy, ly, e) + noise1(tf * 2.3 + p.seed, p.seed + 9) * 10 * (1 - e);
      rot = p.rot + (1 - e) * 2 * Math.sin(tf * 3 + p.seed);
      a = Math.min(1, land * 3);
    } else { x = p.lx * (1 - (K ? 0.1 * sq : 0)); y = ly; rot = p.rot; }
    if (p.td !== null) {
      const off = F ? invLerp(p.td, p.td + 1.1, tf) : 1;
      if (off >= 1) continue;
      y -= E.in(off) * 160; x += off * 30 * Math.sin(p.seed); a *= 1 - off;
    }
    // позже белки скрыты под клетками — приглушаем
    a *= F ? lerp(1, 0.55, P(tf, 6, 9)) : 0.5;
    drawProtein(ctx, p, x, y, rot, a);
    if (F && land >= 1 && tf - p.tl < 0.25) {
      ctx.save(); ctx.globalAlpha *= (1 - (tf - p.tl) / 0.25) * 0.6; ctx.strokeStyle = PAL.hemaLight; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 6 + (tf - p.tl) * 60, 0, TAU); ctx.stroke(); ctx.restore();
    }
  }

  /* нейтрофилы (часы): первыми приходят и быстро гибнут */
  if (F) {
    for (const n of MIC.neut) {
      const k = invLerp(n.t0, n.t0 + 1.0, tf), die = invLerp(n.t0 + 2.2, n.t0 + 3.0, tf);
      if (k <= 0 || die >= 1) continue;
      const e = E.out(k), r = 24 * (1 - 0.35 * die);
      const x = lerp(n.x + n.from, n.x, e), y = lerp(-440, surfY(n.x) - r - 4, e);
      const s = blob(x, y, r, { seed: n.seed, t: tf, amp: 0.05 });
      const a = 1 - die;
      unionFill(ctx, [s], PAL.eosinLight, PAL.eosinDark, 1.8, a);
      ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = rgba(PAL.eosinDark, 0.5);
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(x + Math.cos(i * 2.4) * r * 0.62, y + Math.sin(i * 2.4) * r * 0.62, 1.4, 0, TAU); ctx.fill(); }
      ctx.restore();
      const rot = (1 - e) * 5;
      for (let i = 0; i < 3; i++) nucleus(ctx, x + Math.cos(rot + i * 2.1) * r * 0.36, y + Math.sin(rot + i * 2.1) * r * 0.36, 6.5, { seed: n.seed + i, alpha: a });
    }
  }

  /* макрофаги → гигантские клетки инородных тел */
  const fuse = F ? P(tf, 5.6, 7.4, E.inOut) : 1;
  const spread = F ? P(tf, 4.2, 5.4) : 1;
  const macShapes = [], macNuc = [];
  MIC.mac.forEach((m, i) => {
    const center = i >= 1 && i <= 3;
    if (K && !center) return;
    const arrive = F ? invLerp(m.t0, m.t0 + 1.4, tf) : 1;
    if (arrive <= 0) return;
    const e = E.out(arrive);
    let x = m.x;
    if (center) x = lerp(m.x, lerp(m.x, 0, 0.62), fuse);
    const sp = spread * (center ? 1 : 0.8);
    const r = 34;
    const sx = lerp(1, 1.55, sp) * (center ? lerp(1, 1.18, fuse) : 1), sy = lerp(1, 0.62, sp);
    const baseY = surfY(x, sqS) - r * sy - 3;
    const X = lerp(m.from[0], x, e), Y = lerp(m.from[1], baseY, e);
    // псевдоподии вдоль поверхности — «фрустрированный фагоцитоз»
    const pd = F ? P(tf, 4.6, 5.8) * (1 - 0.6 * fuse) : 0.3;
    const pods = [
      { a: Math.PI * 0.08, h: 0.32 * pd * (1 + 0.3 * Math.sin(tf * 4 + i)), w: 0.3 },
      { a: Math.PI * 0.92, h: 0.32 * pd * (1 + 0.3 * Math.cos(tf * 4 + i)), w: 0.3 },
      { a: -Math.PI * 0.5, h: 0.12 * (1 - sp), w: 0.5 },
    ];
    const s = blob(X, Y, r, { sx, sy, seed: m.seed, t: tau, amp: 0.1, pods, n: 44, floorY: (xx) => surfY(xx, sqS) - 2 });
    macShapes.push(s);
    // мосты между сливающимися клетками
    if (center && i < 3 && fuse > 0.25) {
      const nx = lerp(MIC.mac[i + 1].x, lerp(MIC.mac[i + 1].x, 0, 0.62), fuse);
      const mx = (X + nx) / 2, br = lerp(4, 26, P(fuse, 0.25, 1));
      macShapes.push(blob(mx, surfY(mx, sqS) - br - 3, br * 1.4, { sx: 1.3, sy: 0.75, seed: m.seed + 50, t: tau, amp: 0.05 }));
    }
    macNuc.push({ X, Y, sx, sy, r, i, center, a: Math.min(1, arrive * 2) });
  });
  if (macShapes.length) {
    unionFill(ctx, macShapes, PAL.eosin, PAL.eosinDark, 2.2);
    macShapes.forEach((s, k) => { if (k < 5) { const c = centroid(s); cellShade(ctx, s, c[0], c[1], 40); } });
    // вакуоли и ядра
    for (const n of macNuc) {
      ctx.save(); ctx.globalAlpha *= 0.5; ctx.fillStyle = PAL.eosinLight;
      for (let v = 0; v < 3; v++) { ctx.beginPath(); ctx.arc(n.X + (v - 1) * 17 * n.sx, n.Y - 8 * n.sy + (v % 2) * 10, 4 + v, 0, TAU); ctx.fill(); }
      ctx.restore();
      if (n.center && fuse > 0.5) continue;
      nucleus(ctx, n.X + 4, n.Y + 2, 12, { sx: 1.25, sy: 0.9, seed: 70 + n.i, kidney: 0.35, alpha: n.center ? 1 - P(fuse, 0.2, 0.6) : 1 });
    }
    // многоядерная гигантская клетка: ядра по периферии
    if (fuse > 0.3) {
      const a = P(fuse, 0.3, 0.9);
      for (let j = 0; j < 9; j++) {
        const x = lerp(-120, 120, j / 8), y = surfY(x, sqS) - 22 - 14 * Math.sin((j / 8) * Math.PI) - (j % 2) * 7;
        nucleus(ctx, x, y, 8.5, { sx: 1.1, sy: 0.85, seed: 90 + j, alpha: a });
      }
    }
  }
  // активные формы кислорода — «атака» на имплант
  if (F) {
    const ros = env(tf, 4.8, 6.6, 0.3, 0.5);
    if (ros > 0) {
      ctx.save(); ctx.fillStyle = PAL.iodine;
      for (let i = 0; i < 26; i++) {
        const ph = (tf * 1.2 + i * 0.137) % 1, x = MIC.mac[i % 5].x + (hashI(i) - 0.5) * 70;
        ctx.globalAlpha = ros * (1 - ph) * 0.8;
        ctx.beginPath(); ctx.arc(x, surfY(x) - 4 + ph * 16, 2.2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  /* бактерии и биоплёнка (контрактура) */
  if (K) {
    const epsA = P(tk, 0.8, 2.6);
    [0, 1].forEach((col) => {
      const cx = col ? 215 : -250;
      const cy = surfY(cx, sqS);
      const list = MIC.bact.filter((b) => b.col === col);
      const grow = P(tk, 0.2, 2.8, E.inOut);
      // матрикс биоплёнки (EPS)
      if (epsA > 0) {
        const shapes = [];
        list.forEach((b) => { if (grow * 4 > b.gen) shapes.push(blob(cx + b.dx, cy - 8 + b.dy, 15, { seed: b.seed, amp: 0.15, n: 18, t: tk * 0.5 })); });
        shapes.push(blob(cx, cy - 10, lerp(20, 58, grow), { sx: 1.5, sy: 0.75, seed: col + 300, amp: 0.1, t: tk, floorY: (xx) => surfY(xx, sqS) + 1 }));
        unionFill(ctx, shapes, rgba(PAL.eps, 0.92), PAL.epsLine, 1.8, epsA);
      }
      // кокки гроздьями (S. epidermidis, грамположительные)
      list.forEach((b) => {
        const g = grow * 4 - b.gen;
        if (g <= 0) return;
        const k = clamp(g), x = cx + b.dx * lerp(0.6, 1, k), y = cy - 8 + b.dy * lerp(0.6, 1, k);
        const div = clamp(g * 2) < 1 ? 1 - clamp(g * 2) : 0;
        ctx.fillStyle = PAL.gram;
        ctx.beginPath(); ctx.arc(x, y, 6.5, 0, TAU); ctx.fill();
        if (div > 0) { ctx.beginPath(); ctx.arc(x - b.dx * 0.12, y - b.dy * 0.12, 6.5 * (1 - div * 0.3), 0, TAU); ctx.fill(); }
        ctx.fillStyle = rgba(PAL.gramLight, 0.8); ctx.beginPath(); ctx.arc(x - 2, y - 2.2, 2.1, 0, TAU); ctx.fill();
      });
    });
    // иммунная клетка «отскакивает» от плёнки, сигналы воспаления расходятся
    const bump = P(tk, 1.6, 2.3, E.out) - P(tk, 2.3, 3.2, E.inOut) * 0.8;
    const mx = lerp(-60, -160, bump), my = surfY(-160) - 110 + 20 * bump;
    const ms = blob(mx, my, 30, { seed: 77, t: tk, amp: 0.12, sx: 1.1, pods: [{ a: Math.PI, h: 0.4 * bump, w: 0.35 }] });
    const ma = env(tk, 1.1, 8.8, 0.5, 0.6);
    unionFill(ctx, [ms], PAL.eosin, PAL.eosinDark, 2.2, ma);
    nucleus(ctx, mx + 6, my, 11, { sx: 1.2, seed: 78, kidney: 0.3, alpha: ma });
    const sig = env(tk, 2.0, 8.8, 0.4, 0.6);
    if (sig > 0) {
      ctx.save(); ctx.fillStyle = PAL.iodine;
      for (let i = 0; i < 22; i++) {
        const ph = (tk * 0.55 + i / 22) % 1, ang = -Math.PI * (0.15 + 0.7 * hashI(i + 7));
        const src = i % 2 ? [-250, surfY(-250) - 30] : [mx, my];
        ctx.globalAlpha = sig * Math.sin(ph * Math.PI) * 0.85;
        ctx.beginPath(); ctx.arc(src[0] + Math.cos(ang) * ph * 230, src[1] + Math.sin(ang) * ph * 170, 3, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  /* фибробласты (формирование) и миофибробласты (контрактура) */
  const cells = [];
  if (F) {
    MIC.fib.forEach((f) => {
      const pr = P(tf, f.t0, f.t0 + 2.6, E.inOut);
      if (pr <= 0 || pr >= 1) return;
      const cx = lerp(f.x0, -f.x0, pr);
      cells.push({ x: cx, y: surfY(cx) + f.y, len: 64, rot: 0, seed: f.seed, a: env(pr, 0, 1, 0.08, 0.12), myo: 0 });
    });
  } else {
    [[-150, -100], [60, -150], [230, -88]].forEach(([x, y], i) => {
      const sh = 1 - 0.24 * con - 0.1 * Math.abs(pulse);
      cells.push({ x: x * (1 - 0.16 * sq), y: surfY(x) + y * dens, len: lerp(62, 86, myo) * sh, rot: 0.04 * (i - 1), seed: 120 + i, a: 1, myo });
    });
  }
  for (const c of cells) {
    const L = c.len, w = lerp(13, 20, c.myo);
    const pts = [];
    for (let i = 0; i < 36; i++) {
      const a = (TAU * i) / 36, ca = Math.cos(a), sa = Math.sin(a);
      const taper = Math.pow(Math.abs(sa), 0.55);
      let x = ca * L, y = sa * w * (0.35 + 0.65 * taper) * (1 - 0.55 * Math.pow(Math.abs(ca), 6));
      // отростки миофибробласта, заякоренные на волокнах
      y += c.myo * 10 * Math.exp(-Math.pow((a - Math.PI * 0.5) / 0.22, 2)) - c.myo * 10 * Math.exp(-Math.pow((a - Math.PI * 1.5) / 0.22, 2));
      pts.push([c.x + x * Math.cos(c.rot) - y * Math.sin(c.rot), c.y + x * Math.sin(c.rot) + y * Math.cos(c.rot) + noise1(a * 2 + tau, c.seed) * 1.5]);
    }
    unionFill(ctx, [pts], mix(PAL.eosinLight, PAL.eosin, c.myo), PAL.eosinDark, 2, c.a);
    nucleus(ctx, c.x, c.y, 9, { sx: 1.9, sy: 0.6, rot: c.rot, seed: c.seed, alpha: c.a });
    if (c.myo > 0) {
      // стресс-фибриллы α-SMA
      ctx.save(); ctx.globalAlpha *= c.myo; ctx.strokeStyle = PAL.dab; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath(); ctx.moveTo(c.x - L * 0.88, c.y + k * 5.5); ctx.lineTo(c.x + L * 0.88, c.y + k * 5.5 * 0.7); ctx.stroke();
      }
      // фокальные контакты
      ctx.fillStyle = PAL.dab;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(c.x + s * L * 0.95, c.y, 4, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  }
  /* передний план вне фокуса — глубина резкости */
  for (let i = 0; i < 3; i++) {
    const x = -520 + ((hashI(i + 900) * 1000 + tau * (22 + i * 9)) % 1200), y = -250 + i * 190 + Math.sin(tau * 0.4 + i) * 30;
    const r = 70 + i * 26;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(PAL.eosinLight, 0.22)); g.addColorStop(0.75, rgba(PAL.eosinLight, 0.12)); g.addColorStop(1, rgba(PAL.eosinLight, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  return { con, pulse, myo };
}

/* рамка «поля зрения»: виньетка, шкала, масштабная линейка */
function drawLensChrome(ctx, r, alpha, label) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  const g = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r);
  g.addColorStop(0, 'rgba(60,20,40,0)'); g.addColorStop(1, 'rgba(60,20,40,0.13)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(PAL.inkMuted, 0.4); ctx.lineWidth = 2;
  for (let i = 0; i < 72; i++) {
    const a = (TAU * i) / 72, l = i % 6 === 0 ? 16 : 8;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r - 6), Math.sin(a) * (r - 6)); ctx.lineTo(Math.cos(a) * (r - 6 - l), Math.sin(a) * (r - 6 - l)); ctx.stroke();
  }
  ctx.restore();
}
