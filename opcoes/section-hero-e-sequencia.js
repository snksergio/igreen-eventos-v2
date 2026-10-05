/* ============================================================
   Sequência — Hero E ("Correnteza") → Statement, sem emenda

   Um palco só (preso na rolagem) conta a história inteira.
   Rolagem 0 → 1 (P):
     0,00–0,15  reunião: o texto sai; as vidas se juntam ao centro sob
                um véu e as colunas param de correr
     0,08–0,17  a frase "Cada uma dessas vidas / começou com uma decisão."
     0,23–0,29  a frase sobe e sai; a do statement chega, ainda apagada
     0,24–0,42  entrega: quatro vidas voam e viram as quatro mídias do
                statement; as outras se recolhem nos quadradinhos de luz;
                a janela abaixo do menu se abre; o fundo do hero se apaga
     0,38–0,86  statement como no site: a frase preenche palavra por
                palavra e mídias/quadrados sobem por trás (difference)
     0,84–0,94  o fechamento (texto + botão) entra e encerra

   Antes da rolagem, o hero é o E: entrada com a frente de luz, colunas
   correndo (animações de compositor), 4 vídeos, hover.
   Durante a rolagem só se escreve transform/opacity (e só o que mudou).
   ============================================================ */

(() => {
  const seq = document.querySelector('.shes-seq');
  const hero = document.querySelector('.shes-hero');
  if (!seq || !hero) return;

  const root = document.documentElement;
  const win = hero.querySelector('.shes-window');
  const winIn = hero.querySelector('.shes-win-in');
  const reel = hero.querySelector('.shes-reel');
  const beam = hero.querySelector('.shes-beam');
  const beamIn = hero.querySelector('.shes-beam-in');
  const aura = hero.querySelector('.shes-aura');
  const shade = hero.querySelector('.shes-shade');
  const richBg = hero.querySelector('.rich-bg');
  const veil = hero.querySelector('.shes-veil');
  const coda = hero.querySelector('.shes-coda');
  const wrap = hero.querySelector('.shes-wrap');
  const copy = hero.querySelector('.shes-copy');
  const titleClip = hero.querySelector('.title-clip video');

  const st = document.querySelector('.shes-st');
  const stH = st.querySelector('.shes-st-h');
  const stWords = Array.from(st.querySelectorAll('.shes-sw'));
  const stOutro = st.querySelector('.shes-outro');
  const stMedia = Array.from(st.querySelectorAll('.shes-bm'));
  const stSquares = Array.from(st.querySelectorAll('.shes-bsq'));
  const stVideo = st.querySelector('.shes-bm video');

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
  const SWEEP = 2.5;               // duração da travessia (s)
  const DEPTH = [0.7, 1, 0.55];    // paralaxe do cursor por coluna
  const PIN = 5;                   // comprimento da sequência, em alturas de tela
  const GATHER_SCALE = 1.1;        // as vidas reunidas crescem um pouco

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const c01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const seg = (P, a, b) => c01((P - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);   // power1.inOut
  const easeIO3 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // power2.inOut
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t) => t * t;
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
    const col = el('div', 'shes-col');
    const par = el('div', 'shes-par');
    const inn = el('div', 'shes-in');
    const track = el('div', 'shes-track');
    col.appendChild(par);
    par.appendChild(inn);
    inn.appendChild(track);
    const cs = { el: col, par, inn, track, def, c, list: [], anim: null, animDur: 0, setH: 0, dur: 0, rate: 0, rateTw: null, x: 0, entryCT: 0, targetCT: 0 };
    for (let s = 0; s < SETS; s++) {
      def.clips.forEach((key) => {
        const clip = CLIPS[key];
        const fig = el('figure', 'shes-card');
        fig.style.setProperty('--shes-op', clip.op);
        if (s) fig.setAttribute('aria-hidden', 'true');
        else { fig.setAttribute('role', 'img'); fig.setAttribute('aria-label', clip.l); }
        fig.innerHTML =
          '<span class="shes-halo"></span>' +
          '<div class="shes-face">' +
            '<div class="shes-m">' +
              '<img class="shes-c" src="' + V + clip.d + '/' + key + '.jpg" alt="" draggable="false">' +
              '<img class="shes-g" src="' + G + key + '.jpg" alt="" draggable="false">' +
            '</div>' +
            '<span class="shes-dim"></span>' +
            '<span class="shes-sweep"></span>' +
            '<span class="shes-rim"></span>' +
            '<span class="shes-hair"></span>' +
            '<span class="shes-live"></span>' +
            '<span class="shes-tint"></span>' +
          '</div>' +
          '<span class="shes-ping"></span>';
        track.appendChild(fig);
        const cd = {
          el: fig,
          face: fig.querySelector('.shes-face'),
          m: fig.querySelector('.shes-m'),
          gray: fig.querySelector('.shes-g'),
          sweep: fig.querySelector('.shes-sweep'),
          rim: fig.querySelector('.shes-rim'),
          ping: fig.querySelector('.shes-ping'),
          halo: fig.querySelector('.shes-halo'),
          tint: fig.querySelector('.shes-tint'),
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
          hv: false,
          fl: null           // voo da entrega (definido no plano)
        };
        cs.list.push(cd);
        cards.push(cd);
      });
    }
    reel.appendChild(col);
    cols.push(cs);
  });

  /* ---------- escrita só do que mudou ---------- */

  function setT(e, v) { if (e._t !== v) { e._t = v; e.style.transform = v; } }
  function setO(e, v) {
    const s = v >= 0.999 ? '1' : v <= 0.001 ? '0' : v.toFixed(3);
    if (e._o !== s) { e._o = s; e.style.opacity = s; }
  }
  function setV(e, on) {
    const s = on ? '' : 'hidden';
    if (e._v !== s) { e._v = s; e.style.visibility = s; }
  }

  /* ---------- medidas ---------- */

  let geo = { W: 0, H: 0, top: 100, w: 210, gap: 16, left0: 0, totalW: 0, bl: 0, cx: 0, cy: 0, bw: 0, sMin: 0, sMax: 0 };
  let running = true;   // palco visível e aba ativa
  let slots = [];       // mídias e quadrados do statement (posição de layout)

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
    const w = Math.floor(Math.min((regionR - regionL) / 3.15, H * 0.3));
    const gap = Math.round(w * 0.075);
    const totalW = 3 * w + 2 * gap;
    const left0 = regionR - totalW;
    const k = w / 210;

    // a janela das colunas começa logo abaixo do menu fixo
    const nav = document.querySelector('.topnav');
    const navB = nav ? nav.getBoundingClientRect().bottom : 88;
    const top = Math.round(navB + clamp(H * 0.014, 12, 22));

    const s = hero.style;
    s.setProperty('--shes-top', top + 'px');
    s.setProperty('--shes-w', w + 'px');
    s.setProperty('--shes-gap', gap + 'px');
    s.setProperty('--shes-rl', (left0 - w * 0.5) + 'px');
    s.setProperty('--shes-rw', (totalW + w) + 'px');
    s.setProperty('--shes-rc', (left0 + totalW / 2) + 'px');

    cols.forEach((cs, c) => {
      cs.x = left0 + c * (w + gap);
      cs.el.style.left = cs.x + 'px';
      let y = 0;
      cs.list.forEach((cd) => {
        cd.h = Math.round(w * cd.clip.r);
        cd.el.style.height = cd.h + 'px';
        cd.el.style.setProperty('--shes-sw', Math.round(Math.hypot(w, cd.h) * 2) + 'px');
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
    beamIn.style.setProperty('--shes-bw', bw + 'px');
    beamIn.style.setProperty('--shes-bh', bh + 'px');

    geo = { W, H, top, w, gap, left0, totalW, bl, cx, cy, bw, sMin: Math.min(...corners), sMax: Math.max(...corners) };
    placeBeam(geo.sMin - 200);

    // as vagas do statement: posição de layout (sem transform) + cor
    slots = stMedia.concat(stSquares).map((e) => {
      const cs = getComputedStyle(e);
      const isSq = e.classList.contains('shes-bsq');
      const bg = cs.backgroundColor;
      const border = parseFloat(cs.borderTopWidth) || 0;
      return {
        el: e,
        sq: isSq,
        x: e.offsetLeft,
        y: e.offsetTop,
        w: e.offsetWidth,
        h: e.offsetHeight,
        range: parseFloat(e.dataset.range) || 800,
        color: bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : 'rgba(168, 255, 53, 0.04)',
        border
      };
    });
  }

  /* laço de cada coluna: uma animação de compositor (só transform) */
  function makeAnim(cs) {
    let phase = cs.def.phase;
    let ct = null;
    if (cs.anim) {
      ct = cs.anim.currentTime || 0;
      phase = (ct % cs.animDur) / cs.animDur;
      cs.anim.cancel();
    }
    const end = 'translate3d(0,' + (-cs.setH).toFixed(1) + 'px,0)';
    const kf = cs.def.dir < 0
      ? [{ transform: 'translate3d(0,0,0)' }, { transform: end }]
      : [{ transform: end }, { transform: 'translate3d(0,0,0)' }];
    cs.anim = cs.track.animate(kf, { duration: cs.dur, iterations: Infinity, easing: 'linear' });
    // mantém a fase (e, na sequência, as fases de entrada/alvo)
    if (cs.animDur) {
      const r = cs.dur / cs.animDur;
      cs.entryCT *= r;
      cs.targetCT *= r;
    }
    cs.animDur = cs.dur;
    cs.anim.currentTime = phase * cs.dur;
    cs.anim.pause();
    applyRate(cs);
  }

  function applyRate(cs) {
    const a = cs.anim;
    if (!a) return;
    if (!running || cs.rate <= 0.002 || reduce || mode !== 'live') {
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
  function trackYAt(cs, ct) {
    const f = ((ct % cs.animDur) + cs.animDur) % cs.animDur / cs.animDur;
    return cs.def.dir < 0 ? -cs.setH * f : -cs.setH * (1 - f);
  }
  function trackY(cs) { return trackYAt(cs, cs.anim.currentTime || 0); }
  function cardBox(cd) {
    const cs = cd.col;
    const top = geo.top + gp(cs.par, 'y') + gp(cs.inn, 'y') + trackY(cs) + cd.y;
    const x = cs.x + gp(cs.par, 'x');
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
  let vidsOn = true;    // fora do hero (na entrega e no statement) os cards param

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
    if (running && vidsOn) startVideo(cd);
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
  function setVids(on) {
    if (on === vidsOn) return;
    vidsOn = on;
    playing.forEach((cd) => {
      if (!cd.video) return;
      if (on && running) startVideo(cd);
      else cd.video.pause();
    });
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
    if (cd.lead) setTimeout(() => { if (mode === 'live') play(cd); }, 1150);
  }

  /* ---------- versão sem movimento: tudo parado, colorido, empilhado ---------- */

  let mode = 'live';    // 'live' = hero vivo · 'scrub' = a rolagem conduz

  layout();

  // a fonte muda a largura do texto: as colunas se medem com ela pronta
  const fontsReady = new Promise((res) => {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(res);
    else res();
    setTimeout(res, 700);
  });

  if (reduce || typeof gsap === 'undefined') {
    root.classList.add('shes-static');
    running = false;
    cards.forEach((cd) => ignite(cd, false));
    if (titleClip) { titleClip.removeAttribute('autoplay'); titleClip.pause(); }
    stMedia.concat(stSquares).forEach((e) => { e.style.opacity = '1'; });
    stH.style.opacity = '1';
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
  // a cada ~6,5 s o vídeo mais antigo passa a vez (sem lampejo)
  let lastSwap = 0;
  function scheduleRotate() {
    clearTimeout(rotT);
    if (!running || !armed) return;
    rotT = setTimeout(rotate, 2000);
  }
  function rotate() {
    if (!running) return;
    if (mode === 'live') {
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

  let stVidOn = false;
  function syncStVideo() {
    if (!stVideo) return;
    const want = running && stVidOn;
    if (want && stVideo.paused) { const p = stVideo.play(); if (p && p.catch) p.catch(() => {}); }
    else if (!want && !stVideo.paused) stVideo.pause();
  }
  function setRunning(v) {
    if (v === running) return;
    running = v;
    hero.classList.toggle('is-off', !v);
    cols.forEach(applyRate);
    if (v) {
      if (titleClip && charged && mode === 'live') { const p = titleClip.play(); if (p && p.catch) p.catch(() => {}); }
      if (vidsOn) playing.forEach(startVideo);
      scheduleRotate();
    } else {
      clearTimeout(rotT);
      if (titleClip) titleClip.pause();
      playing.forEach((cd) => { if (cd.video) cd.video.pause(); });
    }
    syncStVideo();
  }
  let onScreen = true;
  const refreshRun = () => setRunning(onScreen && !document.hidden);
  // só uma faixa do palco à vista (fim da página) conta como fora
  new IntersectionObserver((entries) => {
    const e = entries[0];
    onScreen = e.isIntersecting && e.intersectionRatio >= 0.14;
    refreshRun();
  }, { threshold: [0, 0.14, 0.3] }).observe(seq);
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

  // se a página abrir já no meio da sequência, o hero nasce pronto
  function quietStart() {
    cols.forEach((cs) => { gsap.set(cs.inn, { opacity: 1, y: 0 }); cs.rate = 1; });
    copy.querySelectorAll('.hero-badge, .title .line, .sub, .actions, .next-stop').forEach((e) => { e.style.opacity = '1'; });
    cards.forEach((cd) => ignite(cd, false));
    hero.classList.add('is-charged');
    gsap.set(aura, { opacity: 1, scale: 1 });
    charged = true;
    armed = true;
    cols.forEach(applyRate);
    scheduleRotate();
  }

  /* ---------- cursor ---------- */

  cards.forEach((cd) => {
    cd.el.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch' || !armed || mode !== 'live') return;
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
    if (e.pointerType === 'touch' || !charged || mode !== 'live') return;
    const nx = e.clientX / geo.W - 0.5;
    const ny = e.clientY / geo.H - 0.5;
    cols.forEach((cs, c) => {
      qx[c](-nx * 14 * DEPTH[c]);
      qy[c](-ny * 10 * DEPTH[c]);
    });
  });

  /* ============================================================
     A sequência na rolagem
     ============================================================ */

  // trechos (P de 0 a 1 ao longo de PIN alturas de tela)
  const T = {
    gather: [0, 0.15],
    codaIn: [0.08, 0.17],
    codaOut: [0.22, 0.28],
    fade: [0.22, 0.27],         // as vidas que não voam se apagam
    release: [0.24, 0.3],       // a janela abaixo do menu se abre
    veilOut: [0.24, 0.32],
    bgOut: [0.24, 0.38],
    fly: [0.25, 0.29, 0.095],   // início do primeiro voo, do último, duração
    stIn: [0.35, 0.42],         // a frase do statement chega, apagada, com o centro já livre
    words: [0.42, 0.88],        // e preenche palavra por palavra
    rest: [0.33, 0.41],         // mídias/quadrados sem par aparecem
    outro: [0.86, 0.95],
    vidsOff: 0.27,
    par0: 0.24, parFrom: 0.28   // o percurso das mídias começa já andado
  };
  const pPar = (P) => (P <= T.par0 ? T.parFrom : lerp(T.parFrom, 1, (P - T.par0) / (1 - T.par0)));
  const parOff = (sl, P) => (0.5 - pPar(P)) * sl.range * (geo.H / 1200);

  let plan = null;
  const codaWords = Array.from(coda.querySelectorAll('.shes-coda-l > span'));

  /* o hero entra no modo conduzido pela rolagem */
  function enterScrub() {
    mode = 'scrub';
    if (hovered) leave(hovered);
    cols.forEach((cs) => {
      if (cs.rateTw) { cs.rateTw.kill(); cs.rateTw = null; }
      cs.anim.pause();
      cs.entryCT = cs.anim.currentTime || 0;
      // as colunas ainda andam um pouco na reunião e param
      cs.targetCT = cs.entryCT + cs.animDur * 0.05;
      qx[cs.c](0);
      qy[cs.c](0);
    });
    clearTimeout(rotT);
    plan = null;
  }
  /* volta ao hero vivo (rolou de volta até o topo) */
  function exitScrub() {
    mode = 'live';
    cols.forEach((cs) => {
      cs.anim.currentTime = cs.entryCT;
      if (charged && !cs.rateTw) cs.rate = cs.rate || 1;
      applyRate(cs);
    });
    scheduleRotate();
  }

  /* o plano da entrega: onde cada vida estará quando a reunião termina
     (conta, sem ler o layout) e para onde ela voa */
  function buildPlan() {
    const H = geo.H;
    const top = geo.top;
    const sG = GATHER_SCALE;
    const ox = geo.left0 + geo.totalW / 2;          // origem da escala da reunião
    const oy = top + (H - top) / 2;
    const dxG = geo.W / 2 - ox;
    const fin = [];
    cards.forEach((cd) => {
      const cs = cd.col;
      const ty = trackYAt(cs, cs.targetCT);
      const x = cs.x;
      const y = top + ty + cd.y;
      const cx = x + geo.w / 2;
      const cy = y + cd.h / 2;
      const sx = ox + sG * (cx - ox) + dxG;
      const sy = oy + sG * (cy - oy);
      const sh = sG * cd.h;
      const vis = (Math.min(sy + sh / 2, H) - Math.max(sy - sh / 2, top)) / sh;
      cd.fl = null;
      cd.vis = vis;
      fin.push({ cd, sx, sy, sw: sG * geo.w, sh, vis });
    });
    const vis = fin.filter((o) => o.vis > 0.5);
    const media = slots.filter((s) => !s.sq);
    const squares = slots.filter((s) => s.sq);
    const slotC = (s) => ({ x: s.x + s.w / 2, y: s.y + s.h / 2 + parOff(s, T.fly[1] + T.fly[2]) });

    // as mídias: as vidas mais altas (retrato), inteiras à vista,
    // casadas com as vagas pela menor distância total
    const tall = vis.filter((o) => o.vis > 0.9).sort((a, b) => b.cd.clip.r - a.cd.clip.r || b.vis - a.vis).slice(0, media.length);
    let best = null;
    const perm = (arr, n, cur, used) => {
      if (cur.length === n) {
        let d = 0;
        cur.forEach((si, i) => { const c = slotC(media[si]); d += Math.hypot(c.x - tall[i].sx, c.y - tall[i].sy); });
        if (!best || d < best.d) best = { d, map: cur.slice() };
        return;
      }
      for (let i = 0; i < arr.length; i++) {
        if (used[i]) continue;
        used[i] = true; cur.push(i);
        perm(arr, n, cur, used);
        cur.pop(); used[i] = false;
      }
    };
    perm(media, Math.min(tall.length, media.length), [], []);
    const usedSlots = new Set();
    const flights = [];
    if (best) {
      best.map.forEach((si, i) => {
        flights.push({ o: tall[i], slot: media[si] });
        usedSlots.add(media[si]);
      });
    }
    // os quadradinhos: cada vida restante vai para a vaga mais próxima
    const rest = vis.filter((o) => !flights.some((f) => f.o === o)).sort((a, b) => a.sy - b.sy);
    rest.forEach((o) => {
      let bestS = null;
      let bestD = Infinity;
      squares.forEach((s) => {
        if (usedSlots.has(s)) return;
        const c = slotC(s);
        const d = Math.hypot(c.x - o.sx, c.y - o.sy);
        if (d < bestD) { bestD = d; bestS = s; }
      });
      if (bestS) { usedSlots.add(bestS); flights.push({ o, slot: bestS }); }
    });

    // horário de cada voo: das mais próximas do centro para as de fora
    const cxS = geo.W / 2;
    const cyS = H / 2;
    const maxD = Math.max(1, ...flights.map((f) => Math.hypot(f.o.sx - cxS, f.o.sy - cyS)));
    flights.forEach((f) => {
      const d = Math.hypot(f.o.sx - cxS, f.o.sy - cyS) / maxD;
      // as quatro mídias saem primeiro; os quadradinhos logo depois
      const start = lerp(T.fly[0], T.fly[1], f.slot.sq ? 0.35 + 0.65 * d : 0.25 * d);
      const cd = f.o.cd;
      cd.fl = {
        slot: f.slot,
        x0: f.o.sx,
        y0: f.o.sy,
        sT: f.slot.w / f.o.sw,
        start,
        dur: T.fly[2] * (f.slot.sq ? 0.85 : 1)
      };
      if (f.slot.sq) {
        cd.tint.style.setProperty('--shes-tc', f.slot.color);
        cd.tint.style.setProperty('--shes-tb', f.slot.border ? (1 / cd.fl.sT).toFixed(1) + 'px' : '0px');
      }
    });
    plan = { flights, usedSlots };
  }

  /* desenha o estado da sequência para um P (só transform/opacity) */
  function render(P) {
    if (P > 0.0005 && mode === 'live') enterScrub();
    else if (P <= 0.0005 && mode === 'scrub') exitScrub();
    if (mode === 'live') {
      // repouso: tudo no lugar do hero
      setT(wrap, ''); setO(wrap, 1); setV(wrap, true);
      setT(reel, ''); setT(aura, ''); setO(veil, 0);
      setT(win, ''); setT(winIn, '');
      setO(richBg, 1); setO(shade, 1);
      if (charged) setO(aura, 1);
      codaWords.forEach((w) => { setO(w, 0); setT(w, ''); });
      cards.forEach((cd) => {
        setT(cd.el, ''); setO(cd.el, 1); setO(cd.tint, 0);
        // o aro volta a obedecer ao hover
        if (cd.rim._o !== undefined) { cd.rim._o = undefined; cd.rim.style.opacity = ''; }
      });
      setO(stH, 0); setV(stOutro, false); setO(stOutro, 0);
      stMedia.concat(stSquares).forEach((e) => setO(e, 0));
      hero.classList.remove('is-calm');
      setVids(true);
      stVidOn = false; syncStVideo();
      return;
    }
    if (!plan) buildPlan();
    const H = geo.H;

    // 1) reunião
    const g = easeIO3(seg(P, T.gather[0], T.gather[1]));
    cols.forEach((cs) => {
      const ct = lerp(cs.entryCT, cs.targetCT, g);
      if (cs._ct !== ct) { cs._ct = ct; cs.anim.currentTime = ct; }
    });
    const wo = seg(P, 0, 0.07);
    setT(wrap, 'translate3d(0,' + (-H * 0.12 * easeIn(wo)).toFixed(1) + 'px,0)');
    setO(wrap, 1 - wo);
    setV(wrap, wo < 1);
    // o clipe da frase só toca enquanto o texto está à vista
    if (titleClip && charged) {
      if (wo >= 1 && !titleClip.paused) titleClip.pause();
      else if (wo < 1 && running && titleClip.paused) { const pr = titleClip.play(); if (pr && pr.catch) pr.catch(() => {}); }
    }
    const dxG = geo.W / 2 - (geo.left0 + geo.totalW / 2);
    setT(reel, 'translate3d(' + (dxG * g).toFixed(1) + 'px,0,0) scale(' + (1 + (GATHER_SCALE - 1) * g).toFixed(4) + ')');
    setT(aura, 'translate3d(' + (dxG * g).toFixed(1) + 'px,0,0)');
    const veilIn = seg(P, 0.03, 0.12);
    const veilOut = seg(P, T.veilOut[0], T.veilOut[1]);
    setO(veil, veilIn * (1 - veilOut));

    // 2) a frase do hero: entra, espera, sobe e sai
    const n = codaWords.length;
    codaWords.forEach((w, i) => {
      const a = seg(P, T.codaIn[0] + i * 0.006, T.codaIn[0] + i * 0.006 + 0.045);
      const b = seg(P, T.codaOut[0] + i * 0.004, T.codaOut[0] + i * 0.004 + 0.035);
      setO(w, easeOut(a) * (1 - b));
      setT(w, 'translate3d(0,' + ((1 - easeOut(a)) * 26 - easeIn(b) * 40).toFixed(1) + 'px,0)');
    });

    // 3) a janela abaixo do menu se abre e o fundo do hero se apaga
    const rl = easeIO(seg(P, T.release[0], T.release[1]));
    setT(win, rl ? 'translate3d(0,' + (-geo.top * rl).toFixed(1) + 'px,0)' : '');
    setT(winIn, rl ? 'translate3d(0,' + (geo.top * rl).toFixed(1) + 'px,0)' : '');
    const bo = seg(P, T.bgOut[0], T.bgOut[1]);
    setO(richBg, 1 - bo);
    setO(shade, 1 - bo);
    if (charged) setO(aura, 1 - bo);
    hero.classList.toggle('is-calm', bo >= 1);
    setVids(P < T.vidsOff);

    // 4) os voos: cada vida vai para a sua vaga e se dissolve nela
    const fo = seg(P, T.fade[0], T.fade[1]);
    const sG = GATHER_SCALE;
    for (let i = 0; i < cards.length; i++) {
      const cd = cards[i];
      const fl = cd.fl;
      if (!fl) {
        // as que ficam recuam e se apagam
        setO(cd.el, 1 - fo);
        setT(cd.el, cd.vis > 0 && fo > 0 && fo < 1 ? 'scale(' + (1 - 0.06 * easeOut(fo)).toFixed(4) + ')' : '');
        continue;
      }
      const t = seg(P, fl.start, fl.start + fl.dur);
      // as quatro escolhidas acendem o aro lima ao partir (a mesma luz do hero)
      if (!fl.slot.sq) setO(cd.rim, Math.sin(Math.PI * seg(P, fl.start - 0.02, fl.start + fl.dur)) * 0.8);
      if (t <= 0) {
        setT(cd.el, '');
        setO(cd.el, 1);
        setO(cd.tint, 0);
        continue;
      }
      const e = easeIO3(t);
      const sl = fl.slot;
      const tx = sl.x + sl.w / 2;
      const ty = sl.y + sl.h / 2 + parOff(sl, P);
      const lx = ((tx - fl.x0) * e) / sG;
      const ly = ((ty - fl.y0) * e) / sG;
      // quem vira quadradinho encolhe cedo (não cobre os vizinhos no caminho)
      const sc = lerp(1, fl.sT, sl.sq ? easeOut(t) : e);
      setT(cd.el, 'translate3d(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px,0) scale(' + sc.toFixed(4) + ')');
      setO(cd.el, 1 - seg(t, 0.8, 1));
      if (sl.sq) setO(cd.tint, seg(t, 0.25, 0.75));
    }

    // 5) o statement: vagas (as que receberam uma vida acendem quando ela
    //    chega; as outras aparecem sozinhas), frase, fechamento
    const vs = H / 1200;
    const restIn = seg(P, T.rest[0], T.rest[1]);
    for (let i = 0; i < slots.length; i++) {
      const sl = slots[i];
      setT(sl.el, 'translate3d(0,' + ((0.5 - pPar(P)) * sl.range * vs).toFixed(1) + 'px,0)');
      let o = restIn;
      if (plan.usedSlots.has(sl)) {
        const f = plan.flights.find((x) => x.slot === sl);
        const fl = f.o.cd.fl;
        o = seg(seg(P, fl.start, fl.start + fl.dur), 0.78, 1);
      }
      setO(sl.el, o);
    }
    const si = easeOut(seg(P, T.stIn[0], T.stIn[1]));
    setO(stH, si);
    setT(stH, si < 1 ? 'translate3d(0,' + ((1 - si) * 36).toFixed(1) + 'px,0)' : '');
    // como no site: cada palavra vai de 0,12 a 1
    const tp = seg(P, T.words[0], T.words[1]);
    for (let i = 0; i < stWords.length; i++) {
      const wp = c01(tp * stWords.length - i);
      setO(stWords[i], 0.12 + 0.88 * wp);
    }
    const op = seg(P, T.outro[0], T.outro[1]);
    setO(stOutro, op);
    setT(stOutro, 'translateY(' + ((1 - op) * 24).toFixed(1) + 'px)');
    setV(stOutro, op > 0);

    stVidOn = P > T.rest[0];
    syncStVideo();
  }

  const state = { P: 0 };
  let seqST = null;
  if (hasST) {
    // suaviza como o statement do site: o estado persegue a rolagem
    // (o laço só existe enquanto há distância a percorrer)
    let raf = 0;
    const loop = () => {
      const target = seqST ? seqST.progress : 0;
      state.P += (target - state.P) * 0.16;
      if (Math.abs(target - state.P) < 0.0003) state.P = target;
      render(state.P);
      raf = state.P === target ? 0 : requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    seqST = ScrollTrigger.create({
      trigger: seq,
      start: 'top top',
      end: () => '+=' + Math.round(geo.H * PIN),
      pin: true,
      invalidateOnRefresh: true,
      onUpdate: kick
    });
    ScrollTrigger.addEventListener('refresh', () => { plan = null; kick(); });
  }

  /* ---------- redimensionamento ---------- */

  const relayout = () => {
    layout();
    plan = null;
    if (hasST) ScrollTrigger.refresh();
    render(state.P);
  };
  // a entrada começa com a fonte pronta (no máximo 0,7 s de espera);
  // se ela chegar mais tarde, as colunas se remedem
  fontsReady.then(() => {
    relayout();
    if (seqST && seqST.progress > 0.02) quietStart();
    else entrance();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(relayout, 150);
  });

  /* ---------- diagnóstico ---------- */

  window.__shesE = {
    cols,
    cards,
    get P() { return state.P; },
    get plan() { return plan; },
    get mode() { return mode; },
    get playing() { return playing.length; },
    get maxPlaying() { return maxPlaying; },
    get running() { return running; },
    get armed() { return armed; },
    get geo() { return geo; }
  };
})();
