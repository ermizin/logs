// Copies the Inter font subsets needed for the video (Latin + Cyrillic)
// from the @fontsource/inter package into public/fonts so Remotion can
// serve them via staticFile() without network access at render time.
import {mkdirSync, copyFileSync, existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const src = join(root, 'node_modules', '@fontsource', 'inter', 'files');
const dst = join(root, 'public', 'fonts');

if (!existsSync(src)) {
  console.warn('[copy-fonts] @fontsource/inter not found, skipping');
  process.exit(0);
}

mkdirSync(dst, {recursive: true});

const weights = [400, 500, 600, 700, 800];
const subsets = ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'];
let copied = 0;
for (const w of weights) {
  for (const s of subsets) {
    const name = `inter-${s}-${w}-normal.woff2`;
    const from = join(src, name);
    if (existsSync(from)) {
      copyFileSync(from, join(dst, name));
      copied += 1;
    }
  }
}
console.log(`[copy-fonts] copied ${copied} font files to public/fonts`);
