/* ============================================================
   Hero H — Painel de embarque ("A virada")
   Um painel split-flap (7 × 5) em que cada palheta é uma pessoa.

   Como uma palheta vira (o mesmo mecanismo dos painéis de aeroporto):
     - metade de cima estática  -> já mostra a PRÓXIMA face
     - metade de baixo estática -> ainda mostra a face ATUAL
     - aba de cima (gira 0 -> -90°)  com a face ATUAL
     - aba de baixo (gira 90 -> 0°)  com a PRÓXIMA face, e assenta
   A palheta tem perspective e as abas giram em rotateX, sem
   preserve-3d: nada se cruza em 3D e não há cintilação. As viradas são
   keyframes CSS (só transform e opacity, no compositor) ligadas por
   classe; o JS só troca o conteúdo das metades no início/fim.

   Desempenho: rostos "antes" são imagens cinza pré-feitas; no máximo
   5 vídeos tocando (+ o clipe do título); tudo pausa fora da tela ou
   com a aba oculta; movimento reduzido = painel colorido e parado.
   ============================================================ */
(() => {
  'use strict';

  const hero = document.getElementById('hh');
  if (!hero) return;

  const wrap = hero.querySelector('.hh-wrap');
  const copy = hero.querySelector('.hh-copy');
  const slot = hero.querySelector('.hh-slot');
  const board = hero.querySelector('.hh-board');
  const grid = hero.querySelector('.hh-grid');
  const light = hero.querySelector('.hh-light');
  const charge = hero.querySelector('.hh-charge');
  const fade = hero.querySelector('.hh-fade');
  const scrim = hero.querySelector('.hh-scrim');
  const pill = hero.querySelector('.title-clip video');
  const cta = hero.querySelector('.btn-primary');

  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NARROW = window.innerWidth < 900;
  const STATIC = RM || NARROW;

  const IMG = '../assets/img/hero-h/';
  const VID = '../assets/video/';
  const COLS = 7;
  const ROWS = 5;
  const NAV = 88;
  const MAX_LIVE = 5;

  /* ---------- as pessoas ----------
     id -> [vídeo (sem extensão) | null, object-position do vídeo]
     (o object-position reproduz exatamente o recorte 4:5 da foto) */
  const PEOPLE = {
    exe1: ['cards/gen-executiva1', '29.5% 50%'],
    exe2: ['cards/gen-executiva2', '50% 0%'],
    kart: ['cards/gen-kart', '50% 0%'],
    podc: ['cards/gen-podcast', '41.5% 50%'],
    reun: ['cards/gen-reuniao', '50% 0%'],
    walk: ['cards/gen-walk', '50% 50%'],
    carro: ['cards/sel-carro', '75% 50%'],
    escr: ['cards/sel-escritorio', '50% 50%'],
    estu: ['cards/sel-estudio', '33.6% 50%'],
    jard: ['cards/sel-jardim', '30.7% 50%'],
    mus1: ['cards/sel-musgo1', '31.4% 50%'],
    mus2: ['cards/sel-musgo2', '32.7% 50%'],
    mus3: ['cards/sel-musgo3', '39.8% 50%'],
    suv: ['cards/sel-suv', '50% 50%'],
    hand1: ['past/crowd-hands', '3.8% 50%'],
    hand2: ['past/crowd-hands', '100% 50%'],
    expo: ['past/expo-crowd', '0% 50%'],
    amanda: [null], ana: [null], bruno: [null], carla: [null],
    juliana: [null], pedro: [null], rafael: [null], thiago: [null],
    m02: [null], m03: [null], m06: [null], m12: [null], m12b: [null],
    m13: [null], m14: [null], m15: [null], m17: [null], nat1: [null],
  };

  /* quem senta onde (linha a linha). Os vídeos ficam espalhados, e os
     cinco lugares que sobram em branco na frase final (PARADA_, 16_DE__,
     AGOSTO_) são de pessoas com vídeo: elas ficam no painel, vivas,
     enquanto o destino se forma em volta delas */
  const SEATS = [
    'reun', 'ana', 'mus2', 'm02', 'hand1', 'pedro', 'kart',
    'm14', 'escr', 'juliana', 'suv', 'm12', 'nat1', 'exe1',
    'mus3', 'bruno', 'walk', 'thiago', 'expo', 'm06', 'amanda',
    'carla', 'm13', 'carro', 'm15', 'rafael', 'podc', 'mus1',
    'hand2', 'm17', 'jard', 'm03', 'exe2', 'm12b', 'estu',
  ];
  /* os primeiros a ganhar vida depois da virada (espalhados) */
  const FIRST_LIVE = ['escr', 'exe1', 'carro', 'mus2', 'podc'];

  /* a frase final, letra por palheta */
  const PHRASE = ['PRÓXIMA', 'PARADA', 'GOIÂNIA', '16 DE', 'AGOSTO'];
  const TONES = ['', '', 'lime', 'dim', 'dim'];
  const RIFFLE_CHARS = 'ABCDEGHILMNOPRSTUVX0123456789';

  /* ---------- conteúdos (objetos únicos, comparados por referência) ---------- */
  const cache = {};
  const colorOf = (id) => cache['c' + id] || (cache['c' + id] = { k: 'img', src: IMG + 'c-' + id + '.webp' });
  const greyOf = (id) => cache['g' + id] || (cache['g' + id] = { k: 'img', src: IMG + 'g-' + id + '.webp' });
  const letter = (ch, tone) => {
    const key = 't' + ch + '|' + tone;
    return cache[key] || (cache[key] = { k: 'txt', ch: ch === ' ' ? '' : ch, tone });
  };

  function paint(f, c) {
    if (f._c === c) return;
    f._c = c;
    if (c.k === 'img') {
      if (f._t) {
        f.className = 'hh-f';
        f.textContent = '';
        f._t = false;
      }
      f.style.backgroundImage = 'url("' + c.src + '")';
    } else {
      f.style.backgroundImage = 'none';
      f.className = 'hh-f hh-t' + (c.tone ? ' is-' + c.tone : '');
      f.textContent = c.ch;
      f._t = true;
    }
  }

  /* ---------- monta as palhetas ---------- */
  const mods = SEATS.map((id, i) => {
    const el = document.createElement('div');
    el.className = 'hh-m';
    const vpath = PEOPLE[id][0];
    el.innerHTML =
      '<div class="hh-h hh-st"><div class="hh-f"></div><span class="hh-cast"></span></div>' +
      '<div class="hh-h hh-sb"><div class="hh-f"></div><span class="hh-cast"></span></div>' +
      (vpath ? '<div class="hh-live"><video muted loop playsinline preload="metadata"></video></div>' : '') +
      '<div class="hh-h hh-ft"><div class="hh-f"></div><span class="hh-sh"></span></div>' +
      '<div class="hh-h hh-fb"><div class="hh-f"></div><span class="hh-sh"></span></div>' +
      '<span class="hh-gloss"></span><span class="hh-hinge"></span><span class="hh-rim"></span><span class="hh-sheen"><i></i></span><span class="hh-ping"></span>';
    grid.appendChild(el);
    const q = (s) => el.querySelector(s);
    const m = {
      i, id, el,
      r: Math.floor(i / COLS), c: i % COLS,
      ft: q('.hh-ft'), fb: q('.hh-fb'),
      fST: q('.hh-st .hh-f'), fSB: q('.hh-sb .hh-f'), fFT: q('.hh-ft .hh-f'), fFB: q('.hh-fb .hh-f'),
      shT: q('.hh-ft .hh-sh'), shB: q('.hh-fb .hh-sh'), cast: q('.hh-sb .hh-cast'), cast2: q('.hh-st .hh-cast'),
      ping: q('.hh-ping'), sheen: q('.hh-sheen i'), flipping: false, flutAt: 0,
      video: q('video'), vpath, cur: null, q: Promise.resolve(), gen: 0, timer: 0,
      isLive: false, liveAt: 0, restAt: 0, busy: false,
    };
    if (m.video) m.video.style.objectPosition = PEOPLE[id][1];
    const start = STATIC ? colorOf(id) : greyOf(id);
    paint(m.fST, start);
    paint(m.fSB, start);
    m.cur = start;
    return m;
  });
  const vmods = mods.filter((m) => m.video);
  const byId = (id) => mods.find((m) => m.id === id);

  /* ---------- medidas ---------- */
  let cw = 90, gap = 8, pad = 14, bw = 700, bh = 620;
  let dx = 0, dy = 0, heroTop = 0, pinPx = 1;

  function layout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (vw < 900) {
      cw = Math.floor(Math.min((vw - 32) / 7.85, 120));
    } else {
      // margens alinhadas ao menu do topo (5vw): o texto começa sob o logo
      // e o painel termina sob o botão Cadastre-se
      const side = Math.round(Math.max(40, vw * 0.05));
      const colGap = Math.round(Math.min(128, Math.max(52, vw * 0.04)));
      wrap.style.setProperty('--hh-side', side + 'px');
      wrap.style.setProperty('--hh-colgap', colGap + 'px');
      const copyW = copy.offsetWidth;
      const availW = vw - 2 * side - copyW - colGap;
      const availH = (vh - NAV) * 0.86;
      cw = Math.max(60, Math.floor(Math.min(availW / 7.85, availH / 6.93)));
    }
    gap = Math.round(cw * 0.085);
    pad = Math.round(cw * 0.17);
    bw = 7 * cw + 6 * gap + 2 * pad;
    bh = Math.round(5 * cw * 1.25 + 4 * gap + 2 * pad);
    hero.style.setProperty('--hh-cw', cw + 'px');
    hero.style.setProperty('--hh-gap', gap + 'px');
    hero.style.setProperty('--hh-pad', pad + 'px');
    hero.style.setProperty('--hh-bw', bw + 'px');
    hero.style.setProperty('--hh-bh', bh + 'px');

    // posição de cada palheta (para as ondas), em fração do painel
    mods.forEach((m) => {
      m.x = (pad + m.c * (cw + gap) + cw / 2) / bw;
      m.y = (pad + m.r * (cw * 1.25 + gap) + cw * 0.625) / bh;
    });

    // rolagem: para onde o painel vai (centro da tela)
    const s = slot.getBoundingClientRect();
    const st = slot.offsetParent ? hero.querySelector('.hh-stage').getBoundingClientRect() : { top: 0 };
    dx = vw / 2 - (s.left + s.width / 2);
    dy = (vh / 2 + NAV * 0.18) - (s.top - st.top + s.height / 2);
    heroTop = hero.offsetTop;
    pinPx = Math.max(1, hero.offsetHeight - vh);
  }

  /* ---------- a virada de uma palheta ---------- */
  /* As viradas são classes CSS (keyframes em hero-h.css): trocar uma classe
     não força recálculo de estilo síncrono, então dezenas de palhetas podem
     virar no mesmo quadro com um único recálculo. Duas cópias de cada
     animação (…1 / …2) se alternam para reiniciar sem forçar layout. */
  const FLIP_CLS = ['is-f1', 'is-f2', 'is-r1', 'is-r2', 'is-flut'];

  function flip(m, next, fast) {
    const cur = m.cur;
    if (cur === next) return Promise.resolve();
    // o vídeo sai de cena na hora (mesmo se ainda estiver esmaecendo):
    // a aba que cai cobre a troca
    if (m.isLive) restNow(m);
    else if (m.video) m.el.classList.add('is-cut');
    m.flipping = true;
    paint(m.fST, next);
    paint(m.fFT, cur);
    paint(m.fFB, next);
    m.alt = !m.alt;
    const cls = (fast ? 'is-r' : 'is-f') + (m.alt ? '1' : '2');
    m.el.classList.remove(...FLIP_CLS);
    m.el.classList.add(cls);
    return new Promise((resolve) => {
      let over = false;
      const done = () => {
        if (over) return;
        over = true;
        clearTimeout(m.flipT);
        m.fb.removeEventListener('animationend', onEnd);
        paint(m.fSB, next);
        m.el.classList.remove(cls);
        m.cur = next;
        m.flipping = false;
        resolve();
      };
      const onEnd = (e) => { if (e.target === m.fb) done(); };
      m.fb.addEventListener('animationend', onEnd);
      // rede de segurança (aba oculta, animação cancelada)
      m.flipT = setTimeout(done, fast ? 900 : 1600);
    });
  }

  // fila por palheta: uma virada de cada vez
  function run(m, fn) {
    m.q = m.q.then(fn).catch(() => {});
    return m.q;
  }
  async function riffle(m, steps, final, gen) {
    for (const c of steps) {
      if (m.gen !== gen) return false;
      await flip(m, c, true);
    }
    if (m.gen !== gen) return false;
    await flip(m, final, false);
    return m.gen === gen;
  }
  function schedule(m, delay, fn) {
    clearTimeout(m.timer);
    const g = ++m.gen;
    m.timer = setTimeout(() => {
      if (m.gen === g) run(m, () => fn(g));
    }, delay);
    return g;
  }

  /* ---------- vida (vídeos) ---------- */
  let active = true;     // hero visível e aba ativa
  let ready = false;     // virada concluída
  let phrase = false;    // painel mostrando a frase final
  let hovered = null;
  let live = [];
  let srcOn = false;

  function attachSources() {
    if (srcOn) return;
    srcOn = true;
    vmods.forEach((m) => {
      m.video.poster = VID + m.vpath + '.jpg';
      m.video.src = VID + m.vpath + '.mp4';
    });
  }
  const tryPlay = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };

  function goLive(m) {
    if (!m.video || m.isLive || (phrase && !m.keep)) return;
    attachSources();
    m.isLive = true;
    m.liveAt = performance.now();
    live.push(m);
    clearTimeout(m.pauseT);
    m.el.classList.remove('is-cut');
    const v = m.video;
    const show = () => { if (m.isLive) m.el.classList.add('is-live'); };
    if (!v.paused && v.readyState >= 3) show();
    else v.addEventListener('playing', show, { once: true });
    if (active) tryPlay(v);
    // teto de vídeos tocando: o mais antigo (fora do cursor) descansa
    while (live.length > MAX_LIVE) {
      const old = live.find((x) => x !== m && x !== hovered);
      if (!old) break;
      rest(old);
    }
  }
  // descansa devagar: a cor fica, o movimento para
  function rest(m) {
    if (!m.isLive) return;
    m.isLive = false;
    m.restAt = performance.now();
    live = live.filter((x) => x !== m);
    m.el.classList.remove('is-live');
    clearTimeout(m.pauseT);
    m.pauseT = setTimeout(() => { if (!m.isLive) m.video.pause(); }, 700);
  }
  // corte seco (antes de uma virada: a aba que cai cobre a troca)
  function restNow(m) {
    if (!m.isLive) return;
    m.isLive = false;
    m.restAt = performance.now();
    live = live.filter((x) => x !== m);
    m.el.classList.add('is-cut');
    m.el.classList.remove('is-live');
    clearTimeout(m.pauseT);
    m.video.pause();
  }

  // escolhe quem ganha vida: longe dos que já tocam, e que não tocou há pouco
  function pickNext() {
    const now = performance.now();
    let best = null, bestScore = -1;
    vmods.forEach((m) => {
      if (m.isLive || m.busy || m === hovered) return;
      if (live.some((o) => o.vpath === m.vpath)) return;
      // a pessoa do clipe do título não toca em dobro enquanto o título aparece
      if (m.vpath === 'cards/sel-musgo3' && !copyGone) return;
      let dmin = 9;
      live.forEach((o) => { dmin = Math.min(dmin, Math.hypot(m.c - o.c, (m.r - o.r) * 1.25)); });
      const since = m.restAt ? Math.min(1, (now - m.restAt) / 30000) : 1;
      const score = dmin * (0.4 + since) + Math.random() * 0.6;
      if (score > bestScore) { bestScore = score; best = m; }
    });
    return best;
  }

  /* vida calma: de tempos em tempos um vídeo descansa e outro começa;
     bem de vez em quando duas pessoas trocam de lugar */
  let idleT = 0, idleN = 0;
  function idleTick() {
    clearTimeout(idleT);
    if (!active || !ready || phrase) return;
    idleN++;
    if (idleN % 3 === 0) swapStill();
    else {
      const old = live.filter((m) => m !== hovered).sort((a, b) => a.liveAt - b.liveAt)[0];
      const nx = pickNext();
      if (old && live.length >= MAX_LIVE) rest(old);
      if (nx) setTimeout(() => { if (active && ready && !phrase) goLive(nx); }, 420);
    }
    idleT = setTimeout(idleTick, 5200 + Math.random() * 1600);
  }
  function swapStill() {
    const pool = mods.filter((m) => !m.video && !m.busy && m !== hovered);
    if (pool.length < 2) return;
    const a = pool[Math.floor(Math.random() * pool.length)];
    const far = pool.filter((b) => b !== a && Math.abs(b.c - a.c) + Math.abs(b.r - a.r) >= 4);
    if (!far.length) return;
    const b = far[Math.floor(Math.random() * far.length)];
    const ia = a.id, ib = b.id;
    a.id = ib;
    b.id = ia;
    schedule(a, 0, (g) => riffle(a, [], colorOf(a.id), g));
    schedule(b, 140, (g) => riffle(b, [], colorOf(b.id), g));
  }

  /* ---------- a virada (o clímax, uma vez) ---------- */
  function climax() {
    if (phrase) { ready = true; return; }
    hero.classList.add('hh-fire');
    charge.animate(
      [
        { transform: 'translate3d(-100%, 0, 0)', opacity: 0 },
        { opacity: 1, offset: 0.18 },
        { opacity: 0.9, offset: 0.7 },
        { transform: 'translate3d(185%, 0, 0)', opacity: 0 },
      ],
      { duration: 2000, easing: 'cubic-bezier(0.4, 0.12, 0.45, 1)' }
    );
    let last = 0;
    mods.forEach((m) => {
      // a frente avança da esquerda (onde está o clipe do título) para a direita,
      // levemente curva: as linhas do meio chegam primeiro
      const delay = 120 + m.x * 1180 + Math.abs(m.y - 0.5) * 260 + Math.random() * 60;
      last = Math.max(last, delay);
      schedule(m, delay, (g) => riffle(m, [], colorOf(m.id), g).then((ok) => { if (ok) glint(m); }));
    });
    setTimeout(() => {
      ready = true;
      if (phrase) return;
      FIRST_LIVE.forEach((id, k) => {
        setTimeout(() => { const m = byId(id); if (m && !phrase) goLive(m); }, k * 260);
      });
      idleT = setTimeout(idleTick, 6500);
    }, last + 520);
  }

  /* ---------- a frase final (rolagem) ---------- */
  function phraseCell(m) {
    const word = PHRASE[m.r] || '';
    const ch = word[m.c] || ' ';
    return letter(ch, TONES[m.r]);
  }
  function showPhrase() {
    if (phrase) return;
    phrase = true;
    clearTimeout(idleT);
    if (hovered) { hovered.el.classList.remove('is-hover'); hovered = null; }
    board.classList.remove('is-near');
    const keepers = mods.filter((m) => !phraseCell(m).ch && m.video);
    live.slice().forEach((m) => { if (keepers.indexOf(m) < 0) rest(m); });
    keepers.forEach((m, k) => {
      m.keep = true;
      m.gen++;
      clearTimeout(m.timer);
      // quem fica no painel aparece em cor (se ainda estiver cinza) e ganha vida
      run(m, () => flip(m, colorOf(m.id), false)).then(() => {
        if (phrase && m.keep) setTimeout(() => { if (phrase && m.keep) goLive(m); }, 500 + k * 180);
      });
    });
    mods.forEach((m) => {
      if (m.keep) return;
      const target = phraseCell(m);
      const n = target.ch ? 2 + ((m.c * 3 + m.r) % 3) : 1;
      const steps = [];
      for (let k = 0; k < n; k++) {
        steps.push(letter(RIFFLE_CHARS[Math.floor(Math.random() * RIFFLE_CHARS.length)], TONES[m.r]));
      }
      const delay = m.c * 75 + m.r * 55 + Math.random() * 40;
      schedule(m, delay, (g) => riffle(m, steps, target, g));
    });
  }
  function showFaces() {
    if (!phrase) return;
    phrase = false;
    mods.forEach((m) => { m.keep = false; });
    mods.forEach((m) => {
      const delay = (COLS - 1 - m.c) * 60 + m.r * 45 + Math.random() * 40;
      const target = ready ? colorOf(m.id) : greyOf(m.id);
      if (m.cur === target) return;
      schedule(m, delay, (g) => riffle(m, [letter(RIFFLE_CHARS[(m.i * 7) % RIFFLE_CHARS.length], '')], target, g));
    });
    if (ready) {
      setTimeout(() => {
        if (phrase) return;
        let n = 0;
        while (live.length < MAX_LIVE && n++ < 8) { const m = pickNext(); if (!m) break; goLive(m); }
        clearTimeout(idleT);
        idleT = setTimeout(idleTick, 6000);
      }, 1100);
    }
  }

  /* ---------- rolagem: o texto sai, o painel vai ao centro e vira a frase ---------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let lastP = -1, rafS = 0, copyGone = false;

  function applyScroll() {
    rafS = 0;
    const p = clamp((window.scrollY - heroTop) / pinPx, 0, 1);
    if (p === lastP) return;
    lastP = p;
    const a = easeIO(clamp(p / 0.4, 0, 1));
    const co = clamp(1 - p / 0.2, 0, 1);
    copy.style.opacity = co.toFixed(3);
    scrim.style.opacity = co.toFixed(3);
    copy.style.transform = 'translate3d(' + (-a * 48).toFixed(1) + 'px,' + (-a * 26).toFixed(1) + 'px,0)';
    const gone = co < 0.01;
    if (gone !== copyGone) {
      copyGone = gone;
      copy.style.visibility = gone ? 'hidden' : '';
      // o clipe do título não precisa tocar com o texto escondido
      if (pill) { if (gone) pill.pause(); else if (active) tryPlay(pill); }
    }
    board.style.transform = a ? 'translate3d(' + (a * dx).toFixed(1) + 'px,' + (a * dy).toFixed(1) + 'px,0)' : '';
    fade.style.opacity = clamp((p - 0.84) / 0.16, 0, 1).toFixed(3);
    if (!STATIC) {
      if (p > 0.3 && !phrase) showPhrase();
      else if (p < 0.2 && phrase) showFaces();
    }
  }
  const onScroll = () => { if (!rafS) rafS = requestAnimationFrame(applyScroll); };

  /* ---------- interação ---------- */
  const SHEEN_KF = (peak) => [
    { transform: 'translate3d(-110%,0,0)', opacity: 0 },
    { opacity: peak, offset: 0.2 },
    { transform: 'translate3d(170%,0,0)', opacity: 0 },
  ];
  function shine(m) {
    m.sheen.animate(SHEEN_KF(1), { duration: 950, easing: 'cubic-bezier(0.3, 0.1, 0.2, 1)' });
  }
  function ping(m) {
    m.ping.animate(
      [{ opacity: 0.95, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.18)' }],
      { duration: 950, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    );
  }
  // o ar da palheta que virou levanta de leve as abas vizinhas
  function flutter(m) {
    if (m.flipping || m.isLive || m.busy || phrase) return;
    const now = performance.now();
    if (now - m.flutAt < 900) return;
    m.flutAt = now;
    paint(m.fFT, m.cur);
    m.el.classList.add('is-flut');
    clearTimeout(m.flutT);
    m.flutT = setTimeout(() => m.el.classList.remove('is-flut'), 760);
  }
  // o brilho suave de quando a palheta assenta em cor, na virada (uma vez)
  function glint(m) {
    m.el.classList.add('is-glint');
    setTimeout(() => m.el.classList.remove('is-glint'), 1200);
  }
  function others(m, n) {
    const out = [];
    while (out.length < n) {
      const o = mods[Math.floor(Math.random() * mods.length)];
      if (o !== m && out.indexOf(o.id) < 0) out.push(o.id);
    }
    return out.map(colorOf);
  }

  function bindInteraction() {
    let rect = null, lx = 0, ly = 0, rafL = 0;
    const moveLight = () => { rafL = 0; light.style.transform = 'translate3d(' + lx + 'px,' + ly + 'px,0)'; };
    board.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch') return;
      rect = board.getBoundingClientRect();
      if (!phrase) board.classList.add('is-near');
    });
    board.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || !rect) return;
      lx = e.clientX - rect.left;
      ly = e.clientY - rect.top;
      if (!rafL) rafL = requestAnimationFrame(moveLight);
    });
    board.addEventListener('pointerleave', () => { board.classList.remove('is-near'); rect = null; });

    // a palheta "procura": gira rápido por outros rostos e para na pessoa certa
    function seek(m) {
      if (m.busy || phrase || !ready) return;
      // o ar da virada levanta de leve as abas vizinhas (cima, baixo, lados)
      mods.forEach((o) => {
        if (Math.abs(o.c - m.c) + Math.abs(o.r - m.r) === 1) flutter(o);
      });
      if (m.isLive) { shine(m); ping(m); return; }
      m.busy = true;
      const steps = others(m, 2);
      schedule(m, 0, (g) => riffle(m, steps, colorOf(m.id), g).then((ok) => {
        m.busy = false;
        if (!ok || phrase) return;
        shine(m);
        ping(m);
        // só ganha vídeo se o cursor ainda estiver nela (atravessar o
        // painel deixa um rastro de viradas, sem acordar vídeos à toa)
        if (m.video && hovered === m) goLive(m);
      }));
      setTimeout(() => { m.busy = false; }, 1600);
    }
    mods.forEach((m) => {
      m.el.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch' || !ready || phrase) return;
        hovered = m;
        m.el.classList.add('is-hover');
        clearTimeout(m.dwellT);
        m.dwellT = setTimeout(() => seek(m), 40);
      });
      m.el.addEventListener('pointerleave', () => {
        clearTimeout(m.dwellT);
        m.el.classList.remove('is-hover');
        if (hovered === m) hovered = null;
      });
    });

    // o botão principal manda um brilho pelas pessoas em movimento
    if (cta) {
      cta.addEventListener('pointerenter', () => {
        if (!ready || phrase) return;
        live.slice().sort((a, b) => a.x - b.x).forEach((m, k) => setTimeout(() => shine(m), k * 90));
      });
    }
  }

  /* ---------- pausa fora da tela / aba oculta ---------- */
  let inView = true;
  function setActive() {
    const on = inView && !document.hidden;
    if (on === active) return;
    active = on;
    hero.classList.toggle('hh-paused', !on);
    if (on) {
      if (pill && !RM && !copyGone) tryPlay(pill);
      live.forEach((m) => tryPlay(m.video));
      if (ready && !phrase) { clearTimeout(idleT); idleT = setTimeout(idleTick, 4000); }
    } else {
      if (pill) pill.pause();
      live.forEach((m) => m.video.pause());
      clearTimeout(idleT);
    }
  }

  /* ---------- partida ---------- */
  function preload() {
    const ids = Object.keys(PEOPLE);
    const jobs = [];
    window.__hhImgs = [];
    ids.forEach((id) => {
      [colorOf(id).src, greyOf(id).src].forEach((src) => {
        const im = new Image();
        im.decoding = 'async';
        im.src = src;
        window.__hhImgs.push(im);
        jobs.push(im.decode ? im.decode().catch(() => {}) : Promise.resolve());
      });
    });
    return Promise.all(jobs);
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  layout();

  if (STATIC) {
    hero.classList.add('hh-in', 'hh-ready', 'hh-static');
    if (RM && pill) { pill.removeAttribute('autoplay'); pill.pause(); }
    window.addEventListener('resize', layout);
    return;
  }

  bindInteraction();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { layout(); lastP = -1; applyScroll(); });

  const io = new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    setActive();
  }, { threshold: 0 });
  // observa o painel (e não a seção alta): quando ele sai da tela, tudo pausa
  io.observe(board);
  document.addEventListener('visibilitychange', setActive);

  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([Promise.all([fonts, preload()]), wait(2600)]).then(() => {
    layout();
    applyScroll();
    requestAnimationFrame(() => {
      hero.classList.add('hh-in');
      setTimeout(attachSources, 900);
      setTimeout(() => hero.classList.add('hh-ready'), 1520);
      setTimeout(climax, 1750);
    });
  });

  // ganchos para a verificação
  window.__hh = {
    mods, get live() { return live.map((m) => m.id); },
    get state() { return { ready, phrase, active, cw, bw, bh, live: live.length }; },
    showPhrase, showFaces, climax,
    flutter: (i) => flutter(mods[i]),
    flipTo: (i, id, grey) => run(mods[i], () => flip(mods[i], grey ? greyOf(id) : colorOf(id), false)),
  };
})();
