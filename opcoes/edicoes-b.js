/* ============================================================
   Opção B — Estrada de telas
   Corredor 3D em CSS (perspective + preserve-3d). A câmera é um
   transform no .ob-world; cada tela tem posição fixa e, a cada quadro,
   o JS calcula a distância até a câmera para o foco/névoa, o recorte
   (telas atrás da câmera ou além da névoa somem) e quais vídeos tocam.

   Ritmo híbrido: câmera e corredor seguem a rolagem (scrub), mas os
   textos (título, legendas, frase final) TOCAM ao cruzar um limiar e
   revertem se a pessoa voltar — texto meio revelado parece barato.

   Três ScrollTriggers sobre a mesma seção:
   1. entrada  (top bottom → top top): o corredor emerge do escuro, as
      faixas do chão se desenham até o ponto de fuga, telas soltas acendem;
   2. principal (top top → bottom bottom): a pílula do título cresce e vira
      a entrada do corredor; três trechos (move 20% / pausa 60% / move 20%),
      atravessando a tela de cada edição; final com a frase e o CTA;
   3. saída (bottom bottom → bottom 20%): o palco recua como um card.
   ============================================================ */

(() => {
  const section = document.querySelector('.ob');
  if (!section) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // sem GSAP ou com movimento reduzido a seção fica no layout estático
  if (reduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);
  section.classList.add('is-3d');

  const $ = (s, r = section) => r.querySelector(s);
  const $$ = (s, r = section) => Array.from(r.querySelectorAll(s));

  const frame = $('.ob-frame');
  const world = $('.ob-world');
  const horizon = $('.ob-horizon');
  const frameDim = $('.ob-frame-dim');
  const frameEdge = $('.ob-frame-edge');
  const gate = $('.ob-gate');
  const gateImg = $('img', gate);
  const gateVideo = $('video', gate);
  const intro = $('.ob-intro');
  const kicker = $('.ob-kicker');
  const titleLines = $$('.ob-title .ob-ln-in');
  const words = $$('.ob-title .ob-w');
  const pill = $('.ob-pill');
  const subIn = $('.ob-sub-in');
  const subOut = $('.ob-intro-sub');
  const kickWrap = $('.ob-kick');
  const caps = $$('.ob-cap');
  const hud = $('.ob-hud');
  const hudCur = $('.ob-hud-cur');
  const hudCity = $('.ob-hud-city');
  const hudFill = $('.ob-hud-fill');
  const finale = $('.ob-finale');
  const finLines = $$('.ob-finale .ob-ln-in');
  const finCta = $('.ob-cta-wrap');
  const finBtn = $('.ob-finale .btn-primary');

  const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const f1 = v => Math.round(v * 10) / 10;

  /* ---------- media ---------- */

  const A = '../assets/';
  const M = n => ({ src: `${A}img/past/moment-${n}.jpg` });
  const LOW = n => ({ src: `${A}img/past-0${n}.jpg` });
  const PV = n => ({ src: `${A}video/past/${n}.jpg`, clip: `${A}video/past/${n}.mp4` });
  const CV = n => ({ src: `${A}video/cards/${n}.jpg`, clip: `${A}video/cards/${n}.mp4` });

  const EDITIONS = [
    { city: 'Recife · 2024', floor: ['RECIFE', '2024'], media: M('01') },
    { city: 'Curitiba · 2024', floor: ['CURITIBA', '2024'], media: M('11') },
    { city: 'São Paulo · 2025', floor: ['SÃO PAULO', '2025'], media: M('17') }
  ];

  // wall media per stretch, by screen shape (h 16:9, q ~square, v portrait)
  const POOLS = [
    { // Recife — a primeira caravana: chegada, gente, abraços
      h: [M('16'), PV('car-reveal'), M('03'), M('12'), CV('gen-walk'), M('04'), PV('expo-crowd'), M('23'), LOW(3), M('07'), M('02'), M('13'), M('10'), M('20'), M('14')],
      q: [CV('sel-musgo1'), CV('sel-suv'), M('19')],
      v: [CV('gen-reuniao')]
    },
    { // Curitiba — turmas práticas: palco, telão, método
      h: [M('06'), M('09'), CV('gen-podcast'), M('14'), M('10'), PV('stage-speaker'), M('15'), M('08'), LOW(2), CV('gen-executiva1'), M('02'), M('12'), M('04'), M('03'), M('16')],
      q: [CV('sel-estudio'), CV('sel-jardim'), M('15')],
      v: [CV('gen-executiva2')]
    },
    { // São Paulo — a arena
      h: [M('05'), PV('arena-persistencia'), M('21'), PV('arena-audience'), M('22'), M('18'), M('20'), M('23'), LOW(1), M('19'), M('08'), M('03'), M('16'), M('13'), M('09'), M('06')],
      q: [CV('sel-carro'), CV('sel-musgo2'), M('07')],
      v: [CV('gen-kart')]
    }
  ];

  // the scattered screens floating around the title (the telescope field)
  const FLOAT_MEDIA = [M('19'), M('22'), M('06'), M('21'), M('13'), M('02')];

  // wall columns (desktop units: corridor 2000 wide, floor 560 below the eye)
  // each screen: [shape, width, y]
  const COLS = [
    [['h', 600, -300], ['h', 420, 300]],
    [['v', 320, -20]],
    [['h', 430, -390], ['h', 640, 120]],
    [['q', 380, -250], ['h', 470, 300]],
    [['h', 560, -70], ['h', 330, -450]],
    [['h', 500, 250], ['q', 340, -330]]
  ];
  const SEQ_L = [0, 3, 1, 2, 5, 4, 0, 3];
  const SEQ_R = [2, 4, 0, 5, 3, 1, 2, 4];
  const ASPECT = { h: 16 / 9, q: 1.08, v: 9 / 16 };
  // if a stretch needs more screens than its pool, recycle moments (never the edition frames)
  const SPARE = ['22', '05', '18', '21', '09', '06', '15', '20', '13', '02'].map(M);

  /* ---------- state ---------- */

  let G = null;          // geometry for the current viewport
  let T = null;          // timeline thresholds
  let items = [];        // 3D elements with their depth
  let videos = [];       // items holding a clip
  let tl, tlIn, tlOut, stMain, stIn, stOut;
  let headTl, hudTl, finTl;
  let capTls = [];
  let dirty = true;
  let inView = false;
  let hudIndex = -1;

  // values the scrubbed timelines tween (render() reads them)
  const S = {
    eye: 0, eyeIn: 0, camX: 0, // camera (main + entrance dolly + lateral glance)
    wave: 0, draw: 0,          // entrance: corridor wave + lane draw-in
    amp0: 0,                   // stretch 1 brightens fully under the gate
    on1: 0, on2: 0, on3: 0,    // later stretches light up as we pass through
    open: 0, grow: 0, pass: 0, // gate: pill opens, grows to fill, fades through
    part: 0,                   // title words part sideways
    floatOut: 0                // floating screens dim as we dive in
  };

  /* ---------- geometry ---------- */

  function computeGeometry() {
    const vw = frame.clientWidth;
    const vh = frame.clientHeight;
    const m = vw <= 810;
    const k = vh / 900;
    const P = m ? vh * 0.84 : vh * 1.1;
    const vy = m ? 0.44 : 0.5;
    const aspect = m ? 4 / 5 : 16 / 9;
    const coverW = Math.max(vw, vh * aspect);
    const coverH = coverW / aspect;
    const portalY = (0.5 - vy) * vh; // a filled portal sits exactly on the viewport
    const W = Math.max(m ? 0 : 1000 * k, coverW / 2 + (m ? 46 : 170) * k);
    const FLOOR = Math.max(0.62 * vh, portalY + coverH / 2 + 100 * k);
    const CEIL = Math.max(0.68 * vh, -portalY + coverH / 2 + 140 * k);
    const holdW = m ? vw * 0.7 : Math.min(vw * 0.43, 640);
    const sHold = holdW / coverW;
    const Dh = P / sHold;                 // camera distance at the caption hold
    const drift = 0.24 * P;               // gentle dolly during the hold
    const sExit = 1.9;
    const Dexit = P / sExit;              // camera distance when the portal is gone
    const travel = (m ? 2.4 : 2.7) * P;   // stretch between two portals
    const L = travel + Dh - Dexit;        // portal spacing
    const T1 = 3.3 * P;                   // entrance → first hold
    const zp = [0, 1, 2].map(i => -(T1 + Dh) - i * L);
    const sMid = P / (Dh - drift / 2);
    // desktop: at the holds the camera glances right, so the edition screen
    // sits a little left of centre and the caption has the right side
    const glance = m ? 0 : (0.055 * vw) / sMid;
    const eye = {
      start: 0,
      inFrom: 0.7 * P,
      holdS: zp.map(z => z + Dh),
      holdE: zp.map(z => z + Dh - drift),
      exit: zp.map(z => z + Dexit),
      end: zp[2] + Dexit - 1.6 * P
    };
    const ks = m ? 0.62 * vh / 844 : k;   // wall screen size
    const ky = (FLOOR + CEIL) / 1170;     // wall rows
    return {
      vw, vh, m, k, P, vy, aspect, coverW, coverH, portalY, W, FLOOR, CEIL,
      holdW, sHold, sMid, glance, Dh, drift, sExit, Dexit, travel, L, T1, zp, eye, ks, ky,
      zEnd: zp[2] - 10 * P,
      far: 10.5 * P,
      angle: m ? 62 : 74
    };
  }

  /* ---------- building the world ---------- */

  function add(cls, w, h, base, extra) {
    const el = document.createElement('div');
    el.className = cls;
    el.style.width = f1(w) + 'px';
    el.style.height = f1(h) + 'px';
    el.style.transform = base + (extra || '');
    world.appendChild(el);
    return el;
  }
  const at = (x, y, z, w, h) => `translate3d(${f1(x - w / 2)}px, ${f1(y - h / 2)}px, ${f1(z)}px) `;

  function mediaInto(el, media) {
    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    el.appendChild(img);
    let video = null;
    if (media.clip) {
      video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.preload = 'none';
      el.appendChild(video);
    }
    return { img, video };
  }

  function stretchOf(z) {
    const { zp } = G;
    if (z > zp[0]) return 0;
    if (z > zp[1]) return 1;
    if (z > zp[2]) return 2;
    return 3;
  }

  function build() {
    G = computeGeometry();
    const { P, W, FLOOR, CEIL, zp, ks, ky, m, angle } = G;
    world.innerHTML = '';
    items = [];
    videos = [];

    frame.style.setProperty('--ob-p', f1(P) + 'px');
    frame.style.setProperty('--ob-vy', (G.vy * 100) + '%');
    // the caption sits beside the edition screen as it looks mid-hold
    frame.style.setProperty('--ob-hw', f1(G.coverW * G.sMid) + 'px');
    frame.style.setProperty('--ob-hh', f1(G.coverH * G.sMid) + 'px');
    frame.style.setProperty('--ob-px', f1(-G.glance * G.sMid) + 'px');
    frame.style.setProperty('--ob-vyp', f1(G.vy * G.vh + G.portalY * G.sMid) + 'px');

    const tvBezel = Math.max(3, 6 * ks);

    /* walls */
    const pools = POOLS.map(p => ({ h: p.h.slice(), q: p.q.slice(), v: p.v.slice() }));
    const zStep = (m ? 1.1 : 0.92) * P;
    let seed = 1;
    let spare = 0;
    for (let s = 0; s < 3; s++) {
      const zA = s === 0 ? -0.45 * P : zp[s - 1] - 0.4 * P;
      const zB = zp[s] + 0.2 * P;
      const pool = pools[s];
      [-1, 1].forEach((side, si) => {
        const seq = si === 0 ? SEQ_L : SEQ_R;
        let z = zA - zStep * (si === 0 ? 0.25 : 0.75);
        let c = s * 2;
        while (z > zB) {
          let cfg = COLS[seq[c % seq.length]];
          // one portrait screen per stretch: left wall on 1 and 3, right on 2
          if (cfg[0][0] === 'v' && (!pool.v.length || (s % 2 === 0) !== (side < 0))) cfg = COLS[4];
          // phones: thinner walls, one screen per column
          const list = m ? [cfg.reduce((a, b) => (b[1] > a[1] ? b : a))] : cfg;
          list.forEach(([shape, w0, y0]) => {
            const w = w0 * ks * (m ? 1.25 : 1);
            const h = w / ASPECT[shape];
            const y = m ? lerp(-0.12 * CEIL, 0.1 * FLOOR, (y0 + 450) / 900) : y0 * ky;
            const media = (pool[shape].length ? pool[shape] : pool.h).shift() || SPARE[spare++ % SPARE.length];
            const rot = side < 0 ? angle : -angle;
            const cosA = Math.cos(angle * Math.PI / 180);
            const x = side * (W - (w / 2) * cosA - 12 * ks);
            const zz = z + (seed % 3 - 1) * 0.06 * P;
            const el = add('ob-tv', w, h, at(x, y, zz, w, h), `rotateY(${rot}deg)`);
            el.style.setProperty('--ob-bz', f1(tvBezel) + 'px');
            el.style.setProperty('--ob-r', f1(Math.max(6, 12 * ks)) + 'px');
            el.style.setProperty('--ob-gl', f1(70 * ks) + 'px');
            const md = mediaInto(el, media);
            const it = {
              el, type: 'tv', z: zz, half: (w / 2) * Math.sin(angle * Math.PI / 180),
              stretch: s, seed: (seed * 0.618) % 1, media, ...md, a: -1, vis: null, loaded: false
            };
            items.push(it);
            if (md.video) videos.push(it);
            seed++;
          });
          z -= zStep;
          c++;
        }
      });
    }

    /* edition screens + their light pooled on the floor */
    zp.forEach((z, i) => {
      const el = add('ob-tv ob-portal', G.coverW, G.coverH, at(0, G.portalY, z, G.coverW, G.coverH));
      el.style.setProperty('--ob-pbz', f1(16 * G.k) + 'px');
      el.style.setProperty('--ob-pr', f1(22 * G.k) + 'px');
      el.style.setProperty('--ob-pgl', f1(240 * G.k) + 'px');
      const md = mediaInto(el, EDITIONS[i].media);
      const it = { el, type: 'portal', z, half: 0, stretch: i, seed: 0.3, media: EDITIONS[i].media, ...md, a: -1, vis: null, loaded: false, index: i };
      items.push(it);
      if (md.video) videos.push(it);

      const gl = 1.4 * P;
      const pool = add('ob-pool', G.coverW * 1.1, gl, at(0, FLOOR - 1, z + gl / 2, G.coverW * 1.1, gl), 'rotateX(90deg)');
      pool.style.background = 'radial-gradient(50% 70% at 50% 0%, rgba(168,255,53,0.13) 0%, rgba(120,220,50,0.05) 45%, rgba(1,7,2,0) 100%)';
      items.push({ el: pool, type: 'pool', z: z + gl / 2, half: gl / 2, stretch: i, a: -1, vis: null });
    });

    /* floor lettering: one marking per stretch, like road paint */
    const marks = [];
    EDITIONS.forEach((ed, i) => {
      const fs = Math.min(W * 0.27, 300 * G.k);
      const w = W * 1.7;
      const h = fs * 2.15;
      const sy = m ? 2.1 : 2.6;
      const len = h * sy;
      const zNear = i === 0 ? -2.2 * P : zp[i - 1] - 1.9 * P;
      const zc = zNear - len / 2;
      const el = add('ob-mark', w, h, at(0, FLOOR - 2, zc, w, h), `rotateX(90deg) scaleY(${sy})`);
      el.style.fontSize = f1(fs) + 'px';
      el.innerHTML = `<span>${ed.floor[0]}</span><span>${ed.floor[1]}</span>`;
      items.push({ el, type: 'mark', z: zc, half: len / 2, stretch: i, a: -1, vis: null });
      marks.push([zc - len / 2 - 0.25 * P, zc + len / 2 + 0.25 * P]);
    });

    /* the road: centre dashes, lime edge lines, faint rails at the wall joints */
    const zTop = 1.1 * P;
    const dashL = 0.17 * P;
    const period = 0.44 * P;
    const dashW = Math.max(4, 9 * G.k * (m ? 0.7 : 1));
    for (let z = zTop; z > G.zEnd; z -= period) {
      const zc = z - dashL / 2;
      if (marks.some(([a, b]) => zc > a && zc < b)) continue;
      const el = add('ob-dash', dashW, dashL, at(0, FLOOR - 1, zc, dashW, dashL), 'rotateX(90deg)');
      items.push({ el, type: 'dash', z: zc, half: dashL / 2, stretch: stretchOf(zc), a: -1, vis: null });
    }
    const segL = 1.25 * P;
    const edgeW = Math.max(3, 5 * G.k * (m ? 0.7 : 1));
    const lines = [[0.86 * W, FLOOR - 1, 'ob-edge', edgeW]];
    if (!m) lines.push([W - 4, FLOOR - 1, 'ob-rail', 3], [W - 4, -CEIL, 'ob-rail', 3], [0.5 * W, -CEIL + 2, 'ob-ceil', Math.max(4, 7 * G.k)]);
    lines.forEach(([x, y, cls, lw]) => {
      [-1, 1].forEach(side => {
        for (let z = zTop; z > G.zEnd; z -= segL) {
          const zc = z - segL / 2;
          // past the last edition the corridor opens: only the road lines go on
          if (cls !== 'ob-edge' && zc < zp[2] - 0.3 * P) continue;
          const base = at(side * x, y, zc, lw, segL) + 'rotateX(90deg)';
          const el = add(cls, lw, segL, base);
          items.push({ el, type: 'line', z: zc, half: segL / 2, len: segL, base, stretch: stretchOf(zc), a: -1, vis: null, d: 1 });
        }
      });
    });

    /* the scattered screens floating around the title (the telescope field) */
    const FL = m
      ? [[-0.62, -0.7, 1.45, 0.34], [0.66, -0.6, 1.7, 0.3], [-0.6, 0.7, 1.6, 0.3], [0.62, 0.78, 1.35, 0.32]]
      : [[-0.76, -0.5, 1.4, 0.15], [-0.7, 0.5, 1.65, 0.13], [0.79, -0.44, 1.55, 0.16], [0.72, 0.56, 1.3, 0.12], [-0.38, -0.7, 2.2, 0.095], [0.36, 0.74, 2.0, 0.1]];
    FL.forEach(([nx, ny, dF, wF], i) => {
      const D = dF * P;
      const sc = D / P;
      const w = wF * G.vw * sc;
      const h = w / (16 / 9);
      const x = nx * (G.vw / 2) * sc;
      const y = (ny * (ny < 0 ? G.vy : 1 - G.vy) * G.vh) * sc;
      const z = -D;
      const yaw = nx < 0 ? 9 : -9;
      const el = add('ob-tv ob-float', w, h, at(x, y, z, w, h), `rotateY(${yaw}deg)`);
      el.style.setProperty('--ob-bz', f1(5 * sc) + 'px');
      el.style.setProperty('--ob-r', f1(10 * sc) + 'px');
      el.style.setProperty('--ob-gl', f1(60 * sc) + 'px');
      const media = FLOAT_MEDIA[i % FLOAT_MEDIA.length];
      const md = mediaInto(el, media);
      items.push({ el, type: 'float', z, half: 0, stretch: 0, seed: i / FL.length, media, ...md, a: -1, vis: null, loaded: false, inA: 0, order: i });
    });

    // the edition frames and the title field should be ready before they are seen
    items.filter(it => it.type === 'portal' || it.type === 'float').forEach(load);
    measurePill();
  }

  /* ---------- the gate (pill → full frame) ---------- */

  let pillR = null;
  function measurePill() {
    const fr = frame.getBoundingClientRect();
    const r = pill.getBoundingClientRect();
    pillR = { x: r.left - fr.left, y: r.top - fr.top, w: r.width, h: r.height };
    pillR.cx = pillR.x + pillR.w / 2;
    pillR.cy = pillR.y + pillR.h / 2;
    // words part away from the pill: left of it go left, right of it go right
    words.forEach(w => {
      const wr = w.getBoundingClientRect();
      const c = wr.left + wr.width / 2 - fr.left;
      w._dir = c < pillR.cx ? -1 : 1;
      w._dist = Math.abs(c - pillR.cx) / (G.vw / 2);
    });
  }

  function renderGate() {
    const { vw, vh } = G;
    const g = S.grow;
    const o = g > 0 ? 1 : S.open;
    if (o <= 0.001 || S.pass >= 0.999) {
      gate.style.visibility = 'hidden';
      return;
    }
    gate.style.visibility = 'visible';
    const pw = Math.max(2, pillR.w * o);
    const ph = pillR.h;
    // geometric growth (an even, telescope-like zoom); the centre glides home
    const w = pw * Math.pow(vw / pw, g);
    const h = ph * Math.pow(vh / ph, g);
    const t = (w - pw) / (vw - pw || 1);
    const cx = lerp(pillR.cx, vw / 2, t);
    const cy = lerp(pillR.cy, vh / 2, t);
    const rad = Math.min(h / 2, lerp(ph / 2, 0, smooth(0.55, 1, g)) + 30 * Math.sin(Math.PI * g) * (1 - g));
    gate.style.left = f1(cx - w / 2) + 'px';
    gate.style.top = f1(cy - h / 2) + 'px';
    gate.style.width = f1(w) + 'px';
    gate.style.height = f1(h) + 'px';
    gate.style.borderRadius = f1(rad) + 'px';
    gate.style.opacity = (1 - S.pass).toFixed(3);
    const sc = 1 + 0.3 * S.pass;
    gateImg.style.transform = gateVideo.style.transform = `scale(${sc.toFixed(4)})`;
    gate.style.boxShadow = g > 0.95 ? 'none' : '';
  }

  /* ---------- per-frame render ---------- */

  // light wave travelling from near to far, with a few quick flickers
  function ramp(w, dn, seed) {
    const r = clamp01((w * 1.6 - dn) / 0.6);
    if (r <= 0) return 0;
    if (r >= 1) return 1;
    const fl = 1 - (1 - r) * 0.7 * (0.5 + 0.5 * Math.sin(r * 26 + seed * 40));
    return r * fl;
  }

  // focus: brightness rises only near the camera (cubic), fog toward the vanishing point
  function focus(D) {
    const P = G.P;
    const f = 1 - clamp01((D - 1.25 * P) / (3.6 * P));
    return (0.4 + 0.6 * f * f * f) * (1 - smooth(4.6 * P, 10 * P, D));
  }

  function stretchLight(s, D, seed) {
    const P = G.P;
    const dn = clamp01((D - 0.9 * P) / (7 * P));
    const entrance = ramp(S.wave, dn, seed);
    if (s === 0) return entrance * (0.34 + 0.66 * S.amp0);
    const on = s === 1 ? S.on1 : s === 2 ? S.on2 : S.on3;
    const lit = on > 0 ? ramp(on, clamp01((D - 0.4 * P) / (7 * P)), seed) : 0;
    return Math.max(entrance * (s === 3 ? 0 : 0.18), lit);
  }

  function setVis(it, v) {
    if (it.vis === v) return;
    it.vis = v;
    it.el.style.visibility = v ? 'visible' : 'hidden';
  }
  function setA(it, a) {
    if (Math.abs(it.a - a) < 0.008 && !(a === 1 && it.a !== 1)) return;
    it.a = a;
    it.el.style.opacity = a.toFixed(3);
  }

  function load(it) {
    if (it.loaded || !it.img) return;
    it.loaded = true;
    it.img.onload = () => it.img.classList.add('is-in');
    it.img.src = it.media.src;
  }

  function render() {
    dirty = false;
    if (!G) return;
    const { P } = G;
    const eye = S.eye + S.eyeIn;

    // a breath of life: tiny yaw / roll / pitch that settles whenever a screen fills the view
    let calm = 1;
    G.zp.forEach(z => {
      const s = P / Math.max(1, eye - z);
      calm = Math.min(calm, 1 - smooth(0.2, 0.34, s) * (1 - smooth(1.9, 2.4, s)));
    });
    calm *= 1 - S.grow * (1 - S.pass);
    const yaw = 0.6 * Math.sin(eye / (3.3 * P) + 0.6) * calm;
    const roll = 0.35 * Math.sin(eye / (2.4 * P) + 1.7) * calm;
    const pitch = 0.25 * Math.sin(eye / (2.9 * P) + 2.4) * calm;
    world.style.transform =
      `translate3d(0px, 0px, ${f1(P)}px) rotateX(${pitch.toFixed(3)}deg) rotateY(${yaw.toFixed(3)}deg) rotateZ(${roll.toFixed(3)}deg) translate3d(${f1(-S.camX)}px, 0px, ${f1(-eye)}px)`;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const D = eye - it.z;
      const near = D - it.half;
      // floor paint may straddle the camera (its far part is still on screen); everything else culls at its near edge
      const gone = it.type === 'mark' ? D + it.half < 0.04 * P : near < 0.04 * P;
      if (gone || near > G.far) { setVis(it, false); continue; }

      let a = 0;
      switch (it.type) {
        case 'tv':
          a = focus(D) * stretchLight(it.stretch, D, it.seed);
          break;
        case 'portal': {
          const s = P / D;
          const fogP = 1 - 0.85 * smooth(3.4 * P, 10 * P, D);
          a = fogP * stretchLight(it.stretch, D, it.seed) * (1 - smooth(1.07, 1.8, s));
          break;
        }
        case 'pool':
          a = focus(D) * stretchLight(it.stretch, D, 0.5);
          break;
        case 'mark':
          a = (0.55 + 0.45 * focus(D)) * (1 - smooth(5 * P, 10 * P, D)) * stretchLight(it.stretch, D, 0.2) * clamp01(S.draw * 1.4);
          break;
        case 'dash': {
          const reach = S.draw >= 1 ? 1e9 : S.draw * 8 * P;
          const d = clamp01((reach - (near - 0.6 * P)) / (0.5 * P));
          a = (0.5 + 0.5 * focus(D)) * (1 - smooth(5 * P, 10 * P, D)) * stretchLight(it.stretch, D, 0.7) * d;
          break;
        }
        case 'line': {
          const reach = S.draw >= 1 ? 1e9 : S.draw * 8 * P;
          const d = clamp01((reach - (near - 0.6 * P)) / it.len);
          if (Math.abs(d - it.d) > 0.002) {
            it.d = d;
            it.el.style.transform = d >= 1 ? it.base : `${it.base} translateY(${f1(it.len * (1 - d) / 2)}px) scaleY(${Math.max(0.0001, d).toFixed(4)})`;
          }
          a = (0.5 + 0.5 * focus(D)) * (1 - smooth(5 * P, 10 * P, D)) * stretchLight(it.stretch, D, 0.4) * (d > 0 ? 1 : 0);
          break;
        }
        case 'float':
          a = it.inA * (1 - S.floatOut);
          break;
      }

      if (a <= 0.004) { setVis(it, false); continue; }
      setVis(it, true);
      setA(it, Math.min(1, a));
      if (!it.loaded && it.img && D < 8.5 * P) load(it);
    }

    renderGate();

    // chapter indicator
    let passed = 0;
    G.zp.forEach(z => { if (eye < z + P / 1.55) passed++; });
    const idx = Math.min(passed, 2);
    if (idx !== hudIndex) {
      hudIndex = idx;
      hudCur.textContent = '0' + (idx + 1);
      hudCity.textContent = EDITIONS[idx].city;
    }
    const prog = clamp01((G.eye.start - eye) / (G.eye.start - G.eye.exit[2]));
    hudFill.style.transform = `scaleX(${prog.toFixed(4)})`;

    scheduleVideos();
  }

  gsap.ticker.add(() => { if (dirty) render(); });
  const invalidate = () => { dirty = true; };

  /* ---------- videos: preload none, only the nearest few play ---------- */

  let vidTimer = 0;
  let vidLast = 0;
  function scheduleVideos() {
    const now = performance.now();
    if (now - vidLast > 260) { manageVideos(); return; }
    clearTimeout(vidTimer);
    vidTimer = setTimeout(manageVideos, 280);
  }
  function manageVideos() {
    vidLast = performance.now();
    if (!G) return;
    const eye = S.eye + S.eyeIn;
    const max = G.m ? 3 : 6;
    const cands = [];
    videos.forEach(it => {
      const D = eye - it.z;
      const ok = inView && it.vis && it.a > 0.2 && D > 0 && D < (it.type === 'portal' ? 7 : 4.4) * G.P;
      if (ok) cands.push([it.type === 'portal' ? D * 0.2 : D, it]);
    });
    cands.sort((a, b) => a[0] - b[0]);
    const active = new Set(cands.slice(0, max).map(c => c[1]));
    videos.forEach(it => {
      const v = it.video;
      if (active.has(it)) {
        if (!v.src) {
          v.poster = it.media.src;
          v.src = it.media.clip;
          v.addEventListener('playing', () => v.classList.add('is-in'), { once: true });
        }
        if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      } else if (!v.paused) v.pause();
    });
    // the title's pill
    const gateOn = inView && S.open > 0 && S.pass < 1;
    if (gateOn) {
      if (!gateVideo.src) {
        gateVideo.src = gateVideo.dataset.src;
        gateVideo.addEventListener('playing', () => gateVideo.classList.add('is-in'), { once: true });
      }
      if (gateVideo.paused) { const p = gateVideo.play(); if (p && p.catch) p.catch(() => {}); }
    } else if (!gateVideo.paused) gateVideo.pause();
  }

  // the title clip loops only on its crowd shots (the file cuts to a speaker at 1.93s)
  const GATE_END = 1.82;
  if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
    const tick = (now, md) => {
      if (md.mediaTime > GATE_END) gateVideo.currentTime = 0.02;
      gateVideo.requestVideoFrameCallback(tick);
    };
    gateVideo.requestVideoFrameCallback(tick);
  } else {
    gateVideo.addEventListener('timeupdate', () => { if (gateVideo.currentTime > GATE_END - 0.25) gateVideo.currentTime = 0.02; });
  }

  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    manageVideos();
  }, { rootMargin: '10% 0px' }).observe(section);

  /* ---------- text plays on thresholds (not scrubbed) ---------- */

  function buildTextTimelines() {
    const m = G.m;
    headTl = gsap.timeline({ paused: true })
      .fromTo(kicker, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out' }, 0)
      .fromTo(titleLines, { yPercent: 104 }, { yPercent: 0, duration: 0.95, ease: 'expo.out', stagger: 0.11 }, 0.08)
      .fromTo(S, { open: 0 }, { open: 1, duration: 0.8, ease: 'expo.inOut', onUpdate: invalidate }, 0.32)
      .fromTo(subIn, { yPercent: 104, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, ease: 'expo.out' }, 0.36);

    capTls = caps.map(cap => gsap.timeline({ paused: true })
      .fromTo(cap, { autoAlpha: 0, x: m ? 0 : 22, y: m ? 14 : 0 }, { autoAlpha: 1, x: 0, y: 0, duration: 0.7, ease: 'expo.out' }, 0)
      .fromTo($$('.ob-m > span', cap), { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: 'expo.out', stagger: 0.1 }, 0.06));

    hudTl = gsap.timeline({ paused: true })
      .fromTo(hud, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'expo.out' });

    finTl = gsap.timeline({ paused: true })
      .fromTo(finale, { '--ob-fs': 0 }, { '--ob-fs': 1, duration: 0.9, ease: 'power1.out' }, 0)
      .fromTo(finLines, { yPercent: 104 }, { yPercent: 0, duration: 1.05, ease: 'expo.out', stagger: 0.13 }, 0.05)
      .fromTo(finCta, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, 0.42);
  }

  const shown = { head: false, hud: false, fin: false, cap: [false, false, false] };
  function toggle(tlx, on, key, i) {
    const cur = i === undefined ? shown[key] : shown[key][i];
    if (cur === on) return;
    if (i === undefined) shown[key] = on; else shown[key][i] = on;
    if (on) tlx.timeScale(1).play();
    else tlx.timeScale(1.7).reverse();
  }

  function checkThresholds() {
    if (!T || !stMain) return;
    const t = tl.time();
    // title: plays as the section rises into view
    const pin = stIn ? stIn.progress : 0;
    const headOn = t < T.introOut && (stMain.progress > 0 || pin > 0.42);
    toggle(headTl, headOn || (shown.head && pin > 0.25 && t < T.introOut), 'head');
    T.caps.forEach(([a, b], i) => toggle(capTls[i], t >= a && t < b, 'cap', i));
    toggle(hudTl, t >= T.hudIn && t < T.hudOut, 'hud');
    toggle(finTl, t >= T.fin, 'fin');
    finale.classList.toggle('is-off', !shown.fin);
  }

  /* ---------- scrubbed timelines ---------- */

  function telescopeEase(D_A, sA) {
    // s (apparent scale) arrives at full-bleed, lingers a beat, then accelerates through
    const { P, sExit } = G;
    const D_B = P / sExit;
    const sOf = p => {
      if (p < 0.46) { const q = p / 0.46; const e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2; return sA + (1 - sA) * e; }
      if (p < 0.62) return 1 + 0.06 * (p - 0.46) / 0.16;
      const q = (p - 0.62) / 0.38;
      return 1.06 + (sExit - 1.06) * q * q;
    };
    return p => (P / sOf(p) - D_A) / (D_B - D_A);
  }

  function buildTimelines() {
    const { P, eye: E, zp, vw, m, glance } = G;
    const IR = { immediateRender: false };

    /* 1 — entrance: the section arrives already moving (scrubbed imagery) */
    tlIn = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: () => { invalidate(); checkThresholds(); } });
    tlIn.fromTo(S, { eyeIn: E.inFrom }, { eyeIn: 0, duration: 10, ease: 'power1.out' }, 0)
      .fromTo(S, { wave: 0 }, { wave: 1, duration: 7.5, ease: 'power1.inOut' }, 1.5)
      .fromTo(S, { draw: 0 }, { draw: 1, duration: 6.5, ease: 'power2.inOut' }, 2.5);
    items.filter(it => it.type === 'float').forEach(it => {
      tlIn.fromTo(it, { inA: 0 }, { inA: 1, duration: 3.2, ease: 'power2.out' }, 2.4 + it.order * 0.55);
    });

    /* 2 — the journey */
    tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });

    // intro: the words part, the pill grows into the corridor, we pass through it
    const tIntro = 21;
    // the camera creeps while the pill grows (the field flies outward), then a
    // proper dolly down the first stretch once the gate has dissolved
    const ia = 10 / tIntro;
    const ic = (0.55 * P) / (E.start - E.holdS[0]);
    const iv = (2 * ic * (1 - ia)) / (ia * (1 - ic));
    const introEase = p => {
      if (p < ia) { const q = p / ia; return ic * q * q; }
      const u = (p - ia) / (1 - ia);
      return ic + (1 - ic) * (iv * (u * u * u - 2 * u * u + u) + (-2 * u * u * u + 3 * u * u));
    };
    tl.fromTo(S, { eye: E.start }, { eye: E.holdS[0], duration: tIntro, ease: introEase }, 0)
      .fromTo(S, { camX: 0 }, { camX: glance, duration: tIntro - 4, ease: 'sine.inOut' }, 4)
      .fromTo(S, { part: 0 }, { part: 1, duration: 6.5, ease: 'power2.in' }, 0)
      .fromTo(kickWrap, { opacity: 1, y: 0 }, { opacity: 0, y: -26, duration: 2.2, ease: 'power2.in' }, 0.1)
      .fromTo(subOut, { opacity: 1, y: 0 }, { opacity: 0, y: 26, duration: 2.2, ease: 'power2.in' }, 0.1)
      .fromTo(intro, { '--ob-scrim': 1 }, { '--ob-scrim': 0, duration: 2.6, ease: 'power1.in' }, 0.4)
      .fromTo(intro, { opacity: 1 }, { opacity: 0, duration: 4.5, ease: 'power1.in' }, 1.2)
      .fromTo(S, { floatOut: 0 }, { floatOut: 1, duration: 4.5, ease: 'power1.in' }, 3.5)
      .fromTo(S, { grow: 0 }, { grow: 1, duration: 8, ease: 'sine.inOut' }, 0.5)
      .fromTo(S, { amp0: 0 }, { amp0: 1, duration: 2.5, ease: 'none' }, 6.5)
      .fromTo(S, { pass: 0 }, { pass: 1, duration: 2.8, ease: 'power1.in' }, 8.7);

    // chapters: hold ≈ 60% (caption plays on arrival), telescope + travel ≈ 20% each
    const HOLD = [18, 18, 22];
    const TELE = 7;
    const TRAVEL = 7;
    const capsT = [];
    let t = tIntro;
    for (let i = 0; i < 3; i++) {
      const tHold = t;
      const tTele = tHold + HOLD[i];
      capsT.push([tHold - 0.6, tTele - 0.2]);
      tl.fromTo(S, { eye: E.holdS[i] }, { eye: E.holdE[i], duration: HOLD[i], ease: 'none', ...IR }, tHold);
      const D_A = E.holdE[i] - zp[i];
      tl.fromTo(S, { eye: E.holdE[i] }, { eye: E.exit[i], duration: TELE, ease: telescopeEase(D_A, P / D_A), ...IR }, tTele)
        // the glance recentres so the screen fills the view dead-on
        .to(S, { camX: 0, duration: TELE * 0.42, ease: 'sine.inOut' }, tTele);
      const key = 'on' + (i + 1);
      tl.fromTo(S, { [key]: 0 }, { [key]: 1, duration: 5, ease: 'power1.out' }, tTele + TELE * 0.6);
      t = tTele + TELE;
      if (i < 2) {
        tl.fromTo(S, { eye: E.exit[i] }, { eye: E.holdS[i + 1], duration: TRAVEL, ease: 'power2.inOut', ...IR }, t)
          .to(S, { camX: glance, duration: TRAVEL, ease: 'sine.inOut' }, t);
        t += TRAVEL;
      }
    }

    // finale: the road opens into the dark, the horizon glows, the phrase rises and holds
    const tF = t;
    tl.fromTo(S, { eye: E.exit[2] }, { eye: E.end, duration: 16, ease: 'power2.out', ...IR }, tF)
      .fromTo(horizon, { opacity: 0 }, { opacity: 1, duration: 6, ease: 'power1.out' }, tF - 2.5)
      .to({}, { duration: 1 }, tF + 23);

    T = {
      introOut: 6,
      hudIn: 11,
      hudOut: tF - 3,
      caps: capsT,
      fin: tF + 1.2
    };

    // the words part sideways around the pill (±~60vw at the end)
    tl.eventCallback('onUpdate', () => {
      invalidate();
      checkThresholds();
      const p = S.part;
      words.forEach(w => {
        const x = w._dir * vw * (0.42 + 0.3 * w._dist) * p;
        w.style.transform = p > 0 ? `translate3d(${f1(x)}px, 0, 0)` : '';
      });
    });

    /* 3 — exit: the whole shot recedes like a card as the section leaves */
    tlOut = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    tlOut.fromTo(frame, { scale: 1, y: 0, rotationX: 0, borderRadius: 0, transformPerspective: 1400 },
      { scale: 0.92, y: m ? 30 : 60, rotationX: 4, borderRadius: m ? 22 : 32, duration: 1, ease: 'power1.in' }, 0)
      .fromTo(frameDim, { opacity: 0 }, { opacity: 0.55, duration: 1, ease: 'power1.in' }, 0)
      .fromTo(frameEdge, { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0);

    stIn = ScrollTrigger.create({ trigger: section, start: 'top bottom', end: 'top top', scrub: 1, animation: tlIn });
    stMain = ScrollTrigger.create({ trigger: section, start: 'top top', end: 'bottom bottom', scrub: 1.2, animation: tl });
    stOut = ScrollTrigger.create({ trigger: section, start: 'bottom bottom', end: 'bottom 20%', scrub: 0.6, animation: tlOut });
  }

  /* ---------- keyboard: the CTA is reachable even mid-journey ---------- */

  finBtn.addEventListener('focus', () => {
    if (!stMain || stMain.progress > 0.96) return;
    window.scrollTo(0, stMain.start + (stMain.end - stMain.start) * 0.985);
  });

  /* ---------- lifecycle ---------- */

  function init() {
    build();
    buildTextTimelines();
    buildTimelines();
    ScrollTrigger.refresh();
    checkThresholds();
    invalidate();
  }

  function teardown() {
    [stIn, stMain, stOut].forEach(s => s && s.kill());
    [tlIn, tl, tlOut, headTl, hudTl, finTl, ...capTls].forEach(x => x && x.kill());
    gsap.set([intro, kicker, kickWrap, subIn, subOut, hud, finCta, finale, frame, frameDim, frameEdge, horizon, ...titleLines, ...finLines, ...caps, ...$$('.ob-m > span')], { clearProps: 'all' });
    words.forEach(w => { w.style.transform = ''; });
    Object.keys(S).forEach(k => { S[k] = 0; });
    shown.head = shown.hud = shown.fin = false;
    shown.cap = [false, false, false];
    hudIndex = -1;
  }

  let lastW = window.innerWidth;
  let lastH = window.innerHeight;
  let rT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // phones resize the height when the address bar slides — ignore that
      if (w === lastW && Math.abs(h - lastH) < (w <= 810 ? 160 : 60)) return;
      lastW = w;
      lastH = h;
      teardown();
      init();
    }, 220);
  });

  const settle = () => {
    ScrollTrigger.update();
    [stIn, stMain, stOut].forEach(s => { const tw = s.getTween && s.getTween(); if (tw) tw.progress(1); });
    checkThresholds();
    render();
  };

  const start = () => {
    init();
    // debug / verification hook
    window.__ob = {
      get tl() { return tl; },
      get st() { return stMain; },
      get stIn() { return stIn; },
      get stOut() { return stOut; },
      get G() { return G; },
      get T() { return T; },
      S,
      // jump to a main-timeline progress without waiting for the scrub
      go(p) { window.scrollTo(0, stMain.start + (stMain.end - stMain.start) * p); settle(); },
      // the section rising into view (0 = touching the bottom, 1 = pinned)
      goIn(p) { window.scrollTo(0, stIn.start + (stIn.end - stIn.start) * p); settle(); },
      // the section leaving (0 = unpinning, 1 = mostly gone)
      goOut(p) { window.scrollTo(0, stOut.start + (stOut.end - stOut.start) * p); settle(); },
      // jump by timeline time
      at(time) { this.go(time / tl.duration()); }
    };
  };

  // the pill is measured from the real title, so wait for the web font
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  else window.addEventListener('load', start);
})();
