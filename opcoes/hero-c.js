/* ============================================================
   Opção C — Carga
   Parede de cards de vídeo em colunas que derivam (sentidos
   alternados). Acima da frente de carga tudo é "antes": cinza e
   parado. Abaixo dela é "depois": cor e vida.

   Como a cor muda exatamente onde a frente está, sem custo:
   - a parede existe duas vezes, alinhada pixel a pixel: a camada
     cinza (imagens com filtro estático) e a colorida (vídeos com
     pôster), que mora numa janela .hc-win com overflow: hidden;
   - a janela desce até a frente (translateY(f)) e o conteúdo dela
     sobe o mesmo tanto (translateY(-f)): o recorte acompanha a linha
     e nada é repintado — só transform;
   - as colunas derivam com Web Animations (transform no compositor),
     cinza e colorida com o mesmo relógio: zero script por quadro;
   - um agendador leve (a cada ~340 ms) calcula onde cada card está
     e só deixa tocar até 4 vídeos na faixa logo abaixo da frente
     (+1 pelo cursor).
   ============================================================ */

(() => {
  'use strict';

  const root = document.documentElement;
  const hero = document.querySelector('.hc-hero');
  if (!hero) return;
  if (!window.gsap) { root.classList.add('hc-go'); return; }
  const hasST = typeof window.ScrollTrigger !== 'undefined';
  if (hasST) gsap.registerPlugin(ScrollTrigger);

  /* ---------- conteúdo e ajustes ---------- */

  const BASE = '../assets/video/';
  // ordem pensada para variar: licenciados e eventos, retrato e paisagem
  const CLIPS = [
    'cards/gen-reuniao', 'past/arena-audience', 'cards/sel-jardim', 'cards/gen-podcast',
    'cards/sel-carro', 'past/stage-speaker', 'cards/gen-executiva2', 'cards/sel-musgo2',
    'past/crowd-hands', 'cards/sel-escritorio', 'cards/gen-kart', 'cards/sel-estudio',
    'past/expo-crowd', 'cards/sel-musgo1', 'cards/gen-walk', 'past/car-reveal',
    'cards/sel-suv', 'cards/gen-executiva1', 'past/arena-persistencia'
  ];
  const SPEEDS = [15, 19, 13, 17, 14, 20, 16, 18, 12, 17, 15]; // px/s para colunas de 200px
  const PHASES = [0.12, 0.58, 0.31, 0.77, 0.44, 0.9, 0.2, 0.66, 0.05, 0.5, 0.36];
  const MAX_AUTO = 4;   // vídeos escolhidos pela frente (+1 pelo cursor)
  const TICK = 340;     // ms entre decisões de quem toca

  const q = (s) => hero.querySelector(s);
  const qa = (s) => Array.from(hero.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const el = {
    wall: q('.hc-wall'),
    gray: q('.hc-layer--gray'),
    color: q('.hc-layer--color'),
    win: q('.hc-win'),
    winIn: q('.hc-win-in'),
    front: q('.hc-front'),
    fx: q('.hc-front-fx'),
    line: q('.hc-front-line'),
    flare: q('.hc-front-flare'),
    hot: q('.hc-front-hot'),
    readout: q('.hc-readout'),
    readN: q('.hc-readout b'),
    lit: q('.hc-lit'),
    litIn: q('.hc-lit-in'),
    copy: q('.hero-copy'),
    flash: q('.hc-flash'),
    curtain: q('.hc-curtain'),
    bg: q('.rich-bg'),
    headClip: q('.title-clip video')
  };

  const st = {
    m: null, H: 0,
    rise: -0.2, charge: 0, exit: 0,
    f: null, d: null, pct: -1, exitDone: -1, grayOff: null, winOff: null,
    litTop: 0, litH: 0, restY: 0,
    ready: false, visible: true, running: false
  };

  let cols = [];        // dados de cada coluna (as duas camadas)
  let anims = [];       // animações da deriva (WAAPI)
  const playing = new Set();
  let hoverTile = null;
  let hoverVideo = null;
  let timer = 0;

  /* ---------- medidas ---------- */

  function metrics() {
    const W = hero.clientWidth;
    const H = hero.clientHeight;
    const cw = Math.round(clamp(W * 0.135, 150, 340));
    const gap = Math.round(cw * 0.13);
    const th = Math.round(cw * 1.4);
    const pitch = th + gap;
    const side = Math.max(1, Math.ceil((W / 2 - cw / 2) / (cw + gap)));
    const n = Math.max(4, Math.ceil(H / pitch));
    return { W, H, cw, gap, th, pitch, side, cols: side * 2 + 1, n, S: n * pitch };
  }

  // soma de offsetTop até o hero (ignora transforms: medida estável)
  function offsetIn(node) {
    let y = 0;
    while (node && node !== hero) { y += node.offsetTop; node = node.offsetParent; }
    return y;
  }
  function measureLit() {
    if (el.lit) {
      st.litTop = offsetIn(el.lit);
      st.litH = el.lit.offsetHeight;
      st.d = null;
    }
    // a frente repousa no respiro entre o texto de apoio e os botões:
    // nunca atravessa uma linha de texto parada (28–40% de carga)
    const sub = q('.sub');
    const actions = q('.actions');
    const gutter = (offsetIn(sub) + sub.offsetHeight + offsetIn(actions)) / 2;
    st.restY = clamp(gutter, st.H * 0.6, st.H * 0.72);
  }

  /* ---------- parede ---------- */

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

  function makeTile(clip, color) {
    const fig = document.createElement('figure');
    fig.className = 'hc-tile';
    fig.dataset.clip = clip;
    const poster = BASE + clip + '.jpg';
    if (color) {
      // vídeo sem src até ser energizado pela primeira vez: o pôster
      // colorido aparece de graça e a rede só trabalha para quem toca
      const v = document.createElement('video');
      setVideoFlags(v);
      v.poster = poster;
      v.dataset.src = BASE + clip + '.mp4';
      const live = document.createElement('i');
      live.className = 'hc-live';
      fig.append(v, live);
      fig._v = v;
    } else {
      const img = document.createElement('img');
      img.className = 'hc-g';
      img.alt = '';
      img.decoding = 'async';
      img.src = poster;
      fig.append(img);
      fig._gray = true;
    }
    return fig;
  }

  function clearWall() {
    anims.forEach((a) => a.cancel());
    anims = [];
    playing.forEach((t) => t._v && t._v.pause());
    playing.clear();
    cols.forEach((col) => col.tiles.forEach((t) => {
      if (t._v && t._v.getAttribute('src')) { t._v.removeAttribute('src'); t._v.load(); }
    }));
    hoverTile = null;
    hoverVideo = null;
    el.gray.textContent = '';
    el.color.textContent = '';
    cols = [];
  }

  function buildWall(m, live) {
    clearWall();
    hero.style.setProperty('--hc-gap', m.gap + 'px');
    hero.style.setProperty('--hc-th', m.th + 'px');
    const fragG = document.createDocumentFragment();
    const fragC = document.createDocumentFragment();

    for (let c = 0; c < m.cols; c++) {
      const rel = c - m.side;
      const left = Math.round(m.W / 2 + rel * (m.cw + m.gap) - m.cw / 2);
      const dir = rel % 2 === 0 ? -1 : 1; // -1 sobe, 1 desce
      const speed = SPEEDS[c % SPEEDS.length] * (m.cw / 200);
      const col = { c, rel, dir, left, dur: (m.S / speed) * 1000, tiles: [] };

      ['g', 'c'].forEach((layer) => {
        const wrap = document.createElement('div');
        wrap.className = Math.abs(rel) <= 1 ? 'hc-col hc-col--mid' : 'hc-col';
        wrap.style.cssText = `left:${left}px;width:${m.cw}px`;
        const inner = document.createElement('div');
        inner.className = 'hc-col-in';
        const track = document.createElement('div');
        track.className = 'hc-track';
        for (let k = 0; k < m.n * 2; k++) {
          const clip = CLIPS[(c * m.n + (k % m.n) + c) % CLIPS.length];
          const t = makeTile(clip, layer === 'c');
          track.append(t);
          if (layer === 'c') col.tiles.push(t);
        }
        inner.append(track);
        wrap.append(inner);
        (layer === 'c' ? fragC : fragG).append(wrap);
        col[layer + 'Col'] = wrap;
        col[layer + 'In'] = inner;
        col[layer + 'Track'] = track;
      });
      cols.push(col);
    }
    el.gray.append(fragG);
    el.color.append(fragC);

    const phase = (col) => PHASES[col.c % PHASES.length];
    if (live) {
      // deriva infinita no compositor; cinza e colorida com o mesmo relógio
      cols.forEach((col) => {
        col.from = col.dir < 0 ? 0 : -m.S;
        col.to = col.dir < 0 ? -m.S : 0;
        const kf = [
          { transform: `translate3d(0,${col.from}px,0)` },
          { transform: `translate3d(0,${col.to}px,0)` }
        ];
        const opt = { duration: col.dur, iterations: Infinity, easing: 'linear' };
        col.aG = col.gTrack.animate(kf, opt);
        col.aC = col.cTrack.animate(kf, opt);
        const t0 = phase(col) * col.dur;
        col.aG.currentTime = t0;
        col.aC.currentTime = t0;
        anims.push(col.aG, col.aC);
        if (!st.running) { col.aG.pause(); col.aC.pause(); }
        Promise.all([col.aG.ready, col.aC.ready]).then(() => {
          if (col.aG.playState === 'running' && col.aC.playState === 'running') col.aC.startTime = col.aG.startTime;
        }).catch(() => {});
      });
    } else {
      cols.forEach((col) => {
        const off = `translate3d(0,${-Math.round(phase(col) * m.S)}px,0)`;
        col.gTrack.style.transform = off;
        col.cTrack.style.transform = off;
      });
    }
  }

  /* ---------- frente de carga ---------- */

  function frontY() {
    const H = st.H;
    const bottom = H * 0.955;
    const rest = st.restY || H * 0.66;
    const top = -H * 0.07;
    const base = bottom + (rest - bottom) * st.rise;
    return base + (top - base) * st.charge;
  }

  function render() {
    const f = Math.round(frontY());
    if (f === st.f) return;
    st.f = f;
    const tf = `translate3d(0,${f}px,0)`;
    el.front.style.transform = tf;
    el.win.style.transform = tf;
    el.winIn.style.transform = `translate3d(0,${-f}px,0)`;

    // camadas totalmente cobertas não precisam ser compostas
    const grayOff = f < -8;
    if (grayOff !== st.grayOff) {
      st.grayOff = grayOff;
      el.gray.style.visibility = grayOff ? 'hidden' : '';
      hero.classList.toggle('hc-full', grayOff); // carga completa: a frente some e seus laços param
    }
    const winOff = f >= st.H + 8;
    if (winOff !== st.winOff) { st.winOff = winOff; el.win.style.visibility = winOff ? 'hidden' : ''; }

    // "vidas de verdade": a parte abaixo da frente acende
    if (el.lit) {
      const d = Math.round(clamp(f - st.litTop, 0, st.litH));
      if (d !== st.d) {
        st.d = d;
        el.lit.style.transform = `translate3d(0,${d}px,0)`;
        el.litIn.style.transform = `translate3d(0,${-d}px,0)`;
      }
    }

    const pct = Math.round(clamp((st.H - f) / st.H, 0, 1) * 100);
    if (pct !== st.pct) { st.pct = pct; el.readN.textContent = pct; }
  }

  // saída: as colunas seguem a própria deriva e se afastam
  function renderExit() {
    const e = Math.round(st.exit * 1000) / 1000;
    if (e === st.exitDone) return;
    st.exitDone = e;
    syncHeadClip();
    for (const col of cols) {
      const tf = e ? `translate3d(0,${(col.dir * st.H * 0.12 * e).toFixed(1)}px,0)` : '';
      col.gCol.style.transform = tf;
      col.cCol.style.transform = tf;
    }
  }

  /* ---------- quem toca: a faixa logo abaixo da frente ---------- */

  function energize(t, on) {
    const v = t._v;
    if (!v) return;
    if (on) {
      if (!v.getAttribute('src')) v.src = v.dataset.src;
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
      t.classList.add('is-live');
      playing.add(t);
    } else {
      v.pause();
      t.classList.remove('is-live');
      playing.delete(t);
    }
  }

  function tick() {
    if (!st.ready || !st.running || st.f === null) return;
    const m = st.m;
    const f = st.f;
    const H = m.H;
    const bandEnd = f + H * 0.5;
    const hoverColor = hoverTile && !hoverTile._gray ? hoverTile : null;
    const cands = [];

    for (const col of cols) {
      if (!col.aC) continue;
      const ct = col.aC.currentTime || 0;
      const p = (ct % col.dur) / col.dur;
      const ty = col.from + (col.to - col.from) * p;
      const central = Math.abs(col.rel) <= 1; // atrás do texto e do véu
      for (let k = 0; k < col.tiles.length; k++) {
        const y0 = ty + k * m.pitch;
        const y1 = y0 + m.th;
        if (y1 <= f || y0 >= H || y0 > bandEnd) continue;
        const vis = (Math.min(y1, H) - Math.max(y0, f, 0)) / m.th;
        if (vis < 0.5) continue;
        const t = col.tiles[k];
        let score = vis - Math.abs((y0 + y1) / 2 - (f + m.th * 0.6)) / H;
        if (central) score -= 0.45;
        if (playing.has(t)) score += 0.2; // histerese: nada de liga-desliga
        cands.push({ t, c: col.c, score });
      }
    }
    cands.sort((a, b) => b.score - a.score);

    const chosen = new Set();
    const usedCols = new Set();
    if (hoverColor) chosen.add(hoverColor);
    const cap = MAX_AUTO + (hoverColor ? 1 : 0);
    for (const cd of cands) {
      if (chosen.size >= cap) break;
      if (usedCols.has(cd.c) || chosen.has(cd.t)) continue;
      chosen.add(cd.t);
      usedCols.add(cd.c);
    }
    playing.forEach((t) => { if (!chosen.has(t)) energize(t, false); });
    chosen.forEach((t) => { if (!playing.has(t)) energize(t, true); });
  }

  function startTicker() { if (!timer) timer = setInterval(tick, TICK); }
  function stopTicker() { clearInterval(timer); timer = 0; }

  /* ---------- cursor: energiza o que toca ---------- */

  function ensureHover(t) {
    if (t._hv) return t._hv;
    const clip = t.dataset.clip;
    const hv = document.createElement('span');
    hv.className = 'hc-hv';
    const inner = document.createElement('span');
    inner.className = 'hc-hv-in';
    const v = document.createElement('video');
    setVideoFlags(v);
    v.poster = BASE + clip + '.jpg';
    v.src = BASE + clip + '.mp4';
    const edge = document.createElement('i');
    edge.className = 'hc-hv-edge';
    inner.append(v);
    hv.append(inner, edge);
    t.append(hv);
    void hv.offsetWidth; // registra o estado inicial para a transição
    t._hv = v;
    return v;
  }

  function setHover(t) {
    if (t === hoverTile) return;
    const prev = hoverTile;
    if (prev) {
      prev.classList.remove('is-hv');
      if (prev._gray && prev._hv) prev._hv.pause();
    }
    hoverTile = t || null;
    hoverVideo = null;
    if (t) {
      if (t._gray) {
        hoverVideo = ensureHover(t);
        t.classList.add('is-hv');
        const p = hoverVideo.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        t.classList.add('is-hv');
      }
    }
    tick();
  }

  function onOver(e) {
    const t = e.target && e.target.closest ? e.target.closest('.hc-tile') : null;
    // atrás do texto ninguém reage: quem lê não dispara vídeos escondidos
    setHover(t && !t.closest('.hc-col--mid') ? t : null);
  }

  let hotX = null;
  let hotOn = false;
  function onMove(e) {
    if (!hotX) return;
    hotX(e.clientX);
    if (!hotOn) { hotOn = true; gsap.to(el.hot, { opacity: 1, duration: 0.7, ease: 'sine.out', overwrite: 'auto' }); }
  }
  function onLeave() {
    hotOn = false;
    gsap.to(el.hot, { opacity: 0, duration: 0.9, ease: 'sine.out', overwrite: 'auto' });
    setHover(null);
  }

  /* ---------- liga/desliga: fora da tela ou aba oculta ---------- */

  // o clipe do título só toca enquanto o texto está à vista
  function syncHeadClip() {
    if (!el.headClip) return;
    const want = st.running && st.exit < 0.85;
    if (want === !el.headClip.paused) return;
    if (want) { const p = el.headClip.play(); if (p && p.catch) p.catch(() => {}); } else el.headClip.pause();
  }

  function sync() {
    const run = st.visible && !document.hidden;
    if (run === st.running) return;
    st.running = run;
    hero.classList.toggle('hc-off', !run);
    anims.forEach((a) => (run ? a.play() : a.pause()));
    syncHeadClip();
    if (run) { startTicker(); tick(); } else {
      stopTicker();
      playing.forEach((t) => energize(t, false));
      if (hoverVideo) hoverVideo.pause();
    }
  }

  /* ---------- entrada orquestrada ---------- */

  function intro() {
    const N = cols.length;
    const colsIn = cols.map((c) => c.gIn).concat(cols.map((c) => c.cIn));
    const badge = q('.hero-badge');
    const lines = qa('.title .line');
    const pill = q('.title-clip');
    const rest = [q('.sub'), q('.actions'), q('.next-stop')];

    // estados de partida explícitos (fora da timeline: nada os reverte)
    gsap.set(el.bg, { opacity: 0 });
    gsap.set(colsIn, { y: (i) => -cols[i % N].dir * 120, opacity: 0 });
    gsap.set(badge, { y: 18, opacity: 0 });
    gsap.set(lines, { yPercent: 45, opacity: 0 });
    gsap.set(pill, { scale: 0.5 });
    gsap.set(rest, { y: 18, opacity: 0 });
    gsap.set([el.fx, el.flare], { opacity: 0 });
    gsap.set(el.line, { scaleX: 0 });
    gsap.set(el.readout, { opacity: 0, x: 12 });
    st.rise = -0.2;
    root.classList.add('hc-go');

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(el.bg, { opacity: 1, duration: 1.8, ease: 'sine.out' }, 0)
      // as colunas chegam cinzas, cada uma pelo lado de onde deriva
      .to(colsIn, { y: 0, opacity: 1, duration: 1.8, stagger: (i) => 0.09 * Math.abs(cols[i % N].rel) }, 0.1)
      // o texto assenta
      .to(badge, { y: 0, opacity: 1, duration: 1.3 }, 0.3)
      .to(lines, { yPercent: 0, opacity: 1, duration: 1.5, stagger: 0.1 }, 0.4)
      .to(pill, { scale: 1, duration: 1.4 }, 0.55)
      .to(rest, { y: 0, opacity: 1, duration: 1.2, stagger: 0.08 }, 0.75)
      // ignição na base
      .to(el.fx, { opacity: 1, duration: 0.5, ease: 'sine.out' }, 1.05)
      .to(el.line, { scaleX: 1, duration: 1.3 }, 1.05)
      .to(el.flare, { opacity: 1, duration: 0.35, ease: 'sine.out' }, 1.1)
      .to(el.flare, { opacity: 0, duration: 1.5, ease: 'sine.inOut' }, 1.5)
      .to(st, { rise: 0, duration: 0.8, ease: 'power3.out', onUpdate: render }, 1.05)
      .to(el.readout, { opacity: 1, x: 0, duration: 1 }, 1.4)
      // e sobe até a altura de repouso, como uma bateria carregando
      .to(st, { rise: 1, duration: 2.2, ease: 'power3.inOut', onUpdate: render }, 1.75)
      .add(() => { st.ready = true; tick(); }, 2.7);
    return tl;
  }

  /* ---------- rolagem: carga completa e passagem ---------- */

  function scrollStory() {
    if (!hasST) return null;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: () => '+=' + Math.round(window.innerHeight * 1.4),
        pin: true,
        scrub: 0.9,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });
    tl.to(st, { charge: 1, duration: 0.72, ease: 'none', onUpdate: render }, 0)
      .to(el.front, { opacity: 0, duration: 0.07 }, 0.64)
      .to(el.flash, { opacity: 1, duration: 0.06, ease: 'sine.out' }, 0.63)
      .to(el.flash, { opacity: 0, duration: 0.16, ease: 'sine.inOut' }, 0.7)
      // passagem: o texto sobe, as colunas se afastam e o escuro sobe pela base
      .to(el.copy, { y: () => -window.innerHeight * 0.1, opacity: 0, duration: 0.2, ease: 'power2.inOut' }, 0.79)
      .to(st, { exit: 1, duration: 0.21, ease: 'power2.inOut', onUpdate: renderExit }, 0.79)
      .to(el.curtain, { y: () => -window.innerHeight * 0.62, duration: 0.21, ease: 'power2.inOut' }, 0.79);

    gsap.fromTo('.hc-next-t span', { y: 36, opacity: 0 }, {
      y: 0, opacity: 1, duration: 1.3, ease: 'expo.out', stagger: 0.1,
      scrollTrigger: { trigger: '.hc-next', start: 'top 82%', toggleActions: 'play none none reverse' }
    });
    return tl;
  }

  /* ---------- modos ---------- */

  function startLive() {
    root.classList.remove('hc-static');
    const m = metrics();
    Object.assign(st, {
      m, H: m.H, rise: -0.2, charge: 0, exit: 0, f: null, d: null, pct: -1,
      exitDone: -1, grayOff: null, winOff: null, ready: false, running: false, visible: true
    });
    buildWall(m, true);
    measureLit();
    render();
    hotX = gsap.quickTo(el.hot, 'x', { duration: 0.9, ease: 'power3' });

    intro();
    scrollStory();

    // abaixo de ~12% visível só resta o escuro da passagem: tudo para
    const io = new IntersectionObserver(([entry]) => {
      st.visible = entry.isIntersecting && entry.intersectionRatio > 0.12;
      sync();
    }, { threshold: [0, 0.12, 0.2] });
    io.observe(hero);

    let rz = 0;
    const onResize = () => {
      clearTimeout(rz);
      rz = setTimeout(() => {
        const m2 = metrics();
        if (m2.W === st.m.W && m2.H === st.m.H) return;
        st.m = m2;
        st.H = m2.H;
        buildWall(m2, true);
        if (st.running) anims.forEach((a) => a.play());
        measureLit();
        st.f = null;
        st.exitDone = -1;
        render();
        renderExit();
        tick();
      }, 200);
    };

    document.addEventListener('visibilitychange', sync);
    window.addEventListener('resize', onResize);
    el.wall.addEventListener('pointerover', onOver);
    hero.addEventListener('pointermove', onMove);
    hero.addEventListener('pointerleave', onLeave);
    sync();

    return () => {
      stopTicker();
      io.disconnect();
      clearTimeout(rz);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('resize', onResize);
      el.wall.removeEventListener('pointerover', onOver);
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
      clearWall();
      [el.front, el.win, el.winIn, el.lit, el.litIn].forEach((n) => { if (n) n.style.transform = ''; });
      el.gray.style.visibility = '';
      el.win.style.visibility = '';
      hero.classList.remove('hc-off', 'hc-full');
      st.running = false;
      st.ready = false;
      hotX = null;
    };
  }

  function startCalm() {
    root.classList.add('hc-static', 'hc-go');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce && el.headClip) {
      el.headClip.removeAttribute('autoplay');
      el.headClip.pause();
    }
    st.m = metrics();
    buildWall(st.m, false);
    let rz = 0;
    const onResize = () => {
      clearTimeout(rz);
      rz = setTimeout(() => {
        const m2 = metrics();
        if (m2.W === st.m.W && m2.H === st.m.H) return;
        st.m = m2;
        buildWall(m2, false);
      }, 200);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(rz);
      window.removeEventListener('resize', onResize);
      clearWall();
    };
  }

  const mm = gsap.matchMedia();
  mm.add({
    live: '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
    calm: '(max-width: 899px), (prefers-reduced-motion: reduce)'
  }, (ctx) => (ctx.conditions.live ? startLive() : startCalm()));
})();
