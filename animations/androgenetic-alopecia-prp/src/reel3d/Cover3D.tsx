// Обложка 3D-версии: макет среза в верхней трети, текст в зоне y 860–1500.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {PAL, FONT, W, H} from '../reel/palette';
import {rgba} from '../reel/math';
import {handEllipse, wavyLine} from '../reel/geom';
import {Layer, MarkerPath, Txt} from '../reel/Marker';
import {Paper, PaperGrain} from '../reel/Paper';
import {scalpState} from '../reel/scenes/Scalp';
import {loadReelFonts} from '../reel/fonts';
import {CameraRig, Lights, orbit, projector} from './cam';
import {ScalpScene} from './Scalp3D';

loadReelFonts();

export const Cover3D: React.FC = () => {
  const st = scalpState(20.0);
  const cam = orbit([0.75, -4.3, 0], 21, 0.3, 0.36, 42);
  const proj = projector(cam);
  const midC = proj([0.16, -1.65, 2]);
  const c = (a: number) => rgba(PAL.surface, a);
  const grad = `linear-gradient(180deg, ${c(1)} 0%, ${c(0.9)} ${(250 / H) * 100}%, ${c(0)} ${(330 / H) * 100}%, ${c(0)} ${(760 / H) * 100}%, ${c(1)} ${(880 / H) * 100}%, ${c(1)} 100%)`;
  const w = 372;
  return (
    <AbsoluteFill style={{background: PAL.surface, fontFamily: FONT.sans}}>
      <Paper />
      <ThreeCanvas width={W} height={H} shadows gl={{alpha: true, antialias: true}} onCreated={(s) => { s.gl.localClippingEnabled = true; }} camera={{fov: 42, near: 0.1, far: 300, position: cam.pos}}>
        <CameraRig spec={cam} />
        <Lights />
        <ScalpScene st={st} />
      </ThreeCanvas>
      <Layer>
        <MarkerPath pts={handEllipse(midC[0], midC[1], 70, 300, 5)} dash={[24, 18]} closed width={8} />
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
