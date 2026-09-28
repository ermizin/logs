// Микромир в линзе, 3D: луковица волоса — купол клеток матрикса над сосочком, клетки сосочка
// с ядрами, капилляр с эритроцитами. Эпизод 'dht': молекулы гормона → фермент → DHT →
// рецепторы → стоп-сигнал к матриксу. Эпизод 'prp': тромбоцит активируется, факторы роста
// будят клетки, прорастают сосуды.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {PAL} from '../reel/palette';
import {E, P, clamp, lerp, mix, ring, rng, TAU} from '../reel/math';
import {CamSpec, V3} from './cam';
import {Ball, Phys, Tube, v3} from './prims';

const PAPC: V3 = [0, -0.55, 0];
const PAPS: V3 = [1.3, 1.75, 1.05];
const COL = {
  cell: '#ecb3c3',
  cellHi: '#f6cfd9',
  nucleus: '#4a3b8e',
  nucleusHi: '#7a6ac0',
  papilla: '#f5d9e1',
  fibro: '#e9aab9',
  rbc: '#cf4a61',
  rbcDark: '#a8354b',
  vessel: '#d15a6c',
  molecule: '#cfcbdc',
  dht: '#5b3aa8',
  platelet: '#a89bd9',
  plateletDark: '#6f60b0',
};

type Cell = {p: V3; r: number; rot: V3; seed: number};

export const MIC3 = (() => {
  const r = rng(2026);
  const fibro: Cell[] = [];
  for (let i = 0; i < 9; i++) {
    const a = r() * TAU;
    const b = (r() - 0.5) * Math.PI * 0.9;
    const k = 0.22 + r() * 0.55;
    fibro.push({
      p: [PAPC[0] + Math.cos(a) * Math.cos(b) * PAPS[0] * k, PAPC[1] + Math.sin(b) * PAPS[1] * k, PAPC[2] + Math.sin(a) * Math.cos(b) * PAPS[2] * k * 0.7],
      r: 0.27,
      rot: [r() * 0.6, r() * Math.PI, (r() - 0.5) * 0.7],
      seed: 100 + i,
    });
  }
  // матрикс: купол из двух слоёв клеток над сосочком
  const matrix: Cell[] = [];
  for (let i = 0; i < 30; i++) {
    const a = Math.PI * 1.02 + (Math.PI * 0.96 * i) / 29;
    const layer = i % 2;
    const rr = layer ? 2.55 : 2.0;
    const z = (r() - 0.5) * 1.5 + (layer ? -0.15 : 0.2);
    matrix.push({p: [Math.cos(a) * rr * 0.98, PAPC[1] + 0.3 - Math.sin(a) * rr * 0.92, z], r: 0.3 + r() * 0.07, rot: [r(), r(), r()], seed: 200 + i});
  }
  const mol = Array.from({length: 9}, (_, i) => {
    const target = fibro[i % fibro.length];
    return {t0: 0.25 + i * 0.16, s: [(r() - 0.5) * 0.4, -2.4 - r() * 0.5, 0.35] as V3, e: [target.p[0], target.p[1] - 0.05, target.p[2] + 0.4] as V3, target: i % fibro.length};
  });
  const bokeh = Array.from({length: 12}, () => ({p: [(r() - 0.5) * 10, (r() - 0.5) * 10, -5 - r() * 4] as V3, r: 0.5 + r() * 1.0, c: r() < 0.5 ? PAL.eosinLight : PAL.slide2}));
  const granules = Array.from({length: 9}, () => [(r() - 0.5) * 0.85, (r() - 0.5) * 0.22, (r() - 0.5) * 0.85] as V3);
  return {fibro, matrix, mol, bokeh, granules};
})();

export const PLATELET: V3 = [-2.4, -0.95, 1.25];

const Nucleus: React.FC<{p: V3; r: number; glow: number; glowColor: string; scale?: V3}> = ({p, r, glow, glowColor, scale = [1, 1, 1]}) => (
  <>
    {glow > 0 ? <Ball p={p} r={r * 2.6} mat={{color: glowColor, opacity: 0.3 * glow, emissive: glowColor, emissiveIntensity: 0.8, depthWrite: false}} castShadow={false} seg={14} renderOrder={3} /> : null}
    <Ball p={p} r={r} scale={scale} mat={{color: glow > 0 ? mix(COL.nucleus, glowColor, glow * 0.6) : COL.nucleus, roughness: 0.55, emissive: COL.nucleusHi, emissiveIntensity: 0.12 + 0.5 * glow}} castShadow={false} seg={14} />
  </>
);

const Capillary: React.FC<{tau: number; sprout: number}> = ({tau, sprout}) => {
  const base: V3[] = [
    [0.05, -5.6, 0.35],
    [-0.1, -4.3, 0.35],
    [0.08, -3.2, 0.35],
    [0, -2.3, 0.35],
  ];
  const branches: V3[][] = [
    [[0, -2.4, 0.35], [-0.6, -1.95, 0.7], [-1.25, -1.35, 0.85], [-1.5, -0.7, 0.9]],
    [[0, -2.4, 0.35], [0.65, -1.9, 0.7], [1.3, -1.3, 0.85], [1.5, -0.6, 0.9]],
    [[0, -2.4, 0.35], [-0.15, -1.7, 1.0], [-0.4, -0.8, 1.15], [-0.2, 0.1, 1.2]],
  ];
  const curve = useMemo(() => new THREE.CatmullRomCurve3(base.map(v3)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const cut = (pts: V3[], k: number): V3[] => {
    if (k <= 0.02) return [];
    const c = new THREE.CatmullRomCurve3(pts.map(v3));
    const n = 16;
    const out: V3[] = [];
    for (let i = 0; i <= n; i++) {
      const q = c.getPoint((i / n) * k);
      out.push([q.x, q.y, q.z]);
    }
    return out;
  };
  return (
    <group>
      <Tube pts={base} r={(t) => 0.3 - 0.06 * t} mat={{color: COL.vessel, opacity: 0.5, roughness: 0.5, depthWrite: false}} castShadow={false} radial={12} renderOrder={2} />
      {[0, 1, 2, 3, 4].map((k) => {
        const o = (k / 5 + tau * 0.09) % 1;
        const q = curve.getPoint(o);
        return <Ball key={k} p={[q.x, q.y, q.z]} r={0.15} scale={[1, 0.5, 1]} mat={{color: COL.rbc, roughness: 0.45, clearcoat: 0.3}} castShadow={false} seg={12} />;
      })}
      {branches.map((b, k) => {
        const pts = cut(b, clamp(sprout * 1.4 - k * 0.2));
        return pts.length >= 2 ? <Tube key={k} pts={pts} r={(t) => 0.075 - 0.03 * t} mat={{color: COL.vessel, roughness: 0.45, clearcoat: 0.3}} castShadow={false} seg={18} radial={8} /> : null;
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
      <fog attach="fog" args={[PAL.slide, 18, 34]} />
      {/* «предметное стекло»: фон и боке */}
      <mesh position={[0, 0, -9]}>
        <planeGeometry args={[50, 50]} />
        <meshBasicMaterial color={PAL.slide} />
      </mesh>
      {MIC3.bokeh.map((b, k) => (
        <mesh key={k} position={b.p}>
          <sphereGeometry args={[b.r, 12, 12]} />
          <meshBasicMaterial color={b.c} transparent opacity={0.5} />
        </mesh>
      ))}
      {/* матрикс: купол клеток над сосочком */}
      {MIC3.matrix.map((c, k) => {
        const sc = lerp(1, 0.72, shrink * (0.6 + (0.4 * ((k * 7) % 5)) / 4));
        return (
          <group key={k}>
            <Ball p={c.p} r={c.r * sc} scale={[1.08, 0.95, 1]} rot={c.rot} mat={{color: k % 3 ? COL.cell : COL.cellHi, opacity: lerp(0.9, 0.62, shrink), roughness: 0.55, sheen: 0.5, sheenColor: '#ffe3ea', depthWrite: false}} castShadow={false} seg={18} renderOrder={1} />
            <Nucleus p={[c.p[0], c.p[1], c.p[2] + c.r * sc * 0.45]} r={0.12 * sc} glow={0} glowColor={PAL.marker} />
          </group>
        );
      })}
      {/* сосочек */}
      <Ball p={PAPC} r={1} scale={PAPS} mat={{color: COL.papilla, opacity: 0.55, roughness: 0.6, sheen: 0.6, sheenColor: '#fff0f4', depthWrite: false}} castShadow={false} seg={32} renderOrder={1} />
      <Capillary tau={tau} sprout={sprout} />
      {MIC3.fibro.map((c, k) => {
        const glowD = dock * (k < 6 ? 1 : 0.5);
        const glowP = wake * (k < 7 ? 1 : 0.4);
        const glow = D ? glowD : glowP;
        return (
          <group key={k}>
            <Ball p={c.p} r={c.r} scale={[2.1, 0.8, 0.8]} rot={c.rot} mat={{color: COL.fibro, opacity: 0.92, roughness: 0.6, sheen: 0.4, sheenColor: '#ffd9e2'}} castShadow={false} seg={18} />
            <Nucleus p={[c.p[0], c.p[1], c.p[2] + 0.12]} r={0.12} scale={[1.7, 1, 1]} glow={glow} glowColor={D ? PAL.marker : PAL.scrub} />
            {D ? (
              <mesh position={[c.p[0], c.p[1] - 0.05, c.p[2] + 0.4]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.16, 0.035, 8, 20]} />
                <Phys color={PAL.marker} opacity={P(tau, 3.2, 3.8) * 0.95} emissive={PAL.marker} emissiveIntensity={0.35} />
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
              <group key={k} position={p}>
                <mesh rotation={[Math.PI / 2 + 0.3, tau * 0.8 + k, 0]} geometry={hexGeo} scale={1 + 0.35 * flash}>
                  <Phys color={mix(COL.molecule, COL.dht, ck)} roughness={0.35} clearcoat={0.5} emissive={COL.dht} emissiveIntensity={0.4 * ck + flash} />
                </mesh>
                {flash > 0.05 ? <Ball p={[0, 0, 0]} r={0.35 + 0.25 * flash} mat={{color: COL.dht, opacity: 0.35 * flash, emissive: COL.dht, emissiveIntensity: 1, depthWrite: false}} castShadow={false} seg={12} renderOrder={3} /> : null}
              </group>
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
            return <Tube key={k} pts={pts} r={0.04} mat={{color: PAL.ink, opacity: 0.85, roughness: 0.5}} castShadow={false} seg={18} radial={6} />;
          })
        : null}
      {/* эпизод PRP: тромбоцит — диск с гранулами; при активации выпускает отростки */}
      {!D ? (
        <group position={PLATELET} rotation={[0.42 + 0.08 * Math.sin(tau / 2), 0.25 + 0.12 * tau, 0.1]}>
          <mesh scale={[1, 0.32 + 0.1 * act, 1]}>
            <sphereGeometry args={[0.78, 28, 20]} />
            <Phys color={COL.platelet} opacity={0.9} roughness={0.5} sheen={0.6} sheenColor="#e6dcff" clearcoat={0.3} />
          </mesh>
          {MIC3.granules.map((g, k) => (
            <Ball key={k} p={g} r={0.075} mat={{color: COL.plateletDark, opacity: 0.95 * (1 - act), roughness: 0.5}} castShadow={false} seg={10} />
          ))}
          {[0, 1, 2, 3, 4, 5, 6].map((k) => {
            const a = (k / 7) * TAU;
            const dir = new THREE.Vector3(Math.cos(a), 0.1 * Math.sin(k * 2.1), Math.sin(a)).normalize();
            const len = (0.75 + 0.3 * ((k * 5) % 3)) * act;
            const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
            return len > 0.02 ? (
              <mesh key={k} position={dir.clone().multiplyScalar(0.72 + len / 2)} quaternion={q}>
                <coneGeometry args={[0.13, len, 10]} />
                <Phys color={COL.platelet} roughness={0.5} sheen={0.5} sheenColor="#e6dcff" />
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
  const look: V3 = [0, -1.35, 0];
  return {pos: [look[0] + d * Math.sin(th) * Math.cos(ph), look[1] + d * Math.sin(ph), look[2] + d * Math.cos(th) * Math.cos(ph)], look, fov: 38};
}
