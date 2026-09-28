// Режиссура 3D-версии: те же сценарий, HUD, субтитры и маркерная разметка, что в плоской,
// но иллюстрации — WebGL-сцены с мягким светом. Каждый кадр — функция времени t.
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {PAL, W, H} from '../reel/palette';
import {E, P, env, invLerp} from '../reel/math';
import {Pt, bentCurve, handEllipse} from '../reel/geom';
import {Callout, Chip, Layer, MarkerNote, MarkerPath, ScaleBar} from '../reel/Marker';
import {EdgeFade, Paper, PaperGrain} from '../reel/Paper';
import {Clock, Hook, Nav, Outro, Subtitles, Tag} from '../reel/Hud';
import {DUR} from '../reel/script';
import {scalpState} from '../reel/scenes/Scalp';
import {LensSpec, lensState} from '../reel/scenes/Lens';
import {tubeState} from '../reel/scenes/Tube';
import {Evidence} from '../reel/scenes/Evidence';
import {loadReelFonts} from '../reel/fonts';
import {CameraRig, Lights, projector} from './cam';
import {ScalpScene, anchors3d, macroCam} from './Scalp3D';
import {MicroScene, MIC3, PLATELET, microCam} from './Micro3D';
import {TubeScene, tubeAnchors, tubeCam} from './Tube3D';
import {Lens3D, lensMap} from './Lens3D';

loadReelFonts();

const Z_DHT: LensSpec = {in0: 8.6, in1: 9.7, out0: 15.5, out1: 16.4, tau0: 9.2, seed: 3};
const Z_PRP: LensSpec = {in0: 30.4, in1: 31.5, out0: 37.5, out1: 38.5, tau0: 31.0, seed: 7};

const GL = {alpha: true, antialias: true, powerPreference: 'high-performance' as const};

export const Reel3D: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = ((frame / fps) % DUR + DUR) % DUR;

  const scalp = scalpState(t);
  const tube = tubeState(t);
  const A = anchors3d(scalp);

  // видимость общих планов
  const scalpA = Math.max(env(t, 0.1, 24.3, 0.7, 0.5), env(t, 37.9, 44.2, 0.6, 0.5));
  const tubeA = env(t, 24.0, 38.6, 0.01, 0.6);

  // камеры и проекторы
  const zDhtU = P(t, Z_DHT.in0, Z_DHT.in1, E.inOut) * (1 - P(t, Z_DHT.out0, Z_DHT.out1, E.inOut));
  const camM = macroCam(t, zDhtU);
  const projM = projector(camM);
  const camT = tubeCam(t);
  const projT = projector(camT);

  // линзы: якорь — сосочек среднего фолликула / тромбоцитарный слой
  const zDht = lensState(t, Z_DHT, projM(A.papilla(1)));
  const tA = tubeAnchors(tube);
  const zPrp = lensState(t, Z_PRP, projT(tA.buffy));
  const camDht = microCam(zDht.tau);
  const camPrp = microCam(zPrp.tau);
  const projDht = projector(camDht);
  const projPrp = projector(camPrp);
  const mapDht = (p: [number, number, number]) => lensMap(zDht, projDht(p));
  const mapPrp = (p: [number, number, number]) => lensMap(zPrp, projPrp(p));

  const lab = (anchor: Pt, dx: number, dy: number, text: string, t0: number, t1: number, align: 'left' | 'right' = 'left') => (
    <Callout key={text + t0} anchor={anchor} pos={[anchor[0] + dx, anchor[1] + dy]} text={text} prog={invLerp(t0, t0 + 0.7, t)} alpha={env(t, t0, t1, 0.01, 0.35)} align={align} />
  );
  const scaleA = Math.max(env(t, 4.4, 8.6, 0.4, 0.3), env(t, 16.4, 23.9, 0.4, 0.3), env(t, 38.8, 43.9, 0.4, 0.3));
  // масштаб: 1 мм ≈ 1/4.5 глубины терминального фолликула (3.2 ед.) → 0.71 ед.
  const mmPx = (() => {
    const a = projM([0, -2, 2]);
    const b = projM([0.71, -2, 2]);
    return Math.hypot(b[0] - a[0], b[1] - a[1]);
  })();

  // закольцовка: пунктирный овал вокруг среднего фолликула
  const midC = projM([0.16, -1.65, 2]);
  const loopPts = handEllipse(midC[0], midC[1], 78, 320, 5);
  const loopIn = P(t, 0.05, 0.95, E.inOut);
  const loopAlpha = t < 10 ? 1 - P(t, 3.4, 4.0) : 1;
  const loopOut = 1 - P(t, 63.0, 63.9, E.inOut);
  const showLoop = t < 4.0 || t >= 62.9;

  // факторы роста в линзе PRP: чипы летят от тромбоцита к клеткам (2D по проекциям)
  const factors = ['РОСТ КЛЕТОК', 'НОВЫЕ СОСУДЫ', 'ЗАЩИТА', 'ПИТАНИЕ'];

  return (
    <AbsoluteFill style={{background: PAL.surface, overflow: 'hidden'}}>
      <Paper />

      {scalpA > 0 ? (
        <div style={{position: 'absolute', inset: 0, opacity: scalpA}}>
          <ThreeCanvas width={W} height={H} shadows gl={GL} onCreated={(s) => { s.gl.localClippingEnabled = true; }} camera={{fov: 42, near: 0.1, far: 300, position: camM.pos}}>
            <CameraRig spec={camM} />
            <Lights />
            <ScalpScene st={scalp} />
          </ThreeCanvas>
        </div>
      ) : null}
      {tubeA > 0 ? (
        <div style={{position: 'absolute', inset: 0, opacity: tubeA}}>
          <ThreeCanvas width={W} height={H} shadows gl={GL} camera={{fov: 40, near: 0.1, far: 300, position: camT.pos}}>
            <CameraRig spec={camT} />
            <Lights />
            <TubeScene st={tube} />
          </ThreeCanvas>
        </div>
      ) : null}
      <EdgeFade t={t} />

      {/* подписи общего плана, глава 1 */}
      {lab(projM(A.sheath(0, 0.18)), 30, -240, 'корень волоса', 4.2, 6.4)}
      {lab(projM(A.papilla(1)), 130, -110, 'питающий сосочек', 4.7, 6.4)}
      {lab(projM(A.hairMid(1)), 110, 30, 'старый волос выпадает', 7.0, 8.4)}
      {t >= 16.2 && t < 24 ? (
        <>
          <Chip x={projM(A.papilla(1))[0] + 60} y={projM(A.papilla(1))[1] - 60} text="СТОП-СИГНАЛ" alpha={env(t, 16.3, 18.8, 0.3, 0.3)} />
          <Chip x={projM(A.papilla(1))[0] + 60} y={projM(A.papilla(1))[1] - 30} text="РОСТ КОРОЧЕ" alpha={env(t, 18.9, 21.2, 0.3, 0.3)} />
          <MarkerNote from={[820, 520]} to={[projM(A.hairTip(1))[0] + 14, projM(A.hairTip(1))[1] + 6]} text="пушок" textPos={[760, 500]} prog={invLerp(21.4, 22.6, t)} alpha={env(t, 21.4, 23.9, 0.01, 0.4)} />
        </>
      ) : null}
      {/* подписи, глава 2: пробирка */}
      {t >= 24 && t < 31 ? (
        <>
          {lab(projT(tA.plasma), 170, -60, 'плазма', 28.0, 30.4)}
          {lab(projT(tA.buffy), 190, 70, 'тромбоциты', 28.5, 30.5)}
          {lab(projT(tA.rbc), -50, -130, 'красные клетки', 28.2, 30.4, 'right')}
        </>
      ) : null}
      {/* подписи, глава 2: инъекция */}
      {t >= 38.4 && t < 44.2 ? (
        <>
          <Chip x={60} y={480} text="НЕГЛУБОКО, ≈ 2 ММ" alpha={env(t, 39.0, 41.6, 0.3, 0.3)} colors={[PAL.markerSoft, PAL.marker]} />
          {lab(projM(A.inject(1)), 190, 40, 'плазма под кожей', 39.9, 41.6)}
          <Chip x={projM(A.papilla(1))[0] + 60} y={projM(A.papilla(1))[1] - 30} text="РОСТ ДОЛЬШЕ" alpha={env(t, 42.6, 43.9, 0.3, 0.3)} colors={[PAL.scrubSoft, PAL.scrub]} />
        </>
      ) : null}
      <ScaleBar x={850} y={1186} len={mmPx} label="1 ММ" alpha={scaleA * 0.9} />

      {/* линзы */}
      <Lens3D st={zDht} id="dht">
        <ThreeCanvas width={W} height={H} shadows={false} gl={GL} camera={{fov: 38, near: 0.1, far: 300, position: camDht.pos}}>
          <CameraRig spec={camDht} />
          <Lights shadow={false} />
          <MicroScene ep="dht" tau={zDht.tau} />
        </ThreeCanvas>
      </Lens3D>
      <Lens3D st={zPrp} id="prp">
        <ThreeCanvas width={W} height={H} shadows={false} gl={GL} camera={{fov: 38, near: 0.1, far: 300, position: camPrp.pos}}>
          <CameraRig spec={camPrp} />
          <Lights shadow={false} />
          <MicroScene ep="prp" tau={zPrp.tau} />
        </ThreeCanvas>
      </Lens3D>

      {/* подписи внутри линз */}
      {zDht.active ? (
        <>
          <Chip x={mapDht([0, 2.9, 0])[0] - 96} y={mapDht([0, 2.9, 0])[1]} text="ФЕРМЕНТ" alpha={env(zDht.tau, 1.9, 3.6, 0.25, 0.3) * Math.min(1, zDht.u * 2)} />
          <Chip x={mapDht([0, 2.9, 0])[0] - 150} y={mapDht([0, 2.9, 0])[1]} text="РАСТИ МЕНЬШЕ" alpha={env(zDht.tau, 5.5, 7.4, 0.25, 0.3) * Math.min(1, zDht.u * 2)} />
          <Callout anchor={mapDht([0, -2.6, 0.4])} pos={[mapDht([0, -2.6, 0.4])[0] - 150, mapDht([0, -2.6, 0.4])[1] + 40]} text="мужской гормон" prog={invLerp(0.6, 1.3, zDht.tau)} alpha={env(zDht.tau, 0.6, 2.4, 0.01, 0.35) * Math.min(1, zDht.u * 2)} align="right" />
          <MarkerNote from={[mapDht([2.9, 0.9, 0])[0] + 40, mapDht([2.9, 0.9, 0])[1] - 80]} to={[mapDht(MIC3.fibro[1].p)[0] + 30, mapDht(MIC3.fibro[1].p)[1] - 20]} text="DHT" textPos={[mapDht([2.9, 0.9, 0])[0] - 10, mapDht([2.9, 0.9, 0])[1] - 100]} prog={invLerp(3.8, 4.8, zDht.tau)} alpha={env(zDht.tau, 3.8, 6.4, 0.01, 0.4) * Math.min(1, zDht.u * 2)} size={60} />
          <Callout anchor={mapDht([MIC3.fibro[0].p[0], MIC3.fibro[0].p[1] - 0.05, MIC3.fibro[0].p[2] + 0.42])} pos={[mapDht(MIC3.fibro[0].p)[0] - 120, mapDht(MIC3.fibro[0].p)[1] + 140]} text="рецептор" prog={invLerp(4.4, 5.1, zDht.tau)} alpha={env(zDht.tau, 4.4, 6.2, 0.01, 0.35) * Math.min(1, zDht.u * 2)} align="right" />
        </>
      ) : null}
      {zPrp.active ? (
        <>
          <Callout anchor={mapPrp([PLATELET[0], PLATELET[1] + 0.4, PLATELET[2]])} pos={[mapPrp(PLATELET)[0] - 40, mapPrp(PLATELET)[1] - 150]} text="тромбоцит" prog={invLerp(0.2, 0.9, zPrp.tau)} alpha={env(zPrp.tau, 0.2, 2.2, 0.01, 0.35) * Math.min(1, zPrp.u * 2)} align="left" />
          {factors.map((name, k) => {
            const t0 = 1.2 + k * 0.28;
            const pr = P(zPrp.tau, t0, t0 + 1.5, E.inOut);
            if (pr <= 0) return null;
            const target = MIC3.fibro[(k * 2) % MIC3.fibro.length].p;
            const pts = bentCurve([mapPrp(PLATELET)[0] + 60, mapPrp(PLATELET)[1] + (k - 1.5) * 16], [mapPrp(target)[0] - 10, mapPrp(target)[1] - 40], 0.3 - k * 0.14, 24);
            const p = pts[Math.min(24, Math.floor(pr * 24))];
            const alpha = Math.min(1, pr * 6) * (1 - P(pr, 0.9, 1)) * Math.min(1, zPrp.u * 2);
            return <Chip key={name} x={p[0]} y={p[1]} text={name} alpha={alpha} colors={[PAL.scrubSoft, PAL.scrub]} />;
          })}
          <Chip x={mapPrp([0, 2.9, 0])[0] - 150} y={mapPrp([0, 2.9, 0])[1]} text="СИГНАЛ: РАСТИ" alpha={env(zPrp.tau, 3.6, 6.6, 0.3, 0.3) * Math.min(1, zPrp.u * 2)} colors={[PAL.scrubSoft, PAL.scrub]} />
          <Callout anchor={mapPrp(MIC3.fibro[2].p)} pos={[mapPrp(MIC3.fibro[2].p)[0] + 170, mapPrp(MIC3.fibro[2].p)[1] - 90]} text="клетки корня" prog={invLerp(2.4, 3.1, zPrp.tau)} alpha={env(zPrp.tau, 2.4, 4.6, 0.01, 0.35) * Math.min(1, zPrp.u * 2)} />
          <Callout anchor={mapPrp([-1.35, -1.25, 0.7])} pos={[mapPrp([-1.35, -1.25, 0.7])[0] - 120, mapPrp([-1.35, -1.25, 0.7])[1] + 120]} text="новые сосуды" prog={invLerp(5.0, 5.7, zPrp.tau)} alpha={env(zPrp.tau, 5.0, 6.6, 0.01, 0.35) * Math.min(1, zPrp.u * 2)} align="right" />
        </>
      ) : null}

      <Evidence t={t} />
      <Outro t={t} />

      <Tag alpha={env(t, 0.7, 63.2, 0.4, 0.4)} />
      <Clock t={t} alpha={env(t, 3.8, 57.6, 0.5, 0.4)} />
      <Nav t={t} alpha={env(t, 3.8, 57.8, 0.5, 0.5)} />
      <Hook t={t} />
      <Subtitles t={t} />

      {showLoop ? (
        <Layer>
          <MarkerPath pts={loopPts} dash={[24, 18]} closed progress={t < 10 ? loopIn : loopOut} alpha={loopAlpha} />
        </Layer>
      ) : null}

      <PaperGrain />
    </AbsoluteFill>
  );
};
