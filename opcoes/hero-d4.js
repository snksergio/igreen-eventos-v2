/* ============================================================
   Hero D4 — Dupla exposição
   Coreografia
   1. Entrada: o retrato surge do escuro, ainda cinza (silhueta escura,
      histórias cinzas e paradas, rosto apagado); o texto assenta.
   2. A transformação (uma vez só): uma luz sobe por dentro dela. Por
      onde passa, as histórias ganham cor (a foto cinza pronta sai por
      opacidade) e quatro vídeos começam a tocar. Quando a luz chega ao
      rosto, a cor real dela aparece e o contorno acende. Depois, calma.
   3. Vida: a cada ~7s um vídeo dá a vez a outro (nunca mais de 4).
      O cursor desloca levemente as histórias dentro da silhueta (as
      duas exposições se separam) e a história sob o cursor sai da
      silhueta: vai para uma camada fora da máscara, cresce inteira e
      toca; ao sair o cursor, volta para o lugar.
   4. Rolagem (hero preso ~170vh): a câmera entra na silhueta, o rosto
      se dissolve, as histórias viram um mosaico legível que ocupa a
      tela e a cena termina numa frase.
   Desempenho: por quadro só transform/opacity, em poucos elementos.
   Em repouso não há rAF nem ticker: só um timer de 7s que troca qual
   vídeo toca. Tudo pausa fora da tela / aba oculta.
   ============================================================ */

(() => {
  const hero = document.getElementById('hd4');
  if (!hero) return;

  const mqWide = window.matchMedia('(min-width: 900px)');
  const mqRM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reload = () => window.location.reload();
  [mqWide, mqRM].forEach((mq) => {
    if (mq.addEventListener) mq.addEventListener('change', reload);
    else mq.addListener(reload);
  });

  const titleVideo = hero.querySelector('.title-clip video');
  const RM = mqRM.matches;

  // telas estreitas / sem GSAP: só o CSS estático
  if (!mqWide.matches || !window.gsap) {
    document.documentElement.classList.remove('hd4-anim');
    hero.classList.add('hd4-static');
    if (RM && titleVideo) { titleVideo.removeAttribute('autoplay'); titleVideo.pause(); }
    return;
  }

  hero.classList.add('hd4-js');
  if (RM) hero.classList.add('hd4-static');
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------- elementos ---------- */

  const cam = hero.querySelector('.hd4-cam');
  const fig = hero.querySelector('.hd4-fig');
  const mos = hero.querySelector('.hd4-mos');
  const front = hero.querySelector('.hd4-front');
  const faces = hero.querySelector('.hd4-faces');
  const rim = hero.querySelector('.hd4-rim');
  const bloom = hero.querySelector('.hd4-bloom');
  const wrap = hero.querySelector('.hd4-wrap');
  const shade = hero.querySelector('.hd4-shade');
  const copy = hero.querySelector('.hd4-copy');
  const veil = hero.querySelector('.hd4-veil');
  const phrase = hero.querySelector('.hd4-phrase');
  const melt = hero.querySelector('.hd4-melt');
  const copyParts = [
    copy.querySelector('.hero-badge'),
    ...copy.querySelectorAll('.title .line'),
    copy.querySelector('.sub'),
    copy.querySelector('.actions'),
    copy.querySelector('.next-stop'),
  ];

  /* ---------- parâmetros (unidades da imagem original) ---------- */

  const IMG_H = 1760;          // altura do retrato original
  const FIG_K = 1.16;          // em repouso o retrato tem 116% da altura do hero
  const TILE_W = 170;
  const SIL_LEFT = 100;        // borda esquerda do ombro na parte visível
  const SIL_RIGHT = 1048;      // borda direita do corpo
  const FOCAL = { x: 556, y: 1700 }; // onde a câmera termina (meio do peito)
  const VIEW_W = 820;          // largura (unidades) que cabe na tela no fim
  const CHARGE = 2.3;          // duração da subida da luz (s)
  const FACE = { x: 668, y: 720, rx: 190, ry: 262 }; // núcleo opaco do rosto
  const MAX_ON = 4;            // vídeos de história tocando
  const MAX_PLAY = 5;          // teto com o cursor
  const SWAP_MS = 7000;        // troca calma de qual vídeo toca

  // quem toca em repouso (visíveis ao redor dela) e no fim (no mosaico)
  const REST_ON = ['1-1264', '5-882', '3-1238', '2-876'];
  const REST_POOL = ['1-1264', '5-882', '3-1238', '2-876', '2-1190', '4-1070', '5-560', '5-1106', '1-1446'];
  const END_ON = ['1-1586', '2-1736', '4-1706', '5-1560'];

  const num = (el, k) => parseFloat(el.style.getPropertyValue(k)) || 0;
  const tiles = Array.from(hero.querySelectorAll('.hd4-t')).map((el) => {
    const t = {
      el,
      x: num(el, '--x'),
      y: num(el, '--y'),
      h: num(el, '--h'),
      video: el.querySelector('video'),
      playing: false,
      hold: 0,
      key: '',
    };
    t.key = `${el.dataset.c}-${t.y}`;
    return t;
  });
  const byKey = new Map(tiles.map((t) => [t.key, t]));
  const pick = (keys) => keys.map((k) => byKey.get(k)).filter((t) => t && t.video);

  /* ---------- estado ---------- */

  const st = {
    W: 0, H: 0, u: 0.5, fx: 0, fy: 0,
    S: 3, C0x: 0, C0y: 0, C1x: 0, C1y: 0,
    e: 0, p: 0,
    charged: false, ready: false, active: true,
    phase: 'rest',
    on: new Set(),
    mx: 0, my: 0,
    hover: null,
    rimI: 0, bloomI: 0.35,
  };

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const io2 = gsap.parseEase('power2.inOut');
  const io3 = gsap.parseEase('power3.inOut');
  const sio = gsap.parseEase('sine.inOut');
  const inv2 = (y) => (y < 0.5 ? Math.sqrt(y / 2) : 1 - Math.sqrt((1 - y) / 2)); // inverso de power2.inOut

  /* ---------- layout (medido; refeito no resize) ---------- */

  function layout() {
    const W = window.innerWidth;
    const H = hero.clientHeight;
    const u = (H * FIG_K) / IMG_H;
    st.W = W; st.H = H; st.u = u;

    // borda direita real do texto (linhas do título têm largura do texto)
    let copyR = 0;
    copyParts.forEach((el) => { copyR = Math.max(copyR, el.getBoundingClientRect().right); });

    // o ombro dela começa um respiro depois do texto; o corpo não passa
    // da borda direita
    let fx = copyR + Math.max(36, W * 0.045) - SIL_LEFT * u;
    fx = Math.min(fx, W * 0.965 - SIL_RIGHT * u);
    const fy = 0;
    st.fx = fx; st.fy = fy;
    hero.style.setProperty('--u', `${u.toFixed(5)}px`);
    hero.style.setProperty('--fx', `${fx.toFixed(1)}px`);
    hero.style.setProperty('--fy', `${fy}px`);

    // câmera final: a tela inteira dentro da silhueta, no meio do peito
    const k1 = W / VIEW_W;
    const viewH = H / k1;
    const cy = Math.min(FOCAL.y, 2190 - viewH / 2);
    st.S = k1 / u;
    st.C0x = W / 2; st.C0y = H / 2;
    st.C1x = fx + FOCAL.x * u; st.C1y = fy + cy * u;
    applyCam();
  }

  // translate + scale: o ponto focal anda em linha reta na tela
  // enquanto o zoom cresce de forma exponencial (velocidade constante)
  function applyCam() {
    const s = Math.pow(st.S, st.e);
    const w = st.S > 1.001 ? (1 - 1 / s) / (1 - 1 / st.S) : 0;
    const cx = st.C0x + (st.C1x - st.C0x) * w;
    const cy = st.C0y + (st.C1y - st.C0y) * w;
    const tx = st.W / 2 - s * cx;
    const ty = st.H / 2 - s * cy;
    cam.style.transform = st.e > 0.0001
      ? `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${s.toFixed(4)})`
      : '';
  }

  /* ---------- vídeos ---------- */

  function playingCount() {
    let n = 0;
    tiles.forEach((t) => { if (t.playing) n += 1; });
    return n;
  }
  function play(t) {
    if (!t || !t.video) return;
    clearTimeout(t.hold);
    if (t.playing) return;
    if (playingCount() >= MAX_PLAY) return;
    t.playing = true;
    if (!st.active) return;
    const pr = t.video.play();
    if (pr && pr.catch) pr.catch(() => {});
  }
  function pause(t, later) {
    if (!t || !t.video) return;
    clearTimeout(t.hold);
    if (later) {
      t.hold = setTimeout(() => pause(t, false), later);
      return;
    }
    t.playing = false;
    t.video.pause();
  }
  // troca o conjunto que toca (repouso ↔ fim), sem passar de 4
  function setOn(list) {
    const next = new Set(list.slice(0, MAX_ON));
    st.on = next;
    enforce();
    next.forEach(play);
  }
  // garantia: só tocam as do conjunto atual (e a que está sob o cursor)
  function enforce() {
    tiles.forEach((t) => {
      if (t.playing && !st.on.has(t) && t !== st.hover) pause(t, false);
    });
  }

  /* ---------- ativo / pausado ---------- */

  let visible = true;
  let swapTimer = 0;
  function setActive() {
    const act = visible && !document.hidden;
    if (act === st.active) return;
    st.active = act;
    hero.classList.toggle('hd4-off', !act);
    if (act) {
      tiles.forEach((t) => {
        if (t.playing) { const pr = t.video.play(); if (pr && pr.catch) pr.catch(() => {}); }
      });
      if (titleVideo && !RM) { const pr = titleVideo.play(); if (pr && pr.catch) pr.catch(() => {}); }
    } else {
      tiles.forEach((t) => { if (t.playing) t.video.pause(); });
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
      if (window.__hd4 && window.__hd4.rate) window.__hd4.rate();
      if (!RM && window.ScrollTrigger) ScrollTrigger.refresh();
    }, 160);
  });

  /* ---------- movimento reduzido: composição parada, em cor ---------- */

  if (RM) {
    if (titleVideo) { titleVideo.removeAttribute('autoplay'); titleVideo.pause(); }
    window.__hd4 = { st, tiles, playingCount };
    return;
  }

  /* ---------- 2. a transformação: a luz sobe por dentro dela ---------- */

  // quando o centro da faixa de luz passa pelo centro de cada história
  const BAND_FROM = 1650;      // topo da faixa no início (unidades)
  const BAND_TO = -300;        // topo da faixa no fim
  const BAND_MID = 310;        // centro claro da faixa
  const passAt = (cy) => {
    const f = clamp((BAND_FROM + BAND_MID - cy) / (BAND_FROM - BAND_TO));
    return CHARGE * inv2(f);
  };
  tiles.forEach((t) => {
    t.at = passAt(t.y + t.h / 2);
    t.el.style.setProperty('--d', `${t.at.toFixed(3)}s`);
  });
  const faceAt = passAt(FACE.y);

  const lights = { rim: 0, bloom: 0.35 };
  function renderLights() {
    rim.style.opacity = st.rimI.toFixed(3);
    bloom.style.opacity = (st.bloomI * (1 - (st.fadeS || 0))).toFixed(3);
  }

  let chargeTl = null;
  function charge() {
    if (st.charged) return;
    st.charged = true;
    hero.classList.add('hd4-alive');
    const u = st.u;
    chargeTl = gsap.timeline({
      onComplete: () => {
        // adiantada pela rolagem: espera as últimas cinzas saírem
        setTimeout(() => hero.classList.add('hd4-done'), hero.classList.contains('hd4-ff') ? 800 : 0);
        st.ready = true;
        front.style.display = 'none';
      },
    });
    chargeTl.fromTo(front, { y: BAND_FROM * u }, { y: BAND_TO * u, duration: CHARGE, ease: 'power2.inOut' }, 0);
    chargeTl.fromTo(front, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'sine.out' }, 0);
    chargeTl.to(front, { opacity: 0, duration: 0.5, ease: 'sine.in' }, CHARGE - 0.5);
    // os vídeos de repouso começam quando a luz os alcança
    pick(REST_ON).forEach((t) => {
      chargeTl.call(() => { st.on.add(t); play(t); }, null, t.at + 0.25);
    });
    // o rosto ganha a cor real; o contorno acende e assenta
    chargeTl.call(() => hero.classList.add('hd4-lit'), null, Math.max(0, faceAt - 0.3));
    chargeTl.to(lights, {
      rim: 1, bloom: 1, duration: 0.9, ease: 'power2.out',
      onUpdate: () => { st.rimI = lights.rim; st.bloomI = lights.bloom; renderLights(); },
    }, faceAt + 0.1);
    chargeTl.to(lights, {
      rim: 0.5, bloom: 0.72, duration: 1.8, ease: 'sine.inOut',
      onUpdate: () => { st.rimI = lights.rim; st.bloomI = lights.bloom; renderLights(); },
    }, faceAt + 1.0);
    chargeTl.add(() => {}, CHARGE + 1.2);
  }

  // rolou antes do fim da subida: as cinzas que faltam saem juntas, rápido
  function fastForward() {
    hero.classList.add('hd4-ff');
    const greys = tiles.map((t) => t.el.querySelector('.hd4-g'));
    const now = greys.map((g) => getComputedStyle(g).opacity);
    greys.forEach((g, i) => { g.style.transition = 'none'; g.style.opacity = now[i]; });
    void hero.offsetWidth;
    greys.forEach((g) => { g.style.transition = 'opacity 0.5s ease'; g.style.opacity = '0'; });
  }

  /* ---------- 1. entrada ---------- */

  gsap.set(fig, { opacity: 0, y: 34 * st.u });
  gsap.set(copyParts, { opacity: 0, y: 22 });
  const intro = gsap.timeline({
    delay: 0.15,
    onComplete: () => gsap.set(copyParts, { clearProps: 'transform' }),
  });
  intro.to(fig, { opacity: 1, y: 0, duration: 1.7, ease: 'power3.out' }, 0);
  intro.to(copyParts, { opacity: 1, y: 0, duration: 1.15, ease: 'expo.out', stagger: 0.06 }, 0.2);
  intro.call(charge, null, 1.5);

  /* ---------- 3. vida: troca calma de qual vídeo toca ---------- */

  let swapIdx = 0;
  function swap() {
    if (!st.ready || !st.active || st.phase !== 'rest' || st.p > 0.01) return;
    const pool = pick(REST_POOL).filter((t) => !st.on.has(t) && t !== st.hover);
    if (!pool.length) return;
    const onList = Array.from(st.on);
    const out = onList[swapIdx % onList.length];
    swapIdx += 1;
    const inn = pool[Math.floor(Math.random() * pool.length)];
    st.on.delete(out);
    if (out !== st.hover) pause(out, false);
    st.on.add(inn);
    enforce();
    play(inn);
  }
  swapTimer = setInterval(swap, SWAP_MS);

  /* ---------- 3. interação: as exposições se separam; história sob o cursor ---------- */

  // máscara pequena para saber se o cursor está dentro da silhueta
  let maskA = null;
  const MW = 166;
  const MH = 275;
  const mImg = new Image();
  mImg.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = MW; c.height = MH;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(mImg, 0, 0, MW, MH);
      const d = g.getImageData(0, 0, MW, MH).data;
      maskA = new Uint8Array(MW * MH);
      for (let i = 0; i < MW * MH; i += 1) maskA[i] = d[i * 4 + 3];
    } catch (err) { maskA = null; }
    rateTiles();
  };
  mImg.src = '../assets/img/hero-d4/sil.webp';
  const inside = (ux, uy) => {
    if (!maskA) return false;
    const xi = Math.floor((ux / 1328) * MW);
    const yi = Math.floor((uy / 2200) * MH);
    if (xi < 0 || yi < 0 || xi >= MW || yi >= MH) return false;
    return maskA[yi * MW + xi] > 140;
  };

  // a camada de fora da máscara acompanha o deslocamento do mosaico
  const lift = hero.querySelector('.hd4-lift');
  const shadow = lift.querySelector('.hd4-shadow');
  const qx = [gsap.quickTo(mos, 'x', { duration: 1.4, ease: 'power3.out' }), gsap.quickTo(lift, 'x', { duration: 1.4, ease: 'power3.out' })];
  const qy = [gsap.quickTo(mos, 'y', { duration: 1.4, ease: 'power3.out' }), gsap.quickTo(lift, 'y', { duration: 1.4, ease: 'power3.out' })];
  const mosX = (v) => { qx[0](v); qx[1](v); };
  const mosY = (v) => { qy[0](v); qy[1](v); };

  // só saem da silhueta as histórias inteiras dentro dela e sem cabelo
  // por cima (a volta para dentro da máscara fica imperceptível)
  const LIFT_SCALE = 1.42;
  tiles.forEach((t) => {
    t.anchor = document.createComment('');
    t.el.parentNode.insertBefore(t.anchor, t.el.nextSibling);
    t.canLift = false;
  });
  const faceImg = hero.querySelector('.hd4-face-c');
  function rateTiles() {
    if (!maskA || !faceImg.complete || !faceImg.naturalWidth) return;
    let faceA = null;
    try {
      const fw = 118; const fh = 139; // 944 × 1112 / 8
      const c = document.createElement('canvas');
      c.width = fw; c.height = fh;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(faceImg, 0, 0, fw, fh);
      faceA = g.getImageData(0, 0, fw, fh).data;
    } catch (err) { faceA = null; }
    const faceAt = (ux, uy) => {
      if (!faceA) return 0;
      const xi = Math.floor((ux - 96) / 8);
      const yi = Math.floor((uy - 328) / 8);
      if (xi < 0 || yi < 0 || xi >= 118 || yi >= 139) return 0;
      return faceA[(yi * 118 + xi) * 4 + 3];
    };
    tiles.forEach((t) => {
      let n = 0; let inn = 0; let over = 0;
      for (let y = t.y + 6; y < t.y + t.h; y += 12) {
        for (let x = t.x + 6; x < t.x + TILE_W; x += 12) {
          n += 1;
          if (inside(x, y)) inn += 1;
          if (faceAt(x, y) > 40) over += 1;
        }
      }
      // visível em repouso (ao menos 60% acima da dobra), dentro dela e
      // sem rosto/cabelo por cima
      const visible = (t.y + 0.6 * t.h) * st.u < st.H;
      t.canLift = visible && inn / n > 0.85 && over / n < 0.1;
    });
  }
  if (faceImg.complete) setTimeout(rateTiles, 0);
  faceImg.addEventListener('load', () => setTimeout(rateTiles, 0));

  function liftTile(t) {
    clearTimeout(t.backT);
    if (t.el.parentNode !== lift) lift.appendChild(t.el);
    const u = st.u;
    const w = TILE_W * LIFT_SCALE * 1.5;
    const h = t.h * LIFT_SCALE * 1.4;
    shadow.style.width = `${(w * u).toFixed(1)}px`;
    shadow.style.height = `${(h * u).toFixed(1)}px`;
    shadow.style.transform = `translate3d(${((t.x + TILE_W / 2 - w / 2) * u).toFixed(1)}px, ${((t.y + t.h / 2 - h / 2 + 22) * u).toFixed(1)}px, 0)`;
    requestAnimationFrame(() => {
      if (st.hover !== t) return;
      t.el.classList.add('is-hv');
      shadow.classList.add('is-on');
    });
  }
  function dropTile(t) {
    t.el.classList.remove('is-hv');
    if (!st.hover) shadow.classList.remove('is-on');
    clearTimeout(t.backT);
    t.backT = setTimeout(() => {
      if (st.hover !== t && t.el.parentNode === lift) t.anchor.parentNode.insertBefore(t.el, t.anchor);
    }, 800);
  }

  function setHover(t) {
    if (t === st.hover) return;
    const prev = st.hover;
    st.hover = t;
    if (prev) {
      dropTile(prev);
      if (!st.on.has(prev)) pause(prev, 700);
    }
    if (t) {
      liftTile(t);
      if (t.video && !t.playing && playingCount() < MAX_PLAY) play(t);
      else if (t.video) clearTimeout(t.hold);
    }
  }

  let hoverRaf = 0;
  function hoverTick() {
    hoverRaf = 0;
    if (!st.ready || st.p > 0.02) { setHover(null); return; }
    const ox = Number(gsap.getProperty(mos, 'x')) || 0;
    const oy = Number(gsap.getProperty(mos, 'y')) || 0;
    const ux = (st.mx - st.fx - ox) / st.u;
    const uy = (st.my - st.fy - oy) / st.u;
    // a história que já saiu continua sob o cursor enquanto ele estiver
    // sobre a carta crescida
    const cur = st.hover;
    if (cur) {
      const hw = (TILE_W * LIFT_SCALE) / 2;
      const hh = (cur.h * LIFT_SCALE) / 2;
      const cx = cur.x + TILE_W / 2;
      const cy = cur.y + cur.h / 2;
      if (Math.abs(ux - cx) < hw && Math.abs(uy - cy) < hh) return;
    }
    let hit = null;
    if (inside(ux, uy)) {
      hit = tiles.find((t) => t.canLift && ux >= t.x && ux < t.x + TILE_W && uy >= t.y && uy < t.y + t.h) || null;
    }
    setHover(hit);
  }

  hero.addEventListener('pointermove', (e) => {
    st.mx = e.clientX;
    st.my = e.clientY;
    if (st.p < 0.02) {
      const nx = (e.clientX / st.W - 0.5) * 2;
      const ny = (e.clientY / st.H - 0.5) * 2;
      mosX(-nx * 12 * st.u);
      mosY(-ny * 9 * st.u);
    }
    if (!hoverRaf) hoverRaf = requestAnimationFrame(hoverTick);
  });
  hero.addEventListener('pointerleave', () => {
    setHover(null);
    mosX(0);
    mosY(0);
  });

  /* ---------- 4. rolagem: a câmera entra nela; termina numa frase ---------- */

  function applyScroll(p) {
    st.p = p;
    if (p > 0.004) {
      // rolou antes do fim da entrada: completa tudo já
      if (intro.progress() < 1) intro.progress(1);
      if (chargeTl && chargeTl.progress() < 1) {
        fastForward();
        chargeTl.progress(1);
      }
      if (st.hover) setHover(null);
    }
    st.e = sio(clamp((p - 0.02) / 0.64));
    applyCam();

    // o texto sai primeiro, para cima
    const c = clamp(p / 0.14);
    wrap.style.opacity = c > 0 ? (1 - c).toFixed(3) : '';
    wrap.style.transform = c > 0 ? `translate3d(0, ${(-44 * io2(clamp(p / 0.2))).toFixed(1)}px, 0)` : '';
    wrap.style.visibility = c >= 1 ? 'hidden' : '';
    shade.style.opacity = c > 0 ? (1 - c).toFixed(3) : '';

    // o rosto (e a luz dela) se dissolve: a câmera passa por ela
    const f = io2(clamp((p - 0.05) / 0.2));
    st.fadeS = f;
    faces.style.opacity = f > 0 ? (1 - f).toFixed(3) : '';
    renderLights();
    if (mos && p > 0.02) { mosX(0); mosY(0); }

    // as histórias certas tocam (as que ficam na tela no fim)
    const phase = p > 0.34 ? 'end' : 'rest';
    if (phase !== st.phase) {
      st.phase = phase;
      if (st.charged) setOn(pick(phase === 'end' ? END_ON : REST_ON));
    }

    // véu e frase
    const v = clamp((p - 0.6) / 0.18);
    veil.style.opacity = v > 0 ? io2(v).toFixed(3) : '';
    const q = io3(clamp((p - 0.68) / 0.16));
    phrase.style.opacity = q > 0 ? q.toFixed(3) : '';
    phrase.style.transform = q > 0 && q < 1 ? `translate3d(0, ${(26 * (1 - q)).toFixed(1)}px, 0)` : '';
    const m = clamp((p - 0.8) / 0.2);
    melt.style.opacity = m > 0 ? io2(m).toFixed(3) : '';
  }
  st.fadeS = 0;

  if (window.ScrollTrigger) {
    const proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: '+=170%',
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
      },
      onUpdate: () => applyScroll(proxy.p),
    });
  }

  // verificação
  window.__hd4 = { st, tiles, playingCount, byKey, rate: rateTiles };
})();
