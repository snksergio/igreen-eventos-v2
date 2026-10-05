/* ============================================================
   Opção F3 — Plateia
   A tela da opção F vira a tela de cada um: uma plateia erguendo o
   celular, e em cada celular a vida de um licenciado. Na chegada as
   telas estão apagadas (fotograma cinza, sem brilho). Então a arena
   acende uma única vez, do centro para fora: cada tela liga em cor,
   derrama luz e começa a viver. Depois, calma: cinco vídeos tocam
   por vez e passam a vez sem brilho nenhum. O cursor faz um celular
   subir, endireitar e tocar. Na rolagem (cena presa por 100vh), a
   câmera sobe da plateia para o palco: as fileiras descem em
   paralaxe e a frase de fechamento aparece; então a página segue.

   Custo: as posições dos celulares são calculadas só ao montar e ao
   redimensionar; o acender é CSS (transições com atraso por tela);
   na rolagem só 4 camadas, o texto e a frase mudam por quadro.
   ============================================================ */

(() => {
  'use strict';

  const root = document.documentElement;
  const hero = document.querySelector('.hf3-hero');
  if (!hero) return;

  const q = (s) => hero.querySelector(s);
  const qa = (s) => Array.from(hero.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---------- a plateia (unidades de desenho: tela de 1440 x 900) ---------- */

  const V = '../assets/video/';
  const G3 = '../assets/img/hero-f3/';
  const POS = {
    'cards/gen-executiva1': '30% 50%', 'past/stage-speaker': '56% 50%'
  };
  const LABEL = {
    'cards/gen-executiva1': 'Executiva de blazer verde sorrindo com o celular na mão',
    'cards/gen-executiva2': 'Executiva de blazer verde apresentando em um estúdio',
    'cards/gen-podcast': 'Licenciado gravando podcast',
    'cards/gen-kart': 'Piloto de kart com macacão verde da iGreen',
    'cards/gen-reuniao': 'Executiva apresentando em uma sala de reunião',
    'cards/gen-walk': 'Executiva caminhando pelo escritório',
    'cards/sel-musgo1': 'Licenciado diante do logo iGreen no muro verde',
    'cards/sel-musgo2': 'Licenciado de óculos diante do logo iGreen',
    'cards/sel-suv': 'Licenciado com o celular diante de um SUV verde',
    'cards/sel-jardim': 'Licenciado com polo iGreen ao lado do jardim vertical',
    'cards/sel-escritorio': 'Licenciado em um escritório moderno',
    'cards/sel-estudio': 'Apresentadora em estúdio com telão verde',
    'cards/sel-carro': 'Licenciada sorrindo diante de um carro verde',
    'past/stage-speaker': 'Palestrante no palco do iGreen Live'
  };
  // [u (px do centro), y do topo, largura, inclinação, clipe]
  const ROWS = {
    high: [
      [-588, 196, 82, -7, 'cards/gen-kart'],
      [-410, 150, 74, 5, 'cards/sel-suv'],
      [412, 160, 74, -4, 'cards/gen-reuniao'],
      [592, 186, 82, 6, 'cards/gen-executiva2']
    ],
    back: [
      [-604, 430, 92, 4, 'cards/sel-escritorio'],
      [-402, 488, 90, -5, 'cards/sel-musgo2'],
      [-200, 520, 92, 3, 'cards/sel-estudio'],
      [6, 528, 90, -2, 'cards/gen-executiva1'],
      [204, 516, 92, 5, 'cards/sel-musgo1'],
      [404, 482, 90, -4, 'cards/gen-podcast'],
      [606, 426, 92, 6, 'cards/sel-carro']
    ],
    mid: [
      [-504, 522, 116, -6, 'cards/gen-executiva2'],
      [-300, 562, 118, 4, 'cards/sel-musgo1'],
      [-100, 584, 116, -3, 'cards/gen-reuniao'],
      [102, 586, 118, 3, 'cards/sel-jardim'],
      [302, 560, 116, -4, 'past/stage-speaker'],
      [502, 520, 118, 6, 'cards/gen-walk']
    ],
    front: [
      [-452, 612, 138, -7, 'cards/gen-podcast'],
      [-226, 634, 140, 5, 'cards/gen-executiva1'],
      [0, 640, 144, -1, 'cards/sel-carro'],
      [228, 632, 140, -5, 'cards/sel-suv'],
      [454, 610, 138, 7, 'cards/gen-kart']
    ]
  };
  const ROW_ORDER = ['high', 'back', 'mid', 'front'];
  const SPILL = { high: 0.3, back: 0.4, mid: 0.5, front: 0.55 };

  const rows = {};
  const phones = [];
  ROW_ORDER.forEach((name) => {
    const box = q(`.hf3-row[data-row="${name}"]`);
    rows[name] = box;
    ROWS[name].forEach(([u, y, w, r, clip]) => {
      const auto = name === 'mid' || name === 'front';
      const ph = document.createElement('div');
      ph.className = 'hf3-phone';
      ph.style.setProperty('--r', r + 'deg');
      ph.style.setProperty('--spill', SPILL[name]);
      const pos = POS[clip] || '50% 50%';
      const name2 = clip.split('/')[1];
      ph.innerHTML =
        '<span class="hf3-spill" aria-hidden="true"></span>' +
        '<div class="hf3-device"><div class="hf3-screen">' +
        `<video src="${V}${clip}.mp4" poster="${V}${clip}.jpg" muted loop playsinline preload="${auto ? 'metadata' : 'none'}" style="object-position:${pos}" aria-label="${LABEL[clip]}"></video>` +
        `<img class="hf3-offimg" src="${G3}${name2}-antes.jpg" alt="" style="object-position:${pos}">` +
        '<span class="hf3-wake" aria-hidden="true"></span>' +
        '<span class="hf3-island" aria-hidden="true"></span>' +
        '<span class="hf3-ping" aria-hidden="true"></span>' +
        '</div></div>';
      box.appendChild(ph);
      phones.push({ el: ph, row: name, u, y, w, r, auto, video: ph.querySelector('video'), ping: ph.querySelector('.hf3-ping') });
    });
  });

  const el = {
    scene: q('.hf3-scene'),
    copy: q('.hf3-copy'),
    copyIn: q('.hf3-copy .hero-copy'),
    copyKids: qa('.hf3-copy .hero-copy > *'),
    lines: qa('.hf3-copy .title .line'),
    headClip: q('.title-clip video'),
    crowd: q('.hf3-crowd'),
    phrase: qa('.hf3-phrase-l')
  };

  /* ---------- posições: desenho de 1440 x 900 mapeado na tela real ----------
     horizontal: escala k a partir do centro;
     vertical: o trecho do texto (104..509 no desenho) segue o texto real,
     abaixo dele as distâncias crescem com k. */

  const D_TOP = 104, D_BOT = 509;
  function layout() {
    const vw = window.innerWidth, vh = el.scene.offsetHeight;
    const k = Math.min(vw / 1440, vh / 900);
    const cTop = el.copy.offsetTop + el.copyIn.offsetTop;
    const cBot = cTop + el.copyIn.offsetHeight;
    const mapY = (y) => {
      if (y <= D_TOP) return cTop - (D_TOP - y) * k;
      if (y <= D_BOT) return cTop + (y - D_TOP) / (D_BOT - D_TOP) * (cBot - cTop);
      return cBot + (y - D_BOT) * k;
    };
    phones.forEach((p) => {
      const w = Math.round(p.w * k);
      p.el.style.setProperty('--w', w + 'px');
      p.el.style.left = Math.round(vw / 2 + p.u * k - w / 2) + 'px';
      p.el.style.top = Math.round(mapY(p.y)) + 'px';
      p.cx = vw / 2 + p.u * k;
      p.cy = mapY(p.y) + w;
    });
    // ordem de acender: do centro para fora (por distância ao celular central)
    const c = phones.find((p) => p.row === 'front' && p.u === 0) || phones[0];
    const span = Math.max(...phones.map((p) => Math.hypot(p.cx - c.cx, (p.cy - c.cy) * 1.3)));
    phones.forEach((p) => {
      p.d = Math.hypot(p.cx - c.cx, (p.cy - c.cy) * 1.3) / span; // 0..1
      p.el.style.transitionDelay = '0s';
    });
  }

  /* ---------- modo estático ---------- */

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isStatic = root.classList.contains('hf3-static') || !window.gsap || typeof window.ScrollTrigger === 'undefined';
  layout();
  if (isStatic) {
    root.classList.add('hf3-static', 'hf3-go');
    hero.classList.add('hf3-lit');
    phones.forEach((p) => p.el.classList.add('is-on'));
    if (reduce && el.headClip) { el.headClip.removeAttribute('autoplay'); el.headClip.pause(); }
    window.addEventListener('resize', layout);
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- vídeos: no máximo 5 telas (+1 pelo cursor) ---------- */

  const MAX_AUTO = 5;
  const STEP = 3800;
  const S = { lit: false, visible: true, p: 0 };
  let live = [];
  let hoverP = null;
  const active = () => S.visible && !document.hidden;
  const play = (v) => { if (!v.paused) return; const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); };
  function syncVideos() {
    const on = active();
    phones.forEach((p) => {
      if (on && (live.includes(p) || p === hoverP)) play(p.video);
      else if (!p.video.paused) p.video.pause();
    });
    if (el.headClip) {
      if (on && S.p < 0.35) play(el.headClip);
      else if (!el.headClip.paused) el.headClip.pause();
    }
  }
  function energize(p) {
    if (live.includes(p)) return;
    live.push(p);
    p.last = performance.now();
    if (active()) play(p.video);
  }
  function retire(p) {
    live = live.filter((x) => x !== p);
    if (p !== hoverP) p.video.pause();
  }
  let timer = 0;
  function step() {
    timer = 0;
    if (!active() || !S.lit) return;
    if (live.length >= MAX_AUTO) {
      const old = live.find((x) => x !== hoverP);
      if (old) retire(old);
    }
    const pool = phones.filter((p) => p.auto && !live.includes(p) && p !== hoverP)
      .sort((a, b) => (a.last || 0) - (b.last || 0)).slice(0, 4);
    if (pool.length) energize(pool[Math.floor(Math.random() * pool.length)]);
    schedule();
  }
  function schedule(delay = STEP) { if (timer || !S.lit || !active()) return; timer = setTimeout(step, delay); }
  function unschedule() { if (timer) { clearTimeout(timer); timer = 0; } }

  /* ---------- entrada: texto, depois a arena acende (uma vez) ---------- */

  gsap.set(el.copyKids, { opacity: 0, y: 26 });
  gsap.set(el.copyKids.filter((x) => x.classList.contains('title')), { opacity: 1, y: 0 });
  gsap.set(el.lines, { opacity: 0, y: 46 });
  gsap.set(el.crowd, { opacity: 0, y: 40 });
  root.classList.add('hf3-go');

  const WAVE_AT = 1.35;     // s: a primeira tela liga
  const WAVE_SPAN = 1.9;    // s: até a última tela ligar
  function lightUp() {
    hero.classList.add('hf3-lit');
    // cada tela liga com seu atraso (CSS); as primeiras do centro já tocam
    const firstAuto = phones.filter((p) => p.auto).sort((a, b) => a.d - b.d).slice(0, MAX_AUTO);
    phones.forEach((p) => {
      const delay = p.d * WAVE_SPAN;
      p.el.style.transitionDelay = '0s';
      p.el.querySelectorAll('.hf3-device, .hf3-offimg, .hf3-spill, .hf3-wake').forEach((n) => {
        n.style.transitionDelay = delay.toFixed(3) + 's';
        n.style.animationDelay = delay.toFixed(3) + 's';
      });
      p.el.classList.add('is-on');
      if (firstAuto.includes(p)) setTimeout(() => energize(p), delay * 1000 + 120);
    });
    setTimeout(() => {
      S.lit = true;
      // depois do clímax, os atrasos saem (o hover responde na hora)
      phones.forEach((p) => p.el.querySelectorAll('.hf3-device, .hf3-offimg, .hf3-spill').forEach((n) => { n.style.transitionDelay = ''; }));
      schedule(2800);
    }, (WAVE_SPAN + 1.4) * 1000);
  }

  gsap.timeline({ delay: 0.15 })
    .to(el.copyKids[0], { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, 0)
    .to(el.lines, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09 }, 0.1)
    .to(el.copyKids.slice(2), { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.42)
    .to(el.crowd, { opacity: 1, y: 0, duration: 1.6, ease: 'power3.out', clearProps: 'transform' }, 0.25)
    .call(lightUp, null, WAVE_AT);

  /* ---------- rolagem: a câmera sobe da plateia para o palco ---------- */

  const DEPTH = { high: 0.24, back: 0.66, mid: 0.88, front: 1.12 };
  const easeIO = gsap.parseEase('power2.inOut');
  const easeOut = gsap.parseEase('power3.out');
  function css(node, prop, v) {
    const c = node._css || (node._css = {});
    if (c[prop] === v) return;
    c[prop] = v;
    node.style[prop] = v;
  }
  function render() {
    const vh = el.scene.offsetHeight;
    const pan = easeIO(clamp(S.p / 0.8));
    ROW_ORDER.forEach((n) => {
      css(rows[n], 'transform', `translate3d(0, ${(pan * vh * DEPTH[n]).toFixed(1)}px, 0)`);
    });
    const ct = clamp(S.p / 0.4);
    css(el.copy, 'opacity', (1 - easeIO(ct)).toFixed(3));
    css(el.copy, 'transform', `translate3d(0, ${(ct * vh * 0.28).toFixed(1)}px, 0)`);
    el.phrase.forEach((l, i) => {
      const t = easeOut(clamp((S.p - 0.36 - i * 0.1) / 0.32));
      css(l, 'opacity', t.toFixed(3));
      css(l, 'transform', `translate3d(0, ${((1 - t) * 30).toFixed(1)}px, 0)`);
    });
  }
  let headWas = true;
  const st = ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.7,
    animation: gsap.to(S, {
      p: 1,
      ease: 'none',
      onUpdate: () => {
        render();
        const want = S.p < 0.35;
        if (want !== headWas) { headWas = want; syncVideos(); }
      }
    })
  });

  /* ---------- hover: o celular sobe, endireita e toca ---------- */

  let scrollT = 0;
  function unhover() {
    if (!hoverP) return;
    const p = hoverP;
    hoverP = null;
    p.el.classList.remove('is-hover');
    el.crowd.classList.remove('is-focus');
    if (!live.includes(p)) p.video.pause();
  }
  window.addEventListener('scroll', () => {
    if (!scrollT) { hero.classList.add('hf3-scrolling'); unhover(); }
    clearTimeout(scrollT);
    scrollT = setTimeout(() => { scrollT = 0; hero.classList.remove('hf3-scrolling'); }, 220);
  }, { passive: true });
  phones.forEach((p) => {
    p.el.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || !S.lit || scrollT || S.p > 0.2) return;
      if (hoverP && hoverP !== p) unhover();
      hoverP = p;
      p.el.classList.add('is-hover');
      el.crowd.classList.add('is-focus');
      p.ping.animate(
        [{ opacity: 0.95, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.14)' }],
        { duration: 950, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );
      if (active()) play(p.video);
    });
    p.el.addEventListener('pointerleave', () => { if (hoverP === p) unhover(); });
  });

  /* ---------- pausa tudo fora de vista ---------- */

  const io = new IntersectionObserver(([entry]) => {
    S.visible = entry.isIntersecting && entry.intersectionRatio > 0.06;
    hero.classList.toggle('hf3-off', !S.visible);
    syncVideos();
    if (active()) schedule(); else unschedule();
  }, { threshold: [0, 0.06, 0.15] });
  io.observe(el.scene);
  document.addEventListener('visibilitychange', () => { syncVideos(); if (active()) schedule(); else unschedule(); });

  function relayout() {
    layout();
    ROW_ORDER.forEach((n) => { rows[n]._css = {}; });
    el.copy._css = {};
    ScrollTrigger.refresh();
    render();
  }
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(relayout, 160); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

  window.__hf3 = {
    S, st, phones,
    live: () => live.map((p) => p.video.src.split('/').pop()),
    playing() {
      return Array.from(document.querySelectorAll('video')).filter((v) => !v.paused).map((v) => (v.currentSrc || v.src).split('/').pop());
    }
  };
})();
