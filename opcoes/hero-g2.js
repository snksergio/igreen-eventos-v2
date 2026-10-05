/* ============================================================
   Hero G2 — Mosaico de vidas, versão "frase única"
   O "2.000" feito de pessoas é a palavra que falta na frase:
   "Renda recorrente que transforma +2.000 vidas de verdade".
   Coreografia
   1. Entrada (uma vez): o texto sobe; o número surge cinza e
      apagado ("antes"); o clipe da primeira linha dispara um anel e
      uma onda desce dele pelo número, acendendo cada ponto em cor
      ("depois"). Quando a onda termina, o "+" aparece.
   2. Vida: calma. De tempos em tempos (~3 s) um ponto troca de
      pessoa num cruzamento suave — sem piscar, sem brilho.
   3. Interação: o cursor é uma lente olho-de-peixe; os rostos sob
      ele crescem e ficam legíveis.
   4. Rolagem (palco preso ~120vh): o texto sai, a câmera mergulha no
      ponto final do "2.000"; os nove pontos viram cartões e cinco
      tocam de verdade. Fecho: a frase "Cada ponto é uma vida." sobe
      logo abaixo dos cartões — a cena termina com um sentido, não
      com um corte.
   Desempenho: um <canvas> 2D (DPR ≤ 1,5), atlas de miniaturas com
   recorte redondo feito uma vez; quadros só quando algo muda; no
   ócio redesenha só o retângulo do ponto que troca. Vídeos: só os 5
   do fim (+ o clipe da frase, que pausa quando o texto sai). Tudo
   pausa fora da tela e com a aba oculta.
   ============================================================ */
(() => {
  'use strict';
  const hero = document.getElementById('hg2');
  if (!hero) return;

  const stage = hero.querySelector('.hg2-stage');
  const canvas = hero.querySelector('.hg2-canvas');
  const ctx = canvas.getContext('2d');
  const copy = hero.querySelector('.hg2-copy');
  const slot = hero.querySelector('.hg2-slot');
  const plus = hero.querySelector('.hg2-plus');
  const clip = hero.querySelector('.title-clip');
  const clipVideo = clip ? clip.querySelector('video') : null;
  const vignette = hero.querySelector('.hg2-vignette');
  const fadeEl = hero.querySelector('.hg2-fade');
  const endEl = hero.querySelector('.hg2-end');
  const vids = [...hero.querySelectorAll('.hg2-vid')].map(el => ({
    el, cell: +el.dataset.cell, video: el.querySelector('video'), on: false, shown: false,
  }));
  const VID_CELLS = new Set(vids.map(v => v.cell));
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mqWide = matchMedia('(min-width: 900px)');
  const BASE = '../';

  /* ---------- o número: '#' ponto, 'o' os nove do ponto final ---------- */
  const GLYPH = [
    '..######...........######......######......######..',
    '.########.........########....########....########.',
    '##########........########....########....########.',
    '####..####.......####..####..####..####..####..####',
    '###....###.......###....###..###....###..###....###',
    '.......###.......###....###..###....###..###....###',
    '.......###.......###....###..###....###..###....###',
    '......####.......###....###..###....###..###....###',
    '.....####........###....###..###....###..###....###',
    '....####.........###....###..###....###..###....###',
    '...####..........###....###..###....###..###....###',
    '..####...........###....###..###....###..###....###',
    '.####............###....###..###....###..###....###',
    '####.............####..####..####..####..####..####',
    '##########..ooo...########....########....########.',
    '##########..ooo...########....########....########.',
    '##########..ooo....######......######......######..',
  ];
  const ROWS = GLYPH.length;
  const COLS = GLYPH[0].length;

  /* ---------- atlas (o mesmo do Hero G): 12 colunas de 96px ---------- */
  const CELL = 96;
  const ACOLS = 12;
  const NAMES = [
    'p-sel-musgo2', 'p-gen-executiva2', 'p-sel-jardim', 'p-gen-podcast', 'p-sel-carro',
    'p-sel-musgo1', 'p-gen-reuniao', 'p-sel-suv', 'p-sel-estudio', 'c-gen-executiva1-0',
    'c-gen-executiva1-1', 'c-gen-executiva1-2', 'c-gen-executiva1-3', 'c-gen-executiva1-4',
    'c-gen-podcast-0', 'c-gen-podcast-1', 'c-gen-podcast-2', 'c-gen-podcast-3', 'c-gen-podcast-4',
    'c-gen-walk-0', 'c-gen-walk-1', 'c-gen-walk-2', 'c-gen-walk-3', 'c-gen-walk-4',
    'c-gen-executiva2-0', 'c-gen-executiva2-1', 'c-gen-executiva2-2', 'c-gen-executiva2-3',
    'c-gen-executiva2-4', 'c-gen-kart-0', 'c-gen-kart-1', 'c-gen-reuniao-0', 'c-gen-reuniao-1',
    'c-gen-reuniao-2', 'c-gen-reuniao-3', 'c-gen-reuniao-4', 'c-sel-carro-0', 'c-sel-carro-1',
    'c-sel-carro-2', 'c-sel-carro-3', 'c-sel-carro-4', 'c-sel-escritorio-0', 'c-sel-escritorio-1',
    'c-sel-escritorio-2', 'c-sel-escritorio-3', 'c-sel-escritorio-4', 'c-sel-estudio-0',
    'c-sel-estudio-1', 'c-sel-estudio-2', 'c-sel-estudio-3', 'c-sel-estudio-4', 'c-sel-jardim-0',
    'c-sel-jardim-1', 'c-sel-jardim-2', 'c-sel-jardim-3', 'c-sel-jardim-4', 'c-sel-musgo1-0',
    'c-sel-musgo1-1', 'c-sel-musgo1-2', 'c-sel-musgo1-3', 'c-sel-musgo1-4', 'c-sel-musgo2-0',
    'c-sel-musgo2-1', 'c-sel-musgo2-2', 'c-sel-musgo2-3', 'c-sel-musgo2-4', 'c-sel-musgo3-0',
    'c-sel-musgo3-1', 'c-sel-musgo3-2', 'c-sel-musgo3-3', 'c-sel-musgo3-4', 'c-sel-suv-0',
    'c-sel-suv-1', 'c-sel-suv-2', 'c-sel-suv-3', 'c-sel-suv-4', 'v-crowd-hands-0-0',
    'v-crowd-hands-1-0', 'v-crowd-hands-1-1', 'v-crowd-hands-2-0', 'v-crowd-hands-3-0',
    'v-crowd-hands-4-0', 'v-expo-crowd-1-0', 'v-arena-audience-0-0', 'v-arena-audience-1-0',
    'v-stage-speaker-0-0', 'v-stage-speaker-0-1', 's-ana', 's-bruno', 's-carla', 's-juliana',
    's-pedro', 's-rafael', 's-amanda', 's-thiago', 'm-01-1', 'm-02-0', 'm-02-2', 'm-03-0',
    'm-03-1', 'm-03-2', 'm-05-0', 'm-06-0', 'm-06-1', 'm-09-1', 'm-12-0', 'm-12-1', 'm-12-2',
    'm-13-0', 'm-13-1', 'm-13-2', 'm-14-0', 'm-14-1', 'm-15-0', 'm-15-2', 'm-16-0', 'm-16-1',
    'm-16-2', 'm-19-0', 'm-19-1', 'm-19-2', 'm-21-0', 'm-21-1', 'm-21-2', 'm-22-0', 'm-23-0',
  ];
  const GROUP = NAMES.map(n => n.replace(/^[cp]-/, '').replace(/-\d+$/, ''));
  const POOL = NAMES.map((_, i) => i).filter(i => i >= 9);
  const PERIOD = [
    { src: 'sel-musgo2', w: 720, h: 640, x: 22, y: 20, s: 560 },
    { src: 'gen-executiva2', w: 496, h: 864, x: 0, y: 40, s: 496 },
    { src: 'sel-jardim', w: 688, h: 640, x: 180, y: 60, s: 520 },
    { src: 'gen-podcast', w: 640, h: 360, x: 95, y: 0, s: 360 },
    { src: 'sel-carro', w: 640, h: 640, x: 69, y: 0, s: 560 },
    { src: 'sel-musgo1', w: 700, h: 640, x: 70, y: 20, s: 560 },
    { src: 'gen-reuniao', w: 496, h: 864, x: 0, y: 52, s: 496 },
    { src: 'sel-suv', w: 666, h: 640, x: 76, y: 20, s: 540 },
    { src: 'sel-estudio', w: 732, h: 640, x: 91, y: 100, s: 520 },
  ];

  /* ---------- aparência ---------- */
  const DOT = 0.95;
  const DOT_DEEP = 0.93;
  const GREY_A = 0.5;
  const REST_A = 0.93;
  const LENS_M = 2.8;
  const LENS_R = 6.2;
  const NAV_H = 88;
  const PLUS_COLS = 3.2;     // largura do "+" (em passos da grade) antes do número

  /* ---------- utilidades ---------- */
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
  const easeInOut = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const bump = t => (t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t));
  function mulberry32(a) {
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(2000);

  /* ---------- os pontos ---------- */
  const tiles = [];
  const grid = [];
  let periodTop = -1, periodLeft = COLS;
  for (let r = 0; r < ROWS; r++) {
    grid.push(new Array(COLS).fill(-1));
    for (let c = 0; c < COLS; c++) {
      const ch = GLYPH[r][c];
      if (ch === '.') continue;
      if (ch === 'o') { if (periodTop < 0) periodTop = r; periodLeft = Math.min(periodLeft, c); }
      grid[r][c] = tiles.length;
      tiles.push({ c, r, img: 0, period: -1, x: 0, y: 0, tA: 0, tC: 0, sw: null, assigned: false });
    }
  }
  tiles.forEach(t => {
    if (GLYPH[t.r][t.c] === 'o') { t.period = (t.r - periodTop) * 3 + (t.c - periodLeft); t.img = t.period; t.assigned = true; }
  });
  const periodTiles = tiles.filter(t => t.period >= 0).sort((a, b) => a.period - b.period);

  const used = new Array(NAMES.length).fill(0);
  function nearGroups(t, rad) {
    const s = new Set();
    for (let r = Math.max(0, t.r - rad); r <= Math.min(ROWS - 1, t.r + rad); r++) {
      for (let c = Math.max(0, t.c - rad); c <= Math.min(COLS - 1, t.c + rad); c++) {
        const k = grid[r][c];
        if (k >= 0 && tiles[k] !== t && tiles[k].assigned) s.add(GROUP[tiles[k].img]);
      }
    }
    return s;
  }
  function pickImage(t, exclude) {
    const banned = nearGroups(t, 2);
    let best = -1, bestScore = Infinity;
    for (let k = 0; k < POOL.length; k++) {
      const i = POOL[(k + Math.floor(rnd() * POOL.length)) % POOL.length];
      if (i === exclude || banned.has(GROUP[i])) continue;
      const score = used[i] + rnd() * 0.9;
      if (score < bestScore) { bestScore = score; best = i; }
    }
    return best < 0 ? POOL[Math.floor(rnd() * POOL.length)] : best;
  }
  tiles.forEach(t => {
    if (t.period >= 0) return;
    t.img = pickImage(t, -1);
    used[t.img]++;
    t.assigned = true;
  });

  /* ---------- estado ---------- */
  let W = 0, H = 0, dpr = 1, pitch = 20, ox = 0, oy = 0;
  let mode = 'pin';
  let zFinal = 10, vidBase = 200, endCy = 0, endTop = 0;
  let periodCx = 0, periodCy = 0;
  let numBox = { x0: 0, y0: 0, x1: 0, y1: 0 };
  let atlasCircle = null, atlasCircleGrey = null, atlasSquare = null, glowSprite = null;
  const posters = new Array(9).fill(null);
  let postersRequested = false;
  let clock = 0, last = 0, raf = 0;
  let started = false, startClock = 0, entranceEnd = 99, litDone = false;
  const FIRE_AT = 1.35;
  let running = true, inView = true;
  let progress = 0, lastProgress = -1;
  const lens = { x: 0, y: 0, tx: 0, ty: 0, s: 0, ts: 0, has: false };
  const swaps = [];
  let swTimer = 0;
  let fullDirty = true;
  let clipWanted = true;

  /* ---------- atlas ---------- */
  function loadImage(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = src;
    });
  }
  function makeCircleAtlas(img, ring) {
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const g = cv.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    g.beginPath();
    const R = CELL / 2 - 0.75;
    for (let i = 0; i < NAMES.length; i++) {
      const cx = (i % ACOLS) * CELL + CELL / 2, cy = Math.floor(i / ACOLS) * CELL + CELL / 2;
      g.moveTo(cx + R, cy);
      g.arc(cx, cy, R, 0, Math.PI * 2);
    }
    g.fill();
    if (ring) {
      g.globalCompositeOperation = 'source-over';
      g.lineWidth = 2.4;
      for (let i = 0; i < NAMES.length; i++) {
        const cx = (i % ACOLS) * CELL + CELL / 2, cy = Math.floor(i / ACOLS) * CELL + CELL / 2;
        const gr = g.createLinearGradient(0, cy - R, 0, cy + R);
        gr.addColorStop(0, 'rgba(243,246,236,0)');
        gr.addColorStop(0.55, 'rgba(243,246,236,0.06)');
        gr.addColorStop(1, 'rgba(243,246,236,0.3)');
        g.strokeStyle = gr;
        g.beginPath();
        g.arc(cx, cy, R - 1.2, 0, Math.PI * 2);
        g.stroke();
      }
    }
    return cv;
  }
  function makeGlow() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 96;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(48, 48, 0, 48, 48, 48);
    gr.addColorStop(0, 'rgba(198,255,120,0.9)');
    gr.addColorStop(0.32, 'rgba(168,255,53,0.55)');
    gr.addColorStop(0.62, 'rgba(120,220,40,0.16)');
    gr.addColorStop(1, 'rgba(120,220,40,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 96, 96);
    return cv;
  }
  function requestPosters() {
    if (postersRequested) return;
    postersRequested = true;
    PERIOD.forEach((p, i) => {
      loadImage(`${BASE}assets/video/cards/${p.src}.jpg`).then(im => { posters[i] = im; fullDirty = true; invalidate(); }).catch(() => {});
    });
  }

  /* ---------- layout: o número ganha a altura que sobra ---------- */
  function layout() {
    mode = (mqWide.matches && !mqReduce.matches) ? 'pin' : 'static';
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const band = copy.offsetWidth;
    if (mqWide.matches) {
      W = stage.clientWidth; H = stage.clientHeight;
      copy.style.top = '';
      slot.style.height = '0px';
      const top0 = Math.max(NAV_H + 12, copy.offsetTop);
      const copyH0 = copy.offsetHeight;
      const bottom = clamp(H * 0.045, 28, 72);
      const availH = H - top0 - copyH0 - bottom;
      const availW = clamp(band + (W - 1440) * 0.7, band, Math.max(band, Math.min(W * 0.8, 1900)));
      // o "+" entra na conta da largura: "+2.000" fica centrado como um todo
      pitch = Math.max(8, Math.min(availW / (COLS + PLUS_COLS), availH / ROWS));
      const numH = pitch * ROWS;
      slot.style.height = numH.toFixed(1) + 'px';
      // sobra vertical: centraliza o conjunto inteiro na área abaixo do menu
      const left = Math.max(0, availH - numH);
      copy.style.top = Math.round(top0 + left * 0.5) + 'px';
    } else {
      W = stage.clientWidth;
      pitch = band / (COLS + PLUS_COLS);
      slot.style.height = (pitch * ROWS).toFixed(1) + 'px';
      H = stage.clientHeight;
    }
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    const numW = pitch * COLS, numH = pitch * ROWS;
    ox = (W - pitch * (COLS + PLUS_COLS)) / 2 + pitch * PLUS_COLS;
    oy = copy.offsetTop + slot.offsetTop;
    tiles.forEach(t => { t.x = ox + (t.c + 0.5) * pitch; t.y = oy + (t.r + 0.5) * pitch; });
    numBox = { x0: ox, y0: oy, x1: ox + numW, y1: oy + numH };
    periodCx = ox + (periodLeft + 1.5) * pitch;
    periodCy = oy + (periodTop + 1.5) * pitch;

    // o "+": encostado no alto do "2", do tamanho de uns 5 pontos
    const plusSize = pitch * 4.4;
    plus.style.fontSize = plusSize.toFixed(1) + 'px';
    plus.style.left = (ox - copy.offsetLeft - slot.offsetLeft - plusSize * 0.62 - pitch * 0.3).toFixed(1) + 'px';
    plus.style.top = (-pitch * 0.15).toFixed(1) + 'px';

    // fim do mergulho: cartões 3x3 no alto, a frase logo abaixo
    const endH = endEl.offsetHeight || 110;
    const extent = Math.max(pitch * 3, Math.min(H - NAV_H - endH - 170, W * 0.5));
    const pitchF = extent / (2 + DOT_DEEP);
    zFinal = mqWide.matches ? pitchF / pitch : 1;
    endCy = NAV_H + 24 + extent / 2;
    endTop = endCy + extent / 2 * 1.03 + 34;
    endEl.style.top = Math.round(endTop) + 'px';
    vidBase = Math.round(pitchF * DOT_DEEP);
    vids.forEach(v => {
      const P = PERIOD[v.cell];
      const k = vidBase / P.s;
      v.el.style.width = v.el.style.height = vidBase + 'px';
      v.el.style.borderRadius = Math.round(vidBase * 0.075) + 'px';
      Object.assign(v.video.style, {
        width: (P.w * k).toFixed(1) + 'px', height: (P.h * k).toFixed(1) + 'px',
        left: (-P.x * k).toFixed(1) + 'px', top: (-P.y * k).toFixed(1) + 'px',
      });
    });
    computeWave();
    fullDirty = true;
  }

  /* ---------- entrada: a onda nasce no clipe e desce pelo número ---------- */
  function computeWave() {
    let gx = W / 2, gy = numBox.y0 - 80;
    if (clip) {
      const sr = stage.getBoundingClientRect();
      const cr = clip.getBoundingClientRect();
      gx = cr.left - sr.left + cr.width / 2;
      gy = cr.top - sr.top + cr.height / 2;
      const line = clip.closest('.hg2-in-line');
      if (line) {
        const tf = getComputedStyle(line).transform;
        if (tf && tf !== 'none') { const m = new DOMMatrixReadOnly(tf); gx -= m.m41; gy -= m.m42; }
      }
    }
    let dmin = Infinity, dmax = 0;
    tiles.forEach(t => { t.d = Math.hypot(t.x - gx, t.y - gy); dmin = Math.min(dmin, t.d); dmax = Math.max(dmax, t.d); });
    if (!started) {
      tiles.forEach(t => {
        const wn = (t.d - dmin) / Math.max(1, dmax - dmin);
        t.tA = 0.15 + rnd() * 0.4 + (t.r / ROWS) * 0.2;
        t.tC = FIRE_AT + 0.12 + 1.75 * Math.pow(wn, 0.9) + (rnd() - 0.5) * 0.1;
      });
      entranceEnd = FIRE_AT + 0.12 + 1.75 + 0.1 + 0.75;
    }
  }

  /* ---------- câmera do mergulho ---------- */
  const cam = { z: 1, e: 0, fx: 0, fy: 0, sx: 0, sy: 0, morph: 0 };
  function updateCamera() {
    const p = mode === 'pin' ? progress : 0;
    const u = clamp((p - 0.05) / 0.57);
    cam.e = 0.45 * u + 0.55 * smooth(u);
    cam.z = Math.exp(Math.log(zFinal) * cam.e) * (1 + 0.025 * smooth((p - 0.62) / 0.38));
    cam.fx = periodCx; cam.fy = periodCy;
    const et = easeInOut((p - 0.05) / 0.5);
    cam.sx = lerp(periodCx, W / 2, et);
    cam.sy = lerp(periodCy, endCy, et);
    cam.morph = smooth((cam.e - 0.5) / 0.4);
  }

  /* ---------- desenho ---------- */
  function roundRectPath(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // estado de um ponto agora: aparecer, cor, brilho da onda, troca suave
  function tileState(t, out) {
    out.a = 1; out.col = 1; out.glint = 0; out.img2 = -1; out.mix = 0;
    if (mode === 'static') return out;
    const tt = clock - startClock;
    if (tt < entranceEnd) {
      out.a = easeOut((tt - t.tA) / 0.6);
      out.col = easeOut((tt - t.tC) / 0.55);
      out.glint = bump((tt - t.tC + 0.06) / 0.75);
    }
    if (t.sw) {
      const u = (clock - t.sw.t0) / t.sw.dur;
      if (u >= 1) { t.img = t.sw.next; t.sw = null; }
      else { out.img2 = t.sw.next; out.mix = smooth(u); }
    }
    return out;
  }

  const st = { a: 1, col: 1, glint: 0, img2: -1, mix: 0 };
  const lensTiles = [];

  function blit(atlas, img, x, y, d) {
    ctx.drawImage(atlas, (img % ACOLS) * CELL, Math.floor(img / ACOLS) * CELL, CELL, CELL, x - d / 2, y - d / 2, d, d);
  }
  function drawTile(t, x, y, d, s, lensW, dim, deep) {
    const half = d / 2;
    if (s.glint > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = s.glint * 0.7 * s.a;
      ctx.drawImage(glowSprite, x - d * 1.15, y - d * 1.15, d * 2.3, d * 2.3);
      ctx.globalCompositeOperation = 'source-over';
    }
    const colA = (REST_A + (1 - REST_A) * lensW) * dim * s.a;
    if (!deep) {
      if (s.col < 1) {
        ctx.globalAlpha = GREY_A * (1 - s.col) * dim * s.a;
        blit(atlasCircleGrey, t.img, x, y, d);
      }
      if (s.col > 0) {
        ctx.globalAlpha = colA * s.col * (1 - s.mix);
        blit(atlasCircle, t.img, x, y, d);
        if (s.mix > 0) { ctx.globalAlpha = colA * s.col * s.mix; blit(atlasCircle, s.img2, x, y, d); }
      }
      return;
    }
    const rad = lerp(half, d * 0.075, cam.morph);
    ctx.save();
    roundRectPath(x - half, y - half, d, d, rad);
    ctx.clip();
    ctx.globalAlpha = colA;
    blit(atlasSquare, t.img, x, y, d);
    if (t.period >= 0 && posters[t.period]) {
      const k = clamp((d * dpr - 110) / 90);
      if (k > 0) {
        const P = PERIOD[t.period];
        ctx.globalAlpha = k * dim;
        ctx.drawImage(posters[t.period], P.x, P.y, P.s, P.s, x - half, y - half, d, d);
      }
    }
    ctx.restore();
    if (t.period >= 0 && cam.morph > 0.05) {
      ctx.globalAlpha = 0.14 * cam.morph;
      ctx.strokeStyle = '#F3F6EC';
      ctx.lineWidth = 1;
      roundRectPath(x - half + 0.5, y - half + 0.5, d - 1, d - 1, Math.max(0, rad - 0.5));
      ctx.stroke();
    }
  }

  function drawAll() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!atlasCircle) return;
    const z = cam.z;
    const deep = z > 1.8;
    const dotK = lerp(DOT, DOT_DEEP, cam.morph);
    const dimOthers = 1 - 0.6 * smooth((cam.e - 0.42) / 0.45);
    const vidFade = mode === 'pin' ? smooth((progress - 0.56) / 0.1) : 0;
    const R = LENS_R * pitch;
    const ls = deep ? 0 : lens.s;
    lensTiles.length = 0;
    if (ls > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.16 * ls;
      ctx.drawImage(glowSprite, lens.x - R * 1.1, lens.y - R * 1.1, R * 2.2, R * 2.2);
      ctx.globalCompositeOperation = 'source-over';
    }
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      let x = cam.sx + (t.x - cam.fx) * z;
      let y = cam.sy + (t.y - cam.fy) * z;
      let scale = 1, lensW = 0;
      if (ls > 0.002) {
        const dx = x - lens.x, dy = y - lens.y;
        const u = Math.sqrt(dx * dx + dy * dy) / R;
        if (u < 1) {
          const m1 = LENS_M - 1;
          const F = u + m1 * u * (1 - u) * (1 - u);
          const ratio = u > 1e-4 ? F / u : LENS_M;
          const Fp = 1 + m1 * (1 - u) * (1 - 3 * u);
          const sc = Math.max(0.8, Math.sqrt(Math.max(0.05, Fp) * ratio));
          x += dx * (ratio - 1) * ls;
          y += dy * (ratio - 1) * ls * (dy < 0 ? 0.5 : 0.75);
          scale = 1 + (sc - 1) * ls;
          lensW = (1 - u) * (1 - u) * ls;
        }
      }
      tileState(t, st);
      const d = pitch * z * dotK * scale * (1 + 0.2 * st.glint) * (0.55 + 0.45 * st.a);
      if (x + d < -4 || x - d > W + 4 || y + d < -4 || y - d > H + 4) continue;
      const dim = t.period < 0 ? dimOthers : VID_CELLS.has(t.period) ? 1 : 1 - 0.3 * vidFade;
      if (lensW > 0.001) {
        lensTiles.push({ t, x, y, d, lensW, scale, a: st.a, col: st.col, glint: st.glint, img2: st.img2, mix: st.mix });
        continue;
      }
      drawTile(t, x, y, d, st, 0, dim, deep);
    }
    if (lensTiles.length) {
      lensTiles.sort((p, q) => p.scale - q.scale);
      for (const L of lensTiles) {
        drawTile(L.t, L.x, L.y, L.d, L, L.lensW, 1, false);
        if (L.lensW > 0.25) {
          ctx.globalAlpha = 0.55 * (L.lensW - 0.25) / 0.75;
          ctx.strokeStyle = '#D8FFA6';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(L.x, L.y, L.d / 2 - 0.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // ócio: só o retângulo do ponto que troca de pessoa é redesenhado
  function drawRegion(t) {
    const m = pitch * 0.51;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(t.x - m, t.y - m, m * 2, m * 2);
    ctx.clip();
    ctx.clearRect(t.x - m, t.y - m, m * 2, m * 2);
    tileState(t, st);
    drawTile(t, t.x, t.y, pitch * DOT, st, 0, 1, false);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /* ---------- camadas DOM do mergulho ---------- */
  function updateDom() {
    if (progress === lastProgress) return;
    lastProgress = progress;
    const p = progress;
    if (mode !== 'pin') return;
    if (p <= 0) { copy.style.opacity = ''; copy.style.transform = ''; copy.style.visibility = ''; }
    else {
      const o = 1 - smooth(p / 0.1);
      copy.style.opacity = o.toFixed(3);
      copy.style.transform = `translate3d(0, ${(-70 * easeOut(p / 0.18)).toFixed(1)}px, 0)`;
      copy.style.visibility = o <= 0.001 ? 'hidden' : '';
    }
    vignette.style.opacity = (0.9 * smooth((cam.e - 0.35) / 0.5)).toFixed(3);
    fadeEl.style.opacity = smooth((p - 0.92) / 0.08).toFixed(3);
    clipWanted = p < 0.1;
    syncClip();
    // a frase do fecho
    const eo = smooth((p - 0.64) / 0.12);
    if (eo <= 0) { endEl.style.opacity = '0'; endEl.style.visibility = 'hidden'; }
    else {
      endEl.style.visibility = 'visible';
      endEl.style.opacity = eo.toFixed(3);
      endEl.style.transform = `translate3d(0, ${(26 * (1 - easeOut((p - 0.64) / 0.16))).toFixed(1)}px, 0)`;
    }
    // vídeos sobre os pontos certos
    const vo = smooth((p - 0.56) / 0.1);
    const wantPlay = p > 0.5;
    const dotK = lerp(DOT, DOT_DEEP, cam.morph);
    vids.forEach(v => {
      const t = periodTiles[v.cell];
      if (vo <= 0) {
        if (v.shown) { v.el.style.opacity = '0'; v.el.style.visibility = 'hidden'; v.shown = false; }
      } else {
        const x = cam.sx + (t.x - cam.fx) * cam.z;
        const y = cam.sy + (t.y - cam.fy) * cam.z;
        const d = pitch * cam.z * dotK;
        v.el.style.transform = `translate3d(${(x - d / 2).toFixed(2)}px, ${(y - d / 2).toFixed(2)}px, 0) scale(${(d / vidBase).toFixed(4)})`;
        v.el.style.opacity = vo.toFixed(3);
        if (!v.shown) { v.el.style.visibility = 'visible'; v.shown = true; }
      }
      setVideo(v, wantPlay && running);
    });
  }
  function setVideo(v, on) {
    if (on === v.on) return;
    v.on = on;
    if (on) { const pr = v.video.play(); if (pr && pr.catch) pr.catch(() => {}); }
    else v.video.pause();
  }
  function syncClip() {
    if (!clipVideo) return;
    const want = clipWanted && running && !mqReduce.matches;
    if (want && clipVideo.paused) { const pr = clipVideo.play(); if (pr && pr.catch) pr.catch(() => {}); }
    else if (!want && !clipVideo.paused) clipVideo.pause();
  }

  /* ---------- quadro ---------- */
  function invalidate() {
    if (!raf && running) raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = 0;
    const gapMs = now - last;
    const dt = last === 0 || gapMs > 120 ? 1 / 60 : gapMs / 1000;
    last = now;
    clock += Math.min(dt, 0.05);
    let more = false;

    if (mode === 'pin') {
      const kp = 1 - Math.exp(-dt * 16);
      const ks = 1 - Math.exp(-dt * (lens.ts > lens.s ? 7 : 5));
      const ox0 = lens.x, oy0 = lens.y, os0 = lens.s;
      lens.x += (lens.tx - lens.x) * kp;
      lens.y += (lens.ty - lens.y) * kp;
      lens.s += (lens.ts - lens.s) * ks;
      if (Math.abs(lens.ts - lens.s) < 0.002) lens.s = lens.ts;
      if (lens.s <= 0 && os0 <= 0) { lens.x = lens.tx; lens.y = lens.ty; }
      else if (Math.abs(lens.x - ox0) + Math.abs(lens.y - oy0) > 0.05 || lens.s !== os0) { more = true; fullDirty = true; }
      if (lens.s > 0.002 && (Math.abs(lens.tx - lens.x) + Math.abs(lens.ty - lens.y) > 0.3)) more = true;
    }

    const tt = clock - startClock;
    if (started && tt < entranceEnd) { more = true; fullDirty = true; }
    if (started && mode === 'pin') {
      if (tt >= FIRE_AT && !hero.classList.contains('hg2-fire')) hero.classList.add('hg2-fire');
      if (!litDone && tt >= entranceEnd - 0.6) { litDone = true; hero.classList.add('hg2-lit'); }
    }

    if (progress !== lastProgress) fullDirty = true;
    updateCamera();
    updateDom();

    const active = swaps.filter(t => t.sw);
    swaps.length = 0; swaps.push(...active);
    if (active.length) more = true;

    const restCam = progress <= 0 && lens.s <= 0;
    if (fullDirty || (active.length && !restCam)) {
      drawAll();
      fullDirty = false;
    } else if (active.length) {
      active.forEach(drawRegion);
    }
    if (more) invalidate();
  }

  /* ---------- ócio: um ponto troca de pessoa, devagar, sem brilho ---------- */
  function scheduleSwap() {
    clearTimeout(swTimer);
    if (!running || mode !== 'pin') return;
    swTimer = setTimeout(() => {
      if (running && progress <= 0 && started && clock - startClock > entranceEnd && swaps.length < 1) spawnSwap();
      scheduleSwap();
    }, 2600 + Math.random() * 1600);
  }
  function spawnSwap() {
    for (let tries = 0; tries < 12; tries++) {
      const t = tiles[Math.floor(Math.random() * tiles.length)];
      if (t.period >= 0 || t.sw) continue;
      if (lens.s > 0.05 && Math.hypot(t.x - lens.x, t.y - lens.y) < LENS_R * pitch * 1.2) continue;
      used[t.img]--;
      const next = pickImage(t, t.img);
      used[next]++;
      t.sw = { t0: clock, dur: 1.6, next };
      swaps.push(t);
      invalidate();
      return;
    }
  }

  /* ---------- rolagem ---------- */
  function readProgress() {
    if (mode !== 'pin') { progress = 0; return; }
    const r = hero.getBoundingClientRect();
    const total = hero.offsetHeight - window.innerHeight;
    progress = total > 0 ? clamp(-r.top / total) : 0;
    if (progress > 0.02) requestPosters();
  }
  window.addEventListener('scroll', () => {
    const before = progress;
    readProgress();
    if (progress !== before) {
      if (progress > 0) lens.ts = 0;
      invalidate();
    }
  }, { passive: true });

  /* ---------- lente ---------- */
  function onPointer(e) {
    if (mode !== 'pin' || !started) return;
    const sr = stage.getBoundingClientRect();
    const x = e.clientX - sr.left, y = e.clientY - sr.top;
    lens.tx = x; lens.ty = y;
    const R = LENS_R * pitch;
    const inside = progress <= 0.001 && x > numBox.x0 - R * 0.4 && x < numBox.x1 + R * 0.4 && y > numBox.y0 - R * 0.3 && y < numBox.y1 + R * 0.3;
    if (!lens.has) { lens.x = x; lens.y = y; lens.has = true; }
    if (inside && lens.s < 0.01) { lens.x = x; lens.y = y; }
    const was = lens.ts;
    lens.ts = inside ? 1 : 0;
    if (inside || lens.s > 0 || was !== lens.ts) invalidate();
  }
  stage.addEventListener('pointermove', onPointer, { passive: true });
  stage.addEventListener('pointerleave', () => { lens.ts = 0; invalidate(); });

  /* ---------- pausa ---------- */
  function setRunning(on) {
    if (on === running) return;
    running = on;
    hero.classList.toggle('hg2-paused', !on);
    if (on) {
      last = 0; fullDirty = true; lastProgress = -1;
      invalidate();
      scheduleSwap();
    } else {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      clearTimeout(swTimer);
      vids.forEach(v => setVideo(v, false));
    }
    syncClip();
  }
  const io = new IntersectionObserver(entries => {
    const e = entries[entries.length - 1];
    inView = e.isIntersecting && e.intersectionRatio >= 0.12;
    setRunning(inView && !document.hidden);
  }, { threshold: [0, 0.12, 0.3] });
  io.observe(stage);
  document.addEventListener('visibilitychange', () => setRunning(inView && !document.hidden));

  /* ---------- redimensionar ---------- */
  let resizeRaf = 0;
  function onResize() {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      layout();
      readProgress();
      lastProgress = -1;
      if (mode === 'static') { updateCamera(); drawAll(); }
      else { startEntrance(); invalidate(); }
    });
  }
  window.addEventListener('resize', onResize);
  mqReduce.addEventListener('change', () => location.reload());
  mqWide.addEventListener('change', onResize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);

  /* ---------- início ---------- */
  function startEntrance() {
    if (started || mode !== 'pin' || !atlasCircle) return;
    started = true;
    startClock = clock;
    invalidate();
    scheduleSwap();
    setTimeout(requestPosters, (entranceEnd + 1.5) * 1000);
  }
  async function init() {
    layout();
    readProgress();
    hero.classList.add('hg2-in');
    let ok = true;
    try {
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000));
      const [cor, cinza] = await Promise.race([
        Promise.all([loadImage(`${BASE}assets/img/hero-g/atlas-cor.webp`), loadImage(`${BASE}assets/img/hero-g/atlas-cinza.webp`)]),
        timeout,
      ]);
      atlasSquare = cor;
      atlasCircle = makeCircleAtlas(cor, true);
      atlasCircleGrey = makeCircleAtlas(cinza, false);
      glowSprite = makeGlow();
    } catch (err) { ok = false; hero.classList.add('hg2-lit'); }
    if (!ok) return;
    layout();
    if (mode === 'static') {
      hero.classList.add('hg2-lit');
      updateCamera();
      drawAll();
      if (clipVideo && mqReduce.matches) clipVideo.pause();
      return;
    }
    startEntrance();
  }
  if (mqReduce.matches && clipVideo) { clipVideo.removeAttribute('autoplay'); clipVideo.pause(); }
  init();
})();
