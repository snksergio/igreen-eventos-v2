/* ============================================================
   Opção C2 — Carga completa
   Parede de cards de vídeo em colunas completas que derivam em
   sentidos alternados. Acima da frente de carga tudo é "antes":
   cinza e parado. Abaixo dela é "depois": cor e vida. Na entrada a
   frente sobe da base até o topo (100%); cada card reage uma única
   vez quando ela o alcança. Depois a cena fica calma.

   Como a cor muda exatamente onde a frente está, sem custo:
   - a parede existe duas vezes durante a carga, alinhada pixel a
     pixel: a camada cinza (imagens com filtro estático) e a colorida
     (vídeos com pôster) numa janela .hc2-win com overflow: hidden;
   - a janela desce até a frente (translateY(f)) e o conteúdo sobe o
     mesmo tanto (translateY(-f)): o recorte acompanha a linha — só
     transform. Terminada a carga, a camada cinza é descartada;
   - as colunas derivam com Web Animations (compositor), cinza e
     colorida com o mesmo relógio: zero script por quadro;
   - um agendador leve (a cada ~340 ms) deixa tocar no máximo 4
     vídeos (+1 pelo cursor): na carga, logo abaixo da frente; depois,
     em rodízio calmo.
   ============================================================ */

(() => {
  'use strict';

  const root = document.documentElement;
  const hero = document.querySelector('.hc2-hero');
  if (!hero) return;
  if (!window.gsap) { root.classList.add('hc2-go'); return; }
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
  const MAX_AUTO = 4;   // vídeos escolhidos pelo agendador (+1 pelo cursor)
  const TICK = 340;     // ms entre decisões de quem toca
  const AGE = 10000;    // ms que um clipe toca antes de passar a vez

  const q = (s) => hero.querySelector(s);
  const qa = (s) => Array.from(hero.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const el = {
    wall: q('.hc2-wall'),
    gray: q('.hc2-layer--gray'),
    color: q('.hc2-layer--color'),
    win: q('.hc2-win'),
    winIn: q('.hc2-win-in'),
    front: q('.hc2-front'),
    fx: q('.hc2-front-fx'),
    line: q('.hc2-front-line'),
    flare: q('.hc2-front-flare'),
    readout: q('.hc2-readout'),
    readN: q('.hc2-readout b'),
    lit: q('.hc2-lit'),
    litIn: q('.hc2-lit-in'),
    sweep: q('.hc2-sweep'),
    sweepIn: q('.hc2-sweep-in'),
    copy: q('.hero-copy'),
    veil: q('.hc2-veil'),
    flash: q('.hc2-flash'),
    curtain: q('.hc2-curtain'),
    bg: q('.rich-bg'),
    headClip: q('.title-clip video')
  };

  const st = {
    m: null, H: 0,
    rise: -0.2, exit: 0,
    f: null, d: null, pct: -1, fo: -1, exitDone: -1,
    litTop: 0, litH: 0, copy: null,
    charged: false, flashed: false, swept: false,
    ready: false, visible: true, running: false
  };

  let cols = [];        // dados de cada coluna
  let animsG = [];      // deriva da camada cinza (só durante a carga)
  let animsC = [];      // deriva da camada colorida
  const playing = new Set();
  let hoverTile = null;
  let timer = 0;
  let introTl = null;

  /* ---------- medidas ---------- */

  function metrics() {
    const W = hero.clientWidth;
    const H = hero.clientHeight;
    // um passo menor que a versão original (0,135 → 0,118 da largura)
    const cw = Math.round(clamp(W * 0.118, 140, 300));
    const gap = Math.round(cw * 0.13);
    const th = Math.round(cw * 1.4);
    const pitch = th + gap;
    const side = Math.max(1, Math.ceil((W / 2 - cw / 2) / (cw + gap)));
    const n = Math.max(4, Math.ceil(H / pitch));
    return { W, H, cw, gap, th, pitch, side, cols: side * 2 + 1, n, S: n * pitch };
  }

  // soma de offsets até o hero (ignora transforms: medida estável)
  function offsetIn(node) {
    let y = 0;
    while (node && node !== hero) { y += node.offsetTop; node = node.offsetParent; }
    return y;
  }
  function offsetLeftIn(node) {
    let x = 0;
    while (node && node !== hero) { x += node.offsetLeft; node = node.offsetParent; }
    return x;
  }

  function measure() {
    if (el.lit) {
      st.litTop = offsetIn(el.lit);
      st.litH = el.lit.offsetHeight;
      st.d = null;
    }
    // caixa do texto: o véu se ajusta a ela e ninguém toca atrás dela
    const items = [q('.hero-badge'), ...qa('.title .line'), q('.sub'), q('.actions'), q('.next-stop')];
    const box = { l: Infinity, r: -Infinity, t: Infinity, b: -Infinity };
    items.forEach((n) => {
      const t = offsetIn(n);
      const l = offsetLeftIn(n);
      box.l = Math.min(box.l, l);
      box.r = Math.max(box.r, l + n.offsetWidth);
      box.t = Math.min(box.t, t);
      box.b = Math.max(box.b, t + n.offsetHeight);
    });
    st.copy = box;
    hero.style.setProperty('--hc2-copy-w', Math.round(box.r - box.l) + 'px');
    hero.style.setProperty('--hc2-copy-h', Math.round(box.b - box.t) + 'px');
    hero.style.setProperty('--hc2-copy-cy', Math.round((box.t + box.b) / 2) + 'px');
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
    fig.className = 'hc2-tile';
    const poster = BASE + clip + '.jpg';
    if (color) {
      // vídeo sem src até tocar pela primeira vez: o pôster colorido
      // aparece de graça e a rede só trabalha para quem toca
      const v = document.createElement('video');
      setVideoFlags(v);
      v.poster = poster;
      v.dataset.src = BASE + clip + '.mp4';
      const live = document.createElement('i');
      live.className = 'hc2-live';
      fig.append(v, live);
      fig._v = v;
    } else {
      const img = document.createElement('img');
      img.className = 'hc2-g';
      img.alt = '';
      img.decoding = 'async';
      img.src = poster;
      fig.append(img);
    }
    return fig;
  }

  function dropGray() {
    animsG.forEach((a) => a.cancel());
    animsG = [];
    el.gray.textContent = '';
    cols.forEach((col) => { col.gCol = col.gIn = col.gTrack = col.aG = null; });
  }

  function clearWall() {
    animsC.forEach((a) => a.cancel());
    animsC = [];
    playing.forEach((t) => t._v && t._v.pause());
    playing.clear();
    cols.forEach((col) => col.tiles.forEach((t) => {
      if (t._v && t._v.getAttribute('src')) { t._v.removeAttribute('src'); t._v.load(); }
    }));
    hoverTile = null;
    dropGray();
    el.color.textContent = '';
    cols = [];
  }

  function buildWall(m, live, withGray) {
    clearWall();
    hero.style.setProperty('--hc2-gap', m.gap + 'px');
    hero.style.setProperty('--hc2-th', m.th + 'px');
    const fragG = document.createDocumentFragment();
    const fragC = document.createDocumentFragment();

    for (let c = 0; c < m.cols; c++) {
      const rel = c - m.side;
      const left = Math.round(m.W / 2 + rel * (m.cw + m.gap) - m.cw / 2);
      const dir = rel % 2 === 0 ? -1 : 1; // -1 sobe, 1 desce
      const speed = SPEEDS[c % SPEEDS.length] * (m.cw / 200);
      const col = { c, rel, dir, left, dur: (m.S / speed) * 1000, tiles: [] };

      (withGray ? ['g', 'c'] : ['c']).forEach((layer) => {
        const wrap = document.createElement('div');
        wrap.className = Math.abs(rel) <= 1 ? 'hc2-col hc2-col--mid' : 'hc2-col';
        wrap.style.cssText = `left:${left}px;width:${m.cw}px`;
        const inner = document.createElement('div');
        inner.className = 'hc2-col-in';
        const track = document.createElement('div');
        track.className = 'hc2-track';
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
        const t0 = phase(col) * col.dur;
        col.aC = col.cTrack.animate(kf, opt);
        col.aC.currentTime = t0;
        animsC.push(col.aC);
        if (withGray) {
          col.aG = col.gTrack.animate(kf, opt);
          col.aG.currentTime = t0;
          animsG.push(col.aG);
          Promise.all([col.aG.ready, col.aC.ready]).then(() => {
            if (col.aG && col.aG.playState === 'running' && col.aC.playState === 'running') col.aG.startTime = col.aC.startTime;
          }).catch(() => {});
        }
        if (!st.running) { col.aC.pause(); if (col.aG) col.aG.pause(); }
      });
    } else {
      cols.forEach((col) => {
        col.cTrack.style.transform = `translate3d(0,${-Math.round(phase(col) * m.S)}px,0)`;
      });
    }
  }

  // posição (topo) da coluna na tela, a partir do relógio da deriva
  function trackY(col) {
    const ct = col.aC.currentTime || 0;
    return col.from + (col.to - col.from) * ((ct % col.dur) / col.dur);
  }

  /* ---------- frente de carga ---------- */

  function frontY() {
    const H = st.H;
    const bottom = H * 0.955;
    const top = -H * 0.07;
    return bottom + (top - bottom) * st.rise;
  }

  // a luz chegou ao card: borda acesa, faixa de luz e um respiro de escala
  function zap(t) {
    t._zapped = true;
    const z = document.createElement('i');
    z.className = 'hc2-zap';
    t.append(z);
    t.classList.add('is-zap');
    setTimeout(() => { z.remove(); t.classList.remove('is-zap'); }, 1250);
  }
  function zapCrossed(f) {
    const m = st.m;
    for (const col of cols) {
      if (!col.aC) continue;
      const ty = trackY(col);
      for (let k = 0; k < col.tiles.length; k++) {
        const t = col.tiles[k];
        if (t._zapped) continue;
        const yc = ty + k * m.pitch + m.th / 2;
        if (yc < m.th * 0.2 || yc > m.H - m.th * 0.15) continue; // fora da tela
        if (f <= yc) zap(t);
      }
    }
  }

  function render() {
    const f = Math.round(frontY());
    if (f === st.f) return;
    st.f = f;
    const H = st.H;
    const tf = `translate3d(0,${f}px,0)`;
    el.front.style.transform = tf;
    el.win.style.transform = tf;
    el.winIn.style.transform = `translate3d(0,${-f}px,0)`;

    // perto do topo a linha se apaga (sob o menu)
    const fo = Math.round(clamp((f + H * 0.07) / (H * 0.17), 0, 1) * 100) / 100;
    if (fo !== st.fo) { st.fo = fo; el.front.style.opacity = fo; }

    if (!st.charged) zapCrossed(f);

    // "vidas de verdade": a parte abaixo da frente acende
    if (el.lit) {
      const d = Math.round(clamp(f - st.litTop, 0, st.litH));
      if (d !== st.d) {
        st.d = d;
        el.lit.style.transform = `translate3d(0,${d}px,0)`;
        el.litIn.style.transform = `translate3d(0,${-d}px,0)`;
        if (d === 0 && !st.swept) { st.swept = true; sweep(0.1); }
      }
    }

    // carga completa: um sopro de luz no topo (uma vez)
    if (f < H * 0.04 && !st.flashed) {
      st.flashed = true;
      gsap.timeline()
        .to(el.flash, { opacity: 1, duration: 0.45, ease: 'sine.out' })
        .to(el.flash, { opacity: 0, duration: 1.4, ease: 'sine.inOut' });
    }

    const pct = Math.round(clamp((H - f) / H, 0, 1) * 100);
    if (pct !== st.pct) { st.pct = pct; el.readN.textContent = pct; }
  }

  // carga completa: a camada cinza deixa de existir e a frente some
  function finishCharge() {
    if (st.charged) return;
    st.rise = 1;
    render();
    st.charged = true;
    dropGray();
    hero.classList.add('hc2-full');
    el.front.style.visibility = 'hidden';
    tick();
  }

  // a luz que atravessa "vidas de verdade", uma única vez
  function sweep(delay) {
    if (!el.sweep) return;
    const w = el.sweep.offsetWidth;
    const L = el.sweep.parentNode.offsetWidth;
    const p = { x: -w };
    gsap.set(el.sweep, { opacity: 1 });
    gsap.to(p, {
      x: L + w * 0.2,
      duration: 1.5,
      delay: delay || 0,
      ease: 'power2.inOut',
      onUpdate() {
        el.sweep.style.transform = `translate3d(${p.x.toFixed(1)}px,0,0)`;
        el.sweepIn.style.transform = `translate3d(${(-p.x).toFixed(1)}px,0,0)`;
      },
      onComplete() { gsap.set(el.sweep, { opacity: 0 }); }
    });
  }

  // saída: as colunas seguem a própria deriva e se afastam
  function renderExit() {
    const e = Math.round(st.exit * 1000) / 1000;
    if (e === st.exitDone) return;
    st.exitDone = e;
    syncHeadClip();
    for (const col of cols) {
      const tf = e ? `translate3d(0,${(col.dir * st.H * 0.1 * e).toFixed(1)}px,0)` : '';
      col.cCol.style.transform = tf;
      if (col.gCol) col.gCol.style.transform = tf;
    }
  }

  /* ---------- quem toca: faixa abaixo da frente, depois rodízio ---------- */

  function energize(t, on) {
    const v = t._v;
    if (!v) return;
    if (on) {
      if (!v.getAttribute('src')) v.src = v.dataset.src;
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
      t.classList.add('is-live');
      t._since = performance.now();
      playing.add(t);
    } else {
      v.pause();
      t.classList.remove('is-live');
      t._stop = performance.now();
      playing.delete(t);
    }
  }

  function tick() {
    if (!st.ready || !st.running || st.f === null) return;
    const m = st.m;
    const H = m.H;
    const now = performance.now();
    const f = st.charged ? 0 : Math.max(0, st.f);
    const bandEnd = st.charged ? Infinity : st.f + H * 0.45;
    const cp = st.copy;
    const hoverColor = hoverTile;
    const cands = [];
    const visible = new Set();

    for (const col of cols) {
      if (!col.aC) continue;
      const ty = trackY(col);
      const cx = col.left + m.cw / 2;
      for (let k = 0; k < col.tiles.length; k++) {
        const y0 = ty + k * m.pitch;
        const y1 = y0 + m.th;
        if (y1 <= f || y0 >= H) continue;
        const vis = (Math.min(y1, H * 0.97) - Math.max(y0, f, H * 0.09)) / m.th;
        if (vis < 0.55) continue;
        const t = col.tiles[k];
        visible.add(t);
        if (y0 > bandEnd) continue;
        // atrás do texto e do véu ninguém toca
        const cy = (y0 + y1) / 2;
        if (cp && cx > cp.l - 40 && cx < cp.r + 40 && cy > cp.t - 30 && cy < cp.b + 30) continue;
        let score = vis;
        if (playing.has(t)) score += now - t._since > AGE ? -1 : 0.3; // rodízio com histerese
        if (!playing.has(t) && t._stop && now - t._stop < 12000) score -= 0.5;
        if (!st.charged) score -= Math.abs(cy - (st.f + m.th * 0.6)) / H;
        cands.push({ t, c: col.c, score });
      }
    }
    cands.sort((x, y) => y.score - x.score);

    const cap = MAX_AUTO + (hoverColor ? 1 : 0);
    const chosen = new Set();
    const usedCols = new Set();
    if (hoverColor) chosen.add(hoverColor);
    for (const cd of cands) {
      if (chosen.size >= cap) break;
      if (usedCols.has(cd.c) || chosen.has(cd.t)) continue;
      chosen.add(cd.t);
      usedCols.add(cd.c);
    }
    // quem saiu de vista para já; os demais trocam com calma
    playing.forEach((t) => { if (!visible.has(t) && t !== hoverColor) energize(t, false); });
    let starts = [...chosen].filter((t) => !playing.has(t)).slice(0, st.charged ? 1 : 2);
    const spare = [...playing].filter((t) => !chosen.has(t));
    while (playing.size + starts.length > cap && spare.length) energize(spare.shift(), false);
    starts = starts.slice(0, Math.max(0, cap - playing.size));
    starts.forEach((t) => energize(t, true));
  }

  function startTicker() { if (!timer) timer = setInterval(tick, TICK); }
  function stopTicker() { clearInterval(timer); timer = 0; }

  /* ---------- cursor: o card sob ele toca ---------- */

  function setHover(t) {
    if (t === hoverTile) return;
    if (hoverTile) hoverTile.classList.remove('is-hv');
    hoverTile = t || null;
    if (t) t.classList.add('is-hv');
    tick();
  }
  function onOver(e) {
    const t = e.target && e.target.closest ? e.target.closest('.hc2-layer--color .hc2-tile') : null;
    // atrás do texto ninguém reage: quem lê não dispara vídeos escondidos
    setHover(t && !t.closest('.hc2-col--mid') ? t : null);
  }
  function onLeave() { setHover(null); }

  /* ---------- liga/desliga: fora da tela ou aba oculta ---------- */

  // o clipe do título só toca enquanto o texto está à vista
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
    hero.classList.toggle('hc2-off', !run);
    animsC.concat(animsG).forEach((a) => (run ? a.play() : a.pause()));
    syncHeadClip();
    if (run) { startTicker(); tick(); } else {
      stopTicker();
      playing.forEach((t) => energize(t, false));
    }
  }

  /* ---------- entrada: do cinza à cor, até 100% ---------- */

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
    gsap.set([badge, el.veil], { opacity: 0 });
    gsap.set(badge, { y: 14 });
    gsap.set(lines, { yPercent: 45, opacity: 0 });
    gsap.set(pill, { scale: 0.5 });
    gsap.set(rest, { y: 14, opacity: 0 });
    gsap.set([el.fx, el.flare], { opacity: 0 });
    gsap.set(el.line, { scaleX: 0 });
    gsap.set(el.readout, { opacity: 0, x: 12 });
    st.rise = -0.2;
    root.classList.add('hc2-go');

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(el.bg, { opacity: 1, duration: 1.8, ease: 'sine.out' }, 0)
      // as colunas chegam cinzas, cada uma pelo lado de onde deriva
      .to(colsIn, { y: 0, opacity: 1, duration: 1.8, stagger: (i) => 0.09 * Math.abs(cols[i % N].rel) }, 0.1)
      // o texto assenta sobre o véu
      .to(el.veil, { opacity: 1, duration: 1.4, ease: 'sine.out' }, 0.2)
      .to(badge, { y: 0, opacity: 1, duration: 1.3 }, 0.3)
      .to(lines, { yPercent: 0, opacity: 1, duration: 1.5, stagger: 0.1 }, 0.4)
      .to(pill, { scale: 1, duration: 1.4 }, 0.55)
      .to(rest, { y: 0, opacity: 1, duration: 1.2, stagger: 0.08 }, 0.75)
      // ignição na base
      .to(el.fx, { opacity: 1, duration: 0.5, ease: 'sine.out' }, 1.05)
      .to(el.line, { scaleX: 1, duration: 1.3 }, 1.05)
      .to(el.flare, { opacity: 1, duration: 0.35, ease: 'sine.out' }, 1.1)
      .to(el.flare, { opacity: 0, duration: 1.5, ease: 'sine.inOut' }, 1.5)
      .to(el.readout, { opacity: 1, x: 0, duration: 1 }, 1.3)
      .add(() => { st.ready = true; tick(); }, 1.4)
      .to(st, { rise: 0, duration: 0.7, ease: 'power3.out', onUpdate: render }, 1.05)
      // a carga sobe sem pressa até o topo: a parede inteira vira cor
      .to(st, { rise: 1, duration: 3.6, ease: 'power2.inOut', onUpdate: render, onComplete: finishCharge }, 1.6);
    return tl;
  }

  /* ---------- rolagem: a passagem para a próxima seção ---------- */

  function scrollStory() {
    if (!hasST) return;
    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.6,
        invalidateOnRefresh: true,
        // rolou antes da carga terminar: ela completa mais depressa
        onUpdate(self) { if (!st.charged && introTl && self.progress > 0.01) introTl.timeScale(3); }
      }
    })
      .to([el.copy, el.veil], { y: () => -window.innerHeight * 0.1, duration: 0.6, ease: 'power1.in' }, 0)
      .to([el.copy, el.veil], { opacity: 0, duration: 0.32, ease: 'power1.in' }, 0)
      .to(st, { exit: 1, duration: 1, onUpdate: renderExit }, 0)
      .to(el.curtain, { y: () => -window.innerHeight * 0.85, duration: 1, ease: 'power1.inOut' }, 0);

    gsap.fromTo('.hc2-next-t span', { y: 36, opacity: 0 }, {
      y: 0, opacity: 1, duration: 1.3, ease: 'expo.out', stagger: 0.1,
      scrollTrigger: { trigger: '.hc2-next', start: 'top 82%', toggleActions: 'play none none reverse' }
    });
  }

  /* ---------- modos ---------- */

  function startLive() {
    root.classList.remove('hc2-static');
    const m = metrics();
    Object.assign(st, {
      m, H: m.H, rise: -0.2, exit: 0, f: null, d: null, pct: -1, fo: -1, exitDone: -1,
      charged: false, flashed: false, swept: false, ready: false, running: false, visible: true
    });
    el.front.style.visibility = '';
    buildWall(m, true, true);
    measure();
    render();

    introTl = intro();
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
        buildWall(m2, true, !st.charged);
        if (st.charged) cols.forEach((c) => c.tiles.forEach((t) => { t._zapped = true; }));
        if (st.running) animsC.concat(animsG).forEach((a) => a.play());
        measure();
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
    hero.addEventListener('pointerleave', onLeave);
    sync();

    return () => {
      stopTicker();
      io.disconnect();
      clearTimeout(rz);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('resize', onResize);
      el.wall.removeEventListener('pointerover', onOver);
      hero.removeEventListener('pointerleave', onLeave);
      clearWall();
      [el.front, el.win, el.winIn, el.lit, el.litIn, el.sweep, el.sweepIn].forEach((n) => { if (n) n.style.transform = ''; });
      el.front.style.opacity = '';
      el.front.style.visibility = '';
      hero.classList.remove('hc2-off', 'hc2-full');
      st.running = false;
      st.ready = false;
      introTl = null;
    };
  }

  function startCalm() {
    root.classList.add('hc2-static', 'hc2-go');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce && el.headClip) {
      el.headClip.removeAttribute('autoplay');
      el.headClip.pause();
    }
    st.m = metrics();
    buildWall(st.m, false, false);
    measure();
    let rz = 0;
    const onResize = () => {
      clearTimeout(rz);
      rz = setTimeout(() => {
        const m2 = metrics();
        if (m2.W === st.m.W && m2.H === st.m.H) return;
        st.m = m2;
        buildWall(m2, false, false);
        measure();
      }, 200);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(rz);
      window.removeEventListener('resize', onResize);
      clearWall();
    };
  }

  // espera a fonte (as medidas do texto definem o véu)
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 700))]).then(() => {
    const mm = gsap.matchMedia();
    mm.add({
      live: '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
      calm: '(max-width: 899px), (prefers-reduced-motion: reduce)'
    }, (ctx) => (ctx.conditions.live ? startLive() : startCalm()));
  });
})();
