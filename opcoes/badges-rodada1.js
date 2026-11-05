/* ============================================================
   Selos das seções — 10 propostas
   Every proposal renders the same four section badges (speakers,
   tour, proof, editions) in its own visual language. A row only
   animates while it is on screen; loops stop when the tab is hidden.
   ============================================================ */

(() => {
  const IMG = '../assets/img/badges/';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) document.documentElement.classList.add('bd-reduced');

  /* ---------- content (same facts as the live site) ---------- */

  const SPEAKERS = [
    ['Thiago Almeida', 'thiago'], ['Amanda Duarte', 'amanda'], ['Rafael Costa', 'rafael'], ['Ana Beltrão', 'ana'],
    ['Bruno Sales', 'bruno'], ['Carla Mendes', 'carla'], ['Juliana Reis', 'juliana'], ['Pedro Rocha', 'pedro']
  ];
  const TOUR = [
    ['Goiânia', '16 ago'], ['São Paulo', '23 ago'], ['Belo Horizonte', '30 ago'],
    ['Curitiba', '6 set'], ['Recife', '13 set'], ['Rio de Janeiro', '20 set']
  ];
  const REVIEWERS = ['marina', 'igor', 'bia', 'rafa', 'camila'];
  const EDITIONS = [['Recife', '2024'], ['Curitiba', '2024'], ['São Paulo', '2025']];
  const QUOTES = ['“Saí com um plano que sigo até hoje”', '“Valeu cada quilômetro da viagem”', '“Minha carteira triplicou”', '“A energia daquela sala é impossível de fingir”'];

  const SUBJECTS = [
    { k: 'spk', h: ['As vozes', 'por trás do palco'] },
    { k: 'tour', h: ['Pelo Brasil —', 'garanta seu lugar'] },
    { k: 'rate', h: ['Direto de', 'quem viveu isso'] },
    { k: 'ed', h: ['Edições que', 'marcaram história'] }
  ];
  const KICKER = {
    spk: '8 palestrantes confirmados',
    tour: '6 cidades entre agosto e setembro',
    rate: 'Nota 4,9 em 3 mil avaliações',
    ed: '3 edições desde 2024'
  };

  /* ---------- Brazil (simplified outline, 0–100 box) + tour cities ---------- */

  const BR_PATH = 'M56.5 2.5L59.5 8.8L60.8 11L64.3 15.5L68 15L74.8 19.8L81 20.8L89.3 22.8L92.5 25.5L97.5 27L98.5 31.5L98 34.5L96.3 37.5L92.8 41L89.3 46L88 50.5L87.5 57.8L84.8 64.3L83 68.3L80.5 70.9L77.5 71L74 71.8L69.8 73.5L65.5 76.8L64 79.5L64.3 82.5L63.5 85L60.5 88.3L57.5 92.3L54.5 94.5L52 97.8L51.8 94.8L46.5 90.8L41.5 89L45 85.5L49 81.5L51 77.5L49 77.3L49.8 73.5L46.3 69.8L41.5 68.8L40.5 63.5L41.5 59L39.5 54.3L35 51.3L34.8 47.3L30.8 45.8L24.5 44.8L22.3 40.5L19 38.3L15.5 40.3L11.5 41L9 37.3L4.5 37.3L3 37L0.7 32L3.2 26.5L10.5 24.3L12 16.3L10.5 12L12.5 11L17.5 10.8L20.5 11.5L25 9.8L25.5 8.5L23.8 3.5L28.5 3.5L33.8 0.5L36 5L36.5 9L40.5 9.8L44.3 8.8L48 7.3L50.5 7.8L53.3 8Z';
  const BR_PTS = BR_PATH.slice(1, -1).split('L').map((s) => s.split(' ').map(Number));
  // tour order: Goiânia, São Paulo, BH, Curitiba, Recife, Rio
  const CITY_XY = [[62.4, 55.2], [68.9, 72.4], [75.7, 63.3], [62.3, 77.1], [96.6, 33.6], [77.6, 70.8]];

  const inBR = (x, y) => {
    let c = false;
    for (let i = 0, j = BR_PTS.length - 1; i < BR_PTS.length; j = i++) {
      const [xi, yi] = BR_PTS[i];
      const [xj, yj] = BR_PTS[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const brDots = (step) => {
    const out = [];
    for (let y = step / 2; y < 100; y += step) {
      for (let x = step / 2; x < 100; x += step) if (inBR(x, y)) out.push([x, y]);
    }
    return out;
  };
  // gently curved legs between consecutive cities (control point pushed sideways)
  const routePath = () => {
    let d = `M${CITY_XY[0].join(' ')}`;
    for (let i = 1; i < CITY_XY.length; i++) {
      const [x0, y0] = CITY_XY[i - 1];
      const [x1, y1] = CITY_XY[i];
      const mx = (x0 + x1) / 2 - (y1 - y0) * 0.18;
      const my = (y0 + y1) / 2 + (x1 - x0) * 0.18;
      d += `Q${mx.toFixed(1)} ${my.toFixed(1)} ${x1} ${y1}`;
    }
    return d;
  };
  const routeFractions = () => {
    const seg = CITY_XY.slice(1).map((p, i) => Math.hypot(p[0] - CITY_XY[i][0], p[1] - CITY_XY[i][1]));
    const total = seg.reduce((a, b) => a + b, 0);
    let acc = 0;
    return [0, ...seg.map((s) => (acc += s) / total)];
  };

  const STAR = 'M12 2.8l2.75 5.6 6.15.9-4.45 4.33 1.05 6.12L12 16.85l-5.5 2.9 1.05-6.12L3.1 9.3l6.15-.9z';
  const star = (cls = '', style = '') => `<svg class="${cls}"${style ? ` style="${style}"` : ''} viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR}"/></svg>`;

  /* ---------- small runtime helpers ---------- */

  // a repeating step that only runs while its row is on screen
  const stepper = (ms, fn) => {
    let id = 0;
    return {
      play() { if (!id) id = setInterval(fn, ms); },
      pause() { clearInterval(id); id = 0; }
    };
  };
  const group = (...ctrls) => ({
    play() { ctrls.forEach((c) => c.play()); },
    pause() { ctrls.forEach((c) => c.pause()); }
  });
  // vertical text roll inside a grid-stacked box
  const roll = (box, text) => {
    const old = box.lastElementChild;
    const nu = document.createElement('span');
    nu.textContent = text;
    box.appendChild(nu);
    // both lines travel together on the same curve, so they never overlap
    const move = { duration: 0.75, ease: 'power3.inOut' };
    gsap.fromTo(nu, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, ...move });
    if (old) gsap.to(old, { yPercent: -100, opacity: 0, ...move, onComplete: () => old.remove() });
  };
  // crossfade a new image over the current one
  const swapImg = (wrap, src) => {
    const im = new Image();
    im.src = src;
    im.alt = '';
    wrap.appendChild(im);
    gsap.fromTo(im, { opacity: 0, scale: 1.12 }, {
      opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out',
      onComplete: () => wrap.querySelectorAll('img').forEach((x) => { if (x !== im) x.remove(); })
    });
  };
  const preload = (srcs) => srcs.forEach((s) => { const i = new Image(); i.src = s; });

  /* ============================================================
     The proposals
     ============================================================ */

  const P = [];

  /* 00 — today's badge, for reference */
  P.push({
    name: 'Hoje',
    desc: 'O selo atual: um ponto verde e o texto. Fica aqui como referência para comparar.',
    render: (k) => `<p class="kicker">${KICKER[k]}</p>`
  });

  /* 01 — Glifo vivo: the dot becomes a line icon that draws itself */
  const ICON1 = {
    spk: `<svg class="bd1-ico bd1-ico--w" viewBox="0 0 28 24" aria-hidden="true">
        <g class="bd1-draw"><rect x="11" y="2.5" width="6" height="11" rx="3" pathLength="1"/><path d="M8 10.5a6 6 0 0 0 12 0" pathLength="1"/><path d="M14 16.5v4M11 20.5h6" pathLength="1"/></g>
        <path class="bd1-wave bd1-w1" d="M22.5 6.5a7.5 7.5 0 0 1 0 8"/><path class="bd1-wave bd1-w2" d="M25.6 4.3a10.5 10.5 0 0 1 0 12.4"/>
        <path class="bd1-wave bd1-w1" d="M5.5 6.5a7.5 7.5 0 0 0 0 8"/><path class="bd1-wave bd1-w2" d="M2.4 4.3a10.5 10.5 0 0 0 0 12.4"/>
      </svg>`,
    tour: `<svg class="bd1-ico" viewBox="0 0 24 24" aria-hidden="true">
        <ellipse class="bd1-ripple" cx="12" cy="21.3" rx="5" ry="1.4"/>
        <g class="bd1-pin"><g class="bd1-draw"><path d="M12 19.8s-6.3-5.4-6.3-10.5a6.3 6.3 0 0 1 12.6 0c0 5.1-6.3 10.5-6.3 10.5z" pathLength="1"/><circle cx="12" cy="9.3" r="2.2" pathLength="1"/></g></g>
      </svg>`,
    rate: `<svg class="bd1-ico" viewBox="0 0 24 24" aria-hidden="true">
        <path class="bd1-starfill" d="${STAR}"/>
        <g class="bd1-draw"><path d="${STAR}" pathLength="1"/></g>
        <path class="bd1-spark" d="M20.2 1.6l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z"/>
      </svg>`,
    ed: `<svg class="bd1-ico" viewBox="0 0 24 24" aria-hidden="true">
        <g class="bd1-draw">
          <path class="bd1-l3" d="M3.5 16.2l8.5 4.3 8.5-4.3" pathLength="1"/>
          <path class="bd1-l2" d="M3.5 12l8.5 4.3 8.5-4.3" pathLength="1"/>
          <path class="bd1-l1" d="M12 3.5l8.5 4.3-8.5 4.3-8.5-4.3z" pathLength="1"/>
        </g>
      </svg>`
  };
  P.push({
    name: 'Glifo vivo',
    desc: 'O ponto vira um ícone de linha que se desenha ao entrar e continua respirando: microfone com ondas de som, pino que pousa no mapa, estrela que se acende e as camadas das edições.',
    render: (k) => `<p class="bd1">${ICON1[k]}<span>${KICKER[k]}</span></p>`
  });

  /* 02 — Contagem visível: the number takes a shape */
  P.push({
    name: 'Contagem visível',
    desc: 'O número ganha forma: oito pontos acendem um a um, a rota percorre as seis cidades no mapa do Brasil, as estrelas enchem até 4,9 e três segmentos completam as edições.',
    render: (k) => {
      if (k === 'spk') {
        const dots = Array.from({ length: 8 }, (_, i) => `<i style="--i:${i}"></i>`).join('');
        return `<p class="bd2"><span class="bd2-dots" aria-hidden="true">${dots}</span><span><b>8</b> palestrantes confirmados</span></p>`;
      }
      if (k === 'tour') {
        const cities = CITY_XY.map(([x, y]) => `<circle class="bd2-city" cx="${x}" cy="${y}" r="5"/>`).join('');
        return `<p class="bd2 bd2--map"><svg class="bd2-map" viewBox="-6 -6 112 112" aria-hidden="true">
            <path class="bd2-br" d="${BR_PATH}"/>
            <path class="bd2-route" d="${routePath()}" pathLength="1"/>
            ${cities}
          </svg><span><b>6</b> cidades entre agosto e setembro</span></p>`;
      }
      if (k === 'rate') {
        const stars = [0, 0, 0, 0, 10].map((r, i) => `<span class="bd2-star" style="--i:${i};--r:${r}%">${star('bd2-s-off')}${star('bd2-s-on')}</span>`).join('');
        return `<p class="bd2"><span class="bd2-stars" aria-hidden="true">${stars}</span><span>Nota <b>4,9</b> · 3 mil avaliações</span></p>`;
      }
      const segs = [0, 1, 2].map((i) => `<i style="--i:${i}"></i>`).join('');
      return `<p class="bd2"><span class="bd2-segs" aria-hidden="true">${segs}</span><span><b>3</b> edições desde 2024</span></p>`;
    },
    setup(row) {
      const route = row.querySelector('.bd2-route');
      const cities = [...row.querySelectorAll('.bd2-city')];
      if (!route) return null;
      const fr = routeFractions();
      const D = 3.6;
      const off = () => cities.forEach((c) => c.classList.remove('on'));
      const tl = gsap.timeline({ repeat: -1, paused: true });
      tl.call(off, null, 0)
        .fromTo(route, { strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, duration: D, ease: 'none' }, 0);
      fr.forEach((f, i) => tl.call(() => cities[i].classList.add('on'), null, f * D + 0.02));
      tl.to(route, { opacity: 0, duration: 0.7, ease: 'power1.in' }, D + 1.6)
        .call(off, null, D + 1.9)
        .to({}, { duration: 0.6 });
      return { play: () => tl.play(), pause: () => tl.pause() };
    }
  });

  /* 03 — Rostos e lugares: real people and places inside the badge */
  P.push({
    name: 'Rostos e lugares',
    desc: 'Prova com gente de verdade: os rostos dos palestrantes se revezam, a foto da cidade troca junto com o nome, avaliadores reais ao lado da nota e as três edições em polaroides.',
    render: (k) => {
      if (k === 'spk') {
        const faces = SPEAKERS.slice(0, 4).map(([n, f], i) => `<span class="bd3-face" style="--i:${i}"><img src="${IMG}spk-${f}.png" alt=""></span>`).join('');
        return `<p class="bd3"><span class="bd3-faces" aria-hidden="true">${faces}<span class="bd3-more" style="--i:4">+4</span></span><span>palestrantes confirmados</span></p>`;
      }
      if (k === 'tour') {
        return `<p class="bd3"><span class="bd3-win" aria-hidden="true"><img src="${IMG}city-1.jpg" alt=""></span><span><b>6</b> cidades · </span><span class="bd-roll bd3-city" style="min-width:7.3em"><span>Goiânia</span></span></p>`;
      }
      if (k === 'rate') {
        const faces = REVIEWERS.slice(0, 3).map((f, i) => `<span class="bd3-face" style="--i:${i}"><img src="${IMG}rev-${f}.jpg" alt=""></span>`).join('');
        const stars = Array.from({ length: 5 }, (_, i) => star('bd3-st', `--i:${i}`)).join('');
        return `<p class="bd3"><span class="bd3-faces" aria-hidden="true">${faces}</span><span><b>4,9</b></span><span class="bd3-stars" aria-hidden="true">${stars}</span><span class="bd3-muted">3 mil avaliações</span></p>`;
      }
      const pols = [1, 2, 3].map((n, i) => `<span class="bd3-pol" style="--i:${i}"><img src="${IMG}ed-${n}.jpg" alt=""></span>`).join('');
      return `<p class="bd3 bd3--pol"><span class="bd3-pols" aria-hidden="true">${pols}</span><span><b>3</b> edições desde 2024</span></p>`;
    },
    setup(row) {
      preload([...SPEAKERS.map(([, f]) => `${IMG}spk-${f}.png`), ...TOUR.map((_, i) => `${IMG}city-${i + 1}.jpg`)]);
      const faces = [...row.querySelectorAll('[data-k="spk"] .bd3-face')];
      const win = row.querySelector('.bd3-win');
      const city = row.querySelector('.bd3-city');
      let s = 0;
      let c = 0;
      const faceStep = stepper(2300, () => {
        const slot = faces[s % 4];
        const who = SPEAKERS[(s + 4) % 8][1];
        s++;
        const img = slot.querySelector('img');
        gsap.to(img, {
          opacity: 0, scale: 0.7, duration: 0.3, ease: 'power2.in',
          onComplete: () => {
            img.src = `${IMG}spk-${who}.png`;
            gsap.to(img, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' });
          }
        });
      });
      const cityStep = stepper(2600, () => {
        c = (c + 1) % TOUR.length;
        swapImg(win, `${IMG}city-${c + 1}.jpg`);
        roll(city, TOUR[c][0]);
      });
      return group(faceStep, cityStep);
    }
  });

  /* 04 — Odômetro: no pill, the number rolls like a counter */
  const odo = (num) => [...num].map((ch) => {
    if (!/\d/.test(ch)) return `<span class="bd4-c">${ch}</span>`;
    const reel = Array.from({ length: 20 }, (_, i) => `<span>${i % 10}</span>`).join('');
    return `<span class="bd4-d"><span class="bd4-reel" data-to="${ch}">${reel}</span></span>`;
  }).join('');
  const ODO = {
    spk: ['8', 'palestrantes', 'confirmados'],
    tour: ['6', 'cidades', 'agosto e setembro'],
    rate: ['4,9', 'nota média', 'em 3 mil avaliações'],
    ed: ['3', 'edições', 'desde 2024']
  };
  P.push({
    name: 'Odômetro',
    desc: 'Sem pílula. O número vira o protagonista e rola como um contador quando a seção aparece; passar o mouse faz rolar de novo.',
    render: (k) => {
      const [n, a, b] = ODO[k];
      return `<div class="bd4"><span class="bd4-num" aria-label="${n}">${odo(n)}</span><span class="bd4-sep" aria-hidden="true"></span><span class="bd4-lab"><b>${a}</b><span>${b}</span></span></div>`;
    },
    setup(row) {
      const spin = (scope, quick) => [...scope.querySelectorAll('.bd4-reel')].forEach((r, i) => {
        const to = +r.dataset.to;
        gsap.fromTo(r, { yPercent: quick ? -to * 5 : 0 }, {
          yPercent: -(10 + to) * 5, duration: quick ? 1.3 : 2.4, ease: 'expo.out', delay: i * 0.14, overwrite: true
        });
      });
      if (reduced) {
        row.querySelectorAll('.bd4-reel').forEach((r) => gsap.set(r, { yPercent: -(10 + +r.dataset.to) * 5 }));
        return null;
      }
      row.querySelectorAll('.bd4').forEach((b) => b.addEventListener('mouseenter', () => spin(b, true)));
      let done = false;
      return { play() { if (!done) { done = true; spin(row, false); } }, pause() {} };
    }
  });

  /* 05 — Selo carimbado: a passport stamp with rotating text */
  const SEAL = {
    spk: ['8', 'PALESTRANTES · CONFIRMADOS · IGREEN LIVE · ', 'palestrantes confirmados'],
    tour: ['6', 'AGOSTO · SETEMBRO · PELO BRASIL · TOUR · ', 'cidades entre agosto e setembro'],
    rate: ['4,9', 'NOTA MÉDIA · 3 MIL AVALIAÇÕES · ', 'de nota em 3 mil avaliações'],
    ed: ['3', 'RECIFE · CURITIBA · SÃO PAULO · DESDE 2024 · ', 'edições desde 2024']
  };
  P.push({
    name: 'Selo carimbado',
    desc: 'Um carimbo de passaporte: o selo marca a seção ao entrar, com o número no centro, e o texto gira devagar ao redor. No hover, dá meia-volta.',
    render: (k) => {
      const [n, ring, txt] = SEAL[k];
      return `<div class="bd5"><span class="bd5-seal" aria-hidden="true"><svg viewBox="0 0 60 60">
          <defs><path id="bd5-c-${k}" d="M30 30m-21.5 0a21.5 21.5 0 1 1 43 0a21.5 21.5 0 1 1 -43 0"/></defs>
          <circle class="bd5-edge" cx="30" cy="30" r="28.6"/>
          <circle class="bd5-core" cx="30" cy="30" r="15.4"/>
          <g class="bd5-hov"><g class="bd5-ring"><text><textPath href="#bd5-c-${k}" textLength="134" lengthAdjust="spacing">${ring}</textPath></text></g></g>
          <text class="bd5-n${n.length > 1 ? ' bd5-n--sm' : ''}" x="30" y="30.6" text-anchor="middle" dominant-baseline="central">${n}</text>
        </svg><span class="bd5-ink"></span></span><span class="bd5-txt">${txt}</span></div>`;
    }
  });

  /* 06 — Ingresso: a ticket stub with a perforation */
  const TICKET = {
    spk: ['8', 'palestrantes confirmados', 'line-up completo do tour'],
    tour: ['6', 'cidades pelo Brasil', '16 ago → 20 set'],
    rate: ['4,9', 'nota média', '3 mil avaliações verificadas'],
    ed: ['3', 'edições realizadas', 'desde 2024']
  };
  P.push({
    name: 'Ingresso',
    desc: 'O selo vira um canhoto de ingresso com picote. Um brilho holográfico passa de tempos em tempos e, no hover, o canhoto ameaça se destacar.',
    render: (k) => {
      const [n, a, b] = TICKET[k];
      return `<div class="bd6"><span class="bd6-stub"><b>${n}</b></span><span class="bd6-main"><span class="bd6-l1">${a}</span><span class="bd6-l2">${b}</span><span class="bd6-sheen" aria-hidden="true"></span></span></div>`;
    }
  });

  /* 07 — Painel de pontos: a tiny LED panel like the stage screens */
  const LED_TXT = {
    spk: ['8 palestrantes', 'confirmados'],
    tour: ['6 cidades', 'agosto e setembro'],
    rate: ['Nota 4,9', '3 mil avaliações'],
    ed: ['3 edições', 'desde 2024']
  };
  const grid = (cols, rows) => {
    let s = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) s += `<circle cx="${5 + c * 10}" cy="${5 + r * 10}" r="3.1" data-r="${r}" data-c="${c}"/>`;
    return `<svg viewBox="0 0 ${cols * 10} ${rows * 10}" aria-hidden="true">${s}</svg>`;
  };
  const STAR_BMP = ['....#....', '...###...', '...###...', '#########', '.#######.', '..#####..', '..##.##..', '.##...##.', '##.....##'];
  P.push({
    name: 'Painel de pontos',
    desc: 'Uma telinha de LED como os painéis do palco: o mapa do Brasil em pontos com as cidades acendendo, um equalizador de 8 vozes, a estrela que se forma até 4,9 e as barras de crescimento das edições.',
    render: (k) => {
      let panel;
      if (k === 'tour') {
        const dots = brDots(7.4).map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.3"/>`).join('');
        const cities = CITY_XY.map(([x, y]) => `<circle class="bd7-ring" cx="${x}" cy="${y}" r="4"/><circle class="bd7-city" cx="${x}" cy="${y}" r="3.6"/>`).join('');
        panel = `<svg viewBox="-4 -4 108 108" aria-hidden="true">${dots}${cities}</svg>`;
      } else if (k === 'spk') panel = grid(8, 8);
      else panel = grid(9, 9);
      const [a, b] = LED_TXT[k];
      return `<div class="bd7"><span class="bd7-panel bd7-panel--${k}">${panel}</span><span class="bd7-txt"><b>${a}</b><span>${b}</span></span></div>`;
    },
    setup(row) {
      const at = (k) => row.querySelector(`[data-k="${k}"] .bd7-panel`);
      const cells = (k) => {
        const m = {};
        at(k).querySelectorAll('circle[data-r]').forEach((c) => { m[`${c.dataset.r},${c.dataset.c}`] = c; });
        return m;
      };
      // equalizer: 8 columns = 8 voices
      const eq = cells('spk');
      const hgt = Array(8).fill(0);
      const tickEq = () => {
        for (let c = 0; c < 8; c++) {
          const target = 1 + Math.floor(Math.random() * Math.random() * 8.9);
          hgt[c] = Math.max(target, hgt[c] - 1);
          for (let r = 0; r < 8; r++) {
            const lit = r >= 8 - hgt[c];
            const cell = eq[`${r},${c}`];
            cell.classList.toggle('on', lit);
            cell.classList.toggle('peak', r === 8 - hgt[c]);
          }
        }
      };
      // star: fills from the bottom row up; the tip stays dim (4,9 of 5)
      const st = cells('rate');
      let ts = 0;
      const tickStar = () => {
        const phase = ts++ % 44;
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            const shape = STAR_BMP[r][c] === '#';
            const cell = st[`${r},${c}`];
            const filled = shape && phase >= 9 - r && phase < 41 && r !== 0;
            cell.classList.toggle('on', filled && !(phase > 14 && Math.random() < 0.03));
            cell.classList.toggle('dim', shape && !filled);
          }
        }
      };
      // editions: three bars grow, one after the other
      const ed = cells('ed');
      const BARS = [[1, 2, 4], [4, 5, 6], [7, 8, 9]];
      let te = 0;
      const tickEd = () => {
        const phase = te++ % 46;
        let budget = phase;
        BARS.forEach(([c0, c1, h]) => {
          const shown = Math.max(0, Math.min(h, budget));
          budget -= h + 1;
          for (let r = 0; r < 9; r++) {
            const lit = phase < 43 && r >= 9 - shown;
            [c0, c1].forEach((c) => {
              ed[`${r},${c}`].classList.toggle('on', lit);
              ed[`${r},${c}`].classList.toggle('peak', lit && h === 9 && shown === 9 && r === 0 && phase % 6 < 3);
            });
          }
        });
      };
      // map: the cities light up one by one, each with a ping
      const mapCities = [...at('tour').querySelectorAll('.bd7-city')];
      const rings = [...at('tour').querySelectorAll('.bd7-ring')];
      let tm = 0;
      const tickMap = () => {
        const phase = tm++ % 10;
        if (phase < 6) {
          mapCities[phase].classList.add('on');
          gsap.fromTo(rings[phase], { attr: { r: 4 }, opacity: 0.9 }, { attr: { r: 16 }, opacity: 0, duration: 1.1, ease: 'power2.out' });
        } else if (phase === 9) mapCities.forEach((c) => c.classList.remove('on'));
      };
      if (reduced) {
        for (let i = 0; i < 6; i++) tickMap();
        for (let i = 0; i < 20; i++) { tickStar(); tickEd(); }
        tickEq();
        return null;
      }
      let n = 0;
      return stepper(110, () => {
        n++;
        tickEq();
        tickStar();
        tickEd();
        if (n % 6 === 0) tickMap();
      });
    }
  });

  /* 08 — Fita corrida: the fact stays, the details run like a ticker */
  const TAPE = {
    spk: ['8 palestrantes', SPEAKERS.map(([n]) => n)],
    tour: ['6 cidades', TOUR.map(([c, d]) => `${c} ${d}`)],
    rate: ['Nota 4,9', QUOTES],
    ed: ['3 edições', EDITIONS.map(([c, y]) => `${c} ${y}`)]
  };
  P.push({
    name: 'Fita corrida',
    desc: 'O fato fica fixo e o resto corre como letreiro: nomes dos palestrantes, datas de cada cidade, trechos dos depoimentos e as edições. Para quando o mouse passa.',
    render: (k) => {
      const [lead, items] = TAPE[k];
      const run = items.map((t) => `<span>${t}</span><i aria-hidden="true"></i>`).join('');
      return `<div class="bd8"><span class="bd8-lead"><b>${lead}</b></span><span class="bd8-tape"><span class="bd8-track"><span class="bd8-run">${run}</span><span class="bd8-run" aria-hidden="true">${run}</span></span></span></div>`;
    },
    setup(row) {
      // constant reading speed whatever the content length
      row.querySelectorAll('.bd8-track').forEach((t) => {
        const w = t.firstElementChild.getBoundingClientRect().width;
        t.style.setProperty('--dur', `${(w / 34).toFixed(1)}s`);
      });
      return null;
    }
  });

  /* 09 — Borda de energia: no illustration, light runs around the border */
  P.push({
    name: 'Borda de energia',
    desc: 'Nenhuma ilustração: uma luz verde percorre a borda da pílula como energia em circuito, e o selo carrega da esquerda para a direita ao aparecer. No hover a borda acende e carrega de novo.',
    render: (k) => {
      const t = KICKER[k].replace(/(\d+(,\d)?)/, '<b>$1</b>');
      return `<p class="bd9"><span class="bd9-light" aria-hidden="true"></span><span class="bd9-in"><span class="bd9-charge" aria-hidden="true"></span><i class="bd9-dot" aria-hidden="true"></i><span>${t}</span></span></p>`;
    }
  });

  /* 10 — Mini widget: a status card with live content */
  P.push({
    name: 'Mini widget',
    desc: 'Um cartão de status, como notificação de app: o fato em cima e, embaixo, um conteúdo vivo que se reveza — palestrante, próxima cidade no mapa, distribuição das notas e cada edição.',
    render: (k) => {
      if (k === 'spk') {
        return `<div class="bd10"><span class="bd10-media"><img src="${IMG}spk-thiago.png" alt=""></span><span class="bd10-body"><span class="bd10-top"><i class="bd10-eq" aria-hidden="true"><b></b><b></b><b></b></i>8 palestrantes confirmados</span><span class="bd-roll bd10-main" style="min-width:8.6em"><span>Thiago Almeida</span></span></span></div>`;
      }
      if (k === 'tour') {
        const cities = CITY_XY.map(([x, y], i) => `<circle class="bd10-city${i === 0 ? ' on' : ''}" cx="${x}" cy="${y}" r="6"/>`).join('');
        return `<div class="bd10"><span class="bd10-media bd10-media--map"><svg viewBox="-8 -8 116 116" aria-hidden="true"><path class="bd10-br" d="${BR_PATH}"/>${cities}</svg></span><span class="bd10-body"><span class="bd10-top"><i class="bd10-live" aria-hidden="true"></i>6 cidades · ago → set</span><span class="bd-roll bd10-main" style="min-width:9.4em"><span>Goiânia · 16 ago</span></span></span></div>`;
      }
      if (k === 'rate') {
        const bars = [92, 6, 1.5, 0.5, 0].map((w, i) => `<i style="--w:${w}%;--i:${i}"></i>`).join('');
        return `<div class="bd10"><span class="bd10-media bd10-media--num">4,9</span><span class="bd10-body"><span class="bd10-top"><i class="bd10-live" aria-hidden="true"></i>Nota média · 3 mil avaliações</span><span class="bd10-hist" aria-hidden="true">${bars}</span></span></div>`;
      }
      return `<div class="bd10"><span class="bd10-media"><img src="${IMG}ed-1.jpg" alt=""></span><span class="bd10-body"><span class="bd10-top"><i class="bd10-live" aria-hidden="true"></i>3 edições desde 2024</span><span class="bd-roll bd10-main" style="min-width:8em"><span>Recife · 2024</span></span></span></div>`;
    },
    setup(row) {
      const q = (k, s) => row.querySelector(`[data-k="${k}"] ${s}`);
      const spkMedia = q('spk', '.bd10-media');
      const spkName = q('spk', '.bd10-main');
      const tourName = q('tour', '.bd10-main');
      const tourCities = [...row.querySelectorAll('[data-k="tour"] .bd10-city')];
      const edMedia = q('ed', '.bd10-media');
      const edName = q('ed', '.bd10-main');
      let i = 0;
      return stepper(2600, () => {
        i++;
        const sp = SPEAKERS[i % 8];
        swapImg(spkMedia, `${IMG}spk-${sp[1]}.png`);
        roll(spkName, sp[0]);
        const t = i % TOUR.length;
        tourCities.forEach((c, n) => c.classList.toggle('on', n === t));
        roll(tourName, `${TOUR[t][0]} · ${TOUR[t][1]}`);
        const e = i % 3;
        swapImg(edMedia, `${IMG}ed-${e + 1}.jpg`);
        roll(edName, `${EDITIONS[e][0]} · ${EDITIONS[e][1]}`);
      });
    }
  });

  /* ============================================================
     Build the page
     ============================================================ */

  const rowsEl = document.querySelector('.bd-rows');
  const indexEl = document.querySelector('.bd-index');
  const pad = (n) => String(n).padStart(2, '0');

  P.forEach((p, n) => {
    const id = `p${pad(n)}`;
    const cells = SUBJECTS.map((s) => `
      <div class="bd-cell" data-k="${s.k}">
        <div class="bd-slot">${p.render(s.k)}</div>
        <p class="bd-h">${s.h[0]}<br><span>${s.h[1]}</span></p>
      </div>`).join('');
    rowsEl.insertAdjacentHTML('beforeend', `
      <section class="bd-row${n === 0 ? ' bd-row--now' : ''}" id="${id}" data-v="${n}">
        <div class="bd-meta">
          <p class="bd-num">${n === 0 ? 'Referência' : pad(n)}</p>
          <h2 class="bd-name">${p.name}</h2>
          <p class="bd-desc">${p.desc}</p>
        </div>
        <div class="bd-grid">${cells}</div>
      </section>`);
    if (n > 0) indexEl.insertAdjacentHTML('beforeend', `<a href="#${id}"><span>${pad(n)}</span>${p.name}</a>`);
  });

  const rows = [...rowsEl.querySelectorAll('.bd-row')];
  rows.forEach((row) => {
    const p = P[+row.dataset.v];
    row._ctrl = p.setup ? p.setup(row) : null;
  });

  if (reduced) {
    rows.forEach((r) => r.classList.add('is-in', 'is-on'));
    return;
  }

  // rows animate only while visible; everything stops with a hidden tab
  const visible = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const row = e.target;
      if (e.isIntersecting) {
        visible.add(row);
        row.classList.add('is-in', 'is-on');
        if (row._ctrl && !document.hidden) row._ctrl.play();
      } else {
        visible.delete(row);
        row.classList.remove('is-on');
        if (row._ctrl) row._ctrl.pause();
      }
    });
  }, { threshold: 0.25 });
  rows.forEach((r) => io.observe(r));

  document.addEventListener('visibilitychange', () => {
    visible.forEach((row) => {
      if (!row._ctrl) return;
      if (document.hidden) row._ctrl.pause();
      else row._ctrl.play();
    });
  });
})();
