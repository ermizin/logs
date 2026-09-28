import {continueRender, delayRender, staticFile} from 'remotion';

// Unicode ranges mirror the Google Fonts subsets shipped by @fontsource.
const RANGES: Record<string, string> = {
  latin:
    'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  cyrillic: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116',
};

type Face = {family: string; file: string; weight: number; style: 'normal' | 'italic'};

const FACES: Face[] = [
  ...[400, 500, 600, 700, 800].map((w) => ({family: 'Onest', file: 'onest', weight: w, style: 'normal' as const})),
  {family: 'Playfair Display', file: 'playfair-display', weight: 500, style: 'italic'},
  ...[400, 500].map((w) => ({family: 'IBM Plex Mono', file: 'ibm-plex-mono', weight: w, style: 'normal' as const})),
];

let started = false;

export const loadReelFonts = () => {
  if (started || typeof document === 'undefined' || !('fonts' in document)) return;
  started = true;
  const handle = delayRender('Loading reel fonts');
  const faces: FontFace[] = [];
  for (const f of FACES) {
    for (const [subset, range] of Object.entries(RANGES)) {
      const url = staticFile(`fonts/${f.file}-${subset}-${f.weight}-${f.style}.woff2`);
      faces.push(
        new FontFace(f.family, `url(${url}) format('woff2')`, {
          weight: String(f.weight),
          style: f.style,
          unicodeRange: range,
        }),
      );
    }
  }
  Promise.allSettled(
    faces.map((f) =>
      f.load().then((loaded) => {
        document.fonts.add(loaded);
      }),
    ),
  )
    .then(() => continueRender(handle))
    .catch(() => continueRender(handle));
};
