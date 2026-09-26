// Экспорт анимации в MP4 1080×1920, 30 к/с (H.264, yuv420p) + обложка PNG.
// Запуск: NODE_PATH=$(npm root -g) node tools/render.cjs [out.mp4]
// Нужны: playwright (Chromium) и ffmpeg с libx264 (FFMPEG=/путь/к/ffmpeg).
// FONTS_DIR — необязательная папка с gf.css и файлами шрифтов (если Google Fonts недоступны напрямую).
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  const root = path.resolve(__dirname, '..');
  const out = path.resolve(process.argv[2] || path.join(root, 'export', 'capsular-contracture-1080x1920.mp4'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const ffmpeg = process.env.FFMPEG || 'ffmpeg';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const FD = process.env.FONTS_DIR;
  if (FD) {
    await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(FD, 'gf.css'), 'utf8') }));
    await page.route('https://fonts.gstatic.com/**', (r) => r.fulfill({
      contentType: 'font/woff2', headers: { 'access-control-allow-origin': '*' },
      body: fs.readFileSync(path.join(FD, r.request().url().replace('https://fonts.gstatic.com/', '').replace(/\//g, '_'))),
    }));
  }
  page.on('pageerror', (e) => console.error('page error:', e));
  await page.goto('file://' + path.join(root, 'index.html') + '?render');
  await page.waitForFunction(() => window.__cc);
  await page.evaluate(() => window.__cc.ready);
  const { DUR, FPS } = await page.evaluate(() => ({ DUR: window.__cc.DUR, FPS: window.__cc.FPS }));
  const frames = Math.round(DUR * FPS);

  const ff = spawn(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
    '-map', '0:v', '-map', '1:a', '-shortest',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'animation',
    '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    const b64 = await page.evaluate((t) => { window.__cc.frame(t); return document.getElementById('stage').toDataURL('image/png').slice(22); }, i / FPS);
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${frames} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));

  // обложка
  const cover = await page.evaluate(() => { window.__cc.cover(); return document.getElementById('stage').toDataURL('image/png').slice(22); });
  fs.writeFileSync(out.replace(/\.mp4$/, '-cover.png'), Buffer.from(cover, 'base64'));
  await browser.close();
  console.log('done:', out);
})();
