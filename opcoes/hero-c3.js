/* ============================================================
   Opção C3 — Arquibancada
   Fileiras de cards em arcos suaves ao redor e abaixo do título: a
   arena vista do palco. O fundo (alto) tem cards menores, a frente
   (baixo) maiores; cada fileira fica meio passo deslocada da
   vizinha, então nenhum topo se alinha. Tudo começa cinza e parado.
   A carga passa como uma "ola" da esquerda para a direita, uma única
   vez: cada card levanta, acende a borda, ganha cor e volta a sentar;
   o selo conta até +2.000 e "vidas de verdade" acende junto com a
   onda. Depois a cena fica calma: no máximo 4 clipes tocando, em
   rodízio; o cursor levanta e toca o card que ele toca; as fileiras
   seguem o cursor com profundidade.

   Desempenho: a arena é montada uma vez; na onda, só transform e
   opacity (GSAP promove cada card enquanto ele se move); em repouso
   nenhuma animação contínua além do fundo do site e dos vídeos.
   ============================================================ */

(() => {
  'use strict';

  const root = document.documentElement;
  const hero = document.querySelector('.hc3-hero');
  if (!hero) return;
  if (!window.gsap) { root.classList.add('hc3-go'); return; }
  const hasST = typeof window.ScrollTrigger !== 'undefined';
  if (hasST) gsap.registerPlugin(ScrollTrigger);

  /* ---------- conteúdo e ajustes ---------- */

  const BASE = '../assets/video/';
  const CLIPS = [
    'cards/gen-reuniao', 'past/arena-audience', 'cards/sel-jardim', 'cards/gen-podcast',
    'cards/sel-carro', 'past/stage-speaker', 'cards/gen-executiva2', 'cards/sel-musgo2',
    'past/crowd-hands', 'cards/sel-escritorio', 'cards/gen-kart', 'cards/sel-estudio',
    'past/expo-crowd', 'cards/sel-musgo1', 'cards/gen-walk', 'past/car-reveal',
    'cards/sel-suv', 'cards/gen-executiva1', 'past/arena-persistencia'
  ];
  const RATIO = 1.22;     // cada fileira à frente é 22% maior
  const ASPECT = 0.8;     // largura/altura do card (4:5), sempre igual
  const BEND = 0.22;      // quanto do giro do arco o card acompanha
  const WAVE_AT = 1.5;    // s: início da ola
  const WAVE_DUR = 2.9;   // s: tempo para atravessar a arena
  const MAX_AUTO = 4;     // vídeos em rodízio (+1 pelo cursor)
  const TICK = 360;
  const AGE = 10000;

  const q = (s) => hero.querySelector(s);
  const qa = (s) => Array.from(hero.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const el = {
    stands: q('.hc3-stands'),
    copy: q('.hero-copy'),
    count: q('.hc3-count'),
    lit: q('.hc3-lit'),
    litIn: q('.hc3-lit-in'),
    litEdge: q('.hc3-lit-edge'),
    curtain: q('.hc3-curtain'),
    bg: q('.rich-bg'),
    headClip: q('.title-clip video')
  };

  const st = {
    W: 0, H: 0, rows: [], seats: [], copy: null,
    ready: false, waved: false, visible: true, running: false, exit: 0
  };
  const playing = new Set();
  let hoverSeat = null;
  let timer = 0;
  let waveTl = null;

  /* ---------- medidas ---------- */

  function offsetIn(node) {
    let x = 0;
    let y = 0;
    while (node && node !== hero) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent; }
    return { x, y };
  }

  // caixas do texto (sem transforms) — a arena nunca invade nenhuma
  function copyBoxes() {
    const items = [q('.hero-badge'), ...qa('.title .line'), q('.sub'), q('.actions'), q('.next-stop')];
    return items.map((n) => {
      const o = offsetIn(n);
      return { l: o.x, r: o.x + n.offsetWidth, t: o.y, b: o.y + n.offsetHeight };
    });
  }

  /* ---------- a arena ---------- */

  function plan() {
    const W = hero.clientWidth;
    const H = hero.clientHeight;
    const boxes = copyBoxes();
    const cp = boxes.reduce((a, b) => ({ l: Math.min(a.l, b.l), r: Math.max(a.r, b.r), t: Math.min(a.t, b.t), b: Math.max(a.b, b.b) }));
    hero.style.setProperty('--hc3-copy-w', Math.round(cp.r - cp.l) + 'px');
    hero.style.setProperty('--hc3-copy-h', Math.round(cp.b - cp.t) + 'px');
    hero.style.setProperty('--hc3-copy-cy', Math.round((cp.t + cp.b) / 2) + 'px');

    const h0 = clamp(H * 0.125, 96, 176);       // fileira que abraça o texto
    const rise = H * 0.24;                       // quanto os arcos sobem nas laterais
    const k = rise / ((W / 2) * (W / 2));
    // folga vertical com margem para a inclinação nas pontas (sem sobreposição)
    const slopeEdge = 2 * rise / (W / 2);
    const gapY = (h) => h * (0.12 + 0.2 * slopeEdge);

    // fileira 0 logo abaixo do texto; para baixo crescem, para cima diminuem
    const rows = [{ r: 0, h: h0, Y: cp.b + 34 + h0 / 2 }];
    for (let r = 1; r <= 6; r++) {
      const p = rows[rows.length - 1];
      const h = p.h * RATIO;
      const Y = p.Y + (p.h + h) / 2 + gapY(h);
      if (Y - k * (W / 2) * (W / 2) - h / 2 > H - h * 0.35) break; // nem as pontas aparecem
      rows.push({ r, h, Y });
    }
    for (let r = -1; r >= -3; r--) {
      const p = rows[0];
      const h = p.h / RATIO;
      const Y = p.Y - (p.h + h) / 2 - gapY(p.h);
      rows.unshift({ r, h, Y });
    }

    const pad = { x: 30, y: 22 };
    const hits = (l, t, r, b) => boxes.some((bx) => r > bx.l - pad.x && l < bx.r + pad.x && b > bx.t - pad.y && t < bx.b + pad.y);
    let n = 0;
    rows.forEach((row, ri) => {
      const w = row.h * ASPECT;
      const step = w * 1.2;
      row.w = w;
      row.seats = [];
      const xs = [];
      const start = ri % 2 === 0 ? 0 : step / 2;
      // passos iguais ao longo do arco, do centro para as pontas
      for (const sgn of [1, -1]) {
        let x = sgn > 0 ? start : (start === 0 ? -step : -start);
        while (Math.abs(x) < W / 2 + w) {
          xs.push(x);
          const slope = 2 * k * Math.abs(x);
          x += sgn * step / Math.sqrt(1 + slope * slope * 0.55);
        }
      }
      xs.sort((a, b) => a - b).forEach((x) => {
        const cx = W / 2 + x;
        const cy = row.Y - k * x * x;
        const l = cx - w / 2;
        const r = cx + w / 2;
        const t = cy - row.h / 2;
        const b = cy + row.h / 2;
        if (r < -w * 0.35 || l > W + w * 0.35) return;     // fora pelas laterais
        if (t < 92) return;                                 // sob o menu
        if (t > H - row.h * 0.35) return;                   // quase todo abaixo da dobra
        if (hits(l, t, r, b)) return;                       // nunca sobre o texto
        const angle = Math.atan(-2 * k * x) * BEND * (180 / Math.PI);
        row.seats.push({ cx, cy, w, h: row.h, angle, r: row.r, x, clip: CLIPS[(n * 7 + (ri * 5)) % CLIPS.length] });
        n++;
      });
    });
    return { W, H, rows: rows.filter((r) => r.seats.length), copy: cp };
  }

  function setVideoFlags(v) {
    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('muted', '');
    v.setAttribute('loop', '');
    v.setAttribute('playsinline', '');
    v.preload = 'metadata';
  }

  function clearStands() {
    playing.forEach((s) => s.v.pause());
    playing.clear();
    st.seats.forEach((s) => { if (s.v.getAttribute('src')) { s.v.removeAttribute('src'); s.v.load(); } });
    el.stands.textContent = '';
    st.rows = [];
    st.seats = [];
    hoverSeat = null;
  }

  function build(lit) {
    clearStands();
    const p = plan();
    st.W = p.W;
    st.H = p.H;
    st.copy = p.copy;
    const frag = document.createDocumentFragment();
    p.rows.forEach((row) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'hc3-row';
      const rowI = document.createElement('div');
      rowI.className = 'hc3-rowi';
      const rowP = document.createElement('div');
      rowP.className = 'hc3-rowp';
      rowI.append(rowP);
      rowEl.append(rowI);
      row.el = rowEl;   // rolagem
      row.elI = rowI;   // entrada
      row.elP = rowP;   // cursor
      row.seats.forEach((s) => {
        const seat = document.createElement('div');
        seat.className = 'hc3-seat';
        seat.style.cssText = `left:${(s.cx - s.w / 2).toFixed(1)}px;top:${(s.cy - s.h / 2).toFixed(1)}px;width:${s.w.toFixed(1)}px;height:${s.h.toFixed(1)}px;transform:rotate(${s.angle.toFixed(2)}deg)`;
        const card = document.createElement('div');
        card.className = 'hc3-card';
        const poster = BASE + s.clip + '.jpg';
        const img = document.createElement('img');
        img.className = 'hc3-g';
        img.alt = '';
        img.decoding = 'async';
        img.src = poster;
        const v = document.createElement('video');
        v.className = 'hc3-v';
        setVideoFlags(v);
        v.poster = poster;
        v.dataset.src = BASE + s.clip + '.mp4';
        const sweep = document.createElement('i');
        sweep.className = 'hc3-sweep';
        const flash = document.createElement('i');
        flash.className = 'hc3-flash';
        const live = document.createElement('i');
        live.className = 'hc3-live';
        card.append(img, v, sweep, live, flash);
        seat.append(card);
        rowP.append(seat);
        Object.assign(s, { el: seat, card, v, sweep, flash, lit: !!lit, row });
        seat._s = s;
        st.seats.push(s);
      });
      frag.append(rowEl);
    });
    el.stands.append(frag);
    st.rows = p.rows;
  }

  /* ---------- a ola ---------- */

  function waveTime(s) {
    // da esquerda para a direita; o fundo da arena um pouco depois
    return WAVE_AT + WAVE_DUR * clamp(s.cx / st.W, 0, 1) + (s.r + 4) * 0.045;
  }

  function buildWave() {
    const tl = gsap.timeline({ paused: true });
    st.seats.forEach((s) => {
      const t = waveTime(s);
      const lift = -s.h * 0.15;
      tl.to(s.card, { y: lift, scale: 1.06, duration: 0.36, ease: 'power2.out', force3D: true }, t)
        .to(s.card, { y: 0, scale: 1, duration: 1.0, ease: 'power3.inOut', force3D: true, clearProps: 'transform' }, t + 0.36)
        .to(s.v, { opacity: 1, duration: 0.55, ease: 'sine.out', onStart: () => { s.lit = true; s.litAt = performance.now(); } }, t + 0.1)
        .fromTo(s.flash, { opacity: 0 }, { opacity: 1, duration: 0.18, ease: 'sine.out' }, t + 0.04)
        .to(s.flash, { opacity: 0, duration: 0.9, ease: 'sine.inOut' }, t + 0.26)
        .fromTo(s.sweep, { yPercent: 0, opacity: 1 }, { yPercent: -290, duration: 0.75, ease: 'power2.inOut' }, t + 0.06)
        .set(s.sweep, { opacity: 0 }, t + 0.82);
    });

    // o selo conta as vidas enquanto a onda passa
    const b = el.count;
    const fmt = (v) => '+' + Math.round(v).toLocaleString('pt-BR');
    const counter = { v: 0 };
    tl.call(() => { b.style.width = b._w + 'px'; }, null, WAVE_AT - 0.05)
      .fromTo(counter, { v: 0 }, {
        v: 2000,
        duration: WAVE_DUR + 0.4,
        ease: 'power1.inOut',
        onUpdate: () => { const s = fmt(counter.v); if (b.textContent !== s) b.textContent = s; }
      }, WAVE_AT)
      .call(() => { b.textContent = '+2.000'; b.style.width = ''; });

    // "vidas de verdade" acende da esquerda para a direita, junto com a onda
    if (el.lit) {
      const o = offsetIn(el.lit.parentNode);
      const L = o.x;
      const Wl = el.lit.parentNode.offsetWidth;
      const t0 = WAVE_AT + WAVE_DUR * (L / st.W) + 0.2;
      const d = WAVE_DUR * (Wl / st.W);
      tl.fromTo(el.lit, { xPercent: -100 }, { xPercent: 0, duration: d, ease: 'none' }, t0)
        .fromTo(el.litIn, { xPercent: 100 }, { xPercent: 0, duration: d, ease: 'none' }, t0)
        .fromTo(el.litEdge, { opacity: 0 }, { opacity: 1, duration: 0.25 }, t0)
        .to(el.litEdge, { opacity: 0, duration: 0.5 }, t0 + d - 0.1);
    }
    tl.call(() => { st.waved = true; tick(); });
    return tl;
  }

  /* ---------- quem toca: rodízio calmo, espalhado pela arena ---------- */

  function energize(s, on) {
    if (on) {
      if (!s.v.getAttribute('src')) s.v.src = s.v.dataset.src;
      const p = s.v.play();
      if (p && p.catch) p.catch(() => {});
      s.card.classList.add('is-live');
      s.since = performance.now();
      playing.add(s);
    } else {
      s.v.pause();
      s.card.classList.remove('is-live');
      s.stop = performance.now();
      playing.delete(s);
    }
  }

  function tick() {
    if (!st.ready || !st.running) return;
    const now = performance.now();
    const H = st.H;
    const sectors = 6;
    const cands = [];
    st.seats.forEach((s) => {
      if (!s.lit) return;
      const t = s.cy - s.h / 2;
      const b = s.cy + s.h / 2;
      if (t < 96 || b > H * 0.98) return;               // inteiro na tela
      let score = 1 + s.h / H;                          // os da frente aparecem mais
      if (playing.has(s)) score += now - s.since > AGE ? -2 : 0.6;
      if (!playing.has(s) && s.stop && now - s.stop < 14000) score -= 0.8;
      if (!st.waved) score += 2 - (now - (s.litAt || now)) / 1000; // logo atrás da onda
      cands.push({ s, score, sec: Math.floor(clamp(s.cx / st.W, 0, 0.999) * sectors) });
    });
    cands.sort((a, b) => b.score - a.score);

    const cap = MAX_AUTO + (hoverSeat ? 1 : 0);
    const chosen = new Set();
    const used = new Set();
    if (hoverSeat) chosen.add(hoverSeat);
    for (const c of cands) {
      if (chosen.size >= cap) break;
      if (used.has(c.sec) || chosen.has(c.s)) continue;
      chosen.add(c.s);
      used.add(c.sec);
    }
    let starts = [...chosen].filter((s) => !playing.has(s)).slice(0, st.waved ? 1 : 2);
    const spare = [...playing].filter((s) => !chosen.has(s));
    while (playing.size + starts.length > cap && spare.length) energize(spare.shift(), false);
    starts = starts.slice(0, Math.max(0, cap - playing.size));
    starts.forEach((s) => energize(s, true));
  }

  function startTicker() { if (!timer) timer = setInterval(tick, TICK); }
  function stopTicker() { clearInterval(timer); timer = 0; }

  /* ---------- cursor: levanta e toca; as fileiras seguem com profundidade ---------- */

  let movers = [];
  function setHover(s) {
    if (s === hoverSeat) return;
    if (hoverSeat) hoverSeat.card.classList.remove('is-hv');
    hoverSeat = s && s.lit ? s : null;
    if (hoverSeat) hoverSeat.card.classList.add('is-hv');
    tick();
  }
  function onOver(e) {
    const seat = e.target && e.target.closest ? e.target.closest('.hc3-seat') : null;
    setHover(seat ? seat._s : null);
  }
  function onMove(e) {
    const px = e.clientX / st.W - 0.5;
    const py = e.clientY / st.H - 0.5;
    movers.forEach((m) => { m.x(-px * m.d * 22); m.y(-py * m.d * 12); });
  }
  function onLeave() {
    setHover(null);
    movers.forEach((m) => { m.x(0); m.y(0); });
  }

  /* ---------- liga/desliga ---------- */

  function syncHeadClip() {
    if (!el.headClip) return;
    const want = st.running && st.exit < 0.6;
    if (want === !el.headClip.paused) return;
    if (want) { const p = el.headClip.play(); if (p && p.catch) p.catch(() => {}); } else el.headClip.pause();
  }

  function sync() {
    const run = st.visible && !document.hidden;
    if (run === st.running) return;
    st.running = run;
    hero.classList.toggle('hc3-off', !run);
    syncHeadClip();
    if (run) {
      if (waveTl && waveTl.paused() && waveTl.progress() < 1 && waveTl._started) waveTl.resume();
      startTicker();
      tick();
    } else {
      if (waveTl && waveTl.isActive()) { waveTl.pause(); waveTl._started = true; }
      stopTicker();
      playing.forEach((s) => energize(s, false));
    }
  }

  /* ---------- entrada ---------- */

  function intro() {
    const badge = q('.hero-badge');
    const lines = qa('.title .line');
    const pill = q('.title-clip');
    const rest = [q('.sub'), q('.actions'), q('.next-stop')];
    const rows = st.rows.map((r) => r.elI);
    el.count._w = el.count.offsetWidth;
    if (el.lit) { gsap.set(el.lit, { xPercent: -100 }); gsap.set(el.litIn, { xPercent: 100 }); }

    gsap.set(el.bg, { opacity: 0 });
    gsap.set(rows, { opacity: 0, y: 46 });
    gsap.set(badge, { y: 14, opacity: 0 });
    gsap.set(lines, { yPercent: 45, opacity: 0 });
    gsap.set(pill, { scale: 0.5 });
    gsap.set(rest, { y: 14, opacity: 0 });
    el.count.style.width = el.count._w + 'px';
    el.count.textContent = '+0';
    root.classList.add('hc3-go');

    waveTl = buildWave();
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(el.bg, { opacity: 1, duration: 1.8, ease: 'sine.out' }, 0)
      // a arena aparece apagada, do fundo para a frente
      .to(rows, { opacity: 1, y: 0, duration: 1.5, stagger: 0.07 }, 0.1)
      .to(badge, { y: 0, opacity: 1, duration: 1.2 }, 0.3)
      .to(lines, { yPercent: 0, opacity: 1, duration: 1.4, stagger: 0.1 }, 0.38)
      .to(pill, { scale: 1, duration: 1.3 }, 0.5)
      .to(rest, { y: 0, opacity: 1, duration: 1.1, stagger: 0.08 }, 0.7)
      .add(() => { st.ready = true; waveTl._started = true; waveTl.play(); }, 0);
    // a onda e a entrada usam o mesmo relógio (ela começa em WAVE_AT)
    return tl;
  }

  /* ---------- rolagem: a arena desce em profundidade ---------- */

  function scrollStory() {
    if (!hasST) return;
    const rows = st.rows;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate(self) {
          st.exit = self.progress;
          syncHeadClip();
          if (!st.waved && waveTl && self.progress > 0.01) waveTl.timeScale(3); // rolou cedo: completa depressa
        }
      }
    });
    tl.to(el.copy, { y: () => -window.innerHeight * 0.1, duration: 0.6, ease: 'power1.in' }, 0)
      .to(el.copy, { opacity: 0, duration: 0.32, ease: 'power1.in' }, 0)
      .to(el.curtain, { y: () => -window.innerHeight * 0.85, duration: 1, ease: 'power1.inOut' }, 0);
    rows.forEach((row) => {
      const depth = (row.r + 5) / 9; // frente desce mais que o fundo
      tl.to(row.el, { y: () => window.innerHeight * 0.32 * depth, duration: 1 }, 0);
    });

    gsap.fromTo('.hc3-next-t span', { y: 36, opacity: 0 }, {
      y: 0, opacity: 1, duration: 1.3, ease: 'expo.out', stagger: 0.1,
      scrollTrigger: { trigger: '.hc3-next', start: 'top 82%', toggleActions: 'play none none reverse' }
    });
  }

  /* ---------- modos ---------- */

  function startLive() {
    root.classList.remove('hc3-static');
    Object.assign(st, { ready: false, waved: false, running: false, visible: true, exit: 0 });
    build(false);
    movers = st.rows.map((row) => ({
      d: (row.r + 5) / 9,
      x: gsap.quickTo(row.elP, 'x', { duration: 1.2, ease: 'power3' }),
      y: gsap.quickTo(row.elP, 'y', { duration: 1.2, ease: 'power3' })
    }));
    intro();
    scrollStory();

    const io = new IntersectionObserver(([entry]) => {
      st.visible = entry.isIntersecting && entry.intersectionRatio > 0.12;
      sync();
    }, { threshold: [0, 0.12, 0.2] });
    io.observe(hero);

    let rz = 0;
    const onResize = () => {
      clearTimeout(rz);
      rz = setTimeout(() => {
        if (hero.clientWidth === st.W && hero.clientHeight === st.H) return;
        // reconstrói a arena já acesa (a onda acontece uma vez só)
        if (waveTl) { waveTl.progress(1).kill(); waveTl = null; }
        st.waved = true;
        build(true);
        st.seats.forEach((s) => { s.v.style.opacity = 1; });
        movers = st.rows.map((row) => ({
          d: (row.r + 5) / 9,
          x: gsap.quickTo(row.elP, 'x', { duration: 1.2, ease: 'power3' }),
          y: gsap.quickTo(row.elP, 'y', { duration: 1.2, ease: 'power3' })
        }));
        ScrollTrigger.getAll().forEach((t) => t.kill(true));
        scrollStory();
        ScrollTrigger.refresh();
        tick();
      }, 220);
    };

    document.addEventListener('visibilitychange', sync);
    window.addEventListener('resize', onResize);
    el.stands.addEventListener('pointerover', onOver);
    hero.addEventListener('pointermove', onMove);
    hero.addEventListener('pointerleave', onLeave);
    st.running = false;
    sync();

    return () => {
      stopTicker();
      io.disconnect();
      clearTimeout(rz);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('resize', onResize);
      el.stands.removeEventListener('pointerover', onOver);
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
      if (waveTl) { waveTl.kill(); waveTl = null; }
      clearStands();
      el.count.textContent = '+2.000';
      el.count.style.width = '';
      hero.classList.remove('hc3-off');
      st.running = false;
      st.ready = false;
    };
  }

  function startCalm() {
    root.classList.add('hc3-static', 'hc3-go');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce && el.headClip) {
      el.headClip.removeAttribute('autoplay');
      el.headClip.pause();
    }
    build(true);
    let rz = 0;
    const onResize = () => {
      clearTimeout(rz);
      rz = setTimeout(() => {
        if (hero.clientWidth === st.W && hero.clientHeight === st.H) return;
        build(true);
      }, 220);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(rz);
      window.removeEventListener('resize', onResize);
      clearStands();
    };
  }

  // espera a fonte: o arco da arena é medido a partir do texto real
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 700))]).then(() => {
    const mm = gsap.matchMedia();
    mm.add({
      live: '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
      calm: '(max-width: 899px), (prefers-reduced-motion: reduce)'
    }, (ctx) => (ctx.conditions.live ? startLive() : startCalm()));
  });
})();
