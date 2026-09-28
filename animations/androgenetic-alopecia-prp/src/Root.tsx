import React from 'react';
import {Composition, Still} from 'remotion';
import {Reel} from './reel/Reel';
import {Cover} from './reel/Cover';
import {FPS, H, W} from './reel/palette';
import {DUR} from './reel/script';
import {Reel3D} from './reel3d/Reel3D';
import {Cover3D} from './reel3d/Cover3D';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="AgaPrpReel" component={Reel} durationInFrames={Math.round(DUR * FPS)} fps={FPS} width={W} height={H} />
      <Still id="AgaPrpReelCover" component={Cover} width={W} height={H} />
      <Composition id="AgaPrpReel3D" component={Reel3D} durationInFrames={Math.round(DUR * FPS)} fps={FPS} width={W} height={H} />
      <Still id="AgaPrpReel3DCover" component={Cover3D} width={W} height={H} />
    </>
  );
};
