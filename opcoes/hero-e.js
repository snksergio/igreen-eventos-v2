/* ============================================================
   Opção E — Correnteza
   Três colunas de vidas à direita do texto.

   Coreografia
   1. Entrada: o texto sobe; as colunas chegam no sentido em que vão
      correr, cinza e paradas (o "antes").
   2. Carga (uma vez): o clipe da frase acende e uma frente de luz
      atravessa as colunas na diagonal, de baixo para cima. Cada card
      que ela toca ganha cor, aro de luz e um brilho que o atravessa;
      os vídeos principais começam a tocar e as colunas ganham
      movimento, uma a uma, em sentidos alternados.
   3. Vida calma: as colunas correm devagar (animações de compositor,
      nenhum script por quadro); a cada poucos segundos muda qual
      vídeo toca (no máximo 4, mais o do cursor).
   4. Cursor: anel local, aro lima, luz atravessando, vídeo na hora,
      zoom leve; a coluna sob o cursor desacelera até parar.
   5. Rolagem: o texto sai, as vidas se reúnem ao centro sob um véu e
      uma frase fecha o hero antes da próxima seção.
   ============================================================ */

(() => {
  const hero = document.querySelector('.he-hero');
  if (!hero) return;

  const root = document.documentElement;
  const reel = hero.querySelector('.he-reel');
  const beam = hero.querySelector('.he-beam');
  const beamIn = hero.querySelector('.he-beam-in');
  const aura = hero.querySelector('.he-aura');
  const veil = hero.querySelector('.he-veil');
  const coda = hero.querySelector('.he-coda');
  const foot = hero.querySelector('.he-foot');
  const wrap = hero.querySelector('.he-wrap');
  const copy = hero.querySelector('.he-copy');
  const titleClip = hero.querySelector('.title-clip video');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = matchMedia('(max-width: 899px)').matches;
  if (narrow) return;               // a versão estreita é só CSS

  /* ---------- conteúdo ---------- */

  const V = '../assets/video/';
  const G = '../assets/img/hero-e/g-';
  // r = altura / largura do card (proporções naturais: 4:5, 2:3, 1:1, 5:4)
  const CLIPS = {
    'sel-musgo1':     { d: 'cards', r: 1.25, op: '50% 40%', l: 'Licenciado falando diante do logo iGreen no muro verde' },
    'gen-kart':       { d: 'cards', r: 1.5,  op: '50% 22%', l: 'Piloto de kart com macacão e capacete verdes da iGreen' },
    'gen-walk':       { d: 'cards', r: 1.25, op: '50% 42%', l: 'Executiva de blazer verde caminhando pelo escritório' },
    'sel-escritorio': { d: 'cards', r: 1.25, op: '56% 50%', l: 'Licenciado de camiseta verde em um escritório moderno' },
    'sel-carro':      { d: 'cards', r: 1.25, op: '52% 30%', l: 'Licenciada sorrindo diante de um carro verde' },
    'gen-podcast':    { d: 'cards', r: 0.8,  op: '44% 40%', l: 'Licenciado gravando podcast em um estúdio' },
    'gen-executiva2': { d: 'cards', r: 1.5,  op: '50% 24%', l: 'Executiva de blazer verde apresentando em um estúdio' },
    'sel-jardim':     { d: 'cards', r: 1.25, op: '58% 46%', l: 'Licenciado com polo iGreen ao lado do jardim vertical' },
    'gen-executiva1': { d: 'cards', r: 1,    op: '44% 36%', l: 'Executiva de blazer verde acenando com o celular na mão' },
    'sel-suv':        { d: 'cards', r: 1.25, op: '48% 30%', l: 'Licenciado com o celular diante de um SUV verde' },
    'gen-reuniao':    { d: 'cards', r: 1.5,  op: '50% 30%', l: 'Executiva de blazer verde apresentando em uma sala de reunião' },
    'sel-musgo2':     { d: 'cards', r: 1.25, op: '46% 40%', l: 'Licenciado de óculos falando diante do logo iGreen' },
    'stage-speaker':  { d: 'past',  r: 0.8,  op: '100% 50%', l: 'Palestrante no palco do evento' },
    'sel-estudio':    { d: 'cards', r: 1.25, op: '48% 50%', l: 'Apresentadora em estúdio com telão de ondas verdes' }
  };
  // dir: -1 sobe, 1 desce · speed em px/s para colunas de 210px · phase: posição inicial do laço
  const COLUMNS = [
    { dir: -1, speed: 15, phase: 0.06, clips: ['sel-musgo1', 'gen-kart', 'gen-walk', 'stage-speaker', 'sel-escritorio'] },
    { dir: 1,  speed: 19, phase: 0.6,  clips: ['sel-carro', 'gen-podcast', 'gen-executiva2', 'sel-jardim'] },
    { dir: -1, speed: 12, phase: 0.3,  clips: ['gen-executiva1', 'sel-suv', 'gen-reuniao', 'sel-musgo2', 'sel-estudio'] }
  ];
  const SETS = 3;                  // o laço repete a sequência; 3 cópias cobrem qualquer altura

  const MAX_PLAY = 4;              // vídeos tocando na vida calma (+1 do cursor)
  const ROTATE_MS = 6500;          // troca de quem toca
  const PHI = -54;                 // direção da frente de luz (graus; sobe para a direita)
  const SWEEP = 2.5;             // duração da travessia (s)
  const DEPTH = [0.7, 1, 0.55];    // paralaxe do cursor por coluna

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rad = (PHI * Math.PI) / 180;
  const DX = Math.cos(rad);
  const DY = Math.sin(rad);

  /* ---------- estrutura ---------- */

  const cols = [];
  const cards = [];

  function el(tag, cls) {
    const e = document.createElement(tag);
    e.className = cls;
    return e;
  }

  COLUMNS.forEach((def, c) => {
    const col = el('div', 'he-col');
    const par = el('div', 'he-par');
    const inn = el('div', 'he-in');
    const track = el('div', 'he-track');
    col.appendChild(par);
    par.appendChild(inn);
    inn.appendChild(track);
    const cs = { el: col, par, inn, track, def, c, list: [], anim: null, animDur: 0, setH: 0, dur: 0, rate: 0, rateTw: null, x: 0 };
    for (let s = 0; s < SETS; s++) {
      def.clips.forEach((key) => {
        const clip = CLIPS[key];
        const fig = el('figure', 'he-card');
        fig.style.setProperty('--he-op', clip.op);
        if (s) fig.setAttribute('aria-hidden', 'true');
        else { fig.setAttribute('role', 'img'); fig.setAttribute('aria-label', clip.l); }
        fig.innerHTML =
          '<span class="he-halo"></span>' +
          '<div class="he-face">' +
            '<div class="he-m">' +
              '<img class="he-c" src="' + V + clip.d + '/' + key + '.jpg" alt="" draggable="false">' +
              '<img class="he-g" src="' + G + key + '.jpg" alt="" draggable="false">' +
            '</div>' +
            '<span class="he-dim"></span>' +
            '<span class="he-sweep"></span>' +
            '<span class="he-rim"></span>' +
            '<span class="he-hair"></span>' +
            '<span class="he-live"></span>' +
          '</div>' +
          '<span class="he-ping"></span>';
        track.appendChild(fig);
        const cd = {
          el: fig,
          face: fig.querySelector('.he-face'),
          m: fig.querySelector('.he-m'),
          gray: fig.querySelector('.he-g'),
          sweep: fig.querySelector('.he-sweep'),
          rim: fig.querySelector('.he-rim'),
          ping: fig.querySelector('.he-ping'),
          halo: fig.querySelector('.he-halo'),
          key,
          clip,
          col: cs,
          set: s,
          y: 0,
          h: 0,
          on: false,
          lead: false,
          playing: false,
          video: null,
          hv: false
        };
        cs.list.push(cd);
        cards.push(cd);
      });
    }
    reel.appendChild(col);
    cols.push(cs);
  });

  /* ---------- medidas ---------- */

  let geo = { W: 0, H: 0, top: 100, w: 210, gap: 16, left0: 0, totalW: 0, bl: 0, cx: 0, cy: 0, bw: 0, sMin: 0, sMax: 0 };
  let running = true;   // hero visível e aba ativa

  function layout() {
    const W = window.innerWidth;
    const H = Math.max(window.innerHeight, 680);

    // a borda real do texto (as linhas do título são fit-content)
    let copyR = 0;
    copy.querySelectorAll('.title .line, .sub, .actions, .hero-badge')
      .forEach((e) => { copyR = Math.max(copyR, e.getBoundingClientRect().right); });

    const edge = Math.round(W * 0.05);                 // alinha com o menu
    const regionR = W - edge;
    const regionL = copyR + clamp(W * 0.056, 64, 150);
    let w = Math.floor(Math.min((regionR - regionL) / 3.15, H * 0.3));
    const gap = Math.round(w * 0.075);
    const totalW = 3 * w + 2 * gap;
    const left0 = regionR - totalW;
    const k = w / 210;

    // a janela das colunas começa logo abaixo do menu fixo
    const nav = document.querySelector('.topnav');
    const navB = nav ? nav.getBoundingClientRect().bottom : 88;
    const top = Math.round(navB + clamp(H * 0.014, 12, 22));

    const s = hero.style;
    s.setProperty('--he-top', top + 'px');
    s.setProperty('--he-w', w + 'px');
    s.setProperty('--he-gap', gap + 'px');
    s.setProperty('--he-rl', (left0 - w * 0.5) + 'px');
    s.setProperty('--he-rw', (totalW + w) + 'px');
    s.setProperty('--he-rc', (left0 + totalW / 2) + 'px');

    cols.forEach((cs, c) => {
      cs.x = left0 + c * (w + gap);
      cs.el.style.left = cs.x + 'px';
      let y = 0;
      cs.list.forEach((cd) => {
        cd.h = Math.round(w * cd.clip.r);
        cd.el.style.height = cd.h + 'px';
        cd.el.style.setProperty('--he-sw', Math.round(Math.hypot(w, cd.h) * 2) + 'px');
        cd.y = y;
        y += cd.h + gap;
      });
      cs.setH = y / SETS;
      cs.speed = cs.def.speed * k;
      cs.dur = (cs.setH / cs.speed) * 1000;
      makeAnim(cs);
    });

    // a frente de luz: recortada à região das colunas, com borda macia
    // (coordenadas do hero; a janela vai de "top" até a base)
    const bl = Math.max(0, left0 - w * 0.6);
    const cx = left0 + totalW / 2;
    const cy = (top + H) / 2;
    const diag = Math.hypot(totalW + w, H - top);
    const bw = diag * 1.7;
    const bh = diag * 2.4;
    const corners = [[left0, top], [left0 + totalW, top], [left0, H], [left0 + totalW, H]]
      .map(([x, y]) => (x - cx) * DX + (y - cy) * DY);
    beam.style.left = bl + 'px';
    beam.style.setProperty('-webkit-mask-image', 'linear-gradient(90deg, transparent 0, #000 ' + Math.round(w * 0.6) + 'px)');
    beam.style.setProperty('mask-image', 'linear-gradient(90deg, transparent 0, #000 ' + Math.round(w * 0.6) + 'px)');
    beamIn.style.setProperty('--he-bw', bw + 'px');
    beamIn.style.setProperty('--he-bh', bh + 'px');

    geo = { W, H, top, w, gap, left0, totalW, bl, cx, cy, bw, sMin: Math.min(...corners), sMax: Math.max(...corners) };
    placeBeam(geo.sMin - 200);
  }

  /* laço de cada coluna: uma animação de compositor (só transform) */
  function makeAnim(cs) {
    let phase = cs.def.phase;
    if (cs.anim) {
      phase = ((cs.anim.currentTime || 0) % cs.animDur) / cs.animDur;
      cs.anim.cancel();
    }
    const end = 'translate3d(0,' + (-cs.setH).toFixed(1) + 'px,0)';
    const kf = cs.def.dir < 0
      ? [{ transform: 'translate3d(0,0,0)' }, { transform: end }]
      : [{ transform: end }, { transform: 'translate3d(0,0,0)' }];
    cs.anim = cs.track.animate(kf, { duration: cs.dur, iterations: Infinity, easing: 'linear' });
    cs.animDur = cs.dur;
    cs.anim.currentTime = phase * cs.dur;
    cs.anim.pause();
    applyRate(cs);
  }

  function applyRate(cs) {
    const a = cs.anim;
    if (!a) return;
    if (!running || cs.rate <= 0.002 || reduce) {
      if (a.playState === 'running') a.pause();
      return;
    }
    if (a.playbackRate !== cs.rate) a.playbackRate = cs.rate;
    if (a.playState !== 'running') a.play();
  }

  function setRate(cs, to, dur, ease) {
    if (cs.rateTw) cs.rateTw.kill();
    cs.rateTw = gsap.to(cs, {
      rate: to,
      duration: dur,
      ease: ease || 'sine.inOut',
      onUpdate: () => applyRate(cs),
      onComplete: () => { cs.rateTw = null; applyRate(cs); }
    });
  }

  /* posição atual de um card no hero, sem ler o layout */
  const gp = (t, p) => (typeof gsap !== 'undefined' ? gsap.getProperty(t, p) : 0) || 0;
  function trackY(cs) {
    const f = ((cs.anim.currentTime || 0) % cs.animDur) / cs.animDur;
    return cs.def.dir < 0 ? -cs.setH * f : -cs.setH * (1 - f);
  }
  function cardBox(cd) {
    const cs = cd.col;
    const top = geo.top + gp(cs.el, 'y') + gp(cs.par, 'y') + gp(cs.inn, 'y') + trackY(cs) + cd.y;
    const x = cs.x + gp(cs.el, 'x') + gp(cs.par, 'x');
    return { x, top, bottom: top + cd.h, cx: x + geo.w / 2 };
  }
  // fração do card dentro da faixa útil (abaixo do menu, acima da base)
  function seen(b, h, top0, bot0) {
    return (Math.min(b.bottom, bot0) - Math.max(b.top, top0)) / h;
  }

  /* ---------- vídeo ---------- */

  const playing = [];
  let hovered = null;
  let maxPlaying = 0;

  function ensureVideo(cd) {
    if (cd.video) return cd.video;
    const v = document.createElement('video');
    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('muted', '');
    v.setAttribute('loop', '');
    v.setAttribute('playsinline', '');
    v.preload = 'metadata';
    v.poster = V + cd.clip.d + '/' + cd.key + '.jpg';
    v.src = V + cd.clip.d + '/' + cd.key + '.mp4';
    v.setAttribute('aria-hidden', 'true');
    cd.m.insertBefore(v, cd.gray);
    cd.video = v;
    return v;
  }
  function startVideo(cd) {
    const p = cd.video.play();
    if (p && p.catch) p.catch(() => {});
  }
  function play(cd) {
    if (cd.playing) return;
    ensureVideo(cd);
    cd.playing = true;
    playing.push(cd);
    cd.el.classList.add('is-play');
    if (running) startVideo(cd);
    trim();
    maxPlaying = Math.max(maxPlaying, playing.length);
  }
  function stop(cd) {
    if (!cd.playing) return;
    cd.playing = false;
    const i = playing.indexOf(cd);
    if (i >= 0) playing.splice(i, 1);
    if (cd.video) cd.video.pause();
    cd.el.classList.remove('is-play');
  }
  function trim() {
    const cap = MAX_PLAY + (hovered && hovered.playing ? 1 : 0);
    while (playing.length > cap) {
      const old = playing.find((x) => x !== hovered);
      if (!old) break;
      stop(old);
    }
  }

  /* escolhe cards bem visíveis, espalhados pelas colunas */
  function pick(n, pool) {
    const H = geo.H;
    const count = [0, 0, 0];
    playing.forEach((p) => { count[p.col.c]++; });
    const cand = (pool || cards)
      .filter((cd) => !cd.playing && !cd.hv)
      .map((cd) => {
        const b = cardBox(cd);
        const mid = (b.top + b.bottom) / 2;
        return { cd, v: seen(b, cd.h, geo.top + 2, H - 24), mid };
      })
      .filter((o) => o.v > 0.92);
    const out = [];
    while (out.length < n && cand.length) {
      cand.sort((a, b) =>
        (count[a.cd.col.c] - count[b.cd.col.c]) ||
        (Math.abs(a.mid - geo.cy) - Math.abs(b.mid - geo.cy)));
      const o = cand.shift();
      out.push(o.cd);
      count[o.cd.col.c]++;
    }
    return out;
  }

  /* ---------- luz ---------- */

  function placeBeam(s) {
    const t = s - geo.bw * 0.32;   // a frente fica a 82% da largura do feixe
    beamIn.style.transform =
      'translate3d(' + (geo.cx - geo.bl).toFixed(1) + 'px,' + (geo.cy - geo.top).toFixed(1) + 'px,0) rotate(' + PHI + 'deg) translate3d(' + t.toFixed(1) + 'px,0,0)';
  }

  function sweepCard(cd, deg, strength, dur) {
    const r = (deg * Math.PI) / 180;
    const w = geo.w;
    const d = (Math.abs(w * Math.cos(r)) + Math.abs(cd.h * Math.sin(r))) / 2 + Math.hypot(w, cd.h) * 0.3;
    cd.sweep.animate(
      [
        { transform: 'rotate(' + deg + 'deg) translate3d(' + (-d).toFixed(1) + 'px,0,0)', opacity: 0 },
        { opacity: strength, offset: 0.2 },
        { opacity: strength * 0.85, offset: 0.66 },
        { transform: 'rotate(' + deg + 'deg) translate3d(' + d.toFixed(1) + 'px,0,0)', opacity: 0 }
      ],
      { duration: dur, easing: 'cubic-bezier(0.32, 0.1, 0.2, 1)' }
    );
  }
  function rimFlash(cd, strength, dur) {
    cd.rim.animate(
      [{ opacity: 0 }, { opacity: strength, offset: 0.16 }, { opacity: 0 }],
      { duration: dur, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' }
    );
  }

  function ignite(cd, fx) {
    if (cd.on) return;
    cd.on = true;
    if (!fx) {
      cd.el.classList.add('is-quiet', 'is-on');
      requestAnimationFrame(() => requestAnimationFrame(() => cd.el.classList.remove('is-quiet')));
      return;
    }
    cd.el.classList.add('is-on');
    sweepCard(cd, PHI, 1, 900);
    rimFlash(cd, 0.95, 1800);
    cd.halo.animate(
      [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }],
      { duration: 2000, easing: 'cubic-bezier(0.3, 0.1, 0.3, 1)' }
    );
    // o vídeo só anda quando o cinza já saiu: primeiro a cor volta ao
    // quadro parado, depois ele ganha vida (sem fantasma de duas poses)
    if (cd.lead) setTimeout(() => play(cd), 1150);
  }

  /* ---------- versão sem movimento: colunas paradas, coloridas ---------- */

  layout();

  // a fonte muda a largura do texto: as colunas se medem com ela pronta
  const fontsReady = new Promise((res) => {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(res);
    else res();
    setTimeout(res, 700);
  });

  if (reduce || typeof gsap === 'undefined') {
    root.classList.add('he-static');
    running = false;
    cards.forEach((cd) => ignite(cd, false));
    if (titleClip) { titleClip.removeAttribute('autoplay'); titleClip.pause(); }
    fontsReady.then(layout);
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 150); });
    return;
  }

  /* ============================================================
     Movimento
     ============================================================ */

  const hasST = typeof ScrollTrigger !== 'undefined';
  if (hasST) gsap.registerPlugin(ScrollTrigger);

  // o clipe da frase espera a carga, cinza e parado
  if (titleClip) {
    titleClip.removeAttribute('autoplay');
    titleClip.pause();
    try { titleClip.currentTime = 0; } catch (e) { /* ainda sem dados */ }
  }

  let armed = false;       // cursor e rotação liberados
  let charged = false;
  let exitP = 0;
  let rotT = 0;

  /* ---------- a carga: uma frente de luz, uma vez ---------- */

  function charge() {
    charged = true;
    hero.classList.add('is-charged');
    if (titleClip && running) { const p = titleClip.play(); if (p && p.catch) p.catch(() => {}); }

    // os vídeos principais: um por coluna, mais um, bem à vista
    pick(MAX_PLAY).forEach((cd) => { cd.lead = true; });

    gsap.fromTo(aura, { opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1, duration: 2.8, ease: 'power2.out' });
    gsap.fromTo(beam, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.out' });

    const sw = { s: geo.sMin - 160 };
    const started = [false, false, false];
    gsap.to(sw, {
      s: geo.sMax + 220,
      duration: SWEEP,
      ease: 'sine.inOut',
      onUpdate() {
        placeBeam(sw.s);
        const H = geo.H;
        for (let i = 0; i < cards.length; i++) {
          const cd = cards[i];
          if (cd.on) continue;
          const b = cardBox(cd);
          if (b.bottom < geo.top || b.top > H) continue;
          const yc = (Math.max(b.top, geo.top) + Math.min(b.bottom, H)) / 2;
          const s = (b.cx - geo.cx) * DX + (yc - geo.cy) * DY;
          if (s <= sw.s) ignite(cd, true);
        }
        // cada coluna ganha movimento quando a luz chega ao meio dela
        cols.forEach((cs, c) => {
          if (started[c]) return;
          const s = (cs.x + geo.w / 2 - geo.cx) * DX;
          if (sw.s >= s) {
            started[c] = true;
            setRate(cs, 1, 2.6, 'sine.in');
          }
        });
      },
      onComplete() {
        cards.forEach((cd) => ignite(cd, false));
        gsap.to(beam, { opacity: 0, duration: 0.6, ease: 'power1.in' });
        cols.forEach((cs) => { if (cs.rate === 0 && !cs.rateTw) setRate(cs, 1, 2.2, 'sine.in'); });
        armed = true;
        lastSwap = performance.now();
        scheduleRotate();
      }
    });
  }

  /* ---------- vida calma: troca de quem toca ---------- */

  // a cada 2 s: quem saiu de vista para e outro, bem à vista, assume;
  // a cada ~6,5 s o vídeo mais antigo passa a vez (sem lampejo: só o
  // movimento muda de lugar)
  let lastSwap = 0;
  function scheduleRotate() {
    clearTimeout(rotT);
    if (!running || !armed) return;
    rotT = setTimeout(rotate, 2000);
  }
  function rotate() {
    if (!running) return;
    if (exitP < 0.3) {
      const H = geo.H;
      const now = performance.now();
      playing.slice().forEach((cd) => {
        if (cd !== hovered && seen(cardBox(cd), cd.h, geo.top, H) < 0.45) stop(cd);
      });
      const swap = now - lastSwap >= ROTATE_MS;
      if (playing.length < MAX_PLAY || swap) {
        const next = pick(1)[0];
        if (next) {
          if (playing.length >= MAX_PLAY) {
            const old = playing.find((x) => x !== hovered);
            if (old) stop(old);
          }
          play(next);
          if (swap) lastSwap = now;
        }
      }
    }
    scheduleRotate();
  }

  /* ---------- visibilidade: fora da tela, tudo para ---------- */

  function setRunning(v) {
    if (v === running) return;
    running = v;
    hero.classList.toggle('is-off', !v);
    cols.forEach(applyRate);
    if (v) {
      if (titleClip && charged) { const p = titleClip.play(); if (p && p.catch) p.catch(() => {}); }
      playing.forEach(startVideo);
      scheduleRotate();
    } else {
      clearTimeout(rotT);
      if (titleClip) titleClip.pause();
      playing.forEach((cd) => { if (cd.video) cd.video.pause(); });
    }
  }
  let onScreen = true;
  const refreshRun = () => setRunning(onScreen && !document.hidden);
  // só uma faixa escura do hero à vista (fim da página) conta como fora
  new IntersectionObserver((entries) => {
    const e = entries[0];
    onScreen = e.isIntersecting && e.intersectionRatio >= 0.14;
    refreshRun();
  }, { threshold: [0, 0.14, 0.3] }).observe(hero);
  document.addEventListener('visibilitychange', refreshRun);

  /* ---------- entrada ---------- */

  const lines = copy.querySelectorAll('.title .line');
  const entrance = () => gsap.timeline({ defaults: { ease: 'expo.out' } })
    .fromTo(copy.querySelector('.hero-badge'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.2 }, 0.2)
    .fromTo(lines, { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 1.3, stagger: 0.09 }, 0.32)
    .fromTo(copy.querySelector('.sub'), { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 1.2 }, 0.66)
    .fromTo(copy.querySelector('.actions'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.2 }, 0.78)
    .fromTo(copy.querySelector('.next-stop'), { opacity: 0 }, { opacity: 1, duration: 1.2 }, 0.95)
    // as colunas chegam no sentido em que vão correr, ainda cinza
    .fromTo(cols.map((cs) => cs.inn),
      { opacity: 0, y: (i) => -COLUMNS[i].dir * 90 },
      { opacity: 1, y: 0, duration: 1.7, stagger: 0.14, ease: 'expo.out' }, 0.12)
    .add(charge, 1.6);

  /* ---------- cursor ---------- */

  cards.forEach((cd) => {
    cd.el.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch' || !armed || exitP > 0.08) return;
      if (hovered && hovered !== cd) leave(hovered);
      hovered = cd;
      cd.hv = true;
      cd.el.classList.add('is-hv');
      // a luz entra pelo lado de onde veio o cursor
      const r = cd.face.getBoundingClientRect();
      const deg = (Math.atan2(r.top + r.height / 2 - e.clientY, r.left + r.width / 2 - e.clientX) * 180) / Math.PI;
      sweepCard(cd, deg, 0.9, 900);
      cd.ping.animate(
        [{ opacity: 0.9, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.1)' }],
        { duration: 1000, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );
      play(cd);
      setRate(cd.col, 0, 0.8, 'power2.out');
      clearTimeout(focusT);
      reel.classList.add('is-focus');
    });
    cd.el.addEventListener('pointerleave', () => leave(cd));
  });
  let focusT = 0;
  function leave(cd) {
    if (!cd.hv) return;
    cd.hv = false;
    cd.el.classList.remove('is-hv');
    if (hovered === cd) hovered = null;
    trim();
    if (!cd.col.list.some((x) => x.hv)) setRate(cd.col, 1, 1.6, 'sine.inOut');
    // entre um card e outro o foco não pisca
    clearTimeout(focusT);
    focusT = setTimeout(() => { if (!hovered) reel.classList.remove('is-focus'); }, 160);
  }

  // paralaxe leve das colunas com o cursor
  const qx = cols.map((cs) => gsap.quickTo(cs.par, 'x', { duration: 1.4, ease: 'power3.out' }));
  const qy = cols.map((cs) => gsap.quickTo(cs.par, 'y', { duration: 1.4, ease: 'power3.out' }));
  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || !charged) return;
    const nx = e.clientX / geo.W - 0.5;
    const ny = e.clientY / geo.H - 0.5;
    cols.forEach((cs, c) => {
      qx[c](-nx * 14 * DEPTH[c]);
      qy[c](-ny * 10 * DEPTH[c]);
    });
  });

  /* ---------- rolagem: o texto sai, as vidas se reúnem, uma frase fecha ---------- */

  if (hasST) {
    const words = coda.querySelectorAll('.he-coda-l > span');
    // quanto cada coluna sobe (cabe na sobra do laço)
    const rise = (c) => -Math.max(0, Math.min([0.24, 0.4, 0.16][c] * geo.H, 2 * cols[c].setH - geo.H - 8));
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: '+=95%',
        pin: true,
        scrub: 0.7,
        invalidateOnRefresh: true,
        onUpdate(self) {
          exitP = self.progress;
          if (exitP > 0.08 && hovered) leave(hovered);
        }
      }
    });
    tl.to(wrap, { y: () => -geo.H * 0.12, opacity: 0, duration: 0.42, ease: 'power2.in' }, 0)
      .to(reel, { x: () => geo.W / 2 - (geo.left0 + geo.totalW / 2), scale: 1.1, duration: 1, ease: 'power2.inOut' }, 0)
      .to(aura, { x: () => geo.W / 2 - (geo.left0 + geo.totalW / 2), duration: 1, ease: 'power2.inOut' }, 0)
      .to(cols.map((cs) => cs.el), { y: (i) => rise(i), duration: 1, ease: 'power1.in' }, 0)
      .to(veil, { opacity: 1, duration: 0.38, ease: 'power1.inOut' }, 0.16)
      .fromTo(words, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.18, stagger: 0.03, ease: 'power2.out' }, 0.54)
      .to(foot, { opacity: 1, duration: 0.2 }, 0.8);
  }

  /* ---------- redimensionamento ---------- */

  const relayout = () => {
    layout();
    if (hasST) ScrollTrigger.refresh();
  };
  // a entrada começa com a fonte pronta (no máximo 0,7 s de espera);
  // se ela chegar mais tarde, as colunas se remedem
  fontsReady.then(() => { relayout(); entrance(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(relayout, 150);
  });

  /* ---------- diagnóstico ---------- */

  window.__heroE = {
    cols,
    cards,
    get playing() { return playing.length; },
    get maxPlaying() { return maxPlaying; },
    get running() { return running; },
    get armed() { return armed; },
    get geo() { return geo; }
  };
})();
