/* ============================================================
   Hero B — Ignição
   Coreografia (a transformação acontece UMA vez)
   1. Entrada: o texto assenta, a pílula da frase abre como um núcleo
      de luz e os vídeos chegam do fundo, cinzas e parados, pousando em
      três profundidades ao redor do texto.
   2. Clímax: "vidas de verdade" acende — uma luz percorre as letras e
      elas ficam lima. A frase pisca, explode em luz e todos os cards
      ganham cor de uma vez. A frase fica acesa.
   3. Vida: cena calma. As profundidades derivam devagar; 4 clipes tocam
      e, de tempos em tempos, um cede a vez a outro com uma dissolução
      suave (sem flashes). Os demais ficam em cor, parados.
   4. Interação: passar o cursor por um card acende na hora — anel
      local, borda e faixa de luz, o vídeo toca. A cena inclina de leve
      na direção do cursor (paralaxe real entre as profundidades).
   5. Saída: ao rolar, as profundidades avançam e se abrem enquanto o
      texto sobe; a seção seguinte sobe por cima com a frase final.
   Desempenho: por quadro só transform/opacity; timers e Web Animations
   (compositor), sem rAF contínuo. No máximo 5 vídeos de card tocando
   (+ o da frase). Tudo pausa fora da tela ou com a aba oculta.
   ============================================================ */

(() => {
  const hero = document.getElementById('hb');
  if (!hero || !window.gsap) return;

  const root = document.documentElement;
  const mqWide = window.matchMedia('(min-width: 900px)');
  const mqRM = window.matchMedia('(prefers-reduced-motion: reduce)');
  // cruzou o limite de 900px ou mudou a preferência: recomeça no modo certo
  const reload = () => window.location.reload();
  mqWide.addEventListener ? mqWide.addEventListener('change', reload) : mqWide.addListener(reload);
  mqRM.addEventListener ? mqRM.addEventListener('change', reload) : mqRM.addListener(reload);
  if (!mqWide.matches) return; // < 900px: layout estático do CSS

  const RM = mqRM.matches;
  root.classList.add('hb-3d');
  if (RM) root.classList.add('hb-rm');

  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------- elementos ---------- */

  const stage = hero.querySelector('.hb-stage');
  const world = hero.querySelector('.hb-world');
  const orbits = Array.from(hero.querySelectorAll('.hb-orbit'));
  const waves = Array.from(hero.querySelectorAll('.hb-wave'));
  const copy = hero.querySelector('.hb-copy');
  const badge = copy.querySelector('.hero-badge');
  const lines = Array.from(copy.querySelectorAll('.title .line'));
  const sub = copy.querySelector('.sub');
  const actions = copy.querySelector('.actions');
  const nextStop = copy.querySelector('.next-stop');
  const pill = copy.querySelector('.title-clip');
  const pillVideo = pill.querySelector('video');
  const halo = pill.querySelector('.hb-halo');
  const core = pill.querySelector('.hb-core');
  // a frase que acende
  const vline = copy.querySelector('.hb-vline');
  const vtext = vline.querySelector('.hb-vtext');
  const lime = vline.querySelector('.hb-lime');
  const limeIn = lime.firstElementChild;
  const hot = vline.querySelector('.hb-hot');
  const edge = vline.querySelector('.hb-edge');
  const burst = copy.querySelector('.hb-burst');
  const streak = copy.querySelector('.hb-streak');

  /* profundidades: z (px), tamanho do card (em unidades de 100px numa
     tela 1440×900) e escurecimento */
  const ORB = [
    { z: -560, size: 0.95, dim: 0.3 },
    { z: -220, size: 1.3, dim: 0.18 },
    { z: 150, size: 1.85, dim: 0.06 },
  ];
  const ASPECT = 1.5;   // o anel da explosão é uma elipse 1.5× mais larga
  const S0 = 0.02;      // escala inicial do anel
  const SMAX = 2;       // o anel é desenhado com metade do raio final
  const PLAYING = 4;    // clipes em movimento depois da transformação
  const MAX_LIT = 5;    // teto absoluto (com o hover)

  const tiles = Array.from(hero.querySelectorAll('.hb-tile')).map((el) => ({
    el,
    o: +el.dataset.o || 0,
    fx: +el.dataset.x || 0,
    fy: +el.dataset.y || 0,
    r: +el.dataset.r || 1,
    s: +el.dataset.s || 1,
    video: el.querySelector('video'),
    sweep: el.querySelector('.hb-sweep'),
    rim: el.querySelector('.hb-rim'),
    ping: el.querySelector('.hb-ping'),
    lit: false,     // em cor e em movimento
    inSet: false,   // faz parte dos 4 que tocam (fora o hover)
    since: 0,
    stopT: 0,
  }));

  // cada profundidade ganha um "rotor" interno: ele gira devagar (Web
  // Animations, no compositor) enquanto o contêiner fica livre para a saída
  const spins = orbits.map((o) => {
    const s = document.createElement('div');
    s.className = 'hb-spin';
    o.appendChild(s);
    return s;
  });
  tiles.forEach((t) => spins[t.o].appendChild(t.el));
  const SPIN = [
    { deg: 1.4, dur: 29000 },
    { deg: -1.1, dur: 35000 },
    { deg: 0.8, dur: 41000 },
  ];
  let spinAnims = [];

  const playV = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const playingCount = () => tiles.filter((t) => !t.video.paused).length;

  /* ---------- a curva do anel: progresso → tempo ---------- */

  const bez = (t, a, b) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
  const BLAST = (() => {
    const c = [0.12, 0.78, 0.24, 1];
    const pts = [];
    for (let i = 0; i <= 200; i++) { const s = i / 200; pts.push([bez(s, c[0], c[2]), bez(s, c[1], c[3])]); }
    return {
      css: `cubic-bezier(${c.join(',')})`,
      timeAt(p) {
        if (p <= 0) return 0;
        if (p >= 1) return 1;
        for (let i = 1; i < pts.length; i++) {
          if (pts[i][1] >= p) {
            const [x0, y0] = pts[i - 1];
            const [x1, y1] = pts[i];
            return x0 + (x1 - x0) * ((p - y0) / (y1 - y0 || 1));
          }
        }
        return 1;
      },
    };
  })();

  /* ---------- geometria ---------- */

  const G = { vw: 0, vh: 0, u: 100, cx: 0, cy: 0, lx: 0, ly: 0, P: 1300, R: 1000 };

  function layout() {
    const vw = hero.clientWidth;
    const vh = hero.clientHeight;
    const u = 100 * Math.min(vw / 1440, vh / 900);

    // mede o texto sem os deslocamentos da saída
    const saved = copy.style.transform;
    copy.style.transform = 'none';
    const hr = hero.getBoundingClientRect();
    const rel = (el) => {
      const r = el.getBoundingClientRect();
      return { l: r.left - hr.left, t: r.top - hr.top, r: r.right - hr.left, b: r.bottom - hr.top };
    };
    const keep = [badge, ...lines, sub, actions, nextStop].map(rel);
    const lr = rel(vtext);
    const cr = rel(copy);
    copy.style.transform = saved;

    const box = keep.reduce((a, k) => ({ l: Math.min(a.l, k.l), t: Math.min(a.t, k.t), r: Math.max(a.r, k.r), b: Math.max(a.b, k.b) }), { l: 1e9, t: 1e9, r: -1e9, b: -1e9 });
    const cx = vw / 2;
    const cy = (box.t + box.b) / 2;
    const lx = (lr.l + lr.r) / 2;
    const ly = (lr.t + lr.b) / 2;
    const P = Math.max(1100, vw * 0.9);
    Object.assign(G, { vw, vh, u, cx, cy, lx, ly, P });

    hero.style.setProperty('--hb-p', P.toFixed(0) + 'px');
    hero.style.setProperty('--hb-ox', cx.toFixed(1) + 'px');
    hero.style.setProperty('--hb-oy', cy.toFixed(1) + 'px');

    // a frase: largura da cortina e o caminho da luz que a percorre
    const em = parseFloat(getComputedStyle(vline).fontSize) || 60;
    const textW = lr.r - lr.l;
    G.limeW = lime.offsetWidth;
    G.e0 = -1.8 * em - 0.45 * em;
    G.e1 = textW + 0.5 * em - 0.45 * em;
    // a explosão: centrada na frase, em coordenadas do bloco de texto
    const bw = Math.max(textW * 1.9, 640 * (u / 100));
    const bh = bw * 0.46;
    const kw = vw * 1.3;
    const kh = Math.max(16, em * 0.36);
    hero.style.setProperty('--hb-bw', bw.toFixed(0) + 'px');
    hero.style.setProperty('--hb-bh', bh.toFixed(0) + 'px');
    hero.style.setProperty('--hb-kw', kw.toFixed(0) + 'px');
    hero.style.setProperty('--hb-kh', kh.toFixed(0) + 'px');
    G.burstT = `translate(${(lx - cr.l - bw / 2).toFixed(1)}px, ${(ly - cr.t - bh / 2).toFixed(1)}px)`;
    G.streakT = `translate(${(lx - cr.l - kw / 2).toFixed(1)}px, ${(ly - cr.t - kh / 2).toFixed(1)}px)`;

    const m = 22 + 18 * (u / 100);   // folga mínima entre card e texto
    const navLine = 118;              // nada sob o menu fixo
    const side = vw * 0.035;          // nada encostado nas laterais
    const floor = vh * 0.93;          // nada cortado embaixo
    const hits = (sx, sy, w, h) => keep.some((k) => sx + w / 2 > k.l - m && sx - w / 2 < k.r + m && sy + h / 2 > k.t - m && sy - h / 2 < k.b + m);

    // a composição é desenhada num quadro 16:10; em telas mais largas
    // ela não se espalha para as bordas (mantém as distâncias do texto)
    const spanX = Math.min(vw / 2, (vh / 2) * 1.6);
    let far = 0;
    tiles.forEach((t) => {
      const O = ORB[t.o];
      const base = O.size * t.s * u * 1.12;
      const w = base * Math.sqrt(t.r);
      const h = base / Math.sqrt(t.r);
      // posição desenhada: fração da meia largura/altura a partir do texto
      let sx = cx + t.fx * spanX;
      let sy = cy + t.fy * (vh / 2);
      // empurra para fora, a partir do centro do texto, até liberar o texto
      let dx = sx - cx;
      let dy = sy - cy;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      for (let k = 0; k < 200 && hits(sx, sy, w, h); k++) { sx += dx * 4; sy += dy * 4; }
      // cards sempre inteiros dentro da dobra
      sx = Math.min(vw - side - w / 2, Math.max(side + w / 2, sx));
      sy = Math.min(floor - h / 2, Math.max(navLine + h / 2, sy));

      // da posição na tela para o espaço 3D (perspectiva no centro do texto)
      const f = P / (P - O.z);
      const W3 = w / f;
      const H3 = h / f;
      const X = cx + (sx - cx) / f;
      const Y = cy + (sy - cy) / f;
      t.el.style.setProperty('--w', W3.toFixed(1) + 'px');
      t.el.style.setProperty('--h', H3.toFixed(1) + 'px');
      t.el.style.setProperty('--hb-dim', O.dim);
      t.el.style.setProperty('--hb-sw', (Math.hypot(W3, H3) * 1.3).toFixed(0) + 'px');
      gsap.set(t.el, { x: X - W3 / 2, y: Y - H3 / 2, z: O.z });

      Object.assign(t, { sx, sy, w, h, W3, H3, size: Math.min(w, h) });
      // distância elíptica até a frase (borda mais próxima) e a direção
      // de onde a luz chega
      t.distL = Math.max(0, Math.hypot(sx - lx, (sy - ly) * ASPECT) - 0.32 * t.size);
      t.dir = Math.atan2(sy - ly, sx - lx);
      t.side = sx < cx ? 0 : 1;
      far = Math.max(far, t.distL + t.size);
    });

    // o anel da explosão: elipse desenhada com metade do raio final
    G.R = far * 1.12;
    hero.style.setProperty('--hb-ww', G.R.toFixed(0) + 'px');
    hero.style.setProperty('--hb-wh', (G.R / ASPECT).toFixed(0) + 'px');

    // o hero é sticky: guardamos onde ele fica para ler o cursor sem
    // forçar layout a cada movimento
    G.scTop = hero.parentElement.offsetTop;
    G.scH = hero.parentElement.offsetHeight;

    // deriva: cada profundidade gira devagar em torno do centro, em
    // sentidos alternados (3 animações no compositor para a cena inteira)
    if (!RM && !spinAnims.length) {
      spinAnims = spins.map((el, i) => el.animate(
        [{ transform: `rotate(${-SPIN[i].deg}deg)` }, { transform: `rotate(${SPIN[i].deg}deg)` }],
        { duration: SPIN[i].dur, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out', delay: -SPIN[i].dur * (0.3 + 0.2 * i) }
      ));
      if (!active) spinAnims.forEach((a) => a.pause());
    }
  }
  // posição do topo do hero (sticky) na tela, só a partir do scrollY
  const heroTop = () => {
    const y = window.scrollY;
    if (y < G.scTop) return G.scTop - y;
    return Math.min(0, G.scTop + G.scH - G.vh - y);
  };

  /* ---------- estados dos cards ----------
     antes do clímax: cinza (foto pré-tratada) · depois: todos em cor
     (classe hb-still); os que tocam ganham hb-lit e a capa colorida
     dissolve sobre o vídeo */

  let active = !RM;
  let started = false;   // a transformação já aconteceu
  let hovered = null;
  let timers = [];
  const later = (ms, fn) => { const id = setTimeout(() => { timers = timers.filter((x) => x !== id); fn(); }, ms); timers.push(id); return id; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  function sweep(t, strength, dur, dir = t.dir) {
    const d = (Math.abs(t.W3 * Math.cos(dir)) + Math.abs(t.H3 * Math.sin(dir))) / 2 + Math.hypot(t.W3, t.H3) * 0.22;
    const deg = (dir * 180) / Math.PI;
    t.sweep.animate(
      [{ transform: `rotate(${deg}deg) translateX(${-d}px)`, opacity: 0 },
       { opacity: strength, offset: 0.22 },
       { opacity: strength * 0.85, offset: 0.62 },
       { transform: `rotate(${deg}deg) translateX(${d}px)`, opacity: 0 }],
      { duration: dur, easing: 'cubic-bezier(0.32, 0.1, 0.2, 1)' }
    );
  }
  function rimFlash(t, strength, dur) {
    t.rim.animate(
      [{ opacity: 0 }, { opacity: strength, offset: 0.18 }, { opacity: 0 }],
      { duration: dur, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' }
    );
  }

  // começa a tocar do primeiro quadro (= a capa), então a dissolução é limpa
  function play(t) {
    if (t.lit) return;
    t.lit = true;
    t.since = Date.now();
    clearTimeout(t.stopT);
    t.el.classList.add('hb-still', 'hb-lit');
    if (t.video.paused) { try { t.video.currentTime = 0; } catch (e) { /* ainda sem metadados */ } }
    if (active) playV(t.video);
    // teto: o mais antigo fora do hover descansa
    const lit = tiles.filter((x) => x.lit);
    if (lit.length > MAX_LIT) {
      const old = lit.filter((x) => x !== hovered && x !== t).sort((a, b) => a.since - b.since)[0];
      if (old) { old.inSet = false; rest(old); }
    }
  }
  // a capa colorida volta por cima e o vídeo para depois da dissolução
  function rest(t) {
    if (!t.lit) return;
    t.lit = false;
    t.el.classList.remove('hb-lit');
    clearTimeout(t.stopT);
    if (playingCount() > MAX_LIT) t.video.pause();
    else t.stopT = setTimeout(() => { if (!t.lit) t.video.pause(); }, 1350);
  }
  // acender com luz: usado no clímax e no hover
  function ignite(t, dir) {
    if (t.lit) return;
    play(t);
    sweep(t, 1, 950, dir);
    rimFlash(t, 1, 1500);
  }

  /* ---------- o clímax: "vidas de verdade" acende e explode ---------- */

  function energize() {
    // a luz percorre as letras; atrás dela o texto fica lima
    const dur = 1300;
    const ease = 'cubic-bezier(0.62, 0, 0.28, 1)';
    lime.style.opacity = '1';
    lime.animate([{ transform: `translateX(${-G.limeW}px)` }, { transform: 'translateX(0px)' }], { duration: dur, easing: ease });
    limeIn.animate([{ transform: `translateX(${G.limeW}px)` }, { transform: 'translateX(0px)' }], { duration: dur, easing: ease });
    edge.animate(
      [{ transform: `translateX(${G.e0}px)`, opacity: 0 },
       { opacity: 1, offset: 0.12 },
       { opacity: 1, offset: 0.86 },
       { transform: `translateX(${G.e1}px)`, opacity: 0 }],
      { duration: dur, easing: ease }
    );
    setTimeout(flash, dur - 70);
  }

  function flash() {
    started = true;
    // a frase pisca quase branca e cresce um instante (uma única vez)
    hot.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0 }], { duration: 1400, easing: 'cubic-bezier(0.2, 0, 0.3, 1)' });
    vline.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.035)', offset: 0.16 }, { transform: 'scale(1)' }], { duration: 1300, easing: 'cubic-bezier(0.2, 0, 0.2, 1)' });
    // explosão de luz a partir da frase + risco horizontal
    burst.animate(
      [{ opacity: 0, transform: `${G.burstT} scale(0.4)` },
       { opacity: 1, offset: 0.13 },
       { opacity: 0, transform: `${G.burstT} scale(1.55)` }],
      { duration: 1900, easing: 'cubic-bezier(0.15, 0.6, 0.25, 1)' }
    );
    streak.animate(
      [{ opacity: 0, transform: `${G.streakT} scaleX(0.12)` },
       { opacity: 1, offset: 0.12 },
       { opacity: 0, transform: `${G.streakT} scaleX(1.2)` }],
      { duration: 1250, easing: 'cubic-bezier(0.1, 0.7, 0.2, 1)' }
    );
    halo.animate(
      [{ opacity: 0.32, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(1.3)', offset: 0.34 }, { opacity: 0.32, transform: 'scale(1)' }],
      { duration: 1700, easing: 'cubic-bezier(0.3, 0, 0.2, 1)' }
    );

    // o anel rápido que sai da frase e transforma todos os cards
    const dur = 2300;
    const cyOff = +gsap.getProperty(copy, 'y') || 0;
    const bx = G.lx - G.R / 2;
    const by = G.ly + cyOff - G.R / ASPECT / 2;
    const tr = (s) => `translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, 0) scale(${s})`;
    waves.forEach((w, i) => {
      const delay = i * 180;
      const k = i ? 0.5 : 1;
      w.animate([{ transform: tr(S0) }, { transform: tr(SMAX) }], { duration: dur, delay, easing: BLAST.css });
      w.animate([{ opacity: 0 }, { opacity: k, offset: 0.06 }, { opacity: k * 0.78, offset: 0.5 }, { opacity: 0 }], { duration: dur, delay, easing: 'linear' });
    });

    const chosen = pickSet();
    tiles.forEach((t) => {
      const s = Math.min(SMAX, (2 * t.distL) / G.R);
      setTimeout(() => {
        if (chosen.includes(t)) { t.inSet = true; ignite(t); return; }
        if (t.lit) return;
        t.el.classList.add('hb-still');
        sweep(t, 1, 950);
        rimFlash(t, 0.9, 1400);
      }, BLAST.timeAt((s - S0) / (SMAX - S0)) * dur);
    });
    later(6500, rotate);
  }

  // os 4 que tocam: dois de cada lado, profundidades variadas
  function pickSet() {
    const pool = tiles.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const out = [];
    const bySide = [0, 0];
    const byOrb = [0, 0, 0];
    for (const t of pool) {
      if (out.length >= PLAYING) break;
      if (bySide[t.side] >= PLAYING / 2 || byOrb[t.o] >= 2) continue;
      out.push(t); bySide[t.side]++; byOrb[t.o]++;
    }
    return out;
  }

  /* ---------- vida depois do clímax: um clipe cede a vez a outro ---------- */

  let lastOut = null;
  function rotate() {
    if (!active) return;
    later(5600 + Math.random() * 2600, rotate);
    if (hovered || exitP > 0.12) return;
    const set = tiles.filter((t) => t.inSet && t.lit);
    if (!set.length) return;
    const out = set.sort((a, b) => a.since - b.since)[0];
    // entra um parado do mesmo lado (mantém o equilíbrio), o mais antigo
    const pool = tiles.filter((t) => !t.lit && t !== lastOut && t !== hovered && t.side === out.side);
    if (!pool.length) return;
    const next = pool.sort((a, b) => a.since - b.since)[0];
    out.inSet = false;
    rest(out);
    lastOut = out;
    later(700, () => { next.inSet = true; play(next); });
  }

  /* ---------- ligar / pausar ---------- */

  let inView = true;
  let exitP = 0;

  function setActive() {
    const a = !RM && inView && !document.hidden && exitP < 0.92;
    if (a === active) return;
    active = a;
    hero.classList.toggle('hb-paused', !a);
    if (a) {
      playV(pillVideo);
      tiles.forEach((t) => { if (t.lit) playV(t.video); });
      spinAnims.forEach((s) => s.play());
      if (started) later(4000, rotate);
    } else {
      clearTimers();
      pillVideo.pause();
      tiles.forEach((t) => t.video.pause());
      spinAnims.forEach((s) => s.pause());
    }
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      inView = entries[entries.length - 1].isIntersecting;
      setActive();
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', setActive);

  /* ---------- cursor: inclina, acende ---------- */

  const rotY = gsap.quickTo(world, 'rotationY', { duration: 1.6, ease: 'power3.out' });
  const rotX = gsap.quickTo(world, 'rotationX', { duration: 1.6, ease: 'power3.out' });
  let mx = -1e4;
  let my = -1e4;
  let moveRaf = 0;
  function onMove() {
    moveRaf = 0;
    const y = my - heroTop();
    // inclinação pequena: dá profundidade sem achatar nenhum card
    rotY(((mx - G.cx) / G.vw) * 3);
    rotX((-(y - G.cy) / G.vh) * 2);
  }
  if (!RM) {
    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      mx = e.clientX; my = e.clientY;
      if (!moveRaf) moveRaf = requestAnimationFrame(onMove);
    });
    hero.addEventListener('pointerleave', () => { rotY(0); rotX(0); });

    tiles.forEach((t) => {
      t.el.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch' || !started) return;
        hovered = t;
        clearTimeout(t.leaveT);
        t.el.classList.add('hb-hover');
        t.ping.animate(
          [{ opacity: 0.9, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.22)' }],
          { duration: 1000, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
        );
        ignite(t);
      });
      t.el.addEventListener('pointerleave', () => {
        if (hovered === t) hovered = null;
        t.el.classList.remove('hb-hover');
        if (!t.inSet) t.leaveT = setTimeout(() => { if (hovered !== t && !t.inSet) rest(t); }, 650);
      });
    });
  }

  /* ---------- entrada ---------- */

  layout();

  if (RM) {
    pillVideo.removeAttribute('autoplay');
    pillVideo.pause();
    lime.style.opacity = '1';
  } else {
    const order = tiles.slice().sort((a, b) => a.distL - b.distL).map((t) => t.el);
    const tl = gsap.timeline({ delay: 0.12 });
    tl.from(hero.querySelector('.rich-bg'), { opacity: 0, duration: 2, ease: 'sine.out' }, 0)
      .from(badge, { y: 18, opacity: 0, duration: 1.3, ease: 'expo.out' }, 0.15)
      .from(lines, { y: 36, opacity: 0, duration: 1.5, ease: 'expo.out', stagger: 0.1 }, 0.22)
      .fromTo(pill, { scale: 0.18 }, { scale: 1, duration: 1.4, ease: 'expo.out' }, 0.66)
      .fromTo(core, { opacity: 1 }, { opacity: 0, duration: 1, ease: 'power2.inOut' }, 1.1)
      .fromTo(halo, { opacity: 0, scale: 0.5 }, { opacity: 0.32, scale: 1, duration: 1.8, ease: 'expo.out' }, 0.72)
      .from([sub, actions, nextStop], { y: 16, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: 0.08 }, 0.55)
      .from(order, { z: '-=1500', opacity: 0, duration: 2.1, ease: 'expo.out', stagger: 0.07 }, 0.75)
      // o clímax: a frase acende e transforma tudo — uma vez
      .add(energize, 2.5);
  }

  /* ---------- saída pela rolagem ---------- */

  if (!RM && window.ScrollTrigger) {
    const scroller = hero.parentElement;
    gsap.timeline({
      scrollTrigger: {
        trigger: scroller,
        start: 'top top',
        end: () => '+=' + Math.round(window.innerHeight * 0.7),
        scrub: 0.7,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          exitP = self.progress;
          hero.classList.toggle('hb-exiting', exitP > 0.16);
          setActive();
        },
      },
    })
      .to(copy, { y: () => -window.innerHeight * 0.14, ease: 'power2.in', duration: 1 }, 0)
      .to(copy, { opacity: 0, ease: 'power1.in', duration: 0.62 }, 0)
      .fromTo(hero.querySelector('.rich-bg'), { opacity: 1 }, { opacity: 0.5, ease: 'none', duration: 1, immediateRender: false }, 0)
      .to(orbits[2], { z: 520, rotationZ: -7, ease: 'power2.in', duration: 1 }, 0)
      .to(orbits[1], { z: 660, rotationZ: 5, ease: 'power2.in', duration: 1 }, 0)
      .to(orbits[0], { z: 780, rotationZ: -3, ease: 'power2.in', duration: 1 }, 0)
      .to(stage, { opacity: 0, ease: 'power1.in', duration: 0.42 }, 0.58);
  }

  /* ---------- redimensionar ---------- */

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      layout();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }, 180);
  });

  // ganchos para a verificação (sem efeito no uso normal)
  window.__hb = {
    tiles,
    G,
    playing: () => tiles.filter((t) => !t.video.paused).length,
    colour: () => tiles.filter((t) => t.el.classList.contains('hb-still')).length,
  };
})();
