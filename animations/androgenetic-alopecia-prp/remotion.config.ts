import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setPixelFormat('yuv420p');
Config.setCodec('h264');

// Allow rendering with an already installed Chrome/Chromium instead of
// downloading Remotion's headless shell (useful in sandboxed CI containers).
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}

// WebGL for the 3D reel: ANGLE works in headless Chromium without a GPU.
Config.setChromiumOpenGlRenderer('angle');
