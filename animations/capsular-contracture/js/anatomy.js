'use strict';
/* Общий план: сагиттальный срез груди с имплантом (субгландулярно), капсула, деформация. */

// передняя поверхность грудной стенки (фасция большой грудной мышцы)
const cw = (y) => 285 + 28 * (1 - Math.pow((y - 800) / 640, 2));
const WALL = (y) => cw(y) + 5;

const NI = 180; // точек в контуре импланта
const ANG = Array.from({ length: NI }, (_, k) => (TAU * k) / NI);

function rayHit(poly, c, ang) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  let best = Infinity;
  for (let i = 0, n = poly.length; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const ex = b[0] - a[0], ey = b[1] - a[1];
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const ax = a[0] - c[0], ay = a[1] - c[1];
    const t = (ax * ey - ay * ex) / den, s = (ax * dy - ay * dx) / den;
    if (t > 0 && s >= -1e-6 && s <= 1 + 1e-6 && t < best) best = t;
  }
  return best;
}
function areaCentroid(poly) {
  let a = 0, x = 0, y = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const p = poly[i], q = poly[(i + 1) % n], c = p[0] * q[1] - q[0] * p[1];
    a += c; x += (p[0] + q[0]) * c; y += (p[1] + q[1]) * c;
  }
  return [x / (3 * a), y / (3 * a)];
}

/* ---------- имплант: естественная форма и форма при контрактуре ---------- */
const IMPL = (() => {
  const y0 = 600, y1 = 1010, h = y1 - y0, proj = 250, M = 140;
  const poly = [];
  for (let i = 0; i <= M; i++) { // передняя поверхность сверху вниз, нижний полюс полнее
    const s = i / M, sp = Math.pow(s, 1.22);
    const f = Math.pow(Math.sin(Math.PI * sp), 0.66);
    const y = y0 + s * h;
    poly.push([WALL(y) + proj * f, y]);
  }
  for (let i = M - 1; i >= 1; i--) { const y = y0 + (i / M) * h; poly.push([WALL(y), y]); }
  const c0 = areaCentroid(poly);
  const r0 = ANG.map((a) => rayHit(poly, c0, a));
  const nat = ANG.map((a, k) => [c0[0] + Math.cos(a) * r0[k], c0[1] + Math.sin(a) * r0[k]]);
  const A0 = Math.abs(polyArea(nat));
  // шар, прижатый к грудной стенке: срезан сегмент глубиной 0.18R
  const R = Math.sqrt(A0 / (Math.PI - 0.1388));
  const cy1 = c0[1] - 72;
  const c1 = [WALL(cy1) + 0.82 * R, cy1];
  const tgt = ANG.map((a) => {
    const x = c1[0] + Math.cos(a) * R, y = c1[1] + Math.sin(a) * R;
    return [Math.max(x, WALL(y)), y];
  });
  return { poly, c0, r0, nat, A0, R, c1, tgt, y0, y1 };
})();

// форма импланта: m — степень контрактуры (0 норма → 1 шар), wob — колебание геля, folds — складки оболочки
function implantPts(m, wob = 0, folds = 0, t = 0) {
  const c = [lerp(IMPL.c0[0], IMPL.c1[0], m), lerp(IMPL.c0[1], IMPL.c1[1], m)];
  let pts = ANG.map((a, k) => [lerp(IMPL.nat[k][0], IMPL.tgt[k][0], m), lerp(IMPL.nat[k][1], IMPL.tgt[k][1], m)]);
  // сохраняем объём (площадь): масштаб от точки опоры на грудной стенке
  const A = Math.abs(polyArea(pts));
  const s = Math.sqrt(IMPL.A0 / A);
  const anc = [WALL(c[1]), c[1]];
  pts = pts.map((p) => {
    const x = anc[0] + (p[0] - anc[0]) * s, y = anc[1] + (p[1] - anc[1]) * s;
    return [x, y];
  });
  if (wob || folds) {
    pts = pts.map((p, k) => {
      const a = ANG[k];
      let d = wob * Math.cos(2 * a + 0.5);
      if (folds) {
        const win = Math.exp(-Math.pow((((a - 0.55 + Math.PI) % TAU) - Math.PI) / 0.62, 2));
        d += folds * win * (Math.sin(a * 23 + t * 0.6) * 0.8 + Math.sin(a * 37) * 0.35);
      }
      const dx = p[0] - c[0], dy = p[1] - c[1], L = Math.hypot(dx, dy) || 1;
      return [p[0] + (dx / L) * d, p[1] + (dy / L) * d];
    });
  }
  return pts.map((p) => [Math.max(p[0], WALL(p[1])), p[1]]);
}

/* ---------- фирменный «миндаль» и его превращение в имплант ---------- */
const ALMOND = (() => {
  const a = 330, b = 118, Rc = (a * a + b * b) / (2 * b), poly = [];
  const half = Math.asin(a / Rc);
  for (let i = 0; i <= 60; i++) { const th = -half + (2 * half * i) / 60; poly.push([Math.sin(th) * Rc, Rc - b - Math.cos(th) * Rc + 0]); }
  // верхняя дуга: y = (Rc-b) - cos*Rc  (от −b до 0); нижняя — зеркальная
  const upper = poly.map((p) => [p[0], p[1]]);
  const lower = upper.slice().reverse().map((p) => [p[0], -p[1]]);
  const full = upper.concat(lower.slice(1, -1));
  const r = ANG.map((ang) => rayHit(full, [0, 0], ang));
  return { a, b, upper, lower, r };
})();
function almondR(ang) {
  let x = (((ang % TAU) + TAU) % TAU) / TAU * NI;
  const i = Math.floor(x) % NI, f = x - Math.floor(x);
  return lerp(ALMOND.r[i], ALMOND.r[(i + 1) % NI], f);
}
// k: 0 — миндаль (центр cx,cy, поворот rho), 1 — естественная форма импланта
function almondToImplant(k, rho, cx, cy, scale = 1) {
  const c = [lerp(cx, IMPL.c0[0], k), lerp(cy, IMPL.c0[1], k)];
  return ANG.map((a, i) => {
    const r = lerp(almondR(a - rho) * scale, IMPL.r0[i], k);
    return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
  });
}

/* ---------- мягкие ткани, зависящие от формы импланта ---------- */
const MA = 90; // точек по передней дуге
function sampleArc(imp) {
  const arc = [];
  for (let k = (3 * NI) / 4; k <= NI + NI / 4; k++) arc.push(imp[k % NI]);
  return resample(arc, MA, false);
}
const thick = (u) => lerp(46, 66, u) + 86 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.92)), 1.25);
const glandFrac = (u) => 0.74 * Math.pow(Math.sin(Math.PI * u), 0.55);
const U_NIP = 0.56;

function breastGeom(imp, capT) {
  const arc = sampleArc(imp);
  const n = normals(arc, false);
  // к краям дуги смещаем направление вперёд — ткань лежит на стенке, а не над имплантом
  const dir = n.map((v, i) => {
    const u = i / (MA - 1), w = 1.3 * Math.pow(Math.abs(u - 0.5) * 2, 3);
    const x = v[0] + w, y = v[1], L = Math.hypot(x, y);
    return [x / L, y / L];
  });
  let skinArc = arc.map((p, i) => { const u = i / (MA - 1), d = thick(u); return [p[0] + dir[i][0] * d, p[1] + dir[i][1] * d]; });
  skinArc = laplace(skinArc, 3);
  // полный контур кожи: верх грудной клетки → молочная железа → субмаммарная складка → живот
  const i0 = 5, i1 = MA - 6;
  const topY = skinArc[i0][1] - 46, botY = Math.max(skinArc[i1][1] + 44, 1100);
  const top = [], bot = [];
  for (let y = -80; y < topY; y += 22) top.push([cw(y) + 44, y]);
  for (let y = botY; y <= 2000; y += 22) bot.push([cw(y) + 40, y]);
  let skin = top.concat(skinArc.slice(i0, i1 + 1), bot);
  skin = laplace(skin, 5);
  // сосок и ареола
  const nipI = top.length + Math.round(U_NIP * (MA - 1)) - i0;
  const sn = normals(skin, false);
  skin = skin.map((p, i) => {
    const d = i - nipI, bump = 15 * Math.exp(-(d * d) / 2.2) + 4 * Math.exp(-(d * d) / 14);
    return [p[0] + sn[i][0] * bump, p[1] + sn[i][1] * bump];
  });
  // железистая ткань между капсулой и подкожным жиром
  const skinAll = skinArc; // соответствие по u
  const gIn = arc.map((p, i) => [p[0] + n[i][0] * (capT + 5), p[1] + n[i][1] * (capT + 5)]);
  const gOut = gIn.map((p, i) => {
    const u = i / (MA - 1), f = glandFrac(u);
    return [lerp(p[0], skinAll[i][0], f), lerp(p[1], skinAll[i][1], f)];
  });
  const fatRegion = skin.concat([[cw(2000) - 2, 2000]]);
  for (let y = 2000; y >= -80; y -= 25) fatRegion.push([cw(y) + 1, y]);
  return { arc, n, dir, skin, skinArc, gIn, gOut, nip: skin[nipI], nipI, fatRegion, topLen: top.length, i0 };
}
// точка в ткани по параметрам: u — вдоль дуги, v — поперёк слоя
function uvGland(G, u, v) {
  const x = u * (MA - 1), i = Math.min(MA - 2, Math.floor(x)), f = x - i;
  const a = [lerp(G.gIn[i][0], G.gIn[i + 1][0], f), lerp(G.gIn[i][1], G.gIn[i + 1][1], f)];
  const b = [lerp(G.gOut[i][0], G.gOut[i + 1][0], f), lerp(G.gOut[i][1], G.gOut[i + 1][1], f)];
  return [lerp(a[0], b[0], v), lerp(a[1], b[1], v)];
}
function uvFat(G, u, v) {
  const x = u * (MA - 1), i = Math.min(MA - 2, Math.floor(x)), f = x - i;
  const a = [lerp(G.gOut[i][0], G.gOut[i + 1][0], f), lerp(G.gOut[i][1], G.gOut[i + 1][1], f)];
  const b = [lerp(G.skinArc[i][0], G.skinArc[i + 1][0], f), lerp(G.skinArc[i][1], G.skinArc[i + 1][1], f)];
  return [lerp(a[0], b[0], v), lerp(a[1], b[1], v)];
}

// предгенерированные «зёрна» тканей
const TEX = (() => {
  const r = rng(11);
  const fat = [], lob = [], lig = [], alv = [], ribs = [];
  for (let i = 0; i < 70; i++) fat.push({ u: 0.04 + r() * 0.92, v: 0.12 + r() * 0.76, s: 5 + r() * 6, a: r() * TAU });
  for (let i = 0; i < 16; i++) {
    const acini = [];
    for (let j = 0; j < 7; j++) acini.push([(r() - 0.5) * 16, (r() - 0.5) * 16, 3.5 + r() * 3]);
    lob.push({ u: 0.12 + r() * 0.76, v: 0.3 + r() * 0.5, acini });
  }
  for (let i = 0; i < 8; i++) lig.push({ u: 0.1 + (i / 7) * 0.8 + (r() - 0.5) * 0.04, du: (r() - 0.5) * 0.03 });
  for (let i = 0; i < 40; i++) alv.push([r() * 150, r() * 1920, 5 + r() * 9]);
  for (let i = 0; i < 8; i++) ribs.push({ y: 330 + i * 152 + (r() - 0.5) * 8, rot: -0.35 + (r() - 0.5) * 0.08 });
  return { fat, lob, lig, alv, ribs };
})();

/* ---------- отрисовка ---------- */
function drawChestWall(ctx, rv) {
  const wa = rv.wall === undefined ? 1 : rv.wall;
  if (wa <= 0) return;
  ctx.save(); ctx.globalAlpha *= wa;
  _drawChestWall(ctx, rv);
  ctx.restore();
}
function _drawChestWall(ctx, rv) {
  const aL = rv.fills, aS = rv.base;
  // лёгкое и плевра
  if (aL > 0) {
    ctx.save(); ctx.globalAlpha *= aL;
    ctx.fillStyle = PAL.lung;
    ctx.beginPath(); ctx.moveTo(-40, -80);
    for (let y = -80; y <= 2000; y += 40) ctx.lineTo(cw(y) - 150 + 6 * Math.sin(y / 90), y);
    ctx.lineTo(-40, 2000); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = PAL.lungLine; ctx.lineWidth = 1.4;
    for (const [x, y, r] of TEX.alv) { if (x < cw(y) - 165) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); } }
    ctx.restore();
  }
  const pleura = [];
  for (let y = -80; y <= 2000; y += 40) pleura.push([cw(y) - 150 + 6 * Math.sin(y / 90), y]);
  strokeSmooth(ctx, polyPartial(pleura, aS), PAL.lungLine, 2.2, 1);

  // межрёберные мышцы и рёбра
  const R = TEX.ribs;
  for (let i = 0; i < R.length - 1; i++) {
    const a = R[i], b = R[i + 1], x = cw(a.y) - 110, x2 = cw(b.y) - 110;
    ctx.save(); ctx.globalAlpha *= aL * 0.9; ctx.fillStyle = PAL.muscleLight;
    ctx.beginPath();
    ctx.moveTo(x - 18, a.y + 14); ctx.quadraticCurveTo((x + x2) / 2 - 26, (a.y + b.y) / 2, x2 - 18, b.y - 14);
    ctx.lineTo(x2 + 26, b.y - 16); ctx.quadraticCurveTo((x + x2) / 2 + 20, (a.y + b.y) / 2, x + 26, a.y + 16);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  R.forEach((rb, i) => {
    const x = cw(rb.y) - 110, pr = clamp(aS * 1.6 - i * 0.08);
    if (pr <= 0) return;
    ctx.save(); ctx.translate(x, rb.y); ctx.rotate(rb.rot);
    ctx.globalAlpha *= E.out(pr);
    ctx.fillStyle = PAL.bone; ctx.beginPath(); ctx.ellipse(0, 0, 44, 27, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = PAL.marrow; ctx.beginPath(); ctx.ellipse(0, 0, 33, 17, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = PAL.boneLine;
    for (let j = 0; j < 9; j++) { ctx.beginPath(); ctx.arc(-24 + j * 6, Math.sin(j * 2.3) * 7, 1.6, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = PAL.boneLine; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.ellipse(0, 0, 44, 27, 0, -Math.PI, -Math.PI + TAU * pr); ctx.stroke();
    ctx.restore();
  });

  // большая грудная мышца
  const mt = (y) => 60 * Math.pow(clamp(Math.sin((Math.PI * (y - 300)) / 900)), 0.55);
  const front = [], back = [];
  for (let y = 300; y <= 1200; y += 20) { front.push([cw(y), y]); back.push([cw(y) - mt(y), y]); }
  if (aL > 0) {
    const band = front.concat(back.slice().reverse());
    ctx.save(); ctx.globalAlpha *= aL;
    ctx.fillStyle = PAL.muscle; ctx.beginPath(); polyPath(ctx, band, true); ctx.fill();
    ctx.clip();
    ctx.strokeStyle = PAL.muscleDark; ctx.lineWidth = 1.3; ctx.globalAlpha *= 0.55;
    for (let j = 1; j < 6; j++) {
      const f = j / 6;
      ctx.beginPath();
      for (let y = 300; y <= 1200; y += 20) { const x = lerp(cw(y) - mt(y), cw(y), f) + 1.5 * Math.sin(y / 23 + j); y === 300 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
  }
  strokeSmooth(ctx, polyPartial(back, aS), PAL.muscleDark, 2.4);
  strokeSmooth(ctx, polyPartial(front, aS), PAL.muscleDark, 2.4);
}

function drawSoftTissue(ctx, G, S) {
  const aF = S.rv.fills, aG = S.rv.gland;
  // подкожный жир — вся область под кожей
  if (aF > 0) {
    ctx.save(); ctx.globalAlpha *= aF;
    ctx.fillStyle = PAL.fat; ctx.beginPath(); polyPath(ctx, G.fatRegion, true); ctx.fill();
    ctx.strokeStyle = PAL.fatLine; ctx.lineWidth = 1.5;
    for (const f of TEX.fat) {
      const p = uvFat(G, f.u, f.v);
      ctx.beginPath(); ctx.ellipse(p[0], p[1], f.s * 1.15, f.s, f.a, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
  // железистая ткань
  if (aG > 0) {
    const poly = G.gOut.concat(G.gIn.slice().reverse());
    ctx.save(); ctx.globalAlpha *= aG;
    ctx.fillStyle = PAL.gland; ctx.beginPath(); smoothPath(ctx, poly, true); ctx.fill();
    // протоки к соску
    ctx.strokeStyle = PAL.duct; ctx.lineWidth = 2; ctx.lineCap = 'round';
    TEX.lob.forEach((l, i) => {
      if (i % 2) return;
      const p = uvGland(G, l.u, l.v), q = G.nip, m = uvGland(G, lerp(l.u, U_NIP, 0.55), 0.9);
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(m[0], m[1], q[0] - 8, q[1]); ctx.stroke();
    });
    // дольки (ацинусы)
    for (const l of TEX.lob) {
      const p = uvGland(G, l.u, l.v);
      for (const a of l.acini) {
        ctx.fillStyle = PAL.glandDark; ctx.beginPath(); ctx.arc(p[0] + a[0], p[1] + a[1], a[2] + 1.2, 0, TAU); ctx.fill();
      }
      for (const a of l.acini) {
        ctx.fillStyle = mix(PAL.gland, '#ffffff', 0.25); ctx.beginPath(); ctx.arc(p[0] + a[0], p[1] + a[1], a[2] - 0.4, 0, TAU); ctx.fill();
      }
    }
    ctx.strokeStyle = PAL.glandDark; ctx.lineWidth = 1.6;
    ctx.beginPath(); smoothPath(ctx, G.gOut, false); ctx.stroke();
    ctx.restore();
    // связки Купера
    ctx.save(); ctx.globalAlpha *= aG * 0.8; ctx.strokeStyle = PAL.fatLine; ctx.lineWidth = 1.6;
    for (const l of TEX.lig) {
      const a = uvFat(G, l.u, 0.02), b = uvFat(G, l.u + l.du, 0.97);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    ctx.restore();
  }
}

// капсула: плотность, толщина, натяжение волокон, «нагрев» до йодного цвета
function drawCapsule(ctx, imp, S) {
  const T = S.capT;
  if (T <= 0.3 || S.capA <= 0) return;
  const nrm = normals(imp, true);
  const outer = offsetPoly(imp, T, true, nrm);
  const heat = S.heat;
  ctx.save(); ctx.globalAlpha *= S.capA;
  ctx.fillStyle = mix(PAL.capsule, PAL.iodineSoft, heat);
  ctx.beginPath(); smoothPath(ctx, outer, true); ctx.fill();
  // волокна коллагена — параллельно поверхности; «гофр» расправляется при натяжении
  const nf = clamp(Math.round(T / 4.2), 1, 7);
  const crimp = (1 - S.tension) * Math.min(2.4, 0.9 + T * 0.12);
  ctx.strokeStyle = mix(PAL.capsuleFiber, PAL.iodine, heat);
  ctx.lineWidth = lerp(1.2, 1.7, heat);
  for (let j = 0; j < nf; j++) {
    const d0 = (T * (j + 0.6)) / (nf + 0.2);
    const ph = j * 1.7 + (S.t || 0) * 0.3;
    const fib = imp.map((p, i) => {
      const d = d0 + crimp * Math.sin(i * 0.9 + ph);
      return [p[0] + nrm[i][0] * d, p[1] + nrm[i][1] * d];
    });
    ctx.globalAlpha = S.capA * lerp(0.55, 0.85, heat);
    ctx.beginPath(); polyPath(ctx, fib, true); ctx.stroke();
  }
  ctx.globalAlpha = S.capA;
  ctx.strokeStyle = mix(PAL.inkMuted, PAL.iodine, heat); ctx.lineWidth = lerp(1.5, 2.6, heat);
  ctx.beginPath(); smoothPath(ctx, outer, true); ctx.stroke();
  ctx.restore();
}

function drawImplant(ctx, pts, S) {
  const a = S.implA === undefined ? 1 : S.implA;
  if (a <= 0) return;
  const c = centroid(pts);
  ctx.save(); ctx.globalAlpha *= a;
  const g = ctx.createRadialGradient(c[0] + 40, c[1] - 70, 20, c[0], c[1], 260);
  g.addColorStop(0, PAL.gelHi); g.addColorStop(0.45, PAL.gel); g.addColorStop(1, PAL.gel2);
  ctx.fillStyle = g;
  ctx.beginPath(); smoothPath(ctx, pts, true); ctx.fill();
  // слои геля и блик
  const nrm = normals(pts, true);
  ctx.strokeStyle = rgba(PAL.gel2, 0.9); ctx.lineWidth = 1.4; ctx.setLineDash([2, 9]);
  ctx.beginPath(); polyPath(ctx, offsetPoly(pts, -34, true, nrm), true); ctx.stroke();
  ctx.setLineDash([]);
  const inset = offsetPoly(pts, -16, true, nrm), hi = [];
  for (let k = Math.round(NI * 0.8); k <= Math.round(NI * 1.04); k++) hi.push(inset[k % NI]);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); smoothPath(ctx, hi, false); ctx.stroke();
  ctx.restore();
  strokeSmooth(ctx, pts, PAL.shell, 3.2, a, true);
}

function drawSkin(ctx, G, prog) {
  const part = polyPartial(G.skin, prog);
  if (part.length < 2) return;
  strokeSmooth(ctx, part, PAL.ink, 12);
  strokeSmooth(ctx, part, PAL.skin, 7.5);
  // ареола
  const a0 = Math.max(0, G.nipI - 4), a1 = Math.min(part.length - 1, G.nipI + 4);
  if (a1 > a0) strokeSmooth(ctx, part.slice(a0, a1 + 1), PAL.skinDark, 7.5);
}

// полная сцена общего плана
function drawMacro(ctx, S) {
  const imp = implantPts(S.m, S.wob, S.folds, S.t);
  const G = breastGeom(imp, S.capT);
  drawChestWall(ctx, S.rv);
  drawSoftTissue(ctx, G, S);
  drawCapsule(ctx, imp, S);
  if (S.implOverride) S.implOverride(ctx); else drawImplant(ctx, imp, S);
  drawSkin(ctx, G, S.rv.skin);
  return { imp, G };
}
