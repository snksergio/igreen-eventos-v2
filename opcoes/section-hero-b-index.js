/* ============================================================
   Hero B no index — "O vale sobe"
   1. Base: o hero do site. Sete colunas em vale; cada coluna começa
      logo abaixo do texto que estiver acima dela (medido de verdade):
      as laterais sobem ao lado do título, o centro desce sob os botões.
      (lógica copiada de js/portal.js)
   2. Alma do Hero B: os clipes nascem cinzas. "vidas de verdade" acende
      em lima UMA vez — uma luz percorre as letras, a frase pisca e
      explode em luz — e o anel que sai dela transforma o mosaico inteiro
      em cor, card a card, com a faixa de luz e a borda de cada um.
      Depois: calma. 4 clipes tocam e trocam de vez com dissoluções
      suaves (sem flashes). Hover do B: anel local, borda, luz, vídeo.
   3. O incremento — "O vale sobe": ao rolar, o hero fica preso e cada
      coluna se ergue até a mesma linha; quem estava mais embaixo sobe
      mais. O vale se fecha num só mural de vidas transformadas e a frase
      da seção seguinte pousa sobre ele.
   Desempenho: por quadro só transform/opacity (7 colunas + véu na
   rolagem); timers e Web Animations; no máximo 5 clipes de card
   tocando (+ o da frase); tudo pausa fora da tela ou com a aba oculta.
   ============================================================ */

(() => {
  const hero = document.getElementById('shbi');
  if (!hero || !window.gsap) return;

  const root = document.documentElement;
  const mqWide = window.matchMedia('(min-width: 900px)');
  const mqRM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reload = () => window.location.reload();
  mqWide.addEventListener ? mqWide.addEventListener('change', reload) : mqWide.addListener(reload);
  mqRM.addEventListener ? mqRM.addEventListener('change', reload) : mqRM.addListener(reload);

  const RM = mqRM.matches;
  const WIDE = mqWide.matches;
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------- elementos ---------- */

  const mosaic = hero.querySelector('.shbi-mosaic');
  const cols = Array.from(mosaic.querySelectorAll('.shbi-col'));
  const copy = hero.querySelector('.shbi-copy');
  const badge = copy.querySelector('.hero-badge');
  const lines = Array.from(copy.querySelectorAll('.title .line'));
  const sub = copy.querySelector('.sub');
  const actions = copy.querySelector('.actions');
  const nextStop = copy.querySelector('.next-stop');
  const copyParts = [badge, ...lines, sub, actions, nextStop];
  const pill = copy.querySelector('.title-clip');
  const pillVideo = pill.querySelector('video');
  const halo = pill.querySelector('.shbi-halo');
  const core = pill.querySelector('.shbi-core');
  const vline = copy.querySelector('.shbi-vline');
  const vtext = vline.querySelector('.shbi-vtext');
  const lime = vline.querySelector('.shbi-lime');
  const limeIn = lime.firstElementChild;
  const hot = vline.querySelector('.shbi-hot');
  const edge = vline.querySelector('.shbi-edge');
  const burst = copy.querySelector('.shbi-burst');
  const streak = copy.querySelector('.shbi-streak');
  const waves = Array.from(hero.querySelectorAll('.shbi-wave'));
  const dim = hero.querySelector('.shbi-dim');

  const tiles = Array.from(mosaic.querySelectorAll('.shbi-tile')).map((el) => ({
    el,
    col: cols.indexOf(el.parentElement),
    video: el.querySelector('video'),
    sweep: el.querySelector('.shbi-sweep'),
    rim: el.querySelector('.shbi-rim'),
    ping: el.querySelector('.shbi-ping'),
    lit: false,
    inSet: false,
    since: 0,
    stopT: 0,
  }));
  const clips = tiles.filter((t) => t.video);

  const PLAYING = 4;   // clipes em movimento depois da transformação
  const MAX_LIT = 5;   // teto absoluto (com o hover)
  const ASPECT = 1.5;  // o anel da explosão é uma elipse 1.5× mais larga
  const S0 = 0.02;
  const SMAX = 2;

  const playV = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };

  /* ---------- o vale (copiado de js/portal.js) ---------- */

  const CLEAR_X = 28;  // folga horizontal ao redor do texto
  const CLEAR_Y = 44;  // folga entre o texto e uma coluna que começa abaixo dele
  const STEP = 34;     // cada coluna, indo para o centro, fica pelo menos isso mais baixa
  const DIP = 48;      // profundidade extra do centro do vale

  // retângulo sem o deslocamento que a entrada (GSAP) esteja segurando
  const restingRect = (el) => {
    const r = el.getBoundingClientRect();
    const y = parseFloat(gsap.getProperty(el, 'y')) || 0;
    return { left: r.left, right: r.right, top: r.top - y, bottom: r.bottom - y };
  };

  function layoutMosaic() {
    mosaic.style.marginTop = '';
    cols.forEach((c) => { c.style.marginTop = ''; });
    const n = cols.length;
    const parts = copyParts.map(restingRect);
    const titleR = restingRect(hero.querySelector('.title'));
    // a caixa do mosaico tem uma folga transparente no alto (ver o CSS):
    // o vale é medido a partir de onde as colunas começam de fato
    const base = mosaic.getBoundingClientRect().top + (parseFloat(getComputedStyle(mosaic).paddingTop) || 0);
    const baseMargin = parseFloat(getComputedStyle(mosaic).marginTop) || 0;
    const mid = (n - 1) / 2;
    // o mais alto que uma coluna pode começar: ao lado da 2ª linha do título
    const ceiling = titleR.top + (titleR.bottom - titleR.top) * 0.42;

    const tops = cols.map((col, i) => {
      const r = col.getBoundingClientRect();
      let top = ceiling;
      parts.forEach((p) => {
        if (p.right + CLEAR_X > r.left && p.left - CLEAR_X < r.right) top = Math.max(top, p.bottom + CLEAR_Y);
      });
      const t = mid ? Math.abs(i - mid) / mid : 0; // 0 no centro, 1 nas pontas
      return top + (1 - t) * DIP;
    });
    // suaviza o vale de fora para dentro e espelha
    for (let i = 1; i <= Math.floor(mid); i++) {
      tops[i] = Math.max(tops[i], tops[i - 1] + STEP);
      tops[n - 1 - i] = Math.max(tops[n - 1 - i], tops[n - i] + STEP);
    }
    for (let i = 0; i < Math.floor(n / 2); i++) {
      const d = Math.max(tops[i], tops[n - 1 - i]);
      tops[i] = tops[n - 1 - i] = d;
    }
    const minTop = Math.min(...tops);
    mosaic.style.marginTop = (baseMargin + minTop - base).toFixed(1) + 'px';
    cols.forEach((col, i) => { col.style.marginTop = (tops[i] - minTop).toFixed(1) + 'px'; });
  }

  /* ---------- medidas para a explosão, a dissolução e o vale que sobe ---------- */

  const G = { vw: 0, vh: 0, lx: 0, ly: 0, R: 1000, rise: [] };

  function measure() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    G.vw = vw; G.vh = vh;
    // mede sem os deslocamentos da rolagem
    const saved = cols.map((c) => c.style.transform);
    const savedCopy = copy.style.transform;
    cols.forEach((c) => { c.style.transform = 'none'; });
    copy.style.transform = 'none';
    const hr = hero.getBoundingClientRect();
    const mr = mosaic.getBoundingClientRect();
    const lr = vtext.getBoundingClientRect();
    const cr = copy.getBoundingClientRect();

    // a base do mosaico se dissolve no mesmo ponto da tela que no site
    hero.style.setProperty('--shbi-f0', Math.max(0, vh * 0.88 - (mr.top - hr.top)).toFixed(0) + 'px');
    hero.style.setProperty('--shbi-f1', Math.max(1, vh * 1.3 - (mr.top - hr.top)).toFixed(0) + 'px');

    // a frase: centro, cortina e explosão
    G.lx = (lr.left + lr.right) / 2 - hr.left;
    G.ly = (lr.top + lr.bottom) / 2 - hr.top;
    const em = parseFloat(getComputedStyle(vline).fontSize) || 60;
    const textW = lr.right - lr.left;
    G.limeW = lime.offsetWidth;
    G.e0 = -1.8 * em - 0.45 * em;
    G.e1 = textW + 0.5 * em - 0.45 * em;
    const u = Math.min(vw / 1440, vh / 900);
    const bw = Math.max(textW * 1.9, 640 * u);
    const bh = bw * 0.46;
    const kw = vw * 1.3;
    const kh = Math.max(16, em * 0.36);
    hero.style.setProperty('--shbi-bw', bw.toFixed(0) + 'px');
    hero.style.setProperty('--shbi-bh', bh.toFixed(0) + 'px');
    hero.style.setProperty('--shbi-kw', kw.toFixed(0) + 'px');
    hero.style.setProperty('--shbi-kh', kh.toFixed(0) + 'px');
    const cx = (lr.left + lr.right) / 2 - cr.left;
    const cy = (lr.top + lr.bottom) / 2 - cr.top;
    G.burstT = `translate(${(cx - bw / 2).toFixed(1)}px, ${(cy - bh / 2).toFixed(1)}px)`;
    G.streakT = `translate(${(cx - kw / 2).toFixed(1)}px, ${(cy - kh / 2).toFixed(1)}px)`;

    // cada card: centro, distância elíptica até a frase e direção da luz
    let far = 0;
    tiles.forEach((t) => {
      const r = restingRect(t.el);
      const x = (r.left + r.right) / 2 - hr.left;
      const y = (r.top + r.bottom) / 2 - hr.top;
      const w = r.right - r.left;
      const h = r.bottom - r.top;
      t.el.style.setProperty('--shbi-sw', (Math.hypot(w, h) * 1.3).toFixed(0) + 'px');
      Object.assign(t, { w, h, x, y });
      t.dist = Math.max(0, Math.hypot(x - G.lx, (y - G.ly) * ASPECT) - 0.3 * Math.min(w, h));
      t.dir = Math.atan2(y - G.ly, x - G.lx);
      if (y - h / 2 < vh) far = Math.max(far, t.dist + Math.min(w, h));
    });
    G.R = far * 1.1;
    hero.style.setProperty('--shbi-ww', G.R.toFixed(0) + 'px');
    hero.style.setProperty('--shbi-wh', (G.R / ASPECT).toFixed(0) + 'px');

    // o vale sobe: cada coluna até a mesma linha, logo abaixo do menu
    const line = Math.max(104, vh * 0.12);
    G.rise = cols.map((c) => line - (c.getBoundingClientRect().top - hr.top));

    cols.forEach((c, i) => { c.style.transform = saved[i]; });
    copy.style.transform = savedCopy;
  }

  // na tela e acima da dissolução da base
  const onShow = (t) => {
    const r = t.el.getBoundingClientRect();
    // pelo menos ~um terço do card à vista, acima do começo da dissolução
    return r.right > 0 && r.left < G.vw && r.bottom > 110 && r.top < G.vh * 0.88 - (r.bottom - r.top) * 0.33;
  };

  /* ---------- estados dos cards ---------- */

  let active = WIDE && !RM;
  let started = false;
  let hovered = null;
  let timers = [];
  const later = (ms, fn) => { const id = setTimeout(() => { timers = timers.filter((x) => x !== id); fn(); }, ms); timers.push(id); return id; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  function sweep(t, strength, dur, dir = t.dir) {
    const d = (Math.abs(t.w * Math.cos(dir)) + Math.abs(t.h * Math.sin(dir))) / 2 + Math.hypot(t.w, t.h) * 0.22;
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
  // começa do primeiro quadro (= a capa colorida): a dissolução é limpa
  function play(t) {
    if (!t.video || t.lit) return;
    t.lit = true;
    t.since = Date.now();
    clearTimeout(t.stopT);
    t.el.classList.add('shbi-still', 'shbi-lit');
    if (t.video.paused) { try { t.video.currentTime = 0; } catch (e) { /* sem metadados ainda */ } }
    if (active) playV(t.video);
    const lit = clips.filter((x) => x.lit);
    if (lit.length > MAX_LIT) {
      const old = lit.filter((x) => x !== hovered && x !== t).sort((a, b) => a.since - b.since)[0];
      if (old) { old.inSet = false; rest(old); }
    }
  }
  // a capa volta por cima e o vídeo para depois da dissolução
  function rest(t) {
    if (!t.lit) return;
    t.lit = false;
    t.el.classList.remove('shbi-lit');
    clearTimeout(t.stopT);
    const playing = clips.filter((x) => !x.video.paused).length;
    if (playing > MAX_LIT) t.video.pause();
    else t.stopT = setTimeout(() => { if (!t.lit) t.video.pause(); }, 1350);
  }
  function ignite(t, dir) {
    t.el.classList.add('shbi-still');
    if (t.video) play(t);
    sweep(t, 1, 950, dir);
    rimFlash(t, 1, 1500);
  }

  /* ---------- o clímax: "vidas de verdade" acende — uma vez ---------- */

  const BLAST = (() => {
    const c = [0.12, 0.78, 0.24, 1];
    const bez = (t, a, b) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
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

  function energize() {
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
    hot.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0 }], { duration: 1400, easing: 'cubic-bezier(0.2, 0, 0.3, 1)' });
    vline.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.035)', offset: 0.16 }, { transform: 'scale(1)' }], { duration: 1300, easing: 'cubic-bezier(0.2, 0, 0.2, 1)' });
    burst.animate(
      [{ opacity: 0, transform: `${G.burstT} scale(0.4)` }, { opacity: 1, offset: 0.13 }, { opacity: 0, transform: `${G.burstT} scale(1.55)` }],
      { duration: 1900, easing: 'cubic-bezier(0.15, 0.6, 0.25, 1)' }
    );
    streak.animate(
      [{ opacity: 0, transform: `${G.streakT} scaleX(0.12)` }, { opacity: 1, offset: 0.12 }, { opacity: 0, transform: `${G.streakT} scaleX(1.2)` }],
      { duration: 1250, easing: 'cubic-bezier(0.1, 0.7, 0.2, 1)' }
    );
    halo.animate(
      [{ opacity: 0.3, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(1.3)', offset: 0.34 }, { opacity: 0.3, transform: 'scale(1)' }],
      { duration: 1700, easing: 'cubic-bezier(0.3, 0, 0.2, 1)' }
    );

    // o anel que sai da frase e passa sobre o mosaico
    const dur = 2300;
    const cyOff = +gsap.getProperty(copy, 'y') || 0;
    const bx = G.lx - G.R / 2;
    const by = G.ly + cyOff - G.R / ASPECT / 2;
    const tr = (s) => `translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, 0) scale(${s})`;
    waves.forEach((w, i) => {
      const delay = i * 180;
      const k = i ? 0.5 : 1;
      w.animate([{ transform: tr(S0) }, { transform: tr(SMAX) }], { duration: dur, delay, easing: BLAST.css });
      w.animate([{ opacity: 0 }, { opacity: k * 0.9, offset: 0.06 }, { opacity: k * 0.7, offset: 0.5 }, { opacity: 0 }], { duration: dur, delay, easing: 'linear' });
    });

    // cada card ganha cor quando o anel chega; 4 deles começam a tocar
    const chosen = pickSet();
    tiles.forEach((t) => {
      const s = Math.min(SMAX, (2 * t.dist) / G.R);
      const at = BLAST.timeAt((s - S0) / (SMAX - S0)) * dur;
      setTimeout(() => {
        if (chosen.includes(t)) { t.inSet = true; ignite(t); return; }
        if (onShow(t)) { t.el.classList.add('shbi-still'); sweep(t, 1, 950); rimFlash(t, 0.9, 1400); }
        else t.el.classList.add('shbi-still');
      }, Math.min(at, dur * 0.8));
    });
    later(6500, rotate);
  }

  // os 4 que tocam: espalhados (colunas diferentes, dois de cada lado)
  function pickSet() {
    const pool = clips.filter(onShow);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const out = [];
    const usedCols = new Set();
    const bySide = [0, 0];
    for (const t of pool) {
      if (out.length >= PLAYING) break;
      const side = t.col < 3 ? 0 : t.col > 3 ? 1 : (bySide[0] <= bySide[1] ? 0 : 1);
      if (usedCols.has(t.col) || bySide[side] >= PLAYING / 2) continue;
      out.push(t); usedCols.add(t.col); bySide[side]++;
    }
    return out;
  }

  /* ---------- vida depois do clímax: um clipe cede a vez a outro ---------- */

  let lastOut = null;
  function rotate() {
    if (!active) return;
    later(5600 + Math.random() * 2600, rotate);
    if (hovered) return;
    const set = clips.filter((t) => t.inSet && t.lit).sort((a, b) => a.since - b.since);
    // o mais antigo cede a vez a um parado à vista, numa coluna livre
    let out = null;
    let next = null;
    for (const cand of set) {
      const busy = new Set(set.filter((t) => t !== cand).map((t) => t.col));
      const pool = clips.filter((t) => !t.lit && t !== lastOut && t !== hovered && !busy.has(t.col) && onShow(t));
      if (pool.length) { out = cand; next = pool.sort((a, b) => a.since - b.since)[0]; break; }
    }
    if (!out) return;
    out.inSet = false;
    rest(out);
    lastOut = out;
    later(700, () => { next.inSet = true; play(next); });
  }

  /* ---------- ligar / pausar ---------- */

  let inView = true;
  let covered = false;

  function setActive() {
    const a = WIDE && !RM && inView && !covered && !document.hidden;
    if (a === active) return;
    active = a;
    hero.classList.toggle('shbi-paused', !a);
    if (a) {
      playV(pillVideo);
      clips.forEach((t) => { if (t.lit) playV(t.video); });
      if (started) later(4000, rotate);
    } else {
      clearTimers();
      pillVideo.pause();
      clips.forEach((t) => t.video.pause());
    }
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      inView = entries[entries.length - 1].isIntersecting;
      setActive();
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', setActive);

  /* ---------- hover do Hero B ---------- */

  if (WIDE && !RM) {
    tiles.forEach((t) => {
      t.el.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch' || !started) return;
        hovered = t;
        clearTimeout(t.leaveT);
        t.el.classList.add('shbi-hover');
        t.ping.animate(
          [{ opacity: 0.9, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.22)' }],
          { duration: 1000, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
        );
        if (!t.lit) ignite(t);
      });
      t.el.addEventListener('pointerleave', () => {
        if (hovered === t) hovered = null;
        t.el.classList.remove('shbi-hover');
        if (t.video && !t.inSet) t.leaveT = setTimeout(() => { if (hovered !== t && !t.inSet) rest(t); }, 650);
      });
    });
  }

  /* ---------- montagem ---------- */

  if (!WIDE) {
    // < 900px: o vale do site, colorido e parado (sem a cena)
    layoutMosaic();
    window.addEventListener('resize', layoutMosaic);
    return;
  }

  root.classList.add('shbi-on');
  if (RM) root.classList.add('shbi-rm');
  else root.classList.add('shbi-armed');

  layoutMosaic();
  measure();

  if (RM) {
    pillVideo.removeAttribute('autoplay');
    pillVideo.pause();
    tiles.forEach((t) => t.el.classList.add('shbi-still'));
  } else {
    // ordem da entrada: do centro para fora (como no site)
    const mid = (cols.length - 1) / 2;
    const order = tiles.slice().sort((a, b) => Math.abs(a.col - mid) - Math.abs(b.col - mid) || a.y - b.y).map((t) => t.el);
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.topnav', { opacity: 0, duration: 0.6 }, 0)
      .from(hero.querySelector('.rich-bg'), { opacity: 0, duration: 1.8, ease: 'sine.out' }, 0)
      .from(badge, { opacity: 0, y: 14, duration: 0.8 }, 0.1)
      .from(lines, { opacity: 0, y: 26, duration: 1, stagger: 0.09 }, 0.18)
      .fromTo(pill, { scale: 0.18 }, { scale: 1, duration: 1.3, ease: 'expo.out' }, 0.6)
      .fromTo(core, { opacity: 1 }, { opacity: 0, duration: 1, ease: 'power2.inOut' }, 1.0)
      .fromTo(halo, { opacity: 0, scale: 0.5 }, { opacity: 0.3, scale: 1, duration: 1.6, ease: 'expo.out' }, 0.66)
      .from([sub, actions, nextStop], { opacity: 0, y: 14, duration: 0.9, stagger: 0.08 }, 0.5)
      .from(order, { opacity: 0, y: 70, duration: 1.2, ease: 'expo.out', stagger: 0.05, clearProps: 'transform,opacity' }, 0.45)
      // o clímax: a frase acende e transforma o mosaico — uma vez
      .add(() => { measure(); energize(); }, 2.35);
  }

  /* ---------- o vale sobe (rolagem) ---------- */

  if (!RM && window.ScrollTrigger) {
    const scroller = hero.parentElement;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scroller,
        start: 'top top',
        end: () => '+=' + Math.round(window.innerHeight),
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    });
    tl.to(copy, { y: () => -window.innerHeight * 0.12, opacity: 0, ease: 'power2.in', duration: 0.42 }, 0);
    // as pontas já estão no alto e mal se mexem; o centro sobe mais e por
    // último — o vale se fecha como uma onda que vem das bordas
    const mid = (cols.length - 1) / 2;
    cols.forEach((c, i) => {
      const t = Math.abs(i - mid) / mid; // 1 nas pontas, 0 no centro
      tl.to(c, { y: () => G.rise[i], ease: 'power2.inOut', duration: 0.62 }, 0.06 + (1 - t) * 0.16);
    });
    tl.fromTo(dim, { opacity: 0 }, { opacity: 0.5, ease: 'power1.inOut', duration: 0.42, immediateRender: false }, 0.55)
      .fromTo(hero.querySelector('.rich-bg'), { opacity: 1 }, { opacity: 0.55, ease: 'none', duration: 1, immediateRender: false }, 0);

    // quando o escuro da seção seguinte já cobriu o mural, tudo pausa
    ScrollTrigger.create({
      trigger: hero.parentElement.nextElementSibling,
      start: 'top -45%',
      onEnter: () => { covered = true; setActive(); },
      onLeaveBack: () => { covered = false; setActive(); },
    });
  }

  /* ---------- redimensionar ---------- */

  let rt = 0;
  const relayout = () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const saved = cols.map((c) => c.style.transform);
      const savedCopy = copy.style.transform;
      cols.forEach((c) => { c.style.transform = 'none'; });
      copy.style.transform = 'none';
      layoutMosaic();
      cols.forEach((c, i) => { c.style.transform = saved[i]; });
      copy.style.transform = savedCopy;
      measure();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }, 180);
  };
  window.addEventListener('resize', relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

  // ganchos para a verificação (sem efeito no uso normal)
  window.__shbi = {
    tiles,
    G,
    playing: () => clips.filter((t) => !t.video.paused).length,
    colour: () => tiles.filter((t) => t.el.classList.contains('shbi-still')).length,
  };
})();
