import React from 'react';
import {Composition} from 'remotion';
import {AgaPrpVideo} from './AgaPrpVideo';
import {FPS, HEIGHT, TOTAL_DURATION, WIDTH} from './timeline';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AgaPrp"
        component={AgaPrpVideo}
        durationInFrames={TOTAL_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
