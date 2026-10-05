/* ============================================================
   Selos das seções — rodada 3
   The client picked 09 (light runs once around the border, the area's
   icon draws inside). This round: four variations where the icon
   breaks out of the pill — cut at the pill's base — and four ideas
   out of the box. Same family across the four sections, motion once
   on arrival (hover replays it).
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

  /* ---------- glyphs: one family, four subjects ---------- */

  const STAR = 'M12 2.8l2.75 5.6 6.15.9-4.45 4.33 1.05 6.12L12 16.85l-5.5 2.9 1.05-6.12L3.1 9.3l6.15-.9z';
  const PIN = 'M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z';
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
  const svgOpen = (cls, extra = '') => `<svg class="bd-ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>`;
  const icoLine = (k, cls = '') => `${svgOpen(cls)}${LINE[k]}</svg>`;
  const icoSolid = (k, cls = '') => `<svg class="bd-ico ${cls}" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SOLID[k]}</svg>`;
  // big icons: the viewBox hugs the glyph (no inner margin) and the line
  // keeps a constant hairline whatever the size
  const tight = (svg) => svg.replace('viewBox="0 0 24 24"', 'viewBox="2.5 2.5 19 19"');
  const icoLineBig = (k, cls = '') => tight(`${svgOpen(cls)}${LINE[k].replace(/\/>/g, ' vector-effect="non-scaling-stroke"/>')}</svg>`);

  // 09: the chosen pill — a light laps the border once while the inside charges
  const pill9 = (k, lead = '', cls = '') => `<p class="bd9 ${cls}"><span class="bd9-light" aria-hidden="true"></span><span class="bd9-in"><span class="bd9-charge" aria-hidden="true"></span>${lead}<span class="bd-t">${TXT[k]}</span></span></p>`;
  // 09 with the icon breaking out above the pill, cut along its base
  const popOut = (k, v, obj) => `<div class="bdp bdp--${v}">${pill9(k)}<span class="bdp-pop" aria-hidden="true">${obj}</span></div>`;

  /* ============================================================
     The proposals
     ============================================================ */

  const P = [];

  P.push({
    id: '00', group: 'ref', label: 'Referência', name: 'Hoje',
    desc: 'O selo atual, só com o ponto verde. Referência de tamanho.',
    render: (k) => `<p class="kicker">${PLAIN[k]}</p>`
  });

  P.push({
    id: '09', group: 'pick', label: '09', name: 'Borda de energia', replay: true,
    change: 'A escolhida — fica como está.',
    desc: 'Ao aparecer, uma luz verde dá uma volta pela borda enquanto o ícone se desenha e a pílula carrega. Depois fica parada. No hover, mais uma volta.',
    render: (k) => pill9(k, icoLine(k, 'bd9-ico'))
  });

  /* ---------- 09 variations: the icon breaks out, cut at the base ---------- */

  P.push({
    id: '09a', group: 'var', label: '09 · A', name: 'Ícone emergindo', replay: true,
    desc: 'O ícone de linha cresce e sobe de dentro da pílula, passando da borda de cima. A base fica cortada pela borda de baixo, como se ele nascesse do selo — o pino parece fincado nele.',
    render: (k) => popOut(k, 'a', `<span class="bdp-obj">${icoLineBig(k)}</span>`)
  });

  P.push({
    id: '09b', group: 'var', label: '09 · B', name: 'Relevo', replay: true,
    desc: 'Ícone cheio, com uma sombra sólida que dá profundidade, levemente inclinado e saltando para fora do selo. Mais peso, cara de adesivo.',
    render: (k) => popOut(k, 'b', `<span class="bdp-obj"><span class="bdpB-tilt"><span class="bdpB-back">${tight(icoSolid(k))}</span><span class="bdpB-front">${tight(icoSolid(k))}</span></span></span>`)
  });

  P.push({
    id: '09c', group: 'var', label: '09 · C', name: 'Objeto 3D', replay: true,
    desc: 'Objetos 3D em vidro verde — microfone, pino, estrela e camadas — saindo do selo com a base cortada. Um brilho embaixo faz parecer que estão acesos pela pílula.',
    render: (k) => popOut(k, 'c', `<span class="bdpC-glow"></span><span class="bdp-obj"><img src="${IMG}obj3d-${k}.png" alt=""></span>`)
  });

  P.push({
    id: '09d', group: 'var', label: '09 · D', name: 'Holofote', replay: true,
    desc: 'Como luz de palco: um facho verde sobe da pílula e o ícone aparece dentro dele, saindo pela borda de cima com a base cortada.',
    render: (k) => popOut(k, 'd', `<span class="bdpD-beam"></span><span class="bdp-obj">${icoLineBig(k)}</span>`)
  });

  /* ---------- out of the box ---------- */

  P.push({
    id: '21', group: 'out', label: '21', name: 'Plugado', replay: true,
    desc: 'Energia literal: um cabo fino desce de fora e pluga na ponta do selo. Quando encaixa, uma faísca corre pelo fio e a pílula acende com a volta de luz da 09.',
    render: (k) => `<div class="bdx bd21">${pill9(k, icoLine(k, 'bd9-ico'))}
      <svg class="bd21-cable" viewBox="0 0 70 52" aria-hidden="true">
        <path class="bd21-wire" d="M2 3C28 3 20 41 50 41" pathLength="1"/>
        <path class="bd21-spark" d="M2 3C28 3 20 41 50 41" pathLength="1"/>
        <g class="bd21-plug"><rect x="49" y="36.5" width="10" height="9" rx="2.2"/><path d="M59 38.8h4.5M59 43.2h4.5"/></g>
      </svg></div>`
  });

  P.push({
    id: '22', group: 'out', label: '22', name: 'Neon', replay: true,
    desc: 'O selo vira um letreiro de neon: o tubo e o ícone piscam ao ligar, como luminoso de palco, e depois ficam acesos e firmes.',
    render: (k) => `<p class="bd22"><span class="bd22-tube" aria-hidden="true"></span>${icoLine(k, 'bd22-ico')}<span class="bd-t">${TXT[k]}</span></p>`
  });

  P.push({
    id: '23', group: 'out', label: '23', name: 'Trilha até o título', replay: true,
    desc: 'O selo se liga ao título por uma trilha de circuito. A energia sai da pílula, corre pela trilha e acende o título por um instante.',
    render: (k) => `<div class="bdx bd23">${pill9(k, icoLine(k, 'bd9-ico'))}
      <svg class="bd23-trace" aria-hidden="true"><path class="bd23-path"/><path class="bd23-run" pathLength="1"/><circle class="bd23-node" r="2.6"/></svg></div>`
  });

  P.push({
    id: '24', group: 'out', label: '24', name: 'Enxame', replay: true,
    desc: 'Pontinhos verdes — o ponto de hoje, multiplicado — chegam de fora, se juntam no desenho do ícone e viram traço. Aí a pílula acende.',
    render: (k) => `<div class="bdx bd24">${pill9(k, '<span class="bd24-space"></span>')}
      <svg class="bd24-svg" viewBox="0 0 24 24" aria-hidden="true"><g class="bd24-icon">${LINE[k]}</g><g class="bd24-ps"></g></svg></div>`
  });

  /* ============================================================
     Build the page
     ============================================================ */

  const rowsEl = document.querySelector('.bd-rows');
  const indexEl = document.querySelector('.bd-index');
  const GROUPS = {
    pick: ['A escolhida', 'borda de energia'],
    var: ['Variações da 09', 'o ícone sai do selo'],
    out: ['Fora da caixa', 'quatro ideias diferentes']
  };
  let lastGroup = 'ref';

  P.forEach((p) => {
    if (p.group !== lastGroup && GROUPS[p.group]) {
      const [a, b] = GROUPS[p.group];
      rowsEl.insertAdjacentHTML('beforeend', `<h2 class="bd-group">${a}<br><span>${b}</span></h2>`);
      indexEl.insertAdjacentHTML('beforeend', `<span class="bd-index-sep">${a}</span>`);
      lastGroup = p.group;
    }
    const cells = SUBJECTS.map((s) => `
      <div class="bd-cell" data-k="${s.k}">
        <div class="bd-slot">${p.render(s.k)}</div>
        <p class="bd-h">${s.h[0]}<br><span>${s.h[1]}</span></p>
      </div>`).join('');
    rowsEl.insertAdjacentHTML('beforeend', `
      <section class="bd-row${p.group === 'ref' ? ' bd-row--now' : ''}" id="p${p.id}">
        <div class="bd-meta">
          <p class="bd-num">${p.label}</p>
          <h2 class="bd-name">${p.name}</h2>
          ${p.change ? `<p class="bd-change">${p.change}</p>` : ''}
          <p class="bd-desc">${p.desc}</p>
        </div>
        <div class="bd-grid">${cells}</div>
      </section>`);
    if (p.group !== 'ref') indexEl.insertAdjacentHTML('beforeend', `<a href="#p${p.id}"><span>${p.label}</span>${p.name}</a>`);
  });

  const rows = [...rowsEl.querySelectorAll('.bd-row')];

  /* ---------- 23: the trace runs from the pill to the title's first line ---------- */
  const layoutTraces = () => {
    document.querySelectorAll('.bd23').forEach((wrap) => {
      const pillEl = wrap.querySelector('.bd9');
      const title = wrap.closest('.bd-cell').querySelector('.bd-h');
      const pr = pillEl.getBoundingClientRect();
      const tr = title.getBoundingClientRect();
      const line = parseFloat(getComputedStyle(title).lineHeight) || 38;
      const dy = Math.round(tr.top + line / 2 - (pr.top + pr.height / 2));
      const svg = wrap.querySelector('.bd23-trace');
      svg.setAttribute('width', 30);
      svg.setAttribute('height', dy + 8);
      svg.setAttribute('viewBox', `0 0 30 ${dy + 8}`);
      const d = `M24 4H9a6 6 0 0 0-6 6V${dy - 2}a6 6 0 0 0 6 6H19`;
      svg.querySelector('.bd23-path').setAttribute('d', d);
      svg.querySelector('.bd23-run').setAttribute('d', d);
      const node = svg.querySelector('.bd23-node');
      node.setAttribute('cx', 19);
      node.setAttribute('cy', dy + 4);
    });
  };
  layoutTraces();
  window.addEventListener('resize', layoutTraces);
  if (document.fonts) document.fonts.ready.then(layoutTraces);

  /* ---------- 24: particles sampled along the icon's own strokes ---------- */
  document.querySelectorAll('.bd24-svg').forEach((svg) => {
    const shapes = [...svg.querySelectorAll('.bd24-icon > *')];
    const lens = shapes.map((s) => s.getTotalLength());
    const total = lens.reduce((a, b) => a + b, 0);
    const N = 26;
    let html = '';
    shapes.forEach((s, i) => {
      const n = Math.max(2, Math.round((N * lens[i]) / total));
      for (let j = 0; j < n; j++) {
        const pt = s.getPointAtLength((lens[i] * j) / n);
        const ang = Math.random() * Math.PI * 2;
        const dist = 18 + Math.random() * 22;
        html += `<circle class="bd24-p" cx="${pt.x.toFixed(2)}" cy="${pt.y.toFixed(2)}" r="1.3" style="--sx:${(Math.cos(ang) * dist).toFixed(1)}px;--sy:${(Math.sin(ang) * dist).toFixed(1)}px;--d:${(Math.random() * 0.35).toFixed(2)}s"/>`;
      }
    });
    svg.querySelector('.bd24-ps').innerHTML = html;
  });

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
  };
  rows.forEach((row) => {
    const p = P.find((x) => `p${x.id}` === row.id);
    if (!p || !p.replay) return;
    row.querySelectorAll('.bd-slot > *').forEach((b) => b.addEventListener('mouseenter', () => replay(b)));
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add('is-in', 'is-on');
      else e.target.classList.remove('is-on');
    });
  }, { threshold: 0.3 });
  rows.forEach((r) => io.observe(r));
})();
