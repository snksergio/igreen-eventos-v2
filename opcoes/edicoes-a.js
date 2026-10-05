/* ============================================================
   Opção A — Câmera no mosaico
   Uma parede de momentos do tour (colunas desencontradas, cada
   ladrilho com sua pílula de legenda) filmada por uma câmera única:
   translate + scale num só elemento, origem 0 0. A geometria vem dos
   offsets (nunca de getBoundingClientRect depois de transformado).
   O zoom é interpolado em escala logarítmica (como expoScale), então a
   velocidade percebida fica constante do panorama ao detalhe.

   Tempo híbrido: a cena (câmera, ladrilhos, luz) é arrastada pela
   rolagem; o texto TOCA em limiares — entra inteiro quando um capítulo
   começa e volta quando se rola para trás. Texto meio revelado no meio
   da rolagem não existe.

   Três atos, dois ScrollTriggers:
   · chegada  — enquanto a seção sobe ("top bottom" → "top top"): a
                parede sai do escuro e assenta (1.08 → 1); o título
                entra linha a linha por máscara quando aparece;
   · história — palco fixo ("top top" → "bottom bottom", scrub 1): a
                câmera mergulha em cada edição, a pílula cresce junto e
                a legenda se completa, segura para leitura, recua e
                viaja na diagonal até a próxima; no fim os ladrilhos
                viram ilhas e as três edições formam a fila;
   · saída    — o palco recua como um cartão (escala, raio, sombra)
                enquanto a próxima seção sobe por cima.

   Movimento reduzido (ou sem JS): o layout estático do CSS fica.
   ============================================================ */

(() => {
  const section = document.querySelector('.oa');
  if (!section || typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const $ = (s, r = section) => r.querySelector(s);
  const $$ = (s, r = section) => Array.from(r.querySelectorAll(s));

  const stage = $('.oa-stage');
  const wall = $('.oa-wall');
  const depth = $('.oa-depth');
  const focus = $('.oa-focus');
  const veil = $('.oa-veil');
  const fade = $('.oa-fade');
  const dimIn = $('.oa-dim-in');
  const dimOut = $('.oa-dim-out');
  const rim = $('.oa-rim');
  const kicker = $('.oa-head .kicker');
  const h2 = $('.oa-head h2');
  const sub = $('.oa-head .oa-sub');
  const hud = $('.oa-hud');
  const hudRoll = $('.oa-hud-roll');
  const hudFill = $('.oa-hud-fill');
  const phrase = $('.oa-phrase');
  const slots = $$('.oa-slot');
  const slotLi = $$('.oa-slot .oa-li');
  const slotDeco = $$('.oa-slot-edge, .oa-slot-glow');
  const cta = $('.oa-cta');
  const ctaLink = $('.oa-cta a');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const phoneMQ = window.matchMedia('(max-width: 810px)');
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  const A = '../assets/';
  const ARROW = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const NAV = 88;

  /* ---------- content ---------- */

  const EDS = [
    {
      short: 'Recife, 2024',
      cap: 'Recife, 2024 — A primeira caravana',
      desc: 'Onde o tour nasceu — uma van, seis palestrantes e um litoral de histórias que se transformou em um movimento.',
      date: 'Março de 2024',
      img: 'img/past/moment-01.jpg', pos: '50% 50%', posM: '18% 50%'
    },
    {
      short: 'Curitiba, 2024',
      cap: 'Curitiba, 2024 — As turmas práticas',
      desc: 'A edição mão na massa: casos reais no telão, turmas menores e o método que hoje conduz o tour inteiro pelo país.',
      date: 'Setembro de 2024',
      img: 'img/past/moment-11.jpg', pos: '50% 46%', posM: '62% 50%'
    },
    {
      short: 'São Paulo, 2025',
      cap: 'São Paulo, 2025 — A edição arena',
      desc: 'Doze mil pessoas sob o mesmo teto — nosso maior palco, o público mais vibrante e um encerramento que bateu recordes.',
      date: 'Agosto de 2025',
      img: 'img/past/moment-17.jpg', pos: '50% 50%', posM: '58% 50%',
      video: 'video/past/arena-audience.mp4'
    }
  ];

  // every other tile of the wall: a real moment with a short real caption
  const M = (n, cap, pos) => ({ src: `img/past/moment-${String(n).padStart(2, '0')}.jpg`, cap, pos });
  const V = (name, cap, pos) => ({ src: `video/past/${name}.jpg`, video: `video/past/${name}.mp4`, cap, pos });
  const C = (name, cap) => ({ src: `video/cards/${name}.jpg`, cap, pos: '50% 28%', posM: '50% 40%' });
  const I = (file, cap) => ({ src: `img/${file}`, cap });

  const POOL = [
    M(19, 'Plateia em festa'), C('sel-musgo1', 'Depoimento'), M(5, 'Arena lotada'), V('crowd-hands', 'Mãos para o alto'),
    M(8, 'Palco principal'), M(13, 'Reencontros'), C('gen-executiva2', 'Bastidores'), M(22, 'Entrada triunfal'),
    M(3, 'Tecnologia na feira'), V('expo-crowd', 'Corredores cheios'), M(9, 'Expert 4.0'), C('sel-jardim', 'Depoimento'),
    M(20, 'Persistência'), M(15, 'Liderança no palco'), I('past-02.jpg', 'Turma prática'), M(6, 'Palestra principal'),
    C('gen-kart', 'Kart iGreen'), M(18, 'Luzes verdes'), V('car-reveal', 'Revelação do prêmio'), M(2, 'Show de abertura'),
    M(23, 'Plateia atenta'), C('sel-estudio', 'Estúdio iGreen'), M(10, 'Bate-papo no palco'), M(4, 'Espaço iGreen'),
    I('past-01.jpg', 'Palco de São Paulo'), V('arena-persistencia', 'Telão da arena'), M(14, 'Histórias reais'), C('gen-podcast', 'Podcast ao vivo'),
    M(21, 'Casa cheia'), M(12, 'Networking'), C('sel-suv', 'Conquista'), M(7, 'Pergunta da plateia'),
    V('stage-speaker', 'Palestra ao vivo'), M(16, 'Premiação'), C('gen-walk', 'Rotina de licenciada'), I('past-03.jpg', 'Turma no palco'),
    C('sel-musgo2', 'Depoimento'), C('gen-reuniao', 'Reunião de time'), C('sel-escritorio', 'Escritório próprio'), C('gen-executiva1', 'Bastidores'),
    C('sel-carro', 'Conquista'), C('sel-musgo3', 'Depoimento')
  ];

  // wall per breakpoint: columns × tiles per column, tile aspect, and the
  // three edition tiles placed far apart so every pan is a clear diagonal
  const LAYOUTS = {
    desk: { cols: 8, rows: 7, ar: 1.6, ed: [[2, 1], [5, 3], [2, 5]], visCols: 5.3, featH: 0.78, featW: 0.86, botR: 76, radius: 22, gapK: 0.1, slotR: 14 },
    mob:  { cols: 5, rows: 7, ar: 0.6, ed: [[1, 1], [3, 3], [1, 5]], visCols: 3.6, featH: 0.7, featW: 1, botR: 64, radius: 18, gapK: 0.12, slotR: 10 }
  };

  /* ---------- timeline map (units; 1 unit = 5vh of pinned scroll) ----------
     per chapter ≈ 16% move in · 68% hold · 16% move out; the last chapter
     flows into the finale, which holds longest */
  const T = {
    introEnd: 3.5,
    zoomIn: 3.5, zoomInDur: 7.5,
    arrive: [11, 31, 51],           // camera lands on edition i
    hold: 13.5,                     // arrive → start of the next move
    travelDur: 6.5,
    outStart: 64.5, outDur: 7.5,    // back to the overview
    islands: 71, glide: 72, pull: 76,
    recede: 92, end: 112
  };
  // text thresholds (units of the story timeline)
  const TX = {
    headGone: 3,
    chOn: (i) => T.arrive[i] - 0.5,
    chOff: (i) => T.arrive[i] + T.hold - 1.1,
    hudOn: T.arrive[0] - 1.2, hudOff: T.outStart,
    finOn: 77.6, finOff: 76.8,
    rowOn: 81.6, rowOff: 80.8
  };
  const ZIN = Math.log(1.08);       // arrival: the wall settles from 1.08 → 1
  const ISLAND = 0.26;              // finale: tiles shrink to this size in place

  /* ---------- small helpers ---------- */

  const clamp01 = gsap.utils.clamp(0, 1);

  // split an element on its <br>s into masked lines (clip > outer > inner)
  const maskLines = (el) => {
    const orig = el.innerHTML;
    el.innerHTML = orig.split(/<br\s*\/?>/i)
      .map(p => `<span class="oa-mask"><span class="oa-lo"><span class="oa-li">${p.trim()}</span></span></span>`)
      .join('');
    return () => { el.innerHTML = orig; };
  };
  // wrap a whole element (the kicker pill) in a mask
  const maskEl = (el) => {
    const m = document.createElement('span');
    m.className = 'oa-mask';
    m.innerHTML = '<span class="oa-lo"><span class="oa-li"></span></span>';
    el.parentNode.insertBefore(m, el);
    m.querySelector('.oa-li').appendChild(el);
    return () => { m.parentNode.insertBefore(el, m); m.remove(); };
  };
  // split a paragraph into its rendered lines, each in a mask
  const splitLines = (p) => {
    const words = p.textContent.trim().split(/\s+/);
    p.innerHTML = words.map(w => `<span>${w}</span>`).join(' ');
    const lines = [];
    let top = null;
    Array.from(p.children).forEach(s => {
      const t = s.offsetTop;
      if (top === null || Math.abs(t - top) > 3) { lines.push([]); top = t; }
      lines[lines.length - 1].push(s.textContent);
    });
    p.innerHTML = lines.map(l => `<span class="oa-mask"><span class="oa-li">${l.join(' ')}</span></span>`).join('');
  };

  const pill = (text, isEd) =>
    `<div class="oa-cap${isEd ? ' oa-cap--ed' : ''}"><span class="oa-cap-type"><span class="oa-cap-text">${text}</span>${isEd ? '<span class="oa-caret"></span>' : ''}</span><span class="oa-cap-btn">${ARROW}</span></div>`;

  /* ---------- state ---------- */

  let ctx = null;
  let restorers = [];
  let io = null;
  let textTargets = [];

  /* ============================================================
     build + choreograph
     ============================================================ */

  function init() {
    if (reduced.matches) return;
    section.classList.add('is-live');

    const phone = phoneMQ.matches;
    const L = phone ? LAYOUTS.mob : LAYOUTS.desk;
    const W = stage.clientWidth;
    const H = stage.clientHeight;

    /* --- tile size = the featured frame, so a featured tile sits at scale 1 --- */
    let th = Math.min(H * L.featH, H - NAV - L.botR);
    let tw = th * L.ar;
    const maxW = phone ? W - 32 : W * L.featW;
    if (tw > maxW) { tw = maxW; th = tw / L.ar; }
    tw = Math.round(tw);
    th = Math.round(th);
    let gap = Math.round(tw * L.gapK);
    if ((th + gap) % 2) gap += 1; // half-pitch stays on whole pixels (crisp text)

    stage.style.setProperty('--tw', tw + 'px');
    stage.style.setProperty('--th', th + 'px');
    stage.style.setProperty('--gap', gap + 'px');
    stage.style.setProperty('--r', L.radius + 'px');
    stage.style.setProperty('--ar', String(L.ar));

    /* --- the wall: staggered columns, picks that never repeat a neighbour --- */
    const colEls = [];
    for (let c = 0; c < L.cols; c++) {
      const col = document.createElement('div');
      col.className = 'oa-col';
      colEls.push(col);
    }
    const grid = [];
    const videosUsed = new Set();
    const edTiles = [];
    const others = [];
    let cursor = 0;

    for (let r = 0; r < L.rows; r++) {
      grid[r] = [];
      for (let c = 0; c < L.cols; c++) {
        const ei = L.ed.findIndex(([ec, er]) => ec === c && er === r);
        const fig = document.createElement('figure');
        fig.className = 'oa-tile';
        if (ei >= 0) {
          const e = EDS[ei];
          fig.classList.add('oa-tile--ed');
          fig.dataset.ed = ei;
          const pos = phone ? e.posM : e.pos;
          fig.innerHTML =
            `<div class="oa-media"><img src="${A + e.img}" alt="" decoding="async" style="object-position:${pos}">` +
            (e.video ? `<video muted loop playsinline preload="none" style="object-position:${pos}"><source src="${A + e.video}" type="video/mp4"></video>` : '') +
            `</div><span class="oa-shade"></span><span class="oa-glow"></span><span class="oa-dots"></span><span class="oa-edge"></span>` +
            `<div class="oa-desc"><span class="oa-mask"><span class="oa-li oa-desc-date">${e.date}</span></span><p class="oa-desc-p">${e.desc}</p></div>` +
            pill(e.short, true);
          edTiles[ei] = fig;
          grid[r][c] = -1;
        } else {
          const near = [grid[r][c - 1], grid[r - 1] && grid[r - 1][c], grid[r - 1] && grid[r - 1][c - 1], grid[r - 1] && grid[r - 1][c + 1]];
          let k = cursor;
          while (near.includes(k % POOL.length)) k++;
          cursor = k + 1;
          const idx = k % POOL.length;
          grid[r][c] = idx;
          const it = POOL[idx];
          const pos = (phone && it.posM) || it.pos || '50% 50%';
          let media;
          if (it.video && !videosUsed.has(it.video)) {
            videosUsed.add(it.video);
            media = `<video muted loop playsinline preload="none" poster="${A + it.src}" style="object-position:${pos}"><source src="${A + it.video}" type="video/mp4"></video>`;
          } else {
            media = `<img alt="" decoding="async" data-src="${A + it.src}" style="object-position:${pos}">`;
          }
          fig.innerHTML = media + pill(it.cap, false);
          others.push(fig);
        }
        colEls[c].appendChild(fig);
      }
    }
    colEls.forEach(col => wall.appendChild(col));
    wall.querySelectorAll('video').forEach(v => { v.muted = true; });

    /* --- geometry (layout offsets only) --- */
    const pitchX = tw + gap;
    const pitchY = th + gap;
    const half = pitchY / 2;
    const wallW = L.cols * tw + (L.cols - 1) * gap;
    const yMin = half;                          // band fully covered by every column
    const yMax = L.rows * pitchY - gap;
    const c0 = { x: wallW / 2, y: (yMin + yMax) / 2 };
    const fy = NAV + (H - NAV - L.botR) / 2;    // featured frame centre on screen
    const zFocus = Math.log(0.55);              // the focus frame fades out as the camera pulls back to this scale

    const E = edTiles.map(t => {
      const cx = t.offsetLeft + t.offsetWidth / 2;
      const cy = t.offsetTop + t.offsetHeight / 2;
      return { x: cx, y: cy - (fy - H / 2), cx, cy, l: t.offsetLeft, t: t.offsetTop }; // camera target puts it at fy
    });

    let s0 = W / (L.visCols * pitchX);
    s0 = Math.max(s0, W / (wallW - pitchX * 0.7), H / (yMax - yMin - pitchY * 0.5));
    const sFin = Math.max(s0 * 0.86, W / wallW, H / (yMax - yMin));
    const z0 = Math.log(s0);
    const zF = 0;                               // featured: scale 1
    const zFin = Math.log(sFin);
    const zT = [0, 1].map(i => {                // travel dip, never exposing the wall's edge
      const mx = (E[i].x + E[i + 1].x) / 2;
      const my = (E[i].y + E[i + 1].y) / 2;
      const needX = W / (2 * Math.max(1, Math.min(mx, wallW - mx)));
      const needY = H / (2 * Math.max(1, Math.min(my - yMin, yMax - my)));
      return Math.log(Math.min(0.5, Math.max(s0 * 1.35, needX * 1.04, needY * 1.04)));
    });

    /* --- images: what the overview shows loads first, the rest lazily --- */
    const viewHalfW = W / (2 * s0) + pitchX;
    const viewHalfH = H / (2 * s0) + pitchY;
    wall.querySelectorAll('img[data-src]').forEach(img => {
      const t = img.parentNode;
      const inView = Math.abs(t.offsetLeft + tw / 2 - c0.x) < viewHalfW && Math.abs(t.offsetTop + th / 2 - c0.y) < viewHalfH;
      img.loading = inView ? 'eager' : 'lazy';
      img.src = img.dataset.src;
    });

    /* --- distance of each tile from the centre (island stagger) --- */
    const maxD = Math.hypot(wallW / 2, (yMax - yMin) / 2);
    others.forEach(t => {
      t._oaD = Math.hypot(t.offsetLeft + tw / 2 - c0.x, t.offsetTop + th / 2 - c0.y) / maxD;
    });

    /* --- masked lines for headings, description lines per tile --- */
    restorers = [maskEl(kicker), maskLines(h2), maskLines(sub), maskLines(phrase)];
    const scrim = document.createElement('span');
    scrim.className = 'oa-phrase-scrim';
    scrim.setAttribute('aria-hidden', 'true');
    phrase.prepend(scrim);
    restorers.push(() => scrim.remove());
    edTiles.forEach(t => splitLines(t.querySelector('.oa-desc-p')));

    /* --- finale slots (screen space, measured from layout) --- */
    const slotRects = slots.map(s => {
      const b = s.querySelector('.oa-slot-box');
      return { x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight };
    });
    const Xfin = W / 2 - sFin * c0.x;
    const Yfin = H / 2 - sFin * c0.y;
    const glide = E.map((e, i) => {
      const s = slotRects[i];
      const k = s.w / (sFin * tw);
      return {
        x: (s.x + s.w / 2 - Xfin) / sFin - e.cx,
        y: (s.y + s.h / 2 - Yfin) / sFin - e.cy,
        scale: k,
        radius: L.slotR / (sFin * k)
      };
    });

    /* --- islands keep a soft clearing around the conclusion (no text on
           imagery): each island's final opacity falls off near the content --- */
    const box = [phrase, $('.oa-row'), cta].reduce((b, el) => ({
      l: Math.min(b.l, el.offsetLeft), t: Math.min(b.t, el.offsetTop),
      r: Math.max(b.r, el.offsetLeft + el.offsetWidth), b: Math.max(b.b, el.offsetTop + el.offsetHeight)
    }), { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity });
    others.forEach(t => {
      const sx = Xfin + sFin * (t.offsetLeft + tw / 2);
      const sy = Yfin + sFin * (t.offsetTop + th / 2);
      const hw = sFin * ISLAND * tw / 2 + 24;
      const hh = sFin * ISLAND * th / 2 + 16;
      const dx = Math.max(box.l - (sx + hw), 0, (sx - hw) - box.r);
      const dy = Math.max(box.t - (sy + hh), 0, (sy - hh) - box.b);
      t._oaO = +(0.9 * clamp01(Math.hypot(dx, dy) / 90)).toFixed(3);
    });

    /* --- the camera --- */
    const cam = { cx: c0.x, cy: c0.y, z: z0 };
    const ent = { k: 0 };
    const light = { k: 1 };   // depth strength (eases off once the wall turns to islands)
    const apply = () => {
      const e = 1 - ent.k;
      const s = Math.exp(cam.z + e * ZIN);
      let x = W / 2 - s * cam.cx;
      let y = H / 2 - s * cam.cy + e * H * 0.1;
      // at rest on a featured tile, snap to whole pixels so the type is crisp
      const snap = Math.abs(s - 1) < 0.002;
      x = snap ? Math.round(x) : +x.toFixed(2);
      y = snap ? Math.round(y) : +y.toFixed(2);
      wall.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${snap ? 1 : s.toFixed(5)})`;
      // depth: surroundings darken as the camera pulls away from a subject
      depth.style.opacity = (0.55 * light.k * clamp01((zF - cam.z) / (zF - z0))).toFixed(3);
      // focus: neighbours of a featured tile sink to a whisper
      // (the frame rides on the nearest edition tile, through the same camera)
      const f = clamp01((cam.z - zFocus) / (zF - zFocus));
      focus.style.opacity = (f * f * ent.k).toFixed(3);
      if (f > 0) {
        let n = E[0];
        E.forEach(e => { if (Math.hypot(e.x - cam.cx, e.y - cam.cy) < Math.hypot(n.x - cam.cx, n.y - cam.cy)) n = e; });
        const fx = x + s * n.l;
        const fyy = y + s * n.t;
        focus.style.transform = snap
          ? `translate3d(${Math.round(fx)}px, ${Math.round(fyy)}px, 0)`
          : `translate3d(${fx.toFixed(2)}px, ${fyy.toFixed(2)}px, 0) scale(${s.toFixed(5)})`;
      }
    };

    /* --- text, played on thresholds --- */
    const capEls = edTiles.map(t => t.querySelector('.oa-cap-text'));
    const typed = EDS.map(e => e.short.length);
    const typers = EDS.map(e => ({ n: e.short.length }));
    const setCap = (i, n) => {
      const k = Math.round(n);
      if (k === typed[i]) return;
      typed[i] = k;
      capEls[i].textContent = EDS[i].cap.slice(0, k);
    };
    const headLi = $$('.oa-head .oa-li');
    const headLo = $$('.oa-head .oa-lo');
    const phraseLi = $$('.oa-li', phrase);
    const descLi = edTiles.map(t => $$('.oa-desc .oa-li', t));
    const shades = edTiles.map(t => t.querySelector('.oa-shade'));
    const medias = edTiles.map(t => t.querySelector('.oa-media'));
    textTargets = [hud, hudRoll, cta, scrim, ...slotLi, ...slotDeco, ...headLi, ...headLo, ...phraseLi, ...typers];

    const S = { head: null, ch: [null, null, null], hud: null, num: -1, fin: null };
    const to = (t, v) => gsap.to(t, Object.assign({ overwrite: true }, v));

    const setHead = (state) => {
      const prev = S.head;
      if (prev === state) return;
      S.head = state;
      const jump = prev === null || (prev === 'below' && state === 'gone') || (prev === 'gone' && state === 'below');
      if (state === 'below') {
        to(headLo, { yPercent: 0, duration: 0 });
        to(headLi, { yPercent: 115, duration: jump ? 0 : 0.45, ease: 'power3.in', stagger: jump ? 0 : 0.04 });
      } else if (state === 'shown') {
        to(headLi, { yPercent: 0, duration: jump ? 0 : 1.05, ease: 'expo.out', stagger: jump ? 0 : 0.1 });
        to(headLo, { yPercent: 0, duration: jump ? 0 : 0.9, ease: 'expo.out', stagger: jump ? 0 : 0.07 });
      } else {
        to(headLi, { yPercent: 0, duration: 0 });
        to(headLo, { yPercent: -115, duration: jump ? 0 : 0.55, ease: 'power3.in', stagger: jump ? 0 : 0.05 });
      }
    };

    const typeTo = (i, n, dur) => to(typers[i], {
      n, duration: dur, ease: 'none', onUpdate: () => setCap(i, typers[i].n)
    });
    const setCh = (i, state) => {
      const prev = S.ch[i];
      if (prev === state) return;
      S.ch[i] = state;
      const jump = prev === null || (prev !== 'on' && state !== 'on');
      const full = EDS[i].cap.length;
      if (state === 'on') {
        // the caption completes, then date + description rise into place
        const left = (full - typers[i].n) / (full - EDS[i].short.length);
        typeTo(i, full, 0.9 * clamp01(left));
        to(shades[i], { opacity: 1, duration: 0.7, ease: 'power2.out' });
        to(descLi[i], { yPercent: 0, duration: 0.7, ease: 'expo.out', stagger: 0.1, delay: 0.3 });
      } else if (state === 'after') {
        if (jump) { typeTo(i, full, 0); }
        to(descLi[i], { yPercent: -115, duration: jump ? 0 : 0.45, ease: 'power3.in', stagger: jump ? 0 : 0.05 });
        to(shades[i], { opacity: 0, duration: jump ? 0 : 0.6, ease: 'power2.inOut', delay: jump ? 0 : 0.15 });
      } else {
        typeTo(i, EDS[i].short.length, jump ? 0 : 0.45);
        to(descLi[i], { yPercent: 115, duration: jump ? 0 : 0.4, ease: 'power3.in', stagger: jump ? 0 : 0.04 });
        to(shades[i], { opacity: 0, duration: jump ? 0 : 0.5, ease: 'power2.inOut' });
      }
    };

    const setHud = (on) => {
      if (S.hud === on) return;
      const jump = S.hud === null;
      S.hud = on;
      to(hud, { autoAlpha: on ? 1 : 0, y: on ? 0 : 10, duration: jump ? 0 : (on ? 0.7 : 0.4), ease: on ? 'expo.out' : 'power2.in' });
    };
    const setNum = (n) => {
      if (S.num === n) return;
      const jump = S.num < 0;
      S.num = n;
      to(hudRoll, { yPercent: (-100 / 3) * n, duration: jump ? 0 : 0.8, ease: 'expo.out' });
    };

    // conclusion in two beats: the phrase rises as the camera steps back;
    // labels, card edges and the CTA arrive once the row has settled
    const setPhrase = (on) => {
      if (S.fin === on) return;
      const jump = S.fin === null;
      S.fin = on;
      const d = jump ? 0 : 1;
      if (on) {
        to(scrim, { opacity: 1, duration: 1 * d, ease: 'power2.out' });
        to(phraseLi, { yPercent: 0, duration: 1.1 * d, ease: 'expo.out', stagger: 0.12 * d });
      } else {
        to(phraseLi, { yPercent: 115, duration: 0.45 * d, ease: 'power3.in', stagger: 0.05 * d });
        to(scrim, { opacity: 0, duration: 0.5 * d });
      }
    };
    const setRow = (on) => {
      if (S.row === on) return;
      const jump = S.row === undefined;
      S.row = on;
      const d = jump ? 0 : 1;
      cta.style.pointerEvents = on ? 'auto' : 'none';
      if (on) {
        to(slotDeco, { opacity: 1, duration: 1.1 * d, ease: 'power2.out' });
        to(slotLi, { yPercent: 0, duration: 0.9 * d, ease: 'expo.out', stagger: 0.06 * d, delay: 0.1 * d });
        to(cta, { opacity: 1, y: 0, duration: 1 * d, ease: 'expo.out', delay: 0.35 * d });
      } else {
        to(cta, { opacity: 0, y: 26, duration: 0.35 * d, ease: 'power2.in' });
        to(slotLi, { yPercent: 115, duration: 0.4 * d, ease: 'power3.in', stagger: 0.02 * d });
        to(slotDeco, { opacity: 0, duration: 0.3 * d });
      }
    };

    let tl;
    let tlIn;
    const sync = () => {
      if (!tl || !tlIn) return;
      const u = tl.time();
      const pin = tlIn.progress();
      // heading: arrives when it scrolls into view, leaves as the dive begins
      if (u > TX.headGone) setHead('gone');
      else if (pin >= 0.6 || u > 0.001) setHead('shown');
      else if (pin < 0.48) setHead('below');
      // chapters
      EDS.forEach((e, i) => setCh(i, u < TX.chOn(i) ? 'before' : u > TX.chOff(i) ? 'after' : 'on'));
      // chapter indicator
      setHud(u >= TX.hudOn && u < TX.hudOff);
      setNum(u < T.arrive[1] - T.travelDur / 2 ? 0 : u < T.arrive[2] - T.travelDur / 2 ? 1 : 2);
      // conclusion (with a little hysteresis at each threshold)
      if (u >= TX.finOn) setPhrase(true);
      else if (u < TX.finOff || S.fin === null) setPhrase(false);
      if (u >= TX.rowOn) setRow(true);
      else if (u < TX.rowOff || S.row === undefined) setRow(false);
      // the arena clip only comes alive while its edition is on screen
      edTiles[2].classList.toggle('is-alive', u > T.arrive[2] - 3 && u < T.outStart + 2);
    };
    const onFrame = () => { apply(); sync(); };

    ctx = gsap.context(() => {
      // resting states before anything has rendered
      gsap.set([...headLi, ...phraseLi, ...slotLi, ...descLi.flat()], { yPercent: 115 });
      gsap.set(slotDeco, { opacity: 0 });
      gsap.set(medias, { scale: 1.14 });
      gsap.set(dimIn, { opacity: 0.9 });
      gsap.set(cta, { opacity: 0, y: 26 });
      apply();

      /* ===== act 1 — arrival (before the pin): the scene settles ===== */
      tlIn = gsap.timeline({ paused: true, defaults: { immediateRender: false }, onUpdate: onFrame });
      tlIn
        .fromTo(ent, { k: 0 }, { k: 1, duration: 10, ease: 'power2.out' }, 0)
        .fromTo(dimIn, { opacity: 0.9 }, { opacity: 0, duration: 8.5, ease: 'power1.out' }, 0);

      const stIn = ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'top top',
        scrub: 0.8,
        animation: tlIn
      });

      /* ===== act 2 — the story (pinned, scrubbed scene) ===== */
      tl = gsap.timeline({ paused: true, defaults: { immediateRender: false }, onUpdate: onFrame });

      // a breath on the composed overview
      tl.fromTo(cam, { cx: c0.x, cy: c0.y, z: z0 }, { cx: c0.x, cy: c0.y, z: z0 + 0.03, duration: T.introEnd, ease: 'none' }, 0)
        .fromTo(veil, { opacity: 1 }, { opacity: 0, duration: 5.5, ease: 'power2.inOut' }, 4)
        .fromTo(fade, { opacity: 1 }, { opacity: 0, duration: 5.5, ease: 'power2.inOut' }, 4)
        // dive into edition 01 (log-space zoom = even perceived speed)
        .fromTo(cam, { cx: c0.x, cy: c0.y }, { cx: E[0].x, cy: E[0].y, duration: T.zoomInDur, ease: 'power3.inOut' }, T.zoomIn)
        .fromTo(cam, { z: z0 + 0.03 }, { z: zF, duration: T.zoomInDur, ease: 'power3.inOut' }, T.zoomIn);

      EDS.forEach((e, i) => {
        const a = T.arrive[i];
        // the still counter-scales as the camera commits to it, then breathes
        tl.fromTo(medias[i], { scale: 1.14 }, { scale: 1, duration: 19, ease: 'power2.out' }, a - 6)
          // reading progress (a progress line is honest when scrubbed)
          .fromTo(hudFill, { scaleX: i / 3 }, { scaleX: (i + 1) / 3, duration: T.hold - 1, ease: 'none' }, a);

        if (i < 2) {
          // travel: zoom out, glide on the diagonal, zoom into the next edition
          const t0 = a + T.hold;
          const d = T.travelDur;
          tl.fromTo(cam, { cx: E[i].x, cy: E[i].y }, { cx: E[i + 1].x, cy: E[i + 1].y, duration: d, ease: 'power3.inOut' }, t0)
            .fromTo(cam, { z: zF }, { z: zT[i], duration: d / 2, ease: 'power2.inOut' }, t0)
            .fromTo(cam, { z: zT[i] }, { z: zF, duration: d / 2, ease: 'power2.inOut' }, t0 + d / 2);
        }
      });

      // back to the overview — the whole road at once
      tl.fromTo(cam, { cx: E[2].x, cy: E[2].y }, { cx: c0.x, cy: c0.y, duration: T.outDur, ease: 'power3.inOut' }, T.outStart)
        .fromTo(cam, { z: zF }, { z: z0, duration: T.outDur, ease: 'power3.inOut' }, T.outStart)
        .fromTo(fade, { opacity: 0 }, { opacity: 1, duration: 5, ease: 'power2.inOut' }, T.outStart + 2.5)
        .fromTo(wall, { '--pill-o': 1 }, { '--pill-o': 0, duration: 3, ease: 'power2.inOut' }, T.islands - 1.5)
        // the wall opens into islands (gaps grow, tiles shrink in place)
        .fromTo(light, { k: 1 }, { k: 0.3, duration: 5, ease: 'power2.inOut' }, T.islands)
        .fromTo(others, { scale: 1, opacity: 1 }, {
          scale: ISLAND, opacity: (idx, el) => el._oaO, duration: 4.5, ease: 'power3.inOut', force3D: false,
          stagger: (idx, el) => el._oaD * 2.2
        }, T.islands)
        // …while the three editions glide into one row
        .fromTo(edTiles, { x: 0, y: 0, scale: 1, borderRadius: L.radius }, {
          x: (i) => glide[i].x, y: (i) => glide[i].y, scale: (i) => glide[i].scale,
          borderRadius: (i) => glide[i].radius,
          duration: 7.5, ease: 'power3.inOut', force3D: false, stagger: 0.3
        }, T.glide)
        // the camera takes a small step back
        .fromTo(cam, { z: z0 }, { z: zFin, duration: 6, ease: 'power2.inOut' }, T.pull);

      /* ===== act 3 — hand-off: the stage recedes like a card ===== */
      tl.fromTo(stage, { scale: 1, y: 0, borderRadius: 0 }, {
        scale: 0.94, y: H * 0.035, borderRadius: 28, duration: T.end - T.recede, ease: 'power2.out'
      }, T.recede)
        .fromTo(rim, { opacity: 0 }, { opacity: 1, duration: 6, ease: 'power2.out' }, T.recede)
        .fromTo(dimOut, { opacity: 0 }, { opacity: 0.5, duration: T.end - T.recede, ease: 'power1.in' }, T.recede);

      const st = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        animation: tl
      });

      sync();

      // keyboard: focusing the CTA brings the finale on screen
      const onFocus = () => {
        const target = st.start + (st.end - st.start) * 84 / T.end;
        if (st.progress < TX.finOn / T.end) {
          window.scrollTo(0, target);
          ScrollTrigger.update();
          const sc = st.getTween && st.getTween();
          if (sc) sc.progress(1);
        }
      };
      ctaLink.addEventListener('focus', onFocus);

      const settle = () => {
        ScrollTrigger.update();
        [st, stIn].forEach(t => { const sc = t.getTween && t.getTween(); if (sc) sc.progress(1); });
      };
      window.__oa = {
        tl, tlIn, st, stIn, units: T,
        geo: { W, H, tw, th, gap, s0, sFin, zT: zT.map(Math.exp), E },
        // jump to a progress (0..1) of the pinned story and settle the scrub
        jump(p) { window.scrollTo(0, st.start + (st.end - st.start) * p); settle(); return tl.time(); },
        // jump to a progress (0..1) of the arrival
        arrive(p) { window.scrollTo(0, stIn.start + (stIn.end - stIn.start) * p); settle(); return tlIn.progress(); }
      };

      return () => ctaLink.removeEventListener('focus', onFocus);
    }, section);

    /* --- clips play only while the stage is on screen --- */
    const vids = Array.from(wall.querySelectorAll('video'));
    vids.forEach(v => {
      v.addEventListener('playing', () => v.classList.add('is-playing'), { once: true });
    });
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(entries => entries.forEach(en => {
        if (en.isIntersecting) {
          wall.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
          vids.forEach(v => { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); });
        } else {
          vids.forEach(v => v.pause());
        }
      }), { rootMargin: '25% 0px' });
      io.observe(section);
    }

    section.classList.remove('is-pending');
  }

  function teardown() {
    if (io) { io.disconnect(); io = null; }
    if (ctx) { ctx.revert(); ctx = null; }
    // text tweens are played outside the scrubbed timelines: stop and clear them
    gsap.killTweensOf(textTargets);
    gsap.set([hud, hudRoll, cta, ...slotLi, ...slotDeco], { clearProps: 'all' });
    textTargets = [];
    wall.querySelectorAll('video').forEach(v => { v.pause(); v.removeAttribute('src'); });
    wall.innerHTML = '';
    wall.removeAttribute('style');
    depth.removeAttribute('style');
    focus.removeAttribute('style');
    restorers.reverse().forEach(fn => fn());
    restorers = [];
    ['--tw', '--th', '--gap', '--r', '--ar'].forEach(p => stage.style.removeProperty(p));
    section.classList.remove('is-live');
  }

  function rebuild() {
    teardown();
    init();
    ScrollTrigger.refresh();
  }

  /* ---------- lifecycle ---------- */

  // claim the live layout right away (no flash of the static cards); the
  // stage stays dark until the wall is built
  if (!reduced.matches) section.classList.add('is-live', 'is-pending');

  const start = () => {
    init();
    ScrollTrigger.refresh();
  };
  // the description lines are measured, so wait for the webfont
  if (document.fonts && document.fonts.status !== 'loaded') {
    let done = false;
    const go = () => { if (!done) { done = true; start(); } };
    document.fonts.ready.then(go);
    setTimeout(go, 1500);
  } else {
    start();
  }

  let lastW = window.innerWidth;
  let lastH = window.innerHeight;
  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // phones: the URL bar changes the height constantly — ignore that
      if (w === lastW && (coarse || Math.abs(h - lastH) < 2)) return;
      lastW = w;
      lastH = h;
      rebuild();
    }, 220);
  });
  const onPref = () => rebuild();
  if (reduced.addEventListener) reduced.addEventListener('change', onPref);
  else if (reduced.addListener) reduced.addListener(onPref);
})();
