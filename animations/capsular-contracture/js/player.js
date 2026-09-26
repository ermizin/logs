'use strict';
/* Плеер: размер холста, воспроизведение, перемотка, главы, режим рендера для экспорта в MP4. */
(function () {
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const RENDER_MODE = /[?&]render\b/.test(location.search);
  let t = 0, playing = false, last = 0, bs = 1, dirty = true;
  const $ = (id) => document.getElementById(id);
  const playBtn = $('play'), scrub = $('scrub'), timeEl = $('time'), bigPlay = $('bigplay');

  function resize() {
    if (RENDER_MODE) { canvas.width = W; canvas.height = H; bs = 1; dirty = true; return; }
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const bw = Math.max(270, Math.min(W, Math.round(r.width * dpr)));
    canvas.width = bw; canvas.height = Math.round((bw * H) / W);
    bs = bw / W; dirty = true;
  }
  function draw() {
    ctx.setTransform(bs, 0, 0, bs, 0, 0);
    render(ctx, t);
    dirty = false;
  }
  const fmt = (s) => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  function syncUI() {
    if (!scrub) return;
    scrub.value = t.toFixed(2);
    scrub.style.setProperty('--p', (t / DUR) * 100 + '%');
    timeEl.textContent = fmt(t) + ' / ' + fmt(DUR);
    playBtn.setAttribute('aria-label', playing ? 'Пауза' : 'Смотреть');
    playBtn.dataset.state = playing ? 'playing' : 'paused';
    bigPlay.hidden = playing;
    document.querySelectorAll('[data-ch]').forEach((b) => {
      const a = +b.dataset.from, z = +b.dataset.to;
      b.classList.toggle('on', t >= a && t < z);
    });
  }
  function frame(now) {
    if (playing) {
      const dt = Math.min(0.1, (now - last) / 1000);
      t = (t + dt) % DUR;
      dirty = true;
    }
    last = now;
    if (dirty) { draw(); syncUI(); }
    requestAnimationFrame(frame);
  }
  function setPlaying(p) { playing = p; last = performance.now(); syncUI(); }
  function seek(v) { t = clamp(v, 0, DUR - 0.001); dirty = true; syncUI(); }

  const fontsReady = Promise.race([
    Promise.all([
      document.fonts.load('800 96px Onest', 'Капсулярная'),
      document.fonts.load('700 56px Onest', 'Капсула'),
      document.fonts.load('500 34px Onest', 'имплант'),
      document.fonts.load('400 24px Onest', 'Информация'),
      document.fonts.load('italic 500 104px "Playfair Display"', 'контрактура'),
      document.fonts.load('500 26px "IBM Plex Mono"', 'РАЗБОР 0123'),
      document.fonts.load('400 22px "IBM Plex Mono"', '1 СМ'),
    ]),
    new Promise((r) => setTimeout(r, 4000)),
  ]).then(() => document.fonts.ready);

  // экспорт кадров (tools/render.mjs)
  window.__cc = {
    DUR, FPS, W, H,
    ready: fontsReady,
    frame(time) { t = time; ctx.setTransform(1, 0, 0, 1, 0, 0); render(ctx, time); },
    cover() { ctx.setTransform(1, 0, 0, 1, 0, 0); renderCover(ctx); },
  };
  if (RENDER_MODE) { document.documentElement.classList.add('render'); resize(); return; }

  resize();
  window.addEventListener('resize', resize);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // кадр-постер, пока грузятся шрифты: хук уже на экране
  t = 2.9; draw(); syncUI();
  fontsReady.then(() => {
    _wrapCache.clear();
    dirty = true;
    if (!reduce) { t = 0; setPlaying(true); } else { t = 2.9; syncUI(); }
    requestAnimationFrame((n) => { last = n; frame(n); });
  });

  playBtn.addEventListener('click', () => setPlaying(!playing));
  bigPlay.addEventListener('click', () => setPlaying(true));
  canvas.addEventListener('click', () => setPlaying(!playing));
  scrub.addEventListener('input', () => { seek(parseFloat(scrub.value)); });
  scrub.addEventListener('pointerdown', () => { scrub._was = playing; setPlaying(false); });
  scrub.addEventListener('pointerup', () => { if (scrub._was) setPlaying(true); });
  document.querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', () => { seek(parseFloat(b.dataset.jump)); setPlaying(true); }));
  window.addEventListener('keydown', (e) => {
    if (e.target && /input|textarea|select/i.test(e.target.tagName) && e.target !== scrub) return;
    if (e.code === 'Space' || e.key === 'k') { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === 'ArrowRight' && e.target !== scrub) { seek(t + 2); }
    else if (e.key === 'ArrowLeft' && e.target !== scrub) { seek(t - 2); }
  });
})();
