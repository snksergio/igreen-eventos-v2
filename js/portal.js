/* ============================================================
   iGreen hero — mosaico de histórias
   Sete colunas de clipes em vale: cada coluna começa logo abaixo do
   texto que estiver acima dela (medido de verdade), então as laterais
   sobem ao lado do título e o centro desce sob os botões — sem nunca
   encostar no texto, em qualquer tamanho de tela.
   ============================================================ */

(() => {
  gsap.registerPlugin(Draggable, InertiaPlugin);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = document.querySelector('.hero');
  // the mosaic hero may be absent (the wall hero in js/hero-c.js drives its own clips)
  const mosaic = hero ? hero.querySelector('.mosaic') : null;
  const cols = mosaic ? Array.from(mosaic.querySelectorAll('.m-col')) : [];
  const copyParts = !mosaic ? [] : Array.from(hero.querySelectorAll('.hero-badge, .title .line, .hero-copy .sub, .hero-copy .actions, .hero-copy .next-stop'));

  const CLEAR_X = 28;  // horizontal breathing room kept around the copy
  const CLEAR_Y = 44;  // gap between the copy and a column that starts below it
  const STEP = 34;     // each column inward sits at least this much lower
  const DIP = 48;      // extra depth for the centre of the valley

  const visibleCols = () => cols.filter(c => c.offsetParent !== null);

  // rect without the entrance offset GSAP may be holding on the element
  const restingRect = (el) => {
    const r = el.getBoundingClientRect();
    const y = parseFloat(gsap.getProperty(el, 'y')) || 0;
    return { left: r.left, right: r.right, top: r.top - y, bottom: r.bottom - y };
  };

  /* ---------- valley layout ---------- */

  function layoutMosaic() {
    mosaic.style.marginTop = '';
    cols.forEach(c => { c.style.marginTop = ''; });
    const vis = visibleCols();
    const n = vis.length;
    if (!n) return;

    const parts = copyParts.map(restingRect);
    const titleR = restingRect(hero.querySelector('.title'));
    const base = mosaic.getBoundingClientRect().top;
    const baseMargin = parseFloat(getComputedStyle(mosaic).marginTop) || 0;
    const mid = (n - 1) / 2;
    // the highest a column may start: beside the title's second line
    const ceiling = titleR.top + (titleR.bottom - titleR.top) * 0.42;

    const tops = vis.map((col, i) => {
      const r = col.getBoundingClientRect();
      let top = ceiling;
      parts.forEach(p => {
        if (p.right + CLEAR_X > r.left && p.left - CLEAR_X < r.right) top = Math.max(top, p.bottom + CLEAR_Y);
      });
      const t = mid ? Math.abs(i - mid) / mid : 0; // 0 at the centre, 1 at the edges
      return top + (1 - t) * DIP;
    });

    // smooth the valley from the outside in, then mirror it
    for (let i = 1; i <= Math.floor(mid); i++) {
      tops[i] = Math.max(tops[i], tops[i - 1] + STEP);
      tops[n - 1 - i] = Math.max(tops[n - 1 - i], tops[n - i] + STEP);
    }
    for (let i = 0; i < Math.floor(n / 2); i++) {
      const d = Math.max(tops[i], tops[n - 1 - i]);
      tops[i] = tops[n - 1 - i] = d;
    }

    const minTop = Math.min(...tops);
    mosaic.style.marginTop = (baseMargin + minTop - base).toFixed(1) + 'px';
    vis.forEach((col, i) => { col.style.marginTop = (tops[i] - minTop).toFixed(1) + 'px'; });
  }

  /* ---------- scroll parallax: the edges lift faster, the valley opens ---------- */

  let factors = [];
  const measureParallax = () => {
    const vis = visibleCols();
    const mid = (vis.length - 1) / 2;
    factors = cols.map(c => {
      const i = vis.indexOf(c);
      if (i < 0) return 0;
      const t = mid ? Math.abs(i - mid) / mid : 0;
      return 0.05 + 0.17 * t;
    });
  };
  function parallax() {
    const y = Math.min(window.scrollY, hero.offsetHeight);
    cols.forEach((c, i) => { c.style.transform = factors[i] ? `translate3d(0,${(-y * factors[i]).toFixed(1)}px,0)` : ''; });
  }

  /* ---------- clips: a few play at a time and take turns ----------
     The clip inside the sentence always plays (while on screen). In the
     mosaic only LIVE clips play at once, drawn at random among the tiles
     really on show (on screen and above the bottom fade), and every few
     seconds one hands over to another; the rest show their poster as a
     still. Hovering a tile plays it. The tile clips carry no autoplay and
     preload only metadata, so each one downloads the first time it plays. */

  const titleVideo = mosaic ? hero.querySelector('.title-clip video') : null;
  const tileVideos = mosaic ? Array.from(mosaic.querySelectorAll('.tile video')) : [];
  const playV = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };

  if (!mosaic) {
    // nothing to drive here
  } else if (reducedMotion) {
    if (titleVideo) { titleVideo.removeAttribute('autoplay'); titleVideo.pause(); }
  } else if ('IntersectionObserver' in window) {
    const LIVE = 4;
    const live = new Set();
    let hovered = null;
    let heroOn = true;

    // on show: its column is displayed, it's on screen and its centre sits
    // above the mosaic's bottom fade (below that a clip is barely visible)
    const onShow = (v) => {
      const tile = v.closest('.tile');
      if (!tile || tile.offsetParent === null) return false;
      const r = tile.getBoundingClientRect();
      const m = mosaic.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight && r.top + r.height / 2 < m.top + m.height * 0.6;
    };
    const sync = (v) => {
      if (heroOn && !document.hidden && (live.has(v) || v === hovered)) playV(v);
      else if (!v.paused) v.pause();
    };

    const rotate = () => {
      if (heroOn && !document.hidden) {
        Array.from(live).forEach((v) => { if (!onShow(v)) { live.delete(v); sync(v); } });
        const idle = tileVideos.filter((v) => !live.has(v) && v !== hovered && onShow(v));
        // one hands over: a random live clip stops, a random idle one starts
        if (live.size >= LIVE && idle.length) {
          const out = Array.from(live)[Math.floor(Math.random() * live.size)];
          live.delete(out);
          sync(out);
        }
        while (live.size < LIVE && idle.length) {
          const v = idle.splice(Math.floor(Math.random() * idle.length), 1)[0];
          live.add(v);
          sync(v);
        }
      }
      setTimeout(rotate, 2600 + Math.random() * 1800);
    };

    tileVideos.forEach((v) => {
      const tile = v.closest('.tile');
      tile.addEventListener('pointerenter', () => { hovered = v; sync(v); });
      tile.addEventListener('pointerleave', () => { if (hovered === v) hovered = null; sync(v); });
    });

    new IntersectionObserver((entries) => {
      heroOn = entries[entries.length - 1].isIntersecting;
      tileVideos.forEach(sync);
    }).observe(hero);

    if (titleVideo) {
      new IntersectionObserver((entries) => {
        if (entries[entries.length - 1].isIntersecting && !document.hidden) playV(titleVideo);
        else titleVideo.pause();
      }, { rootMargin: '80px 0px' }).observe(titleVideo.closest('.title-clip'));
    }

    document.addEventListener('visibilitychange', () => tileVideos.forEach(sync));
    rotate();
  }

  // tiles ordered from the centre column outward (entrance order)
  const heroTiles = () => {
    const vis = visibleCols();
    const mid = (vis.length - 1) / 2;
    return vis
      .map((c, i) => ({ c, d: Math.abs(i - mid) }))
      .sort((a, b) => a.d - b.d)
      .flatMap(o => Array.from(o.c.querySelectorAll('.tile')));
  };

  let raf = 0;
  const relayout = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      layoutMosaic();
      measureParallax();
      if (!reducedMotion) parallax();
    });
  };

  if (mosaic) {
    layoutMosaic();
    measureParallax();
    window.addEventListener('resize', relayout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    if (!reducedMotion) window.addEventListener('scroll', parallax, { passive: true });
  }

  /* ---------- speaker detail overlay (FLIP from the clicked card) ---------- */

  // shared with the speakers carousel: freezes the auto-scroll while the
  // speaker modal is open so the closing FLIP lands on a still card
  let carFrozen = false;

  const spkModal = document.querySelector('.spk-modal');

  if (spkModal) {
    const SPEAKERS = {
      'Thiago': {
        first: 'Thiago', last: 'Almeida', role: 'CEO & Fundador',
        desc: 'Fundador da iGreen. Há dez anos transformando trabalho em oportunidade: energia limpa por assinatura, telecom e seguros em um só lugar. Viu de perto pessoas saírem do zero para uma renda recorrente — e aprendeu que transformação é método, não sorte.',
        talk: 'Do primeiro cliente à renda recorrente',
        when: '21 Ago · 19:30', where: 'Palco Principal — Teatro B32', addr: 'Av. Faria Lima 3732 · São Paulo',
        handle: '@thiagoalmeida',
        stats: [{ value: 340, tail: '+', label: 'Licenciados formados' }, { value: 180, prefix: 'R$', tail: 'K/mês', label: 'Renda recorrente' }]
      },
      'Amanda': {
        first: 'Amanda', last: 'Duarte', role: 'Head de Marketing',
        desc: 'Lidera a comunicação da iGreen em todos os canais. Obcecada pelos detalhes que ninguém nota e todo mundo sente — a mensagem, o ritmo e a história certa na hora certa, que decide se uma oportunidade chega a quem precisa dela.',
        talk: 'A marca que abre portas pelo Brasil',
        when: '21 Ago · 17:00', where: 'Sala Criativa — Teatro B32', addr: 'Av. Faria Lima 3732 · São Paulo',
        handle: '@amandaduarte',
        stats: [{ value: 120, tail: '+', label: 'Campanhas lançadas' }, { value: 96, tail: '%', label: 'Retenção de clientes' }]
      },
      'Rafael Costa': {
        first: 'Rafael', last: 'Costa', role: 'Diretor de Estratégia',
        desc: 'Constrói os planos de crescimento dos licenciados. Transforma ideias soltas em rotinas que compõem resultado: posicionamento, constância e a disciplina de escolher onde investir o próprio tempo.',
        talk: 'Um negócio que cresce todo mês',
        when: '22 Ago · 10:00', where: 'Palco Principal — Teatro B32', addr: 'Av. Faria Lima 3732 · São Paulo',
        handle: '@rafaelcosta',
        stats: [{ value: 85, tail: '+', label: 'Planos de expansão' }, { value: 120, prefix: 'R$', tail: 'K/mês', label: 'Carteiras geridas' }]
      },
      'Ana Beltrão': {
        first: 'Ana', last: 'Beltrão', role: 'Head de Expansão',
        desc: 'Abre as novas cidades da iGreen, onde cada praça tem um porquê e cada equipe tem um plano. Acredita que expansão boa é a que não aparece — e a excelente é a que transforma a região inteira.',
        talk: 'Novas cidades, novas histórias',
        when: '22 Ago · 14:30', where: 'Espaço Conexão — Espaço Girassol', addr: 'R. dos Pinheiros 498 · São Paulo',
        handle: '@anabeltrao',
        stats: [{ value: 60, tail: '+', label: 'Cidades ativadas' }, { value: 98, tail: '%', label: 'Satisfação dos times' }]
      },
      'Bruno Sales': {
        first: 'Bruno', last: 'Sales', role: 'Diretor Comercial',
        desc: 'Comanda o time comercial da iGreen: atendimento certeiro, zero oportunidade desperdiçada. Sua regra de ouro — vender é servir, e toda conversa precisa deixar o cliente melhor do que o encontrou.',
        talk: 'Vender é servir: o método iGreen',
        when: '22 Ago · 16:00', where: 'Estúdio B — Espaço Girassol', addr: 'R. dos Pinheiros 498 · São Paulo',
        handle: '@brunosales',
        stats: [{ value: 500, tail: '+', label: 'Times treinados' }, { value: 40, tail: 'K+', label: 'Clientes atendidos' }]
      },
      'Carla Mendes': {
        first: 'Carla', last: 'Mendes', role: 'Head de Comunidade',
        desc: 'Cultiva comunidades que permanecem. Guiada por dados e movida por cultura, mapeia por que as pessoas chegam, indicam e ficam — e é abertamente alérgica a métricas de vaidade.',
        talk: 'Comunidades se convidam, não se compram',
        when: '23 Ago · 11:00', where: 'Palco Principal — Teatro B32', addr: 'Av. Faria Lima 3732 · São Paulo',
        handle: '@carlamendes',
        stats: [{ value: 230, tail: '+', label: 'Encontros realizados' }, { value: 120, prefix: 'R$', tail: 'K/mês', label: 'Renda recorrente' }]
      },
      'Juliana Reis': {
        first: 'Juliana', last: 'Reis', role: 'Head de Treinamento',
        desc: 'Comanda a formação dos licenciados na iGreen: método afiado, nenhum passo desperdiçado. Trata cada aula como uma promessa a quem está começando — e ensina cada turma a cumpri-la.',
        talk: 'Do zero ao primeiro contrato',
        when: '23 Ago · 15:00', where: 'Estúdio B — Espaço Girassol', addr: 'R. dos Pinheiros 498 · São Paulo',
        handle: '@julianareis',
        stats: [{ value: 900, tail: '+', label: 'Aulas ministradas' }, { value: 12, tail: 'K+', label: 'Alunos formados' }]
      },
      'Pedro Rocha': {
        first: 'Pedro', last: 'Rocha', role: 'Head de Telecom',
        desc: 'Cuida do braço de telecom da iGreen: planos, cobertura e o 5G que virou a segunda fonte de renda dos licenciados. As pessoas perdoam quase tudo, diz ele — nunca ficar sem sinal.',
        talk: '5G: a segunda fonte de renda',
        when: '23 Ago · 17:30', where: 'Espaço Conexão — Espaço Girassol', addr: 'R. dos Pinheiros 498 · São Paulo',
        handle: '@pedrorocha',
        stats: [{ value: 300, tail: '+', label: 'Cidades cobertas' }, { value: 25, tail: 'K+', label: 'Linhas ativas' }]
      }
    };

    const mFirst = spkModal.querySelector('.spk-first');
    const mLast = spkModal.querySelector('.spk-last');
    const mWrap = spkModal.querySelector('.spk-photo-wrap');
    const mPhoto = spkModal.querySelector('.spk-photo');
    const mVeil = spkModal.querySelector('.spk-veil');
    const mRole = spkModal.querySelector('.spk-role');
    const mDesc = spkModal.querySelector('.spk-desc');
    const mTalk = spkModal.querySelector('.spk-agenda-talk');
    const mWhen = spkModal.querySelector('.spk-agenda-when');
    const mWhere = spkModal.querySelector('.spk-agenda-where');
    const mAddr = spkModal.querySelector('.spk-agenda-addr');
    const mSocs = spkModal.querySelectorAll('.spk-soc');
    const mStatVals = spkModal.querySelectorAll('.spk-stat-val');
    const mStatTails = spkModal.querySelectorAll('.spk-stat-tail');
    const mStatLabels = spkModal.querySelectorAll('.spk-stat-label');
    const cornerEls = spkModal.querySelectorAll('.spk-info, .spk-agenda, .spk-seal, .spk-close');

    const runStats = (stats) => {
      gsap.killTweensOf('.spk-stat-anim-proxy');
      (stats || []).slice(0, 2).forEach((s, i) => {
        const val = mStatVals[i];
        const prefix = s.prefix || '';
        mStatTails[i].textContent = s.tail || '';
        mStatLabels[i].textContent = s.label || '';
        if (reduced) { val.textContent = prefix + s.value; return; }
        const obj = { n: 0 };
        val.textContent = prefix + '0';
        gsap.to(obj, {
          n: s.value,
          duration: 1.5,
          delay: 0.55 + i * 0.15,
          ease: 'power2.out',
          onUpdate: () => { val.textContent = prefix + Math.round(obj.n); }
        });
      });
    };

    let openCard = null;
    let busy = false;

    // hard freeze — synthetic hover events could be undone by real pointer
    // moves while the modal covers the page, letting the track drift and the
    // closing FLIP fly to a stale position
    const pauseCarousel = (on) => {
      carFrozen = on;
    };

    const openSpeaker = (card) => {
      if (busy || spkModal.classList.contains('open')) return;
      busy = true;
      openCard = card;
      pauseCarousel(true);

      const name = card.querySelector('h3').textContent.trim();
      const d = SPEAKERS[name] || {
        first: name.split(' ')[0], last: name.split(' ')[1] || '',
        role: card.querySelector('.speaker-info p').textContent.trim(),
        desc: '', talk: '', when: 'Em breve', where: 'São Paulo', addr: ''
      };
      const cardImg = card.querySelector('.speaker-photo');

      mFirst.textContent = d.first;
      mLast.textContent = d.last;
      mRole.textContent = d.role;
      mDesc.textContent = d.desc;
      mTalk.textContent = d.talk;
      mWhen.textContent = d.when;
      mWhere.textContent = d.where;
      mAddr.textContent = d.addr;
      mSocs.forEach(s => { s.title = d.handle || '@' + (d.first + d.last).toLowerCase(); });
      runStats(d.stats);
      mPhoto.src = cardImg.src;
      mPhoto.alt = name;

      spkModal.classList.add('open');
      spkModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      gsap.set(mWrap, { xPercent: -50, x: 0, y: 0, scale: 1 });

      requestAnimationFrame(() => {
        const r0 = cardImg.getBoundingClientRect();
        const r1 = mWrap.getBoundingClientRect();
        cardImg.style.visibility = 'hidden';

        if (reduced) {
          gsap.set([mVeil, spkModal.querySelector('.spk-backdrop'), mFirst, mLast, ...cornerEls], { opacity: 1 });
          busy = false;
          return;
        }

        const tl = gsap.timeline({ onComplete: () => { busy = false; } });
        tl.fromTo(mVeil, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0)
          .fromTo(spkModal.querySelector('.spk-backdrop'), { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' }, 0)
          .fromTo(mWrap,
            { x: r0.left - r1.left, y: r0.top - r1.top, scale: r0.height / r1.height },
            { x: 0, y: 0, scale: 1, duration: 0.72, ease: 'power3.inOut' }, 0)
          .fromTo(mFirst, { x: -80, opacity: 0, filter: 'blur(6px)' }, { x: 0, opacity: 1, filter: 'blur(0px)', duration: 0.6, ease: 'power3.out' }, 0.28)
          .fromTo(mLast, { x: 80, opacity: 0, filter: 'blur(6px)' }, { x: 0, opacity: 1, filter: 'blur(0px)', duration: 0.6, ease: 'power3.out' }, 0.38)
          .fromTo(cornerEls, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', stagger: 0.06 }, 0.5);
      });
    };

    const closeSpeaker = () => {
      if (busy || !spkModal.classList.contains('open')) return;
      busy = true;
      const cardImg = openCard ? openCard.querySelector('.speaker-photo') : null;

      const finish = () => {
        spkModal.classList.remove('open');
        spkModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (cardImg) cardImg.style.visibility = '';
        pauseCarousel(false);
        openCard = null;
        busy = false;
      };

      if (reduced || !cardImg) { finish(); return; }

      const r0 = cardImg.getBoundingClientRect();
      const r1 = mWrap.getBoundingClientRect();
      const tl = gsap.timeline({ onComplete: finish });
      tl.to([mFirst, mLast, ...cornerEls], { opacity: 0, duration: 0.22, ease: 'power1.in' }, 0)
        .to(mWrap, {
          x: r0.left - (r1.left - gsap.getProperty(mWrap, 'x')),
          y: r0.top - (r1.top - gsap.getProperty(mWrap, 'y')),
          scale: r0.height / (r1.height / gsap.getProperty(mWrap, 'scale')),
          duration: 0.5,
          ease: 'power3.inOut'
        }, 0.05)
        .to(spkModal.querySelector('.spk-backdrop'), { opacity: 0, duration: 0.32, ease: 'power1.in' }, 0.2)
        .to(mVeil, { opacity: 0, duration: 0.3, ease: 'power1.in' }, 0.28);
    };

    // click vs drag: only open when the pointer barely moved
    // (delegated — the carousel rebuilds its cards when tripling the set)
    let downX = 0, downY = 0;
    document.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; }, true);
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.speakers-track .speaker');
      if (!card) return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return;
      openSpeaker(card);
    });

    spkModal.querySelector('.spk-close').addEventListener('click', closeSpeaker);
    spkModal.querySelector('.spk-backdrop').addEventListener('click', closeSpeaker);
    mVeil.addEventListener('click', closeSpeaker);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSpeaker(); });
  }

  /* ---------- statement section: words light up on scroll ---------- */

  const stWords = Array.from(document.querySelectorAll('.statement .sw'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (stWords.length && !document.querySelector('.statement.has-blend')) {
    if (reduced) {
      stWords.forEach(w => { w.style.opacity = 1; });
    } else {
      const textBlock = document.querySelector('.statement h2');
      const revealUpdate = () => {
        const r = textBlock.getBoundingClientRect();
        const end = (window.innerHeight - r.height) / 2; // block top when perfectly centered -> 100%
        const start = end + window.innerHeight * 0.70;   // same reveal length (~0.7 viewport of scroll)
        const p = Math.min(1, Math.max(0, (start - r.top) / (start - end)));
        for (let i = 0; i < stWords.length; i++) {
          const wp = Math.min(1, Math.max(0, p * stWords.length - i));
          stWords[i].style.opacity = (0.14 + 0.86 * wp).toFixed(3);
        }
      };
      window.addEventListener('scroll', revealUpdate, { passive: true });
      window.addEventListener('resize', revealUpdate, { passive: true });
      revealUpdate();
    }
  }

  /* ---------- speakers carousel: auto-scroll, pause on hover, free drag ---------- */

  const carShell = document.querySelector('.speakers-carousel');
  const carTrack = document.querySelector('.speakers-track');

  if (carShell && carTrack) {
    // triple the set so drags in either direction stay seamless
    const setHTML = carTrack.innerHTML;
    carTrack.innerHTML = setHTML + setHTML + setHTML;

    let setW = 0;
    let pos = 0;
    let hovering = false;
    let dragging = false;
    const SPEED = 36; // px per second
    const setX = gsap.quickSetter(carTrack, 'x', 'px');

    const wrapPos = (v) => {
      if (!setW) return v;
      while (v <= -2 * setW) v += setW;
      while (v > -setW) v -= setW;
      return v;
    };
    const measure = () => {
      setW = carTrack.scrollWidth / 3;
      pos = wrapPos(pos || -setW);
      setX(pos);
    };
    requestAnimationFrame(measure);
    window.addEventListener('resize', measure);

    // off screen the strip stands still (no per-frame work while the visitor
    // is in other sections)
    let carVisible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        carVisible = entries[entries.length - 1].isIntersecting;
      }, { rootMargin: '100px 0px' }).observe(carShell);
    }

    gsap.ticker.add((time, dt) => {
      if (!carVisible || carFrozen || hovering || dragging || reduced || !setW) return;
      pos = wrapPos(pos - SPEED * (dt / 1000));
      setX(pos);
    });

    carShell.addEventListener('mouseenter', () => { hovering = true; });
    carShell.addEventListener('mouseleave', () => { hovering = false; });

    Draggable.create(carTrack, {
      type: 'x',
      inertia: true,
      onPress() {
        dragging = true;
        carShell.classList.add('dragging');
        gsap.set(carTrack, { x: pos });
        this.update();
      },
      onDrag() { pos = this.x; },
      onThrowUpdate() { pos = this.x; },
      onRelease() {
        carShell.classList.remove('dragging');
        if (!this.tween || !this.tween.isActive()) {
          pos = wrapPos(pos);
          gsap.set(carTrack, { x: pos });
          dragging = false;
        }
      },
      onThrowComplete() {
        pos = wrapPos(pos);
        gsap.set(carTrack, { x: pos });
        dragging = false;
      }
    });
  }

  /* ---------- entrance: one orchestrated moment — the copy settles, the
     clip opens inside the sentence, the mosaic unfolds from the centre and
     powers on (grey to colour) in the same order ---------- */

  if (reduced || !mosaic) return;

  const order = heroTiles();
  const orderVideos = order.map(t => t.querySelector('video'));

  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.topnav', { opacity: 0, duration: 0.6 }, 0)
    .from('.hero-badge', { opacity: 0, y: 14, duration: 0.7 }, 0.1)
    .from('.title .line', { opacity: 0, y: 26, duration: 0.9, stagger: 0.09 }, 0.18)
    .from('.title-clip', { scale: 0.3, opacity: 0, duration: 0.9, ease: 'back.out(1.6)' }, 0.62)
    .from(['.hero-copy .sub', '.hero-copy .actions', '.hero-copy .next-stop'], { opacity: 0, y: 14, duration: 0.8, stagger: 0.08 }, 0.5)
    .from(order, { opacity: 0, y: 70, duration: 1.2, ease: 'expo.out', stagger: 0.05, clearProps: 'transform,opacity' }, 0.45)
    .fromTo(orderVideos,
      { filter: 'grayscale(1) brightness(0.55)' },
      { filter: 'grayscale(0) brightness(1)', duration: 1.3, ease: 'power2.inOut', stagger: 0.07, clearProps: 'filter' }, 0.9);
})();

/* ============================================================
   Tour section — city rows, cursor-follow photo, accordion
   ============================================================ */

(() => {
  const tourSec = document.querySelector('.tour');
  if (!tourSec || typeof gsap === 'undefined') return;

  const TOUR = [
    {
      city: 'Goiânia', uf: 'GO', date: '16 Ago', day: 'Domingo', checkin: '14h00', start: '14h30',
      venue: 'Centro de Convenções', addr: 'R. 4, 1400 · St. Central · Goiânia - GO',
      vip: 'Thiago Almeida', vipRole: 'CEO & Fundador', photo: 'speakers/thiago-cut.png'
    },
    {
      city: 'São Paulo', uf: 'SP', date: '23 Ago', day: 'Domingo', checkin: '09h00', start: '09h30',
      venue: 'Expo Center Norte', addr: 'R. José Bernardo Pinto, 333 · Vila Guilherme · São Paulo - SP',
      vip: 'Amanda Duarte', vipRole: 'Head de Marketing', photo: 'speakers/amanda-cut.png'
    },
    {
      city: 'Belo Horizonte', uf: 'MG', date: '30 Ago', day: 'Domingo', checkin: '14h00', start: '14h30',
      venue: 'Minascentro', addr: 'Av. Augusto de Lima, 785 · Centro · Belo Horizonte - MG',
      vip: 'Rafael Costa', vipRole: 'Diretor de Estratégia', photo: 'speakers/rafael-cut.png'
    },
    {
      city: 'Curitiba', uf: 'PR', date: '6 Set', day: 'Domingo', checkin: '13h30', start: '14h00',
      venue: 'Teatro Positivo', addr: 'R. Pedro Viriato Parigot de Souza, 5300 · Curitiba - PR',
      vip: 'Ana Beltrão', vipRole: 'Head de Expansão', photo: 'speakers/ana-cut.png'
    },
    {
      city: 'Recife', uf: 'PE', date: '13 Set', day: 'Domingo', checkin: '09h00', start: '09h30',
      venue: 'Centro de Convenções PE', addr: 'Av. Prof. Andrade Bezerra, s/n · Salgadinho · Olinda - PE',
      vip: 'Carla Mendes', vipRole: 'Head de Comunidade', photo: 'speakers/carla-cut.png'
    },
    {
      city: 'Rio de Janeiro', uf: 'RJ', date: '20 Set', day: 'Domingo', checkin: '14h00', start: '14h30',
      venue: 'Riocentro', addr: 'Av. Salvador Allende, 6555 · Barra da Tijuca · Rio de Janeiro - RJ',
      vip: 'Pedro Rocha', vipRole: 'Head de Telecom', photo: 'speakers/pedro-cut.png'
    }
  ];

  const PIN = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.6" stroke="currentColor" stroke-width="1.6"/></svg>';
  const PLUS = '<svg viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  const ARROW = '<span class="chip chip-dark"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16.5 7.5L6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 6.18791C8 6.18791 16.0479 5.50949 17.2692 6.73079C18.4906 7.95209 17.812 16 17.812 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';

  const tourList = tourSec.querySelector('.tour-list');
  tourList.innerHTML = TOUR.map((t, i) => `
    <article class="tour-row" data-i="${i}">
      <div class="tour-row-head" role="button" tabindex="0" aria-expanded="false">
        <span class="tour-idx">[ 0${i + 1} ]</span>
        <h3 class="tour-city">${t.city}<span class="tour-uf">–${t.uf}</span></h3>
        <span class="tour-when">
          <span class="tour-date">${t.date} · ${t.day}</span>
          <span class="tour-times">Check-in ${t.checkin} · Início ${t.start}</span>
        </span>
        <span class="tour-plus">${PLUS}</span>
      </div>
      <div class="tour-more">
        <div class="tour-more-inner">
          <span class="tour-tag">Evento presencial · Vagas limitadas</span>
          <div class="tour-venue">
            ${PIN}
            <div>
              <p class="tour-venue-name">${t.venue}</p>
              <p class="tour-venue-addr">${t.addr}</p>
            </div>
          </div>
          <div class="tour-vip">
            <p class="tour-vip-label">Presença VIP</p>
            <p class="tour-vip-name">${t.vip}</p>
            <p class="tour-vip-role">${t.vipRole}</p>
          </div>
          <div class="tour-actions">
            <a class="btn-primary" href="#">Garantir ingresso${ARROW}</a>
            <a class="btn-ghost" href="#">Ver no mapa</a>
          </div>
        </div>
      </div>
    </article>`).join('');

  /* ---------- floating photo follows the cursor ---------- */

  const tourInner = tourSec.querySelector('.tour-inner');
  const tFloat = tourSec.querySelector('.tour-float');
  const tImg = tFloat.querySelector('.tour-float-img');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  TOUR.forEach(t => { const im = new Image(); im.src = t.photo; });

  const FLOAT_OFF_X = 64; // photo sits to the right of the plus cursor, clear of the content
  // the photo and the plus cursor share the same smoothing, so they travel as
  // one piece: the gap between them never closes, whatever the mouse speed
  const FOLLOW = { duration: 0.2, ease: 'power3' };
  gsap.set(tFloat, { yPercent: -54, scale: 0.7, autoAlpha: 0 });
  const qx = gsap.quickTo(tFloat, 'x', FOLLOW);
  const qy = gsap.quickTo(tFloat, 'y', FOLLOW);

  let hot = null;
  let floatOn = false;
  let px = 0, py = 0; // last pointer position in viewport space

  /* ---------- plus cursor over the city rows (fine pointers only) ----------
     The arrow becomes a lime "+" that spins in on a city, does a quick
     half-turn when hopping to the next one and settles as "×" on an open city */

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let cur = null;
  let cqx = null;
  let cqy = null;
  if (finePointer) {
    cur = document.createElement('div');
    cur.className = 'tour-cursor';
    cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
    document.body.appendChild(cur);
    tourSec.classList.add('has-plus-cursor');
    gsap.set(cur, { xPercent: -50, yPercent: -50, scale: 0.2, rotation: -135, autoAlpha: 0 });
    cqx = gsap.quickTo(cur, 'x', FOLLOW);
    cqy = gsap.quickTo(cur, 'y', FOLLOW);
  }
  const restAngle = (row) => (row && row.classList.contains('open') ? 45 : 0);
  let curShown = false;
  let hideCall = null;
  const cursorFor = (row) => {
    if (!cur) return;
    if (hideCall) { hideCall.kill(); hideCall = null; }
    if (row) {
      gsap.killTweensOf(cur, 'scale,rotation,autoAlpha,opacity,visibility');
      if (!curShown) {
        curShown = true;
        gsap.set(cur, { x: px, y: py });
        gsap.fromTo(cur,
          { scale: 0.2, rotation: -135, autoAlpha: 0 },
          { scale: 1, rotation: restAngle(row), autoAlpha: 1, duration: reduced ? 0 : 0.55, ease: 'back.out(1.7)' });
      } else {
        // hopping to the next city: stay visible, just a quick half-turn
        gsap.to(cur, { scale: 1, autoAlpha: 1, duration: 0.2, ease: 'power2.out' });
        gsap.fromTo(cur, { rotation: restAngle(row) - 90 }, { rotation: restAngle(row), duration: reduced ? 0 : 0.45, ease: 'back.out(2)' });
      }
    } else if (curShown) {
      // short grace period, so a quick pass over an edge never makes it blink
      hideCall = gsap.delayedCall(0.12, () => {
        hideCall = null;
        curShown = false;
        gsap.killTweensOf(cur, 'scale,rotation,autoAlpha,opacity,visibility');
        gsap.to(cur, { scale: 0.2, rotation: 90, autoAlpha: 0, duration: reduced ? 0 : 0.25, ease: 'power2.in' });
      });
    }
  };

  const localPos = () => {
    const r = tourInner.getBoundingClientRect();
    return { x: px - r.left, y: py - r.top };
  };

  const setHot = (row) => {
    if (row === hot) return;
    if (hot) hot.classList.remove('is-hot');
    hot = row;
    cursorFor(row);
    if (row) {
      row.classList.add('is-hot');
      const t = TOUR[+row.dataset.i];
      if (tImg.getAttribute('src') !== t.photo) {
        tImg.src = t.photo;
        gsap.fromTo(tImg, { opacity: 0.35 }, { opacity: 1, duration: 0.3, ease: 'power1.out' });
      }
      if (!floatOn && !reduced) {
        floatOn = true;
        const p = localPos();
        gsap.set(tFloat, { x: p.x + FLOAT_OFF_X, y: p.y }); // pop at the cursor, no cross-page slide
        gsap.to(tFloat, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(1.5)' });
      }
    } else if (floatOn) {
      floatOn = false;
      gsap.to(tFloat, { autoAlpha: 0, scale: 0.7, duration: 0.3, ease: 'power2.in' });
    }
  };

  // the whole row counts (hairline border included) except its open details,
  // so moving from one city to the next never passes through "nothing"
  const hotFromTarget = (el) => {
    if (!el || !el.closest) { setHot(null); return; }
    const row = el.closest('.tour-row');
    setHot(row && !el.closest('.tour-more') ? row : null);
  };

  tourSec.addEventListener('pointermove', (e) => {
    px = e.clientX;
    py = e.clientY;
    if (cur) { cqx(px); cqy(py); }
    hotFromTarget(e.target);
    if (floatOn) {
      const p = localPos();
      qx(p.x + FLOAT_OFF_X);
      qy(p.y);
    }
  });
  tourSec.addEventListener('pointerleave', () => setHot(null));

  // keep the effect alive while scrolling with the cursor parked over the list
  window.addEventListener('scroll', () => {
    if (!px && !py) return;
    hotFromTarget(document.elementFromPoint(px, py));
    if (floatOn) {
      const p = localPos();
      qx(p.x + FLOAT_OFF_X);
      qy(p.y);
    }
  }, { passive: true });

  /* ---------- accordion ---------- */

  const toggleRow = (row) => {
    const wasOpen = row.classList.contains('open');
    tourList.querySelectorAll('.tour-row.open').forEach(o => {
      o.classList.remove('open');
      o.querySelector('.tour-row-head').setAttribute('aria-expanded', 'false');
      gsap.to(o.querySelector('.tour-more'), { height: 0, duration: 0.45, ease: 'power3.inOut' });
    });
    if (!wasOpen) {
      row.classList.add('open');
      row.querySelector('.tour-row-head').setAttribute('aria-expanded', 'true');
      const more = row.querySelector('.tour-more');
      gsap.to(more, {
        height: more.querySelector('.tour-more-inner').offsetHeight,
        duration: 0.55,
        ease: 'power3.inOut',
        onComplete: () => gsap.set(more, { height: 'auto' })
      });
    }
    // the cursor answers the click: a press, then + turns into × (or back)
    if (cur && hot === row && !reduced) {
      gsap.timeline()
        .to(cur, { scale: 0.82, duration: 0.1, ease: 'power2.out' })
        .to(cur, { scale: 1, rotation: restAngle(row), duration: 0.5, ease: 'back.out(2.2)' });
    }
  };

  tourList.addEventListener('click', (e) => {
    const head = e.target.closest('.tour-row-head');
    if (head) toggleRow(head.closest('.tour-row'));
  });
  tourList.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const head = e.target.closest('.tour-row-head');
    if (head) {
      e.preventDefault();
      toggleRow(head.closest('.tour-row'));
    }
  });
})();

/* ============================================================
   Cinema band — scroll-driven text-mask zoom over pinned video
   ============================================================ */

(() => {
  const cine = document.querySelector('.cine');
  if (!cine || typeof gsap === 'undefined') return;

  const zoom = cine.querySelector('.cine-zoom');
  const shade = cine.querySelector('.cine-shade');
  const phraseG = cine.querySelector('.cine-phrase');
  const footer = cine.querySelector('.cine-footer');
  const video = cine.querySelector('.cine-video');
  const dim = cine.querySelector('.cine-dim');
  const clamp01 = gsap.utils.clamp(0, 1);

  // anchor: the geometric centre of the phrase sits at the viewport centre and
  // the zoom expands symmetrically from it; the early shade fade takes care of
  // o vão escuro entre as linhas
  const ORIGIN = '800 450';
  // phrase is live SVG text now — measure its box instead of hardcoding it
  let ANCHOR = { x: 416, y: 86 };
  let NATURAL_W = 832;
  const MAX_W = 966; // on-screen px cap for the phrase (frase.svg proportion)

  const measurePhrase = () => {
    try {
      const bb = phraseG.getBBox();
      if (bb.width > 0) {
        NATURAL_W = bb.width;
        ANCHOR = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
      }
    } catch (e) { /* keep previous values */ }
  };

  // the mask viewBox (1600x900, slice) scales with the viewport — counter-scale
  // the phrase so it renders at its natural size, and anchor the stem at centre
  const fit = () => {
    measurePhrase();
    const factor = Math.max(window.innerWidth / 1600, window.innerHeight / 900);
    const s = Math.min(1, MAX_W / factor / NATURAL_W);
    const tx = 800 - ANCHOR.x * s;
    const ty = 450 - ANCHOR.y * s;
    phraseG.setAttribute('transform', `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${s.toFixed(4)})`);
  };

  let targetP = 0;
  let curP = 0;

  const compute = () => {
    const r = cine.getBoundingClientRect();
    const span = r.height - window.innerHeight; // scroll available while pinned
    targetP = clamp01(span > 0 ? -r.top / span : 0);
  };

  // the zoom chases the scroll with a soft lag instead of tracking it dryly
  let lastP = -1;
  gsap.ticker.add(() => {
    curP += (targetP - curP) * 0.05;
    if (Math.abs(targetP - curP) < 0.0004) curP = targetP;
    // settled (including once the band is off screen): nothing to redo — the
    // SVG mask and the video used to be re-set every frame, all page long
    if (curP === lastP) return;
    lastP = curP;
    gsap.set(zoom, { scale: 1 + curP * 70, svgOrigin: ORIGIN });
    // the shade starts melting away almost immediately as the letters grow
    shade.style.opacity = Math.max(0, 1 - Math.max(0, (curP - 0.06) / 0.42)).toFixed(3);
    // late in the scroll the video recedes like a card: it scales down, gains
    // rounded corners, sinks a little and darkens (all capped) while the next
    // section rides over it
    const recede = clamp01((curP - 0.66) / 0.34);
    // "filed away into a drawer": deeper shrink, sinking down and tipping
    // slightly back in 3D while the next section slides over it
    gsap.set(video, {
      scale: 1 - recede * 0.24,
      y: recede * 110,
      transformOrigin: '50% 50%',
      transformPerspective: 1400,
      rotationX: recede * 7,
      borderRadius: `${(recede * 40).toFixed(1)}px`
    });
    video.style.opacity = (1 - recede * 0.4).toFixed(3);
    dim.style.opacity = (recede * 0.5).toFixed(3); // hard cap keeps it light
    // the footer shrinks with the video: same scale/shift around the frame's
    // centre (origin above its own box), so it stays glued to the card
    gsap.set(footer, {
      scale: 1 - recede * 0.24,
      y: recede * 110,
      transformOrigin: '50% -47%'
    });
    if (recede > 0 && footShown) {
      footer.style.opacity = (1 - recede * 0.4).toFixed(3);
    }
    // the footer plays in earlier and holds longer before the video recedes,
    // so a broad scroll doesn't skip past it
    if (!footShown && curP > 0.34) showFooter();
    else if (footShown && curP < 0.24) hideFooter();
  });

  let footShown = false;
  const footPieces = footer.querySelectorAll('.cine-foot-left > *, .cine-watch');

  const showFooter = () => {
    footShown = true;
    footer.style.pointerEvents = 'auto';
    gsap.timeline()
      .set(footer, { autoAlpha: 1 })
      .fromTo(footPieces,
        { y: 30, opacity: 0 },
        // clearProps releases the inline transform so the card's CSS hover lift works
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.07, clearProps: 'all' }, 0.05);
  };

  const hideFooter = () => {
    footShown = false;
    footer.style.pointerEvents = 'none';
    gsap.to(footer, { autoAlpha: 0, duration: 0.35, ease: 'power2.in' });
  };

  window.addEventListener('scroll', compute, { passive: true });
  window.addEventListener('resize', () => { fit(); compute(); });
  fit();
  compute();
  // re-measure once the webfont lands (the text box changes with the font)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();

/* ============================================================
   Site-wide smooth scroll — eased wheel, native scroll position
   (keeps position: sticky and scroll events working)
   ============================================================ */

(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let target = window.scrollY;
  let current = window.scrollY;
  let raf = null;

  // scroll-scrubbed sections read this to drop their own lag (the wheel is
  // already eased here; easing it twice made them feel heavy)
  document.documentElement.classList.add('has-smooth-scroll');

  const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

  const loop = () => {
    current += (target - current) * 0.062;
    if (Math.abs(target - current) < 0.5) {
      current = target;
      raf = null;
    } else {
      raf = requestAnimationFrame(loop);
    }
    window.scrollTo(0, current);
  };

  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return; // let pinch-zoom through
    e.preventDefault();
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    target = Math.max(0, Math.min(maxScroll(), target + delta));
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: false });

  // stay in sync with scrollbar / keyboard / anchor jumps
  window.addEventListener('scroll', () => {
    if (!raf) {
      target = window.scrollY;
      current = window.scrollY;
    }
  }, { passive: true });
})();

/* ============================================================
   Proof section — testimonial carousel with focused portrait
   ============================================================ */

(() => {
  const roots = document.querySelectorAll('.testi');
  if (!roots.length || typeof gsap === 'undefined') return;

  const TESTI = [
    {
      name: 'Marina Castro', role: 'Licenciada em Goiânia', img: 'assets/img/depoimentos/marina.jpg',
      quote: '“Fui ao evento por curiosidade e saí com um plano que sigo até hoje. Meu primeiro contrato veio em duas semanas — e foi a primeira vez que um resultado me pareceu, de fato, repetível.”'
    },
    {
      name: 'Igor Lemos', role: 'Licenciado em São Paulo', img: 'assets/img/depoimentos/igor.jpg',
      quote: '“As histórias contadas ao vivo mudaram como eu enxergo trabalho. Voltei pra casa revendo minha própria rotina com outros olhos — valeu cada quilômetro da viagem.”'
    },
    {
      name: 'Bia Fontes', role: 'Licenciada em Recife', img: 'assets/img/depoimentos/bia.jpg',
      quote: '“Depois do evento minha rotina finalmente fez sentido. Noventa dias atendendo clientes sem falhar um só dia, e minha carteira triplicou desde que apliquei o método.”'
    },
    {
      name: 'Rafa Torres', role: 'Licenciado em Curitiba', img: 'assets/img/depoimentos/rafa.jpg',
      quote: '“Conheci nos bastidores, entre as palestras, as duas pessoas que hoje formam o meu time. Um fim de semana de conexões que segue pagando as contas mês após mês.”'
    },
    {
      name: 'Camila Ruas', role: 'Licenciada no Rio', img: 'assets/img/depoimentos/camila.jpg',
      quote: '“A energia daquela sala é impossível de fingir. Saí com um mês de atendimentos agendados e uma sócia para as próximas duas cidades — encontrada na fila do credenciamento.”'
    }
  ];

  const N = TESTI.length;
  // buffered copies for the infinite slide — enough portraits to fill a
  // 2560px strip on both sides of the focus slot (odd, so there's a middle copy)
  const COPIES = Math.max(3, Math.ceil(24 / N)) | 1;
  const MID = Math.floor(COPIES / 2) * N; // first index of the middle copy
  const ITEM_W = 180;
  const ACTIVE_W = 280;
  const GAP = 12;

  roots.forEach((testi) => {
    const mode = testi.dataset.focus || 'center';
    const shell = testi.querySelector('.testi-strip-shell');
    const strip = testi.querySelector('.testi-strip');
    const anchor = testi.querySelector('.testi-wrap'); // left-mode focus reference
    strip.innerHTML = Array.from({ length: N * COPIES }, (_, k) =>
      `<div class="testi-item" data-k="${k}"><img src="${TESTI[k % N].img}" alt="${TESTI[k % N].name}"></div>`
    ).join('');

    const quoteEl = testi.querySelector('.testi-quote');
    const nameEl = testi.querySelector('.testi-person');
    const roleEl = testi.querySelector('.testi-role');
    const items = strip.querySelectorAll('.testi-item');
    let idx = MID; // start on the middle copy
    let busy = false;

    // every quote is stacked in the same grid cell (see .testi-quote-text):
    // the block always holds the tallest quote's height, so swapping to a
    // longer or shorter text never pushes the meta and the strip around
    const quoteTexts = TESTI.map((t) => {
      const span = document.createElement('span');
      span.className = 'testi-quote-text';
      span.textContent = t.quote;
      return span;
    });
    quoteEl.replaceChildren(...quoteTexts);

    const setTexts = () => {
      const t = TESTI[idx % N];
      quoteTexts.forEach((el, k) => el.classList.toggle('is-current', k === idx % N));
      nameEl.textContent = t.name;
      roleEl.textContent = t.role;
    };

    const applyActive = () => {
      items.forEach((el, k) => el.classList.toggle('active', k === idx));
    };

    // the focus slot never moves — the strip slides so the active portrait
    // parks either at the centre or aligned to the quote's left edge
    const stripX = () => {
      if (mode === 'left' && anchor) {
        // align the focused portrait with the anchor's content edge —
        // measured against the shell's real origin (100vw includes the scrollbar)
        const pad = parseFloat(getComputedStyle(anchor).paddingLeft) || 0;
        const left = anchor.getBoundingClientRect().left + pad;
        const shellLeft = shell.getBoundingClientRect().left;
        return left - shellLeft - idx * (ITEM_W + GAP);
      }
      return shell.clientWidth / 2 - (idx * (ITEM_W + GAP) + ACTIVE_W / 2);
    };

    const normalize = () => {
      // silently re-centre inside the middle copy (identical layout = no visual jump)
      const k = MID + ((((idx - MID) % N) + N) % N);
      if (k === idx) return;
      idx = k;
      // the swap must be instant: with the size/colour transitions running, the
      // copy we leave would visibly shrink while the new one grows in the slot
      strip.classList.add('is-snapping');
      applyActive();
      gsap.set(strip, { x: stripX() });
      void strip.offsetWidth; // commit the new sizes before transitions return
      strip.classList.remove('is-snapping');
    };

    const goTo = (k) => {
      if (busy || k === idx) return;
      busy = true;
      idx = k;
      applyActive();
      gsap.to(strip, {
        x: stripX(),
        duration: 0.75,
        ease: 'power3.inOut',
        onComplete: () => { normalize(); busy = false; }
      });
      gsap.timeline()
        .to([quoteEl, nameEl, roleEl], { opacity: 0, y: 12, duration: 0.24, ease: 'power1.in' })
        .add(setTexts)
        .to([quoteEl, nameEl, roleEl], { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.05 });
    };

    applyActive();
    setTexts();
    gsap.set(strip, { x: stripX() });
    window.addEventListener('resize', () => gsap.set(strip, { x: stripX() }));

    testi.querySelector('.testi-prev').addEventListener('click', () => goTo(idx - 1));
    testi.querySelector('.testi-next').addEventListener('click', () => goTo(idx + 1));
    strip.addEventListener('click', (e) => {
      const item = e.target.closest('.testi-item');
      if (item) goTo(+item.dataset.k);
    });
  });

  /* ---------- floating squares (before the speakers and around the FAQ) ----------
     A handful of real squares, each with its own size, finish (outline,
     tinted fill or a small glowing spark) and drift. The drift is a sum of
     slow sines on each axis plus a gentle rise, so it never reads as linear.
     The cursor parts them softly: squares near it ease away and brighten,
     then settle back on a spring — the background answering, not chasing. */

  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  document.querySelectorAll('.speakers-particles').forEach((pCanvas) => {
    const ctx = pCanvas.getContext('2d');
    const pReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const TAU = Math.PI * 2;
    const R = 190;      // cursor influence radius
    const PUSH = 2600;  // push strength (px/s²) at the cursor
    const K = 38;       // spring back toward the drift path
    const C = 8.5;      // damping
    const rand = (a, b) => a + Math.random() * (b - a);
    let W = 0;
    let H = 0;
    let t = 0;
    let squares = [];
    const ptr = { cx: -1e4, cy: -1e4, active: false };

    const make = (y) => {
      const big = Math.random() < 0.3;
      const s = big ? rand(16, 30) : rand(6, 13);
      const roll = Math.random();
      const kind = big ? (roll < 0.6 ? 'line' : 'fill') : (roll < 0.4 ? 'spark' : roll < 0.75 ? 'line' : 'fill');
      return {
        bx: Math.random() * W, by: y, s, kind,
        a: kind === 'spark' ? rand(0.5, 0.8) : big ? rand(0.22, 0.36) : rand(0.3, 0.5),
        ax1: rand(10, 26), ax2: rand(3, 10), fx1: rand(0.04, 0.09), fx2: rand(0.11, 0.2), px1: rand(0, TAU), px2: rand(0, TAU),
        ay1: rand(8, 22), ay2: rand(3, 8), fy1: rand(0.03, 0.08), fy2: rand(0.1, 0.18), py1: rand(0, TAU), py2: rand(0, TAU),
        rise: rand(2, 7),
        r0: Math.random() < 0.5 ? 0 : rand(-0.3, 0.3), ra: rand(0.08, 0.3), rf: rand(0.03, 0.08), rp: rand(0, TAU),
        ox: 0, oy: 0, vx: 0, vy: 0, glow: 0
      };
    };

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = pCanvas.offsetWidth;
      H = pCanvas.offsetHeight;
      pCanvas.width = W * dpr;
      pCanvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // few on purpose: each square should read as an object, not as dust
      const count = Math.max(7, Math.min(18, Math.round((W * H) / 95000)));
      squares = Array.from({ length: count }, () => make(Math.random() * H));
    };

    const draw = (dt) => {
      t += dt;
      ctx.clearRect(0, 0, W, H);
      let px = -1e4;
      let py = -1e4;
      if (ptr.active) {
        const r = pCanvas.getBoundingClientRect();
        px = ptr.cx - r.left;
        py = ptr.cy - r.top;
      }
      for (let i = 0; i < squares.length; i++) {
        let q = squares[i];
        q.by -= q.rise * dt;
        if (q.by < -60) q = squares[i] = make(H + 60);

        const x = q.bx + q.ax1 * Math.sin(t * q.fx1 * TAU + q.px1) + q.ax2 * Math.sin(t * q.fx2 * TAU + q.px2);
        const y = q.by + q.ay1 * Math.sin(t * q.fy1 * TAU + q.py1) + q.ay2 * Math.sin(t * q.fy2 * TAU + q.py2);

        // cursor: soft push away + spring back (semi-implicit Euler)
        let fx = 0;
        let fy = 0;
        let near = 0;
        const dx = x + q.ox - px;
        const dy = y + q.oy - py;
        const d = Math.hypot(dx, dy);
        if (d < R && d > 0.01) {
          near = (1 - d / R) ** 2;
          fx = (dx / d) * near * PUSH;
          fy = (dy / d) * near * PUSH;
        }
        q.vx += (fx - K * q.ox - C * q.vx) * dt;
        q.vy += (fy - K * q.oy - C * q.vy) * dt;
        q.ox += q.vx * dt;
        q.oy += q.vy * dt;
        q.glow += (near - q.glow) * Math.min(1, dt * 5);

        const cx = x + q.ox;
        const cy = y + q.oy;
        const angle = q.r0 + q.ra * Math.sin(t * q.rf * TAU + q.rp) + q.vx * 0.0016;
        const alpha = Math.min(1, q.a + q.glow * 0.5);
        const half = q.s / 2;
        const rad = Math.min(4, q.s * 0.2);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        roundRect(ctx, -half, -half, q.s, q.s, rad);
        if (q.kind === 'line') {
          ctx.lineWidth = 1.25;
          ctx.strokeStyle = `rgba(168,255,53,${alpha.toFixed(3)})`;
          ctx.stroke();
          if (q.glow > 0.02) {
            ctx.fillStyle = `rgba(168,255,53,${(q.glow * 0.12).toFixed(3)})`;
            ctx.fill();
          }
        } else if (q.kind === 'fill') {
          const g = ctx.createLinearGradient(-half, -half, half, half);
          g.addColorStop(0, `rgba(196,255,120,${(alpha * 0.75).toFixed(3)})`);
          g.addColorStop(1, `rgba(168,255,53,${(alpha * 0.18).toFixed(3)})`);
          ctx.fillStyle = g;
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(216,255,166,${(alpha * 0.55).toFixed(3)})`;
          ctx.stroke();
        } else {
          ctx.shadowColor = `rgba(168,255,53,${alpha.toFixed(3)})`;
          ctx.shadowBlur = 10 + q.glow * 16;
          ctx.fillStyle = `rgba(206,255,140,${alpha.toFixed(3)})`;
          ctx.fill();
        }
        ctx.restore();
      }
    };

    build();
    draw(0);
    window.addEventListener('resize', () => { build(); draw(0); });

    if (finePointer && !pReduced) {
      window.addEventListener('pointermove', (e) => {
        ptr.cx = e.clientX;
        ptr.cy = e.clientY;
        ptr.active = true;
      }, { passive: true });
      document.documentElement.addEventListener('pointerleave', () => { ptr.active = false; });
    }

    // animate only while the band is on screen
    if (!pReduced && 'IntersectionObserver' in window) {
      let running = false;
      const tick = (time, deltaMs) => draw(Math.min(deltaMs, 50) / 1000);
      const pio = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !running) {
            running = true;
            gsap.ticker.add(tick);
          } else if (!entry.isIntersecting && running) {
            running = false;
            gsap.ticker.remove(tick);
          }
        });
      });
      pio.observe(pCanvas);
    }
  });

  /* ---------- FAQ accordion ---------- */

  const faqList = document.querySelector('.faq-list');
  if (faqList) {
    const toggleFaq = (item) => {
      const wasOpen = item.classList.contains('open');
      faqList.querySelectorAll('.faq-item.open').forEach((o) => {
        o.classList.remove('open');
        o.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
        gsap.to(o.querySelector('.faq-a'), { height: 0, duration: 0.4, ease: 'power3.inOut' });
      });
      if (!wasOpen) {
        item.classList.add('open');
        item.querySelector('.faq-q').setAttribute('aria-expanded', 'true');
        const a = item.querySelector('.faq-a');
        gsap.to(a, {
          height: a.querySelector('p').offsetHeight,
          duration: 0.5,
          ease: 'power3.inOut',
          onComplete: () => gsap.set(a, { height: 'auto' })
        });
      }
      faqList.classList.toggle('has-open', !!faqList.querySelector('.faq-item.open'));
    };
    faqList.addEventListener('click', (e) => {
      const q = e.target.closest('.faq-q');
      if (q) toggleFaq(q.closest('.faq-item'));
    });
    faqList.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const q = e.target.closest('.faq-q');
      if (q) {
        e.preventDefault();
        toggleFaq(q.closest('.faq-item'));
      }
    });
  }

  /* ---------- looping videos outside the hero: play only near the screen ----------
     (the hero has its own observer; the past-editions section drives its own
     clips). They carry data-autoplay instead of autoplay, so the 1080p
     cinema loop neither downloads at page load nor keeps decoding while the
     visitor scrolls the sections below it */

  const loops = Array.from(document.querySelectorAll('video[data-autoplay]'));
  if (loops.length) {
    const play = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // first frame only
    } else if (!('IntersectionObserver' in window)) {
      loops.forEach(play);
    } else {
      const near = new Set();
      const sync = (v) => {
        if (near.has(v) && !document.hidden) play(v);
        else if (!v.paused) v.pause();
      };
      const lio = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (e.isIntersecting) near.add(e.target);
        else near.delete(e.target);
        sync(e.target);
      }), { rootMargin: '50% 0px' });
      loops.forEach((v) => lio.observe(v));
      document.addEventListener('visibilitychange', () => loops.forEach(sync));
    }
  }

  /* ---------- past-events photos: blurred duplicate as their own glow ---------- */

  document.querySelectorAll('.past-photo').forEach((ph) => {
    const img = ph.querySelector('img');
    if (!img) return;
    const glow = img.cloneNode();
    glow.className = 'past-glow';
    glow.setAttribute('aria-hidden', 'true');
    glow.removeAttribute('alt');
    ph.prepend(glow);
  });

  /* ---------- pre-footer parallax: the stage drifts slower than the scroll ---------- */

  const pfImg = document.querySelector('.prefooter-img');
  if (pfImg && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const pfSec = pfImg.closest('.prefooter');
    const pfClamp = gsap.utils.clamp(0, 1);
    const pfUpdate = () => {
      const r = pfSec.getBoundingClientRect();
      // 0 = entering from below, 1 = fully revealed — then it parks at y:0 with
      // the crowd glued to the footer seam (origin at the bottom edge)
      const t = pfClamp((window.innerHeight - r.top) / r.height);
      gsap.set(pfImg, { scale: 1.3, y: (1 - t) * 130, transformOrigin: '50% 100%' });
    };
    window.addEventListener('scroll', pfUpdate, { passive: true });
    window.addEventListener('resize', pfUpdate);
    pfUpdate();
  }

  /* ---------- hero-style scroll reveals for every section ----------
     Same recipe as the hero entrance (fade + rise + blur, staggered),
     fired once per group when it scrolls into view. The hero, the
     statement phrase and the video mask keep their own animations. */

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const groups = [];

    // items: selectors resolved inside the container; '&' = the container itself
    const add = (container, items, opts = {}) => {
      const c = document.querySelector(container);
      if (!c) return;
      const els = [];
      items.forEach((sel) => {
        if (sel === '&') els.push(c);
        else c.querySelectorAll(sel).forEach((el) => els.push(el));
      });
      // plain fade + short rise — calmer than a blur-in
      if (els.length) groups.push({ c, els, blur: opts.blur === true, clear: opts.clear !== false });
    };

    add('.speakers-head', ['.kicker', 'h2', '.speakers-sub', '.speakers-cta']);
    add('.speakers-carousel', ['&']);
    add('.tour-head', ['.kicker', '.tour-title', '.tour-subrow > *']);
    add('.tour-list', ['.tour-row']);
    add('.proof3 .proof2-stats', ['.proof2-stat']);
    add('.proof3 .p3-grid', ['.p3-left > *', '.testi-wrap > *']);
    add('.proof3 .testi-strip-shell', ['&']);
    add('.past-head', ['.kicker', 'h2', '.past-sub']);
    add('.past-grid', ['.past-card']);
    add('.faq-left', ['h2', '.faq-sub', '.faq-contact']);
    add('.faq-list', ['.faq-item']);

    groups.forEach((g) => {
      gsap.set(g.els, g.blur ? { opacity: 0, y: 26, filter: 'blur(8px)' } : { opacity: 0, y: 30 });
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const g = groups.find((x) => x.c === entry.target);
        if (!g) return;
        gsap.to(g.els, {
          opacity: 1,
          y: 0,
          ...(g.blur ? { filter: 'blur(0px)' } : {}),
          duration: 0.85,
          ease: 'power3.out',
          stagger: 0.09,
          ...(g.clear ? { clearProps: 'all' } : {})
        });
      });
    }, { threshold: 0.18 });

    groups.forEach((g) => io.observe(g.c));
  }

  /* ---------- KPI count-up when the stats row scrolls into view ---------- */

  const statRows = document.querySelectorAll('.proof-stats, .proof2-stats');
  if (statRows.length && 'IntersectionObserver' in window) {
    const runCount = (row) => {
      row.querySelectorAll('.pn').forEach((el, i) => {
        const target = parseFloat(el.dataset.n);
        const dec = +(el.dataset.dec || 0);
        const suf = el.dataset.suf || '';
        const obj = { n: 0 };
        el.textContent = (0).toFixed(dec) + suf;
        gsap.to(obj, {
          n: target,
          duration: 1.6,
          delay: 0.15 + i * 0.12,
          ease: 'power2.out',
          onUpdate: () => { el.textContent = obj.n.toFixed(dec) + suf; }
        });
      });
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runCount(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    statRows.forEach((row) => io.observe(row));
  }
})();

/* ============================================================
   Statement — palco fixo: o texto trava e vai preenchendo
   enquanto as mídias e os quadrados atravessam por trás
   ============================================================ */

(() => {
  const sec = document.querySelector('.statement.has-blend');
  if (!sec) return;

  const words = Array.from(sec.querySelectorAll('.sw'));
  const items = Array.from(sec.querySelectorAll('.bm, .bsq'));
  const outro = sec.querySelector('.blend-outro');
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    words.forEach((w) => { w.style.opacity = 1; });
    if (outro) outro.style.opacity = 1;
    return;
  }

  const progress = () => {
    const span = sec.offsetHeight - window.innerHeight;
    return clamp01(span > 0 ? -sec.getBoundingClientRect().top / span : 0);
  };

  const paint = (p) => {
    // 1) a frase preenche palavra por palavra durante o trecho fixo
    const tp = clamp01((p - 0.06) / 0.74);
    for (let i = 0; i < words.length; i++) {
      const wp = clamp01(tp * words.length - i);
      words[i].style.opacity = (0.12 + 0.88 * wp).toFixed(3);
    }
    // 2) cada mídia/quadrado sobe no seu próprio curso (proporcional à tela,
    //    para as faixas vizinhas não se cruzarem em telas mais baixas)
    const vs = window.innerHeight / 1200;
    for (const el of items) {
      const range = (parseFloat(el.dataset.range) || 800) * vs;
      el.style.transform = 'translate3d(0,' + ((0.5 - p) * range).toFixed(1) + 'px,0)';
    }
    // 3) o fechamento entra no fim do trecho
    if (outro) {
      const op = clamp01((p - 0.68) / 0.2);
      outro.style.opacity = op.toFixed(3);
      outro.style.transform = 'translateY(' + ((1 - op) * 24).toFixed(1) + 'px)';
    }
  };

  let target = progress();
  let cur = target;
  let raf = null;

  const loop = () => {
    cur += (target - cur) * 0.14;
    if (Math.abs(target - cur) < 0.0004) { cur = target; raf = null; }
    else { raf = requestAnimationFrame(loop); }
    paint(cur);
  };

  const onScroll = () => {
    target = progress();
    if (!raf) raf = requestAnimationFrame(loop);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  paint(cur);
})();
