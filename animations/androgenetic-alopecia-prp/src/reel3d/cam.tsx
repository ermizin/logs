// Камера: одна спецификация для R3F-сцены и для проекции 3D-точек в 2D-слой подписей.
import React, {useLayoutEffect} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {W, H} from '../reel/palette';
import {Pt} from '../reel/geom';

export type V3 = [number, number, number];
export type CamSpec = {pos: V3; look: V3; fov: number};

// Проектор: мировая точка → пиксели кадра 1080×1920 (та же камера, что в сцене).
export function projector(spec: CamSpec) {
  const cam = new THREE.PerspectiveCamera(spec.fov, W / H, 0.1, 300);
  cam.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
  cam.up.set(0, 1, 0);
  cam.lookAt(spec.look[0], spec.look[1], spec.look[2]);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  const v = new THREE.Vector3();
  return (p: V3): Pt => {
    v.set(p[0], p[1], p[2]).project(cam);
    return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
  };
}

export const CameraRig: React.FC<{spec: CamSpec}> = ({spec}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const [px, py, pz] = spec.pos;
  const [lx, ly, lz] = spec.look;
  useLayoutEffect(() => {
    camera.position.set(px, py, pz);
    camera.up.set(0, 1, 0);
    camera.lookAt(lx, ly, lz);
    camera.fov = spec.fov;
    camera.aspect = W / H;
    camera.near = 0.1;
    camera.far = 300;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }, [camera, px, py, pz, lx, ly, lz, spec.fov]);
  return null;
};

// Мягкий «студийный» свет: тёплое небо, чуть холоднее земля, ключевой свет с тенью.
export const Lights: React.FC<{shadow?: boolean; key?: number}> = ({shadow = true}) => (
  <>
    <hemisphereLight args={['#fff6ea', '#cfc3b2', 0.95]} />
    <directionalLight position={[7, 12, 9]} intensity={1.15} castShadow={shadow} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
    <directionalLight position={[-8, 4, -4]} intensity={0.25} />
    <ambientLight intensity={0.2} />
  </>
);

// сферическая орбита вокруг точки взгляда
export function orbit(look: V3, d: number, theta: number, phi: number, fov: number): CamSpec {
  return {
    pos: [look[0] + d * Math.sin(theta) * Math.cos(phi), look[1] + d * Math.sin(phi), look[2] + d * Math.cos(theta) * Math.cos(phi)],
    look,
    fov,
  };
}
