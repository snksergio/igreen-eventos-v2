/* ============================================================
   Hero D2 — Retrato ao centro
   Coreografia (lê-se em 3 segundos)
   1. Entrada: ela surge do escuro ainda em cinza, a frase assenta em
      cima e os botões embaixo; os painéis chegam do fundo e pousam na
      constelação ao redor dela — todos cinzas, parados (o "antes").
   2. A virada (uma vez): uma onda de luz sai dela e corre a
      constelação de dentro para fora em menos de 1s: cada painel ganha
      cor e um filete de luz na borda; ela ganha cor ao mesmo tempo.
   3. Vida: a constelação balança devagar em torno dela (±6°, paralaxe
      real: o que está na frente anda para um lado, o que está atrás
      para o outro). Quatro vídeos da frente tocam; a cada ~8s um passa
      a vez para outro. Cursor: a câmera se move de leve (paralaxe) e
      passar sobre um painel toca o vídeo dele.
   4. Rolagem (hero preso ~80vh): a constelação se abre para fora e os
      painéis passam pela câmera; o texto sobe um pouco; a frase da
      seção seguinte fecha a cena.
   Antiflicker: um único contêiner com perspective, sem preserve-3d;
   cada painel é desenhado sozinho e a ordem é o z-index (nunca há
   planos se cruzando). Movimento por Web Animations (compositor).
   ============================================================ */

(() => {
  const hero = document.getElementById('hd2');
  if (!hero || !window.gsap) return;

  const root = document.documentElement;
  const mqWide = window.matchMedia('(min-width: 900px)');
  const mqRM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reload = () => window.location.reload();
  mqWide.addEventListener ? mqWide.addEventListener('change', reload) : mqWide.addListener(reload);
  mqRM.addEventListener ? mqRM.addEventListener('change', reload) : mqRM.addListener(reload);
  if (!mqWide.matches) return; // < 900px: layout estático do CSS

  const RM = mqRM.matches;
  root.classList.add('hd2-3d');
  if (RM) root.classList.add('hd2-rm');
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------- elementos ---------- */

  const stage = hero.querySelector('.hd2-stage');
  const person = hero.querySelector('.hd2-person');
  const copy = hero.querySelector('.hd2-copy');
  const sub = copy.querySelector('.sub');
  const actions = copy.querySelector('.actions');
  const titleVideo = copy.querySelector('.title-clip video');
  const copyParts = [
    copy.querySelector('.hero-badge'),
    ...copy.querySelectorAll('.title .line'),
    sub,
    actions,
    copy.querySelector('.next-stop'),
  ];

  /* ---------- a constelação ----------
     Posições pensadas na tela 1440×900 com ela no centro (rosto em
     x = 720, olhos em y = 532): sx, sy = centro do painel na tela;
     w = largura na tela; z = profundidade (>0 na frente dela, <0
     atrás). k = formato (l 16:9 · s quase quadrado · p 9:16).
     O JS converte para 3D de forma que, parado, cada painel caia
     exatamente onde foi desenhado; o balanço revela a profundidade. */
  const C = [
    // esquerda
    { k: 'l', sx: 104, sy: 292, z: -210, w: 150 },  // canto alto (meio-longe)
    { k: 's', sx: 300, sy: 318, z: -320, w: 96 },   // ao lado da frase (longe)
    { k: 'l', sx: 420, sy: 478, z: 60, w: 192 },    // ao lado do rosto (meio)
    { k: 's', sx: 552, sy: 566, z: -430, w: 96 },   // atrás do cabelo (longe)
    { k: 'p', sx: 176, sy: 520, z: -230, w: 100 },  // meio, longe
    { k: 'l', sx: 296, sy: 700, z: 300, w: 252 },   // baixo, perto
    { k: 's', sx: 446, sy: 770, z: 220, w: 140 },   // na frente do ombro
    { k: 's', sx: 96, sy: 760, z: 40, w: 118 },     // canto baixo
    // direita
    { k: 's', sx: 1330, sy: 292, z: -200, w: 116 },
    { k: 'l', sx: 1150, sy: 318, z: -320, w: 128 },
    { k: 'p', sx: 1016, sy: 488, z: 90, w: 108 },
    { k: 'l', sx: 892, sy: 566, z: -430, w: 120 },
    { k: 'l', sx: 1284, sy: 512, z: -230, w: 160 },
    { k: 's', sx: 1150, sy: 682, z: 300, w: 204 },
    { k: 'l', sx: 1018, sy: 776, z: 220, w: 172 },
    { k: 'p', sx: 1358, sy: 748, z: 40, w: 92 },
  ];
  const ASPECT = { l: 9 / 16, s: 0.94, p: 1.75 };
  const SWAY = 6;            // graus para cada lado
  const SWAY_MS = 17000;     // ida e volta
  const MAX_ON = 4;          // vídeos tocando (+1 com hover)
  const SWAP_MS = 8000;      // um vídeo passa a vez a cada ~8s

  // casa cada vaga com um painel do HTML de formato compatível
  const pool = Array.from(hero.querySelectorAll('.hd2-panel'));
  const take = (k) => {
    let i = pool.findIndex((el) => el.dataset.k === k);
    if (i < 0 && k === 'l') i = pool.findIndex((el) => el.dataset.k === 's');
    if (i < 0) i = 0;
    return pool.splice(i, 1)[0];
  };
  const panels = C.map((c) => {
    const el = take(c.k);
    return {
      el,
      c,
      card: el.querySelector('.hd2-card'),
      video: el.querySelector('video'),
      on: false,
      playing: false,
      hover: false,
      t: 0,
      sway: null,
      d: 0,
      w: 0,
      h: 0,
      edges: null,
    };
  });

  // estes dois clipes têm cortes com clarão quase branco (um "piscar"):
  // aparecem só como foto em cor, nunca tocam
  const NOPLAY = /crowd-hands|arena-audience/;

  /* ---------- estado ---------- */

  const st = {
    W: 0, H: 0, u: 1,
    vx: 0, vy: 0, ox: 0, oy: 0, P: 1500,
    mx: 0, my: 0,
    p: 0,
    waved: false,
    ready: false,
    active: true,
  };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);

  /* ---------- contorno curvo ---------- */

  function arcPath(w, h, s, r, dir) {
    const tc = dir > 0 ? 0 : s;
    const tm = dir > 0 ? s : 0;
    const bc = dir > 0 ? h - s : h;
    const bm = dir > 0 ? h : h - s;
    const k = 4 * (r / w) * (1 - r / w);
    const ty = tc + (tm - tc) * k;
    const by = bc + (bm - bc) * k;
    const f = (n) => Math.round(n * 10) / 10;
    return [
      `M0,${f(tc + r)}`,
      `Q0,${f(tc)} ${f(r)},${f(ty)}`,
      `Q${f(w / 2)},${f(2 * tm - ty)} ${f(w - r)},${f(ty)}`,
      `Q${f(w)},${f(tc)} ${f(w)},${f(tc + r)}`,
      `L${f(w)},${f(bc - r)}`,
      `Q${f(w)},${f(bc)} ${f(w - r)},${f(by)}`,
      `Q${f(w / 2)},${f(2 * bm - by)} ${f(r)},${f(by)}`,
      `Q0,${f(bc)} 0,${f(bc - r)}`,
      'Z',
    ].join(' ');
  }
  const NS = 'http://www.w3.org/2000/svg';
  function makeSvg(cls, paths) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', cls);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    paths.forEach((pc) => {
      const p = document.createElementNS(NS, 'path');
      if (pc) p.setAttribute('class', pc);
      svg.appendChild(p);
    });
    return svg;
  }
  panels.forEach((p) => {
    const edge = makeSvg('hd2-edge', ['hd2-hair', '']);
    const lime = makeSvg('hd2-lime', ['']);
    p.card.appendChild(edge);
    p.card.appendChild(lime);
    p.edges = [edge, lime];
  });

  /* ---------- layout ---------- */

  function poseAt(p, a) {
    // gira a constelação em torno do eixo vertical que passa por ela
    const r = (a * Math.PI) / 180;
    const X = p.X * Math.cos(r) + p.Z * Math.sin(r);
    const Z = -p.X * Math.sin(r) + p.Z * Math.cos(r);
    return `translate3d(${X.toFixed(1)}px, ${p.Y.toFixed(1)}px, ${Z.toFixed(1)}px) rotateY(${(p.yaw + a).toFixed(2)}deg)`;
  }

  function layout() {
    const W = window.innerWidth;
    const H = hero.clientHeight;
    const u = Math.min(W / 1440, H / 900);
    const ux = Math.min(W / 1440, u * 1.2);
    st.W = W; st.H = H; st.u = u;

    // ela: o topo do cabelo logo abaixo do subtítulo
    // (offsetTop ignora as transformadas da entrada)
    const subBottom = copy.offsetTop + sub.offsetTop + sub.offsetHeight;
    const hairTop = subBottom + 14 * u;
    const ph = Math.round(H * 0.95);
    const pw = Math.round((ph * 1328) / 1760);
    const imgT = hairTop - 0.196 * ph;
    const imgL = W / 2 - 0.51 * pw;
    const eyes = imgT + 0.377 * ph;
    const chin = imgT + 0.54 * ph;
    const s = hero.style;
    s.setProperty('--hd2-pw', `${pw}px`);
    s.setProperty('--hd2-ph', `${ph}px`);
    s.setProperty('--hd2-pl', `${imgL.toFixed(1)}px`);
    s.setProperty('--hd2-pt', `${imgT.toFixed(1)}px`);
    s.setProperty('--hd2-top', `${(subBottom - 90 * u).toFixed(0)}px`);
    const bw = pw * 2.4;
    const bh = ph * 0.62;
    s.setProperty('--hd2-bw', `${bw.toFixed(0)}px`);
    s.setProperty('--hd2-bh', `${bh.toFixed(0)}px`);
    s.setProperty('--hd2-bx', `${(W / 2 - bw / 2).toFixed(0)}px`);
    s.setProperty('--hd2-by', `${(chin - bh * 0.55).toFixed(0)}px`);

    // câmera na altura dos olhos; centro da constelação no queixo
    st.vx = W / 2; st.vy = eyes;
    st.ox = W / 2; st.oy = chin;
    st.P = 1500 * u;
    applyCamera();
    stage.style.perspective = `${st.P.toFixed(0)}px`;

    panels.forEach((p) => {
      const c = p.c;
      const sx = W / 2 + (c.sx - 720) * ux;
      const sy = eyes + (c.sy - 532) * u;
      const z = c.z * u;
      const kk = (st.P - z) / st.P;
      const w = Math.round(c.w * u * kk);
      const h = Math.round(w * ASPECT[c.k]);
      p.w = w; p.h = h;
      p.X = (sx - st.vx) * kk;
      p.Y = (sy - st.vy) * kk + (st.vy - st.oy);
      p.Z = z;
      p.sx = sx; p.sy = sy;
      // virado para fora, como num cilindro ao redor dela (sem achatar)
      p.yaw = clamp((p.X / (520 * u)) * 26, -28, 28);
      p.d = Math.hypot(sx - W / 2, sy - eyes);
      const es = p.el.style;
      es.width = `${w}px`;
      es.height = `${h}px`;
      es.left = `${(st.ox - w / 2).toFixed(1)}px`;
      es.top = `${(st.oy - h / 2).toFixed(1)}px`;
      es.zIndex = String(z > 0 ? 51 + Math.round(z / 20) : 49 - Math.round(-z / 20));
      p.card.style.setProperty('--hd2-dim', z < 0 ? clamp(-z / (800 * u), 0, 0.5).toFixed(2) : '0');
      // curvatura: abaixo dos olhos as bordas sorriem, acima franzem
      const off = (sy - eyes) / H;
      const sag = clamp(Math.abs(off) * 0.22 * w, 3, w * 0.055);
      const d = arcPath(w, h, sag, Math.round(12 * clamp(u, 0.9, 1.3)), off >= 0 ? 1 : -1);
      p.card.style.clipPath = `path('${d}')`;
      p.edges.forEach((svg) => {
        svg.setAttribute('width', w);
        svg.setAttribute('height', h);
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        svg.querySelectorAll('path').forEach((path) => path.setAttribute('d', d));
      });
      es.transform = poseAt(p, 0);
    });
    if (!RM) startSway();
  }

  function applyCamera() {
    const vx = st.vx + st.mx * 34 * st.u;
    const vy = st.vy + st.my * 20 * st.u;
    stage.style.perspectiveOrigin = `${vx.toFixed(1)}px ${vy.toFixed(1)}px`;
  }

  /* ---------- balanço (Web Animations, compositor) ---------- */

  let swayT = 0;
  function startSway() {
    panels.forEach((p) => {
      if (p.sway) { swayT = Number(p.sway.currentTime) || swayT; p.sway.cancel(); }
    });
    const A = SWAY;
    const steps = [-1, -0.5, 0, 0.5, 1].map((f) => f * A);
    panels.forEach((p) => {
      p.sway = p.el.animate(steps.map((a) => ({ transform: poseAt(p, a) })), {
        duration: SWAY_MS / 2,
        iterations: Infinity,
        direction: 'alternate',
        easing: 'cubic-bezier(0.45, 0, 0.55, 1)',
      });
      // começa no meio do caminho (pose de repouso = 0°)
      p.sway.currentTime = swayT || SWAY_MS / 4;
      if (!st.active) p.sway.pause();
    });
  }

  /* ---------- vídeos ---------- */

  function playingCount() {
    let n = 0;
    panels.forEach((p) => { if (p.playing) n += 1; });
    return n;
  }
  function startVideo(p) {
    clearTimeout(p.t);
    if (NOPLAY.test(p.video.currentSrc || p.video.src)) return; // clipes com clarão branco: ficam como foto
    if (!p.playing) {
      p.playing = true;
      const pr = p.video.play();
      if (pr && pr.catch) pr.catch(() => {});
    }
  }
  function stopVideo(p, now) {
    clearTimeout(p.t);
    if (now) { p.playing = false; p.video.pause(); return; }
    p.t = setTimeout(() => { if (!p.on) { p.playing = false; p.video.pause(); } }, 900);
  }
  function setOn(p, on) {
    if (p.on === on) return;
    p.on = on;
    p.el.classList.toggle('is-on', on);
    if (on) {
      if (playingCount() >= MAX_ON) panels.forEach((q) => { if (q.playing && !q.on) stopVideo(q, true); });
      if (st.active) startVideo(p);
    } else {
      stopVideo(p, false);
    }
  }

  // quem toca: os painéis da frente; a cada ~8s um passa a vez
  const front = () => panels.filter((p) => p.c.z > 0 && !NOPLAY.test(p.video.src));
  let chosen = [];
  function pickInitial() {
    chosen = front().sort((a, b) => b.w * b.h - a.w * a.h).slice(0, MAX_ON);
    applyChosen();
  }
  function applyChosen() {
    // apaga antes de acender: o teto de vídeos nunca passa nem por um instante
    const want = (p) => st.ready && st.p < 0.5 && (chosen.includes(p) || p.hover);
    panels.forEach((p) => { if (!want(p)) setOn(p, false); });
    panels.forEach((p) => { if (want(p)) setOn(p, true); });
  }
  let swapTimer = 0;
  let swapIdx = 0;
  function scheduleSwap() {
    clearTimeout(swapTimer);
    if (!st.active || RM) return;
    swapTimer = setTimeout(() => {
      const rest = front().filter((p) => !chosen.includes(p));
      if (rest.length && st.p < 0.05) {
        const out = chosen[swapIdx % chosen.length];
        const inn = rest[Math.floor(Math.random() * rest.length)];
        chosen = chosen.map((p) => (p === out ? inn : p));
        swapIdx += 1;
        applyChosen();
      }
      scheduleSwap();
    }, SWAP_MS);
  }

  /* ---------- a virada: uma onda, uma vez ---------- */

  const WAVE_MS = 720;
  function wave() {
    if (st.waved) return;
    st.waved = true;
    hero.classList.add('hd2-alive');
    const maxD = Math.max(...panels.map((p) => p.d)) || 1;
    panels.forEach((p) => {
      setTimeout(() => {
        p.el.classList.add('is-lit', 'is-wave');
        setTimeout(() => p.el.classList.remove('is-wave'), 1500);
      }, Math.round((p.d / maxD) * WAVE_MS));
    });
    setTimeout(() => {
      st.ready = true;
      pickInitial();
      scheduleSwap();
    }, WAVE_MS + 260);
  }

  /* ---------- ativo / pausado ---------- */

  let visible = true;
  function setActive() {
    const act = visible && !document.hidden;
    if (act === st.active) return;
    st.active = act;
    hero.classList.toggle('hd2-off', !act);
    panels.forEach((p) => { if (p.sway) { if (act) p.sway.play(); else p.sway.pause(); } });
    if (act) {
      panels.forEach((p) => { if (p.on) { p.playing = false; startVideo(p); } });
      if (titleVideo) { const pr = titleVideo.play(); if (pr && pr.catch) pr.catch(() => {}); }
      scheduleSwap();
    } else {
      clearTimeout(swapTimer);
      panels.forEach((p) => { if (p.playing) stopVideo(p, true); });
      if (titleVideo) titleVideo.pause();
    }
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      setActive();
    }, { threshold: 0 }).observe(hero);
  }
  document.addEventListener('visibilitychange', setActive);

  /* ---------- montagem ---------- */

  layout();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      layout();
      if (!RM && window.ScrollTrigger) ScrollTrigger.refresh();
    });
  }
  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      layout();
      if (!RM && window.ScrollTrigger) ScrollTrigger.refresh();
    }, 160);
  });

  /* ---------- movimento reduzido: parado, em cor ---------- */

  if (RM) {
    hero.classList.add('hd2-alive');
    panels.forEach((p) => p.el.classList.add('is-lit'));
    return;
  }

  /* ---------- 1. entrada ---------- */

  gsap.set(person, { opacity: 0, y: 34 * st.u });
  gsap.set(copyParts, { opacity: 0, y: 20 });
  const intro = gsap.timeline({ delay: 0.1, onComplete: () => gsap.set(copyParts, { clearProps: 'transform' }) });
  intro.call(() => hero.classList.add('hd2-dawn'), null, 0);
  intro.to(person, { opacity: 1, y: 0, duration: 1.7, ease: 'power3.out' }, 0);
  intro.to(copyParts, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.06 }, 0.15);
  // os painéis chegam do fundo (translate individual + opacidade: compositor)
  const maxD = Math.max(...panels.map((p) => p.d)) || 1;
  panels.forEach((p) => {
    p.el.style.opacity = '0';
    p.el.animate(
      [{ translate: `0px ${(40 * st.u).toFixed(0)}px ${(-900 * st.u).toFixed(0)}px`, opacity: 0 },
       { translate: '0px 0px 0px', opacity: 1 }],
      { duration: 1500, delay: 350 + (p.d / maxD) * 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' }
    ).finished.then(() => { p.el.style.opacity = ''; }).catch(() => {});
  });
  // 2. a virada
  intro.call(wave, null, 1.95);

  /* ---------- 3. interação ---------- */

  const cam = { x: 0, y: 0 };
  let camTween = null;
  hero.addEventListener('pointermove', (e) => {
    const nx = (e.clientX / st.W - 0.5) * 2;
    const ny = (e.clientY / st.H - 0.5) * 2;
    if (camTween) camTween.kill();
    camTween = gsap.to(cam, {
      x: nx, y: ny, duration: 1.3, ease: 'power3.out',
      onUpdate: () => { st.mx = cam.x; st.my = cam.y; applyCamera(); },
    });
  });
  panels.forEach((p) => {
    p.el.addEventListener('pointerenter', () => {
      p.hover = true;
      if (st.ready) {
        p.el.classList.add('is-wave');
        setTimeout(() => p.el.classList.remove('is-wave'), 1500);
      }
      applyChosen();
    });
    p.el.addEventListener('pointerleave', () => {
      p.hover = false;
      setTimeout(applyChosen, 900);
    });
  });

  /* ---------- 4. rolagem curta: a constelação se abre ---------- */

  function applyScroll(p) {
    st.p = p;
    if (p > 0.01) wave();
    const e = smooth(clamp(p / 0.95));
    const s = 1 + 1.35 * Math.pow(e, 1.25);
    const f = 1 - smooth(clamp((e - 0.3) / 0.6));
    panels.forEach((q) => {
      q.el.style.scale = e > 0.001 ? s.toFixed(4) : '';
      q.el.style.opacity = e > 0.001 ? f.toFixed(3) : '';
    });
    copy.style.transform = e > 0.001 ? `translate3d(0, ${(-26 * e).toFixed(1)}px, 0)` : '';
    person.style.scale = e > 0.001 ? (1 + 0.035 * e).toFixed(4) : '';
    if (st.ready) applyChosen();
  }

  if (window.ScrollTrigger) {
    const proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: '+=80%', pin: true, scrub: 0.8, anticipatePin: 1 },
      onUpdate: () => applyScroll(proxy.p),
    });
  }

  // verificação
  window.__hd2 = { st, panels, playingCount };
})();
