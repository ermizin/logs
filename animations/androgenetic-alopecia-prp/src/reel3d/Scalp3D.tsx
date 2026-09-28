// Общий план в 3D: «глиняный» срез кожи головы с тремя фолликулами. Состояние берётся из
// scalpState() плоской версии (цикл, миниатюризация, игла, депо PRP) — меняется только отрисовка.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {PAL} from '../reel/palette';
import {E, P, lerp, mix, noise1, rng, clamp} from '../reel/math';
import {FollicleState, ScalpState} from '../reel/scenes/Scalp';
import {CamSpec, V3, orbit} from './cam';
import {Ball, Bar, Clay, Tube, facePlane, quatFromDir, v3} from './prims';

export const BLOCK = {w: 6.6, d: 4.0, top: 0, epi: -0.3, derm: -3.4, bottom: -5.4};
export const FACE_Z = BLOCK.d / 2;
export const FX = [-2.05, 0, 2.05];
const TILT = 0.2;
const CLIP = facePlane(FACE_Z - 0.002);

type Geo = {x0: number; depth: number; R: number; sheathR: number; shaftR: number; top: V3; bulb: V3; dir: THREE.Vector3; len: number};

export function follicleGeo(i: number, st: FollicleState): Geo {
  const depthFull = lerp(3.2, 1.15, st.m);
  const depth = depthFull * st.depthK;
  const R = lerp(0.42, 0.16, st.m) * lerp(0.7, 1, st.depthK);
  const sheathR = lerp(0.3, 0.12, st.m);
  const shaftR = lerp(0.085, 0.03, st.m);
  const x0 = FX[i];
  const top: V3 = [x0, 0, FACE_Z];
  const bulb: V3 = [x0 + TILT * depth, -depth, FACE_Z];
  const dir = v3(bulb).sub(v3(top)).normalize();
  const len = lerp(3.4, 0.7, st.m) * st.lenK;
  return {x0, depth, R, sheathR, shaftR, top, bulb, dir, len};
}

// стержень над кожей: слегка изогнут влево
function shaftAbove(g: Geo, len: number): V3[] {
  const [x, , z] = g.top;
  return [
    [x, -0.05, z],
    [x - 0.06 * len, 0.42 * len, z - 0.02],
    [x - 0.2 * len, 0.76 * len, z - 0.06],
    [x - 0.42 * len, 0.98 * len, z - 0.12],
  ];
}

export function anchors3d(st: ScalpState) {
  const g = [0, 1, 2].map((i) => follicleGeo(i, st.f[i]));
  return {
    papilla: (i: number): V3 => [g[i].bulb[0], g[i].bulb[1] - g[i].R * 0.15, FACE_Z],
    sheath: (i: number, s: number): V3 => {
      const p = v3(g[i].top).lerp(v3(g[i].bulb), s);
      return [p.x - g[i].sheathR, p.y, FACE_Z];
    },
    hairTip: (i: number): V3 => {
      const st1 = st.f[i];
      const pts = shaftAbove(g[i], g[i].len);
      const tip = pts[pts.length - 1];
      return [tip[0], tip[1] + st1.lift * 0.012, tip[2]];
    },
    hairMid: (i: number): V3 => {
      const pts = shaftAbove(g[i], g[i].len);
      return [pts[2][0], pts[2][1] + st.f[i].lift * 0.012, pts[2][2]];
    },
    inject: (i: number): V3 => [g[i].x0 + 0.62, -1.25, FACE_Z],
    bulbCenter: (i: number): V3 => g[i].bulb,
  };
}

const Follicle: React.FC<{i: number; st: FollicleState}> = ({i, st}) => {
  const g = follicleGeo(i, st);
  const hairCol = mix(PAL.hair, PAL.hairLight, st.m * 0.9);
  const hairOpacity = lerp(1, 0.8, st.m);
  const glandC: V3 = [g.x0 + 0.2 + 0.58, -0.95, FACE_Z];
  const gland2: V3 = [g.x0 + 0.2 + 0.98, -1.18, FACE_Z];
  const muscleA: V3 = [g.x0 + TILT * 2.1 + 0.34, -2.1, FACE_Z - 0.05];
  const muscleB: V3 = [g.x0 + 1.55, -0.38, FACE_Z - 0.05];
  const capA: V3 = [g.x0 + 0.75, BLOCK.bottom + 0.3, FACE_Z - 0.02];
  const capB: V3 = [g.bulb[0], g.bulb[1] + g.R * 0.05, FACE_Z - 0.02];
  const capMid: V3 = [(capA[0] + capB[0]) / 2 + 0.25, (capA[1] + capB[1]) / 2, FACE_Z - 0.02];
  const papC: V3 = [g.bulb[0], g.bulb[1] - g.R * 0.02, FACE_Z];
  const lift = st.lift * 0.012;
  const above = shaftAbove(g, g.len);
  const nh = st.newHair;
  const nhLen = Math.max(0, nh - 1) * 1.7;
  return (
    <group>
      {/* мышца, поднимающая волос */}
      <Bar a={muscleA} b={muscleB} ra={0.075} rb={0.055} mat={{color: PAL.muscle, clip: CLIP, opacity: 0.85}} castShadow={false} />
      {/* капилляр к сосочку */}
      <Tube pts={[capA, capMid, capB]} r={0.045} mat={{color: PAL.vessel, clip: CLIP}} castShadow={false} />
      {/* оболочка и луковица */}
      <Bar a={g.top} b={g.bulb} ra={g.sheathR * 0.95} rb={g.sheathR * 1.3} mat={{color: PAL.sheath, clip: CLIP, roughness: 0.95}} castShadow={false} />
      <Ball p={g.bulb} r={g.R} mat={{color: '#e6d3ba', clip: CLIP, roughness: 0.95}} castShadow={false} />
      {/* сосочек */}
      <Ball p={papC} r={g.R * 0.55} scale={[0.72, 1, 0.72]} mat={{color: PAL.papilla, clip: CLIP, roughness: 0.7}} castShadow={false} />
      {/* сальная железа */}
      <Bar a={[g.x0 + 0.34, -0.75, FACE_Z]} b={glandC} ra={0.07} mat={{color: PAL.glandDark, clip: CLIP}} castShadow={false} />
      <Ball p={glandC} r={0.27} scale={[1.2, 0.9, 1]} mat={{color: PAL.gland, clip: CLIP, roughness: 0.85}} castShadow={false} />
      <Ball p={gland2} r={0.19} scale={[1.1, 0.9, 1]} mat={{color: PAL.gland, clip: CLIP, roughness: 0.85}} castShadow={false} />
      {/* старый стержень: внутри канала (в плоскости среза) и над кожей */}
      {st.hairAlpha > 0 ? (
        <group position={[0, lift, 0]}>
          <Bar a={[g.bulb[0], g.bulb[1] + g.R * 0.45, FACE_Z]} b={[g.top[0], g.top[1] + 0.02, FACE_Z]} ra={g.shaftR} mat={{color: hairCol, clip: CLIP, roughness: 0.6, opacity: st.hairAlpha * hairOpacity}} castShadow={false} />
          {st.club > 0 ? <Ball p={[g.bulb[0], g.bulb[1] + g.R * 0.45, FACE_Z]} r={g.shaftR * 1.9} mat={{color: hairCol, clip: CLIP, opacity: st.club * st.hairAlpha}} castShadow={false} /> : null}
          <Tube pts={above} r={g.shaftR} mat={{color: hairCol, roughness: 0.6, opacity: st.hairAlpha * hairOpacity}} />
        </group>
      ) : null}
      {/* новый стержень */}
      {nh > 0 ? (
        <group>
          <Bar a={[g.bulb[0], g.bulb[1] + g.R * 0.45, FACE_Z]} b={v3(g.bulb).lerp(v3(g.top), clamp(nh)).toArray() as V3} ra={g.shaftR} mat={{color: hairCol, clip: CLIP, roughness: 0.6}} castShadow={false} />
          {nhLen > 0.05 ? <Tube pts={shaftAbove(g, nhLen)} r={g.shaftR} mat={{color: hairCol, roughness: 0.6}} /> : null}
        </group>
      ) : null}
    </group>
  );
};

const Block: React.FC = () => {
  const lobules = useMemo(() => {
    const r = rng(77);
    return Array.from({length: 16}, () => ({x: -3.1 + r() * 6.2, y: BLOCK.bottom + 0.35 + r() * (BLOCK.derm - BLOCK.bottom - 0.7), rr: 0.2 + r() * 0.16}));
  }, []);
  const vessels = useMemo(
    () =>
      [-2.85, 2.9].map((x, k) => {
        const pts: V3[] = [];
        for (let y = BLOCK.bottom + 0.4; y <= BLOCK.epi - 0.3; y += 0.6) pts.push([x + 0.12 * noise1(y * 1.3, k + 9), y, FACE_Z - 0.03]);
        return pts;
      }),
    [],
  );
  const cy = (a: number, b: number) => (a + b) / 2;
  return (
    <group>
      <mesh position={[0, cy(BLOCK.epi, BLOCK.top), 0]} receiveShadow castShadow>
        <boxGeometry args={[BLOCK.w, BLOCK.top - BLOCK.epi, BLOCK.d]} />
        <Clay color={PAL.epidermis} roughness={0.92} />
      </mesh>
      <mesh position={[0, cy(BLOCK.derm, BLOCK.epi), 0]} receiveShadow>
        <boxGeometry args={[BLOCK.w, BLOCK.epi - BLOCK.derm, BLOCK.d]} />
        <Clay color={PAL.dermis} roughness={0.95} />
      </mesh>
      <mesh position={[0, cy(BLOCK.bottom, BLOCK.derm), 0]} receiveShadow>
        <boxGeometry args={[BLOCK.w, BLOCK.derm - BLOCK.bottom, BLOCK.d]} />
        <Clay color={PAL.fat} roughness={0.95} />
      </mesh>
      {/* границы слоёв на срезе */}
      {[BLOCK.epi, BLOCK.derm].map((y, k) => (
        <mesh key={k} position={[0, y, FACE_Z + 0.004]}>
          <boxGeometry args={[BLOCK.w, 0.035, 0.01]} />
          <Clay color={k === 0 ? PAL.skinDark : PAL.fatLine} />
        </mesh>
      ))}
      {/* жировые дольки — срезанные сферы на плоскости среза */}
      {lobules.map((l, k) => (
        <Ball key={k} p={[l.x, l.y, FACE_Z]} r={l.rr} scale={[1.25, 0.85, 1]} mat={{color: '#ecdcb3', clip: CLIP, roughness: 0.95}} castShadow={false} />
      ))}
      {vessels.map((pts, k) => (
        <Tube key={k} pts={pts} r={0.045} mat={{color: PAL.vessel, clip: CLIP, opacity: 0.75}} castShadow={false} />
      ))}
    </group>
  );
};

const Needle: React.FC<{st: ScalpState}> = ({st}) => {
  if (st.needleAlpha <= 0) return null;
  const a = anchors3d(st);
  const target = v3(a.inject(1)).add(new THREE.Vector3(0, 0, 0.35));
  const dir = new THREE.Vector3(0.66, 0.74, 0.12).normalize();
  const start = target.clone().add(dir.clone().multiplyScalar(5.2));
  const tip = start.clone().lerp(target, st.needle);
  const q = quatFromDir(dir);
  const alpha = st.needleAlpha;
  return (
    <group position={tip} quaternion={q}>
      {/* игла */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.02, 1.8, 10]} />
        <Clay color={PAL.inkMuted} roughness={0.35} metalness={0.4} opacity={alpha} />
      </mesh>
      {/* канюля и корпус шприца */}
      <mesh position={[0, 1.9, 0]}>
        <cylinderGeometry args={[0.16, 0.1, 0.25, 12]} />
        <Clay color={PAL.surface2} opacity={alpha} />
      </mesh>
      <mesh position={[0, 3.15, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 2.4, 16]} />
        <Clay color="#e7ebe8" roughness={0.2} opacity={0.55 * alpha} />
      </mesh>
      <mesh position={[0, 2.55, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 1.1, 16]} />
        <Clay color={PAL.markerSoft} opacity={0.9 * alpha} />
      </mesh>
      <mesh position={[0, 3.15, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.12, 16]} />
        <Clay color={PAL.ink} opacity={alpha} />
      </mesh>
      <mesh position={[0, 4.0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1.7, 8]} />
        <Clay color={PAL.ink} opacity={alpha} />
      </mesh>
      <mesh position={[0, 4.85, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.08, 16]} />
        <Clay color={PAL.ink} opacity={alpha} />
      </mesh>
      <mesh position={[0, 4.36, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.08, 16]} />
        <Clay color={PAL.ink} opacity={alpha} />
      </mesh>
    </group>
  );
};

export const ScalpScene: React.FC<{st: ScalpState}> = ({st}) => {
  const a = anchors3d(st);
  return (
    <group>
      <Block />
      {[0, 1, 2].map((i) => (
        <Follicle key={i} i={i} st={st.f[i]} />
      ))}
      {[0, 1, 2].map((i) =>
        st.depotAlpha[i] > 0 ? (
          <Ball key={`d${i}`} p={a.inject(i)} r={st.depot[i] * 0.0105} scale={[1.15, 0.85, 1]} mat={{color: PAL.markerSoft, clip: CLIP, opacity: st.depotAlpha[i] * 0.9, emissive: PAL.marker, emissiveIntensity: 0.18, roughness: 0.6}} castShadow={false} />
        ) : null,
      )}
      <Needle st={st} />
    </group>
  );
};

// Камера общего плана: медленная орбита; на хуке макет ниже и дальше; при линзе — наезд.
export function macroCam(t: number, zoom = 0, yShift = 0): CamSpec {
  const k = P(t, 3.3, 4.5, E.inOut);
  const look: V3 = [0.75, lerp(-2.9, -1.35, k) + yShift, 0];
  const d = lerp(22.5, 21, k) * (1 - 0.08 * zoom);
  const theta = 0.3 + 0.07 * Math.sin(t / 7);
  const phi = 0.36 + 0.02 * Math.sin(t / 11);
  return orbit(look, d, theta, phi, 42);
}
