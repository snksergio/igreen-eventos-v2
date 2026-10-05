/* ============================================================
   Hero G4 — A lâmpada de pessoas
   O "G" do logo iGreen — a lâmpada com as duas folhas e a rosca —
   desenhado com 343 pessoas, à direita do texto.
   Coreografia
   1. Entrada (uma vez): a lâmpada surge cinza e apagada ("antes").
      A energia entra pela rosca e sobe: cada pessoa acende em cor
      quando a frente de luz passa por ela ("depois"). No alto, a
      lâmpada liga e ganha um halo suave, que fica.
   2. Vida: calma — uma pessoa troca por outra a cada ~3 s, num
      cruzamento suave, sem brilho.
   3. Interação: lente olho-de-peixe sob o cursor; nas folhas, os
      rostos aproximados ganham um filete lima.
   4. Rolagem (palco preso ~120vh): o texto sai, a lâmpada vai para
      o centro e a luz se espalha em oito raios — os raios também são
      pessoas, novas vidas que acendem ao serem alcançadas. Nas pontas
      de quatro raios, as pessoas viram vídeos. Fecho: "Energia que
      tem rosto. Mais de 2.000 vidas acesas pela iGreen."
   Desempenho: um <canvas> 2D (DPR ≤ 1,5) com atlas de miniaturas;
   quadros só quando algo muda; no ócio redesenha só o ponto que
   troca. Vídeos: só os 4 do fim (+ o clipe da frase, que pausa
   quando o texto sai). Tudo pausa fora da tela / aba oculta.
   ============================================================ */
(() => {
  'use strict';
  const hero = document.getElementById('hg4');
  if (!hero) return;

  const stage = hero.querySelector('.hg4-stage');
  const canvas = hero.querySelector('.hg4-canvas');
  const ctx = canvas.getContext('2d');
  const copy = hero.querySelector('.hg4-copy');
  const halo = hero.querySelector('.hg4-halo');
  const clip = hero.querySelector('.title-clip');
  const clipVideo = clip ? clip.querySelector('video') : null;
  const fadeEl = hero.querySelector('.hg4-fade');
  const endEl = hero.querySelector('.hg4-end');
  const vids = [...hero.querySelectorAll('.hg4-vid')].map((el, i) => ({
    el, cell: +el.dataset.cell, slot: i, video: el.querySelector('video'), on: false, shown: false,
  }));
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mqWide = matchMedia('(min-width: 900px)');
  const BASE = '../';

  /* ---------- a lâmpada: G = anel, L = folhas, B = rosca ---------- */
  const GLYPH = [
    '..........GGGGGGG......',
    '........GGGGGGGGGGGG...',
    '......GGGGGGGGGGGGGGG..',
    '.....GGGGGGGGGGGGGGGGG.',
    '....GGGGGGGGGGGGGGGGGG.',
    '....GGGGGGG......GGGG..',
    '...GGGGGG..........G...',
    '...GGGGG...............',
    '..GGGGGG...............',
    '..GGGGGG...............',
    '..GGGGG........L.......',
    '..GGGGG......LLL..GGGG.',
    '..GGGGG.....LLLLL.GGGG.',
    '..GGGGGG..LLLLLLL.GGGG.',
    'LL..GGG..LLLLLLLL.GGGG.',
    'LLLL..G.LLLLLLLL..GGGG.',
    'LLLLLL.LLLLLLLLL..GGGG.',
    'LLLLLLLLLLLLLLLL..GGGG.',
    '.LLLLLLL.LLLLLL.GGGGGG.',
    '..LLLLLLLLLLLL.GGGGGGG.',
    '...LLL..LLLL..GGGGGGGG.',
    '.......LLL..GGGGGGGGG..',
    '..........GGGGGGGG.....',
    '.......................',
    '........BBBBBBBBBB.....',
    '........BBBBBBBBBB.....',
    '.......................',
    '.........BBBBBBBB......',
    '.........BBBBBBBB......',
    '.......................',
    '..........BBBBBB.......',
    '............BB.........',
  ];
  const ROWS = GLYPH.length;
  const COLS = GLYPH[0].length;
  const GLASS = { c: 11.5, r: 11.2, rad: 11.6 };   // centro e raio do vidro, em células

  /* ---------- atlas (o mesmo do Hero G) ---------- */
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
  // recortes quadrados (no quadro original) das pessoas que viram vídeo
  const CROP = {
    1: { src: 'gen-executiva2', w: 496, h: 864, x: 0, y: 40, s: 496 },
    4: { src: 'sel-carro', w: 640, h: 640, x: 69, y: 0, s: 560 },
    5: { src: 'sel-musgo1', w: 700, h: 640, x: 70, y: 20, s: 560 },
    7: { src: 'sel-suv', w: 666, h: 640, x: 76, y: 20, s: 540 },
  };

  /* ---------- aparência ---------- */
  const DOT = 0.95;
  const GREY_A = 0.5;
  const REST_A = 0.93;
  const LENS_M = 2.7;
  const LENS_R = 5.6;
  const NAV_H = 88;
  // oito raios (graus, 0 = direita, -90 = para cima); as pontas de quatro viram vídeo
  const RAY_ANGLES = [-35, -10, 15, 40, -145, -170, 165, 140];
  const RAY_VIDEO = { 1: 0, 3: 1, 5: 2, 7: 3 };    // raio -> índice do vídeo
  const RAY_VIDEO_AT = 4;                         // posição, no raio, da pessoa que vira vídeo

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
  const rnd = mulberry32(343);

  /* ---------- os pontos da lâmpada ---------- */
  const tiles = [];
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid.push(new Array(COLS).fill(-1));
    for (let c = 0; c < COLS; c++) {
      const ch = GLYPH[r][c];
      if (ch === '.') continue;
      grid[r][c] = tiles.length;
      tiles.push({ c, r, kind: ch, img: 0, x: 0, y: 0, tA: 0, tC: 0, sw: null, assigned: false });
    }
  }
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
    const banned = t ? nearGroups(t, 2) : new Set();
    let best = -1, bestScore = Infinity;
    for (let k = 0; k < POOL.length; k++) {
      const i = POOL[(k + Math.floor(rnd() * POOL.length)) % POOL.length];
      if (i === exclude || banned.has(GROUP[i])) continue;
      const score = used[i] + rnd() * 0.9;
      if (score < bestScore) { bestScore = score; best = i; }
    }
    return best < 0 ? POOL[Math.floor(rnd() * POOL.length)] : best;
  }
  tiles.forEach(t => { t.img = pickImage(t, -1); used[t.img]++; t.assigned = true; });

  // os raios: novas pessoas (a última de quatro raios vira vídeo)
  // os raios: novas pessoas em fila a partir do vidro (montados no layout)
  let rays = [];
  let rayMax = 1;
  const rayImgs = new Map();
  const rayImg = (j, k) => {
    const key = j * 100 + k;
    if (!rayImgs.has(key)) rayImgs.set(key, pickImage(null, -1));
    return rayImgs.get(key);
  };

  /* ---------- estado ---------- */
  let W = 0, H = 0, dpr = 1, pitch = 20, ox = 0, oy = 0;
  let mode = 'pin';
  let bulbBox = { x0: 0, y0: 0, x1: 0, y1: 0 };
  let glass = { x: 0, y: 0 };            // centro do vidro no repouso
  let fin = { x: 0, y: 0, s: 0.7 };      // centro e escala da lâmpada no fim
  let rayR0 = 200, tipD = 100;
  let atlasCircle = null, atlasCircleGrey = null, atlasSquare = null, glowSprite = null;
  let clock = 0, last = 0, raf = 0;
  let started = false, startClock = 0, entranceEnd = 99;
  const FIRE_AT = 1.1;
  let running = true, inView = true;
  let progress = 0, lastProgress = -1;
  const lens = { x: 0, y: 0, tx: 0, ty: 0, s: 0, ts: 0, has: false };
  const swaps = [];
  let swTimer = 0;
  let fullDirty = true;
  let clipWanted = true;
  let haloOn = 0;

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

  /* ---------- layout ---------- */
  function layout() {
    mode = (mqWide.matches && !mqReduce.matches) ? 'pin' : 'static';
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (mqWide.matches) {
      stage.style.paddingBottom = '';
      W = stage.clientWidth; H = stage.clientHeight;
      const band = Math.min(1240, W - 2 * Math.max(W * 0.05, 32));
      const left = (W - band) / 2;
      copy.style.left = left.toFixed(1) + 'px';
      copy.style.top = '';
      const copyH = copy.offsetHeight;
      copy.style.top = Math.round(NAV_H + Math.max(16, (H - NAV_H - copyH) / 2 - 8)) + 'px';
      // a lâmpada: altura toda abaixo do menu, na área à direita do texto
      const m = clamp(H * 0.04, 24, 64);
      const availH = H - NAV_H - 2 * m;
      const areaX0 = left + copy.offsetWidth + clamp(W * 0.04, 40, 110);
      const areaX1 = left + band + clamp(W * 0.02, 0, 60);
      pitch = Math.max(8, Math.min(availH / ROWS, (areaX1 - areaX0) / COLS));
      ox = areaX0 + ((areaX1 - areaX0) - pitch * COLS) / 2;
      oy = NAV_H + m + (availH - pitch * ROWS) / 2;
    } else {
      W = stage.clientWidth;
      pitch = Math.min((W - 48) / COLS, 18);
      const bulbH = pitch * ROWS;
      stage.style.paddingBottom = Math.round(bulbH + 80) + 'px';
      H = stage.clientHeight;
      ox = (W - pitch * COLS) / 2;
      oy = H - bulbH - 48;
    }
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    tiles.forEach(t => { t.x = ox + (t.c + 0.5) * pitch; t.y = oy + (t.r + 0.5) * pitch; });
    bulbBox = { x0: ox, y0: oy, x1: ox + pitch * COLS, y1: oy + pitch * ROWS };
    glass = { x: ox + GLASS.c * pitch, y: oy + GLASS.r * pitch };

    // fim: lâmpada no centro, um pouco menor; a frase embaixo
    const endH = endEl.offsetHeight || 110;
    const finH = Math.min(H - NAV_H - endH - 110, H * 0.62);
    fin.s = Math.min(1, finH / (pitch * ROWS));
    const bulbTopF = NAV_H + 18;
    fin.y = bulbTopF + GLASS.r * pitch * fin.s;                       // centro do vidro
    fin.x = W / 2 + (COLS / 2 - GLASS.c) * pitch * fin.s * 0;          // vidro no centro da tela
    endEl.style.top = Math.round(bulbTopF + pitch * ROWS * fin.s + 34) + 'px';
    // raios: começam fora do vidro, passos que crescem para fora
    const pf = pitch * fin.s;
    rayR0 = GLASS.rad * pf * 1.28;
    tipD = Math.round(clamp(pf * 6.6, 92, 170));
    rays = [];
    rayMax = rayR0;
    RAY_ANGLES.forEach((deg, j) => {
      const a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      // até onde o raio vai: a borda da tela nessa direção (+ uma folga)
      const tx = ca > 0 ? (W - fin.x) / ca : ca < 0 ? -fin.x / ca : Infinity;
      const ty = sa > 0 ? (H - fin.y) / sa : sa < 0 ? -fin.y / sa : Infinity;
      const edge = Math.min(tx, ty) + pf * 2;
      let dist = rayR0, prev = 0;
      for (let k = 0; k < 60; k++) {
        const isVid = (j in RAY_VIDEO) && k === RAY_VIDEO_AT;
        const d = isVid ? tipD : pf * DOT * (1 + 0.07 * k);
        if (k > 0) dist += (prev + d) / 2 * (isVid || prev === tipD ? 1.12 : 1.22);
        if (dist > edge) break;
        const vid = isVid ? vids[RAY_VIDEO[j]] : null;
        rays.push({ j, k, dist, d, x: fin.x + ca * dist, y: fin.y + sa * dist, img: vid ? vid.cell : rayImg(j, k), vid });
        rayMax = Math.max(rayMax, dist);
        prev = d;
      }
    });
    vids.forEach(v => {
      const rp = rays.find(q => q.vid === v);
      if (!rp) return;
      const P = CROP[v.cell];
      const k = tipD / P.s;
      v.el.style.width = v.el.style.height = tipD + 'px';
      v.el.style.transform = `translate3d(${(rp.x - tipD / 2).toFixed(1)}px, ${(rp.y - tipD / 2).toFixed(1)}px, 0)`;
      Object.assign(v.video.style, {
        width: (P.w * k).toFixed(1) + 'px', height: (P.h * k).toFixed(1) + 'px',
        left: (-P.x * k).toFixed(1) + 'px', top: (-P.y * k).toFixed(1) + 'px',
      });
    });
    // halo: do tamanho do vidro (o JS só move e escala)
    const hs = GLASS.rad * pitch * 3.2;
    halo.style.width = halo.style.height = hs.toFixed(0) + 'px';
    computeCharge();
    fullDirty = true;
  }

  /* ---------- entrada: a energia sobe pela rosca ---------- */
  function computeCharge() {
    if (started) return;
    tiles.forEach(t => {
      const yn = t.r / (ROWS - 1);                   // 0 no alto, 1 na rosca
      const xn = Math.abs(t.c / (COLS - 1) - 0.5) * 2;
      t.tA = 0.15 + rnd() * 0.4 + (1 - yn) * 0.2;
      t.tC = FIRE_AT + 1.9 * (1 - yn) + 0.12 * xn * xn + (rnd() - 0.5) * 0.08;
    });
    entranceEnd = FIRE_AT + 1.9 + 0.12 + 0.05 + 0.75;
  }

  /* ---------- coreografia da rolagem ---------- */
  const scene = { M: 0, R: 0, s: 1, cx: 0, cy: 0 };
  function updateScene() {
    const p = mode === 'pin' ? progress : 0;
    scene.M = easeInOut((p - 0.04) / 0.36);     // a lâmpada vai para o centro
    scene.R = clamp((p - 0.3) / 0.38);          // a luz se espalha em raios
    scene.s = lerp(1, fin.s, scene.M);
    scene.cx = lerp(glass.x, fin.x, scene.M);
    scene.cy = lerp(glass.y, fin.y, scene.M);
  }

  /* ---------- desenho ---------- */
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
  function drawTile(img, x, y, d, s, lensW, leaf) {
    if (s.glint > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = s.glint * 0.7 * s.a;
      ctx.drawImage(glowSprite, x - d * 1.15, y - d * 1.15, d * 2.3, d * 2.3);
      ctx.globalCompositeOperation = 'source-over';
    }
    const colA = (REST_A + (1 - REST_A) * lensW) * s.a;
    if (s.col < 1) {
      ctx.globalAlpha = GREY_A * (1 - s.col) * s.a;
      blit(atlasCircleGrey, img, x, y, d);
    }
    if (s.col > 0) {
      ctx.globalAlpha = colA * s.col * (1 - s.mix);
      blit(atlasCircle, img, x, y, d);
      if (s.mix > 0) { ctx.globalAlpha = colA * s.col * s.mix; blit(atlasCircle, s.img2, x, y, d); }
      // as folhas: um filete lima fino, para o desenho do logo se ler
      if (leaf && d > 9) {
        ctx.globalAlpha = (0.32 + 0.4 * lensW) * s.col * s.a;
        ctx.strokeStyle = '#D8FFA6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, d / 2 - 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function drawAll() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!atlasCircle) return;
    const R = LENS_R * pitch;
    const ls = scene.M > 0 ? 0 : lens.s;
    lensTiles.length = 0;
    if (ls > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.16 * ls;
      ctx.drawImage(glowSprite, lens.x - R * 1.1, lens.y - R * 1.1, R * 2.2, R * 2.2);
      ctx.globalCompositeOperation = 'source-over';
    }
    // os raios (atrás da lâmpada): cada pessoa acende quando a luz chega
    if (scene.R > 0) {
      const front = rayR0 - 60 + scene.R * (rayMax - rayR0 + 200);
      for (let i = 0; i < rays.length; i++) {
        const rp = rays[i];
        const q = clamp((front - rp.dist) / 120);
        if (q <= 0) continue;
        const a = easeOut(q / 0.5);
        st.a = a;
        st.col = easeOut((q - 0.25) / 0.5);
        st.glint = bump((q - 0.15) / 0.8) * 0.9;
        st.img2 = -1; st.mix = 0;
        const d = rp.d * (0.4 + 0.6 * a) * (1 + 0.15 * st.glint);
        drawTile(rp.img, rp.x, rp.y, d, st, 0, false);
      }
    }
    const k = scene.s;
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      let x = scene.cx + (t.x - glass.x) * k;
      let y = scene.cy + (t.y - glass.y) * k;
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
          y += dy * (ratio - 1) * ls;
          scale = 1 + (sc - 1) * ls;
          lensW = (1 - u) * (1 - u) * ls;
        }
      }
      tileState(t, st);
      const d = pitch * k * DOT * scale * (1 + 0.2 * st.glint) * (0.55 + 0.45 * st.a);
      if (lensW > 0.001) {
        lensTiles.push({ t, x, y, d, lensW, scale, a: st.a, col: st.col, glint: st.glint, img2: st.img2, mix: st.mix });
        continue;
      }
      drawTile(t.img, x, y, d, st, 0, t.kind === 'L');
    }
    if (lensTiles.length) {
      lensTiles.sort((p, q) => p.scale - q.scale);
      for (const L of lensTiles) drawTile(L.t.img, L.x, L.y, L.d, L, L.lensW, L.t.kind === 'L' || L.lensW > 0.25);
    }
    ctx.globalAlpha = 1;
  }
  function drawRegion(t) {
    const m = pitch * 0.51;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(t.x - m, t.y - m, m * 2, m * 2);
    ctx.clip();
    ctx.clearRect(t.x - m, t.y - m, m * 2, m * 2);
    tileState(t, st);
    drawTile(t.img, t.x, t.y, pitch * DOT, st, 0, t.kind === 'L');
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /* ---------- camadas DOM ---------- */
  function placeHalo() {
    const hs = GLASS.rad * pitch * 3.2;
    const sc = scene.s * (1 + 0.55 * smooth(scene.R));
    halo.style.transform = `translate3d(${(scene.cx - hs / 2).toFixed(1)}px, ${(scene.cy - hs / 2).toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
    halo.style.opacity = (haloOn * (1 - 0.25 * smooth(scene.M))).toFixed(3);
  }
  function updateDom() {
    if (progress === lastProgress) return;
    lastProgress = progress;
    placeHalo();
    if (mode !== 'pin') return;
    const p = progress;
    if (p <= 0) { copy.style.opacity = ''; copy.style.transform = ''; copy.style.visibility = ''; }
    else {
      const o = 1 - smooth(p / 0.1);
      copy.style.opacity = o.toFixed(3);
      copy.style.transform = `translate3d(0, ${(-60 * easeOut(p / 0.18)).toFixed(1)}px, 0)`;
      copy.style.visibility = o <= 0.001 ? 'hidden' : '';
    }
    fadeEl.style.opacity = smooth((p - 0.94) / 0.06).toFixed(3);
    clipWanted = p < 0.1;
    syncClip();
    const eo = smooth((p - 0.66) / 0.14);
    if (eo <= 0) { endEl.style.opacity = '0'; endEl.style.visibility = 'hidden'; }
    else {
      endEl.style.visibility = 'visible';
      endEl.style.opacity = eo.toFixed(3);
      endEl.style.transform = `translate3d(0, ${(22 * (1 - easeOut((p - 0.66) / 0.18))).toFixed(1)}px, 0)`;
    }
    // as pontas viram vídeo quando a luz chega nelas
    const front = rayR0 - 60 + scene.R * (rayMax - rayR0 + 200);
    vids.forEach(v => {
      const rp = rays.find(q => q.vid === v);
      const vo = rp ? smooth((front - rp.dist - 70) / 110) : 0;
      if (vo <= 0) {
        if (v.shown) { v.el.style.opacity = '0'; v.el.style.visibility = 'hidden'; v.shown = false; }
      } else {
        v.el.style.opacity = vo.toFixed(3);
        if (!v.shown) { v.el.style.visibility = 'visible'; v.shown = true; }
      }
      setVideo(v, !!rp && front > rp.dist - 40 && running);
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
    if (started && tt < entranceEnd + 1.3) {
      more = true;
      if (tt < entranceEnd) fullDirty = true;
      // a lâmpada liga: o halo acende quando a frente chega ao alto (uma vez)
      const h = smooth((tt - (entranceEnd - 0.8)) / 1.4);
      if (h !== haloOn) { haloOn = h; lastProgress = -1; }
    }

    if (progress !== lastProgress) fullDirty = true;
    updateScene();
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

  /* ---------- ócio ---------- */
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
      if (t.sw) continue;
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
    const inside = progress <= 0.001 && x > bulbBox.x0 - R * 0.4 && x < bulbBox.x1 + R * 0.4 && y > bulbBox.y0 - R * 0.3 && y < bulbBox.y1 + R * 0.3;
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
    hero.classList.toggle('hg4-paused', !on);
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
      if (mode === 'static') { haloOn = 1; updateScene(); placeHalo(); drawAll(); }
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
  }
  async function init() {
    layout();
    readProgress();
    hero.classList.add('hg4-in');
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
    } catch (err) { ok = false; }
    if (!ok) return;
    layout();
    if (mode === 'static') {
      haloOn = 1;
      updateScene();
      placeHalo();
      drawAll();
      if (clipVideo && mqReduce.matches) clipVideo.pause();
      return;
    }
    startEntrance();
  }
  if (mqReduce.matches && clipVideo) { clipVideo.removeAttribute('autoplay'); clipVideo.pause(); }
  init();
})();
