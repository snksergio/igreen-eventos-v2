/* ============================================================
   Opção C — Órbita
   Uma história em quatro atos dentro de um palco fixo:
   1. fichário — duas pilhas de cards giram como um rolodex e a frase
      "Cada parada virou história" se monta entre elas, palavra a palavra,
      sempre quando um card vira na borda da faixa central;
   2. órbita — as pilhas explodem em um anel ao redor de "história",
      que cresce e desliza para dentro do título da seção;
   3. capítulos — o anel gira em três passos e cada edição chega às
      12 horas com o seu texto;
   4. fechamento — o anel se abre, o fundo esquenta, as palavras de
      efeito entram, os cards irrompem entre as duas linhas e o palco
      recua quando a seção se solta.
   Movimento dos cards: atrelado à rolagem (scrub). Textos: tocados ao
   cruzar cada marco (e revertidos ao voltar), nunca pela metade.
   ============================================================ */
(() => {
  'use strict';

  const section = document.querySelector('.oc');
  if (!section) return;
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduceMQ.matches || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  section.classList.add('is-ready');

  /* ---------------------------------------------------------- helpers */
  const DEG = Math.PI / 180;
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const mod = (a, n) => ((a % n) + n) % n;
  const wrapPi = (a) => mod(a + Math.PI, Math.PI * 2) - Math.PI;
  const wrapDeg = (a) => mod(a + 180, 360) - 180;
  const expoOut = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const sineOut = (t) => Math.sin((t * Math.PI) / 2);
  const rnd = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

  /* ---------------------------------------------------------- elements */
  const stage = section.querySelector('.oc-stage');
  const frame = section.querySelector('.oc-frame');
  const world = section.querySelector('.oc-world');
  const bg = section.querySelector('.oc-bg');
  const bgAurora = section.querySelector('.oc-bg-aurora');
  const scrim = section.querySelector('.oc-scrim');
  const dark = section.querySelector('.oc-dark');
  const nav = document.querySelector('.topnav');
  const head = section.querySelector('.oc-head');
  const headKicker = head.querySelector('.kicker');
  const headLines = [...head.querySelectorAll('.oc-li')];
  const headHist = head.querySelector('.oc-h-hist');
  const eds = [...section.querySelectorAll('.oc-ed')].map((el) => ({
    el,
    top: el.querySelector('.oc-ed-top'),
    line: el.querySelector('.oc-li'),
    desc: el.querySelector('.oc-ed-desc'),
  }));
  const hud = section.querySelector('.oc-hud');
  const hudRoll = section.querySelector('.oc-hud-roll');
  const hudBar = section.querySelector('.oc-hud-bar i');
  const finalEl = section.querySelector('.oc-final');
  const finalLines = [...finalEl.querySelectorAll('.oc-li')];
  const finalCta = finalEl.querySelector('.oc-final-cta');
  const ctaLink = finalCta.querySelector('a');

  /* palavras cinéticas: cada letra numa janela com máscara */
  const W = {};
  section.querySelectorAll('.oc-word').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    const chars = [];
    words.forEach((word, i) => {
      const w = document.createElement('span');
      w.className = 'oc-kw-w';
      for (const ch of word) {
        const c = document.createElement('span');
        c.className = 'oc-ch';
        c.textContent = ch;
        w.appendChild(c);
        chars.push(c);
      }
      el.appendChild(w);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    W[el.dataset.w] = { el, chars, k: '' };
  });

  /* ---------------------------------------------------------- cards */
  const A = '../assets/';
  const DATA = [
    { id: 'E1', ed: 0, shape: 'E', img: 'img/past-03.jpg', tag: 'Recife · 2024', n: '01' },
    { id: 'E2', ed: 1, shape: 'E', img: 'img/past-02.jpg', tag: 'Curitiba · 2024', n: '02' },
    { id: 'E3', ed: 2, shape: 'E', img: 'img/past-01.jpg', tag: 'São Paulo · 2025', n: '03' },
    { id: 'm1', shape: 'L', img: 'img/past/moment-19.jpg' },
    { id: 'm2', shape: 'S', video: 'video/cards/sel-musgo1' },
    { id: 'm3', shape: 'M', img: 'img/past/moment-02.jpg' },
    { id: 'm4', shape: 'L', video: 'video/past/arena-persistencia' },
    { id: 'm5', shape: 'S', img: 'img/past/moment-13.jpg' },
    { id: 'm6', shape: 'M', img: 'img/past/moment-16.jpg' },
    { id: 'm7', shape: 'L', video: 'video/past/expo-crowd' },
    { id: 'm8', shape: 'S', img: 'img/past/moment-07.jpg' },
    { id: 'm9', shape: 'M', video: 'video/past/stage-speaker' },
    { id: 'f1', shape: 'L', img: 'img/past/moment-22.jpg', fly: true },
    { id: 'f2', shape: 'M', img: 'img/past/moment-05.jpg', fly: true },
  ];
  const ASPECT = { E: 0.82, L: 0.625, M: 0.625, S: 0.75 };
  const RING_W = { E: 182, L: 132, M: 106, S: 90 };   // na órbita, para R = 309px
  const RING_W_M = { E: 150, L: 112, M: 92, S: 80 };  // celular (fallback simples)
  // ordem no fichário (de baixo para cima)
  const REEL = ['m1', 'E2', 'm4', 'm8', 'E1', 'm6', 'f1', 'm2', 'E3', 'm7', 'm5', 'm9', 'f2', 'm3'];
  // órbita, no sentido horário: E1, 3 momentos, E3, 3 momentos, E2, 3 momentos
  const SLOT_SHAPES = ['E', 'L', 'S', 'M', 'E', 'L', 'S', 'M', 'E', 'L', 'S', 'M'];
  const SLOT_ED = { 0: 0, 4: 2, 8: 1 };
  const PERMS3 = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  // cards que irrompem entre as linhas no fechamento e repousam nas bordas
  const B2_D = ['m4', 'm1', 'm9', 'm7', 'm6', 'm2', 'f1', 'f2'];
  const B2_M = ['m4', 'm1', 'm9', 'm7'];
  // [x, y] em frações da meia-largura/meia-altura, escala, rotação
  const SPOTS_D = [[-0.79, -0.6, 0.6, -5], [0.75, -0.64, 0.52, 4], [-0.94, 0.12, 0.66, 3],
    [0.92, 0.06, 0.7, -4], [-0.66, 0.74, 0.52, 5], [0.66, 0.72, 0.58, -3]];
  const SPOTS_M = [[-0.62, -0.78, 0.5, -5], [0.64, -0.62, 0.46, 4], [-0.66, 0.68, 0.5, 4], [0.6, 0.82, 0.52, -4]];

  const byId = {};
  const cards = DATA.map((d, i) => {
    const el = document.createElement('div');
    const isEd = d.ed != null;
    el.className = 'oc-card ' + (isEd ? 'oc-card--ed' : 'oc-card--m');
    let html;
    if (isEd) {
      const src = A + d.img;
      html = `<div class="oc-card-in"><div class="oc-ed-photo"><img class="oc-ed-glow" src="${src}" alt="" decoding="async"><img src="${src}" alt="" decoding="async"></div>` +
        `<div class="oc-ed-meta"><span class="oc-ed-tag">${d.tag}</span><span class="oc-ed-no">${d.n}</span></div><span class="oc-shade"></span></div>` +
        '<span class="oc-hi"></span><span class="oc-halo"></span>';
    } else if (d.video) {
      const b = A + d.video;
      html = `<div class="oc-card-in"><video muted loop playsinline preload="none" poster="${b}.jpg" src="${b}.mp4"></video><span class="oc-shade"></span></div>`;
    } else {
      html = `<div class="oc-card-in"><img src="${A + d.img}" alt="" loading="lazy" decoding="async"><span class="oc-shade"></span></div>`;
    }
    el.innerHTML = html;
    world.appendChild(el);
    const video = el.querySelector('video');
    if (video) { video.muted = true; video.defaultMuted = true; }
    const c = {
      ...d, i, el, video,
      shade: el.querySelector('.oc-shade'),
      hi: el.querySelector('.oc-hi'),
      halo: el.querySelector('.oc-halo'),
      jit: rnd(i, 9), ph: rnd(i, 7) * Math.PI * 2,
      zi: -1, shv: '', hlv: '', hid: false, playing: false, on: true,
    };
    byId[d.id] = c;
    return c;
  });
  let active = cards;

  /* ---------------------------------------------------------- story state */
  // movidos pela rolagem (timeline principal) ...
  const S = {
    enter: 0, reel: 0, burst: 0, step: 0, drift: 0, expand: 0, b2: 0, d2: 0,
    // ... e pelos marcos de texto (tocados no tempo)
    cadaX: 0, viruX: 0, hCenter: 0, hGrow: 0, hMorph: 0, split: 0, dim: 0,
  };

  // linha do tempo principal em unidades 0–100
  const T = {
    reelEnd: 27, reelAdv: 5.4,
    burst: [18.5, 31],
    drift: [18.5, 72],
    steps: [[36, 38.4], [45, 47.4], [54, 56.4]],
    holdMid: [41.5, 50.5, 59.5],
    expand: [63.5, 72],
    b2: [80.5, 88],
  };
  const DRIFT = 36;      // graus de rotação contínua da órbita
  const MAXB = 0.34;     // atraso máximo na explosão
  const MAXE = 0.46;     // atraso máximo na entrada
  const MAXB2 = 0.32;
  const reelAt = (u) => (Math.min(u, T.reelEnd) / T.reelEnd) * T.reelAdv;
  const driftAt = (u) => clamp01((u - T.drift[0]) / (T.drift[1] - T.drift[0]));

  /* ---------------------------------------------------------- layout */
  const L = { ready: false };

  function layout() {
    const vw = stage.clientWidth;
    const vh = stage.clientHeight;
    if (!vw || !vh) return;
    const mobile = vw <= 810;
    const navH = nav ? Math.min(nav.getBoundingClientRect().height, vh * 0.14) : 0;
    const vhe = vh - navH;
    const cy = navH + vhe / 2;
    const R = mobile ? Math.min(0.4 * vhe, 0.84 * vw) : 0.38 * Math.min(vw, vhe);
    section.style.setProperty('--oc-cy', cy.toFixed(1) + 'px');
    section.style.setProperty('--oc-r', R.toFixed(1) + 'px');

    active = cards.filter((c) => !(mobile && c.fly));
    cards.forEach((c) => {
      c.on = active.includes(c);
      c.el.style.display = c.on ? '' : 'none';
    });

    // tamanho natural = tamanho nas pilhas (o maior em tela)
    const Ws = mobile ? Math.min(vw * 0.64, 270) : Math.max(220, Math.min(vw * 0.2, vhe * 0.36, 330));
    const ringK = mobile ? Math.max(0.85, Math.min(1.15, vw / 390)) : R / 309;
    const RW = mobile ? RING_W_M : RING_W;
    active.forEach((c) => {
      c.w = Ws;
      c.h = Math.round(Ws * ASPECT[c.shape]);
      c.rs = (RW[c.shape] * ringK) / Ws;
      const st = c.el.style;
      st.width = c.w + 'px';
      st.height = c.h + 'px';
      st.marginLeft = -c.w / 2 + 'px';
      st.marginTop = -c.h / 2 + 'px';
      st.setProperty('--w', c.w + 'px');
    });

    // fichário
    const reel = REEL.filter((id) => byId[id].on);
    const N = reel.length;
    reel.forEach((id, k) => { byId[id].q0 = k - N / 2 + 0.5; });
    const P = mobile ? 620 : Math.max(900, vw * 0.7);
    const B = Math.max(mobile ? 32 : 42, vhe * (mobile ? 0.05 : 0.064));

    Object.assign(L, {
      vw, vh, vhe, navH, cy, R, mobile, Ws, N, P, B,
      Pk: Ws * (mobile ? 0.15 : 0.2),
      Zk: Ws * 0.07,
      T0: 12, T1: 4.5,
      dMax: N / 2 - 0.5,
      lean: 9,
    });

    // órbita: posições angulares (pegada média de cada formato)
    const fp = (s) => 0.64 * RW[s] * ringK * (1 + ASPECT[s]);
    let total = SLOT_SHAPES.reduce((a, s) => a + fp(s), 0);
    const circ = 2 * Math.PI * R;
    const fit = Math.min(1, (circ - 16 * SLOT_SHAPES.length) / total);
    if (fit < 1) { active.forEach((c) => { c.rs *= fit; }); total *= fit; }
    const gap = (circ - total) / SLOT_SHAPES.length;
    const slotAng = [];
    let acc = 0;
    const off = (fp('E') * fit) / 2;
    SLOT_SHAPES.forEach((s) => {
      const f = fp(s) * fit;
      slotAng.push(((acc + f / 2 - off) / circ) * 360);
      acc += f + gap;
    });

    // de qual pilha cada card sai na explosão
    const reelB = reelAt(T.burst[0]);
    active.forEach((c) => {
      const q = mod(c.q0 + reelB + N / 2, N) - N / 2;
      c.angB = q >= 0 ? -90 : 90;
      c.dB = Math.max(0, Math.abs(q) - 0.5);
    });

    // escolhe a rotação inicial da órbita e distribui os momentos para
    // que cada card viaje o mínimo: a pilha de cima abre o arco de cima,
    // a de baixo abre o arco de baixo
    const edCards = [0, 1, 2].map((e) => active.find((c) => c.ed === e));
    const moments = { L: [], M: [], S: [] };
    active.forEach((c) => { if (c.ed == null && !c.fly) moments[c.shape].push(c); });
    const driftB = DRIFT * driftAt((T.burst[0] + T.burst[1]) / 2);
    const firstStep = (rho) => mod(-90 - slotAng[0] - rho - DRIFT * driftAt(T.holdMid[0]), 360);
    let best = null;
    for (let rho = 0; rho < 360; rho += 2) {
      let cost = 0;
      const assign = [];
      [0, 4, 8].forEach((si) => {
        const c = edCards[SLOT_ED[si]];
        cost += Math.abs(wrapDeg(slotAng[si] + rho + driftB - c.angB)) * 1.4;
        assign[si] = c;
      });
      ['L', 'S', 'M'].forEach((s) => {
        const slots = [];
        SLOT_SHAPES.forEach((x, i) => { if (x === s) slots.push(i); });
        const cs = moments[s];
        let bc = Infinity;
        let bp = PERMS3[0];
        PERMS3.forEach((perm) => {
          let cc = 0;
          perm.forEach((ci, j) => { cc += Math.abs(wrapDeg(slotAng[slots[j]] + rho + driftB - cs[ci].angB)); });
          if (cc < bc) { bc = cc; bp = perm; }
        });
        cost += bc;
        bp.forEach((ci, j) => { assign[slots[j]] = cs[ci]; });
      });
      const a1 = firstStep(rho);
      if (a1 < 45 || a1 > 140) cost += 1e5;
      if (!best || cost < best.cost) best = { cost, rho, assign };
    }
    best.assign.forEach((c, i) => { c.slot = slotAng[i]; });
    L.rho = best.rho;
    // passos: cada edição chega às 12 horas no meio do seu capítulo
    const tgt = (slot, k) => -90 - slot - L.rho - DRIFT * driftAt(T.holdMid[k]);
    const a1 = mod(tgt(slotAng[0], 0), 360);
    const a2 = a1 + mod(tgt(slotAng[8], 1) - a1, 360);
    const a3 = a2 + mod(tgt(slotAng[4], 2) - a2, 360);
    L.steps = [0, a1, a2, a3];

    // atrasos: na explosão saem primeiro os cards da frente
    active.forEach((c) => {
      c.bDelay = c.fly
        ? Math.min(MAXB, 0.02 + 0.04 * c.dB)
        : Math.min(MAXB, 0.03 + 0.07 * c.dB + (c.angB > 0 ? 0.025 : 0));
    });

    // entrada: os cards vêm espalhados em profundidade
    active.forEach((c, i) => {
      const a = rnd(i, 1) * Math.PI * 2;
      c.sx = Math.cos(a) * vw * (0.16 + 0.22 * rnd(i, 2));
      c.sy = Math.sin(a) * vhe * (0.12 + 0.18 * rnd(i, 3)) + vhe * 0.18;
      c.sz = P * (0.9 + 1.1 * rnd(i, 4));
      c.srx = (rnd(i, 5) - 0.5) * 80;
      c.srz = (rnd(i, 6) - 0.5) * 36;
      const q = Math.abs(mod(c.q0 + N / 2, N) - N / 2);
      c.eDelay = 0.06 + (MAXE - 0.08) * clamp01(1 - q / (N / 2)) + 0.02 * rnd(i, 8);
    });

    // fechamento: quem irrompe entre as linhas e onde repousa
    const spots = mobile ? SPOTS_M : SPOTS_D;
    const b2ids = mobile ? B2_M : B2_D;
    active.forEach((c) => { c.b2 = null; });
    b2ids.forEach((id, k) => {
      const c = byId[id];
      if (!c || !c.on) return;
      const sp = spots[k];
      const a0 = Math.atan2(sp ? sp[1] : rnd(k, 11) - 0.5, sp ? sp[0] : (k % 2 ? 1 : -1));
      // os que passam pela câmera saem primeiro; os que repousam vêm em cascata
      c.b2Delay = sp ? Math.min(MAXB2, 0.05 + 0.045 * k) : 0.01 * (k - spots.length);
      c.b2sx = Math.cos(a0) * 18;
      c.b2sy = Math.sin(a0) * 10;
      c.b2r0 = (rnd(k, 12) - 0.5) * 30;
      if (sp) {
        c.b2 = {
          x: (sp[0] * vw) / 2, y: (sp[1] * vhe) / 2, s: sp[2] * (mobile ? 1 : Math.min(1.15, vw / 1440 + 0.15)), r: sp[3],
          dx: Math.cos(a0) * vw * 0.025, dy: Math.sin(a0) * vhe * 0.02, dr: (rnd(k, 13) - 0.5) * 4,
        };
      } else {
        const ang = (k % 2 ? -0.35 : Math.PI + 0.3);
        c.b2 = { fly: true, x: Math.cos(ang) * vw * 0.7, y: Math.sin(ang) * vh * 0.6, s: 0.6, r: (rnd(k, 14) - 0.5) * 20, dx: 0, dy: 0, dr: 0 };
      }
    });

    // frase: posições medidas das palavras
    const fs = parseFloat(getComputedStyle(W.cada.el).fontSize);
    const fBig = parseFloat(getComputedStyle(W.historia.el).fontSize);
    const pad = fs * 0.1;
    const g = fs * 0.26 - pad;
    const wC = W.cada.el.offsetWidth;
    const wP = W.parada.el.offsetWidth;
    const wV = W.virou.el.offsetWidth;
    const wH = W.historia.el.offsetWidth;
    L.s0 = fs / fBig;
    let tw = wC + g + wP;
    L.xCada = -tw / 2 + wC / 2;
    L.xParada = tw / 2 - wP / 2;
    tw = wV + g + wH * L.s0;
    L.xVirou = -tw / 2 + wV / 2;
    L.xHist = tw / 2 - (wH * L.s0) / 2;
    // onde "história" pousa dentro do título
    const fh = parseFloat(getComputedStyle(head.querySelector('.oc-h2')).fontSize);
    L.sHead = fh / fBig;
    let ox = 0;
    let oy = 0;
    let n = headHist;
    while (n && n !== head) { ox += n.offsetLeft; oy += n.offsetTop; n = n.offsetParent; }
    L.hx = ox + headHist.offsetWidth / 2 - head.offsetWidth / 2;
    L.hy = oy + headHist.offsetHeight / 2 - head.offsetHeight / 2;
    // linhas "Renda" / "que fica."
    const ffx = parseFloat(getComputedStyle(W.renda.el).fontSize);
    L.lineOff = ffx * 0.53;
    L.split = Math.min(vhe * (mobile ? 0.2 : 0.24), ffx * 2.3);

    L.ready = true;
    Object.values(W).forEach((w) => { w.k = ''; });
    cards.forEach((c) => { c.zi = -1; c.shv = ''; c.hlv = ''; });
  }

  /* ---------------------------------------------------------- poses */
  const stepAngle = (s) => {
    const st = L.steps;
    if (s <= 0) return 0;
    if (s >= 3) return st[3];
    const k = Math.floor(s);
    return lerp(st[k], st[k + 1], s - k);
  };

  function stackPose(c, o) {
    const N = L.N;
    const reel = S.reel - (1 - S.enter) * 2.4;
    const q = mod(c.q0 + reel + N / 2, N) - N / 2;
    const top = q >= 0;
    const aq = Math.abs(q);
    let d;
    let th;
    if (aq < 0.5) { d = 0; th = 90 - (90 - L.T0) * sineOut(aq / 0.5); } // virada na borda da faixa
    else { d = aq - 0.5; th = L.T0 + L.T1 * d; }
    const sg = top ? -1 : 1;
    const ye = sg * (L.B + L.Pk * d * (1 - 0.035 * d));
    const ze = -L.Zk * d;
    const r = th * DEG;
    const hh = c.h / 2;
    o.x = 0;
    o.y = ye + sg * hh * Math.cos(r);
    o.z = ze - hh * Math.sin(r);
    o.rx = top ? th : -th;
    o.rz = 0;
    o.s = 1;
    o.o = 1 - smooth(L.dMax - 2.4, L.dMax - 0.35, d);
    o.sh = Math.min(0.6, 0.055 * d + 0.6 * smooth(L.T0 + 3, 86, th));
    o.hl = 0;
    if (S.enter < 1) {
      const te = clamp01((S.enter - c.eDelay) / (1 - MAXE));
      const e = 1 - (1 - te) * (1 - te) * (1 - te);
      o.x = lerp(c.sx, o.x, e);
      o.y = lerp(o.y + c.sy, o.y, e);
      o.z = lerp(o.z - c.sz, o.z, e);
      o.rx = lerp(o.rx + c.srx, o.rx, e);
      o.rz = lerp(c.srz, 0, e);
      o.o *= smooth(0, 0.55, e);
    }
    return o;
  }

  function ringPose(c, o, time) {
    const E = S.expand;
    const ad = c.slot + L.rho + stepAngle(S.step) + DRIFT * S.drift + E * 24;
    const a = ad * DEG;
    let hl = 0;
    if (c.ed != null) hl = 1 - smooth(4, 30, Math.abs(wrapDeg(ad + 90)));
    const rr = L.R * (1 + 0.32 * E);
    // vida: flutuação lenta, independente da rolagem
    const fl = Math.sin(time * 0.85 + c.ph);
    o.x = rr * Math.cos(a);
    o.y = rr * Math.sin(a) + fl * 0.045 * c.h * c.rs;
    o.z = E * L.P * (0.38 + 0.26 * c.jit);
    o.rx = 0;
    o.rz = -L.lean * Math.sin(2 * a) + fl * 0.6;
    o.s = c.rs * (1 + 0.1 * hl);
    o.o = (1 - 0.45 * S.dim * (1 - hl)) * (1 - smooth(0.42, 0.9, E));
    o.sh = 0;
    o.hl = hl;
    return o;
  }

  const PA = {};
  const PB = {};
  function burstPose(c, t, o, time) {
    stackPose(c, PA);
    ringPose(c, PB, time);
    const P = L.P;
    const e = expoOut(t);
    const f0 = P / (P - PA.z);
    const f1 = P / (P - PB.z);
    const xs0 = PA.x * f0;
    const ys0 = PA.y * f0;
    const xs1 = PB.x * f1;
    const ys1 = PB.y * f1;
    const r0 = Math.hypot(xs0, ys0);
    const a0 = Math.atan2(ys0, xs0);
    const r1 = Math.hypot(xs1, ys1);
    const da = wrapPi(Math.atan2(ys1, xs1) - a0);
    const bump = 4 * t * (1 - t);
    const a = a0 + da * e;
    const r = lerp(r0, r1, e) + bump * L.R * 0.1;
    const z = lerp(PA.z, PB.z, e) + bump * P * 0.14;
    const k = (P - z) / P;
    o.x = r * Math.cos(a) * k;
    o.y = r * Math.sin(a) * k;
    o.z = z;
    o.rx = PA.rx * (1 - e);
    o.rz = PB.rz * e + (da / DEG) * 0.14 * bump;
    o.s = lerp(PA.s, PB.s, e);
    o.o = lerp(PA.o, PB.o, clamp01(e * 1.5));
    o.sh = PA.sh * (1 - e);
    o.hl = PB.hl * e;
    return o;
  }

  function flyPose(c, t, o) {
    stackPose(c, PA);
    const P = L.P;
    const e = 1 - (1 - t) * (1 - t);
    const f0 = P / (P - PA.z);
    const sg = PA.y < 0 ? -1 : 1;
    const xs = lerp(PA.x * f0, (c.i % 2 ? 1 : -1) * L.vw * 0.34, e);
    const ys = lerp(PA.y * f0, sg * L.vhe * 0.42, e);
    const z = lerp(PA.z, P * 0.72, t);
    const k = (P - z) / P;
    o.x = xs * k;
    o.y = ys * k;
    o.z = z;
    o.rx = PA.rx * (1 - e);
    o.rz = (c.i % 2 ? 1 : -1) * 14 * e;
    o.s = 1;
    o.o = PA.o * (1 - smooth(0.35, 0.85, t));
    o.sh = PA.sh * (1 - e);
    o.hl = 0;
    return o;
  }

  function b2Pose(c, t, o, time) {
    const b = c.b2;
    const P = L.P;
    const e = expoOut(t);
    const fl = Math.sin(time * 0.7 + c.ph);
    const xs = lerp(c.b2sx, b.x, e) + b.dx * S.d2;
    const ys = lerp(c.b2sy, b.y, e) + b.dy * S.d2 + fl * 5 * e;
    const z = lerp(-P * 2.6, b.fly ? P * 0.7 : 0, e) + 4 * t * (1 - t) * P * 0.08;
    const k = (P - z) / P;
    o.x = xs * k;
    o.y = ys * k;
    o.z = z;
    o.rx = 0;
    o.rz = lerp(c.b2r0, b.r, e) + b.dr * S.d2 + fl * 0.5;
    o.s = b.s;
    o.o = smooth(0, 0.1, t) * (b.fly ? 1 - smooth(0.22, 0.55, t) : 1);
    o.sh = 0;
    o.hl = 0;
    return o;
  }

  /* ---------------------------------------------------------- render */
  let inView = false;
  function vid(c, want) {
    if (!c.video) return;
    const on = want && inView;
    if (on === c.playing) return;
    c.playing = on;
    if (on) {
      const pr = c.video.play();
      if (pr && pr.catch) pr.catch(() => {});
    } else {
      c.video.pause();
    }
  }

  function write(c, o) {
    const st = c.el.style;
    if (o.o < 0.004) {
      if (!c.hid) { st.visibility = 'hidden'; c.hid = true; }
      vid(c, false);
      return;
    }
    if (c.hid) { st.visibility = ''; c.hid = false; }
    st.transform = `perspective(${L.P.toFixed(0)}px) translate3d(${o.x.toFixed(2)}px,${o.y.toFixed(2)}px,${o.z.toFixed(2)}px) rotateX(${o.rx.toFixed(3)}deg) rotate(${o.rz.toFixed(3)}deg) scale(${o.s.toFixed(4)})`;
    st.opacity = o.o > 0.998 ? '1' : o.o.toFixed(3);
    const zi = Math.round(2000 + o.z + o.hl * 600);
    if (zi !== c.zi) { st.zIndex = zi; c.zi = zi; }
    const sh = o.sh.toFixed(3);
    if (sh !== c.shv) { c.shade.style.opacity = sh; c.shv = sh; }
    if (c.hi) {
      const h = o.hl.toFixed(3);
      if (h !== c.hlv) { c.hi.style.opacity = h; c.halo.style.opacity = h; c.hlv = h; }
    }
    vid(c, o.o > 0.05);
  }

  function setW(w, x, y, s) {
    const key = x.toFixed(2) + '|' + y.toFixed(2) + '|' + s.toFixed(4);
    if (key === w.k) return;
    w.k = key;
    w.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)` + (s !== 1 ? ` scale(${s.toFixed(4)})` : '');
  }

  const PO = {};
  let lastHistC = '';
  function render(time) {
    if (!L.ready) return;
    const tm = typeof time === 'number' ? time : gsap.ticker.time;
    for (const c of active) {
      let o;
      const t2 = c.b2 ? clamp01((S.b2 - c.b2Delay) / (1 - MAXB2)) : 0;
      if (t2 > 0) {
        o = b2Pose(c, t2, PO, tm);
      } else {
        const t = clamp01((S.burst - c.bDelay) / (1 - MAXB));
        if (t <= 0) o = stackPose(c, PO);
        else if (c.fly) o = flyPose(c, t, PO);
        else if (t >= 1) o = ringPose(c, PO, tm);
        else o = burstPose(c, t, PO, tm);
      }
      write(c, o);
    }

    // frase central
    setW(W.cada, L.xCada * S.cadaX, 0, 1);
    setW(W.parada, L.xParada, 0, 1);
    setW(W.virou, L.xVirou * S.viruX, 0, 1);
    const hx = lerp(lerp(L.xHist, 0, S.hCenter), L.hx, S.hMorph);
    const hs = lerp(lerp(L.s0, 1, S.hGrow), L.sHead, S.hMorph);
    setW(W.historia, hx, L.hy * S.hMorph, hs);
    const hc = (1 - 0.6 * S.hMorph).toFixed(3);
    if (hc !== lastHistC) { W.historia.el.style.color = `rgba(243, 246, 236, ${hc})`; lastHistC = hc; }
    setW(W.renda, 0, -L.lineOff - L.split * S.split, 1);
    setW(W.quefica, 0, L.lineOff + L.split * S.split, 1);
  }

  /* ---------------------------------------------------------- scroll: movimento */
  // 1) entrada: as pilhas se montam enquanto a seção sobe
  const tlIn = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: section, start: 'top bottom', end: 'top top', scrub: 1 },
    onUpdate: () => syncBeats(storyU()),
  });
  tlIn.to(S, { enter: 1, duration: 1 }, 0);

  // 2) palco fixo
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 1.5 },
    onUpdate: () => {
      syncBeats(storyU());
      const fin = tl.progress() > 0.86;
      if (fin !== section.classList.contains('is-final')) section.classList.toggle('is-final', fin);
    },
  });
  tl.to(S, { reel: T.reelAdv, duration: T.reelEnd }, 0)
    .to(S, { burst: 1, duration: T.burst[1] - T.burst[0] }, T.burst[0])
    .to(S, { drift: 1, duration: T.drift[1] - T.drift[0] }, T.drift[0]);
  T.steps.forEach(([a, b], k) => {
    tl.to(S, { step: k + 1, duration: b - a, ease: 'power2.inOut' }, a);
  });
  tl.to(S, { expand: 1, duration: T.expand[1] - T.expand[0] }, T.expand[0])
    .fromTo(bg, { opacity: 0 }, { opacity: 1, duration: 9.5, ease: 'power1.inOut' }, 63.5)
    .fromTo(bgAurora, { scaleX: -1.12, scaleY: 1.12, rotation: -4, yPercent: 4 },
      { scaleX: -1, scaleY: 1, rotation: -2, yPercent: 0, duration: 36.5, ease: 'none' }, 63.5)
    .fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 6, ease: 'power1.inOut' }, 64)
    .to(S, { b2: 1, duration: T.b2[1] - T.b2[0] }, T.b2[0])
    .to(S, { d2: 1, duration: 100 - T.b2[0] }, T.b2[0])
    .set({}, {}, 100);

  // 3) saída: o palco recua como a faixa de cinema do site
  const tlOut = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: section, start: 'bottom 140%', end: 'bottom 25%', scrub: 1 },
  });
  tlOut.fromTo(frame, { scale: 1, rotationX: 0, y: 0, borderRadius: 0 },
    { scale: 0.86, rotationX: 8, y: 40, borderRadius: 36, transformPerspective: 1400, duration: 1, ease: 'power1.inOut' }, 0)
    .fromTo(dark, { opacity: 0 }, { opacity: 0.72, duration: 1, ease: 'power1.in' }, 0);

  /* ---------------------------------------------------------- textos: marcos */
  const beats = [];
  let beatK = 0;
  function beat(at, build) {
    const t = gsap.timeline({ paused: true });
    build(t);
    beats.push({ at, t });
  }
  // eixo único da história: −1…0 na entrada, 0…1 no palco fixo
  function storyU() {
    const p = tl.progress();
    return p > 0 ? p : tlIn.progress() - 1;
  }
  function syncBeats(u, instant) {
    let k = 0;
    while (k < beats.length && u >= beats[k].at) k++;
    if (instant) {
      for (let i = beats.length - 1; i >= k; i--) beats[i].t.pause().progress(0);
      for (let i = 0; i < k; i++) beats[i].t.pause().progress(1);
      beatK = k;
      return;
    }
    if (k === beatK) return;
    if (k > beatK) {
      for (let i = 0; i < k - 1; i++) if (beats[i].t.progress() < 1 || beats[i].t.reversed()) beats[i].t.pause().progress(1);
      beats[k - 1].t.play();
    } else {
      for (let i = beats.length - 1; i > k; i--) if (beats[i].t.progress() > 0) beats[i].t.pause().progress(0);
      beats[k].t.reverse();
    }
    beatK = k;
  }

  const NO = { immediateRender: false };
  const wordIn = (t, w, at = 0, stag = 0.035) => {
    t.fromTo(w.el, { autoAlpha: 0, filter: 'blur(10px) brightness(0.5)' },
      { autoAlpha: 1, filter: 'blur(0px) brightness(1)', duration: 0.6, ease: 'power2.out', ...NO }, at);
    t.fromTo(w.chars, { yPercent: 112 }, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: stag, ...NO }, at);
  };
  const wordOut = (t, w, at = 0, stag = 0.018) => {
    t.fromTo(w.chars, { yPercent: 0 }, { yPercent: -112, duration: 0.5, ease: 'power3.in', stagger: stag, ...NO }, at);
    t.fromTo(w.el, { autoAlpha: 1, filter: 'blur(0px) brightness(1)' },
      { autoAlpha: 0, filter: 'blur(8px) brightness(0.5)', duration: 0.42, ease: 'power2.in', ...NO }, at + 0.12);
  };
  // linhas: só máscara + deslocamento (desfoque recortado pela máscara fica sujo)
  const lineIn = (t, el, at) => t.fromTo(el, { yPercent: 125, opacity: 0 },
    { yPercent: 0, opacity: 1, duration: 1, ease: 'expo.out', ...NO }, at);
  const lineOut = (t, el, at) => t.fromTo(el, { yPercent: 0, opacity: 1 },
    { yPercent: -125, opacity: 0, duration: 0.5, ease: 'power3.in', ...NO }, at);
  const fadeIn = (t, el, at, y = 14) => t.fromTo(el, { opacity: 0, y, filter: 'blur(8px) brightness(0.5)' },
    { opacity: 1, y: 0, filter: 'blur(0px) brightness(1)', duration: 0.9, ease: 'expo.out', ...NO }, at);
  const fadeOut = (t, el, at, y = -10) => t.fromTo(el, { opacity: 1, y: 0, filter: 'blur(0px) brightness(1)' },
    { opacity: 0, y, filter: 'blur(6px) brightness(0.5)', duration: 0.45, ease: 'power2.in', ...NO }, at);
  const prox = (t, vars, at, dur = 0.9, ease = 'expo.out') => {
    const from = {};
    const to = { duration: dur, ease, ...NO };
    Object.keys(vars).forEach((k) => { from[k] = vars[k][0]; to[k] = vars[k][1]; });
    t.fromTo(S, from, to, at);
  };

  // estado inicial de todos os textos
  Object.values(W).forEach((w) => {
    gsap.set(w.el, { autoAlpha: 0 });
    gsap.set(w.chars, { yPercent: 112 });
  });
  gsap.set([...headLines, ...eds.map((e) => e.line), ...finalLines], { yPercent: 125, opacity: 0 });
  gsap.set([headKicker, finalCta, hud, ...eds.map((e) => e.top), ...eds.map((e) => e.desc)], { opacity: 0 });

  // -- ato 1: a frase se monta (cada palavra pousa quando um card vira)
  beat(-0.3, (t) => wordIn(t, W.cada));
  beat(0.025, (t) => {
    prox(t, { cadaX: [0, 1] }, 0, 0.9, 'expo.inOut');
    wordIn(t, W.parada, 0.22);
  });
  beat(0.075, (t) => {
    wordOut(t, W.cada, 0);
    wordOut(t, W.parada, 0.05);
    prox(t, { cadaX: [1, 0.6] }, 0, 0.5, 'power2.in');
    wordIn(t, W.virou, 0.42);
  });
  beat(0.125, (t) => {
    prox(t, { viruX: [0, 1] }, 0, 0.9, 'expo.inOut');
    wordIn(t, W.historia, 0.22);
  });
  // -- ato 2: a palavra-chave cresce enquanto a órbita se forma
  beat(0.178, (t) => {
    wordOut(t, W.virou, 0);
    prox(t, { hCenter: [0, 1] }, 0.15, 1.1, 'expo.inOut');
  });
  // só cresce quando os cards da frente já deixaram a faixa central
  beat(0.2, (t) => prox(t, { hGrow: [0, 1] }, 0, 1.6, 'expo.inOut'));
  beat(0.29, (t) => {
    // "história" desce para o seu lugar e só então o resto do título se revela
    prox(t, { hMorph: [0, 1] }, 0, 0.95, 'expo.inOut');
    fadeIn(t, headKicker, 0.3, 12);
    lineIn(t, headLines[0], 0.5);
    lineIn(t, headLines[1], 0.62);
  });
  // -- ato 3: capítulos
  beat(0.36, (t) => {
    fadeOut(t, headKicker, 0);
    lineOut(t, headLines[0], 0.04);
    lineOut(t, headLines[1], 0.1);
    t.fromTo(W.historia.el, { autoAlpha: 1, filter: 'blur(0px) brightness(1)' },
      { autoAlpha: 0, filter: 'blur(8px) brightness(0.5)', duration: 0.45, ease: 'power2.in', ...NO }, 0.1);
    t.fromTo(W.historia.chars, { yPercent: 0 }, { yPercent: -112, duration: 0.5, ease: 'power3.in', stagger: 0.015, ...NO }, 0.1);
  });
  const edIn = (t, e, at = 0) => {
    fadeIn(t, e.top, at, 10);
    lineIn(t, e.line, at + 0.08);
    fadeIn(t, e.desc, at + 0.2, 14);
  };
  const edOut = (t, e, at = 0) => {
    fadeOut(t, e.top, at);
    lineOut(t, e.line, at + 0.03);
    fadeOut(t, e.desc, at + 0.06);
  };
  beat(0.378, (t) => {
    edIn(t, eds[0]);
    prox(t, { dim: [0, 1] }, 0, 1.2, 'power2.inOut');
    fadeIn(t, hud, 0.2, 8);
    t.fromTo(hudBar, { scaleX: 0 }, { scaleX: 1 / 3, duration: 1.2, ease: 'expo.out', ...NO }, 0.25);
  });
  beat(0.452, (t) => edOut(t, eds[0]));
  beat(0.47, (t) => {
    edIn(t, eds[1]);
    t.fromTo(hudRoll, { yPercent: 0 }, { yPercent: -100 / 3, duration: 0.8, ease: 'expo.inOut', ...NO }, 0);
    t.fromTo(hudBar, { scaleX: 1 / 3 }, { scaleX: 2 / 3, duration: 1.2, ease: 'expo.out', ...NO }, 0.1);
  });
  beat(0.542, (t) => edOut(t, eds[1]));
  beat(0.56, (t) => {
    edIn(t, eds[2]);
    t.fromTo(hudRoll, { yPercent: -100 / 3 }, { yPercent: -200 / 3, duration: 0.8, ease: 'expo.inOut', ...NO }, 0);
    t.fromTo(hudBar, { scaleX: 2 / 3 }, { scaleX: 1, duration: 1.2, ease: 'expo.out', ...NO }, 0.1);
  });
  beat(0.632, (t) => {
    edOut(t, eds[2]);
    fadeOut(t, hud, 0, 6);
    prox(t, { dim: [1, 0] }, 0, 0.9, 'power2.inOut');
  });
  // -- ato 4: fechamento
  beat(0.66, (t) => wordIn(t, W.energia, 0, 0.045));
  beat(0.71, (t) => {
    wordOut(t, W.energia, 0, 0.02);
    wordIn(t, W.conexao, 0.38, 0.045);
  });
  beat(0.76, (t) => {
    wordOut(t, W.conexao, 0, 0.02);
    wordIn(t, W.renda, 0.38, 0.045);
    wordIn(t, W.quefica, 0.5, 0.04);
  });
  beat(0.805, (t) => prox(t, { split: [0, 1] }, 0, 1.4, 'expo.inOut'));
  beat(0.845, (t) => {
    wordOut(t, W.renda, 0, 0.02);
    wordOut(t, W.quefica, 0.04, 0.02);
    lineIn(t, finalLines[0], 0.32);
    lineIn(t, finalLines[1], 0.44);
    fadeIn(t, finalCta, 0.62, 16);
  });

  /* ---------------------------------------------------------- vida */
  const tick = () => render(gsap.ticker.time);
  let ticking = false;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      inView = en.isIntersecting;
      if (inView && !ticking) { gsap.ticker.add(tick); ticking = true; }
      if (!inView && ticking) { gsap.ticker.remove(tick); ticking = false; }
      if (!inView) cards.forEach((c) => vid(c, false));
      else render();
    });
  }, { rootMargin: '10% 0px' });
  io.observe(section);

  // o CTA recebe foco pelo teclado: leva a rolagem até o fechamento
  ctaLink.addEventListener('focus', () => {
    const st = tl.scrollTrigger;
    if (tl.progress() < 0.86) window.scrollTo(0, st.start + (st.end - st.start) * 0.94);
  });

  let rq = 0;
  const relayout = () => {
    cancelAnimationFrame(rq);
    rq = requestAnimationFrame(() => { layout(); render(); });
  };
  window.addEventListener('resize', relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

  layout();
  render();
  syncBeats(storyU(), true);

  // gancho de depuração / verificação
  window.__oc = {
    tl, tlIn, tlOut, S, L, beats, render, layout,
    seek(p) {
      const st = tl.scrollTrigger;
      const si = tlIn.scrollTrigger;
      const y = p >= 0 ? st.start + (st.end - st.start) * p : si.start + (si.end - si.start) * (1 + p);
      window.scrollTo(0, y);
      ScrollTrigger.update();
      [tl, tlIn, tlOut].forEach((a) => {
        const tw = a.scrollTrigger && a.scrollTrigger.getTween && a.scrollTrigger.getTween();
        if (tw) tw.progress(1);
      });
      tlIn.progress(p >= 0 ? 1 : 1 + p);
      tl.progress(Math.max(0, p));
      syncBeats(p, true);
      render();
      return { y, u: storyU() };
    },
  };
})();
