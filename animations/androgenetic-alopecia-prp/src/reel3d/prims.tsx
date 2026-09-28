// Примитивы: стержень между точками, трубка по кривой, матовые материалы, плоскость среза.
import React, {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {V3} from './cam';

export const v3 = (p: V3) => new THREE.Vector3(p[0], p[1], p[2]);
export const UP = new THREE.Vector3(0, 1, 0);

export function quatFromDir(dir: THREE.Vector3) {
  return new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
}

type MatProps = {
  color: string;
  roughness?: number;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  clip?: THREE.Plane[] | null;
  side?: THREE.Side;
  metalness?: number;
};

export const Clay: React.FC<MatProps> = ({color, roughness = 0.88, opacity = 1, emissive = '#000000', emissiveIntensity = 0, clip = null, side, metalness = 0}) => (
  <meshStandardMaterial
    color={color}
    roughness={roughness}
    metalness={metalness}
    transparent={opacity < 1}
    opacity={opacity}
    emissive={emissive}
    emissiveIntensity={emissiveIntensity}
    clippingPlanes={clip ?? undefined}
    side={side}
  />
);

// Стержень (цилиндр) между двумя точками; радиусы у концов могут отличаться.
export const Bar: React.FC<{a: V3; b: V3; ra: number; rb?: number; mat: MatProps; castShadow?: boolean; segments?: number}> = ({a, b, ra, rb, mat, castShadow = true, segments = 14}) => {
  const A = v3(a);
  const B = v3(b);
  const dir = B.clone().sub(A);
  const len = dir.length();
  if (len < 1e-4) return null;
  const mid = A.clone().add(B).multiplyScalar(0.5);
  const q = quatFromDir(dir);
  return (
    <mesh position={mid} quaternion={q} castShadow={castShadow} receiveShadow>
      <cylinderGeometry args={[rb ?? ra, ra, len, segments]} />
      <Clay {...mat} />
    </mesh>
  );
};

// Трубка по Catmull-Rom кривой; геометрия пересобирается при изменении точек.
export const Tube: React.FC<{pts: V3[]; r: number; mat: MatProps; castShadow?: boolean; seg?: number; radial?: number}> = ({pts, r, mat, castShadow = true, seg = 36, radial = 8}) => {
  const key = pts.map((p) => p.map((n) => n.toFixed(3)).join(',')).join(';') + '|' + r.toFixed(4);
  const geo = useMemo(() => {
    if (pts.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(pts.map(v3), false, 'catmullrom', 0.5);
    return new THREE.TubeGeometry(curve, seg, r, radial, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => () => geo?.dispose(), [geo]);
  if (!geo) return null;
  return (
    <mesh geometry={geo} castShadow={castShadow} receiveShadow>
      <Clay {...mat} />
    </mesh>
  );
};

// Сфера / эллипсоид.
export const Ball: React.FC<{p: V3; r: number; scale?: V3; mat: MatProps; castShadow?: boolean; rot?: V3; seg?: number}> = ({p, r, scale = [1, 1, 1], mat, castShadow = true, rot = [0, 0, 0], seg = 22}) => (
  <mesh position={p} scale={[r * scale[0], r * scale[1], r * scale[2]]} rotation={rot} castShadow={castShadow} receiveShadow>
    <sphereGeometry args={[1, seg, seg]} />
    <Clay {...mat} />
  </mesh>
);

// Плоскость среза: оставляет всё, что при z >= zFace (половину, выступающую из грани).
export const facePlane = (zFace: number) => [new THREE.Plane(new THREE.Vector3(0, 0, 1), -zFace)];
