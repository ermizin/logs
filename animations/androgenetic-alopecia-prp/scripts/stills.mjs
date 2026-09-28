// Renders PNG stills for quick visual QA (bundle once, render many).
// Usage: node scripts/stills.mjs [outDir] [t,t,... seconds] [compositionId]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = resolve(process.argv[2] ?? join(root, 'out', 'stills'));
const times = (process.argv[3] ?? '0.5,2,5.5,8,12.5,15,19.5,22.5,27.5,29.8,34,37,40,43,46,49.5,54.5,56.5,60,63.5')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n));
const compId = process.argv[4] ?? 'AgaPrpReel';

mkdirSync(outDir, {recursive: true});
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;

const serveUrl = await bundle({entryPoint: join(root, 'src', 'index.ts'), publicDir: join(root, 'public')});
const composition = await selectComposition({serveUrl, id: compId, browserExecutable});
console.log(`composition ${composition.id}: ${composition.durationInFrames} frames @ ${composition.fps}fps`);

for (const tt of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(tt * composition.fps));
  const output = join(outDir, `t-${tt.toFixed(1).padStart(5, '0')}.png`);
  await renderStill({composition, serveUrl, output, frame, imageFormat: 'png', browserExecutable, scale: 0.5});
  console.log(`rendered ${output}`);
}

if (compId === 'AgaPrpReel') {
  const cover = await selectComposition({serveUrl, id: 'AgaPrpReelCover', browserExecutable});
  const output = join(outDir, 'cover.png');
  await renderStill({composition: cover, serveUrl, output, frame: 0, imageFormat: 'png', browserExecutable, scale: 0.5});
  console.log(`rendered ${output}`);
}
