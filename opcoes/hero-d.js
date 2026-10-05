/* ============================================================
   Hero D — Retrato
   Coreografia (lê-se em 3 segundos)
   1. Entrada: ela surge do escuro ainda em cinza, o texto assenta e
      os painéis chegam de fora girando até pousar no anel ao redor
      dela — todos cinzas, parados (o "antes").
      Então uma onda de luz corre o anel a partir da frente dela: em
      menos de um segundo todos os painéis ganham cor e ela ganha cor
      junto (o "depois"). É uma transformação coletiva, de uma vez.
   2. Vida: o anel gira devagar (animação CSS, compositor). Os painéis
      que passam na frente dela tocam o vídeo (no máximo 4); os demais
      ficam em cor, parados.
   3. Interação: o cursor inclina levemente o anel; passar sobre um
      painel toca o vídeo dele.
   4. Rolagem (hero preso só ~75vh): o anel gira e se abre para fora,
      os painéis passam pela câmera e somem; depois o hero sobe e a
      próxima seção assume.
   Desempenho: por quadro só transform/opacity. No ócio não há rAF:
   o giro é CSS e um timer leve (150ms) só troca classes quando um
   painel cruza o arco da frente. No máximo 4 vídeos de painel (5 com
   hover) + o da frase. Tudo pausa fora da tela / aba oculta.
   ============================================================ */

(() => {
  const hero = document.getElementById('hd');
  if (!hero || !window.gsap) return;

  const root = document.documentElement;
  const mqWide = window.matchMedia('(min-width: 900px)');
  const mqRM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reload = () => window.location.reload();
  mqWide.addEventListener ? mqWide.addEventListener('change', reload) : mqWide.addListener(reload);
  mqRM.addEventListener ? mqRM.addEventListener('change', reload) : mqRM.addListener(reload);
  if (!mqWide.matches) return; // < 900px: layout estático do CSS

  const RM = mqRM.matches;
  root.classList.add('hd-3d');
  if (RM) root.classList.add('hd-rm');
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------- elementos ---------- */

  const portrait = hero.querySelector('.hd-portrait');
  const tilt = hero.querySelector('.hd-tilt');
  const enter = hero.querySelector('.hd-enter');
  const roll = hero.querySelector('.hd-roll');
  const ring = hero.querySelector('.hd-ring');
  const copy = hero.querySelector('.hd-copy');
  const titleVideo = copy.querySelector('.title-clip video');
  const copyParts = [
    copy.querySelector('.hero-badge'),
    ...copy.querySelectorAll('.title .line'),
    copy.querySelector('.sub'),
    copy.querySelector('.actions'),
    copy.querySelector('.next-stop'),
  ];

  /* ---------- parâmetros ---------- */

  const DRIFT_MS = 84000;        // uma volta do anel (igual ao CSS)
  const ARC_MIN = -30;           // arco da frente que toca vídeo (graus;
  const ARC_MAX = 62;            //  0 = frente, positivo = à direita)
  const ARC_HYST = 8;            // folga para não piscar na borda do arco
  const MAX_ON = 4;              // vídeos de painel tocando no arco (+1 com hover)
  const WAVE_MS = 780;           // a onda leva isso para dar a volta
  // a faixa de baixo gira numa órbita 18% mais larga: painéis vizinhos
  // nunca se cruzam no espaço 3D (o cruzamento fazia a borda piscar)
  const TIER_OUT = 1.18;
  const TILT = -12;              // inclinação do anel (vemos de cima)
  const SIZES = {                // em px numa tela 1440×900
    l: [196, 110],
    s: [148, 140],
    p: [104, 182],
  };
  const JITTER = [3, -4, 5, -2, -5, 4, -3, 2, 5, -4, 3, -2, 4, -3, 2, -5];

  const panels = Array.from(hero.querySelectorAll('.hd-panel')).map((el, i, all) => ({
    el,
    front: el.querySelector('.hd-front'),
    back: el.querySelector('.hd-back'),
    video: el.querySelector('video'),
    k: el.dataset.k || 's',
    yy: parseFloat(el.dataset.y) || 0,
    a: (i * 360) / all.length + (JITTER[i % JITTER.length] || 0),
    phi: 0,
    w: 0,
    on: false,
    lit: false,
    under: false,
    y: 0,
    rf: 1,
    kF: 1,
    kB: 0,
    hover: false,
    hoverUntil: 0,
    playing: false,
    t: 0,
    flashT: 0,
    edges: null,
  }));

  // estes dois clipes têm cortes com clarão quase branco (um "piscar"):
  // aparecem só como foto em cor, nunca tocam
  const NOPLAY = /crowd-hands|arena-audience/;

  /* ---------- estado ---------- */

  const st = {
    u: 1,
    W: 0,
    H: 0,
    R: 470,
    persp: 1650,
    cx: 0,
    copyL: 0,
    copyR: 0,
    enterRot: 0,
    rMul: 1,
    exitMul: 1,
    rollRot: 0,
    lift: 0,
    exit: 0,
    exitFade: 1,
    fade: 1,
    ry: 0,
    rx: 0,
    p: 0,
    camY: 0,
    waved: false,
    ready: false,
    active: true,
  };

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
  const easeRoll = gsap.parseEase('power1.inOut');

  /* ---------- contorno curvo dos painéis ----------
     O painel é um trecho de cilindro visto um pouco de cima: na frente
     as bordas de cima e de baixo descem no meio (sorriso); nas costas
     sobem (a face de trás usa o contorno invertido). */

  function arcPath(w, h, s, r, dir) {
    const tc = dir > 0 ? 0 : s;          // borda de cima: cantos
    const tm = dir > 0 ? s : 0;          //                meio
    const bc = dir > 0 ? h - s : h;      // borda de baixo: cantos
    const bm = dir > 0 ? h : h - s;      //                 meio
    const k = 4 * (r / w) * (1 - r / w); // parábola no ponto x = r
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
    const edgeF = makeSvg('hd-edge', ['hd-hair', '']);
    const flash = makeSvg('hd-flash', ['']);
    const edgeB = makeSvg('hd-edge', ['hd-hair', '']);
    p.front.appendChild(edgeF);
    p.front.appendChild(flash);
    p.back.appendChild(edgeB);
    p.edges = { edgeF, flash, edgeB };
  });

  /* ---------- layout (medido; refeito no resize) ---------- */

  function measureCopy() {
    let r = 0;
    let l = Infinity;
    copyParts.forEach((el) => {
      // as linhas do título têm width: fit-content — mede o texto real
      const rc = el.getBoundingClientRect();
      l = Math.min(l, rc.left);
      r = Math.max(r, rc.right);
    });
    st.copyL = l;
    st.copyR = r;
  }

  function layout() {
    const W = window.innerWidth;
    const H = hero.clientHeight;
    const u = Math.min(W / 1440, H / 900);
    st.W = W;
    st.H = H;
    st.u = u;

    // o texto precisa estar sem transform para medir
    const saved = copyParts.map((el) => el.style.transform);
    copyParts.forEach((el) => { el.style.transform = 'none'; });
    measureCopy();
    copyParts.forEach((el, i) => { el.style.transform = saved[i]; });

    // composição em duas colunas: texto à esquerda; à direita ela e o
    // anel inteiro ao redor dela (o anel não invade o texto)
    st.R = 380 * u;
    st.persp = 1600 * u;
    const ph = Math.round(H * 0.9);
    const pw = Math.round((ph * 1328) / 1760);
    let axis = Math.max(st.copyR + 1.0 * st.R, W * 0.62);
    axis = Math.min(axis, W - st.R - 60 * u);
    const imgL = axis - 0.5 * pw;               // eixo = pescoço (50%)
    const imgT = H - ph + Math.round(H * 0.02);

    // centro do anel: altura do peito; câmera na altura dos olhos
    st.cx = axis;
    const cy = imgT + 0.55 * ph;
    const poy = imgT + 0.3 * ph;
    st.camY = poy - cy;            // câmera acima do centro do anel (px)

    const s = hero.style;
    s.setProperty('--hd-cx', `${st.cx.toFixed(1)}px`);
    s.setProperty('--hd-cy', `${cy.toFixed(1)}px`);
    s.setProperty('--hd-pox', `${st.cx.toFixed(1)}px`);
    s.setProperty('--hd-poy', `${poy.toFixed(1)}px`);
    s.setProperty('--hd-persp', `${st.persp.toFixed(0)}px`);
    s.setProperty('--hd-pw', `${pw}px`);
    s.setProperty('--hd-ph', `${ph}px`);
    s.setProperty('--hd-pl', `${(imgL - st.cx).toFixed(1)}px`);
    s.setProperty('--hd-pt', `${(imgT - cy).toFixed(1)}px`);

    // luz ambiente: um plano chapado atrás de tudo, FORA do contexto 3D
    // (antes ficava no 3D e podia cruzar os painéis na saída)
    const bw = Math.round(pw * 2.85);
    const bh = Math.round(ph * 0.57);
    s.setProperty('--hd-bw', `${bw}px`);
    s.setProperty('--hd-bh', `${bh}px`);
    s.setProperty('--hd-bx', `${(st.cx - bw / 2).toFixed(1)}px`);
    s.setProperty('--hd-by', `${(cy - (cy - poy) * 0.26 - bh / 2).toFixed(1)}px`);

    // painéis
    panels.forEach((p) => {
      const [bw, bh] = SIZES[p.k] || SIZES.s;
      const w = Math.round(bw * u);
      const h = Math.round(bh * u);
      p.w = w;
      const ps = p.el.style;
      ps.setProperty('--w', `${w}px`);
      ps.setProperty('--h', `${h}px`);
      p.y = p.yy * 66 * u;
      p.rf = p.yy > 0 ? TIER_OUT : 1;
      const sag = Math.max(5, w * 0.045);
      const rad = Math.round(13 * Math.min(1.25, Math.max(0.9, u)));
      const dF = arcPath(w, h, sag, rad, 1);
      const dB = arcPath(w, h, sag, rad, -1);
      p.front.style.clipPath = `path('${dF}')`;
      p.back.style.clipPath = `path('${dB}')`;
      [[p.edges.edgeF, dF], [p.edges.flash, dF], [p.edges.edgeB, dB]].forEach(([svg, d]) => {
        svg.setAttribute('width', w);
        svg.setAttribute('height', h);
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        svg.querySelectorAll('path').forEach((path) => path.setAttribute('d', d));
      });
    });

    ringR = -1;
    applyRing();
  }

  /* ---------- anel ---------- */

  // escreve só o que mudou, direto em cada painel (sem variáveis CSS
  // herdadas — elas recalculariam o estilo de centenas de nós por quadro)
  let ringR = -1;
  let ringF = -1;
  function applyRing() {
    const R = Math.round(st.R * st.rMul * 10) / 10;
    if (R !== ringR) {
      ringR = R;
      panels.forEach((p) => {
        p.el.style.transform = `rotateY(${p.a.toFixed(2)}deg) translateZ(${(R * p.rf).toFixed(1)}px) translateY(${p.y.toFixed(1)}px)`;
      });
    }
    const F = Math.round(st.fade * 1000) / 1000;
    if (F !== ringF) {
      ringF = F;
      panels.forEach(faceOpacity);
    }
  }
  function faceOpacity(p) {
    const o = (ringF < 0 ? 1 : ringF) * (p.under ? 0.4 : 1);
    const f = o * p.kF;
    const b = o * p.kB;
    const vf = f >= 0.999 ? '' : f.toFixed(3);
    const vb = b >= 0.999 ? '' : b.toFixed(3);
    if (p.front.style.opacity !== vf) p.front.style.opacity = vf;
    if (p.back.style.opacity !== vb) p.back.style.opacity = vb;
  }
  function applyEnter() {
    enter.style.transform = `rotateY(${st.enterRot.toFixed(2)}deg)`;
  }
  function applyRoll() {
    roll.style.transform = `translate3d(0, ${(-st.lift).toFixed(1)}px, 0) rotateY(${st.rollRot.toFixed(2)}deg)`;
  }
  function applyTilt() {
    tilt.style.transform = `rotateX(${(TILT + st.rx).toFixed(2)}deg) rotateY(${st.ry.toFixed(2)}deg)`;
  }

  // giro ocioso: Web Animation (compositor). Não é uma animação CSS
  // porque o pin do ScrollTrigger move o hero no DOM e isso reiniciaria
  // o giro (um salto visível); a Web Animation continua de onde estava.
  let driftAnim = null;
  if (!RM && ring.animate) {
    driftAnim = ring.animate(
      [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(360deg)' }],
      { duration: DRIFT_MS, iterations: Infinity, easing: 'linear' }
    );
  }
  function driftAngle() {
    if (!driftAnim) return 0;
    const t = Number(driftAnim.currentTime) || 0;
    return ((t % DRIFT_MS) / DRIFT_MS) * 360;
  }
  const ringAngle = () => driftAngle() + st.enterRot + st.rollRot + st.ry;

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
    if (now) {
      p.playing = false;
      p.video.pause();
      return;
    }
    // o brilho apaga antes de pausar
    p.t = setTimeout(() => {
      if (!p.on) { p.playing = false; p.video.pause(); }
    }, 700);
  }
  function setOn(p, on) {
    if (p.on === on) return;
    p.on = on;
    p.el.classList.toggle('is-on', on);
    if (on) {
      if (playingCount() >= MAX_ON) {
        panels.forEach((q) => { if (q.playing && !q.on) stopVideo(q, true); });
      }
      if (st.active) startVideo(p);
    } else {
      stopVideo(p, false);
    }
  }
  function flash(p) {
    p.el.classList.add('is-flash');
    clearTimeout(p.flashT);
    p.flashT = setTimeout(() => p.el.classList.remove('is-flash'), 1400);
  }

  /* ---------- a onda: todos ganham cor juntos, e ela também ---------- */

  function wave() {
    if (st.waved) return;
    st.waved = true;
    hero.classList.add('hd-alive');
    const base = ringAngle();
    panels.forEach((p) => {
      // parte da frente dela e corre o anel pelos dois lados
      const d = Math.abs(wrap(p.a + base)) / 180;
      setTimeout(() => {
        p.lit = true;
        p.el.classList.add('is-lit');
        flash(p);
      }, Math.round(d * WAVE_MS));
    });
    setTimeout(() => {
      st.ready = true;
      update();
    }, WAVE_MS + 120);
  }

  /* ---------- qual face aparece ----------
     O backface-visibility decide a troca exata (de perfil). Fora dessa
     zona, o JS também tira da renderização a face que está claramente de
     costas para a câmera — assim nenhuma face "vaza" pela outra. O teste
     usa a posição real da câmera (perspectiva e inclinação). */
  function setFacing(p) {
    const ph = (p.phi * Math.PI) / 180;
    const t = ((TILT + st.rx) * Math.PI) / 180;
    const R = st.R * st.rMul * p.rf;
    const x = R * Math.sin(ph);
    const z0 = R * Math.cos(ph);
    const y = p.y * Math.cos(t) - z0 * Math.sin(t);
    const z = p.y * Math.sin(t) + z0 * Math.cos(t);
    const vx = -x;
    const vy = (st.camY || 0) - y;
    const vz = st.persp - z;
    const len = Math.hypot(vx, vy, vz) || 1;
    const dot = (Math.sin(ph) * vx - Math.cos(ph) * Math.sin(t) * vy + Math.cos(ph) * Math.cos(t) * vz) / len;
    // perto do perfil as duas faces somem suavemente (nada de lâmina fina,
    // fresta ou troca brusca); fora dele só a face virada para a câmera
    const q = (v) => Math.round(Math.min(1, Math.max(0, v)) * 10) / 10;
    const kF = q((dot - 0.12) / 0.23);
    const kB = q((-dot - 0.12) / 0.23);
    if (kF !== p.kF || kB !== p.kB) {
      p.kF = kF;
      p.kB = kB;
      faceOpacity(p);
    }
  }

  /* ---------- o "relógio": quem toca vídeo, quem recua ---------- */

  function update() {
    if (RM) return;
    const base = ringAngle();
    const now = performance.now();
    const cand = [];
    panels.forEach((p) => {
      p.phi = wrap(p.a + base);
      setFacing(p);
      const lo = ARC_MIN - (p.on ? ARC_HYST : 0);
      const hi = ARC_MAX + (p.on ? ARC_HYST : 0);
      if (st.ready && st.fade > 0.3 && p.phi > lo && p.phi < hi) cand.push(p);
    });
    const mid = (ARC_MIN + ARC_MAX) / 2;
    cand.sort((a, b) => (b.on - a.on) || (Math.abs(a.phi - mid) - Math.abs(b.phi - mid)));
    const keep = new Set(cand.slice(0, MAX_ON));

    // apaga antes de acender: o teto de vídeos nunca passa nem por um instante
    const want = new Map(panels.map((p) => [p, keep.has(p) || ((p.hover || now < p.hoverUntil) && st.ready && st.fade > 0.3)]));
    panels.forEach((p) => { if (!want.get(p)) setOn(p, false); });
    panels.forEach((p) => { if (want.get(p)) setOn(p, true); });
    panels.forEach((p) => {
      // painel passando atrás do texto: recua (lê-se o texto)
      const rad = (p.phi * Math.PI) / 180;
      const R = st.R * st.rMul * p.rf;
      const z = R * Math.cos(rad);
      const k = st.persp / Math.max(200, st.persp - z);
      const sx = st.cx + R * Math.sin(rad) * k;
      const half = (p.w * k * Math.max(0.15, Math.abs(Math.cos(rad)))) / 2;
      // folga diferente para entrar e sair: o painel não fica piscando na borda
      const m = p.under ? -14 : 14;
      const under = sx + half > st.copyL - 30 + m && sx - half < st.copyR + 24 - m;
      if (under !== p.under) {
        p.under = under;
        faceOpacity(p);
      }
    });
  }

  /* ---------- ativo / pausado ---------- */

  let timer = 0;
  let visible = true;
  function setActive() {
    const act = visible && !document.hidden;
    if (act === st.active) return;
    st.active = act;
    hero.classList.toggle('hd-off', !act);
    if (driftAnim) { if (act) driftAnim.play(); else driftAnim.pause(); }
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
  applyEnter();
  applyRoll();
  applyTilt();

  // a fonte do título muda a largura do texto: refaz o layout quando ela chega
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

  /* ---------- movimento reduzido: composição parada, em cor ---------- */

  if (RM) {
    st.rollRot = 14;
    applyRoll();
    { const base = ringAngle(); panels.forEach((p) => { p.phi = wrap(p.a + base); setFacing(p); }); }
    hero.classList.add('hd-alive');
    panels.forEach((p) => { p.lit = true; p.el.classList.add('is-lit'); });
    return;
  }

  /* ---------- 1. entrada ---------- */

  hero.classList.add('hd-intro');
  st.rMul = 1.75;
  st.fade = 0;
  st.enterRot = -120;
  applyRing();
  applyEnter();

  gsap.set(portrait, { opacity: 0, y: 36 * st.u, force3D: true });
  gsap.set(copyParts, { opacity: 0, y: 22 });

  const intro = gsap.timeline({
    delay: 0.12,
    onComplete: () => {
      gsap.set(copyParts, { clearProps: 'transform' });
    },
  });
  // ela surge do escuro, ainda apagada
  intro.call(() => hero.classList.add('hd-dawn'), null, 0.1);
  intro.to(portrait, { opacity: 1, y: 0, duration: 1.8, ease: 'power3.out' }, 0);
  // o texto assenta
  intro.to(copyParts, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.06 }, 0.2);
  // os painéis chegam de fora girando e pousam no anel
  const ring0 = { rot: -120, r: 1.75, f: 0 };
  intro.to(ring0, {
    rot: 0,
    r: 1,
    duration: 2.4,
    ease: 'expo.out',
    onUpdate: () => {
      st.enterRot = ring0.rot;
      st.rMul = Math.max(ring0.r, st.exitMul);
      applyEnter();
      applyRing();
      const base = ringAngle();
      panels.forEach((p) => { p.phi = wrap(p.a + base); setFacing(p); });
    },
  }, 0.3);
  intro.to(ring0, {
    f: 1,
    duration: 1.1,
    ease: 'sine.out',
    onUpdate: () => {
      st.fade = Math.min(ring0.f, st.exitFade);
      applyRing();
    },
  }, 0.35);
  intro.call(() => hero.classList.remove('hd-intro'), null, 1.6);
  // a onda: tudo ganha cor junto, e ela também
  intro.call(wave, null, 1.65);

  timer = setInterval(update, 150);

  /* ---------- 3. interação ---------- */

  const tiltTween = { rx: 0, ry: 0 };
  let tiltAnim = null;
  hero.addEventListener('pointermove', (e) => {
    const nx = (e.clientX / st.W - 0.5) * 2;
    const ny = (e.clientY / st.H - 0.5) * 2;
    if (tiltAnim) tiltAnim.kill();
    tiltAnim = gsap.to(tiltTween, {
      rx: -ny * 2.2,
      ry: nx * 4,
      duration: 1.4,
      ease: 'power3.out',
      onUpdate: () => {
        st.rx = tiltTween.rx;
        st.ry = tiltTween.ry;
        applyTilt();
      },
    });
  });

  panels.forEach((p) => {
    p.front.addEventListener('pointerenter', () => {
      p.hover = true;
      if (p.lit && !p.on) flash(p);
      update();
    });
    p.front.addEventListener('pointerleave', () => {
      p.hover = false;
      p.hoverUntil = performance.now() + 1200;
    });
  });

  /* ---------- 4. rolagem curta: o anel gira e se abre ---------- */

  function applyScroll(p) {
    st.p = p;
    if (p > 0.01) wave(); // rolou antes da onda: transforma já
    hero.classList.toggle('hd-scrub', p > 0.001);
    st.rollRot = 110 * easeRoll(clamp(p / 0.95));
    // o anel se abre: os painéis se afastam dela, passam pela câmera
    // e somem pelas bordas; o texto fica (sai junto com o hero depois)
    const e = smooth(clamp((p - 0.08) / 0.92));
    st.exit = e;
    st.exitMul = 1 + 1.7 * Math.pow(e, 1.35);
    st.lift = e * 40 * st.u;
    st.rMul = Math.max(st.exitMul, st.enterRot !== 0 ? st.rMul : 1);
    const f = clamp(1 - Math.pow(clamp((e - 0.35) / 0.65), 1.2));
    st.exitFade = f;
    st.fade = st.enterRot !== 0 ? Math.min(f, st.fade) : f;
    applyRoll();
    applyRing();
    // o texto sobe só um pouco (paralaxe), sempre legível
    copy.style.transform = p > 0.001 ? `translate3d(0, ${(-26 * e).toFixed(1)}px, 0)` : '';
    // ela avança um pouco (a câmera chega perto)
    gsap.set(portrait, { scale: 1 + 0.035 * e });
    update();
  }

  if (window.ScrollTrigger) {
    const proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: '+=75%',
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
      },
      onUpdate: () => applyScroll(proxy.p),
    });
  }

  // verificação
  window.__hd = { st, panels, update, playingCount };
})();
