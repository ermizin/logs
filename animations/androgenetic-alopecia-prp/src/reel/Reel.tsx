// Режиссура рила: общий план, линзы, подписи, HUD, бумага. Каждый кадр — функция времени t.
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {PAL, W, H} from './palette';
import {E, P, env, invLerp, lerp} from './math';
import {Pt} from './geom';
import {Callout, Chip, Layer, MarkerNote, MarkerPath, ScaleBar} from './Marker';
import {EdgeFade, Paper, PaperGrain} from './Paper';
import {Clock, Hook, Nav, Outro, Subtitles, Tag} from './Hud';
import {DUR} from './script';
import {ScalpMacro, anchors, follicleLoopOutline, scalpState, PX_PER_MM} from './scenes/Scalp';
import {Lens, LensSpec, lensState} from './scenes/Lens';
import {BulbMicro} from './scenes/Micro';
import {TubeMacro, buffyY, tubeState} from './scenes/Tube';
import {Evidence} from './scenes/Evidence';
import {loadReelFonts} from './fonts';

loadReelFonts();

const Z_DHT: LensSpec = {in0: 8.6, in1: 9.7, out0: 15.5, out1: 16.4, tau0: 9.2, seed: 3};
const Z_PRP: LensSpec = {in0: 30.4, in1: 31.5, out0: 37.5, out1: 38.5, tau0: 31.0, seed: 7};

// кадрирование общего плана: на хуке иллюстрация ниже и чуть мельче
function framing(t: number) {
  const k = P(t, 3.3, 4.5, E.inOut);
  return {s: lerp(0.92, 1, k), ox: lerp(10, 0, k), oy: lerp(150, 0, k)};
}

export const Reel: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = ((frame / fps) % DUR + DUR) % DUR;

  const fr = framing(t);
  const map = (p: Pt): Pt => [p[0] * fr.s + fr.ox, p[1] * fr.s + fr.oy];
  const scalp = scalpState(t);
  const A = anchors(scalp);
  const tube = tubeState(t);

  // линзы: якорь — сосочек среднего фолликула / тромбоцитарный слой пробирки
  const zDht = lensState(t, Z_DHT, map(A.papilla(1)));
  const zPrp = lensState(t, Z_PRP, [540, buffyY(tube)]);

  // видимость общих планов
  const scalpA = Math.max(env(t, 0.1, 24.3, 0.7, 0.5), env(t, 37.9, 44.2, 0.6, 0.5));
  const tubeA = env(t, 24.0, 38.6, 0.01, 0.6);
  // приближение общего плана к якорю линзы
  const zoom = (u: number, a: Pt) => `translate(${a[0]} ${a[1]}) scale(${lerp(1, 1.12, u)}) translate(${-a[0]} ${-a[1]})`;

  // подписи общего плана
  const lab = (anchor: Pt, dx: number, dy: number, text: string, t0: number, t1: number, align: 'left' | 'right' = 'left') => (
    <Callout key={text + t0} anchor={map(anchor)} pos={[map(anchor)[0] + dx, map(anchor)[1] + dy]} text={text} prog={invLerp(t0, t0 + 0.7, t)} alpha={env(t, t0, t1, 0.01, 0.35)} align={align} />
  );
  const scaleA = Math.max(env(t, 4.4, 8.6, 0.4, 0.3), env(t, 16.4, 23.9, 0.4, 0.3), env(t, 38.8, 43.9, 0.4, 0.3));

  // пунктирная «заставка»: контур фолликула рисуется в начале и стирается в конце
  const loopPts = follicleLoopOutline().map((p): Pt => [p[0] * 0.92 + 10, p[1] * 0.92 + 150]);
  const loopIn = P(t, 0.05, 0.95, E.inOut);
  const loopAlpha = t < 10 ? 1 - P(t, 3.4, 4.0) : 1;
  const loopOut = 1 - P(t, 63.0, 63.9, E.inOut);
  const showLoop = t < 4.0 || t >= 62.9;

  return (
    <AbsoluteFill style={{background: PAL.surface, overflow: 'hidden'}}>
      <Paper />

      {/* общий план: кожа головы */}
      {scalpA > 0 ? (
        <Layer opacity={scalpA}>
          <g transform={zoom(zDht.u, zDht.lc)}>
            <g transform={`translate(${fr.ox} ${fr.oy}) scale(${fr.s})`}>
              <ScalpMacro t={t} st={scalp} />
            </g>
          </g>
        </Layer>
      ) : null}
      {/* общий план: пробирка */}
      {tubeA > 0 ? (
        <Layer opacity={tubeA}>
          <g transform={zoom(zPrp.u, zPrp.lc)}>
            <TubeMacro st={tube} />
          </g>
        </Layer>
      ) : null}
      <EdgeFade t={t} />

      {/* подписи общего плана, глава 1 */}
      {lab(A.sheath(0, 0.45), -40, -150, 'корень волоса', 4.2, 6.4, 'right')}
      {lab(A.papilla(1), 150, 60, 'питающий сосочек', 4.7, 6.4)}
      {lab([(A.hairTip(1)[0] + A.sheath(1, 0)[0]) / 2 + 10, (A.hairTip(1)[1] + A.sheath(1, 0)[1]) / 2 + 40], 110, 30, 'старый волос выпадает', 7.0, 8.4)}
      {t >= 16.2 && t < 24 ? (
        <>
          <Chip x={615} y={map(A.papilla(1))[1] - 44} text="СТОП-СИГНАЛ" alpha={env(t, 16.3, 18.8, 0.3, 0.3)} />
          <Chip x={615} y={map(A.papilla(1))[1] - 12} text="РОСТ КОРОЧЕ" alpha={env(t, 18.9, 21.2, 0.3, 0.3)} />
          <MarkerNote from={[820, 520]} to={[map(A.hairTip(1))[0] + 14, map(A.hairTip(1))[1] + 6]} text="пушок" textPos={[760, 500]} prog={invLerp(21.4, 22.6, t)} alpha={env(t, 21.4, 23.9, 0.01, 0.4)} />
        </>
      ) : null}
      {/* подписи, глава 2: пробирка */}
      {t >= 24 && t < 31 ? (
        <>
          {lab([560, 640], 170, -60, 'плазма', 28.0, 30.4)}
          {lab([560, buffyY(tube) + 8], 190, 70, 'тромбоциты', 28.5, 30.5)}
          {lab([520, 1000], -150, 60, 'красные клетки', 28.2, 30.4, 'right')}
        </>
      ) : null}
      {/* подписи, глава 2: инъекция */}
      {t >= 38.4 && t < 44.2 ? (
        <>
          <Chip x={60} y={480} text="НЕГЛУБОКО, ≈ 2 ММ" alpha={env(t, 39.0, 41.6, 0.3, 0.3)} colors={[PAL.markerSoft, PAL.marker]} />
          {lab(A.injectPoint(1), 190, 40, 'плазма под кожей', 39.9, 41.6)}
          <Chip x={615} y={map(A.papilla(1))[1] - 12} text="РОСТ ДОЛЬШЕ" alpha={env(t, 42.6, 43.9, 0.3, 0.3)} colors={[PAL.scrubSoft, PAL.scrub]} />
        </>
      ) : null}
      <ScaleBar x={850} y={1186} len={PX_PER_MM * fr.s} label="1 ММ" alpha={scaleA * 0.9} />

      {/* линзы */}
      <Lens st={zDht} id="dht">
        <BulbMicro ep="dht" tau={zDht.tau} />
      </Lens>
      <Lens st={zPrp} id="prp">
        <BulbMicro ep="prp" tau={zPrp.tau} />
      </Lens>
      {/* подписи внутри линз (экранные координаты через map линзы) */}
      {zDht.active ? (
        <>
          <Callout anchor={zDht.map([0, 400])} pos={zDht.map([-150, 330])} text="мужской гормон" prog={invLerp(0.6, 1.3, zDht.tau)} alpha={env(zDht.tau, 0.6, 2.4, 0.01, 0.35) * Math.min(1, zDht.u * 2)} align="right" />
          <MarkerNote from={zDht.map([300, -120])} to={zDht.map([110, 40])} text="DHT" textPos={zDht.map([280, -150])} prog={invLerp(3.8, 4.8, zDht.tau)} alpha={env(zDht.tau, 3.8, 6.4, 0.01, 0.4) * Math.min(1, zDht.u * 2)} size={60} />
          <Callout anchor={zDht.map([-120, 210])} pos={zDht.map([-200, 330])} text="рецептор" prog={invLerp(4.4, 5.1, zDht.tau)} alpha={env(zDht.tau, 4.4, 6.2, 0.01, 0.35) * Math.min(1, zDht.u * 2)} align="right" />
        </>
      ) : null}
      {zPrp.active ? (
        <>
          <Callout anchor={zPrp.map([-250, -200])} pos={zPrp.map([-300, -330])} text="тромбоцит" prog={invLerp(0.2, 0.9, zPrp.tau)} alpha={env(zPrp.tau, 0.2, 2.2, 0.01, 0.35) * Math.min(1, zPrp.u * 2)} align="left" />
          <Callout anchor={zPrp.map([60, 150])} pos={zPrp.map([190, 80])} text="клетки корня" prog={invLerp(2.4, 3.1, zPrp.tau)} alpha={env(zPrp.tau, 2.4, 4.6, 0.01, 0.35) * Math.min(1, zPrp.u * 2)} />
          <Callout anchor={zPrp.map([-110, 210])} pos={zPrp.map([-230, 330])} text="новые сосуды" prog={invLerp(5.0, 5.7, zPrp.tau)} alpha={env(zPrp.tau, 5.0, 6.6, 0.01, 0.35) * Math.min(1, zPrp.u * 2)} align="right" />
        </>
      ) : null}

      {/* глава 3 и финал */}
      <Evidence t={t} />
      <Outro t={t} />

      {/* HUD */}
      <Tag alpha={env(t, 0.7, 63.2, 0.4, 0.4)} />
      <Clock t={t} alpha={env(t, 3.8, 57.6, 0.5, 0.4)} />
      <Nav t={t} alpha={env(t, 3.8, 57.8, 0.5, 0.5)} />
      <Hook t={t} />
      <Subtitles t={t} />

      {/* закольцовка */}
      {showLoop ? (
        <Layer>
          <MarkerPath pts={loopPts} dash={[24, 18]} closed progress={t < 10 ? loopIn : loopOut} alpha={loopAlpha} />
        </Layer>
      ) : null}

      <PaperGrain />
    </AbsoluteFill>
  );
};
