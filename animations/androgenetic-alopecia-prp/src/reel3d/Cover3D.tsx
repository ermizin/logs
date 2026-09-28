// Обложка 3D-версии: макет среза в верхней трети, текст в зоне y 860–1500.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {PAL, FONT, W, H} from '../reel/palette';
import {rgba} from '../reel/math';
import {Pt, handEllipse, wavyLine} from '../reel/geom';
import {Layer, MarkerPath, Txt} from '../reel/Marker';
import {Paper, PaperGrain} from '../reel/Paper';
import {scalpState} from '../reel/scenes/Scalp';
import {loadReelFonts} from '../reel/fonts';
import {CameraRig, Env, Lights, orbit, projector, setupRenderer} from './cam';
import {FZ, ScalpScene} from './Scalp3D';

loadReelFonts();

export const Cover3D: React.FC = () => {
  const st = scalpState(20.0);
  const cam = orbit([0.62, -4.25, 0.2], 18.8, 0.44, 0.33, 42);
  const proj = projector(cam);
  const pTop = proj([0, 0.15, FZ]);
  const pBulb = proj([0.5, -2.95, FZ]);
  const loopC: Pt = [(pTop[0] + pBulb[0]) / 2, (pTop[1] + pBulb[1]) / 2];
  const loopRy = Math.hypot(pBulb[0] - pTop[0], pBulb[1] - pTop[1]) / 2 + 30;
  const c = (a: number) => rgba(PAL.surface, a);
  const grad = `linear-gradient(180deg, ${c(1)} 0%, ${c(0.9)} ${(250 / H) * 100}%, ${c(0)} ${(330 / H) * 100}%, ${c(0)} ${(760 / H) * 100}%, ${c(1)} ${(880 / H) * 100}%, ${c(1)} 100%)`;
  const w = 372;
  return (
    <AbsoluteFill style={{background: PAL.surface, fontFamily: FONT.sans}}>
      <Paper />
      <ThreeCanvas width={W} height={H} shadows gl={{alpha: true, antialias: true}} onCreated={(s) => setupRenderer(s.gl)} camera={{fov: 42, near: 0.1, far: 300, position: cam.pos}}>
        <CameraRig spec={cam} />
        <Env intensity={0.5} />
        <Lights />
        <ScalpScene st={st} />
      </ThreeCanvas>
      <Layer>
        <MarkerPath pts={handEllipse(loopC[0], loopC[1], 88, loopRy, 5)} dash={[24, 18]} closed width={8} />
      </Layer>
      <div style={{position: 'absolute', inset: 0, background: grad}} />
      <Txt x={88} y={950} size={26} weight={500} family="mono" spacing={2.1}>
        РАЗБОР
      </Txt>
      <Txt x={84} y={1068} size={96} weight={700} style={{letterSpacing: '-0.03em'}}>
        Почему редеют
      </Txt>
      <Txt x={88} y={1170} size={104} weight={500} family="serif" italic>
        волосы?
      </Txt>
      <Layer>
        <MarkerPath pts={wavyLine(92, 1204, w - 4)} />
      </Layer>
      <Txt x={88} y={1300} size={42} color={PAL.inkMuted}>
        Что происходит с корнем волоса
      </Txt>
      <Txt x={88} y={1358} size={42} color={PAL.inkMuted}>
        и честно про PRP
      </Txt>
      <PaperGrain />
    </AbsoluteFill>
  );
};
