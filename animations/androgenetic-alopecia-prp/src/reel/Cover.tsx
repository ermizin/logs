// Обложка рила: текст в зоне y 860–1500 (сетка профиля срезает по 240 px сверху и снизу).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {PAL, FONT, W, H} from './palette';
import {rgba} from './math';
import {wavyLine} from './geom';
import {Layer, MarkerPath, Txt} from './Marker';
import {Paper, PaperGrain} from './Paper';
import {ScalpMacro, follicleLoopOutline, scalpState} from './scenes/Scalp';
import {loadReelFonts} from './fonts';

loadReelFonts();

export const Cover: React.FC = () => {
  const st = scalpState(20.0); // средний фолликул уже миниатюризирован
  const s = 0.72;
  const tx = 540 - 540 * s + 20;
  const ty = 520 - 600 * s;
  const loop = follicleLoopOutline().map(([x, y]): [number, number] => [x * s + tx, y * s + ty]);
  const c = (a: number) => rgba(PAL.surface, a);
  const grad = `linear-gradient(180deg, ${c(1)} 0%, ${c(0.9)} ${(250 / H) * 100}%, ${c(0)} ${(330 / H) * 100}%, ${c(0)} ${(760 / H) * 100}%, ${c(1)} ${(880 / H) * 100}%, ${c(1)} 100%)`;
  const w = 470;
  return (
    <AbsoluteFill style={{background: PAL.surface, fontFamily: FONT.sans}}>
      <Paper />
      <Layer>
        <g transform={`translate(${tx} ${ty}) scale(${s})`}>
          <ScalpMacro t={20} st={st} />
        </g>
        <MarkerPath pts={loop} dash={[24, 18]} closed width={8} />
      </Layer>
      <div style={{position: 'absolute', inset: 0, background: grad}} />
      <Txt x={88} y={950} size={26} weight={500} family="mono" spacing={2.1}>
        РАЗБОР
      </Txt>
      <Txt x={84} y={1068} size={84} weight={700} style={{letterSpacing: '-0.03em'}}>
        Андрогенетическая
      </Txt>
      <Txt x={88} y={1170} size={104} weight={500} family="serif" italic>
        алопеция
      </Txt>
      <Layer>
        <MarkerPath pts={wavyLine(92, 1204, w - 4)} />
      </Layer>
      <Txt x={88} y={1300} size={42} color={PAL.inkMuted}>
        Почему волосы редеют
      </Txt>
      <Txt x={88} y={1358} size={42} color={PAL.inkMuted}>
        и что на самом деле может PRP
      </Txt>
      <PaperGrain />
      <div style={{position: 'absolute', width: W, height: 0}} />
    </AbsoluteFill>
  );
};
