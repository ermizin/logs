// Copies the font subsets used by the reel (Latin + Cyrillic) from @fontsource
// packages into public/fonts so Remotion can serve them via staticFile()
// without network access at render time.
//   Onest 400–800 (sans), Playfair Display 500 italic (serif accent words),
//   IBM Plex Mono 400/500 (tracked uppercase labels).
import {mkdirSync, copyFileSync, existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dst = join(root, 'public', 'fonts');
mkdirSync(dst, {recursive: true});

const subsets = ['latin', 'cyrillic'];
const families = [
  {pkg: 'onest', name: 'onest', weights: [400, 500, 600, 700, 800], style: 'normal'},
  {pkg: 'playfair-display', name: 'playfair-display', weights: [500], style: 'italic'},
  {pkg: 'ibm-plex-mono', name: 'ibm-plex-mono', weights: [400, 500], style: 'normal'},
];

let copied = 0;
for (const f of families) {
  const src = join(root, 'node_modules', '@fontsource', f.pkg, 'files');
  if (!existsSync(src)) {
    console.warn(`[copy-fonts] @fontsource/${f.pkg} not found, skipping`);
    continue;
  }
  for (const w of f.weights) {
    for (const s of subsets) {
      const name = `${f.name}-${s}-${w}-${f.style}.woff2`;
      const from = join(src, name);
      if (existsSync(from)) {
        copyFileSync(from, join(dst, name));
        copied += 1;
      } else {
        console.warn(`[copy-fonts] missing ${name}`);
      }
    }
  }
}
console.log(`[copy-fonts] copied ${copied} font files to public/fonts`);
