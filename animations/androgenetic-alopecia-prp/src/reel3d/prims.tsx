// Примитивы: стержень между точками, трубка по кривой (в т.ч. сужающаяся), тело вращения,
// физические материалы «мягкий воск / глянец», процедурные текстуры.
import React, {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {V3} from './cam';
import {rng, lerp, noise1, clamp} from '../reel/math';

export const v3 = (p: V3) => new THREE.Vector3(p[0], p[1], p[2]);
export const UP = new THREE.Vector3(0, 1, 0);
export const DOWN = new THREE.Vector3(0, -1, 0);

export function quatFromDir(dir: THREE.Vector3) {
  return new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
}
export function quatFromDown(dir: THREE.Vector3) {
  return new THREE.Quaternion().setFromUnitVectors(DOWN, dir.clone().normalize());
}

export type MatProps = {
  color: string;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  sheen?: number;
  sheenColor?: string;
  sheenRoughness?: number;
  side?: THREE.Side;
  depthWrite?: boolean;
  map?: THREE.Texture | null;
  bumpMap?: THREE.Texture | null;
  bumpScale?: number;
  envMapIntensity?: number;
  transmission?: number;
  thickness?: number;
  ior?: number;
};

// Физический материал по умолчанию — матовый воск с лёгким блеском.
export const Phys: React.FC<MatProps> = ({
  color,
  roughness = 0.62,
  metalness = 0,
  opacity = 1,
  emissive = '#000000',
  emissiveIntensity = 0,
  clearcoat = 0,
  clearcoatRoughness = 0.4,
  sheen = 0,
  sheenColor = '#ffffff',
  sheenRoughness = 0.6,
  side,
  depthWrite,
  map = null,
  bumpMap = null,
  bumpScale = 0,
  envMapIntensity = 0.6,
  transmission = 0,
  thickness = 0,
  ior = 1.45,
}) => (
  <meshPhysicalMaterial
    color={color}
    roughness={roughness}
    metalness={metalness}
    transparent={opacity < 1 || transmission > 0}
    opacity={opacity}
    emissive={emissive}
    emissiveIntensity={emissiveIntensity}
    clearcoat={clearcoat}
    clearcoatRoughness={clearcoatRoughness}
    sheen={sheen}
    sheenColor={sheenColor}
    sheenRoughness={sheenRoughness}
    side={side}
    depthWrite={depthWrite ?? opacity >= 1}
    map={map ?? undefined}
    bumpMap={bumpMap ?? undefined}
    bumpScale={bumpScale}
    envMapIntensity={envMapIntensity}
    transmission={transmission}
    thickness={thickness}
    ior={ior}
  />
);

// Стержень (цилиндр) между двумя точками; радиусы у концов могут отличаться.
export const Bar: React.FC<{a: V3; b: V3; ra: number; rb?: number; mat: MatProps; castShadow?: boolean; segments?: number; renderOrder?: number}> = ({a, b, ra, rb, mat, castShadow = true, segments = 14, renderOrder}) => {
  const A = v3(a);
  const B = v3(b);
  const dir = B.clone().sub(A);
  const len = dir.length();
  if (len < 1e-4) return null;
  const mid = A.clone().add(B).multiplyScalar(0.5);
  const q = quatFromDir(dir);
  return (
    <mesh position={mid} quaternion={q} castShadow={castShadow} receiveShadow renderOrder={renderOrder}>
      <cylinderGeometry args={[rb ?? ra, ra, len, segments]} />
      <Phys {...mat} />
    </mesh>
  );
};

// Сужающаяся трубка по Catmull-Rom кривой (радиус — функция параметра 0..1).
export function taperedTubeGeometry(pts: V3[], radiusAt: (t: number) => number, seg = 48, radial = 10): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(pts.map(v3), false, 'catmullrom', 0.5);
  const frames = curve.computeFrenetFrames(seg, false);
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const p = curve.getPointAt(t);
    const r = radiusAt(t);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const cx = -Math.cos(a);
      const cy = Math.sin(a);
      const nx = cx * N.x + cy * B.x;
      const ny = cx * N.y + cy * B.y;
      const nz = cx * N.z + cy * B.z;
      positions.push(p.x + r * nx, p.y + r * ny, p.z + r * nz);
      normals.push(nx, ny, nz);
    }
  }
  for (let j = 1; j <= seg; j++) {
    for (let i = 1; i <= radial; i++) {
      const a = (radial + 1) * (j - 1) + (i - 1);
      const b = (radial + 1) * j + (i - 1);
      const c = (radial + 1) * j + i;
      const d = (radial + 1) * (j - 1) + i;
      indices.push(a, b, d, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setIndex(indices);
  return g;
}

export const Tube: React.FC<{pts: V3[]; r: number | ((t: number) => number); mat: MatProps; castShadow?: boolean; seg?: number; radial?: number; renderOrder?: number}> = ({pts, r, mat, castShadow = true, seg = 40, radial = 10, renderOrder}) => {
  const rf = typeof r === 'number' ? () => r : r;
  const key = pts.map((p) => p.map((n) => n.toFixed(3)).join(',')).join(';') + '|' + [0, 0.25, 0.5, 0.75, 1].map((t) => rf(t).toFixed(4)).join(',') + `|${seg}|${radial}`;
  const geo = useMemo(() => (pts.length < 2 ? null : taperedTubeGeometry(pts, rf, seg, radial)), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geo?.dispose(), [geo]);
  if (!geo) return null;
  return (
    <mesh geometry={geo} castShadow={castShadow} receiveShadow renderOrder={renderOrder}>
      <Phys {...mat} />
    </mesh>
  );
};

// Сфера / эллипсоид.
export const Ball: React.FC<{p: V3; r: number; scale?: V3; mat: MatProps; castShadow?: boolean; rot?: V3; seg?: number; renderOrder?: number}> = ({p, r, scale = [1, 1, 1], mat, castShadow = true, rot = [0, 0, 0], seg = 24, renderOrder}) => (
  <mesh position={p} scale={[r * scale[0], r * scale[1], r * scale[2]]} rotation={rot} castShadow={castShadow} receiveShadow renderOrder={renderOrder}>
    <sphereGeometry args={[1, seg, seg]} />
    <Phys {...mat} />
  </mesh>
);

// Тело вращения по профилю [радиус, y].
export const Lathe: React.FC<{profile: [number, number][]; mat: MatProps; segments?: number; castShadow?: boolean; renderOrder?: number}> = ({profile, mat, segments = 28, castShadow = true, renderOrder}) => {
  const key = profile.map((p) => p.map((n) => n.toFixed(3)).join(',')).join(';');
  const geo = useMemo(() => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y)), segments), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} castShadow={castShadow} receiveShadow renderOrder={renderOrder}>
      <Phys {...mat} />
    </mesh>
  );
};

/* ---------- процедурные текстуры (детерминированные) ---------- */
function makeCanvas(size: number) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}
function toTexture(c: HTMLCanvasElement, repeat = 1) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  return tex;
}

// Дерма: мягкие пятна и волнистые волокна коллагена.
export function dermisTexture(base: string, fiber: string, seed = 3) {
  const S = 512;
  const c = makeCanvas(S);
  const g = c.getContext('2d')!;
  const r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = r() * S;
    const y = r() * S;
    const rad = 30 + r() * 90;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    const a = 0.05 + r() * 0.08;
    grad.addColorStop(0, `rgba(255,255,255,${a})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  g.strokeStyle = fiber;
  g.lineCap = 'round';
  for (let k = 0; k < 26; k++) {
    g.globalAlpha = 0.16 + r() * 0.14;
    g.lineWidth = 1.2 + r() * 2.2;
    const y0 = r() * S;
    g.beginPath();
    for (let x = -10; x <= S + 10; x += 12) {
      const y = y0 + 9 * noise1(x / 60 + k * 7, seed + k) + 4 * Math.sin(x / 23 + k);
      if (x === -10) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  return toTexture(c, 1.6);
}

// Жировая клетчатка: дольки-«булыжники».
export function fatTexture(base: string, edge: string, seed = 5) {
  const S = 512;
  const c = makeCanvas(S);
  const g = c.getContext('2d')!;
  const r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) {
    const x = r() * S;
    const y = r() * S;
    const rad = 18 + r() * 34;
    const grad = g.createRadialGradient(x - rad * 0.3, y - rad * 0.3, rad * 0.1, x, y, rad);
    grad.addColorStop(0, 'rgba(255,255,255,0.35)');
    grad.addColorStop(0.75, 'rgba(255,255,255,0.02)');
    grad.addColorStop(1, 'rgba(120,90,40,0.16)');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(x, y, rad * (0.9 + r() * 0.3), rad * (0.75 + r() * 0.3), r() * Math.PI, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = edge;
    g.globalAlpha = 0.22;
    g.lineWidth = 1.4;
    g.stroke();
    g.globalAlpha = 1;
  }
  return toTexture(c, 1.4);
}

// Шум для микрорельефа кожи (bump).
export function noiseTexture(seed = 9, size = 256) {
  const c = makeCanvas(size);
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  const r = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.floor(r() * 60);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // размытие «пор»: второй слой крупнее
  g.globalAlpha = 0.5;
  for (let k = 0; k < 400; k++) {
    const x = r() * size;
    const y = r() * size;
    const rad = 2 + r() * 5;
    g.fillStyle = `rgba(${r() < 0.5 ? 60 : 200},${r() < 0.5 ? 60 : 200},${r() < 0.5 ? 60 : 200},0.35)`;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const mixn = lerp;
