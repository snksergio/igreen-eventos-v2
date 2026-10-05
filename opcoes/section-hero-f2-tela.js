/* ============================================================
   Seção hero — F2 Tela (F2 sem a luz desfocada, título com respiro)
   A tela de cinema da opção F feita de cards separados. Na chegada,
   tudo é "antes" (cinza e parado); uma frente de luz curva atravessa
   a tela uma vez (~2,6 s) e cada card responde quando ela passa: sobe
   um pouco e volta, com o filete aceso por um instante. Depois, calma:
   quatro cards tocam e passam a vez sem nenhum brilho. O cursor faz o
   card saltar da tela, tocar e derramar luz. Na rolagem, a tela se
   endireita e vem na direção de quem vê; presa no centro, escurece e
   mostra a frase de fechamento; então a página segue.

   Como a cor muda exatamente onde a frente está, sem custo:
   - .shft-front anda só com translateX e carrega uma janela circular
     enorme (overflow hidden) cuja borda é a frente; dentro dela,
     .shft-after anda ao contrário, então os cards ficam parados;
   - o feixe (SVG com filtros estáticos) anda junto, recortado pela tela;
   - o "antes" são imagens já tratadas em cinza, escondidas no fim.
   No repouso o JS não roda por quadro: só vídeos e o compositor.
   ============================================================ */

(() => {
  'use strict';

  const root = document.documentElement;
  const hero = document.querySelector('.shft-hero');
  if (!hero) return;

  const q = (s) => hero.querySelector(s);
  const qa = (s) => Array.from(hero.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const el = {
    copy: q('.shft-copy'),
    copyKids: qa('.shft-copy .hero-copy > *'),
    lines: qa('.shft-copy .title .line'),
    headClip: q('.title-clip video'),
    stage: q('.shft-stage'),
    tilt: q('.shft-tilt'),
    panel: q('.shft-panel'),
    front: q('.shft-front'),
    after: q('.shft-after'),
    beam: q('.shft-beam'),
    svg: q('.shft-beam-svg'),
    tagA: q('.shft-tag--antes'),
    tagD: q('.shft-tag--depois'),
    grid: q('.shft-after .shft-grid'),
    dim: q('.shft-dim'),
    phrase: qa('.shft-phrase-l'),
    hold: q('.shft-hold'),
    cells: qa('.shft-cell'),
    slots: qa('.shft-slot'),
    tiles: qa('.shft-tile')
  };
  const videos = el.tiles.map((t) => t.querySelector('video'));
  const pings = el.tiles.map((t) => t.querySelector('.shft-ping'));
  const N = el.tiles.length;

  /* ---------- modo estático ---------- */

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (root.classList.contains('shft-static') || !window.gsap || typeof window.ScrollTrigger === 'undefined') {
    root.classList.add('shft-static', 'shft-go');
    hero.classList.add('shft-lit');
    if (reduce && el.headClip) { el.headClip.removeAttribute('autoplay'); el.headClip.pause(); }
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- ajustes ---------- */

  const FIRST = [3, 0, 9, 5];   // cards que começam a tocar quando a frente passa
  const MAX_AUTO = 4;           // tocando sozinhos (+1 pelo cursor)
  const STEP = 4200;            // ms entre uma troca e outra (sem brilho)
  const REST_TILT = 16;         // graus: perspectiva, sem achatar os cards
  const PERSP = 1600;
  const FOLD_SHOW = 0.82;       // fração da tela inclinada acima da dobra (o texto ganhou respiro)
  const SWEEP = 2.6;

  const easeIO = gsap.parseEase('power2.inOut');
  const easeIn = gsap.parseEase('power2.in');
  const easeOut = gsap.parseEase('power3.out');

  const S = {
    ent: 0, entY: 110, entTilt: 12,
    f: 0, sp: 0, bp: 0,
    rx: 0, ry: 0,
    lit: false, visible: true
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
        <filter id="shft-b28" x="-200%" y="-20%" width="500%" height="140%"><feGaussianBlur stdDeviation="26"/></filter>
        <filter id="shft-b12" x="-200%" y="-20%" width="500%" height="140%"><feGaussianBlur stdDeviation="11"/></filter>
        <filter id="shft-b3" x="-200%" y="-20%" width="500%" height="140%"><feGaussianBlur stdDeviation="2.4"/></filter>
      </defs>
      <path d="${arc(64)}" stroke="#A8FF35" stroke-opacity=".18" stroke-width="140" fill="none" filter="url(#shft-b28)"/>
      <path d="${arc(0)}" stroke="#A8FF35" stroke-opacity=".45" stroke-width="20" fill="none" filter="url(#shft-b12)"/>
      <path d="${arc(0)}" stroke="#C6FF7A" stroke-opacity=".92" stroke-width="4" fill="none" filter="url(#shft-b3)"/>
      <path d="${arc(0)}" stroke="#F4FFE6" stroke-width="1.5" fill="none"/>
    `;
    const ax = PL + arcX(16 + 15);
    el.tagA.style.right = (w - ax + 14) + 'px';
    el.tagD.style.left = (ax + 14) + 'px';
  }

  function measure() {
    G.W = el.panel.offsetWidth;
    G.H = el.panel.offsetHeight;
    G.R = G.W * 0.66;
    G.s = arcX(0);
    G.PL = 70; G.PR = 220;
    G.X0 = G.W + 60;
    G.X1 = -(G.s + 180);
    buildBeam();
    G.cx = el.slots.map((t) => t.offsetLeft + t.offsetWidth / 2);
    // repouso: a maior escala que deixa ~92% da tela inclinada acima da dobra
    const th = REST_TILT * Math.PI / 180;
    const projH = (k) => { const h = G.H * k; return h * Math.cos(th) * PERSP / (PERSP - h * Math.sin(th)); };
    // posição no fluxo (o palco é sticky: mede pelo texto acima dele)
    G.top = el.copy.offsetTop + el.copy.offsetHeight + parseFloat(getComputedStyle(el.stage).marginTop);
    const avail = window.innerHeight - G.top;
    let lo = 0.6, hi = 1;
    if (projH(hi) * FOLD_SHOW <= avail) lo = hi;
    else for (let n = 0; n < 18; n++) { const m = (lo + hi) / 2; if (projH(m) * FOLD_SHOW <= avail) lo = m; else hi = m; }
    G.restS = lo;
    el.beam.style.setProperty('--shft-tag-k', Math.min(1.3, 1 / lo).toFixed(3));
    // onde a tela fica centralizada (e começa a ficar presa)
    G.stick = Math.max(200, G.top - (window.innerHeight - G.H) / 2);
  }

  function css(node, prop, v) {
    const c = node._css || (node._css = {});
    if (c[prop] === v) return;
    c[prop] = v;
    node.style[prop] = v;
  }

  /* ---------- render ---------- */

  const frontX = (f) => lerp(G.X0, G.X1, f);

  function render() {
    const it = easeIO(S.sp);
    const be = easeIO(S.bp);
    const rx = lerp(REST_TILT + S.entTilt * (1 - S.ent), 0, it) + S.rx * (1 - it);
    const ry = S.ry * (1 - it);
    const sc = lerp(G.restS, 1, it) * (1 - 0.04 * be);
    const y = S.entY * (1 - S.ent);
    css(el.tilt, 'transform', `perspective(${PERSP}px) translate3d(0, ${y.toFixed(2)}px, 0) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) scale(${sc.toFixed(4)})`);
    css(el.stage, 'opacity', S.ent < 1 ? Math.min(1, S.ent * 1.7).toFixed(3) : '');

    if (!S.lit) {
      const x = frontX(S.f);
      const t = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      css(el.front, 'transform', t);
      css(el.beam, 'transform', t);
      css(el.after, 'transform', `translate3d(${(-x).toFixed(2)}px, 0, 0)`);
    }


    const ct = easeIn(clamp(S.sp / 0.75));
    css(el.copy, 'opacity', (1 - ct).toFixed(3));
    css(el.copy, 'transform', `translate3d(0, ${(-50 * ct).toFixed(2)}px, 0)`);

    // fechamento: a tela escurece e a frase sobe, linha a linha
    css(el.dim, 'opacity', (0.76 * easeOut(clamp(S.bp / 0.55))).toFixed(3));
    el.phrase.forEach((l, i) => {
      const t = easeOut(clamp((S.bp - 0.3 - i * 0.13) / 0.4));
      css(l, 'opacity', t.toFixed(3));
      css(l, 'transform', `translate3d(0, ${((1 - t) * 26).toFixed(2)}px, 0)`);
    });
  }

  /* ---------- vídeos: no máximo 4 cards + 1 pelo cursor ---------- */

  let live = [];
  let hoverIdx = -1;
  const lastOn = new Array(N).fill(-1e9);
  const active = () => S.visible && !document.hidden;
  function play(v) { if (!v.paused) return; const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
  function syncVideos() {
    const on = active();
    videos.forEach((v, i) => {
      if (on && (live.includes(i) || i === hoverIdx)) play(v);
      else if (!v.paused) v.pause();
    });
    if (el.headClip) {
      if (on && S.sp < 0.9) play(el.headClip);
      else if (!el.headClip.paused) el.headClip.pause();
    }
  }
  function energize(i) {
    if (live.includes(i)) return;
    live.push(i);
    lastOn[i] = performance.now();
    if (active()) play(videos[i]);
  }
  function retire(i) {
    live = live.filter((x) => x !== i);
    if (i !== hoverIdx) videos[i].pause();
  }
  // troca calma: um descansa (fica em cor, parado), outro passa a tocar
  let timer = 0;
  function step() {
    timer = 0;
    if (!active() || !S.lit) return;
    if (live.length >= MAX_AUTO) {
      const old = live.find((i) => i !== hoverIdx);
      if (old !== undefined) retire(old);
    }
    const pool = [...Array(N).keys()].filter((i) => !live.includes(i) && i !== hoverIdx)
      .sort((a, b) => lastOn[a] - lastOn[b]).slice(0, 4);
    if (pool.length) energize(pool[Math.floor(Math.random() * pool.length)]);
    schedule();
  }
  function schedule(delay = STEP) { if (timer || !S.lit || !active()) return; timer = setTimeout(step, delay); }
  function unschedule() { if (timer) { clearTimeout(timer); timer = 0; } }

  /* ---------- reação de cada card à passagem da frente (uma vez) ---------- */

  const LIFT = [
    { transform: 'translate3d(0, 0, 0)' },
    { transform: 'translate3d(0, -9px, 0)', offset: 0.32 },
    { transform: 'translate3d(0, 0, 0)' }
  ];
  const LIFT_T = { duration: 1100, easing: 'cubic-bezier(0.33, 0, 0.2, 1)' };
  function react(i) {
    // cinza e cor sobem juntos (mesmo relógio), sem rasgar a divisão
    el.cells[i].animate(LIFT, LIFT_T);
    el.tiles[i].animate(LIFT, LIFT_T);
    pings[i].animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 1300, easing: 'ease-out' });
  }

  /* ---------- montagem ---------- */

  let headWas = true;
  function syncHead() { const want = S.sp < 0.9; if (want !== headWas) { headWas = want; syncVideos(); } }

  measure();
  render();

  const stSp = ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: () => '+=' + Math.round(G.stick),
    scrub: 0.7,
    invalidateOnRefresh: true,
    animation: gsap.to(S, { sp: 1, ease: 'none', onUpdate: () => { render(); syncHead(); } })
  });
  // fechamento: enquanto a tela está presa no centro
  const stBeat = ScrollTrigger.create({
    trigger: hero,
    start: () => G.stick,
    end: () => G.stick + el.hold.offsetHeight * 0.85,
    scrub: 0.7,
    invalidateOnRefresh: true,
    animation: gsap.to(S, { bp: 1, ease: 'none', onUpdate: render })
  });

  /* ---------- entrada orquestrada ---------- */

  gsap.set(el.copyKids, { opacity: 0, y: 26 });
  gsap.set(el.copyKids.filter((k) => k.classList.contains('title')), { opacity: 1, y: 0 });
  gsap.set(el.lines, { opacity: 0, y: 46 });
  root.classList.add('shft-go');

  const pending = new Set([...Array(N).keys()]);
  const firstSet = new Set(FIRST);
  function sweepUpdate() {
    render();
    const x = frontX(S.f) + G.s * 0.5;
    pending.forEach((i) => {
      if (x < G.cx[i]) {
        pending.delete(i);
        react(i);
        if (firstSet.has(i)) energize(i);
      }
    });
  }
  function sweepDone() {
    S.lit = true;
    pending.forEach((i) => { if (firstSet.has(i)) energize(i); });
    pending.clear();
    hero.classList.add('shft-lit');
    render();
    schedule(3000);
  }

  gsap.timeline({ delay: 0.15 })
    .to(el.copyKids[0], { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, 0)
    .to(el.lines, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09 }, 0.1)
    .to(el.copyKids.slice(2), { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.42)
    .to(S, { ent: 1, entY: 0, entTilt: 0, duration: 1.9, ease: 'power3.out', onUpdate: render }, 0.3)
    .to(S, { f: 1, duration: SWEEP, ease: 'power2.inOut', onUpdate: sweepUpdate, onComplete: sweepDone }, 1.25);

  /* ---------- cursor ---------- */

  const rxTo = gsap.quickTo(S, 'rx', { duration: 1.3, ease: 'power3.out', onUpdate: render });
  const ryTo = gsap.quickTo(S, 'ry', { duration: 1.3, ease: 'power3.out', onUpdate: render });
  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || S.sp > 0.6) return;
    rxTo(-(e.clientY / window.innerHeight - 0.5) * 3);
    ryTo((e.clientX / window.innerWidth - 0.5) * 4.5);
  });
  hero.addEventListener('pointerleave', () => { rxTo(0); ryTo(0); });

  function unhover() {
    if (hoverIdx < 0) return;
    const i = hoverIdx;
    hoverIdx = -1;
    el.slots[i].classList.remove('is-hover');
    el.grid.classList.remove('is-focus');
    if (!live.includes(i)) videos[i].pause();
  }
  let scrollT = 0;
  window.addEventListener('scroll', () => {
    if (!scrollT) { hero.classList.add('shft-scrolling'); unhover(); }
    clearTimeout(scrollT);
    scrollT = setTimeout(() => { scrollT = 0; hero.classList.remove('shft-scrolling'); }, 220);
  }, { passive: true });

  el.slots.forEach((slot, i) => {
    slot.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || !S.lit || scrollT || S.bp > 0.2) return;
      hoverIdx = i;
      slot.classList.add('is-hover');
      el.grid.classList.add('is-focus');
      pings[i].animate(
        [{ opacity: 0.95, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.16)' }],
        { duration: 950, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );
      if (active()) play(videos[i]);
    });
    slot.addEventListener('pointerleave', () => { if (hoverIdx === i) unhover(); });
  });

  /* ---------- pausa tudo fora de vista ---------- */

  const io = new IntersectionObserver(([entry]) => {
    S.visible = entry.isIntersecting && entry.intersectionRatio > 0.06;
    hero.classList.toggle('shft-off', !S.visible);
    syncVideos();
    if (active()) schedule(); else unschedule();
  }, { threshold: [0, 0.06, 0.15] });
  io.observe(hero);
  document.addEventListener('visibilitychange', () => { syncVideos(); if (active()) schedule(); else unschedule(); });

  function remeasure() {
    el.tilt._css = {};
    // mede com a tela no fluxo (sem a parte presa influenciar)
    measure();
    if (S.lit) {
      el.front.style.transform = `translate3d(${G.X1}px, 0, 0)`;
      el.after.style.transform = `translate3d(${-G.X1}px, 0, 0)`;
    }
    ScrollTrigger.refresh();
    render();
  }
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(remeasure, 160); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);

  window.__shft = {
    S, G, stSp, stBeat,
    live: () => live.slice(),
    playing() {
      return Array.from(document.querySelectorAll('video')).filter((v) => !v.paused).map((v) => (v.currentSrc || v.src).split('/').pop());
    }
  };
})();
