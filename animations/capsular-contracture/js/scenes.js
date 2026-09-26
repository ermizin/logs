'use strict';
/* Режиссура: таймлайн, камера, переходы в «линзу», шкала Бейкера, финал с закольцовкой. */

const DUR = 59.0;
const C0 = [540, 800];
const HOOK = { s: 0.92, ox: 10, oy: 150 };
const MAIN = { s: 1.08, ox: 40, oy: -22 };
const LENS = [540, 780], LENS_R = 385, LK = LENS_R / 400;
const ZS = 7.5;
const ZF = { in0: 5.6, in1: 6.8, out0: 17.2, out1: 18.4, tau0: 6.5, ep: 'F' };
const ZK = { in0: 27.4, in1: 28.6, out0: 36.4, out1: 37.6, tau0: 28.3, ep: 'K' };
const PULSES = [41.0, 43.0, 45.4];
const BREAST_C = [470, 800];

// точка границы имплант–ткань, куда «ныряет» камера
const KQ = 162;
const QW = IMPL.nat[KQ];
const NQ = normals(IMPL.nat, true)[KQ];
const ROT = -Math.PI / 2 - Math.atan2(NQ[1], NQ[0]);

/* ---------- состояние общего плана ---------- */
function macroS(t) {
  const pk = PULSES.map((p) => E.outBackS(invLerp(p, p + 0.8, t)));
  const S = { t, rv: {}, capA: 1 };
  S.rv.base = P(t, 0.7, 2.2, E.inOut);
  S.rv.fills = P(t, 1.1, 2.4, E.out);
  S.rv.gland = P(t, 1.4, 2.6, E.out);
  S.rv.skin = P(t, 0.9, 2.3, E.inOut);
  S.rv.wall = 1;
  S.capT = lerp(0, 6, P(t, 17.9, 19.6)) + 7 * P(t, 36.8, 39.4) + 4 * (pk[0] + pk[1] + pk[2]);
  const smoulder = 0.08 * (0.5 + 0.5 * Math.sin(t * 3.4)) * env(t, 22.0, 27.4, 0.6, 0.4);
  S.heat = clamp(0.22 * P(t, 22.0, 23.6) + 0.33 * P(t, 36.8, 39.4) + 0.15 * (pk[0] + pk[1] + pk[2]) + smoulder);
  S.tension = clamp(0.55 * P(t, 36.8, 39.4) + 0.15 * (pk[0] + pk[1] + pk[2]));
  S.m = 0.15 * P(t, 37.2, 39.6) + 0.3 * pk[0] + 0.3 * pk[1] + 0.25 * pk[2];
  S.wob = 7 * ring(t, 1.9, 1.6, 2.6) + PULSES.reduce((s, p) => s + 6 * ring(t, p + 0.15, 2.0, 3.2), 0);
  S.folds = 3.2 * P(t, 45.6, 46.8);
  S.pk = pk;
  return S;
}
function gradeS(g, t) {
  const S = { t, rv: { base: 1, fills: 1, gland: 1, skin: 1, wall: 0.45 }, capA: 1 };
  S.m = [0, 0.3, 0.65, 1][g]; S.capT = [5, 11, 18, 25][g]; S.heat = [0, 0.35, 0.7, 1][g];
  S.tension = [0, 0.4, 0.8, 1][g]; S.folds = g === 3 ? 3.2 : 0; S.wob = 0;
  return S;
}

/* ---------- камера ---------- */
function framing(t) {
  const k = P(t, 3.4, 4.4, E.inOutQ);
  const s = lerp(HOOK.s, MAIN.s, k);
  const ox = lerp(HOOK.ox, MAIN.ox, k) + 2.5 * Math.sin(t * 0.47);
  const kick = PULSES.reduce((a, p) => a + 6 * ring(t, p + 0.05, 2.6, 6), 0);
  const oy = lerp(HOOK.oy, MAIN.oy, k) + 3 * Math.sin(t * 0.61 + 1) + kick;
  return { M: Mx.chain(Mx.T(C0[0] + ox, C0[1] + oy), Mx.S(s), Mx.T(-C0[0], -C0[1])), s };
}
function zoomState(t) {
  for (const Z of [ZF, ZK]) {
    if (t >= Z.in0 - 1.2 && t <= Z.out1 + 0.6) {
      const u = t < Z.out0 ? P(t, Z.in0, Z.in1, E.inOutQ) : 1 - P(t, Z.out0, Z.out1, E.inOutQ);
      return { Z, u };
    }
  }
  return null;
}
function zoomMatrix(Mf, u) {
  const Qm = Mx.ap(Mf, QW);
  const Lt = [LENS[0], LENS[1] + 150 * LK];
  const zs = Math.exp(u * Math.log(ZS));
  const cen = [lerp(Qm[0], Lt[0], u), lerp(Qm[1], Lt[1], u)];
  return Mx.chain(Mx.T(cen[0], cen[1]), Mx.R(ROT * u), Mx.S(zs), Mx.T(-Qm[0], -Qm[1]), Mf);
}

/* ---------- заставка: пунктир-миндаль → имплант ---------- */
const ALM_W = [C0[0] + (540 - C0[0] - HOOK.ox) / HOOK.s, C0[1] + (880 - C0[1] - HOOK.oy) / HOOK.s], ALM_S = 1 / HOOK.s;
function almondIntro(t) {
  if (t >= 1.95) return null;
  return (ctx) => {
    const w = 8 / HOOK.s, dash = [24 / HOOK.s, 18 / HOOK.s];
    if (t < 0.62) {
      const pr = P(t, 0.0, 0.6, E.inOut);
      const up = ALMOND.upper.map((p) => [ALM_W[0] + p[0] * ALM_S, ALM_W[1] + p[1] * ALM_S]);
      const lo = ALMOND.lower.slice().reverse().map((p) => [ALM_W[0] + p[0] * ALM_S, ALM_W[1] + p[1] * ALM_S]);
      markerLine(ctx, up, { dash, width: w, progress: pr });
      markerLine(ctx, lo, { dash, width: w, progress: pr });
      return;
    }
    const k = P(t, 0.6, 1.9, E.inOutQ), rho = (-Math.PI / 2) * P(t, 0.55, 1.7, E.inOut);
    const pts = almondToImplant(k, rho, ALM_W[0], ALM_W[1], ALM_S);
    drawImplant(ctx, pts, { implA: P(t, 1.2, 1.95) });
    markerLine(ctx, pts, { dash, width: w, closed: true, alpha: 1 - P(t, 1.2, 1.9) });
  };
}

/* ---------- наложения в мировых координатах ---------- */
function worldOverlays(ctx, t, S, geo) {
  const imp = geo.imp, nrm = normals(imp, true);
  // «тлеющее» воспаление
  const g = env(t, 22.0, 27.4, 0.6, 0.4);
  if (g > 0) {
    const outer = offsetPoly(imp, S.capT + 2, true, nrm);
    ctx.save(); ctx.strokeStyle = rgba(PAL.iodine, (0.12 + 0.14 * (0.5 + 0.5 * Math.sin(t * 3.4))) * g);
    ctx.lineWidth = 16; ctx.lineJoin = 'round';
    ctx.beginPath(); smoothPath(ctx, outer, true); ctx.stroke(); ctx.restore();
  }
  // блик пробегает по только что сформированной капсуле
  const sh = invLerp(18.7, 20.0, t);
  if (sh > 0 && sh < 1) {
    const mid = offsetPoly(imp, S.capT * 0.5, true, nrm), seg = [];
    const c = Math.round(lerp(NI * 0.72, NI * 1.26, E.inOut(sh)));
    for (let k = c - 9; k <= c + 9; k++) seg.push(mid[((k % NI) + NI) % NI]);
    strokeSmooth(ctx, seg, '#ffffff', 5, Math.sin(sh * Math.PI) * 0.95);
  }
  // «мешок на шнурке»: стрелки внутрь
  const aa = env(t, 36.9, 47.8, 0.5, 0.6);
  if (aa > 0) {
    const kick = PULSES.reduce((s, p) => s + Math.max(0, ring(t, p, 1.2, 3)), 0) + Math.max(0, ring(t, 37.6, 1.2, 3)) + Math.max(0, ring(t, 38.8, 1.2, 3));
    ctx.save(); ctx.strokeStyle = PAL.inkMuted; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let k = 0; k < NI; k += 15) {
      const ang = ANG[k];
      if (Math.cos(ang) < -0.25) continue;
      const p = imp[k], n = nrm[k];
      const r0 = S.capT + 58 + 10 * kick, r1 = S.capT + 18 + 6 * kick;
      const a = [p[0] + n[0] * r0, p[1] + n[1] * r0], b = [p[0] + n[0] * r1, p[1] + n[1] * r1];
      ctx.globalAlpha = aa * 0.7;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      const tx = -n[1], ty = n[0];
      ctx.moveTo(b[0] + n[0] * 11 + tx * 8, b[1] + n[1] * 11 + ty * 8); ctx.lineTo(b[0], b[1]); ctx.lineTo(b[0] + n[0] * 11 - tx * 8, b[1] + n[1] * 11 - ty * 8);
      ctx.stroke();
    }
    ctx.restore();
  }
  // исходная форма — пунктиром маркера
  const ga = env(t, 39.9, 48.2, 0.15, 0.6);
  if (ga > 0) markerLine(ctx, IMPL.nat, { dash: [24, 18], closed: true, progress: P(t, 39.9, 40.9, E.inOut), alpha: ga });
}

/* ---------- подписи общего плана (в экранных координатах) ---------- */
function macroLabels(ctx, t, Mc, S, geo) {
  const map = (p) => Mx.ap(Mc, p);
  const lab = (anchor, dx, dy, text, t0, t1, align = 'left') => {
    const a = map(anchor);
    callout(ctx, a, [a[0] + dx, a[1] + dy], text, invLerp(t0, t0 + 0.7, t), env(t, t0, t1, 0.01, 0.35), align);
  };
  lab([IMPL.c0[0] + 30, IMPL.c0[1] + 70], 250, 120, 'имплант', 2.0, 5.3);
  lab(uvGland(geo.G, 0.4, 0.6), 150, -120, 'железа', 2.3, 5.3);
  lab([cw(780) - 28, 780], -50, 150, 'мышца', 2.6, 5.3, 'right');
  // капсула — пометка маркером
  const nrm = normals(geo.imp, true);
  const kc = 151, pc = geo.imp[kc], nc = nrm[kc];
  const cap = map([pc[0] + nc[0] * (S.capT + 4), pc[1] + nc[1] * (S.capT + 4)]);
  markerNote(ctx, [790, 548], [cap[0] + 10, cap[1] - 8], 'капсула', [744, 520], invLerp(18.8, 20.0, t), env(t, 18.8, 21.8, 0.01, 0.4));
  // версии причин
  const ca = env(t, 25.5, 27.3, 0.3, 0.3);
  if (ca > 0) {
    ['БИОПЛЁНКА', 'ГЕМАТОМА', 'ОБЛУЧЕНИЕ'].forEach((s, i) => chip(ctx, 712, 452 + i * 62, s, ca * E.out(invLerp(25.6 + i * 0.25, 26.0 + i * 0.25, t))));
  }
  // «шар»
  const ks = 158, ps = geo.imp[ks], ns = nrm[ks];
  const sp = map([ps[0] + ns[0] * (S.capT + 10), ps[1] + ns[1] * (S.capT + 10)]);
  markerNote(ctx, [806, 492], [sp[0] + 12, sp[1] - 10], 'шар', [800, 468], invLerp(43.4, 44.5, t), env(t, 43.4, 47.9, 0.01, 0.4));
  // масштаб
  const sa = Math.max(env(t, 4.4, 5.4, 0.4, 0.3), env(t, 18.8, 27.0, 0.4, 0.3), env(t, 37.8, 48.0, 0.4, 0.3));
  const fr = framing(t);
  scaleBar(ctx, 800, 1160, 37 * fr.s, '1 СМ', sa * 0.9);
}

/* ---------- линза: переход в микромир ---------- */
function microLabels(ctx, Z, tau, MM, a) {
  if (a <= 0) return;
  const L = (anchor, pos, text, t0, t1, align = 'left') =>
    callout(ctx, Mx.ap(MM, anchor), Mx.ap(MM, pos), text, invLerp(t0, t0 + 0.6, tau), env(tau, t0, t1, 0.01, 0.35) * a, align);
  if (Z.ep === 'F') {
    L([-60, surfY(-60) - 9], [-190, -70], 'белки плазмы', 1.1, 3.4);
    L([-290, surfY(-290) - 30], [-320, -150], 'макрофаг', 3.9, 5.9);
    L([10, surfY(10) - 34], [-150, -170], 'гигантская клетка', 6.3, 8.1);
    const fx = lerp(-470, 470, P(tau, 7.3, 9.9, E.inOut));
    L([fx, surfY(fx) - 52], [fx - 40, -250], 'фибробласт', 7.8, 9.4);
    L([160, surfY(160) - 60], [120, -210], 'коллаген', 9.4, 10.9);
  } else {
    const con = P(tau, 4.4, 8.4), dens = lerp(1, 0.84, con), sq = con * 0.9;
    L([-250, surfY(-250) - 26], [-330, -150], 'биоплёнка', 0.9, 3.2);
    L([60 * (1 - 0.16 * sq), surfY(60) - 150 * dens], [-80, -300], 'миофибробласт', 3.0, 5.2);
    L([230 * (1 - 0.16 * sq) + 26, surfY(230) - 88 * dens], [150, -250], 'α-SMA', 5.2, 8.2);
  }
}
function drawLens(ctx, t, zs, Mf) {
  const { Z, u } = zs;
  const Qm = Mx.ap(Mf, QW);
  const lc = [lerp(Qm[0], LENS[0], u), lerp(Qm[1], LENS[1], u)];
  const lr = lerp(66, LENS_R, E.inOut(u));
  const tau = Math.max(0, t - Z.tau0);
  if (u > 0.001) {
    ctx.save();
    ctx.fillStyle = rgba(PAL.surface, 0.82 * u);
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(lc[0], lc[1], lr, 0, TAU, true); ctx.fill('evenodd');
    ctx.strokeStyle = rgba(PAL.ink, 0.07 * u); ctx.lineWidth = 22;
    ctx.beginPath(); ctx.arc(lc[0], lc[1], lr + 14, 0, TAU); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.arc(lc[0], lc[1], lr, 0, TAU); ctx.clip();
    const dolly = 1 + 0.045 * E.inOut(clamp(tau / 10));
    const MM = Mx.chain(Mx.T(lc[0], lc[1]), Mx.R(-ROT * (1 - u)), Mx.S((lr / 400) * dolly), Mx.T(0, -150 * (1 - u)));
    ctx.save(); ctx.transform(...MM); ctx.globalAlpha = clamp(u * 3);
    drawMicro(ctx, Z.ep, tau);
    ctx.restore();
    ctx.save(); ctx.transform(...Mx.chain(Mx.T(lc[0], lc[1]), Mx.S(lr / 400)));
    drawLensChrome(ctx, 400, clamp(u * 2 - 1));
    ctx.restore();
    ctx.restore();
    microLabels(ctx, Z, tau, MM, clamp(u * 2 - 1));
  }
  // обводка маркером становится оправой линзы
  const pre = P(t, Z.in0 - 0.62, Z.in0 - 0.05, E.inOut);
  const post = 1 - P(t, Z.out1, Z.out1 + 0.45);
  if (pre > 0 && post > 0) markerLine(ctx, handEllipse(lc[0], lc[1], lr + 12, lr + 12, Z.ep === 'F' ? 3 : 7), { progress: pre, alpha: post });
}

/* ---------- шкала Бейкера и финал ---------- */
const SLOT = { w: 206, h: 320, y: 790, xs: [160, 383, 606, 829], sc: 0.36 };
const GRADE = [
  { n: 'I', d: ['мягкая'] }, { n: 'II', d: ['плотная'] },
  { n: 'III', d: ['деформация'] }, { n: 'IV', d: ['твёрдая,', 'болит'] },
];
function slotMatrix(cx, cy, sc) { return Mx.chain(Mx.T(cx, cy), Mx.S(sc), Mx.T(-BREAST_C[0], -BREAST_C[1])); }
function drawCard(ctx, cx, cy, w, h, alpha, S, sc, clipR = 32, bg = true) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, clipR);
  if (bg) { ctx.fillStyle = PAL.surface2; ctx.fill(); }
  ctx.clip();
  ctx.transform(...slotMatrix(cx, cy, sc));
  drawMacro(ctx, S);
  ctx.restore();
}
function gradeLabel(ctx, g, cx, top, alpha, scale = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  font(ctx, 500, 72 * scale, 'serif', true); ctx.fillStyle = g >= 2 ? PAL.iodine : PAL.ink;
  ctx.fillText(GRADE[g].n, cx, top + 70 * scale);
  font(ctx, 500, 32 * scale); ctx.fillStyle = PAL.ink;
  GRADE[g].d.forEach((l, i) => ctx.fillText(l, cx, top + (118 + i * 38) * scale));
  ctx.restore();
}
function drawBaker(ctx, t, Mf) {
  const e = P(t, 48.2, 49.4, E.inOutQ);
  const out = P(t, 53.4, 54.2, E.inOut); // II, III уходят
  const mv = P(t, 53.8, 55.0, E.inOutQ); // I и IV разъезжаются и растут
  const endA = 1 - P(t, 57.0, 57.5, E.inOut);
  const big = lerp(1, 1.3, mv);
  const yEnd = lerp(SLOT.y, 900, mv);
  // заголовок шкалы
  const ta = env(t, 48.6, 53.6, 0.6, 0.4);
  if (ta > 0) {
    const k = E.outQ(invLerp(48.6, 49.3, t));
    ctx.save(); ctx.beginPath(); ctx.rect(0, 452, W, 120); ctx.clip();
    ctx.globalAlpha = ta; ctx.translate(0, (1 - k) * 90); ctx.textBaseline = 'alphabetic';
    font(ctx, 700, 64); ctx.fillStyle = PAL.ink; ctx.fillText('Шкала', 60, 548);
    const w = ctx.measureText('Шкала ').width;
    font(ctx, 500, 70, 'serif', true); ctx.fillText('Бейкера', 60 + w, 548);
    ctx.restore();
  }
  // IV — это «наш» общий план, уменьшенный в карточку
  const S4 = macroS(t); S4.rv.wall = lerp(1, 0.45, e);
  const x4 = lerp(SLOT.xs[3], 780, mv);
  if (e < 1) {
    const mainPos = Mx.ap(Mf.M, BREAST_C);
    const pos = [lerp(mainPos[0], x4, e), lerp(mainPos[1], SLOT.y, e)];
    const sc = Math.exp(lerp(Math.log(Mf.s), Math.log(SLOT.sc), e));
    const w = lerp(W * 2.2, SLOT.w, e), h = lerp(H * 2.2, SLOT.h, e);
    ctx.save();
    roundRect(ctx, pos[0] - w / 2, pos[1] - h / 2, w, h, lerp(0, 32, e));
    ctx.fillStyle = rgba(PAL.surface2, e); ctx.fill(); ctx.clip();
    ctx.transform(...Mx.chain(Mx.T(pos[0], pos[1]), Mx.S(sc), Mx.T(-BREAST_C[0], -BREAST_C[1])));
    drawMacro(ctx, S4);
    ctx.restore();
    ctx.save(); roundRect(ctx, pos[0] - w / 2, pos[1] - h / 2, w, h, lerp(0, 32, e)); ctx.clip();
    ctx.globalAlpha = 1 - e; edgeFade(ctx); ctx.restore();
  } else {
    drawCard(ctx, x4, yEnd, SLOT.w * big, SLOT.h * big, endA, S4, SLOT.sc * big);
  }
  // I–III
  for (let g = 0; g < 3; g++) {
    const a = E.out(invLerp(48.9 + g * 0.15, 49.5 + g * 0.15, t));
    if (a <= 0) continue;
    let x = SLOT.xs[g], alpha = a, sc = 1;
    if (g === 0) { x = lerp(SLOT.xs[0], 300, mv); sc = big; alpha = a * (t < 57.0 ? 1 : 1 - P(t, 57.0, 57.4)); }
    else alpha = a * (1 - out);
    const y = (g === 0 ? yEnd : SLOT.y) + (1 - a) * 40;
    drawCard(ctx, x, y, SLOT.w * sc, SLOT.h * sc, alpha, gradeS(g, t), SLOT.sc * sc);
    gradeLabel(ctx, g, x, y + (SLOT.h * sc) / 2 + 6, alpha, g === 0 ? lerp(1, 1.1, mv) : 1);
  }
  gradeLabel(ctx, 3, x4, yEnd + (SLOT.h * big) / 2 + 6, E.out(invLerp(49.2, 49.8, t)) * endA, lerp(1, 1.1, mv));
  // III–IV — операция
  const bp = invLerp(50.9, 51.7, t), ba = env(t, 50.9, 53.5, 0.01, 0.4);
  if (bp > 0 && ba > 0) {
    const x0 = SLOT.xs[2] - SLOT.w / 2 + 8, x1 = SLOT.xs[3] + SLOT.w / 2 - 8, y = SLOT.y + SLOT.h / 2 + 176;
    markerLine(ctx, [[x0, y - 22], [x0 + 2, y], [(x0 + x1) / 2, y + 3], [x1 - 2, y], [x1, y - 22]], { progress: E.inOut(bp), alpha: ba });
  }
}

/* ---------- финальная фраза и закольцовка ---------- */
function drawOutro(ctx, t) {
  const a = env(t, 54.0, 57.3, 0.01, 0.5);
  if (a > 0) {
    ctx.save(); ctx.textBaseline = 'alphabetic';
    const l1 = E.outQ(invLerp(54.0, 54.6, t)), l2 = E.outQ(invLerp(54.4, 55.0, t)), l3 = E.outQ(invLerp(54.6, 55.2, t));
    const line = (k, y, draw) => { ctx.save(); ctx.beginPath(); ctx.rect(0, y - 92, W, 118); ctx.clip(); ctx.globalAlpha = a; ctx.translate(0, (1 - k) * 100); draw(); ctx.restore(); };
    line(l1, 470, () => {
      font(ctx, 700, 80); ctx.fillStyle = PAL.ink; ctx.fillText('Капсула —', 60, 470);
      const w = ctx.measureText('Капсула — ').width;
      font(ctx, 500, 88, 'serif', true); ctx.fillStyle = PAL.scrub; ctx.fillText('норма.', 60 + w, 470);
    });
    line(l2, 566, () => { font(ctx, 700, 80); ctx.fillStyle = PAL.ink; ctx.fillText('Контрактура —', 60, 566); });
    line(l3, 662, () => { font(ctx, 500, 88, 'serif', true); ctx.fillStyle = PAL.iodine; ctx.fillText('осложнение.', 60, 662); });
    // дисклеймер
    const fa = env(t, 54.6, 57.3, 0.5, 0.5);
    ctx.globalAlpha = fa; font(ctx, 400, 24); ctx.fillStyle = PAL.inkMuted;
    ctx.fillStyle = PAL.line; ctx.fillRect(60, 1386, 900, 2);
    ctx.fillStyle = PAL.inkMuted;
    ctx.fillText('Информация носит образовательный характер', 60, 1428);
    ctx.fillText('и не заменяет очную консультацию врача.', 60, 1460);
    ctx.restore();
  }
  // имплант I → миндаль → стирается слева направо
  if (t >= 57.0) {
    const k = P(t, 57.2, 58.3, E.inOutQ);
    const sc = SLOT.sc * 1.3, M = slotMatrix(300, 900, sc);
    const c0 = Mx.ap(M, IMPL.c0);
    const cen = [lerp(c0[0], 540, k), lerp(c0[1], 880, k)];
    const rho = lerp(-Math.PI / 2, 0, k);
    if (t < 58.35) {
      const pts = ANG.map((ang, i) => {
        const r = lerp(IMPL.r0[i] * sc, almondR(ang - rho), k);
        return [cen[0] + Math.cos(ang) * r, cen[1] + Math.sin(ang) * r];
      });
      strokeSmooth(ctx, pts, PAL.shell, 3.2, 1 - P(t, 57.5, 58.0), true);
      markerLine(ctx, pts, { dash: [24, 18], closed: true, alpha: P(t, 57.3, 57.9) });
    } else {
      const er = P(t, 58.35, 59.0, E.inOut);
      const up = ALMOND.upper.map((p) => [540 + p[0], 880 + p[1]]).reverse();
      const lo = ALMOND.lower.map((p) => [540 + p[0], 880 + p[1]]);
      markerLine(ctx, up, { dash: [24, 18], progress: 1 - er });
      markerLine(ctx, lo, { dash: [24, 18], progress: 1 - er });
    }
  }
}

/* ---------- заголовок-хук ---------- */
function drawHook(ctx, t) {
  if (t < 0.6 || t > 4.1) return;
  const out = E.inOut(invLerp(3.4, 4.0, t));
  const k1 = E.outQ(invLerp(0.65, 1.2, t)), k2 = E.outQ(invLerp(0.8, 1.35, t));
  ctx.save(); ctx.textBaseline = 'alphabetic';
  const line = (k, y, draw) => {
    ctx.save(); ctx.beginPath(); ctx.rect(0, y - 104, W, 136); ctx.clip();
    ctx.globalAlpha = 1 - out; ctx.translate(0, (1 - k) * 112 - out * 60); draw(); ctx.restore();
  };
  let w2 = 0;
  line(k1, 432, () => { font(ctx, 800, 96); ctx.fillStyle = PAL.ink; ctx.fillText('Капсулярная', 56, 432); });
  line(k2, 540, () => { font(ctx, 500, 104, 'serif', true); ctx.fillStyle = PAL.ink; w2 = ctx.measureText('контрактура').width; ctx.fillText('контрактура', 60, 540); });
  font(ctx, 500, 104, 'serif', true); w2 = ctx.measureText('контрактура').width;
  const up = P(t, 1.25, 1.8, E.inOut);
  if (up > 0) {
    const pts = [];
    for (let i = 0; i <= 20; i++) { const s = i / 20; pts.push([64 + s * (w2 - 4), 574 + 5 * Math.sin(s * 5.5) - s * 6]); }
    markerLine(ctx, pts, { progress: up, alpha: 1 - out });
  }
  ctx.restore();
}

/* ---------- бумага ---------- */
let _grain = null, _grainPat = null, _grainCtx = null;
function paperGrain(ctx) {
  if (!_grain) {
    _grain = document.createElement('canvas'); _grain.width = _grain.height = 256;
    const g = _grain.getContext('2d'), img = g.createImageData(256, 256), r = rng(5);
    for (let i = 0; i < img.data.length; i += 4) { const v = r() < 0.5 ? 40 : 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = Math.floor(r() * 16); }
    g.putImageData(img, 0, 0);
  }
  if (_grainCtx !== ctx) { _grainPat = ctx.createPattern(_grain, 'repeat'); _grainCtx = ctx; }
  return _grainPat;
}

// анатомия растворяется в бумаге под HUD и в нижней зоне интерфейса Instagram
function edgeFade(ctx, t = 10) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  const c = (a) => rgba(PAL.surface, a);
  const k = P(t, 3.2, 4.4, E.inOut); // на хуке затухание глубже — под заголовком чисто
  g.addColorStop(0, c(1)); g.addColorStop(lerp(560, 150, k) / H, c(0.97)); g.addColorStop(lerp(640, 300, k) / H, c(0.78)); g.addColorStop(lerp(760, 430, k) / H, c(0));
  g.addColorStop(1360 / H, c(0)); g.addColorStop(1560 / H, c(0.85)); g.addColorStop(1, c(1));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

/* ---------- кадр ---------- */
function render(ctx, time) {
  const t = ((time % DUR) + DUR) % DUR;
  ctx.fillStyle = PAL.surface; ctx.fillRect(0, 0, W, H);
  const fr = framing(t);
  if (t < 48.2) {
    const S = macroS(t);
    const intro = almondIntro(t);
    if (intro) S.implOverride = intro;
    const zs = zoomState(t);
    const Mc = zs ? zoomMatrix(fr.M, zs.u) : fr.M;
    ctx.save(); ctx.transform(...Mc);
    const geo = drawMacro(ctx, S);
    worldOverlays(ctx, t, S, geo);
    ctx.restore();
    edgeFade(ctx, t);
    macroLabels(ctx, t, Mc, S, geo);
    if (zs) drawLens(ctx, t, zs, fr.M);
  } else drawBaker(ctx, t, fr);
  if (t >= 53.8) drawOutro(ctx, t);
  // HUD
  drawTag(ctx, env(t, 0.7, 57.4, 0.4, 0.4));
  drawClock(ctx, t, env(t, 3.8, 48.6, 0.5, 0.4));
  drawNav(ctx, t, env(t, 3.8, 53.8, 0.5, 0.5));
  drawHook(ctx, t);
  drawSubtitles(ctx, t);
  // зерно бумаги и лёгкая виньетка
  ctx.save();
  ctx.fillStyle = paperGrain(ctx); ctx.fillRect(0, 0, W, H);
  const v = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.45, H * 0.78);
  v.addColorStop(0, 'rgba(60,50,30,0)'); v.addColorStop(1, 'rgba(60,50,30,0.07)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* ---------- обложка рилса (ReelCover: текст в зоне y 860–1500, сетка профиля срезает по 240 px) ---------- */
function renderCover(ctx) {
  ctx.fillStyle = PAL.surface; ctx.fillRect(0, 0, W, H);
  const S = gradeS(3, 0); S.rv.wall = 1;
  const M = Mx.chain(Mx.T(560, 560), Mx.S(0.7), Mx.T(-BREAST_C[0], -BREAST_C[1]));
  ctx.save(); ctx.transform(...M);
  drawMacro(ctx, S);
  markerLine(ctx, IMPL.nat, { dash: [24 / 0.7, 18 / 0.7], width: 8 / 0.7, closed: true });
  ctx.restore();
  const g = ctx.createLinearGradient(0, 0, 0, H), c = (a) => rgba(PAL.surface, a);
  g.addColorStop(0, c(1)); g.addColorStop(250 / H, c(0.9)); g.addColorStop(330 / H, c(0));
  g.addColorStop(760 / H, c(0)); g.addColorStop(880 / H, c(1)); g.addColorStop(1, c(1));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  font(ctx, 500, 26, 'mono'); ctx.fillStyle = PAL.ink; spacedText(ctx, 'РАЗБОР', 88, 950, 2.1);
  font(ctx, 700, 96); ctx.fillText('Капсулярная', 84, 1068);
  font(ctx, 500, 104, 'serif', true); const w = ctx.measureText('контрактура').width; ctx.fillText('контрактура', 88, 1170);
  const pts = []; for (let i = 0; i <= 20; i++) { const s2 = i / 20; pts.push([92 + s2 * (w - 4), 1204 + 5 * Math.sin(s2 * 5.5) - s2 * 6]); }
  markerLine(ctx, pts);
  font(ctx, 400, 42); ctx.fillStyle = PAL.inkMuted;
  ctx.fillText('Почему капсула вокруг импланта', 88, 1300);
  ctx.fillText('сжимается и превращает его в шар', 88, 1358);
  ctx.save(); ctx.fillStyle = paperGrain(ctx); ctx.fillRect(0, 0, W, H); ctx.restore();
}
