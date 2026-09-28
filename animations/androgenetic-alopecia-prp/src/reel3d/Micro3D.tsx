// Микромир в линзе, 3D: луковица волоса — сосочек с клетками, матрикс, капилляр.
// Эпизод 'dht': молекулы гормона → фермент → DHT → рецепторы → стоп-сигнал к матриксу.
// Эпизод 'prp': тромбоцит активируется, факторы роста будят клетки, растут сосуды.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {PAL} from '../reel/palette';
import {E, P, clamp, lerp, mix, ring, rng, TAU} from '../reel/math';
import {CamSpec, V3} from './cam';
import {Ball, Clay, Tube, v3} from './prims';

const PAPC: V3 = [0, -0.5, 0];
const PAPS: V3 = [1.35, 1.8, 1.1];

type Cell = {p: V3; r: number; rot: V3; seed: number};

export const MIC3 = (() => {
  const r = rng(2026);
  const fibro: Cell[] = [];
  for (let i = 0; i < 9; i++) {
    const a = r() * TAU;
    const b = (r() - 0.5) * Math.PI;
    const k = 0.25 + r() * 0.55;
    fibro.push({
      p: [PAPC[0] + Math.cos(a) * Math.cos(b) * PAPS[0] * k, PAPC[1] + Math.sin(b) * PAPS[1] * k, PAPC[2] + Math.sin(a) * Math.cos(b) * PAPS[2] * k * 0.8],
      r: 0.3,
      rot: [r() * 0.6, r() * Math.PI, (r() - 0.5) * 0.6],
      seed: 100 + i,
    });
  }
  const matrix: Cell[] = [];
  for (let i = 0; i < 28; i++) {
    const a = Math.PI * 1.03 + (Math.PI * 0.94 * i) / 27;
    const layer = i % 2;
    const rr = layer ? 2.75 : 2.15;
    const z = (r() - 0.5) * 1.4;
    matrix.push({p: [Math.cos(a) * rr * 0.95, PAPC[1] + 0.25 - Math.sin(a) * rr * 0.9, z], r: 0.34 + r() * 0.06, rot: [0, 0, 0], seed: 200 + i});
  }
  const mol = Array.from({length: 9}, (_, i) => {
    const target = fibro[i % fibro.length];
    return {t0: 0.25 + i * 0.16, s: [(r() - 0.5) * 0.4, -2.4 - r() * 0.5, 0.3] as V3, e: [target.p[0], target.p[1] - 0.05, target.p[2] + 0.42] as V3, target: i % fibro.length};
  });
  const bokeh = Array.from({length: 10}, () => ({p: [(r() - 0.5) * 9, (r() - 0.5) * 9, -4 - r() * 3] as V3, r: 0.5 + r() * 0.8, c: r() < 0.5 ? PAL.eosinLight : PAL.slide2}));
  const granules = Array.from({length: 8}, () => [(r() - 0.5) * 0.9, (r() - 0.5) * 0.25, (r() - 0.5) * 0.9] as V3);
  return {fibro, matrix, mol, bokeh, granules};
})();

export const PLATELET: V3 = [-1.85, 1.75, 0.9];

const Nucleus: React.FC<{p: V3; r: number; glow: number; glowColor: string; scale?: V3}> = ({p, r, glow, glowColor, scale = [1, 1, 1]}) => (
  <>
    {glow > 0 ? <Ball p={p} r={r * 2.4} mat={{color: glowColor, opacity: 0.32 * glow, emissive: glowColor, emissiveIntensity: 0.6}} castShadow={false} seg={14} /> : null}
    <Ball p={p} r={r} scale={scale} mat={{color: glow > 0 ? mix(PAL.hema, glowColor, glow * 0.6) : PAL.hema, roughness: 0.7}} castShadow={false} seg={14} />
  </>
);

const Capillary: React.FC<{tau: number; sprout: number}> = ({tau, sprout}) => {
  const base: V3[] = [
    [0.05, -5.4, 0.35],
    [-0.1, -4.2, 0.35],
    [0.08, -3.2, 0.35],
    [0, -2.35, 0.35],
  ];
  const branches: V3[][] = [
    [[0, -2.45, 0.35], [-0.7, -1.9, 0.6], [-1.35, -1.25, 0.7]],
    [[0, -2.45, 0.35], [0.75, -1.85, 0.6], [1.4, -1.2, 0.7]],
    [[0, -2.45, 0.35], [-0.2, -1.6, 0.9], [-0.5, -0.5, 1.05]],
  ];
  const cut = (pts: V3[], k: number): V3[] => {
    if (k <= 0.02) return [];
    const curve = new THREE.CatmullRomCurve3(pts.map(v3));
    const n = 14;
    const out: V3[] = [];
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * k;
      const q = curve.getPoint(s);
      out.push([q.x, q.y, q.z]);
    }
    return out;
  };
  return (
    <group>
      <Tube pts={base} r={0.3} mat={{color: PAL.rbc, opacity: 0.55, roughness: 0.6}} castShadow={false} radial={12} />
      {[0, 1, 2, 3, 4].map((k) => {
        const o = (k / 5 + tau * 0.09) % 1;
        const curve = new THREE.CatmullRomCurve3(base.map(v3));
        const q = curve.getPoint(o);
        return <Ball key={k} p={[q.x, q.y, q.z]} r={0.16} scale={[1, 0.55, 1]} mat={{color: PAL.rbcDark, roughness: 0.7}} castShadow={false} seg={12} />;
      })}
      {branches.map((b, k) => {
        const pts = cut(b, clamp(sprout * 1.4 - k * 0.2));
        return pts.length >= 2 ? <Tube key={k} pts={pts} r={0.07} mat={{color: PAL.rbc, roughness: 0.6}} castShadow={false} seg={16} /> : null;
      })}
    </group>
  );
};

export const MicroScene: React.FC<{ep: 'dht' | 'prp'; tau: number}> = ({ep, tau}) => {
  const D = ep === 'dht';
  const conv = D ? P(tau, 2.0, 3.4) : 0;
  const dock = D ? P(tau, 3.6, 5.4) : 0;
  const sig = D ? P(tau, 5.5, 6.4, E.out) : 0;
  const shrink = D ? P(tau, 5.8, 7.0) : 0;
  const act = D ? 0 : P(tau, 0.4, 1.4, E.out);
  const wake = D ? 0 : P(tau, 3.0, 4.6);
  const sprout = D ? 0 : P(tau, 4.4, 6.4, E.inOut);
  const hexGeo = useMemo(() => new THREE.CylinderGeometry(0.17, 0.17, 0.09, 6), []);
  return (
    <group>
      {/* «предметное стекло»: фон и боке */}
      <mesh position={[0, 0, -8]}>
        <planeGeometry args={[40, 40]} />
        <meshBasicMaterial color={PAL.slide} />
      </mesh>
      {MIC3.bokeh.map((b, k) => (
        <mesh key={k} position={b.p}>
          <sphereGeometry args={[b.r, 12, 12]} />
          <meshBasicMaterial color={b.c} transparent opacity={0.55} />
        </mesh>
      ))}
      {/* матрикс: клетки вокруг сосочка */}
      {MIC3.matrix.map((c, k) => {
        const sc = lerp(1, 0.72, shrink * (0.6 + (0.4 * ((k * 7) % 5)) / 4));
        return (
          <group key={k}>
            <Ball p={c.p} r={c.r * sc} mat={{color: PAL.eosin, opacity: lerp(0.86, 0.6, shrink), roughness: 0.8}} castShadow={false} seg={16} />
            <Nucleus p={[c.p[0], c.p[1], c.p[2] + c.r * sc * 0.35]} r={0.13 * sc} glow={0} glowColor={PAL.marker} />
          </group>
        );
      })}
      {/* сосочек */}
      <Ball p={PAPC} r={1} scale={PAPS} mat={{color: PAL.eosinLight, opacity: 0.55, roughness: 0.9}} castShadow={false} seg={28} />
      <Capillary tau={tau} sprout={sprout} />
      {MIC3.fibro.map((c, k) => {
        const glowD = dock * (k < 6 ? 1 : 0.5);
        const glowP = wake * (k < 7 ? 1 : 0.4);
        const glow = D ? glowD : glowP;
        return (
          <group key={k}>
            <Ball p={c.p} r={c.r} scale={[2.0, 0.85, 0.85]} rot={c.rot} mat={{color: PAL.eosin, opacity: 0.9, roughness: 0.8}} castShadow={false} seg={16} />
            <Nucleus p={[c.p[0], c.p[1], c.p[2] + 0.12]} r={0.13} scale={[1.6, 1, 1]} glow={glow} glowColor={D ? PAL.marker : PAL.scrub} />
            {/* рецептор: кольцо у клетки, появляется к моменту стыковки */}
            {D ? (
              <mesh position={[c.p[0], c.p[1] - 0.05, c.p[2] + 0.42]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.16, 0.035, 8, 20]} />
                <Clay color={PAL.marker} opacity={P(tau, 3.2, 3.8) * 0.95} emissive={PAL.marker} emissiveIntensity={0.3} />
              </mesh>
            ) : null}
          </group>
        );
      })}
      {/* эпизод DHT: молекулы гормона */}
      {D
        ? MIC3.mol.map((m, k) => {
            const tr = P(tau, m.t0, m.t0 + 1.6, E.out);
            if (tr <= 0) return null;
            const ck = clamp((conv - k * 0.06) * 1.5);
            const dk = clamp((dock - k * 0.05) * 1.4);
            const wob = 0.12 * Math.sin(tau * 3 + k);
            const mid: V3 = [lerp(m.s[0], m.e[0], tr) + wob, lerp(m.s[1], m.e[1], tr), lerp(m.s[2], m.e[2], tr) + 0.3];
            const p: V3 = [lerp(mid[0], m.e[0], E.inOut(dk)), lerp(mid[1], m.e[1], E.inOut(dk)), lerp(mid[2], m.e[2], E.inOut(dk))];
            const flash = Math.max(0, ring(tau, 2.0 + k * 0.1, 1.2, 2.2));
            return (
              <mesh key={k} position={p} rotation={[Math.PI / 2 + 0.3, tau * 0.8 + k, 0]} geometry={hexGeo} scale={1 + 0.35 * flash}>
                <Clay color={mix('#c9c6d4', PAL.marker, ck)} roughness={0.5} emissive={PAL.marker} emissiveIntensity={0.5 * ck + flash} />
              </mesh>
            );
          })
        : null}
      {/* эпизод DHT: стоп-сигналы к матриксу */}
      {D && sig > 0
        ? [0, 2, 4].map((k) => {
            const from = MIC3.fibro[k].p;
            const to = MIC3.matrix[6 + k * 4].p;
            const pts: V3[] = [];
            for (let i = 0; i <= 12; i++) {
              const s = (i / 12) * sig;
              pts.push([lerp(from[0], to[0], s), lerp(from[1], to[1], s) + Math.sin(s * Math.PI) * 0.35, lerp(from[2], to[2], s) + 0.5]);
            }
            return <Tube key={k} pts={pts} r={0.04} mat={{color: PAL.ink, opacity: 0.85}} castShadow={false} seg={18} radial={6} />;
          })
        : null}
      {/* эпизод PRP: тромбоцит */}
      {!D ? (
        <group position={PLATELET}>
          <mesh scale={[1, 0.36 + 0.1 * act, 1]} rotation={[0.35, 0.2, 0.15]}>
            <sphereGeometry args={[0.78, 24, 24]} />
            <Clay color={PAL.platelet} opacity={0.88} roughness={0.75} />
          </mesh>
          {MIC3.granules.map((g, k) => (
            <Ball key={k} p={g} r={0.08} mat={{color: PAL.plateletDark, opacity: 0.95 * (1 - act)}} castShadow={false} seg={10} />
          ))}
          {[0, 1, 2, 3, 4, 5].map((k) => {
            const a = (k / 6) * TAU;
            const dir = new THREE.Vector3(Math.cos(a), 0.15, Math.sin(a)).normalize();
            const len = 0.9 * act;
            const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
            return len > 0.02 ? (
              <mesh key={k} position={dir.clone().multiplyScalar(0.7 + len / 2)} quaternion={q}>
                <coneGeometry args={[0.16, len, 8]} />
                <Clay color={PAL.platelet} roughness={0.75} />
              </mesh>
            ) : null;
          })}
        </group>
      ) : null}
    </group>
  );
};

// Камера линзы: лёгкая орбита и наезд; содержимое выше центра кадра, чтобы попасть в круг линзы.
export function microCam(tau: number): CamSpec {
  const d = 21.5 * (1 - 0.045 * E.inOut(clamp(tau / 10)));
  const th = 0.16 * Math.sin(tau / 6);
  const ph = 0.1 + 0.03 * Math.sin(tau / 9);
  const look: V3 = [0, -1.25, 0];
  return {pos: [look[0] + d * Math.sin(th) * Math.cos(ph), look[1] + d * Math.sin(ph), look[2] + d * Math.cos(th) * Math.cos(ph)], look, fov: 38};
}
