/* ============================================================
   Rodapé G4 — "Seu nome no crachá"  (see footer-g4.css)

   - Arrival: the low aurora rises with the scroll (a tiny smoothed
     scrub, rAF only while it catches up); the statement lines rise out
     of their masks, the field draws its hairline, the CTAs, the info
     grid and the bar follow. When the credential's resting place comes
     on screen the card drops from above the screen, snaps taut on its
     strap, swings to rest, and "Você" is printed on it.
   - Signature: whatever is typed in "Como você quer ser chamado?" is
     printed on the card live. New letters land as a soft lime bloom and
     cool into the ink (one-shot paint of a few glyphs); long names
     condense along the font's width axis before they shrink; a lime
     print-head nib sits at the end while typing; every keystroke gives
     the card a small swing.
   - Physics (from footer-g.js): verlet strap of N points from an anchor
     above the screen, a rigid hook, the card as a rigid bar (hole ->
     bottom), a damped spring for the twist. The strap is drawn on one
     canvas sized to the strap's reach (DPR <= 1.5, dirty-rect clears);
     the card is a DOM node moved with transform only. The loop sleeps
     at rest, off-screen and on a hidden tab.
   ============================================================ */

(() => {
  const footer = document.getElementById('ft-footer');
  if (!footer) return;

  const root = document.documentElement;
  const $ = (s) => footer.querySelector(s);
  const $$ = (s) => Array.from(footer.querySelectorAll(s));

  const canvas = $('.ft-strap');
  const card = $('.ft-card');
  const holo = $('.ft-holo-in');
  const foil = $('.ft-seal-foil');
  const cue = $('.ft-cue');
  const back = $('.ft-back');
  const bay = $('.ft-bay');
  const bar = $('.ft-bar');
  const input = $('#ft-name');
  const nameEl = $('.ft-name');
  const nameIn = $('.ft-name-in');
  const ctx = canvas.getContext('2d');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmall = () => window.innerWidth <= 900;
  const hasGsap = typeof window.gsap !== 'undefined';
  // the entrance needs GSAP; without it everything is shown as is
  const intro = root.classList.contains('ft-js') && hasGsap;
  if (!intro) {
    root.classList.remove('ft-js');
    root.classList.add('ft-static');
  }
  // the hanging physics runs on wide screens with motion allowed
  const physics = !reduce;

  /* ---------------------------------------------------------- QR dots */

  (function buildQR(svg) {
    if (!svg) return;
    const n = 25;
    let seed = 816;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const inFinder = (x, y) =>
      (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
    let out = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (inFinder(x, y)) continue;
        if (rnd() > 0.52) out += `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.42"/>`;
      }
    }
    const finder = (x, y) =>
      `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.8" fill="none" stroke="currentColor" stroke-width="1"/>` +
      `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.9"/>`;
    svg.innerHTML = `<g fill="currentColor">${out}${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}</g>`;
  })($('.ft-qr'));

  /* ---------------------------------------------------------- the printed name */

  const DEFAULT = 'Você';
  const MAXC = 22;
  const INK = 0.85; // s, length of the cooling animation (footer-g4.css)
  const animateInk = !reduce;

  // DOM inside .ft-name-in: one text node with the cooled letters, then
  // one span per letter still cooling, then the print-head nib
  const settled = document.createTextNode('');
  const nib = document.createElement('span');
  nib.className = 'ft-nib';
  nib.setAttribute('aria-hidden', 'true');
  let live = [];
  let shown = '';
  let coolT = 0;
  let typeT = 0;

  nameIn.textContent = '';
  nameIn.append(settled, nib);

  function fit() {
    nameIn.style.fontVariationSettings = '';
    nameIn.style.fontSize = '';
    const avail = nameEl.clientWidth;
    if (!avail) return;
    let w = nameIn.offsetWidth;
    if (w <= avail) return;
    // like a badge printer: condense along the width axis first ...
    const wd = Math.max(75, 100 - (1 - avail / w) * 130);
    nameIn.style.fontVariationSettings = `'wdth' ${wd.toFixed(1)}`;
    w = nameIn.offsetWidth;
    // ... then shrink what still does not fit
    if (w > avail) nameIn.style.fontSize = `${(avail / w).toFixed(4)}em`;
  }

  function cool() {
    settled.data = shown;
    live.forEach((el) => el.remove());
    live = [];
    if (nameIn.offsetWidth > nameEl.clientWidth) fit();
  }

  function print(next, stagger = 0) {
    if (next === shown) return;
    let i = 0;
    const max = Math.min(shown.length, next.length);
    while (i < max && shown[i] === next[i]) i++;
    // the placeholder name is swapped as a whole
    if (shown === DEFAULT || next === DEFAULT) i = 0;

    const s = settled.data.length;
    if (i <= s) {
      settled.data = settled.data.slice(0, i);
      live.forEach((el) => el.remove());
      live = [];
    } else {
      live.slice(i - s).forEach((el) => el.remove());
      live = live.slice(0, i - s);
    }
    shown = next;

    if (!animateInk) {
      settled.data = next;
      fit();
      return;
    }
    for (let k = i; k < next.length; k++) {
      // the ink letter and, over it, its lime bloom (cross-faded in CSS)
      const el = document.createElement('span');
      const a = document.createElement('span');
      const b = document.createElement('span');
      el.className = 'ft-ink';
      a.className = 'ft-ink-a';
      b.className = 'ft-ink-b';
      a.textContent = b.textContent = next[k];
      if (stagger) el.style.setProperty('--ft-d', `${((k - i) * stagger).toFixed(3)}s`);
      el.append(a, b);
      nameIn.insertBefore(el, nib);
      live.push(el);
    }
    fit();
    // fold the cooled letters back into one text run
    clearTimeout(coolT);
    coolT = setTimeout(cool, (INK + Math.max(0, next.length - i - 1) * stagger) * 1000 + 80);
  }

  const label = (n) =>
    `Credencial iGreen Live 2026 em nome de ${n}. Próxima parada: Goiânia, 16 de agosto, check-in às 14h00.`;
  const clean = (v) => v.replace(/\s+/g, ' ').replace(/^ /, '').slice(0, MAXC);
  let ariaT = 0;

  input.addEventListener('input', () => {
    const v = clean(input.value);
    const next = v.trim() ? v : DEFAULT;
    const before = shown;
    const swap = before === DEFAULT || next === DEFAULT || !before;
    print(next, swap ? 0.05 : 0);
    if (animateInk) {
      nameEl.classList.add('is-typing');
      clearTimeout(typeT);
      typeT = setTimeout(() => nameEl.classList.remove('is-typing'), 1100);
    }
    // the print head runs left to right: new letters push the card that way
    nudge(swap || next.length >= before.length ? 1 : -1, swap ? 1.4 : 1);
    clearTimeout(ariaT);
    ariaT = setTimeout(() => card.setAttribute('aria-label', label(next.trim())), 400);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    nudge(1, 2.2);
    const cta = $('.ft-mag');
    if (cta) cta.focus();
  });
  input.addEventListener('blur', () => {
    nameEl.classList.remove('is-typing');
  });

  /* ---------------------------------------------------------- entrance */

  const once = (el, margin, fn) => {
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      fn();
    }, { rootMargin: margin });
    io.observe(el);
  };

  if (intro) {
    const gsap = window.gsap;
    const lines = $$('.ft-li');
    const ask = $('.ft-ask');
    const field = $('.ft-field');
    const cta = $('.ft-cta');
    const cols = $$('.ft-grid .ft-rv');
    const rule = $('.ft-rule');

    // starting states (mirror the CSS so nothing flashes; y:0 drops the
    // CSS translate that GSAP would otherwise read back as pixels)
    gsap.set(lines, { yPercent: 110, y: 0 });
    gsap.set([ask, cta, ...cols], { autoAlpha: 0, y: 24 });
    gsap.set(bar, { autoAlpha: 0, y: 12 });
    gsap.set(rule, { scaleX: 0, transformOrigin: '0% 50%' });

    once($('.ft-head'), '0px 0px -12% 0px', () => {
      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .to(lines, { yPercent: 0, duration: 1.5, stagger: 0.13 })
        .to(ask, { autoAlpha: 1, y: 0, duration: 1.3 }, 0.36)
        .add(() => field.classList.add('is-drawn'), 0.42)
        .to(cta, { autoAlpha: 1, y: 0, duration: 1.3 }, 0.5);
    });
    once($('.ft-grid'), '0px 0px -6% 0px', () => {
      gsap.timeline()
        .to(rule, { scaleX: 1, duration: 1.8, ease: 'expo.inOut' })
        .to(cols, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.08, ease: 'power3.out' }, 0.25);
    });
    once(bar, '0px', () => {
      gsap.to(bar, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: 0.15 });
    });

    // the aurora rises with the footer: smoothed scrub, frames only while
    // the smoothed value is still catching up with the scroll
    const aurora = $('.ft-aurora');
    const riseTl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
      .fromTo(aurora, { yPercent: 24, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1 });
    let cur = null, tgt = 0, sraf = 0, slast = 0, G = null;
    const sstep = (t) => {
      const dt = slast ? Math.min(0.1, (t - slast) / 1000) : 1 / 60;
      slast = t;
      // the site's wheel is already eased (portal.js); easing twice feels heavy
      const tau = document.documentElement.classList.contains('has-smooth-scroll') ? 0.14 : 0.32;
      cur += (tgt - cur) * (1 - Math.exp(-dt / tau));
      if (Math.abs(tgt - cur) < 0.0005) cur = tgt;
      riseTl.progress(cur);
      if (cur === tgt) { sraf = 0; slast = 0; } else sraf = requestAnimationFrame(sstep);
    };
    const measure = () => {
      const r = footer.getBoundingClientRect();
      G = { top: r.top + window.scrollY, h: r.height, vh: window.innerHeight };
    };
    const onScroll = () => {
      if (!G) return;
      const p = (window.scrollY - (G.top - G.vh)) / Math.max(1, Math.min(G.h, G.vh) * 0.9);
      tgt = p < 0 ? 0 : p > 1 ? 1 : p;
      if (cur === null) { cur = tgt; riseTl.progress(cur); }
      else if (!sraf && cur !== tgt) sraf = requestAnimationFrame(sstep);
    };
    measure();
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    let mt = 0;
    window.addEventListener('resize', () => {
      clearTimeout(mt);
      mt = setTimeout(() => { measure(); onScroll(); }, 140);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); onScroll(); });

    // magnetic primary CTA: drifts a few px toward the pointer
    const mag = $('.ft-mag');
    if (mag && window.matchMedia('(hover: hover)').matches) {
      const xTo = gsap.quickTo(mag, 'x', { duration: 0.7, ease: 'power3.out' });
      const yTo = gsap.quickTo(mag, 'y', { duration: 0.7, ease: 'power3.out' });
      let r = null;
      mag.addEventListener('pointerenter', () => { r = mag.getBoundingClientRect(); });
      mag.addEventListener('pointermove', (e) => {
        if (!r) r = mag.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.12);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.28);
      });
      mag.addEventListener('pointerleave', () => { r = null; xTo(0); yTo(0); });
    }
  }

  // back to top: smooth unless the reader asked for less motion
  const up = $('.ft-up');
  if (up) {
    up.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  /* ---------------------------------------------------------- physics */

  const N = 10;              // strap segments
  const SUB = 1 / 120;       // fixed sub-step (s)
  const ITER = 14;           // constraint iterations per sub-step
  const CARD_W = 0.22;       // inverse mass of the two card points (heavier)

  let W = 0, H = 0, dpr = 1;
  let cw = 0, ch = 0, holeY = 0, sc = 1;
  let ax = 0, ay = 0, segLen = 0, hookLen = 0, sw = 0;
  let cx0 = 0;               // canvas offset inside the footer (x)

  // points: 0 = anchor, 1..N = strap, N+1 = card hole (T), N+2 = card bottom (B)
  const P = [];
  const T = N + 1, B = N + 2;
  for (let i = 0; i <= B; i++) P.push({ x: 0, y: 0, px: 0, py: 0, w: 1 });
  P[0].w = 0;
  P[T].w = CARD_W;
  P[B].w = CARD_W;

  let ready = false, wantDrop = false, dropped = false, hanging = false;
  let twist = 0, twistV = 0;           // deg, deg/s
  let awake = false, visible = false, raf = 0, sinceDrop = 9;
  let last = 0, acc = 0, calm = 0;
  let grab = null;
  let logoBmp = null;

  function layout() {
    const fr = footer.getBoundingClientRect();
    W = fr.width;
    H = fr.height;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cw = card.offsetWidth;
    ch = card.offsetHeight;
    sc = cw / 280;
    const fs = cw / 17.5;                // the card's em
    holeY = fs * (0.62 + 0.26);          // centre of the punched slot
    card.style.transformOrigin = `50% ${holeY.toFixed(2)}px`;
    sw = Math.round(19 * sc);            // strap width
    hookLen = 30 * sc;

    // the credential hangs in the middle of its bay (columns 9-12) and
    // rests a little above the bottom bar's hairline
    const b = bay.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    ax = Math.round(b.left - fr.left + b.width / 2);
    ay = -Math.round(70 * sc);           // above the top edge, inside the fade
    const restBottom = br.top - fr.top - Math.round(Math.max(40, 46 * sc));
    const restTop = Math.max(restBottom - ch, 150 * sc);
    segLen = (restTop + holeY - hookLen - ay) / N;

    // the canvas only covers what the strap can reach
    const reach = N * segLen + hookLen + 48 * sc;
    cx0 = Math.max(0, Math.floor(ax - reach));
    const cx1 = Math.min(W, Math.ceil(ax + reach));
    const cy1 = Math.min(H, Math.ceil(ay + reach + sw));
    const CW = Math.max(1, cx1 - cx0), CH = Math.max(1, cy1);
    canvas.width = Math.round(CW * dpr);
    canvas.height = Math.round(CH * dpr);
    canvas.style.width = `${CW}px`;
    canvas.style.height = `${CH}px`;
    canvas.style.left = `${cx0}px`;

    // the backlight sits behind the resting card; the cue that starts
    // the drop sits near the resting card's lower edge, so the card falls
    // from the top of the screen into a place that is already in view
    back.style.transform = `translate3d(${ax}px, ${Math.round(restTop + ch * 0.46)}px, 0)`;
    cue.style.transform = `translate3d(${ax}px, ${Math.round(restTop + ch * 0.94)}px, 0)`;
    lastBox = null;
    metalGrad = null;
    buildLogo();
  }

  function set(p, x, y) { p.x = p.px = x; p.y = p.py = y; }
  function restPose() {
    for (let i = 0; i <= N; i++) set(P[i], ax, ay + i * segLen);
    set(P[T], ax, P[N].y + hookLen);
    set(P[B], ax, P[T].y + (ch - holeY));
    twist = twistV = 0;
  }

  /* the drop: everything starts above the top edge, offset sideways, so
     it falls out of the dark, snaps taut and swings in */
  function drop() {
    if (dropped || !physics || isSmall()) return;
    if (!ready) { wantDrop = true; return; }
    dropped = true;
    sinceDrop = 0;
    const off = 90 * sc;
    const top = -(ch + hookLen + 36 * sc);
    set(P[T], ax + off, top);
    set(P[B], ax + off + 6 * sc, top + (ch - holeY));
    for (let i = 1; i <= N; i++) {
      const t = i / N;
      set(P[i], ax + off * t * 0.9, ay - 40 * sc - Math.sin(t * Math.PI) * 120 * sc - t * 60 * sc);
    }
    P[T].py -= 3 * sc;
    P[B].py -= 3 * sc;
    wake();
    if (hasGsap) window.gsap.to(back, { opacity: 1, duration: 2.4, ease: 'sine.inOut', delay: 0.5 });
    else back.style.opacity = '1';
    // "Você" is printed once the card has swung into place
    setTimeout(() => { if (!shown) print(DEFAULT, 0.075); }, 1050);
  }

  // a keystroke (or Enter) gives the card a small swing
  function nudge(dir, k) {
    if (!dropped || !physics || grab || !hanging) return;
    const vx = P[B].x - P[B].px;
    const cap = 0.9 * sc;               // px per sub-step (~110 px/s)
    if (Math.sign(vx) === dir && Math.abs(vx) > cap) { wake(); return; }
    const imp = 0.36 * sc * k * dir;
    P[B].px -= imp;
    P[T].px -= imp * 0.3;
    twistV += dir * 15 * k;
    wake();
  }

  function step(dt) {
    // the strap has some give only while the drop snaps it taut, then it
    // firms up to its exact length (no sag at rest)
    sinceDrop += dt;
    const ropeK = sinceDrop < 0.45 ? 0.22 : Math.min(1, 0.22 + (sinceDrop - 0.45) * 1.4);
    const g = 4300 * Math.max(0.85, Math.min(1.25, sc)); // px/s^2
    // drag: light while swinging, firmer once the motion is small
    const speed = Math.hypot(P[B].x - P[B].px, P[B].y - P[B].py) / dt;
    const q = Math.max(0, Math.min(1, (speed - 30) / 130));
    const drag = grab ? 0.9 : 1.15 + 2.9 * (1 - q * q * (3 - 2 * q));
    const keep = 1 - drag * dt;
    for (let i = 1; i <= B; i++) {
      const p = P[i];
      let vx = (p.x - p.px) * keep;
      let vy = (p.y - p.py) * keep;
      // velocity cap (a hard throw stays on screen)
      const m = 30 * sc;
      const v = Math.hypot(vx, vy);
      if (v > m) { vx *= m / v; vy *= m / v; }
      p.px = p.x; p.py = p.y;
      p.x += vx;
      p.y += vy + g * dt * dt;
    }

    // the grabbed point moves along the pointer path over the frame
    if (grab) {
      grab.k = Math.min(1, grab.k + grab.dk);
      grab.cx = grab.ptx + (grab.tx - grab.ptx) * grab.k;
      grab.cy = grab.pty + (grab.ty - grab.pty) * grab.k;
    }

    for (let it = 0; it < ITER; it++) {
      // strap: inextensible but free to go slack
      for (let i = 0; i < N; i++) rope(P[i], P[i + 1], segLen, true, ropeK);
      rope(P[N], P[T], hookLen, false, 1);
      rope(P[T], P[B], ch - holeY, false, 1);
      if (grab) pin();
      bounds();
    }

    // twist: a damped spring chasing the card's sideways speed
    const vx = ((P[T].x - P[T].px) + (P[B].x - P[B].px)) * 0.5 / dt;
    const target = Math.max(-26, Math.min(26, vx * 0.03));
    twistV += ((target - twist) * 70 - twistV * 7) * dt;
    twist += twistV * dt;
  }

  function rope(a, b, len, slack, stiff) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1e-6;
    if (slack && d <= len) return;
    const wsum = a.w + b.w;
    if (!wsum) return;
    const k = ((d - len) / d / wsum) * stiff;
    a.x += dx * k * a.w; a.y += dy * k * a.w;
    b.x -= dx * k * b.w; b.y -= dy * k * b.w;
  }

  // pin a point on the card's axis (at fraction s from the hole) to the pointer
  function pin() {
    const s = grab.s;
    const gx = P[T].x + (P[B].x - P[T].x) * s + grab.ox;
    const gy = P[T].y + (P[B].y - P[T].y) * s + grab.oy;
    const dx = grab.cx - gx, dy = grab.cy - gy;
    const w = (1 - s) * (1 - s) + s * s;
    P[T].x += dx * (1 - s) / w; P[T].y += dy * (1 - s) / w;
    P[B].x += dx * s / w;       P[B].y += dy * s / w;
  }

  function bounds() {
    const m = 6;
    for (let i = 1; i <= B; i++) {
      const p = P[i];
      const pad = i >= T ? cw * 0.42 : m;
      if (p.x < pad) p.x = pad;
      else if (p.x > W - pad) p.x = W - pad;
      if (p.y > H - m) p.y = H - m;
    }
  }

  /* ---------------------------------------------------------- render */

  let lastBox = null;
  let tf = '', hx = 1e9, ho = 1e9, fr = 1e9; // "last written" values (start far off so the first frame writes)
  let metalGrad = null;

  // canvas space = footer space shifted by the canvas offset
  const base = () => ctx.setTransform(dpr, 0, 0, dpr, -cx0 * dpr, 0);

  const logoImg = new Image();
  function buildLogo() {
    if (!logoImg.complete || !logoImg.naturalWidth) return;
    // printed along the strap: rotated so it reads top to bottom
    const lh = sw * 0.46;
    const lw = lh * (279 / 82);
    const c = document.createElement('canvas');
    c.width = Math.ceil(lh * dpr) + 2;
    c.height = Math.ceil(lw * dpr) + 2;
    const g = c.getContext('2d');
    g.translate(c.width / 2, c.height / 2);
    g.rotate(Math.PI / 2);
    g.globalAlpha = 0.9;
    g.drawImage(logoImg, (-lw * dpr) / 2, (-lh * dpr) / 2, lw * dpr, lh * dpr);
    logoBmp = { c, w: c.width / dpr, h: c.height / dpr, len: lw };
  }
  logoImg.onload = () => { if (!ready) return; buildLogo(); if (dropped) draw(); };
  logoImg.src = 'assets/img/igreen-logo.svg';

  function draw() {
    base();
    // dirty rect = last frame's box + this frame's box
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i <= T; i++) {
      const p = P[i];
      if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
      if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
    }
    const pad = sw + 14;
    const box = { x0: x0 - pad, y0: Math.min(y0, ay) - pad, x1: x1 + pad, y1: y1 + pad };
    if (lastBox) {
      const cx = Math.min(box.x0, lastBox.x0), cy = Math.min(box.y0, lastBox.y0);
      ctx.clearRect(cx, cy, Math.max(box.x1, lastBox.x1) - cx, Math.max(box.y1, lastBox.y1) - cy);
    } else {
      ctx.clearRect(cx0, 0, canvas.width / dpr, canvas.height / dpr);
    }
    lastBox = box;

    if (dropped) {
      drawStrap();
      drawHook();
      placeCard();
    }
  }

  function strapPath() {
    ctx.beginPath();
    ctx.moveTo(P[0].x, P[0].y - sw); // starts beyond the anchor
    ctx.lineTo(P[0].x, P[0].y);
    for (let i = 1; i < N; i++) {
      const a = P[i], b = P[i + 1];
      ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
    }
    ctx.lineTo(P[N].x, P[N].y);
  }

  function drawStrap() {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'butt';
    // woven edge, body, then a soft centre sheen
    strapPath();
    ctx.lineWidth = sw;
    ctx.strokeStyle = '#1E4A2B';
    ctx.stroke();
    ctx.lineWidth = sw - 2.4;
    ctx.strokeStyle = '#0A1E11';
    ctx.stroke();
    ctx.lineWidth = sw * 0.34;
    ctx.strokeStyle = 'rgba(216, 255, 166, 0.035)';
    ctx.stroke();

    // printed logos at fixed positions along the strap
    if (!logoBmp) return;
    const gap = logoBmp.len + 46 * sc;
    let run = 0, next = 22 * sc;
    for (let i = 0; i < N; i++) {
      const a = P[i], b = P[i + 1];
      const L = Math.hypot(b.x - a.x, b.y - a.y);
      if (L < 0.001) continue;
      while (next - run <= L) {
        const t = (next - run) / L;
        if (next + logoBmp.len * 0.5 > N * segLen - 8 * sc) { base(); return; }
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        // tangent from the neighbours for a smooth turn
        const pa = P[Math.max(0, i - (t < 0.5 ? 1 : 0))];
        const pb = P[Math.min(N, i + 1 + (t >= 0.5 ? 1 : 0))];
        const ang = Math.atan2(pb.y - pa.y, pb.x - pa.x) - Math.PI / 2;
        base();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.drawImage(logoBmp.c, -logoBmp.w / 2, -logoBmp.h / 2, logoBmp.w, logoBmp.h);
        next += gap;
      }
      run += L;
    }
    base();
  }

  // the strap folds over a metal ring; a short clip runs into the card slot
  function drawHook() {
    const a = P[N], b = P[T];
    const ang = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    base();
    ctx.translate(a.x, a.y);
    ctx.rotate(ang);
    const u = sc;
    if (!metalGrad) {
      const g = ctx.createLinearGradient(-sw * 0.42, 0, sw * 0.42, 0);
      g.addColorStop(0, '#5E6B60');
      g.addColorStop(0.35, '#E9F1E4');
      g.addColorStop(0.6, '#A9B6A8');
      g.addColorStop(1, '#4C584E');
      metalGrad = g;
    }
    // strap end: folded over, with a stitched bar
    ctx.fillStyle = '#1E4A2B';
    roundRect(-sw / 2, -3 * u, sw, 8 * u, 3 * u);
    ctx.fill();
    ctx.fillStyle = '#0A1E11';
    roundRect(-sw / 2 + 1.2, -3 * u, sw - 2.4, 6.8 * u, 2.4 * u);
    ctx.fill();
    ctx.fillStyle = 'rgba(216, 255, 166, 0.22)';
    for (let x = -sw / 2 + 3 * u; x < sw / 2 - 2 * u; x += 2.6 * u) ctx.fillRect(x, -0.6 * u, 1.3 * u, 0.8);
    // D-ring the strap loops through
    ctx.lineWidth = 1.7 * u;
    ctx.strokeStyle = metalGrad;
    roundRect(-sw * 0.36, 3.2 * u, sw * 0.72, 6 * u, 2.6 * u);
    ctx.stroke();
    // swivel barrel
    ctx.fillStyle = metalGrad;
    roundRect(-2.4 * u, 8.6 * u, 4.8 * u, 6.4 * u, 2.2 * u);
    ctx.fill();
    // clip strip down to the slot
    const end = Math.max(16 * u, len);
    roundRect(-1.7 * u, 14 * u, 3.4 * u, end - 14 * u, 1.2 * u);
    ctx.fill();
    ctx.fillStyle = 'rgba(10, 20, 12, 0.35)';
    ctx.fillRect(-0.35 * u, 16 * u, 0.7 * u, Math.max(1, end - 19 * u));
    // the jaw that grips through the slot
    ctx.fillStyle = metalGrad;
    roundRect(-6.5 * u, end - 2.6 * u, 13 * u, 4.6 * u, 1.8 * u);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(-5.6 * u, end + 1.1 * u, 11.2 * u, 0.9 * u);
    base();
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function placeCard() {
    const t = P[T], b = P[B];
    const ang = Math.atan2(-(b.x - t.x), b.y - t.y);
    const tx = t.x - cw / 2, ty = t.y - holeY;
    const s = `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) rotate(${ang.toFixed(4)}rad) perspective(${Math.round(1100 * sc)}px) rotateY(${twist.toFixed(2)}deg)`;
    if (s !== tf) { card.style.transform = s; tf = s; }

    // holographic band: slides across with swing + twist, brighter with speed
    const deg = (ang * 180) / Math.PI;
    const v = Math.hypot(b.x - b.px, b.y - b.py) / SUB;
    const x = Math.max(-66, Math.min(0, -38 + deg * 1.9 + twist * 1.1));
    const o = Math.min(0.75, 0.13 + v / 1800 + Math.abs(twist) / 32);
    if (Math.abs(x - hx) > 0.05) { holo.style.transform = `translate3d(${x.toFixed(2)}%,0,0)`; hx = x; }
    if (Math.abs(o - ho) > 0.005) { holo.style.opacity = o.toFixed(3); ho = o; }
    const f = deg * 5 + twist * 4;
    if (Math.abs(f - fr) > 0.1) { foil.style.transform = `rotate(${f.toFixed(1)}deg)`; fr = f; }
  }

  /* ---------------------------------------------------------- loop */

  function frame(now) {
    raf = 0;
    if (!awake || !visible || document.hidden) return;
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) dt = 1 / 60;
    acc += Math.min(dt, 1 / 20);
    let n = 0;
    while (acc >= SUB && n < 8) { step(SUB); acc -= SUB; n++; }
    // on 240 Hz screens most frames carry no new physics step: nothing to draw
    if (!n) { raf = requestAnimationFrame(frame); return; }
    draw();
    if (!hanging && sinceDrop > 0.6) hanging = true;

    // sleep once everything is still
    let vmax = 0;
    for (let i = 1; i <= B; i++) {
      const p = P[i];
      const v = Math.abs(p.x - p.px) + Math.abs(p.y - p.py);
      if (v > vmax) vmax = v;
    }
    if (!grab && vmax < 0.012 && Math.abs(twistV) < 0.4 && Math.abs(twist) < 0.25) {
      if (++calm > 24) { awake = false; return; }
    } else calm = 0;
    raf = requestAnimationFrame(frame);
  }

  function wake() {
    awake = true;
    calm = 0;
    if (!raf && visible && !document.hidden) {
      last = performance.now();
      acc = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  /* ---------------------------------------------------------- input */

  function local(e) {
    const r = footer.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  if (physics) {
    card.addEventListener('pointerdown', (e) => {
      if (!dropped || e.button > 0 || isSmall()) return;
      e.preventDefault();
      card.setPointerCapture(e.pointerId);
      card.classList.add('is-drag');
      const p = local(e);
      const dx = P[B].x - P[T].x, dy = P[B].y - P[T].y;
      const s = Math.max(0, Math.min(1, ((p.x - P[T].x) * dx + (p.y - P[T].y) * dy) / (dx * dx + dy * dy)));
      const gx = P[T].x + dx * s, gy = P[T].y + dy * s;
      grab = { s, ox: p.x - gx, oy: p.y - gy, tx: p.x, ty: p.y, ptx: p.x, pty: p.y, cx: p.x, cy: p.y, k: 1, dk: 1 };
      wake();
    });
    card.addEventListener('pointermove', (e) => {
      if (grab) {
        const p = local(e);
        // tethered: the hand can't pull the strap much past its length
        const reach = N * segLen + hookLen + (ch - holeY) * grab.s + 30 * sc;
        let dx = p.x - ax, dy = p.y - ay;
        const d = Math.hypot(dx, dy);
        if (d > reach) { dx *= reach / d; dy *= reach / d; }
        grab.ptx = grab.cx; grab.pty = grab.cy;
        grab.tx = ax + dx; grab.ty = ay + dy;
        grab.k = 0;
        grab.dk = 0.5; // reaches the pointer over ~2 sub-steps
        wake();
        return;
      }
      // a brush of the cursor nudges the badge
      if (!dropped || isSmall() || (!e.movementX && !e.movementY)) return;
      const k = 0.06;
      const mx = Math.max(-14, Math.min(14, e.movementX)) * k;
      const my = Math.max(-14, Math.min(14, e.movementY)) * k * 0.4;
      P[B].px -= mx; P[B].py -= my;
      P[T].px -= mx * 0.4;
      wake();
    });
    const release = (e) => {
      if (!grab) return;
      grab = null;
      card.classList.remove('is-drag');
      if (card.hasPointerCapture && card.hasPointerCapture(e.pointerId)) card.releasePointerCapture(e.pointerId);
      wake();
    };
    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', release);
    card.addEventListener('lostpointercapture', release);
  }

  /* ---------------------------------------------------------- lifecycle */

  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible && awake) wake();
  }, { rootMargin: '80px 0px' }).observe(footer);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && awake) wake();
  });

  function settle() {
    // hang the card at rest without motion (reduced motion / after a resize)
    restPose();
    lastBox = null;
    draw();
  }

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      fit();
      if (isSmall()) {
        awake = false;
        card.style.transform = '';
        tf = '';
        return;
      }
      layout();
      if (dropped) settle();
    }, 160);
  });

  const start = () => {
    if (isSmall()) {
      // static fallback: the card sits in the flow, the name prints at once
      print(DEFAULT);
      return;
    }
    layout();
    restPose();
    ready = true;
    if (!physics) {
      // reduced motion: shown hanging at rest, no physics
      dropped = true;
      hanging = true;
      back.style.opacity = '1';
      print(DEFAULT);
      settle();
      return;
    }
    draw();
    if (wantDrop) drop();
    // drop once the credential's resting place is mostly on screen
    once(cue, '0px', () => drop());
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  else window.addEventListener('load', start);
})();
