/* ============================================================
   Hero C — Radial
   Parede de cards de vídeo em colunas completas que derivam em
   sentidos alternados (a parede da opção C2). Tudo começa "antes":
   cinza e parado. Na entrada, o clipe do título acende e dele nasce
   uma onda de energia circular que cobre a parede inteira: dentro do
   círculo, cor e vida ("depois"); na borda, um aro lima suave. Cada
   card reage uma única vez quando o aro o alcança; "vidas de verdade"
   acende quando a onda passa por ela. Depois a cena fica calma.

   Como a cor muda exatamente dentro do círculo, sem custo:
   - a parede existe duas vezes durante a onda, alinhada pixel a
     pixel: a camada cinza (imagens com filtro estático) e a colorida
     (vídeos com pôster) numa janela circular .shcr-win;
   - a janela cresce por escala (s) em torno do clipe e o conteúdo é
     contra-escalado (1/s) em torno do mesmo ponto: as duas escalas se
     anulam e o recorte acompanha o raio — só transform. Terminada a
     onda, o recorte sai de cena e a camada cinza é descartada;
   - as colunas derivam com Web Animations (compositor), cinza e
     colorida com o mesmo relógio;
   - um agendador leve (a cada ~340 ms) deixa tocar no máximo 4 vídeos
     (+1 pelo cursor): na onda, logo atrás do aro; depois, em rodízio.

   Rolagem (de verdade, sem palco preso): o hero sobe e o statement do
   index chega de baixo; alguns cards se soltam e viajam com a rolagem
   até as mídias do statement, encontram-nas em movimento e se fundem
   nelas; outros viram os quadradinhos (ver "Passagem para o statement").
   ============================================================ */

(() => {
  'use strict';

  const root = document.documentElement;
  const hero = document.querySelector('.shcr-hero');
  if (!hero) return;
  if (!window.gsap) { root.classList.add('shcr-go'); return; }
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
  const RING_PAD = 60;  // px: o aro sai inteiro da tela antes de sumir

  const q = (s) => hero.querySelector(s);
  const qa = (s) => Array.from(hero.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const el = {
    wall: q('.shcr-wall'),
    gray: q('.shcr-layer--gray'),
    color: q('.shcr-layer--color'),
    win: q('.shcr-win'),
    winIn: q('.shcr-win-in'),
    ring: q('.shcr-ring'),
    spark: q('.shcr-spark'),
    charge: q('.shcr-charge'),
    lit: q('.shcr-lit'),
    litIn: q('.shcr-lit-in'),
    sweep: q('.shcr-sweep'),
    sweepIn: q('.shcr-sweep-in'),
    copy: q('.hero-copy'),
    veil: q('.shcr-veil'),
    curtain: q('.shcr-curtain'),
    bg: q('.rich-bg'),
    pill: q('.title-clip'),
    headClip: q('.title-clip video')
  };

  const st = {
    m: null, H: 0,
    prog: 0, exit: 0,
    s: null, sl: null, ro: -1, exitDone: -1,
    O: { x: 0, y: 0 }, R: 1000, lit: null, copy: null,
    charged: false, swept: false,
    ready: false, visible: true, running: false
  };

  let cols = [];        // dados de cada coluna
  let animsG = [];      // deriva da camada cinza (só durante a onda)
  let animsC = [];      // deriva da camada colorida
  const playing = new Set();
  let hoverTile = null;
  let timer = 0;
  let introTl = null;

  /* ---------- medidas ---------- */

  function metrics() {
    const W = hero.clientWidth;
    const H = hero.clientHeight;
    // o tamanho de card da opção C2
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
    let x = 0;
    let y = 0;
    while (node && node !== hero) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent; }
    return { x, y };
  }

  function measure(m) {
    // caixa do texto: o véu se ajusta a ela e ninguém toca atrás dela
    const items = [q('.hero-badge'), ...qa('.title .line'), q('.sub'), q('.actions'), q('.next-stop')];
    const box = { l: Infinity, r: -Infinity, t: Infinity, b: -Infinity };
    items.forEach((n) => {
      const o = offsetIn(n);
      box.l = Math.min(box.l, o.x);
      box.r = Math.max(box.r, o.x + n.offsetWidth);
      box.t = Math.min(box.t, o.y);
      box.b = Math.max(box.b, o.y + n.offsetHeight);
    });
    st.copy = box;
    hero.style.setProperty('--shcr-copy-w', Math.round(box.r - box.l) + 'px');
    hero.style.setProperty('--shcr-copy-h', Math.round(box.b - box.t) + 'px');
    hero.style.setProperty('--shcr-copy-cy', Math.round((box.t + box.b) / 2) + 'px');

    // origem da onda: o centro do clipe do título
    const po = offsetIn(el.pill);
    const O = { x: po.x + el.pill.offsetWidth / 2, y: po.y + el.pill.offsetHeight / 2 };
    st.O = O;
    const W = m.W;
    const H = m.H;
    st.R = Math.ceil(Math.max(
      Math.hypot(O.x, O.y), Math.hypot(W - O.x, O.y),
      Math.hypot(O.x, H - O.y), Math.hypot(W - O.x, H - O.y)
    )) + RING_PAD;
    hero.style.setProperty('--shcr-ox', O.x.toFixed(1) + 'px');
    hero.style.setProperty('--shcr-oy', O.y.toFixed(1) + 'px');
    hero.style.setProperty('--shcr-d', (st.R * 2) + 'px');
    hero.style.setProperty('--shcr-w', W + 'px');
    hero.style.setProperty('--shcr-h', H + 'px');

    // a janela de "vidas de verdade" usa a mesma origem, no referencial da linha
    if (el.charge && el.lit) {
      const lo = offsetIn(el.charge);
      const lw = el.charge.offsetWidth;
      const lh = el.charge.offsetHeight;
      const lox = O.x - lo.x;
      const loy = O.y - lo.y;
      const pad = 48;
      const lr = Math.ceil(Math.max(
        Math.hypot(lox + pad, loy + pad), Math.hypot(lw + pad - lox, loy + pad),
        Math.hypot(lox + pad, lh + pad - loy), Math.hypot(lw + pad - lox, lh + pad - loy)
      ));
      el.charge.style.setProperty('--shcr-lox', lox.toFixed(1) + 'px');
      el.charge.style.setProperty('--shcr-loy', loy.toFixed(1) + 'px');
      el.charge.style.setProperty('--shcr-ld', (lr * 2) + 'px');
      el.charge.style.setProperty('--shcr-lw', lw + 'px');
      el.charge.style.setProperty('--shcr-lh', lh + 'px');
      st.lit = { lr, near: Math.max(0, Math.hypot(clamp(lox, 0, lw) - lox, clamp(loy, 0, lh) - loy)) };
    }
    st.s = null;
    st.sl = null;
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
    fig.className = 'shcr-tile';
    const poster = BASE + clip + '.jpg';
    if (color) {
      // vídeo sem src até tocar pela primeira vez: o pôster colorido
      // aparece de graça e a rede só trabalha para quem toca
      const v = document.createElement('video');
      setVideoFlags(v);
      v.poster = poster;
      v.dataset.src = BASE + clip + '.mp4';
      const live = document.createElement('i');
      live.className = 'shcr-live';
      fig.append(v, live);
      fig._v = v;
    } else {
      const img = document.createElement('img');
      img.className = 'shcr-g';
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
    hero.style.setProperty('--shcr-gap', m.gap + 'px');
    hero.style.setProperty('--shcr-th', m.th + 'px');
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
        wrap.className = Math.abs(rel) <= 1 ? 'shcr-col shcr-col--mid' : 'shcr-col';
        wrap.style.cssText = `left:${left}px;width:${m.cw}px`;
        const inner = document.createElement('div');
        inner.className = 'shcr-col-in';
        const track = document.createElement('div');
        track.className = 'shcr-track';
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

  // posição (topo) da trilha na tela, a partir do relógio da deriva
  function trackY(col) {
    const ct = col.aC.currentTime || 0;
    return col.from + (col.to - col.from) * ((ct % col.dur) / col.dur);
  }

  /* ---------- a onda ---------- */

  // o aro chegou ao card: borda acesa, faixa de luz e um respiro de escala
  function zap(t) {
    t._zapped = true;
    const z = document.createElement('i');
    z.className = 'shcr-zap';
    t.append(z);
    t.classList.add('is-zap');
    setTimeout(() => { z.remove(); t.classList.remove('is-zap'); }, 1250);
  }
  function zapReached(r) {
    const m = st.m;
    const O = st.O;
    for (const col of cols) {
      if (!col.aC) continue;
      const ty = trackY(col);
      const cx = col.left + m.cw / 2;
      for (let k = 0; k < col.tiles.length; k++) {
        const t = col.tiles[k];
        if (t._zapped) continue;
        const cy = ty + k * m.pitch + m.th / 2;
        if (cy < m.th * 0.2 || cy > m.H - m.th * 0.15) continue; // fora da tela
        if (Math.hypot(cx - O.x, cy - O.y) <= r) zap(t);
      }
    }
  }

  function render() {
    const s = Math.round(Math.max(0.001, st.prog) * 10000) / 10000;
    if (s === st.s) return;
    st.s = s;
    const r = s * st.R;
    el.win.style.transform = `scale(${s})`;
    el.winIn.style.transform = `scale(${(1 / s).toFixed(5)})`;
    el.ring.style.transform = `scale(${s})`;

    // o aro acende logo ao nascer e some depois de sair pelos cantos
    const ro = Math.round(clamp(r / 80, 0, 1) * clamp((st.R - r) / (RING_PAD + st.R * 0.06), 0, 1) * 100) / 100;
    if (ro !== st.ro) { st.ro = ro; el.ring.style.opacity = ro; }

    if (!st.charged) zapReached(r);

    // "vidas de verdade": a cópia lima cresce no mesmo círculo
    if (st.lit) {
      const sl = Math.round(clamp(r / st.lit.lr, 0.001, 1) * 10000) / 10000;
      if (sl !== st.sl) {
        st.sl = sl;
        el.lit.style.transform = `scale(${sl})`;
        el.litIn.style.transform = `scale(${(1 / sl).toFixed(5)})`;
        if (sl >= 1 && !st.swept) {
          st.swept = true;
          el.lit.style.transform = '';
          el.litIn.style.transform = '';
          el.charge.classList.add('shcr-lit-done');
          sweep(0.05);
        }
      }
    }
  }

  // onda concluída: o recorte sai, a camada cinza deixa de existir
  function finishCharge() {
    if (st.charged) return;
    st.prog = 1;
    render();
    st.charged = true;
    dropGray();
    el.win.style.transform = '';
    el.winIn.style.transform = '';
    el.ring.style.transform = '';
    el.ring.style.opacity = 0;
    hero.classList.add('shcr-done');
    if (el.charge) {
      el.lit.style.transform = '';
      el.litIn.style.transform = '';
      el.charge.classList.add('shcr-lit-done');
    }
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

  /* ---------- quem toca: logo atrás do aro, depois rodízio ---------- */

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
    if (!st.ready || !st.running || st.s === null) return;
    if (hand.mode !== 'live') return;   // a página rolou: a parede fica parada e calada
    const m = st.m;
    const H = m.H;
    const now = performance.now();
    const r = st.charged ? Infinity : st.s * st.R;
    const O = st.O;
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
        if (y1 <= 0 || y0 >= H) continue;
        const vis = (Math.min(y1, H * 0.97) - Math.max(y0, H * 0.09)) / m.th;
        if (vis < 0.55) continue;
        const cy = (y0 + y1) / 2;
        const d = Math.hypot(cx - O.x, cy - O.y);
        if (d > r) continue;                              // ainda cinza
        const t = col.tiles[k];
        visible.add(t);
        // atrás do texto e do véu ninguém toca
        if (cp && cx > cp.l - 40 && cx < cp.r + 40 && cy > cp.t - 30 && cy < cp.b + 30) continue;
        let score = vis;
        if (playing.has(t)) score += now - t._since > AGE ? -1 : 0.3; // rodízio com histerese
        if (!playing.has(t) && t._stop && now - t._stop < 12000) score -= 0.5;
        if (!st.charged) score -= Math.abs(r - d) / st.R;      // logo atrás do aro
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
    const t = e.target && e.target.closest ? e.target.closest('.shcr-layer--color .shcr-tile') : null;
    // atrás do texto ninguém reage: quem lê não dispara vídeos escondidos
    setHover(t && !t.closest('.shcr-col--mid') ? t : null);
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
    hero.classList.toggle('shcr-off', !run);
    animsC.concat(animsG).forEach((a) => (run && hand.mode === 'live' ? a.play() : a.pause()));
    syncHeadClip();
    if (run) { startTicker(); tick(); } else {
      stopTicker();
      playing.forEach((t) => energize(t, false));
    }
  }

  /* ---------- entrada: do clipe para a parede inteira ---------- */

  function intro() {
    const N = cols.length;
    const colsIn = cols.map((c) => c.gIn).concat(cols.map((c) => c.cIn));
    const badge = q('.hero-badge');
    const lines = qa('.title .line');
    const rest = [q('.sub'), q('.actions'), q('.next-stop')];

    // estados de partida explícitos (fora da timeline: nada os reverte)
    gsap.set(el.bg, { opacity: 0 });
    gsap.set(colsIn, { y: (i) => -cols[i % N].dir * 120, opacity: 0 });
    gsap.set([badge, el.veil], { opacity: 0 });
    gsap.set(badge, { y: 14 });
    gsap.set(lines, { yPercent: 45, opacity: 0 });
    gsap.set(el.pill, { scale: 0.5 });
    gsap.set(rest, { y: 14, opacity: 0 });
    gsap.set(el.spark, { opacity: 0, scale: 0.15 });
    st.prog = 0;
    root.classList.add('shcr-go');

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(el.bg, { opacity: 1, duration: 1.8, ease: 'sine.out' }, 0)
      // as colunas chegam cinzas, cada uma pelo lado de onde deriva
      .to(colsIn, { y: 0, opacity: 1, duration: 1.8, stagger: (i) => 0.09 * Math.abs(cols[i % N].rel) }, 0.1)
      // o texto assenta sobre o véu
      .to(el.veil, { opacity: 1, duration: 1.4, ease: 'sine.out' }, 0.2)
      .to(badge, { y: 0, opacity: 1, duration: 1.3 }, 0.3)
      .to(lines, { yPercent: 0, opacity: 1, duration: 1.5, stagger: 0.1 }, 0.4)
      .to(el.pill, { scale: 1, duration: 1.4 }, 0.55)
      .to(rest, { y: 0, opacity: 1, duration: 1.2, stagger: 0.08 }, 0.75)
      // ignição: o clipe do título pulsa e acende a primeira luz
      .to(el.pill, { scale: 1.08, duration: 0.28, ease: 'power2.out' }, 1.25)
      .to(el.pill, { scale: 1, duration: 0.9, ease: 'power3.out' }, 1.53)
      .to(el.spark, { opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' }, 1.25)
      .to(el.spark, { opacity: 0, scale: 1.6, duration: 1.4, ease: 'sine.inOut' }, 1.7)
      .add(() => { st.ready = true; tick(); }, 1.4)
      // a onda se espalha sem pressa até cobrir a parede inteira
      .to(st, { prog: 1, duration: 3.8, ease: 'power2.inOut', onUpdate: render, onComplete: finishCharge }, 1.35);
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
        scrub: root.classList.contains('has-smooth-scroll') ? 0.35 : 0.6,
        invalidateOnRefresh: true,
        // rolou antes da onda terminar: ela completa mais depressa
        onUpdate(self) { if (!st.charged && introTl && self.progress > 0.01) introTl.timeScale(3); }
      }
    })
      .to([el.copy, el.veil], { y: () => -window.innerHeight * 0.1, duration: 0.6, ease: 'power1.in' }, 0)
      .to([el.copy, el.veil], { opacity: 0, duration: 0.32, ease: 'power1.in' }, 0)
      .to(st, { exit: 1, duration: 1, onUpdate: renderExit }, 0)
      .to(el.curtain, { y: () => -window.innerHeight * 0.85, duration: 1, ease: 'power1.inOut' }, 0);

  }

  /* ============================================================
     Passagem para o statement — rolagem de verdade (sem palco preso)
     O hero sobe com a página e o statement chega de baixo, como no
     index (seção alta com palco sticky). Na mesma rolagem, alguns cards
     se soltam da parede e viajam (camada fixa de "voadores"): no começo
     sobem com o hero, depois ficam para trás e vão ao encontro das
     mídias que vêm subindo; encontram-se em movimento e se fundem nelas
     (só translação + escala uniforme; a diferença de proporção some no
     cruzamento das imagens). Depois as mídias seguem a paralaxe do
     statement. Outros cards viram os quadradinhos; o resto da parede
     sobe e escurece com o hero.
     O statement em si segue a lógica do index: a frase preenche palavra
     por palavra durante o palco fixo, mídias e quadrados sobem cada um
     no seu curso e o fechamento entra no fim.
     Tudo é conta (posições de layout medidas uma vez), e por quadro só
     se escreve transform/opacity do que mudou.
     ============================================================ */

  const stSec = document.querySelector('.shcr-st');
  const S = stSec ? {
    stage: stSec.querySelector('.shcr-st-stage'),
    words: Array.from(stSec.querySelectorAll('.shcr-sw')),
    outro: stSec.querySelector('.shcr-outro'),
    media: Array.from(stSec.querySelectorAll('.shcr-bm')),
    squares: Array.from(stSec.querySelectorAll('.shcr-bsq')),
    video: stSec.querySelector('.shcr-bm video')
  } : null;
  const flyLayer = document.querySelector('.shcr-flyers');

  const hand = {
    mode: 'live',       // 'live' = hero vivo · 'scrub' = a página já rolou
    on: false,          // passagem ativa (movimento, tela larga)
    plan: null,
    g: null,            // medidas do statement
    s: -1
  };
  // quem voa: as duas mídias que chegam com a seção e alguns quadradinhos
  // (as outras duas mídias chegam sozinhas mais tarde, como no site)
  const FLIGHTS = [
    { slot: 'shcr-bm-1', a: 0.1, b: 0.9 },
    { slot: 'shcr-bm-5', a: 0.14, b: 1.0 },
    { slot: 'shcr-bsq-5', a: 0.2, b: 0.95 },
    { slot: 'shcr-bsq-10', a: 0.24, b: 1.02 },
    { slot: 'shcr-bsq-1', a: 0.28, b: 1.08 },
    { slot: 'shcr-bsq-4', a: 0.3, b: 1.28 },
    { slot: 'shcr-bsq-2', a: 0.34, b: 1.34 }
  ];

  const c01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const seg = (v, a, b) => c01((v - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const eIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const gp = (t, p) => (t ? gsap.getProperty(t, p) || 0 : 0);

  // escreve só o que mudou
  function setT(n, v) { if (n && n._t !== v) { n._t = v; n.style.transform = v; } }
  function setO(n, v) {
    if (!n) return;
    const s = v >= 0.999 ? '1' : v <= 0.001 ? '0' : v.toFixed(3);
    if (n._o !== s) { n._o = s; n.style.opacity = s; }
  }
  // (_v já é o vídeo do card: aqui o cache da visibilidade é _vz)
  function setVis(n, on) {
    const s = on ? '' : 'hidden';
    if (n && n._vz !== s) { n._vz = s; n.style.visibility = s; }
  }

  /* medidas do statement: posição de layout das vagas (sem transform) */
  function measureSt() {
    if (!S) return;
    const vh = window.innerHeight;
    const top = stSec.getBoundingClientRect().top + window.scrollY;
    const slots = S.media.concat(S.squares).map((n) => {
      const cs = getComputedStyle(n);
      const bg = cs.backgroundColor;
      return {
        el: n,
        key: Array.from(n.classList).find((c) => /^shcr-(bm|bsq)-\d+$/.test(c)),
        sq: n.classList.contains('shcr-bsq'),
        x: n.offsetLeft,
        y: n.offsetTop,
        w: n.offsetWidth,
        h: n.offsetHeight,
        range: parseFloat(n.dataset.range) || 800,
        color: bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : 'rgba(168, 255, 53, 0.04)',
        border: parseFloat(cs.borderTopWidth) || 0
      };
    });
    hand.g = { vh, top, h: stSec.offsetHeight, slots };
    hand.plan = null;
  }

  // o statement como no index: progresso do palco fixo (0–1)
  const stP = (s) => {
    const g = hand.g;
    const span = g.h - g.vh;
    return c01(span > 0 ? (s - g.top) / span : 0);
  };
  // topo do palco na tela (entra por baixo, gruda, sai por cima)
  const stageTop = (s) => {
    const g = hand.g;
    const y = g.top - s;
    return y > 0 ? y : Math.min(0, g.top + g.h - g.vh - s);
  };
  // centro de uma vaga na tela, com a paralaxe do statement
  const slotC = (sl, s) => ({
    x: sl.x + sl.w / 2,
    y: stageTop(s) + sl.y + sl.h / 2 + (0.5 - stP(s)) * sl.range * (hand.g.vh / 1200)
  });

  /* a parede para de derivar quando a página rola (a posição de cada card
     passa a depender só da rolagem) e volta a derivar no topo */
  function enterScrub() {
    hand.mode = 'scrub';
    if (hoverTile) setHover(null);
    animsC.concat(animsG).forEach((a) => a.pause());
    if (!st.charged && introTl) introTl.timeScale(4);
    hand.plan = null;
  }
  function exitScrub() {
    hand.mode = 'live';
    clearFlights();
    if (st.running) animsC.concat(animsG).forEach((a) => a.play());
    tick();
  }

  function clearFlights() {
    if (hand.plan) {
      hand.plan.flights.forEach((f) => { setVis(f.t, true); });
      hand.plan.flights.forEach((f) => { if (f.sl) setO(f.sl.el, 1); });
    }
    if (flyLayer) flyLayer.textContent = '';
    hand.plan = null;
  }

  // o voador parte com o quadro exato em que o vídeo do card parou
  function snapFrame(f) {
    f.snap = true;
    const v = f.t._v;
    if (!v || v.readyState < 2 || !v.videoWidth || v.currentTime < 0.05) return;
    try {
      const m = st.m;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const cv = document.createElement('canvas');
      cv.width = Math.round(m.cw * dpr);
      cv.height = Math.round(m.th * dpr);
      const k = Math.max(cv.width / v.videoWidth, cv.height / v.videoHeight);
      const w = v.videoWidth * k;
      const h = v.videoHeight * k;
      cv.getContext('2d').drawImage(v, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
      f.img.replaceWith(cv);
      f.img = cv;
    } catch (e) { /* fica o pôster */ }
  }

  /* o plano: quais cards voam e para onde (posição de cada card com a
     página no topo, por conta — a parede está parada) */
  function buildPlan() {
    const m = st.m;
    const vh = hand.g.vh;
    const tiles = [];
    cols.forEach((col) => {
      if (!col.aC) return;
      const ty = trackY(col) + gp(col.cIn, 'y');
      const cx = col.left + m.cw / 2;
      col.tiles.forEach((t, k) => {
        const top = ty + k * m.pitch;
        // inteiros e longe das bordas; atrás do texto também vale
        if (top < vh * 0.06 || top + m.th > vh * 0.97) return;
        tiles.push({ t, col, cx, cy0: top + m.th / 2, mid: Math.abs(col.rel) <= 1 });
      });
    });
    const used = new Set();
    const flights = [];
    FLIGHTS.forEach((F) => {
      const sl = hand.g.slots.find((x) => x.key === F.slot);
      if (!sl) return;
      // o card mais perto do ponto de encontro (com a página já rolada)
      const sB = F.b * vh;
      const c = slotC(sl, sB);
      let best = null;
      let bd = Infinity;
      tiles.forEach((o) => {
        if (used.has(o)) return;
        const d = Math.hypot(o.cx - c.x, (o.cy0 - sB * 0.35) - c.y);
        if (d < bd) { bd = d; best = o; }
      });
      if (!best) return;
      used.add(best);
      const f = { t: best.t, col: best.col, cx: best.cx, cy0: best.cy0, sl, a: F.a, b: F.b, sT: sl.w / m.cw, snap: false };
      // o voador: cópia leve do card
      const fx = document.createElement('div');
      fx.className = 'shcr-flyer';
      fx.style.cssText = `width:${m.cw}px;height:${m.th}px;visibility:hidden`;
      const img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.src = best.t._v ? best.t._v.poster : '';
      fx.append(img);
      if (best.mid) {
        f.dim = document.createElement('i');
        f.dim.className = 'shcr-fdim';
        fx.append(f.dim);
      }
      if (sl.sq) {
        f.tint = document.createElement('i');
        f.tint.className = 'shcr-tint';
        f.tint.style.setProperty('--shcr-tc', sl.color);
        f.tint.style.setProperty('--shcr-tb', sl.border ? (1 / f.sT).toFixed(1) + 'px' : '0px');
        fx.append(f.tint);
      } else {
        f.rim = document.createElement('i');
        f.rim.className = 'shcr-frim';
        fx.append(f.rim);
      }
      flyLayer.append(fx);
      f.fx = fx;
      f.img = img;
      flights.push(f);
    });
    hand.plan = { flights, slots: new Set(flights.map((f) => f.sl)) };
  }

  /* desenha a passagem e o statement para a rolagem s */
  function handRender(s) {
    if (!S || !hand.g) return;
    const vh = hand.g.vh;

    // o hero: parado no topo, conduzido pela rolagem fora dele
    if (hand.on && st.m) {
      if (s > 1 && hand.mode === 'live') enterScrub();
      else if (s <= 1 && hand.mode === 'scrub') exitScrub();
      // rolou antes da onda terminar: a parede precisa estar inteira
      if (hand.mode === 'scrub' && !st.charged && introTl && s > vh * 0.06) introTl.progress(1);
      if (hand.mode === 'scrub' && st.charged && !hand.plan) buildPlan();
      if (hand.mode === 'scrub' && playing.size) playing.forEach((t) => energize(t, false));
    }

    // os voos: sobem com o hero, ficam para trás e encontram a mídia que vem subindo
    const plan = hand.mode === 'scrub' ? hand.plan : null;
    if (plan) {
      const u = s / vh;
      plan.flights.forEach((f) => {
        const k = seg(u, f.a, f.b);
        const flying = k > 0 && k < 1;
        setVis(f.t, k <= 0);
        setVis(f.fx, flying);
        if (!flying) return;
        if (!f.snap) snapFrame(f);
        const e = eIO(k);
        // onde o card estaria se tivesse ficado na parede
        const off = f.col.dir * st.H * 0.1 * st.exit;
        const tx0 = f.cx;
        const ty0 = f.cy0 - s + off;
        const c = slotC(f.sl, s);
        const x = lerp(tx0, c.x, e);
        const y = lerp(ty0, c.y, e);
        const sc = lerp(1, f.sT, f.sl.sq ? 1 - Math.pow(1 - k, 3) : e);
        setT(f.fx, `translate3d(${(x - st.m.cw / 2).toFixed(1)}px,${(y - st.m.th / 2).toFixed(1)}px,0) scale(${sc.toFixed(4)})`);
        setO(f.fx, 1 - seg(k, 0.82, 1));
        if (f.rim) setO(f.rim, Math.sin(Math.PI * c01(k * 1.6)) * 0.85);
        if (f.tint) setO(f.tint, seg(k, 0.25, 0.75));
        if (f.dim) setO(f.dim, 1 - seg(k, 0, 0.5));
      });
    }

    // o statement, como no index
    const p = stP(s);
    const vs = vh / 1200;
    hand.g.slots.forEach((sl) => {
      setT(sl.el, `translate3d(0,${((0.5 - p) * sl.range * vs).toFixed(1)}px,0)`);
      if (plan && plan.slots.has(sl)) {
        const f = plan.flights.find((x) => x.sl === sl);
        setO(sl.el, seg(seg(s / vh, f.a, f.b), 0.8, 1));
      } else {
        setO(sl.el, 1);
      }
    });
    // 1) a frase preenche palavra por palavra durante o trecho fixo
    const tp = c01((p - 0.06) / 0.74);
    for (let i = 0; i < S.words.length; i++) {
      setO(S.words[i], 0.12 + 0.88 * c01(tp * S.words.length - i));
    }
    // 3) o fechamento entra no fim do trecho
    const op = c01((p - 0.68) / 0.2);
    setO(S.outro, op);
    setT(S.outro, `translateY(${((1 - op) * 24).toFixed(1)}px)`);

    // o vídeo do statement só toca com o palco à vista
    const sTop = stageTop(s);
    const want = sTop < vh && sTop > -vh && !document.hidden;
    if (S.video) {
      if (want && S.video.paused) { const pr = S.video.play(); if (pr && pr.catch) pr.catch(() => {}); }
      else if (!want && !S.video.paused) S.video.pause();
    }
  }

  let handRaf = 0;
  const handKick = () => {
    if (handRaf) return;
    handRaf = requestAnimationFrame(() => {
      handRaf = 0;
      handRender(window.scrollY);
    });
  };

  /* rolagem suave do site (a mesma de js/portal.js): a roda chega
     suavizada e a posição continua nativa (sticky e eventos funcionam) */
  function smoothScroll() {
    let target = window.scrollY;
    let current = window.scrollY;
    let raf = null;
    root.classList.add('has-smooth-scroll');
    const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;
    const loop = () => {
      current += (target - current) * 0.062;
      if (Math.abs(target - current) < 0.5) { current = target; raf = null; } else { raf = requestAnimationFrame(loop); }
      window.scrollTo(0, current);
    };
    const onWheel = (e) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      target = Math.max(0, Math.min(maxScroll(), target + delta));
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onScroll = () => { if (!raf) { target = window.scrollY; current = window.scrollY; } };
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      root.classList.remove('has-smooth-scroll');
    };
  }

  /* liga a passagem (modo vivo) */
  function handStart() {
    hand.on = true;
    hand.mode = 'live';
    measureSt();
    const onResize = () => { clearFlights(); measureSt(); handKick(); };
    window.addEventListener('scroll', handKick, { passive: true });
    window.addEventListener('resize', onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measureSt(); handKick(); });
    handKick();
    window.__shcrHand = { hand, get playing() { return playing.size; } };
    return () => {
      window.removeEventListener('scroll', handKick);
      window.removeEventListener('resize', onResize);
      if (hand.mode === 'scrub') exitScrub();
      clearFlights();
      hand.on = false;
    };
  }
  // o statement sozinho (telas estreitas sem movimento reduzido): como no index
  function stOnly() {
    measureSt();
    const onResize = () => { measureSt(); handKick(); };
    window.addEventListener('scroll', handKick, { passive: true });
    window.addEventListener('resize', onResize);
    handKick();
    return () => {
      window.removeEventListener('scroll', handKick);
      window.removeEventListener('resize', onResize);
    };
  }
  function handResize() { clearFlights(); measureSt(); handKick(); }

  /* ---------- modos ---------- */

  function startLive() {
    root.classList.remove('shcr-static');
    hero.classList.remove('shcr-done');
    const m = metrics();
    Object.assign(st, {
      m, H: m.H, prog: 0, exit: 0, s: null, sl: null, ro: -1, exitDone: -1,
      charged: false, swept: false, ready: false, running: false, visible: true
    });
    buildWall(m, true, true);
    measure(m);
    render();

    const smoothStop = smoothScroll();
    introTl = intro();
    scrollStory();
    const handStop = handStart();

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
        measure(m2);
        if (!st.charged) render();
        st.exitDone = -1;
        renderExit();
        handResize();
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
      handStop();
      smoothStop();
      io.disconnect();
      clearTimeout(rz);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('resize', onResize);
      el.wall.removeEventListener('pointerover', onOver);
      hero.removeEventListener('pointerleave', onLeave);
      clearWall();
      [el.win, el.winIn, el.ring, el.lit, el.litIn, el.sweep, el.sweepIn].forEach((n) => { if (n) n.style.transform = ''; });
      el.ring.style.opacity = '';
      hero.classList.remove('shcr-off', 'shcr-done');
      if (el.charge) el.charge.classList.remove('shcr-lit-done');
      st.running = false;
      st.ready = false;
      introTl = null;
    };
  }

  function startCalm() {
    root.classList.add('shcr-static', 'shcr-go');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce && el.headClip) {
      el.headClip.removeAttribute('autoplay');
      el.headClip.pause();
    }
    st.m = metrics();
    buildWall(st.m, false, false);
    measure(st.m);
    const stStop = reduce ? () => {} : stOnly();
    let rz = 0;
    const onResize = () => {
      clearTimeout(rz);
      rz = setTimeout(() => {
        const m2 = metrics();
        if (m2.W === st.m.W && m2.H === st.m.H) return;
        st.m = m2;
        buildWall(m2, false, false);
        measure(m2);
      }, 200);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(rz);
      stStop();
      window.removeEventListener('resize', onResize);
      clearWall();
    };
  }

  // espera a fonte (a origem da onda e o véu dependem do texto real)
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 700))]).then(() => {
    const mm = gsap.matchMedia();
    mm.add({
      live: '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
      calm: '(max-width: 899px), (prefers-reduced-motion: reduce)'
    }, (ctx) => (ctx.conditions.live ? startLive() : startCalm()));
  });
})();
