// Общий план в 3D: срез кожи головы. Скруглённый блок с текстурами дермы и жира, передняя
// пластина ткани полупрозрачна — фолликулы видны целиком: луковица-«лампочка» с сосочком и
// капиллярной петлёй, полупрозрачная наружная оболочка, стержень с блеском, гроздь сальной
// железы, мышца, артерия и вена. Состояние (цикл, миниатюризация, игла, депо) — из scalpState().
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {PAL} from '../reel/palette';
import {E, P, lerp, mix, noise1, rng, clamp} from '../reel/math';
import {FollicleState, ScalpState} from '../reel/scenes/Scalp';
import {CamSpec, V3, orbit} from './cam';
import {Ball, Bar, Lathe, Phys, Tube, dermisTexture, fatTexture, noiseTexture, quatFromDown, quatFromDir, v3} from './prims';

export const BLOCK = {w: 5.4, top: 0, epi: -0.32, derm: -3.2, bottom: -4.3, zBack: -1.8, zCore: 0.45, zFront: 1.75};
export const FZ = 1.1; // плоскость фолликулов — середина прозрачной пластины
export const FX = [-1.65, 0, 1.65];
const TILT = 0.17;

const COL = {
  epidermis: '#e4b49b',
  dermisCore: '#efd7c6',
  dermisFiber: '#d9b2a0',
  dermisSlab: '#f7e8dd',
  fatCore: '#f2e3bf',
  fatEdge: '#cdb27a',
  fatSlab: '#f8ecd4',
  lobule: '#f7e9c9',
  sheath: '#f1e6d8',
  papilla: '#d7778c',
  papillaDark: '#b6566d',
  gland: '#e8b8a2',
  glandDark: '#cf9a86',
  muscle: '#c98177',
  artery: '#cf4a5a',
  vein: '#7f74b8',
  hair: '#3a2a1f',
  hairLight: '#7a6250',
};

type Geo = {x0: number; depth: number; R: number; sheathR: number; shaftR: number; top: V3; bulb: V3; dir: THREE.Vector3; len: number};

export function follicleGeo(i: number, st: FollicleState): Geo {
  const depthFull = lerp(2.7, 1.0, st.m);
  const depth = depthFull * st.depthK;
  const R = lerp(0.36, 0.14, st.m) * lerp(0.75, 1, st.depthK);
  const sheathR = lerp(0.235, 0.1, st.m);
  const shaftR = lerp(0.072, 0.026, st.m);
  const x0 = FX[i];
  const top: V3 = [x0, 0, FZ];
  const bulb: V3 = [x0 + TILT * depth, -depth, FZ];
  const dir = v3(bulb).sub(v3(top)).normalize();
  const len = lerp(2.25, 0.55, st.m) * st.lenK;
  return {x0, depth, R, sheathR, shaftR, top, bulb, dir, len};
}

// стержень над кожей: мягкая S-кривая, у каждого фолликула свой наклон
function shaftAbove(g: Geo, len: number, i: number): V3[] {
  const [x, , z] = g.top;
  const sway = [-0.42, -0.3, -0.5][i];
  const zs = [0.05, -0.04, 0.08][i];
  return [
    [x, -0.02, z],
    [x - 0.02 * len, 0.4 * len, z + zs * 0.3],
    [x + sway * 0.35 * len, 0.76 * len, z + zs * 0.7],
    [x + sway * len, 0.97 * len, z + zs],
  ];
}

export function anchors3d(st: ScalpState) {
  const g = [0, 1, 2].map((i) => follicleGeo(i, st.f[i]));
  const along = (i: number, s: number): V3 => v3(g[i].top).lerp(v3(g[i].bulb), s).toArray() as V3;
  return {
    papilla: (i: number): V3 => {
      const p = v3(g[i].top).add(g[i].dir.clone().multiplyScalar(g[i].depth - g[i].R * 0.55));
      return [p.x, p.y, p.z + g[i].R * 0.3];
    },
    sheath: (i: number, s: number): V3 => {
      const p = along(i, s);
      return [p[0] - g[i].sheathR * 0.9, p[1], p[2] + g[i].sheathR * 0.4];
    },
    hairTip: (i: number): V3 => {
      const pts = shaftAbove(g[i], g[i].len, i);
      const tip = pts[3];
      return [tip[0], tip[1] + st.f[i].lift * 0.012, tip[2]];
    },
    hairMid: (i: number): V3 => {
      const pts = shaftAbove(g[i], g[i].len, i);
      return [pts[2][0], pts[2][1] + st.f[i].lift * 0.012, pts[2][2]];
    },
    inject: (i: number): V3 => [g[i].x0 + 0.55, -1.15, FZ + 0.1],
    top: (i: number): V3 => g[i].top,
    bulbCenter: (i: number): V3 => g[i].bulb,
  };
}

const Follicle: React.FC<{i: number; st: FollicleState}> = ({i, st}) => {
  const g = follicleGeo(i, st);
  const hairCol = mix(COL.hair, COL.hairLight, st.m * 0.9);
  const hairOpacity = lerp(1, 0.85, st.m);
  const qDown = quatFromDown(g.dir);
  const d = g.depth;
  const sR = g.sheathR;
  const R = g.R;
  // профиль наружной оболочки: сужение к середине, «лампочка» луковицы, скруглённое дно
  const profile: [number, number][] = [
    [sR * 0.92, 0],
    [sR, -0.12 * d],
    [sR * 0.94, -0.45 * d],
    [sR * 0.96, -0.7 * d],
    [Math.max(sR * 1.05, R * 0.72), -0.8 * d],
    [R, -0.9 * d],
    [R * 0.9, -0.955 * d],
    [R * 0.55, -0.99 * d],
    [0.0005, -1.0 * d],
  ];
  const papC = v3(g.top).add(g.dir.clone().multiplyScalar(d - R * 0.5));
  const lift = st.lift * 0.012;
  const above = shaftAbove(g, g.len, i);
  const nh = st.newHair;
  const nhLen = Math.max(0, nh - 1) * 1.3;
  // стержень целиком: из луковицы через канал и над кожей, сужается к кончику
  const inner: V3[] = [v3(g.top).add(g.dir.clone().multiplyScalar(d - R * 0.95)).toArray() as V3, v3(g.top).add(g.dir.clone().multiplyScalar(d * 0.5)).toArray() as V3];
  const shaftPts: V3[] = [...inner, ...above];
  const tipR = (t: number) => (t < 0.45 ? g.shaftR : g.shaftR * lerp(1, 0.22, E.inOut((t - 0.45) / 0.55)));
  // сальная железа: гроздь
  const glandC = v3(g.top).add(g.dir.clone().multiplyScalar(0.78)).add(new THREE.Vector3(0.52, 0.05, 0.25));
  const grapes: [V3, number][] = [
    [[0, 0, 0], 0.2],
    [[0.19, 0.11, 0.05], 0.15],
    [[-0.17, 0.12, 0.09], 0.14],
    [[0.05, -0.16, -0.08], 0.13],
    [[0.17, -0.08, 0.13], 0.12],
    [[-0.1, -0.1, 0.16], 0.11],
  ];
  const ductA = v3(g.top).add(g.dir.clone().multiplyScalar(0.62)).add(new THREE.Vector3(sR * 0.6, 0, 0.1)).toArray() as V3;
  // мышца, поднимающая волос
  const mA = v3(g.top).add(g.dir.clone().multiplyScalar(1.35)).add(new THREE.Vector3(sR * 0.7, 0, -0.05)).toArray() as V3;
  const mB: V3 = [g.x0 + 1.05, BLOCK.epi - 0.06, FZ - 0.12];
  // сосуды: артерия и вена поднимаются из клетчатки к капиллярной петле у сосочка
  const loopC = papC.clone().add(g.dir.clone().multiplyScalar(R * 0.15));
  const vessel = (side: number, seed: number): V3[] => {
    const pts: V3[] = [];
    const start: V3 = [g.x0 + 0.75 + side * 0.22, BLOCK.bottom + 0.15, FZ - 0.35 + side * 0.12];
    const n = 6;
    for (let k = 0; k <= n; k++) {
      const s = k / n;
      const x = lerp(start[0], loopC.x + side * R * 0.5, E.inOut(s)) + 0.12 * noise1(s * 4 + seed, seed);
      const y = lerp(start[1], loopC.y - R * 0.2, s);
      const z = lerp(start[2], loopC.z, s) + 0.08 * noise1(s * 5 + seed * 3, seed + 1);
      pts.push([x, y, z]);
    }
    return pts;
  };
  return (
    <group>
      {/* мышца */}
      <Bar a={mA} b={mB} ra={0.06} rb={0.04} mat={{color: COL.muscle, roughness: 0.7, opacity: 0.9}} castShadow={false} />
      {/* сосуды */}
      <Tube pts={vessel(-1, 11 + i)} r={0.048} mat={{color: COL.artery, roughness: 0.4, clearcoat: 0.4}} castShadow={false} seg={30} radial={8} />
      <Tube pts={vessel(1, 23 + i)} r={0.042} mat={{color: COL.vein, roughness: 0.45, clearcoat: 0.3}} castShadow={false} seg={30} radial={8} />
      {/* капиллярная петля вокруг сосочка */}
      <mesh position={loopC} quaternion={qDown}>
        <torusGeometry args={[R * 0.5, 0.028, 8, 28]} />
        <Phys color={COL.artery} roughness={0.4} />
      </mesh>
      {/* сальная железа */}
      <Bar a={ductA} b={glandC.toArray() as V3} ra={0.05} rb={0.07} mat={{color: COL.glandDark, roughness: 0.6}} castShadow={false} />
      {grapes.map(([o, r], k) => (
        <Ball key={k} p={[glandC.x + o[0], glandC.y + o[1], glandC.z + o[2]]} r={r} mat={{color: k % 2 ? COL.gland : mix(COL.gland, '#ffffff', 0.1), roughness: 0.6, sheen: 0.3, sheenColor: '#ffe4d6'}} castShadow={false} seg={18} />
      ))}
      {/* сосочек */}
      <group position={papC} quaternion={qDown}>
        <mesh scale={[R * 0.42, R * 0.62, R * 0.42]} castShadow={false}>
          <sphereGeometry args={[1, 22, 22]} />
          <Phys color={COL.papilla} roughness={0.5} emissive={COL.papillaDark} emissiveIntensity={0.08} sheen={0.4} sheenColor="#ffd6de" />
        </mesh>
      </group>
      {/* наружная оболочка — полупрозрачный воск, через неё виден стержень */}
      <group position={g.top} quaternion={qDown}>
        <Lathe profile={profile} mat={{color: COL.sheath, roughness: 0.55, opacity: 0.78, sheen: 0.6, sheenColor: '#fff4ea', side: THREE.DoubleSide, depthWrite: false}} castShadow={false} renderOrder={2} />
      </group>
      {/* старый стержень */}
      {st.hairAlpha > 0 ? (
        <group position={[0, lift, 0]}>
          <Tube pts={shaftPts} r={tipR} mat={{color: hairCol, roughness: 0.38, clearcoat: 0.55, clearcoatRoughness: 0.35, opacity: st.hairAlpha * hairOpacity}} seg={56} radial={10} />
          {st.club > 0 ? <Ball p={inner[0]} r={g.shaftR * 2.1} scale={[1, 1.4, 1]} mat={{color: hairCol, opacity: st.club * st.hairAlpha, roughness: 0.4}} castShadow={false} seg={12} /> : null}
        </group>
      ) : null}
      {/* новый стержень */}
      {nh > 0 ? (
        <Tube
          pts={[inner[0], v3(inner[0]).lerp(v3(g.top), clamp(nh)).toArray() as V3, ...(nhLen > 0.05 ? shaftAbove(g, nhLen, i).slice(1) : [])]}
          r={(t) => (t < 0.5 ? g.shaftR : g.shaftR * lerp(1, 0.25, (t - 0.5) / 0.5))}
          mat={{color: hairCol, roughness: 0.38, clearcoat: 0.55}}
          seg={40}
          radial={10}
        />
      ) : null}
    </group>
  );
};

const Block: React.FC = () => {
  const texD = useMemo(() => dermisTexture(COL.dermisCore, COL.dermisFiber), []);
  const texF = useMemo(() => fatTexture(COL.fatCore, COL.fatEdge), []);
  const bump = useMemo(() => noiseTexture(9), []);
  const epiGeo = useMemo(() => new RoundedBoxGeometry(BLOCK.w, BLOCK.top - BLOCK.epi, BLOCK.zFront - BLOCK.zBack, 3, 0.07), []);
  const slabD = useMemo(() => new RoundedBoxGeometry(BLOCK.w, BLOCK.epi - BLOCK.derm, BLOCK.zFront - BLOCK.zCore, 2, 0.05), []);
  const slabF = useMemo(() => new RoundedBoxGeometry(BLOCK.w, BLOCK.derm - BLOCK.bottom, BLOCK.zFront - BLOCK.zCore, 2, 0.05), []);
  const lobules = useMemo(() => {
    const r = rng(77);
    return Array.from({length: 34}, () => ({
      p: [-2.45 + r() * 4.9, BLOCK.bottom + 0.2 + r() * (BLOCK.derm - BLOCK.bottom - 0.4), BLOCK.zCore + 0.2 + r() * (BLOCK.zFront - BLOCK.zCore - 0.4)] as V3,
      r: 0.14 + r() * 0.16,
      c: mix(COL.lobule, '#e9d19b', r() * 0.5),
    }));
  }, []);
  const cy = (a: number, b: number) => (a + b) / 2;
  const zc = cy(BLOCK.zBack, BLOCK.zCore);
  const zs = cy(BLOCK.zCore, BLOCK.zFront);
  return (
    <group>
      {/* эпидермис: воск с микрорельефом */}
      <mesh geometry={epiGeo} position={[0, cy(BLOCK.epi, BLOCK.top), cy(BLOCK.zBack, BLOCK.zFront)]} receiveShadow castShadow>
        <Phys color={COL.epidermis} roughness={0.5} sheen={0.55} sheenColor="#ffd9c4" clearcoat={0.12} clearcoatRoughness={0.5} bumpMap={bump} bumpScale={0.012} />
      </mesh>
      {/* непрозрачное ядро: дерма и клетчатка с текстурами */}
      <mesh position={[0, cy(BLOCK.derm, BLOCK.epi), zc]} receiveShadow>
        <boxGeometry args={[BLOCK.w, BLOCK.epi - BLOCK.derm, BLOCK.zCore - BLOCK.zBack]} />
        <Phys color="#ffffff" map={texD} roughness={0.85} />
      </mesh>
      <mesh position={[0, cy(BLOCK.bottom, BLOCK.derm), zc]} receiveShadow>
        <boxGeometry args={[BLOCK.w, BLOCK.derm - BLOCK.bottom, BLOCK.zCore - BLOCK.zBack]} />
        <Phys color="#ffffff" map={texF} roughness={0.85} />
      </mesh>
      {/* жировые дольки в прозрачной пластине */}
      {lobules.map((l, k) => (
        <Ball key={k} p={l.p} r={l.r} scale={[1.25, 0.9, 1]} mat={{color: l.c, roughness: 0.6, sheen: 0.3, sheenColor: '#fff6d8'}} castShadow={false} seg={14} />
      ))}
      {/* полупрозрачная передняя пластина ткани */}
      <mesh geometry={slabD} position={[0, cy(BLOCK.derm, BLOCK.epi), zs]} renderOrder={6}>
        <Phys color={COL.dermisSlab} roughness={0.18} opacity={0.17} depthWrite={false} clearcoat={1} clearcoatRoughness={0.12} envMapIntensity={0.9} />
      </mesh>
      <mesh geometry={slabF} position={[0, cy(BLOCK.bottom, BLOCK.derm), zs]} renderOrder={6}>
        <Phys color={COL.fatSlab} roughness={0.18} opacity={0.2} depthWrite={false} clearcoat={1} clearcoatRoughness={0.12} envMapIntensity={0.9} />
      </mesh>
      {/* тень на «бумаге» под макетом */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, BLOCK.bottom - 0.01, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <shadowMaterial opacity={0.14} />
      </mesh>
    </group>
  );
};

const Needle: React.FC<{st: ScalpState}> = ({st}) => {
  if (st.needleAlpha <= 0) return null;
  const a = anchors3d(st);
  const target = v3(a.inject(1)).add(new THREE.Vector3(0, 0, 0.5));
  const dir = new THREE.Vector3(0.62, 0.72, 0.3).normalize();
  const start = target.clone().add(dir.clone().multiplyScalar(5.0));
  const tip = start.clone().lerp(target, st.needle);
  const q = quatFromDir(dir);
  const alpha = st.needleAlpha;
  return (
    <group position={tip} quaternion={q}>
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.026, 0.016, 1.7, 10]} />
        <Phys color="#8c9096" roughness={0.3} metalness={0.7} opacity={alpha} envMapIntensity={1} />
      </mesh>
      <mesh position={[0, 1.8, 0]}>
        <cylinderGeometry args={[0.15, 0.09, 0.24, 14]} />
        <Phys color="#e9ece9" roughness={0.4} opacity={alpha} />
      </mesh>
      <mesh position={[0, 3.05, 0]} renderOrder={4}>
        <cylinderGeometry args={[0.235, 0.235, 2.4, 20]} />
        <Phys color="#eef2f1" roughness={0.1} opacity={0.42 * alpha} clearcoat={0.8} envMapIntensity={1} depthWrite={false} />
      </mesh>
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh key={k} position={[0, 2.1 + k * 0.42, 0]}>
          <torusGeometry args={[0.24, 0.006, 6, 30]} />
          <Phys color={PAL.inkMuted} opacity={0.7 * alpha} />
        </mesh>
      ))}
      <mesh position={[0, 2.45, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 1.1, 18]} />
        <Phys color={PAL.markerSoft} opacity={0.92 * alpha} emissive={PAL.marker} emissiveIntensity={0.06} />
      </mesh>
      <mesh position={[0, 3.05, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.12, 18]} />
        <Phys color={PAL.ink} opacity={alpha} />
      </mesh>
      <mesh position={[0, 3.9, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 1.7, 8]} />
        <Phys color={PAL.ink} opacity={alpha} />
      </mesh>
      <mesh position={[0, 4.75, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.08, 18]} />
        <Phys color={PAL.ink} opacity={alpha} />
      </mesh>
      <mesh position={[0, 4.26, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.08, 18]} />
        <Phys color={PAL.ink} opacity={alpha} />
      </mesh>
    </group>
  );
};

export const ScalpScene: React.FC<{st: ScalpState}> = ({st}) => {
  const a = anchors3d(st);
  return (
    <group>
      <fog attach="fog" args={[PAL.surface, 19, 40]} />
      <Block />
      {[0, 1, 2].map((i) => (
        <Follicle key={i} i={i} st={st.f[i]} />
      ))}
      {[0, 1, 2].map((i) =>
        st.depotAlpha[i] > 0 ? (
          <Ball key={`d${i}`} p={a.inject(i)} r={st.depot[i] * 0.0098} scale={[1.2, 0.85, 0.9]} mat={{color: PAL.markerSoft, opacity: st.depotAlpha[i] * 0.85, emissive: PAL.marker, emissiveIntensity: 0.22, roughness: 0.5, depthWrite: false}} castShadow={false} renderOrder={4} />
        ) : null,
      )}
      <Needle st={st} />
    </group>
  );
};

// Камера общего плана: 3/4 сверху, медленная орбита; на хуке макет ниже; при линзе — наезд.
export function macroCam(t: number, zoom = 0, yShift = 0): CamSpec {
  const k = P(t, 3.3, 4.5, E.inOut);
  const look: V3 = [0.62, lerp(-3.3, -2.1, k) + yShift, 0.2];
  const d = lerp(19.6, 17.6, k) * (1 - 0.07 * zoom);
  const theta = 0.44 + 0.06 * Math.sin(t / 7);
  const phi = 0.33 + 0.02 * Math.sin(t / 11);
  return orbit(look, d, theta, phi, 42);
}
