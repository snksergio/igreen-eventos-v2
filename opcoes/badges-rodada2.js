/* ============================================================
   Selos das seções — rodada 2
   Every proposal renders the same four section badges (speakers,
   tour, proof, editions). Rules from the client's feedback: same
   34px footprint as today's pill, one line, the four badges read as
   one family, and motion plays once on arrival (hover replays it).
   ============================================================ */

(() => {
  const IMG = '../assets/img/badges/';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) document.documentElement.classList.add('bd-reduced');

  /* ---------- content (same facts as the live site) ---------- */

  const SUBJECTS = [
    { k: 'spk', h: ['As vozes', 'por trás do palco'] },
    { k: 'tour', h: ['Pelo Brasil —', 'garanta seu lugar'] },
    { k: 'rate', h: ['Direto de', 'quem viveu isso'] },
    { k: 'ed', h: ['Edições que', 'marcaram história'] }
  ];
  // the fact, with its number marked
  const TXT = {
    spk: '<b>8</b> palestrantes confirmados',
    tour: '<b>6</b> cidades entre agosto e setembro',
    rate: 'Nota <b>4,9</b> em 3 mil avaliações',
    ed: '<b>3</b> edições desde 2024'
  };
  const PLAIN = {
    spk: '8 palestrantes confirmados',
    tour: '6 cidades entre agosto e setembro',
    rate: 'Nota 4,9 em 3 mil avaliações',
    ed: '3 edições desde 2024'
  };
  const PHOTOS = {
    spk: ['spk-thiago.png', 'spk-amanda.png', 'spk-rafael.png'],
    tour: ['city-1.jpg', 'city-3.jpg', 'city-5.jpg'],
    rate: ['rev-marina.jpg', 'rev-igor.jpg', 'rev-bia.jpg'],
    ed: ['ed-1.jpg', 'ed-2.jpg', 'ed-3.jpg']
  };

  /* ---------- glyphs: one family, four subjects ---------- */

  const STAR = 'M12 2.8l2.75 5.6 6.15.9-4.45 4.33 1.05 6.12L12 16.85l-5.5 2.9 1.05-6.12L3.1 9.3l6.15-.9z';
  const PIN = 'M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z';
  const BR = 'M56.5 2.5L59.5 8.8L60.8 11L64.3 15.5L68 15L74.8 19.8L81 20.8L89.3 22.8L92.5 25.5L97.5 27L98.5 31.5L98 34.5L96.3 37.5L92.8 41L89.3 46L88 50.5L87.5 57.8L84.8 64.3L83 68.3L80.5 70.9L77.5 71L74 71.8L69.8 73.5L65.5 76.8L64 79.5L64.3 82.5L63.5 85L60.5 88.3L57.5 92.3L54.5 94.5L52 97.8L51.8 94.8L46.5 90.8L41.5 89L45 85.5L49 81.5L51 77.5L49 77.3L49.8 73.5L46.3 69.8L41.5 68.8L40.5 63.5L41.5 59L39.5 54.3L35 51.3L34.8 47.3L30.8 45.8L24.5 44.8L22.3 40.5L19 38.3L15.5 40.3L11.5 41L9 37.3L4.5 37.3L3 37L0.7 32L3.2 26.5L10.5 24.3L12 16.3L10.5 12L12.5 11L17.5 10.8L20.5 11.5L25 9.8L25.5 8.5L23.8 3.5L28.5 3.5L33.8 0.5L36 5L36.5 9L40.5 9.8L44.3 8.8L48 7.3L50.5 7.8L53.3 8Z';

  const LINE = {
    spk: '<rect x="9" y="3" width="6" height="11" rx="3" pathLength="1"/><path d="M5.8 11a6.2 6.2 0 0 0 12.4 0" pathLength="1"/><path d="M12 17.2v3.3M9 20.5h6" pathLength="1"/>',
    tour: `<path d="${PIN}" pathLength="1"/><circle cx="12" cy="10" r="2.3" pathLength="1"/>`,
    rate: `<path d="${STAR}" pathLength="1"/>`,
    ed: '<path d="M3.5 16.2l8.5 4.3 8.5-4.3" pathLength="1"/><path d="M3.5 12l8.5 4.3 8.5-4.3" pathLength="1"/><path d="M12 3.5l8.5 4.3-8.5 4.3-8.5-4.3z" pathLength="1"/>'
  };
  const SOLID = {
    spk: '<rect x="9" y="2.5" width="6" height="11.5" rx="3" stroke="none"/><path d="M5.8 11a6.2 6.2 0 0 0 12.4 0M12 17.2v3.3M9 20.5h6" fill="none"/>',
    tour: `<path fill-rule="evenodd" stroke="none" d="${PIN}M12 12.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8z"/>`,
    rate: `<path stroke="none" d="${STAR}"/>`,
    ed: '<path stroke="none" d="M12 3l9 4.6-9 4.6-9-4.6z"/><path d="M3.5 12.2l8.5 4.3 8.5-4.3M3.5 16.4l8.5 4.3 8.5-4.3" fill="none"/>'
  };
  const icoLine = (k, cls = '') => `<svg class="bd-ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LINE[k]}</svg>`;
  const icoSolid = (k, cls = '') => `<svg class="bd-ico ${cls}" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SOLID[k]}</svg>`;
  const icoBrazil = (cls = '', solid = false) => `<svg class="bd-ico ${cls}" viewBox="-4 -4 108 108" aria-hidden="true"><path d="${BR}" ${solid ? 'fill="currentColor" stroke="none"' : 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"'}/></svg>`;

  // the standard pill every proposal shares unless it says otherwise
  const pill = (cls, lead, k) => `<p class="bd-pill ${cls}">${lead}<span class="bd-t">${TXT[k]}</span></p>`;

  /* ============================================================
     The proposals
     ============================================================ */

  const P = [];

  /* ---------- reference ---------- */
  P.push({
    n: 0, group: 'ref', name: 'Hoje',
    desc: 'O selo atual, só com o ponto verde. Fica como referência de tamanho: todas as propostas abaixo cabem nessa mesma pílula.',
    render: (k) => `<p class="kicker">${PLAIN[k]}</p>`
  });

  /* ---------- adjusted from round 1 ---------- */

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
    n: 1, group: 'adj', name: 'Glifo vivo',
    change: 'Mantida como estava — você aprovou.',
    desc: 'O ponto vira um ícone de linha que se desenha ao entrar e continua respirando: microfone com ondas, pino que pousa, estrela que acende e camadas das edições.',
    render: (k) => `<p class="bd1">${ICON1[k]}<span>${PLAIN[k]}</span></p>`
  });

  P.push({
    n: 3, group: 'adj', name: 'Rostos e lugares', replay: true,
    change: 'Agora padronizada: os quatro selos usam a mesma pilha de três fotos redondas, do mesmo tamanho. Sem troca automática.',
    desc: 'Palestrantes, arenas das cidades, avaliadores e momentos das edições — gente e lugares reais na mesma pílula de hoje. Ao passar o mouse, as fotos sobem uma a uma.',
    render: (k) => {
      const ph = PHOTOS[k].map((f, i) => `<span class="bd3-ph" style="--i:${i}"><img src="${IMG}${f}" alt=""></span>`).join('');
      return pill('bd3', `<span class="bd3-stack" aria-hidden="true">${ph}</span>`, k);
    }
  });

  // 7×7 dot-matrix glyphs
  const BMP = {
    spk: ['..###..', '..###..', '..###..', '#.###.#', '#.....#', '.#####.', '...#...'],
    tour: ['..###..', '.#####.', '##...##', '.#####.', '..###..', '...#...', '...#...'],
    rate: ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'],
    ed: ['.....#.', '.....#.', '...#.#.', '...#.#.', '.#.#.#.', '.#.#.#.', '.#.#.#.']
  };
  P.push({
    n: 7, group: 'adj', name: 'Painel de pontos', replay: true,
    change: 'Do tamanho da pílula de hoje: a telinha de LED virou um ícone de 7×7 pontos no lugar do ponto verde. Acende uma vez, em varredura.',
    desc: 'Microfone, pino, estrela e barras desenhados em pontos, como os telões do palco. No hover, a varredura passa de novo.',
    render: (k) => {
      let dots = '';
      BMP[k].forEach((row, r) => [...row].forEach((ch, c) => {
        dots += `<circle cx="${5 + c * 10}" cy="${5 + r * 10}" r="3.3"${ch === '#' ? ` class="on" style="--d:${(r + c) * 45}ms"` : ''}/>`;
      }));
      return pill('bd7', `<span class="bd7-led" aria-hidden="true"><svg viewBox="0 0 70 70">${dots}</svg></span>`, k);
    }
  });

  P.push({
    n: 9, group: 'adj', name: 'Borda de energia', replay: true,
    change: 'A luz agora dá uma volta só pela borda e para. E ganhou o ícone de cada área no lugar do ponto.',
    desc: 'Ao aparecer, uma luz verde percorre a borda uma vez enquanto o ícone se desenha e a pílula carrega. Depois fica parada. No hover, mais uma volta.',
    render: (k) => `<p class="bd9"><span class="bd9-light" aria-hidden="true"></span><span class="bd9-in"><span class="bd9-charge" aria-hidden="true"></span>${icoLine(k, 'bd9-ico')}<span class="bd-t">${TXT[k]}</span></span></p>`
  });

  P.push({
    n: 10, group: 'adj', name: 'Ícone em bloco', replay: true,
    change: 'O widget simplificado: sobrou só o bloquinho com o ícone, numa linha, sem conteúdo se revezando.',
    desc: 'Um bloco verde com o ícone em escuro, como ícone de app, seguido do texto. Entra com um giro curto e fica parado.',
    render: (k) => pill('bd10', `<span class="bd10-tile">${icoSolid(k)}</span>`, k)
  });

  /* ---------- new proposals ---------- */

  P.push({
    n: 11, group: 'new', name: 'Do ponto ao ícone', replay: true,
    desc: 'Parte do selo de hoje: o pontinho verde cresce, vira um círculo e revela o ícone da área dentro dele. Uma vez só.',
    render: (k) => pill('bd11', `<span class="bd11-dot">${icoLine(k)}</span>`, k)
  });

  P.push({
    n: 12, group: 'new', name: 'Carga', replay: true,
    desc: 'O ícone é contorno e se enche de verde de baixo para cima, como uma bateria carregando — energia, a cara da iGreen. No tour, quem carrega é o mapa do Brasil. A estrela para em 98% (4,9 de 5).',
    render: (k) => {
      const base = k === 'tour' ? icoBrazil('bd12-out') : icoLine(k, 'bd12-out');
      const fill = k === 'tour' ? icoBrazil('bd12-in', true) : icoSolid(k, 'bd12-in');
      return pill('bd12', `<span class="bd12-ico${k === 'rate' ? ' bd12-ico--98' : ''}">${base}${fill}</span>`, k);
    }
  });

  P.push({
    n: 13, group: 'new', name: 'Anel', replay: true,
    desc: 'O ícone dentro de um anel fino que se completa ao aparecer. Na nota, o anel fecha em 98%, o mesmo que 4,9 de 5.',
    render: (k) => {
      const pct = k === 'rate' ? 0.98 : 1;
      return pill('bd13', `<span class="bd13-ring" style="--p:${pct}"><svg class="bd13-svg" viewBox="0 0 26 26" aria-hidden="true"><circle class="bd13-track" cx="13" cy="13" r="11.5"/><circle class="bd13-prog" cx="13" cy="13" r="11.5" pathLength="1"/></svg>${icoLine(k)}</span>`, k);
    }
  });

  P.push({
    n: 14, group: 'new', name: 'Foco de câmera', replay: true,
    desc: 'Quatro cantoneiras se fecham sobre o selo como o foco de uma câmera ao vivo, e o texto acende. Um gesto de palco, sem ilustração extra.',
    render: (k) => `<p class="bd-pill bd14"><i class="bd14-c bd14-tl"></i><i class="bd14-c bd14-tr"></i><i class="bd14-c bd14-bl"></i><i class="bd14-c bd14-br"></i>${icoLine(k)}<span class="bd-t">${TXT[k]}</span></p>`
  });

  P.push({
    n: 15, group: 'new', name: 'Aura', replay: true,
    desc: 'A borda ganha o mesmo anel de vidro dos cards do site (mais claro embaixo) e o ícone acende com um brilho suave que fica de leve. No tour, o mapa do Brasil.',
    render: (k) => pill('bd15', `<span class="bd15-ico"><i class="bd15-aura" aria-hidden="true"></i>${k === 'tour' ? icoBrazil('bd15-g') : icoLine(k, 'bd15-g')}</span>`, k)
  });

  P.push({
    n: 16, group: 'new', name: 'Número em destaque', replay: true,
    desc: 'Sem ícone: o número ganha uma etiqueta verde dentro da pílula e conta rapidinho até o valor quando a seção aparece.',
    render: (k) => {
      const [num, rest] = {
        spk: ['8', 'palestrantes confirmados'],
        tour: ['6', 'cidades entre agosto e setembro'],
        rate: ['4,9', 'de nota em 3 mil avaliações'],
        ed: ['3', 'edições desde 2024']
      }[k];
      return `<p class="bd-pill bd16"><span class="bd16-n" data-n="${num}">${num}</span><span class="bd-t">${rest}</span></p>`;
    }
  });

  const ISO = {
    spk: '<g class="bd17-obj"><rect x="11" y="1.5" width="6" height="9.5" rx="3"/><path class="bd17-wire" d="M9.4 8.2a4.6 4.6 0 0 0 9.2 0M14 12.8v4"/></g>',
    tour: '<g class="bd17-obj"><path d="M14 16.6s-4.8-4.3-4.8-8.1a4.8 4.8 0 0 1 9.6 0c0 3.8-4.8 8.1-4.8 8.1z"/><circle cx="14" cy="8.5" r="1.7"/></g>',
    rate: '<g class="bd17-obj"><path d="M14 2.6l1.8 3.6 4 .6-2.9 2.8.7 4L14 11.7l-3.6 1.9.7-4-2.9-2.8 4-.6z"/></g>',
    ed: '<g class="bd17-obj"><path class="bd17-t2" d="M14 9.5l8 3.6-8 3.6-8-3.6z"/><path class="bd17-t3" d="M14 5.5l8 3.6-8 3.6-8-3.6z"/></g>'
  };
  P.push({
    n: 17, group: 'new', name: 'Mini isométrico', replay: true,
    desc: 'Uma ilustração pequenininha em perspectiva: cada área é um objeto que pousa sobre a mesma plataforma — microfone, pino, estrela e as edições empilhadas.',
    render: (k) => pill('bd17', `<svg class="bd17-ico" viewBox="0 0 28 24" aria-hidden="true"><path class="bd17-tile" d="M14 14.2l10 4.4-10 4.4-10-4.4z"/><ellipse class="bd17-shadow" cx="14" cy="18.6" rx="3.6" ry="1.3"/>${ISO[k]}</svg>`, k)
  });

  P.push({
    n: 18, group: 'new', name: 'Pontilhado', replay: true,
    desc: 'O ícone nasce feito de pontinhos — o mesmo ponto verde de hoje — e os pontos se ligam até virar um traço contínuo.',
    render: (k) => pill('bd18', `<svg class="bd-ico bd18-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LINE[k].replace(/ pathLength="1"/g, '')}</svg>`, k)
  });

  P.push({
    n: 19, group: 'new', name: 'Sublinhado de luz', replay: true,
    desc: 'Sem pílula: ícone e texto sobre um fio fino. Ao aparecer, uma luz corre pelo fio da esquerda para a direita e termina num pontinho aceso.',
    render: (k) => `<p class="bd19">${icoLine(k)}<span class="bd-t">${TXT[k]}</span><i class="bd19-line" aria-hidden="true"><i class="bd19-run"></i></i></p>`
  });

  P.push({
    n: 20, group: 'new', name: 'Micro-interação', replay: true,
    desc: 'Ícones cheios e parados. Cada um faz um gesto físico curto ao entrar e no hover: o microfone balança, o pino quica, a estrela gira e as camadas se assentam.',
    render: (k) => pill(`bd20 bd20--${k}`, `<span class="bd20-ico">${icoSolid(k)}</span>`, k)
  });

  /* ============================================================
     Build the page
     ============================================================ */

  const rowsEl = document.querySelector('.bd-rows');
  const indexEl = document.querySelector('.bd-index');
  const pad = (n) => String(n).padStart(2, '0');
  const GROUPS = {
    adj: ['Ajustadas', 'com o seu retorno'],
    new: ['Novas propostas', 'no mesmo tamanho de hoje']
  };
  let lastGroup = 'ref';

  P.forEach((p) => {
    if (p.group !== lastGroup && GROUPS[p.group]) {
      const [a, b] = GROUPS[p.group];
      rowsEl.insertAdjacentHTML('beforeend', `<h2 class="bd-group">${a}<br><span>${b}</span></h2>`);
      indexEl.insertAdjacentHTML('beforeend', `<span class="bd-index-sep">${a}</span>`);
      lastGroup = p.group;
    }
    const id = `p${pad(p.n)}`;
    const cells = SUBJECTS.map((s) => `
      <div class="bd-cell" data-k="${s.k}">
        <div class="bd-slot">${p.render(s.k)}</div>
        <p class="bd-h">${s.h[0]}<br><span>${s.h[1]}</span></p>
      </div>`).join('');
    rowsEl.insertAdjacentHTML('beforeend', `
      <section class="bd-row${p.group === 'ref' ? ' bd-row--now' : ''}" id="${id}" data-n="${p.n}">
        <div class="bd-meta">
          <p class="bd-num">${p.group === 'ref' ? 'Referência' : pad(p.n)}</p>
          <h2 class="bd-name">${p.name}</h2>
          ${p.change ? `<p class="bd-change">${p.change}</p>` : ''}
          <p class="bd-desc">${p.desc}</p>
        </div>
        <div class="bd-grid">${cells}</div>
      </section>`);
    if (p.group !== 'ref') indexEl.insertAdjacentHTML('beforeend', `<a href="#${id}"><span>${pad(p.n)}</span>${p.name}</a>`);
  });

  const rows = [...rowsEl.querySelectorAll('.bd-row')];

  /* ---------- 16: the number counts up once ---------- */
  const countUp = (el, quick) => {
    const target = el.dataset.n;
    const dec = target.includes(',') ? 1 : 0;
    const v = parseFloat(target.replace(',', '.'));
    const o = { x: 0 };
    gsap.to(o, {
      x: v, duration: quick ? 0.7 : 1.1, ease: 'power3.out',
      onUpdate: () => { el.textContent = o.x.toFixed(dec).replace('.', ','); },
      onComplete: () => { el.textContent = target; }
    });
  };

  if (reduced) {
    rows.forEach((r) => r.classList.add('is-in', 'is-on'));
    return;
  }

  /* ---------- hover replays the one-shot entrance ---------- */
  // a finished CSS animation can't be restarted through getAnimations(), so
  // switch every animation inside the badge off for one style pass and back on
  const replay = (badge) => {
    const busy = badge.getAnimations({ subtree: true }).some((a) => a.effect && a.effect.target !== badge
      && a.playState === 'running' && a.effect.getComputedTiming().iterations !== Infinity);
    if (busy) return;
    badge.classList.add('bd-reset');
    void badge.offsetWidth;
    badge.classList.remove('bd-reset');
    const n = badge.querySelector('.bd16-n');
    if (n) countUp(n, true);
  };
  rows.forEach((row) => {
    const p = P.find((x) => x.n === +row.dataset.n);
    if (!p || !p.replay) return;
    row.querySelectorAll('.bd-slot > *').forEach((b) => b.addEventListener('mouseenter', () => replay(b)));
  });

  // rows animate when they arrive; only the kept "Glifo vivo" loops, and it
  // pauses while off screen
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const row = e.target;
      if (e.isIntersecting) {
        if (!row.classList.contains('is-in')) row.querySelectorAll('.bd16-n').forEach((n) => countUp(n, false));
        row.classList.add('is-in', 'is-on');
      } else {
        row.classList.remove('is-on');
      }
    });
  }, { threshold: 0.3 });
  rows.forEach((r) => io.observe(r));
})();
