/* ============================================================
   Opção F — Tela
   Uma tela de cinema no centro, inclinada em 3D, com um mosaico de
   muitas vidas. Na chegada tudo é "antes" (fotogramas cinza e
   parados); uma frente de luz curva atravessa a tela inteira em
   ~2,5 s e, atrás dela, tudo vira cor e vida ("depois"). Depois, a
   vida continua com calma: quatro quadros tocam e passam a vez, cada
   um acendendo com um brilho que passa (a mesma frente, pequena). O
   cursor aproxima e toca o quadro sob ele. Na rolagem, a tela se
   endireita e cresce na direção de quem vê, e entrega a página.

   Como a cor muda exatamente onde a frente está, sem custo:
   - .hf-front anda só com translateX; ela carrega uma janela
     circular enorme (.hf-clip, overflow hidden, raio = 0,8 × largura
     da tela), cuja borda é a frente curva, e o feixe de luz (SVG com
     filtros estáticos, pintado uma vez);
   - dentro da janela, .hf-after anda o mesmo tanto ao contrário:
     o mosaico colorido fica parado no lugar e só o recorte se move;
   - o lado "antes" são imagens já tratadas em cinza (sem filtro) e
     some (visibility) quando a frente termina;
   - o brilho de cada quadro é Web Animations (compositor).
   No repouso, nada roda por quadro no JS: só os vídeos e as
   animações de compositor.
   ============================================================ */

(() => {
  'use strict';

  const root = document.documentElement;
  const hero = document.querySelector('.hf-hero');
  if (!hero) return;

  const q = (s) => hero.querySelector(s);
  const qa = (s) => Array.from(hero.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (p, a, b) => clamp((p - a) / (b - a));

  const el = {
    copy: q('.hf-copy'),
    copyKids: qa('.hf-copy .hero-copy > *'),
    lines: qa('.hf-copy .title .line'),
    headClip: q('.title-clip video'),
    stage: q('.hf-stage'),
    tilt: q('.hf-tilt'),
    screen: q('.hf-screen'),
    front: q('.hf-front'),
    after: q('.hf-after'),
    beam: q('.hf-beam'),
    svg: q('.hf-beam-svg'),
    tagA: q('.hf-tag--antes'),
    tagD: q('.hf-tag--depois'),
    ambG: q('.hf-amb-g'),
    ambC: q('.hf-amb-c'),
    mosaic: q('.hf-after .hf-mosaic'),
    tiles: qa('.hf-tile')
  };
  const videos = el.tiles.map((t) => t.querySelector('video'));
  const lights = el.tiles.map((t) => t.querySelector('.hf-tile-light'));
  const N = el.tiles.length;

  /* ---------- modo estático: movimento reduzido, tela estreita ou sem GSAP ---------- */

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isStatic = root.classList.contains('hf-static') || !window.gsap || typeof window.ScrollTrigger === 'undefined';
  if (isStatic) {
    root.classList.add('hf-static', 'hf-go');
    hero.classList.add('hf-lit');
    if (reduce && el.headClip) {
      el.headClip.removeAttribute('autoplay');
      el.headClip.pause();
    }
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- ajustes ---------- */

  const FIRST = [0, 8, 3, 9];   // quadros que acendem tocando na passagem da frente
  const MAX_AUTO = 4;           // quadros tocando sozinhos (+1 pelo cursor)
  const STEP = 3400;            // ms entre uma troca e outra
  const REST_TILT = 24;         // graus de inclinação no repouso
  const PERSP = 1700;           // px da perspectiva da tela
  const FOLD_SHOW = 0.88;       // fração da tela inclinada visível na primeira dobra
  const SWEEP = 2.5;            // s da frente atravessando a tela

  const ease = {
    intro: gsap.parseEase('power2.inOut'),
    out: gsap.parseEase('power2.in')
  };

  /* ---------- estado ---------- */

  const S = {
    ent: 0, entY: 110, entTilt: 14, // entrada da tela
    f: 0,                           // frente: 0 = tudo cinza, 1 = tudo em cor
    sp: 0,                          // rolagem: a tela se endireita e cresce
    xp: 0,                          // rolagem: a tela passa por cima e entrega a página
    rx: 0, ry: 0,                   // parallax do cursor
    lit: false,
    visible: true
  };
  const G = {};

  /* ---------- geometria ---------- */

  function arcX(y) {
    const dy = y - G.H / 2;
    return G.R - Math.sqrt(Math.max(0, G.R * G.R - dy * dy));
  }

  function buildBeam() {
    const { H, R, s, PL, PR } = G;
    const w = PL + s + PR;
    el.beam.style.left = -PL + 'px';
    el.beam.style.width = w + 'px';
    const x0 = PL + s;
    const arc = (dx) => `M ${x0 + dx} -2 A ${R} ${R} 0 0 0 ${x0 + dx} ${H + 2}`;
    el.svg.setAttribute('viewBox', `0 0 ${w} ${H}`);
    el.svg.innerHTML = `
      <defs>
        <filter id="hf-b28" x="-200%" y="-20%" width="500%" height="140%"><feGaussianBlur stdDeviation="28"/></filter>
        <filter id="hf-b12" x="-200%" y="-20%" width="500%" height="140%"><feGaussianBlur stdDeviation="12"/></filter>
        <filter id="hf-b3" x="-200%" y="-20%" width="500%" height="140%"><feGaussianBlur stdDeviation="2.6"/></filter>
        <radialGradient id="hf-node"><stop offset="0" stop-color="#F4FFE6" stop-opacity="1"/><stop offset=".35" stop-color="#D8FFA6" stop-opacity=".55"/><stop offset="1" stop-color="#A8FF35" stop-opacity="0"/></radialGradient>
      </defs>
      <path d="${arc(70)}" stroke="#A8FF35" stroke-opacity=".18" stroke-width="150" fill="none" filter="url(#hf-b28)"/>
      <path d="${arc(0)}" stroke="#A8FF35" stroke-opacity=".45" stroke-width="20" fill="none" filter="url(#hf-b12)"/>
      <path d="${arc(0)}" stroke="#C6FF7A" stroke-opacity=".92" stroke-width="4" fill="none" filter="url(#hf-b3)"/>
      <path d="${arc(0)}" stroke="#F4FFE6" stroke-width="1.5" fill="none"/>
      <circle cx="${PL}" cy="${H / 2}" r="46" fill="url(#hf-node)" opacity=".55"/>
    `;
    const y = 18 + 15;
    const ax = PL + arcX(y);
    el.tagA.style.right = (w - ax + 14) + 'px';
    el.tagD.style.left = (ax + 14) + 'px';
  }

  function measure() {
    G.W = el.screen.offsetWidth;
    G.H = el.screen.offsetHeight;
    G.R = G.W * 0.8;
    G.s = arcX(0);
    G.PL = 70; G.PR = 230;
    G.X0 = G.W + 60;            // frente fora da borda direita: tudo "antes"
    G.X1 = -(G.s + 190);        // frente além da borda esquerda: tudo "depois"
    // repouso: escala que deixa ~88% da tela inclinada acima da dobra.
    // A origem é a borda de cima, então a projeção da borda de baixo é
    // h·cos(θ)·P / (P − h·sen(θ)), com h = altura × escala.
    const th = REST_TILT * Math.PI / 180;
    const projH = (k) => { const h = G.H * k; return h * Math.cos(th) * PERSP / (PERSP - h * Math.sin(th)); };
    const avail = window.innerHeight - el.stage.offsetTop;
    let lo = 0.55, hi = 0.84;
    if (projH(hi) * FOLD_SHOW <= avail) lo = hi;
    else for (let n = 0; n < 18; n++) { const m = (lo + hi) / 2; if (projH(m) * FOLD_SHOW <= avail) lo = m; else hi = m; }
    G.restS = lo;
    el.beam.style.setProperty('--hf-tag-k', Math.min(1.35, 0.84 / lo).toFixed(3));
    buildBeam();
    // centro de cada quadro, em x da tela (para saber quando a frente passa)
    G.cx = el.tiles.map((t) => t.offsetLeft + t.offsetWidth / 2);
  }

  /* ---------- escrita com cache (só o que mudou) ---------- */

  function css(node, prop, v) {
    const c = node._css || (node._css = {});
    if (c[prop] === v) return;
    c[prop] = v;
    node.style[prop] = v;
  }

  /* ---------- render ---------- */

  function frontX(f) { return lerp(G.X0, G.X1, f); }
  function coverage(f) { return clamp((G.W - frontX(f)) / G.W); }

  function render() {
    const it = ease.intro(S.sp);
    const xe = ease.intro(S.xp);
    const rx = lerp(REST_TILT + S.entTilt * (1 - S.ent), 0, it) + S.rx * (1 - it) - 8 * xe;
    const ry = S.ry * (1 - it);
    const sc = lerp(G.restS, 1, it) + 0.05 * xe;
    const y = S.entY * (1 - S.ent);
    css(el.tilt, 'transform', `perspective(${PERSP}px) translate3d(0, ${y.toFixed(2)}px, 0) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) scale(${sc.toFixed(4)})`);
    css(el.stage, 'opacity', S.ent < 1 ? Math.min(1, S.ent * 1.7).toFixed(3) : '');

    if (!S.lit) {
      const x = frontX(S.f);
      css(el.front, 'transform', `translate3d(${x.toFixed(2)}px, 0, 0)`);
      css(el.after, 'transform', `translate3d(${(-x).toFixed(2)}px, 0, 0)`);
    }

    const cov = S.lit ? 1 : coverage(S.f);
    css(el.ambG, 'opacity', (0.42 * S.ent * (1 - cov)).toFixed(3));
    css(el.ambC, 'opacity', ((0.1 + 0.7 * cov + 0.15 * it) * S.ent * (1 - 0.75 * xe)).toFixed(3));

    const ct = ease.out(seg(S.sp, 0.05, 0.8));
    css(el.copy, 'opacity', (1 - ct).toFixed(3));
    css(el.copy, 'transform', `translate3d(0, ${(-60 * ct).toFixed(2)}px, 0)`);
  }

  /* ---------- vídeos: no máximo 4 quadros + 1 pelo cursor ---------- */

  let live = [];               // quadros tocando sozinhos, do mais antigo ao mais novo
  let hoverIdx = -1;
  const lastOn = new Array(N).fill(-1e9);
  const active = () => S.visible && !document.hidden;

  function play(v) {
    if (!v.paused) return;
    const pr = v.play();
    if (pr && pr.catch) pr.catch(() => {});
  }
  function syncVideos() {
    const on = active();
    videos.forEach((v, i) => {
      if (on && (live.includes(i) || i === hoverIdx)) play(v);
      else if (!v.paused) v.pause();
    });
    if (el.headClip) {
      if (on && S.sp < 0.95) play(el.headClip);
      else if (!el.headClip.paused) el.headClip.pause();
    }
  }

  function flash(i) {
    // o brilho curvo passa pelo quadro, da direita para a esquerda
    if (!lights[i].animate) return;
    lights[i].animate([
      { transform: 'translate3d(150%, 0, 0)', opacity: 0 },
      { opacity: 1, offset: 0.22 },
      { opacity: 1, offset: 0.72 },
      { transform: 'translate3d(-165%, 0, 0)', opacity: 0 }
    ], { duration: 1500, easing: 'cubic-bezier(0.5, 0.08, 0.3, 1)' });
  }

  function energize(i, withFlash) {
    if (live.includes(i)) return;
    live.push(i);
    lastOn[i] = performance.now();
    el.tiles[i].classList.add('is-live');
    if (withFlash) flash(i);
    if (active()) play(videos[i]);
  }
  function retire(i) {
    live = live.filter((x) => x !== i);
    el.tiles[i].classList.remove('is-live');
    if (i !== hoverIdx) videos[i].pause();
  }

  // troca calma: o mais antigo descansa (fica em cor, parado) e outro acende
  let timer = 0;
  function step() {
    timer = 0;
    if (!active() || !S.lit) return;
    if (live.length >= MAX_AUTO) {
      const old = live.find((i) => i !== hoverIdx);
      if (old !== undefined) retire(old);
    }
    const pool = [...Array(N).keys()]
      .filter((i) => !live.includes(i) && i !== hoverIdx)
      .sort((a, b) => lastOn[a] - lastOn[b])
      .slice(0, 4);
    if (pool.length) energize(pool[Math.floor(Math.random() * pool.length)], true);
    schedule();
  }
  function schedule(delay = STEP) {
    if (timer || !S.lit || !active()) return;
    timer = setTimeout(step, delay);
  }
  function unschedule() {
    if (timer) { clearTimeout(timer); timer = 0; }
  }

  /* ---------- montagem ---------- */

  measure();
  render();

  let headWas = true;
  function syncHead() {
    const want = S.sp < 0.95;
    if (want !== headWas) { headWas = want; syncVideos(); }
  }

  // rolagem curta: a tela se endireita e cresce até ficar de frente,
  // centralizada; depois a página segue normalmente
  const spTween = gsap.to(S, {
    sp: 1,
    ease: 'none',
    onUpdate: () => { render(); syncHead(); },
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: () => '+=' + Math.max(260, Math.round(el.stage.offsetTop - (window.innerHeight - G.H) / 2)),
      scrub: 0.7,
      invalidateOnRefresh: true
    }
  });

  // saída: de frente e centralizada, a tela segue subindo, inclina de leve
  // na direção de quem vê (passa por cima) e a luz ambiente se recolhe
  gsap.to(S, {
    xp: 1,
    ease: 'none',
    onUpdate: render,
    scrollTrigger: {
      trigger: hero,
      start: () => spTween.scrollTrigger.end,
      end: () => '+=' + Math.round(window.innerHeight * 0.6),
      scrub: 0.7,
      invalidateOnRefresh: true
    }
  });

  /* ---------- entrada orquestrada ---------- */

  gsap.set(el.copyKids, { opacity: 0, y: 26 });
  gsap.set(el.copyKids.filter((k) => k.classList.contains('title')), { opacity: 1, y: 0 });
  gsap.set(el.lines, { opacity: 0, y: 46 });
  root.classList.add('hf-go');

  const firstLeft = new Set(FIRST);
  function sweepUpdate() {
    render();
    // os primeiros quadros começam a tocar quando a frente passa por eles
    const x = frontX(S.f) + G.s * 0.5;
    firstLeft.forEach((i) => {
      if (x < G.cx[i]) { firstLeft.delete(i); energize(i, false); }
    });
  }
  function sweepDone() {
    S.lit = true;
    firstLeft.forEach((i) => energize(i, false));
    firstLeft.clear();
    hero.classList.add('hf-lit');
    render();
    schedule(2600);
  }

  const tl = gsap.timeline({ delay: 0.15 });
  tl.to(el.copyKids[0], { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, 0)
    .to(el.lines, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09 }, 0.1)
    .to(el.copyKids.slice(2), { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.42)
    .to(S, { ent: 1, entY: 0, entTilt: 0, duration: 1.9, ease: 'power3.out', onUpdate: render }, 0.3)
    .to(S, { f: 1, duration: SWEEP, ease: 'power2.inOut', onUpdate: sweepUpdate, onComplete: sweepDone }, 1.25);

  /* ---------- cursor: inclina a tela; sobre um quadro, aproxima e toca ---------- */

  const rxTo = gsap.quickTo(S, 'rx', { duration: 1.3, ease: 'power3.out', onUpdate: render });
  const ryTo = gsap.quickTo(S, 'ry', { duration: 1.3, ease: 'power3.out', onUpdate: render });
  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || S.sp > 0.6) return;
    rxTo(-(e.clientY / window.innerHeight - 0.5) * 3.4);
    ryTo((e.clientX / window.innerWidth - 0.5) * 5.5);
  });
  hero.addEventListener('pointerleave', () => { rxTo(0); ryTo(0); });

  function unhover() {
    if (hoverIdx < 0) return;
    const i = hoverIdx;
    hoverIdx = -1;
    el.tiles[i].classList.remove('is-hover');
    el.mosaic.classList.remove('is-focus');
    if (!live.includes(i)) videos[i].pause();
  }

  // durante a rolagem os quadros passam sob o cursor parado: sem hover
  // nessa hora (evita trocar classes a cada quadro que passa)
  let scrollT = 0;
  window.addEventListener('scroll', () => {
    if (!scrollT) { hero.classList.add('hf-scrolling'); unhover(); }
    clearTimeout(scrollT);
    scrollT = setTimeout(() => { scrollT = 0; hero.classList.remove('hf-scrolling'); }, 220);
  }, { passive: true });

  el.tiles.forEach((t, i) => {
    t.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || !S.lit || scrollT) return;
      hoverIdx = i;
      t.classList.add('is-hover');
      el.mosaic.classList.add('is-focus');
      if (!live.includes(i)) flash(i);
      if (active()) play(videos[i]);
    });
    t.addEventListener('pointerleave', () => { if (hoverIdx === i) unhover(); });
  });

  /* ---------- pausa tudo fora de vista ---------- */

  const io = new IntersectionObserver(([entry]) => {
    // abaixo de ~10% visível (só o pé escurecido), conta como fora
    S.visible = entry.isIntersecting && entry.intersectionRatio > 0.1;
    hero.classList.toggle('hf-off', !S.visible);
    syncVideos();
    if (active()) schedule(); else unschedule();
  }, { threshold: [0, 0.1, 0.2] });
  io.observe(hero);
  document.addEventListener('visibilitychange', () => {
    syncVideos();
    if (active()) schedule(); else unschedule();
  });

  function remeasure() {
    el.tilt._css = {};
    measure();
    if (S.lit) {
      el.front.style.transform = `translate3d(${G.X1}px, 0, 0)`;
      el.after.style.transform = `translate3d(${-G.X1}px, 0, 0)`;
    }
    ScrollTrigger.refresh();
    render();
  }
  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(remeasure, 160);
  });
  // a altura do texto muda quando a fonte termina de carregar: remede
  // para a tela inclinada caber na primeira dobra
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);

  /* ---------- depuração (usada na verificação) ---------- */

  window.__hf = {
    S, G, spTween, flash,
    live: () => live.slice(),
    playing() {
      return Array.from(document.querySelectorAll('video')).filter((v) => !v.paused).map((v) => (v.currentSrc || v.src).split('/').pop());
    }
  };
})();
