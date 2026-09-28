// Пробирка в 3D: стекло с бликами, кровь → центрифуга → плазма / тромбоцитарный слой / эритроциты.
import React from 'react';
import * as THREE from 'three';
import {PAL} from '../reel/palette';
import {lerp, mix, rng} from '../reel/math';
import {TubeState} from '../reel/scenes/Tube';
import {CamSpec, V3} from './cam';
import {Ball, Phys} from './prims';

const R = 1.0;
const RI = 0.9;
const TOP = 2.6;
const BOT = -2.4; // центр полусферы дна
const LIQ_TOP = 1.9;

export function tubeLayers(st: TubeState) {
  const h = (LIQ_TOP - BOT) * st.fill;
  const top = BOT + h;
  const plasmaH = h * 0.55 * st.sep;
  const buffyY = top - plasmaH;
  return {top, plasmaH, buffyY, h};
}

export const TubeScene: React.FC<{st: TubeState}> = ({st}) => {
  const {top, plasmaH, buffyY, h} = tubeLayers(st);
  const red = mix(PAL.rbc, PAL.rbcDark, 0.4);
  const rr = rng(19);
  const sparks = Array.from({length: 34}, () => ({a: rr() * Math.PI * 2, r: rr() * 0.8, y: rr() * 0.5, s: 0.5 + rr() * 0.5}));
  const wob = st.wob * 0.004;
  const glass = {color: '#eef2ef', roughness: 0.08, opacity: 0.2, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.3, side: THREE.DoubleSide, depthWrite: false};
  return (
    <group position={[wob, 0, 0]} scale={lerp(0.96, 1, st.draw)}>
      <fog attach="fog" args={[PAL.surface, 16, 34]} />
      {/* жидкость */}
      {st.fill > 0 ? (
        <group>
          <Ball p={[0, BOT, 0]} r={RI} mat={{color: red, roughness: 0.35, clearcoat: 0.4}} castShadow={false} seg={28} />
          <mesh position={[0, (BOT + top) / 2, 0]}>
            <cylinderGeometry args={[RI, RI, Math.max(0.01, h), 40]} />
            <Phys color={red} roughness={0.35} clearcoat={0.4} />
          </mesh>
          {plasmaH > 0.01 ? (
            <mesh position={[0, top - plasmaH / 2, 0]}>
              <cylinderGeometry args={[RI + 0.003, RI + 0.003, plasmaH, 40]} />
              <Phys color={PAL.plasma} roughness={0.3} clearcoat={0.5} />
            </mesh>
          ) : null}
          {st.sep > 0.05 ? (
            <mesh position={[0, buffyY, 0]}>
              <cylinderGeometry args={[RI + 0.006, RI + 0.006, 0.12 * st.sep, 40]} />
              <Phys color={PAL.buffy} roughness={0.5} />
            </mesh>
          ) : null}
          {sparks.map((s, k) => (
            <Ball key={k} p={[Math.cos(s.a) * s.r * RI, buffyY + 0.08 + s.y, Math.sin(s.a) * s.r * RI]} r={0.035} mat={{color: PAL.platelet, opacity: st.sep * s.s, emissive: PAL.marker, emissiveIntensity: 0.2}} castShadow={false} seg={8} />
          ))}
        </group>
      ) : null}
      {/* стекло */}
      <mesh position={[0, (BOT + TOP) / 2, 0]} renderOrder={5}>
        <cylinderGeometry args={[R, R, TOP - BOT, 48, 1, true]} />
        <Phys {...glass} />
      </mesh>
      <mesh position={[0, BOT, 0]} renderOrder={5}>
        <sphereGeometry args={[R, 36, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <Phys {...glass} />
      </mesh>
      {/* крышка */}
      <mesh position={[0, TOP + 0.26, 0]} castShadow>
        <cylinderGeometry args={[R + 0.1, R + 0.1, 0.5, 40]} />
        <Phys color={PAL.surface2} roughness={0.75} />
      </mesh>
      <mesh position={[0, TOP + 0.52, 0]}>
        <cylinderGeometry args={[R + 0.06, R + 0.1, 0.06, 40]} />
        <Phys color="#d9d3c8" roughness={0.75} />
      </mesh>
      {/* ротор центрифуги */}
      <group position={[2.55, 1.3, -0.2]} rotation={[0, 0, st.spin * Math.PI * 2]} scale={st.spinA > 0 ? 1 : 0.0001}>
        <mesh>
          <torusGeometry args={[0.62, 0.06, 10, 36]} />
          <Phys color={PAL.inkMuted} roughness={0.4} metalness={0.3} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <mesh key={k} rotation={[0, 0, (k * Math.PI) / 3]} position={[Math.cos((k * Math.PI) / 3) * 0.31, Math.sin((k * Math.PI) / 3) * 0.31, 0]}>
            <boxGeometry args={[0.62, 0.06, 0.06]} />
            <Phys color={PAL.inkMuted} roughness={0.4} metalness={0.3} />
          </mesh>
        ))}
        <mesh>
          <sphereGeometry args={[0.12, 12, 12]} />
          <Phys color={PAL.inkMuted} />
        </mesh>
      </group>
      {/* тень на бумаге */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, BOT - R - 0.4, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <shadowMaterial opacity={0.12} />
      </mesh>
    </group>
  );
};

export function tubeCam(t: number): CamSpec {
  const th = 0.25 + 0.05 * Math.sin(t / 6);
  const ph = 0.17;
  const d = 15.5;
  const look: V3 = [0.35, -0.55, 0];
  return {pos: [look[0] + d * Math.sin(th) * Math.cos(ph), look[1] + d * Math.sin(ph), look[2] + d * Math.cos(th) * Math.cos(ph)], look, fov: 40};
}

export const tubeAnchors = (st: TubeState) => {
  const {top, plasmaH, buffyY} = tubeLayers(st);
  return {
    plasma: [0.3, top - plasmaH * 0.4, RI] as V3,
    buffy: [0.3, buffyY, RI] as V3,
    rbc: [-0.3, BOT + 0.6, RI] as V3,
  };
};
