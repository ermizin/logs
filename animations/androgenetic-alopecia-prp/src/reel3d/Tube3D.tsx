// Пробирка в 3D: стекло, кровь → центрифуга → плазма / тромбоцитарный слой / эритроциты.
import React from 'react';
import * as THREE from 'three';
import {PAL} from '../reel/palette';
import {lerp, mix, rng} from '../reel/math';
import {TubeState} from '../reel/scenes/Tube';
import {CamSpec, V3} from './cam';
import {Ball, Clay} from './prims';

const R = 1.0;
const RI = 0.9;
const TOP = 2.6;
const BOT = -2.4; // центр полусферы дна
const LIQ_TOP = 1.9;

export function tubeLayers(st: TubeState) {
  const h = (LIQ_TOP - BOT) * st.fill; // высота столба над центром дна
  const top = BOT + h;
  const plasmaH = h * 0.55 * st.sep;
  const buffyY = top - plasmaH;
  return {top, plasmaH, buffyY, h};
}

export const TubeScene: React.FC<{st: TubeState}> = ({st}) => {
  const {top, plasmaH, buffyY, h} = tubeLayers(st);
  const red = mix(PAL.rbc, PAL.rbcDark, 0.45);
  const rr = rng(19);
  const sparks = Array.from({length: 30}, () => ({a: rr() * Math.PI * 2, r: rr() * 0.8, y: rr() * 0.5, s: 0.5 + rr() * 0.5}));
  const wob = st.wob * 0.004;
  return (
    <group position={[wob, 0, 0]} scale={lerp(0.96, 1, st.draw)}>
      {/* жидкость */}
      {st.fill > 0 ? (
        <group>
          <Ball p={[0, BOT, 0]} r={RI} mat={{color: red, roughness: 0.55}} castShadow={false} seg={24} />
          <mesh position={[0, (BOT + top) / 2, 0]}>
            <cylinderGeometry args={[RI, RI, Math.max(0.01, h), 32]} />
            <Clay color={red} roughness={0.55} />
          </mesh>
          {plasmaH > 0.01 ? (
            <mesh position={[0, top - plasmaH / 2, 0]}>
              <cylinderGeometry args={[RI + 0.003, RI + 0.003, plasmaH, 32]} />
              <Clay color={PAL.plasma} roughness={0.5} />
            </mesh>
          ) : null}
          {st.sep > 0.05 ? (
            <mesh position={[0, buffyY, 0]}>
              <cylinderGeometry args={[RI + 0.006, RI + 0.006, 0.12 * st.sep, 32]} />
              <Clay color={PAL.buffy} roughness={0.6} />
            </mesh>
          ) : null}
          {sparks.map((s, k) => (
            <Ball key={k} p={[Math.cos(s.a) * s.r * RI, buffyY + 0.08 + s.y, Math.sin(s.a) * s.r * RI]} r={0.035} mat={{color: PAL.platelet, opacity: st.sep * s.s}} castShadow={false} seg={8} />
          ))}
        </group>
      ) : null}
      {/* стекло */}
      <mesh position={[0, (BOT + TOP) / 2, 0]}>
        <cylinderGeometry args={[R, R, TOP - BOT, 40, 1, true]} />
        <meshPhysicalMaterial color={PAL.glass} transparent opacity={0.26} roughness={0.12} metalness={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, BOT, 0]}>
        <sphereGeometry args={[R, 32, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshPhysicalMaterial color={PAL.glass} transparent opacity={0.26} roughness={0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* крышка */}
      <mesh position={[0, TOP + 0.28, 0]} castShadow>
        <cylinderGeometry args={[R + 0.1, R + 0.1, 0.5, 32]} />
        <Clay color={PAL.surface2} roughness={0.8} />
      </mesh>
      {/* ротор центрифуги */}
      <group position={[2.55, 1.3, -0.2]} rotation={[0, 0, st.spin * Math.PI * 2]} scale={st.spinA > 0 ? 1 : 0.0001}>
        <mesh>
          <torusGeometry args={[0.62, 0.06, 10, 36]} />
          <Clay color={PAL.inkMuted} roughness={0.5} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <mesh key={k} rotation={[0, 0, (k * Math.PI) / 3]} position={[Math.cos((k * Math.PI) / 3) * 0.31, Math.sin((k * Math.PI) / 3) * 0.31, 0]}>
            <boxGeometry args={[0.62, 0.06, 0.06]} />
            <Clay color={PAL.inkMuted} roughness={0.5} />
          </mesh>
        ))}
        <mesh>
          <sphereGeometry args={[0.12, 12, 12]} />
          <Clay color={PAL.inkMuted} />
        </mesh>
      </group>
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
