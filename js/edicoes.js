/* ============================================================
   Edições que marcaram história — mural vivo
   Uma linha do tempo única (128 unidades) presa à rolagem conta a
   história dentro de um palco fixo:

     0–18    WARP     título fixo no centro; cards nascem no ponto de
                      fuga e voam para fora, passando pela câmera
     12–27   POUSO    o fluxo desacelera e os cards pousam num mural
                      inclinado de 6 colunas; o título recua
     27–33   MURAL    a parede respira: colunas em velocidades e
                      sentidos alternados, cards trocando de foto
     33–102  EDIÇÕES  três capítulos; em cada um, um card do mural se
                      solta, cresce e endireita até virar o painel da
                      edição, e no fim volta para o seu lugar
     102–117 SAÍDA    o mural acelera, achata, recua com desfoque e
                      implode de volta para o centro
     114–128 FRASE    a frase final e o CTA; depois o palco solta e
                      segue com a rolagem até a seção seguinte

   Cena = scrub. Texto = toca em limiares (e volta ao rolar para trás).
   Um ScrollTrigger separado cuida da chegada antes do palco fixar.
   ============================================================ */

(() => {
  const section = document.querySelector('.od');
  if (!section || !window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);
  const HAS_SPLIT = typeof window.SplitText !== 'undefined';
  if (HAS_SPLIT) gsap.registerPlugin(SplitText);

  /* ---------------- conteúdo ---------------- */

  // caminho até a raiz do site ('' no index, '../' nas páginas de /opcoes)
  const BASE = section.getAttribute('data-base') ?? '../';
  const MOM = (n) => `${BASE}assets/img/past/moment-${String(n).padStart(2, '0')}.jpg`;
  const CARD = (n) => `${BASE}assets/video/cards/${n}`;
  const PAST = (n) => `${BASE}assets/video/past/${n}`;
  const STAR = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.3l2 4.1 4.5.7-3.3 3.2.8 4.5L8 11.7l-4 2.1.8-4.5L1.5 6.1 6 5.4 8 1.3z" fill="#A8FF35"/></svg>';

  const photo = (src, ar = 16 / 10) => ({ k: 'photo', src, ar });
  const clip = (base, ar = 4 / 5) => ({ k: 'clip', mp4: base + '.mp4', poster: base + '.jpg', ar });

  const ST_12K = { k: 'stat', n: '<span class="od-acc">+</span>12K', l: 'Ingressos vendidos', d: 'Em seis cidades, rodando o Brasil.', ar: 1 };
  const ST_98 = { k: 'stat', n: '98<span class="od-acc">%</span>', l: 'Voltariam de novo', d: 'Pesquisa feita após cada evento.', ar: 1 };
  const ST_49 = { k: 'stat', n: '4,9' + STAR, l: 'Nota média', d: 'Entre 3 mil avaliações do público.', ar: 1 };
  const ST_3X = { k: 'stat', n: '3<span class="od-acc">x</span>', l: 'Mais crescimento', d: 'Relatado por quem aplica o método.', ar: 1 };

  const Q = (q, who, city, img) => ({ k: 'quote', q, who, city, img: `${BASE}assets/img/${img}.jpg`, ar: 4 / 5 });
  const Q_MARINA = Q('Fui ao evento por curiosidade e saí com um plano que sigo até hoje.', 'Marina Castro', 'Goiânia', 'depoimentos/marina');
  const Q_IGOR = Q('As histórias contadas ao vivo mudaram como eu enxergo trabalho.', 'Igor Lemos', 'São Paulo', 'depoimentos/igor');
  const Q_RAFA = Q('Conheci nos bastidores as duas pessoas que hoje formam o meu time.', 'Rafa Torres', 'Curitiba', 'depoimentos/rafa');
  const Q_CAMILA = Q('A energia daquela sala é impossível de fingir.', 'Camila Ruas', 'Rio de Janeiro', 'depoimentos/camila');

  const ED = (tag, title, src) => ({ k: 'ed', tag, title, src, ar: 4 / 5 });
  const ED_REC = ED('Recife · 2024', 'A primeira caravana', `${BASE}assets/img/past-03.jpg`);
  const ED_CWB = ED('Curitiba · 2024', 'As turmas práticas', `${BASE}assets/img/past-02.jpg`);
  const ED_SP = ED('São Paulo · 2025', 'A edição arena', `${BASE}assets/img/past-01.jpg`);

  const BRAND = { k: 'brand', ar: 1 };
  const VAN = { k: 'type', ar: 1 };
  const ROUTE = { k: 'route', ar: 4 / 5 };

  // seis colunas, tipos misturados para que vizinhas nunca se repitam
  const COLS = [
    [photo(MOM(5)), clip(CARD('gen-walk')), photo(MOM(13), 4 / 5), photo(MOM(22)), photo(CARD('sel-jardim') + '.jpg', 4 / 5), photo(MOM(6))],
    [ED_REC, photo(MOM(2)), ST_12K, Q_MARINA, VAN, photo(MOM(19))],
    [photo(MOM(8)), Q_IGOR, clip(CARD('sel-carro')), ST_98, photo(MOM(17)), BRAND, photo(MOM(10), 4 / 5)],
    [ST_49, photo(MOM(21)), ED_CWB, clip(PAST('crowd-hands'), 16 / 10), Q_RAFA, photo(CARD('gen-podcast') + '.jpg', 4 / 5)],
    [photo(MOM(16), 4 / 5), ROUTE, photo(MOM(4)), ST_3X, Q_CAMILA, photo(MOM(11)), ED_SP],
    [clip(CARD('gen-executiva2')), photo(MOM(23)), photo(MOM(7), 1), photo(CARD('sel-musgo2') + '.jpg', 4 / 5), photo(MOM(3)), photo(MOM(12))]
  ];
  const SPEEDS = [1, -0.74, 1.22, -0.92, 0.84, -1.12];

  // fotos que entram no lugar de outras quando um tile "pisca" (m1)
  const POP_POOL = [MOM(9), MOM(14), MOM(15), MOM(18), MOM(20), CARD('sel-musgo3') + '.jpg', CARD('sel-estudio') + '.jpg', CARD('gen-kart') + '.jpg', CARD('sel-suv') + '.jpg', CARD('gen-reuniao') + '.jpg', CARD('sel-escritorio') + '.jpg'];

  // o fluxo do warp: fotos, retratos, rótulos de cidade e dois números
  const sp = (src, w = 0.165) => ({ k: 'photo', src, w, ar: 16 / 10 });
  const pp = (n, w = 0.105) => ({ k: 'photo', src: CARD(n) + '.jpg', w, ar: 4 / 5 });
  const lab = (text) => ({ k: 'label', text, w: 0.135, h: 0.034 });
  const mini = (n, l) => ({ k: 'mini', n, l, w: 0.105, ar: 1 });
  const STREAM = [
    sp(MOM(1), 0.19), pp('sel-musgo3'), sp(MOM(6)), lab('Recife · 2024'), sp(MOM(9), 0.15), pp('gen-kart', 0.115),
    sp(MOM(12)), mini('<span>+</span>12K', 'ingressos'), sp(MOM(14), 0.18), pp('sel-estudio'), sp(MOM(15), 0.14), sp(MOM(3), 0.16),
    lab('Curitiba · 2024'), sp(MOM(18), 0.18), pp('gen-reuniao', 0.11), sp(MOM(20)), pp('gen-walk', 0.1), sp(MOM(22), 0.2),
    mini('98<span>%</span>', 'voltariam'), pp('sel-suv'), sp(MOM(10), 0.17), sp(MOM(2), 0.15), lab('São Paulo · 2025'), sp(MOM(17), 0.19),
    pp('sel-escritorio', 0.11), sp(MOM(16), 0.15), mini('4,9', 'nota média'), sp(MOM(19), 0.16), pp('sel-carro', 0.105), sp(MOM(23), 0.18),
    sp(MOM(4), 0.17), pp('gen-podcast', 0.1), sp(MOM(11), 0.16), lab('Próxima: Goiânia'), sp(MOM(21), 0.19), pp('sel-musgo1', 0.105)
  ];

  /* ---------------- linha do tempo (unidades) ---------------- */

  const UNIT_VH = 5.5;      // rolagem por unidade → seção de 804vh
  const CH0 = 33;           // início do capítulo 01
  const CHLEN = 23;         // cada capítulo: sobe devagar / fica / volta para o mural
  const RISE = 10.5;        // ~58vh de rolagem para o card virar painel, sem pressa
  const SINK_AT = 17.7;
  const SINK = 5.3;
  const TXT_IN = 7.6;       // (desde o início da subida) o painel já está quase de frente
  const TXT_OUT = 18;
  const OUT = CH0 + 3 * CHLEN; // início da saída (102)
  const T = OUT + 26;       // comprimento total (128)
  const FINAL_AT = OUT + 12.4;
  const HEAD_OUT = 17.6;    // o título sai quando o pouso chega ao centro
  const chStart = (c) => CH0 + c * CHLEN;
  // o próximo painel já começa a subir enquanto o anterior volta ao mural
  const riseAt = (c) => chStart(c) - (c > 0 ? 2 : 0);
  const txtIn = (c) => riseAt(c) + TXT_IN;
  const txtOut = (c) => chStart(c) + TXT_OUT;

  /* ---------------- utilidades ---------------- */

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const smooth = (a, b, v) => { const x = clamp01((v - a) / (b - a)); return x * x * (3 - 2 * x); };
  // pseudo-aleatório estável (o mesmo layout a cada carga)
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  const mm = gsap.matchMedia();

  mm.add('(min-width: 900px) and (min-height: 560px) and (prefers-reduced-motion: no-preference)', () => {
    section.classList.add('od-on');
    let api = build();
    let lastW = innerWidth;
    let lastH = innerHeight;
    let timer = 0;
    // fração da página registrada antes do redimensionamento
    const docFrac = () => { const h = document.documentElement.scrollHeight - innerHeight; return h > 0 ? scrollY / h : 0; };
    let lastFrac = docFrac();
    // (só com a janela estável: durante o resize a página muda de altura)
    const onScroll = () => { if (innerWidth === lastW && innerHeight === lastH) lastFrac = docFrac(); };
    addEventListener('scroll', onScroll, { passive: true });
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const big = Math.abs(innerWidth - lastW) >= 2 || Math.abs(innerHeight - lastH) >= 90;
        lastW = innerWidth;
        lastH = innerHeight;
        if (!big) { lastFrac = docFrac(); return; }
        // reconstrói para o novo tamanho mantendo o ponto da história
        const frac = lastFrac;
        api.kill();
        api = build();
        ScrollTrigger.refresh();
        scrollTo(0, frac * (document.documentElement.scrollHeight - innerHeight));
        lastFrac = frac;
      }, 240);
    };
    addEventListener('resize', onResize);
    return () => {
      removeEventListener('resize', onResize);
      removeEventListener('scroll', onScroll);
      clearTimeout(timer);
      api.kill();
      section.classList.remove('od-on');
    };
  });

  /* ============================================================
     build: monta o palco para o tamanho de tela atual
     ============================================================ */

  function build() {
    const $ = (s, r = section) => r.querySelector(s);
    const $$ = (s, r = section) => Array.from(r.querySelectorAll(s));

    const stage = $('.od-stage');
    const world = $('.od-world');
    const plane = $('.od-plane');
    const stream = $('.od-stream');
    const head = $('.od-head');
    const headIn = $('.od-head-in');
    const veil = $('.od-bg-veil');
    const core = $('.od-bg-core');
    const dim = $('.od-dim');
    const scrimC = $('.od-scrim--center');
    const scrimL = $('.od-scrim--left');
    const dofT = $('.od-dof--tilt');
    const dofC = $('.od-dof--core');
    const glow = $('.od-afterglow');
    const featsWrap = $('.od-feats');
    const feats = $$('.od-feat');
    const chs = $$('.od-ch');
    const prog = $('.od-prog');
    const progRoll = $('.od-prog-roll');
    const progBar = $('.od-prog-bar i');
    const fin = $('.od-final');
    const finT = $('.od-final-t');
    const finCta = $('.od-final-cta');

    const ctx = gsap.context(() => {}, section);
    const cleanups = [];

    /* ---------- geometria ---------- */

    const G = {};
    G.vw = innerWidth;
    G.vh = innerHeight;
    G.P = Math.round(Math.min(1700, Math.max(1000, G.vw * 0.84)));
    G.cw = Math.round(G.vw * 0.2);
    G.gap = Math.round(G.vw * 0.0155);
    G.top = G.vh * 0.98;            // cobertura acima do centro do plano
    G.bot = G.vh * 0.8;             // e abaixo
    G.cover = G.top + G.bot;
    G.dpx = G.vh * 0.5;             // deslocamento por unidade de "drift"
    G.pw = 6 * G.cw + 5 * G.gap;
    const ZL = -3.2 * G.P;          // de onde os cards do mural chegam (eixo do plano)
    const ZI = -3.8 * G.P;          // para onde eles implodem
    world.style.perspective = G.P + 'px';
    // os painéis usam a mesma câmera do mural para sair de dentro dele
    featsWrap.style.perspective = G.P + 'px';
    section.style.height = (T * UNIT_VH + 100) + 'vh';
    cleanups.push(() => { section.style.height = ''; world.style.perspective = ''; featsWrap.style.perspective = ''; });

    /* ---------- cards ---------- */

    const img = (src) => `<img src="${src}" alt="" decoding="async" draggable="false">`;

    function cardInner(d) {
      switch (d.k) {
        case 'photo':
          return `<div class="od-ci od-k-media">${img(d.src)}</div>`;
        case 'clip':
          return `<div class="od-ci od-k-media"><video muted loop playsinline preload="none" poster="${d.poster}" data-src="${d.mp4}"></video></div>`;
        case 'stat':
          return `<div class="od-ci od-k-glass od-k-stat"><p class="od-stat-n">${d.n}</p><div><p class="od-stat-l">${d.l}</p><p class="od-stat-d">${d.d}</p></div></div>`;
        case 'quote':
          return `<div class="od-ci od-k-glass od-k-quote"><span class="od-q-mark">“</span><p class="od-q-t">${d.q}</p><div class="od-q-who">${img(d.img)}<span><b>${d.who}</b><i>${d.city}</i></span></div></div>`;
        case 'ed':
          return `<div class="od-ci od-k-glass od-k-ed"><div class="od-ed-photo">${img(d.src)}</div><div class="od-ed-body"><span class="od-tag">${d.tag}</span><p class="od-ed-title">${d.title}</p></div></div>`;
        case 'brand':
          return `<div class="od-ci od-k-glass od-k-brand">${img(BASE + 'assets/img/igreen-logo.svg')}<div><p class="od-brand-t">Feito na<br>estrada</p><p class="od-brand-s">Tour iGreen Live · desde 2024</p></div></div>`;
        case 'type':
          return `<div class="od-ci od-k-glass od-k-type"><p class="od-type-k">Recife, março de 2024</p><div><p class="od-type-big">1 van<span>.</span></p><p class="od-type-sm">Seis palestrantes e um litoral de histórias para contar.</p></div></div>`;
        case 'route':
          return `<div class="od-ci od-k-glass od-k-route"><p class="od-type-k">A rota até aqui</p><ol class="od-route"><li class="is-done"><b>Recife</b><i>Março de 2024</i></li><li class="is-done"><b>Curitiba</b><i>Setembro de 2024</i></li><li class="is-done"><b>São Paulo</b><i>Agosto de 2025</i></li><li class="is-next"><b>Goiânia</b><i>Próxima parada</i></li></ol></div>`;
        case 'label':
          return `<div class="od-ci od-k-glass od-k-label">${d.text}</div>`;
        case 'mini':
          return `<div class="od-ci od-k-glass od-k-mini"><b>${d.n}</b><i>${d.l}</i></div>`;
      }
      return '';
    }

    /* mural: cada coluna é uma faixa com a sequência repetida até cobrir a
       tela, duplicada para dar a volta sem emenda (wrap) */
    const cols = [];
    const photoGroups = [];
    const muralVideos = [];
    let html = '';
    COLS.forEach((list, ci) => {
      const unit = [];
      let len = 0;
      let i = 0;
      while (len < G.cover + G.gap || unit.length < list.length) {
        const d = list[i % list.length];
        const h = Math.round(G.cw / d.ar);
        unit.push({ d, h, top: len });
        len += h + G.gap;
        i++;
      }
      const col = {
        idx: ci,
        left: -G.pw / 2 + ci * (G.cw + G.gap),
        L: len,
        speed: SPEEDS[ci],
        cards: [],
        y: NaN
      };
      col.cx = col.left + G.cw / 2;
      html += `<div class="od-col" data-c="${ci}" style="left:${col.left}px;width:${G.cw}px">`;
      for (let copy = 0; copy < 2; copy++) {
        unit.forEach((u, ui) => {
          html += `<div class="od-card" style="top:${u.top + copy * len}px;height:${u.h}px">${cardInner(u.d)}</div>`;
          col.cards.push({ d: u.d, h: u.h, top: u.top + copy * len, ui, copy, jit: hash(ci * 31 + ui), vis: true, z: 0, o: 1 });
        });
      }
      html += '</div>';
      cols.push(col);
    });
    plane.innerHTML = html;
    cleanups.push(() => { plane.innerHTML = ''; });

    $$('.od-col', plane).forEach((el, ci) => {
      const col = cols[ci];
      col.el = el;
      const cardEls = $$('.od-card', el);
      col.cards.forEach((c, k) => {
        c.el = cardEls[k];
        c.ci = c.el.firstElementChild;
        c.col = col;
      });
      // gêmeos (mesma posição na sequência, cópias 0 e 1) se movem juntos
      const byUi = {};
      col.cards.forEach((c) => { (byUi[c.ui] = byUi[c.ui] || []).push(c); });
      Object.values(byUi).forEach((tw) => {
        tw.forEach((c) => { c.twins = tw; });
        const d = tw[0].d;
        if (d.k === 'photo') photoGroups.push(tw);
        if (d.k === 'clip') tw.forEach((c) => { const v = c.ci.querySelector('video'); v._card = c; muralVideos.push(v); });
      });
    });

    /* fluxo do warp: cada card tem uma direção (ângulo áureo, sem raias
       horizontais que cruzariam o título) e um instante de largada */
    const N = STREAM.length;
    const streamCards = STREAM.map((d, i) => {
      const a = i * 2.39996 + 0.7;
      let s = Math.sin(a);
      let c = Math.cos(a);
      if (Math.abs(s) < 0.36) {
        s = 0.36 * (s < 0 ? -1 : 1);
        c = (c < 0 ? -1 : 1) * Math.sqrt(1 - s * s);
      }
      const rr = 0.84 + hash(i + 7) * 0.32;
      const w = Math.round(G.vw * d.w);
      const h = Math.round(d.h ? G.vw * d.h : w / d.ar);
      return {
        d, w, h,
        x: c * G.vw * 0.5 * rr,
        y: s * G.vh * 0.5 * rr,
        rx: s * 11,
        ry: -c * 13,
        rz: (hash(i + 3) - 0.5) * 7,
        s0: (i / (N - 1)) * 0.6,
        dur: 0.4,
        vis: false
      };
    });
    stream.innerHTML = streamCards.map((c) =>
      `<div class="od-s" style="width:${c.w}px;height:${c.h}px;left:${-c.w / 2}px;top:${-c.h / 2}px">${cardInner(c.d)}</div>`
    ).join('');
    $$('.od-s', stream).forEach((el, i) => { streamCards[i].el = el; });
    cleanups.push(() => { stream.innerHTML = ''; });

    /* ---------- estado da cena ---------- */

    const S = { win: 0, warp: 0, land: 0, drift: 0, imp: 0, hv: 0 };

    // os deslocamentos iniciais das colunas só podem ser os que não deixam a
    // faixa dar a volta durante o pouso ou a implosão (gêmeos nunca trocam
    // de lugar enquanto estão em profundidades diferentes). Cada coluna
    // guarda todos os válidos: planLifts() pode trocar o de até três colunas
    // para que o card de onde cada edição sai esteja bem enquadrado
    const DRIFT_LAND = [0, 0.95];
    const DRIFT_IMP = [4.25, 4.85];
    cols.forEach((col) => {
      const k0 = Math.floor(hash(col.idx + 91) * 40);
      col.offs = [];
      for (let k = 0; k < 40; k++) {
        const off = (((k0 + k) % 40) / 40) * col.L;
        const ok = [DRIFT_LAND, DRIFT_IMP].every(([a, b]) => {
          const va = (off + col.speed * a * G.dpx) / col.L;
          const vb = (off + col.speed * b * G.dpx) / col.L;
          return Math.floor(va - 0.02) === Math.floor(vb + 0.02) && Math.floor(va + 0.02) === Math.floor(vb - 0.02);
        });
        if (ok) col.offs.push(off);
      }
      col.off = col.offs.length ? col.offs[0] : (k0 / 40) * col.L;
    });

    // zona de leitura do título (o warp se apaga ao passar atrás dele)
    const HZ = { ex: 420, ey: 180, cy: 20 };
    const measureHead = () => {
      const sr = stage.getBoundingClientRect();
      const r = headIn.getBoundingClientRect();
      const dy = parseFloat(gsap.getProperty(headIn, 'y')) || 0;
      HZ.ex = r.width / 2 + 34;
      HZ.ey = r.height / 2 + 26;
      HZ.cy = (r.top - dy + r.height / 2) - (sr.top + sr.height / 2);
    };
    // quanto um card (retângulo projetado) pode aparecer atrás do título:
    // se encosta na zona do título, quase some; longe dela, intacto
    const headFade = (px, py, hw, hh) => {
      if (S.hv <= 0) return 1;
      const dx = Math.max(0, Math.abs(px) - hw);
      const dy = Math.max(0, Math.abs(py - HZ.cy) - hh);
      const d = Math.hypot(dx / HZ.ex, dy / HZ.ey);
      return 1 - S.hv * 0.9 * (1 - smooth(0.82, 1.2, d));
    };
    // projeção de um ponto do plano (coords locais) na tela, com a mesma
    // ordem de transformação do GSAP: rotateX → rotateZ → translate
    const PR = { cx: 1, sx: 0, cz: 1, sz: 0, tx: 0, tz: 0 };
    const readPlane = () => {
      const rx = (gsap.getProperty(plane, 'rotationX') * Math.PI) / 180;
      const rz = (gsap.getProperty(plane, 'rotationZ') * Math.PI) / 180;
      PR.cx = Math.cos(rx); PR.sx = Math.sin(rx);
      PR.cz = Math.cos(rz); PR.sz = Math.sin(rz);
      PR.tx = gsap.getProperty(plane, 'x');
      PR.tz = gsap.getProperty(plane, 'z');
    };
    const project = (X, Y, Z, out) => {
      const y1 = Y * PR.cx - Z * PR.sx;
      const z1 = Y * PR.sx + Z * PR.cx;
      const x2 = X * PR.cz - y1 * PR.sz;
      const y2 = X * PR.sz + y1 * PR.cz;
      const s = G.P / (G.P - (z1 + PR.tz));
      out[0] = (x2 + PR.tx) * s;
      out[1] = y2 * s;
      out[2] = s;
      return out;
    };
    const PT = [0, 0, 1];

    /* ---------- render: estado → transformações ---------- */

    const setVis = (o, v) => {
      if (o.vis !== v) { o.el.style.visibility = v ? 'visible' : 'hidden'; o.vis = v; }
    };

    function renderStream() {
      const E = S.win * 0.2 + S.warp * 0.8;
      const hw = G.vw / 2;
      const hh = G.vh / 2;
      const K0 = 0.2;
      const K1 = 1.9;
      for (const c of streamCards) {
        const t = (E - c.s0) / c.dur;
        if (t <= 0 || t >= 1) { setVis(c, false); continue; }
        // zoom exponencial: velocidade aparente constante (expoScale)
        const k = K0 * Math.pow(K1 / K0, t);
        const z = G.P * (1 - 1 / k);
        const px = c.x * k;
        const py = c.y * k;
        const ww = (c.w * k) / 2;
        const wh = (c.h * k) / 2;
        if (px - ww > hw || px + ww < -hw || py - wh > hh || py + wh < -hh) { setVis(c, false); continue; }
        let o = smooth(K0, 0.36, k) * (1 - smooth(1.5, 1.88, k));
        o *= headFade(px, py, ww, wh);
        setVis(c, o > 0.004);
        if (o <= 0.004) continue;
        c.el.style.opacity = o.toFixed(3);
        c.el.style.transform = `translate3d(${c.x.toFixed(1)}px,${c.y.toFixed(1)}px,${z.toFixed(1)}px) rotateX(${c.rx.toFixed(2)}deg) rotateY(${c.ry.toFixed(2)}deg) rotateZ(${c.rz.toFixed(2)}deg)`;
      }
    }

    function renderMural() {
      const landing = S.land < 0.9999;
      const imploding = S.imp > 0.0001;
      const cullTop = -G.top - 30;
      const cullBot = G.bot + 30;
      const nx = G.vw * 0.6;
      const ny = G.vh * 0.62;
      const guard = landing && S.hv > 0;
      if (guard) readPlane();
      for (const col of cols) {
        let v = (col.off + col.speed * S.drift * G.dpx) / col.L;
        v -= Math.floor(v);
        const y = -G.top - v * col.L;
        if (!(Math.abs(y - col.y) <= 0.04)) {
          col.y = y;
          col.el.style.transform = `translate3d(0,${y.toFixed(2)}px,0)`;
        }
        for (const c of col.cards) {
          const top = y + c.top;
          let vis = top + c.h > cullTop && top < cullBot;
          let z = 0;
          let o = 1;
          if (vis && (landing || imploding)) {
            const cy = top + c.h / 2;
            const dist = Math.min(1, Math.hypot(col.cx / nx, cy / ny));
            if (landing) {
              // de fora para dentro: o centro (atrás do título) pousa por último
              const p = clamp01((S.land - (0.48 * (1 - dist) + c.jit * 0.1)) / 0.4);
              if (p <= 0) vis = false;
              else {
                const e = 1 - Math.pow(1 - p, 3);
                z = ZL * (1 - e);
                o = smooth(0, 0.4, p);
                if (guard) {
                  project(col.cx, cy, z, PT);
                  o *= headFade(PT[0], PT[1], (G.cw * PT[2]) / 2, (c.h * PT[2]) / 2);
                }
              }
            }
            if (vis && imploding) {
              // de dentro para fora: o centro abre primeiro para a frase
              const p2 = clamp01((S.imp - (0.42 * dist + c.jit * 0.08)) / 0.5);
              if (p2 >= 1) vis = false;
              else if (p2 > 0) {
                z += ZI * p2 * p2;
                o *= 1 - smooth(0.35, 0.95, p2);
              }
            }
          }
          setVis(c, vis);
          if (!vis) continue;
          z = Math.round(z * 10) / 10;
          o = Math.round(o * 1000) / 1000;
          if (z !== c.z) { c.el.style.transform = z ? `translate3d(0,0,${z}px)` : ''; c.z = z; }
          if (o !== c.o) { c.el.style.opacity = o < 1 ? String(o) : ''; c.o = o; }
        }
      }
    }

    const render = () => { renderStream(); renderMural(); };

    /* ---------- de que card do mural cada painel sai ----------
       Para cada edição, olha a cena no instante em que o painel começa a
       subir e no instante em que ele volta, e escolhe — entre as colunas e
       os deslocamentos válidos de cada uma — um card de foto que esteja
       inteiro à vista, à direita da coluna de texto e logo abaixo de onde o
       painel vai parar. Esse card ganha a foto da edição, para de flutuar e
       não troca de foto; o painel nasce exatamente sobre ele. Se o card é
       mais estreito que o painel (4:5, 1:1), o painel nasce recortado no
       formato do card e se abre para os lados enquanto sobe. */

    function planLifts() {
      const sw = stage.clientWidth;
      const sh = stage.clientHeight;
      const W = Math.min(1240, sw - 2 * innerWidth * 0.05);
      const side = (sw - W) / 2;
      // onde o card pode estar (a partir do centro do palco): longe do texto,
      // do topo desfocado e da borda de baixo que escurece
      const box0 = { l: side + W * 0.5 - sw / 2, r: sw / 2 - 28, t: -sh * 0.28, b: sh * 0.3 };
      const box1 = { l: side + W * 0.42 - sw / 2, r: sw / 2 - 20, t: -sh * 0.36, b: sh * 0.36 };
      const outside = (p, b) =>
        Math.max(0, b.l - (p.sx - p.hw)) + Math.max(0, p.sx + p.hw - b.r) +
        Math.max(0, b.t - (p.sy - p.hh)) + Math.max(0, p.sy + p.hh - b.b);

      const sceneAt = (t) => {
        tl.seek(t, true);
        readPlane();
        return {
          drift: S.drift,
          pr: { ...PR },
          rx: gsap.getProperty(plane, 'rotationX'),
          rz: gsap.getProperty(plane, 'rotationZ'),
          dim: Number(gsap.getProperty(dim, 'opacity')) || 0,
          scrim: Number(gsap.getProperty(scrimL, 'opacity')) || 0
        };
      };
      // penumbra sobre um ponto do mural: o escurecimento geral mais a faixa
      // escura da coluna de texto (mesmas paradas do gradiente no CSS)
      const SCRIM = [[0, 1], [0.37, 0.99], [0.42, 0.82], [0.5, 0.36], [0.6, 0]];
      const scrimAt = (sx) => {
        const x = sw / 2 + sx;
        let prev = [0, 1];
        for (const [f, a] of SCRIM) {
          const px = f ? side + W * f : 0;
          if (x <= px) return px === prev[0] ? a : prev[1] + ((x - prev[0]) / (px - prev[0])) * (a - prev[1]);
          prev = [px, a];
        }
        return 0;
      };
      const shadeAt = (p, sc) => 1 - (1 - sc.dim) * (1 - scrimAt(p.sx) * sc.scrim);
      // centro do card no espaço 3D do palco (antes da perspectiva) e na tela,
      // com a coluna no deslocamento off
      const poseOf = (card, sc, off) => {
        const col = card.col;
        let v = (off + col.speed * sc.drift * G.dpx) / col.L;
        v -= Math.floor(v);
        const top = -G.top - v * col.L + card.top;
        const cy = top + card.h / 2;
        const p = sc.pr;
        const y1 = cy * p.cx;
        const X = col.cx * p.cz - y1 * p.sz + p.tx;
        const Y = col.cx * p.sz + y1 * p.cz;
        const Z = cy * p.sx + p.tz;
        const k = G.P / (G.P - Z);
        return { X, Y, Z, sx: X * k, sy: Y * k, hw: (G.cw / 2) * k, hh: (card.h / 2) * k };
      };
      const bestCopy = (tw, sc, box, off) => {
        let best = null;
        tw.forEach((card) => {
          const p = poseOf(card, sc, off);
          p.out = outside(p, box);
          if (!best || p.out < best.out) best = p;
        });
        return best;
      };
      // cada capítulo: onde o painel para e a cena na subida e na volta
      const chap = feats.map((f, c) => {
        // posição final do painel (o JS fixa o topo para medir o centro)
        const fh = f.offsetHeight;
        f.style.top = Math.round(sh / 2 + 22 - fh / 2) + 'px';
        const Lx = f.offsetLeft + f.offsetWidth / 2 - sw / 2;
        const Ly = f.offsetTop + fh / 2 - sh / 2;
        return {
          Lx,
          Ly,
          mw: f.querySelector('.od-feat-media').offsetWidth,
          // o card ideal fica um pouco abaixo e à direita do centro do painel:
          // a foto sobe enquanto cresce
          gx: Lx + sw * 0.03,
          gy: Ly + sh * 0.1,
          sc0: sceneAt(riseAt(c)),
          sc1: sceneAt(chStart(c) + SINK_AT + SINK)
        };
      });

      // tabela: para cada capítulo, coluna e deslocamento válido, os três
      // melhores cards daquela coluna (do melhor para o pior)
      const offsOf = (col) => (col.offs.length ? col.offs : [col.off]);
      const table = chap.map((ch) => cols.map((col) => offsOf(col).map((off) => {
        const list = [];
        photoGroups.forEach((tw) => {
          if (tw[0].col !== col) return;
          const p0 = bestCopy(tw, ch.sc0, box0, off);
          const p1 = bestCopy(tw, ch.sc1, box1, off);
          const score = p0.out * 8 + p1.out * 3 + Math.hypot(p0.sx - ch.gx, p0.sy - ch.gy) * 0.35;
          list.push({ tw, col, off, p0, p1, score });
        });
        return list.sort((a, b) => a.score - b.score).slice(0, 3);
      })));

      // busca completa: cada capítulo escolhe uma coluna (6³ combinações);
      // capítulos na mesma coluna dividem um único deslocamento e usam cards
      // diferentes. Fica a combinação de menor total
      let best = null;
      const assign = [];
      const evaluate = () => {
        const byCol = new Map();
        assign.forEach((ci, c) => {
          if (!byCol.has(ci)) byCol.set(ci, []);
          byCol.get(ci).push(c);
        });
        let total = 0;
        const picks = [];
        for (const [ci, list] of byCol) {
          let bestOff = null;
          table[list[0]][ci].forEach((_, oi) => {
            const chosen = [];
            let sum = 0;
            for (const c of list) {
              const opt = table[c][ci][oi].find((o) => !chosen.some((x) => x.tw === o.tw));
              if (!opt) return;
              chosen.push(opt);
              sum += opt.score;
            }
            if (!bestOff || sum < bestOff.sum) bestOff = { sum, chosen };
          });
          if (!bestOff) return;
          total += bestOff.sum;
          list.forEach((c, i) => { picks[c] = bestOff.chosen[i]; });
        }
        if (!best || total < best.total) best = { total, picks };
      };
      const walk = (c) => {
        if (c === chap.length) { evaluate(); return; }
        for (let ci = 0; ci < cols.length; ci++) { assign[c] = ci; walk(c + 1); }
      };
      walk(0);
      planDbg = { table, chap, cols, photoGroups, best };
      best.picks.forEach((pk) => { pk.col.off = pk.off; });

      const plans = feats.map((f, c) => {
        const { Lx, Ly, mw, sc0, sc1 } = chap[c];
        const pick = best.picks[c];

        // o card passa a mostrar a foto da edição e fica parado
        const tw = pick.tw;
        const fm = f.querySelector('.od-feat-img');
        const src = fm.getAttribute(fm.tagName === 'VIDEO' ? 'poster' : 'src');
        const cis = tw.map((card) => card.ci);
        tw._lift = true;
        tw.forEach((card) => { card.ci.querySelector('img').src = src; });
        tw.forEach((card) => card.el.classList.add('od-still'));

        // escala em que a foto do painel tem a altura do card; a sobra dos
        // lados fica recortada (ix, em % de cada lado) até o painel se abrir
        const ar = tw[0].d.ar;
        const k = (G.cw / mw) * (ar < 1.6 ? 1.6 / ar : 1);
        const ix = ar < 1.6 ? (1 - ar / 1.6) * 50 : 0;
        const pose = (p, sc) => ({ x: p.X - Lx, y: p.Y - Ly, z: p.Z, rotationX: sc.rx, rotationZ: sc.rz, scale: k });
        return {
          cis,
          from: pose(pick.p0, sc0),
          to: pose(pick.p1, sc1),
          // o recorte no formato do card, com o raio do card na escala dele
          cut: { '--ix': ix.toFixed(3) + '%', '--cr': (14 / k).toFixed(2) + 'px' },
          dim0: shadeAt(pick.p0, sc0),
          dim1: shadeAt(pick.p1, sc1),
          dbg: { p0: pick.p0, p1: pick.p1, score: pick.score, Lx, Ly, k }
        };
      });
      tl.seek(0, true);
      cleanups.push(() => feats.forEach((f) => { f.style.top = ''; }));
      return plans;
    }

    /* ---------- texto: limiares (toca e volta) ---------- */

    const HIDE = (dir) => ({ yPercent: dir >= 0 ? 112 : -112, opacity: 0, filter: 'blur(10px) brightness(0.5)' });
    const SHOW = { yPercent: 0, opacity: 1, filter: 'blur(0px) brightness(1)' };

    function group(root, extra) {
      return { root, extra, on: false, hidden: true, tw: null, lines: () => $$('.od-l, .od-sl', root) };
    }
    const headG = group(headIn);
    const chG = chs.map((el) => group(el));
    const finG = group(finT, finCta);

    function play(g, on, dir) {
      if (g.on === on) return;
      g.on = on;
      const ls = g.lines();
      if (g.tw) g.tw.kill();
      if (on) {
        if (g.hidden) gsap.set(ls, { yPercent: dir >= 0 ? 112 : -112 });
        g.hidden = false;
        g.tw = gsap.timeline()
          .to(ls, { ...SHOW, duration: 0.8, ease: 'expo.out', stagger: 0.07, overwrite: 'auto' }, 0);
        if (g.extra) g.tw.to(g.extra, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', overwrite: 'auto' }, 0.32);
      } else {
        g.tw = gsap.timeline({ onComplete: () => { g.hidden = true; } })
          .to(ls, { ...HIDE(dir), duration: 0.42, ease: 'power2.in', stagger: 0.025, overwrite: 'auto' }, 0);
        if (g.extra) g.tw.to(g.extra, { opacity: 0, y: dir >= 0 ? -16 : 16, duration: 0.35, ease: 'power2.in', overwrite: 'auto' }, 0);
      }
    }

    const allGroups = [headG, ...chG, finG];
    allGroups.forEach((g) => gsap.set(g.lines(), HIDE(1)));
    gsap.set(finCta, { opacity: 0, y: 18 });

    // parágrafos: linhas reais via SplitText (re-divididas ao redimensionar)
    const splits = [];
    if (HAS_SPLIT) {
      $$('.od-split').forEach((el) => {
        const g = allGroups.find((gr) => gr.root.contains(el));
        const sp = SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          linesClass: 'od-sl',
          autoSplit: true,
          onSplit(self) {
            gsap.set(self.lines, g && g.on ? SHOW : HIDE(1));
          }
        });
        splits.push(sp);
      });
    } else {
      $$('.od-split').forEach((el) => { el.classList.add('od-sl'); gsap.set(el, HIDE(1)); });
    }
    cleanups.push(() => {
      splits.forEach((s) => s.revert());
      $$('.od-split').forEach((el) => el.classList.remove('od-sl'));
    });

    /* ---------- vídeos: só tocam em cena (≤ 5 ao mesmo tempo) ---------- */

    let sectionLive = false;
    let tNow = 0;
    const inView = new Set();
    const featVideos = feats.map((f) => f.querySelector('video'));

    const ensureSrc = (v) => {
      if (!v.getAttribute('src') && v.dataset.src) { v.preload = 'auto'; v.src = v.dataset.src; }
    };
    const playV = (v) => { ensureSrc(v); if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } };
    const pauseV = (v) => { if (!v.paused) v.pause(); };

    function syncVideos() {
      // os clipes do mural só tocam quando o mural é o assunto (antes dos
      // capítulos e na saída); nos capítulos ele fica escurecido atrás do painel
      const muralLive = sectionLive && ((tNow > 22 && tNow < CH0 + 1) || (tNow > OUT - 1 && tNow < OUT + 7));
      let n = 0;
      muralVideos.forEach((v) => {
        const want = muralLive && inView.has(v) && v._card.vis && v._card.o > 0.6 && n < 4;
        if (want) { n++; playV(v); } else pauseV(v);
      });
      // o vídeo do painel só toca com o painel parado de frente: na subida e
      // na volta ele mostra a capa (que é o 1º quadro do vídeo, a mesma foto
      // do card do mural), sem decodificar nada enquanto se move. Pequeno de
      // novo, volta ao início, para reentrar no card com a mesma imagem
      featVideos.forEach((v, c) => {
        if (!v) return;
        const s = chStart(c);
        const rs = riseAt(c);
        if (sectionLive && tNow > rs - 7) ensureSrc(v);
        const still = tNow >= rs + RISE * 0.9 && tNow < s + SINK_AT;
        if (sectionLive && still) playV(v);
        else {
          pauseV(v);
          const small = tNow < rs + RISE * 0.3 || tNow > s + SINK_AT + SINK * 0.7;
          if (small && v.currentTime > 0.05) v.currentTime = 0;
        }
      });
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) inView.add(e.target); else inView.delete(e.target); });
      syncVideos();
    }, { threshold: 0.2 });
    muralVideos.forEach((v) => io.observe(v));
    cleanups.push(() => {
      io.disconnect();
      [...muralVideos, ...featVideos].forEach((v) => v && v.pause());
    });

    /* ---------- vida: flutuação leve + tiles que trocam de foto ----------
       A flutuação é uma animação CSS da propriedade translate (roda no
       compositor, sem recalcular estilo a cada quadro, e pausa com a seção
       fora da tela); aqui cada par de gêmeos ganha ritmo, sentido e fase */

    cols.forEach((col) => {
      const seen = new Set();
      col.cards.forEach((c) => {
        if (seen.has(c.twins)) return;
        seen.add(c.twins);
        const dur = (2.8 + hash(c.ui * 3 + col.idx) * 1.8).toFixed(2) + 's';
        const delay = (-hash(c.ui + col.idx * 7) * 4).toFixed(2) + 's';
        const dir = hash(col.idx * 13 + c.ui) > 0.5 ? 'alternate' : 'alternate-reverse';
        c.twins.forEach((tc) => {
          tc.el.style.animationDuration = dur;
          tc.el.style.animationDelay = delay;
          tc.el.style.animationDirection = dir;
        });
      });
    });

    let popIdx = 0;
    const pool = POP_POOL.slice();
    let popCall = null;
    function pop() {
      if (sectionLive && !document.hidden && tNow > 27 && tNow < OUT + 1) {
        const cands = photoGroups.filter((tw) => {
          // (os cards de onde os painéis saem guardam a foto da edição)
          if (tw._busy || tw._lift) return false;
          const c = tw.find((x) => x.vis);
          if (!c || c.o < 1 || Math.abs(c.col.cx) > G.vw * 0.42) return false;
          const cy = c.col.y + c.top + c.h / 2;
          return Math.abs(cy) < G.vh * 0.36;
        });
        if (cands.length) {
          const tw = cands[Math.floor(Math.random() * cands.length)];
          const next = pool[popIdx++ % pool.length];
          const pre = new Image();
          pre.src = next;
          tw._busy = true;
          const go = () => {
            const els = tw.map((c) => c.ci);
            const imgs = tw.map((c) => c.ci.querySelector('img'));
            const prev = imgs[0].getAttribute('src');
            ctx.add(() => {
              gsap.timeline({ onComplete: () => { tw._busy = false; } })
                .to(els, { scale: 0.9, opacity: 0, duration: 0.34, ease: 'power2.in' })
                .add(() => { imgs.forEach((im) => { im.src = next; }); pool[(popIdx - 1) % pool.length] = prev; })
                .to(els, { scale: 1, opacity: 1, duration: 0.8, ease: 'expo.out' }, '+=0.05');
            });
          };
          (pre.decode ? pre.decode() : Promise.resolve()).then(go, go);
        }
      }
      popCall = gsap.delayedCall(1.2 + Math.random() * 1.1, pop);
    }
    popCall = gsap.delayedCall(1.5, pop);
    cleanups.push(() => popCall && popCall.kill());

    /* ---------- linha do tempo mestre ---------- */

    const last = new Map();
    const init = (target, vars) => {
      gsap.set(target, vars);
      last.set(target, { ...(last.get(target) || {}), ...vars });
    };
    let tl;
    let lifts = [];
    let planDbg = null;
    const step = (target, vars, at, dur, ease = 'none') => {
      const prev = last.get(target) || {};
      const from = {};
      Object.keys(vars).forEach((k) => { from[k] = prev[k]; });
      tl.fromTo(target, from, { ...vars, duration: dur, ease, immediateRender: false }, at);
      last.set(target, { ...prev, ...vars });
    };

    ctx.add(() => {
      tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
      tl.set({}, {}, T);

      // estado da cena
      init(S, { win: 0, warp: 0, land: 0, drift: 0, imp: 0, hv: 0 });
      step(S, { warp: 1 }, 0, 18);
      step(S, { land: 1 }, 12, 14.5);
      step(S, { drift: 1.15 }, 14, CH0 - 14);
      step(S, { drift: 2.55 }, CH0, 3 * CHLEN);
      step(S, { drift: 4.25 }, OUT, 7, 'power2.in');
      step(S, { drift: 4.85 }, OUT + 7, 8, 'power2.out');
      step(S, { imp: 1 }, OUT + 6, 9);

      // o plano: chega mais deitado, assenta na diagonal, muda de câmera
      // a cada capítulo e, na saída, achata e recua
      init(plane, { rotationX: 34, rotationZ: -3, x: 0, z: -0.25 * G.P });
      step(plane, { rotationX: 16, rotationZ: -10, z: 0 }, 12, 15, 'power2.out');
      const CAM = [
        { rotationX: 17, rotationZ: -8, x: G.vw * 0.035 },
        { rotationX: 14.5, rotationZ: -12, x: G.vw * 0.05 },
        { rotationX: 18, rotationZ: -9.5, x: G.vw * 0.02 }
      ];
      CAM.forEach((cam, c) => step(plane, cam, chStart(c) - 1.5, 5.5, 'power2.inOut'));
      step(plane, { rotationX: 0, rotationZ: 0, x: 0, z: -0.5 * G.P }, OUT + 3, 8.5, 'power2.inOut');

      // título: recua para dar o palco ao mural
      init(headIn, { scale: 1 });
      step(headIn, { scale: 1.045 }, 0, 18, 'sine.inOut');
      // (as linhas saem por limiar em thresholds(); aqui só o bloco recua)
      init(head, { scale: 1 });
      step(head, { scale: 0.93 }, 13, 6, 'power1.in');

      // luz e profundidade
      init(core, { opacity: 0.5, scale: 0.8 });
      step(core, { opacity: 1, scale: 1.12 }, 0, 12, 'sine.inOut');
      step(core, { opacity: 0.32, scale: 1 }, 14, 12);
      step(core, { opacity: 0.85, scale: 0.62 }, OUT + 7, 8, 'power2.inOut');
      init(scrimC, { opacity: 1 });
      step(scrimC, { opacity: 0 }, 18, 6);
      step(scrimC, { opacity: 1 }, OUT + 7, 6);
      // (autoAlpha: os desfoques de fundo saem da renderização quando somem)
      // (o desfoque de profundidade é um filtro de tela cheia refeito a cada
      // quadro: só vale enquanto o mural é o assunto; nos capítulos o topo
      // já está escurecido e ele desliga)
      init(dofT, { autoAlpha: 0 });
      step(dofT, { autoAlpha: 1 }, 22, 6);
      step(dofT, { autoAlpha: 0 }, CH0 - 0.5, 3);
      // o centro (ponto de fuga, onde estão os cards mais distantes) desfoca
      // no warp e de novo na implosão
      init(dofC, { autoAlpha: 0.75 });
      step(dofC, { autoAlpha: 0 }, 15, 6);
      step(dofC, { autoAlpha: 1 }, OUT + 6, 5);
      step(dofC, { autoAlpha: 0 }, OUT + 13, 4);
      init(dim, { opacity: 0 });
      step(dim, { opacity: 0.42 }, CH0 - 0.5, 3);
      init(scrimL, { opacity: 0 });
      step(scrimL, { opacity: 1 }, CH0, 3);
      // entre capítulos o mural respira: clareia enquanto um painel afunda
      // e o próximo sobe, e volta a escurecer quando o texto entra
      [0, 1].forEach((c) => {
        const s = chStart(c);
        step(dim, { opacity: 0.24 }, s + SINK_AT + 0.4, 2, 'power1.inOut');
        step(dim, { opacity: 0.42 }, s + CHLEN, 2.2, 'power1.inOut');
        step(scrimL, { opacity: 0.55 }, s + SINK_AT + 0.4, 2, 'power1.inOut');
        step(scrimL, { opacity: 1 }, s + CHLEN, 2.2, 'power1.inOut');
      });
      step(dim, { opacity: 0 }, OUT - 0.5, 3.5);
      step(scrimL, { opacity: 0 }, OUT - 1, 3.5);
      init(fin, { scale: 0.97 });
      step(fin, { scale: 1.015 }, OUT + 12, 13, 'sine.out');
      init(glow, { opacity: 0, scale: 0.7 });
      step(glow, { opacity: 1, scale: 1 }, OUT + 9, 8, 'power2.out');

      // painéis: cada edição sai de um card do mural (a mesma foto, no mesmo
      // lugar e na mesma inclinação), cresce e endireita para a câmera, e no
      // fim volta para dentro do card, que fica vazio enquanto ela está fora
      lifts = planLifts();
      feats.forEach((f, c) => {
        const s = chStart(c);
        const rs = riseAt(c);
        const te = s + SINK_AT + SINK;
        const L = lifts[c];
        const media = f.querySelector('.od-feat-img');
        const fshade = f.querySelector('.od-feat-shade');
        init(f, { transformOrigin: '50% 50%', opacity: 0, '--fb': 0, ...L.from });
        step(f, { opacity: 1 }, rs, 0.04);
        // (sine: aceleração macia, sem trecho brusco no meio da subida)
        step(f, { x: 0, y: 0, z: 0, rotationX: 0, rotationZ: 0, scale: 1 }, rs, RISE, 'sine.inOut');
        step(f, { '--fb': 1 }, rs + RISE * 0.12, RISE * 0.6, 'power1.inOut');
        step(f, L.to, s + SINK_AT, SINK, 'sine.inOut');
        step(f, { '--fb': 0 }, s + SINK_AT + SINK * 0.3, SINK * 0.6, 'power1.inOut');
        step(f, { opacity: 0 }, te - 0.04, 0.04);
        // o card de origem esvazia enquanto o painel está fora
        init(L.cis, { opacity: 1 });
        step(L.cis, { opacity: 0 }, rs, 0.04);
        step(L.cis, { opacity: 1 }, te - 0.04, 0.04);
        // recorte: do formato do card (proporção e cantos) à foto inteira do
        // painel, e de volta ao afundar
        init(f, L.cut);
        step(f, { '--ix': '0%', '--cr': '10px' }, rs, RISE * 0.8, 'sine.inOut');
        step(f, L.cut, s + SINK_AT + SINK * 0.15, SINK * 0.85, 'sine.inOut');
        // a foto se aproxima devagar enquanto está de frente
        init(media, { scale: 1 });
        step(media, { scale: 1.08 }, rs + RISE * 0.5, s + SINK_AT - rs - RISE * 0.5);
        step(media, { scale: 1 }, s + SINK_AT, SINK, 'sine.inOut');
        // começa com a mesma penumbra que o mural tem naquele instante
        init(fshade, { opacity: L.dim0 });
        step(fshade, { opacity: 0 }, rs + 0.3, RISE * 0.7, 'power2.out');
        step(fshade, { opacity: L.dim1 }, s + SINK_AT, SINK, 'power2.in');
      });

      // linha de progresso dos capítulos
      init(progBar, { scaleX: 0 });
      step(progBar, { scaleX: 1 }, txtIn(0), txtOut(2) - txtIn(0));
      // (no fim o palco não recua: a frase fica e a seção segue com a
      // rolagem até a seção seguinte)
    });

    /* ---------- limiares ---------- */

    let curCh = -1;
    let headEntered = false;
    let headOn = false;
    // o título fica enquanto o warp acontece e sai (em linhas, de uma vez)
    // quando o pouso começa a preencher o centro; S.hv apaga/acende a zona
    // de leitura que esmaece os cards atrás dele
    function syncHead(t, dir) {
      const on = headEntered && t < HEAD_OUT;
      if (on === headOn) return;
      headOn = on;
      play(headG, on, dir);
      gsap.to(S, { hv: on ? 1 : 0, duration: on ? 0.35 : 0.8, ease: on ? 'power2.out' : 'power2.inOut', overwrite: 'auto', onUpdate: render });
    }
    let lastT = 0;
    let progOn = false;
    let finOn = false;

    function setProg(on) {
      if (progOn === on) return;
      progOn = on;
      gsap.to(prog, { opacity: on ? 1 : 0, y: on ? 0 : 10, duration: on ? 0.7 : 0.4, ease: on ? 'expo.out' : 'power2.in', overwrite: 'auto' });
    }
    function roll(c) {
      gsap.to(progRoll, { yPercent: (-100 / 3) * c, duration: 0.8, ease: 'expo.out', overwrite: 'auto' });
    }

    function thresholds(t) {
      const dir = t >= lastT ? 1 : -1;
      syncHead(t, dir);
      let active = -1;
      for (let c = 0; c < 3; c++) {
        if (t >= txtIn(c) && t < txtOut(c)) active = c;
      }
      if (active !== curCh) {
        if (curCh >= 0) play(chG[curCh], false, dir);
        if (active >= 0) { play(chG[active], true, dir); roll(active); }
        curCh = active;
      }
      setProg(t >= txtIn(0) - 0.4 && t < txtOut(2) + 1);
      const f = t >= FINAL_AT;
      if (f !== finOn) {
        finOn = f;
        play(finG, f, dir);
        fin.classList.toggle('is-on', f);
      }
    }

    function onTick() {
      const t = tl.time();
      tNow = t;
      render();
      thresholds(t);
      if (Math.abs(t - lastT) > 0.0001) syncVideos();
      lastT = t;
    }
    tl.eventCallback('onUpdate', onTick);

    /* ---------- ScrollTriggers ---------- */

    let st;
    let est;
    // com a rolagem suave do site a roda já chega suavizada: a cena soma só
    // um pouco de inércia (no total, a mesma sensação da rolagem nativa com
    // 1.2). Os 1.2 em cima da rolagem suave deixavam a seção quase 2s atrás
    // do gesto
    const SMOOTHED = document.documentElement.classList.contains('has-smooth-scroll');
    const LAG = SMOOTHED ? 0.6 : 1.2;
    const LAG_IN = SMOOTHED ? 0.5 : 1;
    ctx.add(() => {
      // chegada: antes de fixar, os primeiros cards já saem do ponto de fuga
      const etl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
      etl.fromTo(S, { win: 0 }, { win: 1, duration: 1 }, 0)
        // o fundo acende tirando um véu escuro de cima dele, nunca mexendo na
        // opacidade do grupo: com opacidade < 1 o grupo fica isolado e a malha
        // de pontos (overlay) aparecia forte e verde até sumir de repente em 1
        .fromTo(veil, { opacity: 1 }, { opacity: 0, duration: 0.75 }, 0)
        .fromTo(headIn, { y: G.vh * 0.1 }, { y: 0, duration: 1, ease: 'power1.out' }, 0);
      etl.eventCallback('onUpdate', render);
      est = ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'top top',
        scrub: LAG_IN,
        animation: etl
      });

      // o título entra em linhas mascaradas quando já está à vista
      ScrollTrigger.create({
        trigger: section,
        start: 'top 42%',
        end: 'max',
        onEnter: () => { headEntered = true; syncHead(tl.time(), 1); },
        onLeaveBack: () => { headEntered = false; syncHead(tl.time(), -1); }
      });

      st = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: LAG,
        animation: tl
      });

      ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => {
          sectionLive = self.isActive;
          // a flutuação (CSS) só anda com a seção à vista
          section.classList.toggle('od-live', sectionLive);
          syncVideos();
        }
      });
    });
    cleanups.push(() => section.classList.remove('od-live'));

    // acessibilidade: o CTA focado por teclado leva até a frase final
    const cta = finCta.querySelector('a');
    const onFocus = () => {
      if (finOn || !st) return;
      scrollTo(0, st.start + (st.end - st.start) * ((T - 13) / T));
    };
    cta.addEventListener('focus', onFocus);
    cleanups.push(() => cta.removeEventListener('focus', onFocus));

    measureHead();
    render();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measureHead(); render(); });

    // gancho de depuração (só com data-debug na seção):
    // __od.seek(unidade) pula para um ponto da história
    if (section.hasAttribute('data-debug')) window.__od = {
      tl, S, G, lifts, get plan() { return planDbg; },
      get st() { return st; },
      get est() { return est; },
      seek(u) {
        const y = st.start + (st.end - st.start) * (u / T);
        scrollTo(0, y);
        ScrollTrigger.update();
        const tw = st.getTween && st.getTween();
        if (tw) tw.progress(1);
        const tw2 = est.getTween && est.getTween();
        if (tw2) tw2.progress(1);
        return tl.time();
      },
      seekEntrance(p) {
        const y = est.start + (est.end - est.start) * p;
        scrollTo(0, y);
        ScrollTrigger.update();
        const tw = est.getTween && est.getTween();
        if (tw) tw.progress(1);
        return S.win;
      }
    };

    return {
      kill() {
        ctx.revert();
        cleanups.reverse().forEach((fn) => fn());
        if (window.__od && window.__od.tl === tl) delete window.__od;
      }
    };
  }
})();
