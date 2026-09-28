// Renders one PNG per scene (bundle once, render many) for quick visual QA.
// Usage: node scripts/stills.mjs [outDir] [frame,frame,...]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = resolve(process.argv[2] ?? join(root, 'out', 'stills'));
const frames = (process.argv[3] ?? '120,400,780,1080,1370,1670,1980,2330,2610,2980,3270,3560')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n));

mkdirSync(outDir, {recursive: true});

const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;

const serveUrl = await bundle({
  entryPoint: join(root, 'src', 'index.ts'),
  publicDir: join(root, 'public'),
});

const composition = await selectComposition({
  serveUrl,
  id: 'AgaPrp',
  browserExecutable,
});

console.log(`composition ${composition.id}: ${composition.durationInFrames} frames @ ${composition.fps}fps`);

for (const frame of frames) {
  const output = join(outDir, `frame-${String(frame).padStart(5, '0')}.png`);
  await renderStill({
    composition,
    serveUrl,
    output,
    frame,
    imageFormat: 'png',
    browserExecutable,
    scale: 0.5,
  });
  console.log(`rendered ${output}`);
}
