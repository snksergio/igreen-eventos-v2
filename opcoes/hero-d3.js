/* ============================================================
   Hero D3 — Órbita
   Coreografia (lê-se em 3 segundos)
   1. Entrada: ela surge do escuro, grande, ainda em cinza; o texto
      assenta à direita; os painéis chegam do fundo e pousam numa
      órbita larga que atravessa a tela — cinzas, parados (o "antes").
   2. A virada (uma vez): uma onda de luz parte do ponto da órbita mais
      perto dela e corre a volta inteira em menos de 1s; tudo ganha cor
      e um filete de luz na borda, e ela ganha cor junto.
   3. Vida: a órbita gira devagar (uma volta a cada 90s): por cima, longe
      e pequena, passando atrás da cabeça dela; pela direita, ao lado do
      texto; por baixo, perto e grande, na frente dela. Os painéis do arco
      da frente tocam o vídeo (no máximo 4). Cursor: a câmera se move de
      leve (paralaxe) e passar sobre um painel toca o vídeo dele.
   4. Rolagem (hero preso ~80vh): a órbita se abre para fora e some; a
      frase da seção seguinte fecha a cena.
   Antiflicker: um único contêiner com perspective, sem preserve-3d;
   cada painel é desenhado sozinho, a ordem é o z-index, e no lado
   esquerdo (onde a órbita cruza o recorte dela) os painéis se dissolvem
   antes de trocar de camada — nenhuma troca acontece à vista.
   Movimento por Web Animations (compositor); o JS só troca z-index e
   decide os vídeos num relógio de 150ms.
   ============================================================ */

(() => {
  const hero = document.getElementById('hd3');
  if (!hero || !window.gsap) return;

  const root = document.documentElement;
  const mqWide = window.matchMedia('(min-width: 900px)');
  const mqRM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reload = () => window.location.reload();
  mqWide.addEventListener ? mqWide.addEventListener('change', reload) : mqWide.addListener(reload);
  mqRM.addEventListener ? mqRM.addEventListener('change', reload) : mqRM.addListener(reload);
  if (!mqWide.matches) return; // < 900px: layout estático do CSS

  const RM = mqRM.matches;
  root.classList.add('hd3-3d');
  if (RM) root.classList.add('hd3-rm');
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------- elementos ---------- */

  const stage = hero.querySelector('.hd3-stage');
  const person = hero.querySelector('.hd3-person');
  const copy = hero.querySelector('.hd3-copy');
  const titleVideo = copy.querySelector('.title-clip video');
  const copyParts = [
    copy.querySelector('.hero-badge'),
    ...copy.querySelectorAll('.title .line'),
    copy.querySelector('.sub'),
    copy.querySelector('.actions'),
    copy.querySelector('.next-stop'),
  ];

  /* ---------- parâmetros ---------- */

  const DRIFT_MS = 90000;   // uma volta
  const SAMPLES = 48;       // pontos da órbita por volta (7,5°)
  const FRONT = 0.62;       // cos(θ) acima disso = arco da frente (toca)
  const FRONT_HYST = 0.08;
  const MAX_ON = 4;         // vídeos tocando (+1 com hover)
  const WAVE_MS = 780;
  const ASPECT = { l: 16 / 9, s: 1, p: 0.75 };   // largura / altura
  const NOPLAY = /crowd-hands|arena-audience|arena-persistencia|car-reveal/;

  const panels = Array.from(hero.querySelectorAll('.hd3-panel')).map((el, i, all) => ({
    el,
    k: el.dataset.k || 's',
    card: el.querySelector('.hd3-card'),
    veil: el.querySelector('.hd3-veil'),
    video: el.querySelector('video'),
    th0: (i * 360) / all.length,
    th: 0,
    on: false,
    playing: false,
    hover: false,
    hoverUntil: 0,
    under: false,
    z: -1,
    t: 0,
    anims: [],
    edges: null,
    w: 0,
    h: 0,
  }));

  /* ---------- estado ---------- */

  const st = {
    W: 0, H: 0, u: 1,
    lx: 0, ly: 0, A: 0, B: 0,
    vx: 0, vy: 0, P: 1600, Zr: 380,
    thHer: -32,
    mx: 0, my: 0,
    p: 0, exitFade: 1,
    copyRects: [],
    waved: false,
    ready: false,
    active: true,
  };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

  /* ---------- contorno: vidro levemente abaulado (serve em qualquer
     ponto da órbita: as duas bordas curvam para fora) ---------- */

  function barrelPath(w, h, s, r) {
    const f = (n) => Math.round(n * 10) / 10;
    const k = 4 * (r / w) * (1 - r / w);
    const ty = s - s * k;          // borda de cima: cantos em s, meio em 0
    const by = h - s + s * k;      // borda de baixo: cantos em h - s, meio em h
    return [
      `M0,${f(s + r)}`,
      `Q0,${f(s)} ${f(r)},${f(ty)}`,
      `Q${f(w / 2)},${f(2 * 0 - ty)} ${f(w - r)},${f(ty)}`,
      `Q${f(w)},${f(s)} ${f(w)},${f(s + r)}`,
      `L${f(w)},${f(h - s - r)}`,
      `Q${f(w)},${f(h - s)} ${f(w - r)},${f(by)}`,
      `Q${f(w / 2)},${f(2 * h - by)} ${f(r)},${f(by)}`,
      `Q0,${f(h - s)} 0,${f(h - s - r)}`,
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
    const edge = makeSvg('hd3-edge', ['hd3-hair', '']);
    const lime = makeSvg('hd3-lime', ['']);
    p.card.appendChild(edge);
    p.card.appendChild(lime);
    p.edges = [edge, lime];
  });

  /* ---------- a órbita ---------- */

  // ponto da órbita no ângulo th (graus; 0 = embaixo/perto, 180 = em cima/longe)
  function orbit(th) {
    const r = (th * Math.PI) / 180;
    const x = st.lx + st.A * Math.sin(r);
    const y = st.ly + st.B * Math.cos(r);
    const d = Math.cos(r);
    const z = d * st.Zr;
    const k = (st.P - z) / st.P;
    return { x, y, d, z, k };
  }
  function poseAt(th) {
    const o = orbit(th);
    const X = (o.x - st.vx) * o.k;
    const Y = (o.y - st.vy) * o.k;
    const yaw = 22 * Math.sin((th * Math.PI) / 180);
    return `translate3d(${X.toFixed(1)}px, ${Y.toFixed(1)}px, ${o.z.toFixed(1)}px) rotateY(${yaw.toFixed(2)}deg)`;
  }
  // no lado esquerdo a órbita cruza o recorte dela: o painel se dissolve
  // ali e só então troca de camada (atrás ↔ na frente)
  function fadeAt(th) {
    const off = Math.abs(wrap(th + 90));
    return smooth(clamp((off - 7) / 20));
  }
  function veilAt(th) {
    return clamp(-Math.cos((th * Math.PI) / 180) * 0.5, 0, 0.42);
  }

  /* ---------- layout ---------- */

  function layout() {
    const W = window.innerWidth;
    const H = hero.clientHeight;
    const u = Math.min(W / 1440, H / 900);
    st.W = W; st.H = H; st.u = u;

    // texto: começa um pouco depois do meio, alinhado ao container
    // (largura do título ~8,5em; o bloco termina perto da borda do container)
    const titleW = 8.6 * Math.min(84, Math.max(64, 64 + (W - 1920) * 0.031));
    const cl = Math.min(W * 0.5, (W + 1240) / 2 - titleW + 60);
    hero.style.setProperty('--hd3-cl', `${cl.toFixed(0)}px`);

    // ela: grande, recortada pela borda esquerda e pelo pé
    const ph = Math.round(H * 1.28);
    const pw = Math.round((ph * 1328) / 1760);
    const faceX = W * 0.27;
    const imgL = faceX - 0.49 * pw;
    const imgT = H * 0.25 - 0.196 * ph;
    const s = hero.style;
    s.setProperty('--hd3-pw', `${pw}px`);
    s.setProperty('--hd3-ph', `${ph}px`);
    s.setProperty('--hd3-pl', `${imgL.toFixed(1)}px`);
    s.setProperty('--hd3-pt', `${imgT.toFixed(1)}px`);
    const bw = pw * 1.7;
    const bh = ph * 0.5;
    s.setProperty('--hd3-bw', `${bw.toFixed(0)}px`);
    s.setProperty('--hd3-bh', `${bh.toFixed(0)}px`);
    s.setProperty('--hd3-bx', `${(faceX - bw / 2).toFixed(0)}px`);
    s.setProperty('--hd3-by', `${(imgT + 0.45 * ph - bh / 2).toFixed(0)}px`);

    // órbita: elipse larga que envolve ela e o texto
    st.lx = W * 0.5;
    st.ly = H * 0.545;
    st.A = W * 0.45;
    st.B = H * 0.35;
    st.vx = st.lx;
    st.vy = st.ly - H * 0.1;
    st.P = 1600 * u;
    st.Zr = 340 * u;
    stage.style.perspective = `${st.P.toFixed(0)}px`;
    applyCamera();
    // ângulo da órbita mais perto do rosto dela (de onde a onda parte)
    st.thHer = (Math.asin(clamp((faceX - st.lx) / st.A, -1, 1)) * 180) / Math.PI;

    const h0 = 96 * u;
    panels.forEach((p) => {
      const h = Math.round(h0);
      const w = Math.round(h0 * ASPECT[p.k]);
      p.w = w; p.h = h;
      const es = p.el.style;
      es.width = `${w}px`;
      es.height = `${h}px`;
      es.left = `${(st.vx - w / 2).toFixed(1)}px`;
      es.top = `${(st.vy - h / 2).toFixed(1)}px`;
      const sag = Math.max(3, w * 0.035);
      const d = barrelPath(w, h, sag, Math.round(12 * clamp(u, 0.9, 1.3)));
      p.card.style.clipPath = `path('${d}')`;
      p.edges.forEach((svg) => {
        svg.setAttribute('width', w);
        svg.setAttribute('height', h);
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        svg.querySelectorAll('path').forEach((path) => path.setAttribute('d', d));
      });
      es.transform = poseAt(p.th0);
    });
    measureCopy();
    if (!RM) startOrbit();
    else { panels.forEach((p) => { p.th = p.th0 + 14; p.el.style.transform = poseAt(p.th); p.veil.style.opacity = veilAt(p.th).toFixed(2); p.el.style.opacity = fadeAt(p.th).toFixed(2); }); setZAll(); }
  }

  function measureCopy() {
    st.copyRects = copyParts.map((el) => {
      const r = el.getBoundingClientRect();
      return { l: r.left, r: r.right, t: r.top, b: r.bottom };
    });
  }

  function applyCamera() {
    const vx = st.vx + st.mx * 36 * st.u;
    const vy = st.vy + st.my * 22 * st.u;
    stage.style.perspectiveOrigin = `${vx.toFixed(1)}px ${vy.toFixed(1)}px`;
  }

  /* ---------- giro (Web Animations, compositor) ---------- */

  let clock = null;   // a animação de referência (todas andam juntas)
  function startOrbit() {
    const t0 = clock ? Number(clock.currentTime) || 0 : 0;
    panels.forEach((p) => p.anims.forEach((a) => a.cancel()));
    panels.forEach((p) => {
      const kf = [];
      const kv = [];
      for (let i = 0; i <= SAMPLES; i++) {
        const th = p.th0 + (360 * i) / SAMPLES;
        kf.push({ transform: poseAt(th), opacity: fadeAt(th) });
        kv.push({ opacity: veilAt(th) });
      }
      const opt = { duration: DRIFT_MS, iterations: Infinity, easing: 'linear' };
      const a1 = p.el.animate(kf, opt);
      const a2 = p.veil.animate(kv, opt);
      a1.currentTime = t0;
      a2.currentTime = t0;
      if (!st.active) { a1.pause(); a2.pause(); }
      p.anims = [a1, a2];
    });
    clock = panels[0].anims[0];
  }
  const angleNow = () => ((Number(clock && clock.currentTime) || 0) % DRIFT_MS) / DRIFT_MS * 360;

  /* ---------- vídeos ---------- */

  function playingCount() {
    let n = 0;
    panels.forEach((p) => { if (p.playing) n += 1; });
    return n;
  }
  function startVideo(p) {
    clearTimeout(p.t);
    if (NOPLAY.test(p.video.src)) return;
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

  // camadas por ordem de profundidade (atrás dela: < 50 · na frente: > 50).
  // Só escreve quando a ordem muda (poucas vezes por volta), não a cada passo
  function setZAll() {
    const ds = panels.map((p) => ({ p, d: Math.cos((p.th * Math.PI) / 180) }));
    const back = ds.filter((o) => o.d < 0).sort((a, b) => b.d - a.d);
    const front = ds.filter((o) => o.d >= 0).sort((a, b) => a.d - b.d);
    back.forEach((o, i) => { o.z = 49 - i; });
    front.forEach((o, i) => { o.z = 51 + i; });
    ds.forEach((o) => { if (o.z !== o.p.z) { o.p.z = o.z; o.p.el.style.zIndex = String(o.z); } });
  }

  function cardOpacity(p) {
    const o = st.exitFade * (p.under ? 0.38 : 1);
    const v = o >= 0.999 ? '' : o.toFixed(3);
    if (p.card.style.opacity !== v) p.card.style.opacity = v;
  }

  /* ---------- o relógio (150ms): camadas, vídeos, véu do texto ---------- */

  function update() {
    const base = RM ? 14 : angleNow();
    const now = performance.now();
    const cand = [];
    panels.forEach((p) => {
      p.th = p.th0 + base;
      const d = Math.cos((p.th * Math.PI) / 180);
      const lim = FRONT - (p.on ? FRONT_HYST : 0);
      if (st.ready && st.exitFade > 0.4 && d > lim && !NOPLAY.test(p.video.src)) cand.push([p, d]);
      // painel passando atrás do texto: recua
      const o = orbit(p.th);
      const sc = 1 / o.k;
      const hw = (p.w * sc) / 2;
      const hh = (p.h * sc) / 2;
      const m = p.under ? -12 : 2;
      const under = d < FRONT && st.copyRects.some((c) => o.x + hw > c.l + m && o.x - hw < c.r - m && o.y + hh > c.t + m && o.y - hh < c.b - m);
      if (under !== p.under) { p.under = under; cardOpacity(p); }
    });
    setZAll();
    if (RM) return; // parado: só camadas e véu do texto, nenhum vídeo
    cand.sort((a, b) => (b[0].on - a[0].on) || (b[1] - a[1]));
    const keep = new Set(cand.slice(0, MAX_ON).map((c) => c[0]));
    // apaga antes de acender: o teto de vídeos nunca passa nem por um instante
    const want = (p) => keep.has(p) || ((p.hover || now < p.hoverUntil) && st.ready && st.exitFade > 0.4);
    panels.forEach((p) => { if (!want(p)) setOn(p, false); });
    panels.forEach((p) => { if (want(p)) setOn(p, true); });
  }

  /* ---------- a virada: uma onda, uma vez ---------- */

  function wave() {
    if (st.waved) return;
    st.waved = true;
    hero.classList.add('hd3-alive');
    const base = angleNow();
    panels.forEach((p) => {
      const d = Math.abs(wrap(p.th0 + base - st.thHer)) / 180;
      setTimeout(() => {
        p.el.classList.add('is-lit', 'is-wave');
        setTimeout(() => p.el.classList.remove('is-wave'), 1500);
      }, Math.round(d * WAVE_MS));
    });
    setTimeout(() => { st.ready = true; update(); }, WAVE_MS + 200);
  }

  /* ---------- ativo / pausado ---------- */

  let timer = 0;
  let visible = true;
  function setActive() {
    const act = visible && !document.hidden;
    if (act === st.active) return;
    st.active = act;
    hero.classList.toggle('hd3-off', !act);
    panels.forEach((p) => p.anims.forEach((a) => (act ? a.play() : a.pause())));
    if (act) {
      if (!RM && !timer) timer = setInterval(update, 150);
      panels.forEach((p) => { if (p.on) { p.playing = false; startVideo(p); } });
      if (titleVideo) { const pr = titleVideo.play(); if (pr && pr.catch) pr.catch(() => {}); }
    } else {
      clearInterval(timer);
      timer = 0;
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
      measureCopy();
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
    hero.classList.add('hd3-alive');
    panels.forEach((p) => p.el.classList.add('is-lit'));
    update();
    return;
  }

  /* ---------- 1. entrada ---------- */

  gsap.set(person, { opacity: 0, x: -30 * st.u });
  gsap.set(copyParts, { opacity: 0, y: 20 });
  const intro = gsap.timeline({
    delay: 0.1,
    onComplete: () => { gsap.set(copyParts, { clearProps: 'transform' }); measureCopy(); },
  });
  intro.to(person, { opacity: 1, x: 0, duration: 1.8, ease: 'power3.out' }, 0);
  intro.to(copyParts, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.06 }, 0.2);
  // os painéis chegam do fundo, a partir do ponto mais perto dela
  panels.forEach((p) => {
    const d = Math.abs(wrap(p.th0 - st.thHer)) / 180;
    const opt = { duration: 1400, delay: 300 + d * 500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' };
    // a profundidade vai no próprio painel (filho direto da perspectiva);
    // a opacidade vai na carta (a do painel pertence ao giro)
    p.el.animate([{ translate: `0px 0px ${(-700 * st.u).toFixed(0)}px` }, { translate: '0px 0px 0px' }], opt);
    p.card.animate([{ opacity: 0 }, { opacity: 1 }], opt);
  });
  intro.call(wave, null, 1.95);

  timer = setInterval(update, 150);
  update();

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
      update();
    });
    p.el.addEventListener('pointerleave', () => {
      p.hover = false;
      p.hoverUntil = performance.now() + 1000;
    });
  });

  /* ---------- 4. rolagem curta: a órbita se abre ---------- */

  function applyScroll(p) {
    st.p = p;
    if (p > 0.01) wave();
    hero.classList.toggle('hd3-scrub', p > 0.001);
    const e = smooth(clamp(p / 0.95));
    const s = 1 + 1.25 * Math.pow(e, 1.25);
    st.exitFade = 1 - smooth(clamp((e - 0.25) / 0.6));
    panels.forEach((q) => {
      q.el.style.scale = e > 0.001 ? s.toFixed(4) : '';
      cardOpacity(q);
    });
    copy.style.transform = e > 0.001 ? `translate3d(0, ${(-26 * e).toFixed(1)}px, 0)` : '';
    person.style.scale = e > 0.001 ? (1 + 0.03 * e).toFixed(4) : '';
    update();
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
  window.__hd3 = { st, panels, playingCount, update, angleNow };
})();
