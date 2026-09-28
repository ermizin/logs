import React from 'react';
import {Composition, Still} from 'remotion';
import {Reel} from './reel/Reel';
import {Cover} from './reel/Cover';
import {FPS, H, W} from './reel/palette';
import {DUR} from './reel/script';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="AgaPrpReel" component={Reel} durationInFrames={Math.round(DUR * FPS)} fps={FPS} width={W} height={H} />
      <Still id="AgaPrpReelCover" component={Cover} width={W} height={H} />
    </>
  );
};
