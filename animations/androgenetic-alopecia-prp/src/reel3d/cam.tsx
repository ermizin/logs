// Камера: одна спецификация для R3F-сцены и для проекции 3D-точек в 2D-слой подписей.
// Свет: «студийный» трёхточечный + environment-карта для мягких бликов.
import React, {useEffect, useLayoutEffect} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
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

// Настройка рендерера: тонмаппинг ACES, мягкие тени, локальные плоскости отсечения.
export const setupRenderer = (gl: THREE.WebGLRenderer) => {
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.12;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;
  gl.localClippingEnabled = true;
};

// Environment-карта «комната»: даёт материалам мягкие отражения без HDR-файлов.
export const Env: React.FC<{intensity?: number}> = ({intensity = 0.55}) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const rt = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = rt.texture;
    scene.environmentIntensity = intensity;
    pmrem.dispose();
    return () => {
      scene.environment = null;
      rt.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
};

// Трёхточечный свет: тёплый ключевой с тенью, холодноватый заполняющий, контровой по кромкам.
export const Lights: React.FC<{shadow?: boolean; size?: number}> = ({shadow = true, size = 7}) => (
  <>
    <hemisphereLight args={['#fff4e4', '#c9bcab', 0.55]} />
    <directionalLight
      position={[6, 11, 8]}
      intensity={1.9}
      color="#fff1e0"
      castShadow={shadow}
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.00035}
      shadow-normalBias={0.03}
      shadow-camera-left={-size}
      shadow-camera-right={size}
      shadow-camera-top={size}
      shadow-camera-bottom={-size}
      shadow-camera-near={1}
      shadow-camera-far={40}
    />
    <directionalLight position={[-9, 4, 6]} intensity={0.55} color="#e8ecff" />
    <directionalLight position={[2, 5, -10]} intensity={0.9} color="#fff8ef" />
    <ambientLight intensity={0.12} />
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
