import React from 'react';
import {AbsoluteFill} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {loadInter} from './fonts';
import {SCENES, SCENE_ORDER, TRANSITION, SceneKey} from './timeline';
import {colors, font} from './theme';
import {TitleScene} from './scenes/TitleScene';
import {BasicsScene} from './scenes/BasicsScene';
import {PathwayScene} from './scenes/PathwayScene';
import {MiniaturizationScene} from './scenes/MiniaturizationScene';
import {ClassificationScene} from './scenes/ClassificationScene';
import {StandardTherapyScene} from './scenes/StandardTherapyScene';
import {PrpPrepScene} from './scenes/PrpPrepScene';
import {PrpMechanismScene} from './scenes/PrpMechanismScene';
import {ProtocolScene} from './scenes/ProtocolScene';
import {EvidenceScene} from './scenes/EvidenceScene';
import {SafetyScene} from './scenes/SafetyScene';
import {SummaryScene} from './scenes/SummaryScene';

loadInter();

const TOTAL = SCENE_ORDER.length;

const sceneComponents: Record<SceneKey, React.FC<{index: number; total: number}>> = {
  title: TitleScene,
  basics: BasicsScene,
  pathway: PathwayScene,
  miniaturization: MiniaturizationScene,
  classification: ClassificationScene,
  standard: StandardTherapyScene,
  prpPrep: PrpPrepScene,
  prpMechanism: PrpMechanismScene,
  protocol: ProtocolScene,
  evidence: EvidenceScene,
  safety: SafetyScene,
  summary: SummaryScene,
};

export const AgaPrpVideo: React.FC = () => {
  const children: React.ReactNode[] = [];

  SCENE_ORDER.forEach((key, i) => {
    if (i > 0) {
      // Alternate between a soft fade and a horizontal slide so the cut
      // rhythm does not feel mechanical.
      const presentation = i % 3 === 0 ? slide({direction: 'from-right'}) : fade();
      children.push(
        <TransitionSeries.Transition
          key={`transition-${key}`}
          presentation={presentation}
          timing={linearTiming({durationInFrames: TRANSITION})}
        />,
      );
    }
    const Scene = sceneComponents[key];
    children.push(
      <TransitionSeries.Sequence key={`scene-${key}`} durationInFrames={SCENES[key]}>
        <Scene index={i + 1} total={TOTAL} />
      </TransitionSeries.Sequence>,
    );
  });

  return (
    <AbsoluteFill style={{backgroundColor: colors.bg, fontFamily: font}}>
      <TransitionSeries>{children}</TransitionSeries>
    </AbsoluteFill>
  );
};
