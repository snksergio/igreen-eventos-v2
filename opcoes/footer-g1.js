/* ============================================================
   Rodapé G1 — "Crachá na aurora"  (see footer-g1.css)

   1. Hand-over (scroll-linked, ~1 s lag): the aurora rises from below
      as the footer comes up; the top of the room stays the page's
      black. The statement lines rise out of their masks, the actions,
      the hairline, the columns and the bar follow (one-shots).
   2. Signature: when the footer has almost filled the screen, the
      credential drops from above the viewport on its strap, snaps
      taut and swings to rest in the last three columns. As it falls
      into the backlight its rim lights up and the light behind it
      wakes (one-shot). It can be grabbed and thrown; lifted out of the
      light, its rim dims.
   3. Physics: verlet / position-based (from footer G). A strap of N
      points hangs from an anchor above the footer's top edge, a rigid
      hook joins it to the card, and the card is a rigid bar (hole ->
      bottom) so it rotates like a real badge; a damped spring adds the
      twist around the vertical axis. The strap is one canvas (dirty
      rects, DPR <= 1.5) that fades into the dark at the top; the card
      is a DOM node moved with transform only.
   Nothing runs at rest: the physics loop sleeps when still, off-screen
   and on a hidden tab; the light loops are CSS animations (compositor)
   paused off-screen; the clock ticks once a second while visible.
   ============================================================ */

(() => {
  const foot = document.getElementById('fg1-foot');
  if (!foot) return;

  const root = document.documentElement;
  const $ = (s) => foot.querySelector(s);
  const $$ = (s) => Array.from(foot.querySelectorAll(s));
  const hasGsap = typeof window.gsap !== 'undefined';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = () => window.innerWidth < 900;
  const still = root.classList.contains('fg1-static');
  const motion = !still;
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  if (motion && !hasGsap) root.classList.remove('fg1-motion'); // no entrance, content as is

  /* ---------------------------------------------------------- QR dots */

  (function buildQR(svg) {
    if (!svg) return;
    const n = 25;
    let seed = 816;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const inFinder = (x, y) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
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
  })($('.fg1-qr'));

  /* ---------------------------------------------------------- clock */

  const clockT = $('.fg1-clock-t');
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  let clockTimer = 0;
  const tick = () => {
    const t = fmt.format(new Date());
    if (clockT.textContent !== t) {
      clockT.textContent = t;
      clockT.setAttribute('datetime', t);
    }
  };
  const startClock = () => {
    if (clockTimer) return;
    tick();
    const loop = () => {
      tick();
      clockTimer = setTimeout(loop, 1000 - (Date.now() % 1000) + 4);
    };
    clockTimer = setTimeout(loop, 1000 - (Date.now() % 1000) + 4);
  };
  const stopClock = () => {
    clearTimeout(clockTimer);
    clockTimer = 0;
  };
  tick();

  /* ---------------------------------------------------------- live state */

  let onScreen = false;
  const watchers = [];
  const sync = () => {
    const live = onScreen && !document.hidden;
    foot.classList.toggle('fg1-live', live && motion);
    if (live) startClock();
    else stopClock();
    watchers.forEach((fn) => fn(live));
  };
  new IntersectionObserver((entries) => {
    onScreen = entries[entries.length - 1].isIntersecting;
    sync();
  }, { rootMargin: '80px 0px' }).observe(foot);
  document.addEventListener('visibilitychange', sync);

  /* ---------------------------------------------------------- magnetic CTA */

  const mag = $('.fg1-mag');
  if (mag && motion && window.matchMedia('(hover: hover)').matches) {
    // CSS transitions retarget smoothly; no loop is kept alive
    let r = null;
    mag.addEventListener('pointerenter', () => { r = mag.getBoundingClientRect(); });
    mag.addEventListener('pointermove', (e) => {
      if (!r) r = mag.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * 0.12;
      const y = (e.clientY - (r.top + r.height / 2)) * 0.28;
      mag.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    });
    mag.addEventListener('pointerleave', () => { r = null; mag.style.transform = ''; });
  }

  /* ---------------------------------------------------------- hand-over */

  // a tiny scrub: a frame is requested only while the smoothed value is
  // still catching up with the scroll (no loop at rest); off-screen it
  // simply snaps to the target
  function scrub(render, tau) {
    let cur = null, tgt = 0, raf = 0, last = 0;
    const step = (t) => {
      const dt = last ? Math.min(0.1, (t - last) / 1000) : 1 / 60;
      last = t;
      cur += (tgt - cur) * (1 - Math.exp(-dt / tau));
      if (Math.abs(tgt - cur) < 0.0005 || !onScreen) cur = tgt;
      render(cur);
      if (cur === tgt) { raf = 0; last = 0; } else raf = requestAnimationFrame(step);
    };
    return {
      to(v) {
        tgt = v;
        if (cur === null) { cur = v; render(cur); } else if (!raf && cur !== tgt) raf = requestAnimationFrame(step);
      },
    };
  }

  let G = null; // cached document geometry, refreshed on resize
  const measure = () => {
    const y = window.scrollY;
    const f = foot.getBoundingClientRect();
    G = {
      vh: window.innerHeight,
      footTop: f.top + y,
      footH: f.height,
      maxY: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    };
  };

  let onScrollDrop = null; // set by the lanyard
  let riseS = null;
  const update = () => {
    if (!G) return;
    const y = window.scrollY;
    if (riseS) riseS.to(clamp01((y - (G.footTop - G.vh)) / Math.max(1, G.footH)));
    if (onScrollDrop && (y >= G.footTop - G.vh * 0.25 || y >= G.maxY - 2)) onScrollDrop();
  };

  if (motion && hasGsap) {
    const gsap = window.gsap;
    const rise = $('.fg1-rise');
    riseS = scrub((p) => {
      const e = 1 - (1 - p) * (1 - p); // ease out: the haze settles as the page ends
      rise.style.transform = `translate3d(0, ${((1 - e) * 30).toFixed(3)}%, 0)`;
      rise.style.opacity = (0.3 + 0.7 * e).toFixed(3);
    }, 0.32);

    const lines = $$('.fg1-li');
    const actions = $('.fg1-actions');
    const rule = $('.fg1-rule');
    const cols = $$('.fg1-row .fg1-rv');
    const bar = $('.fg1-bar');
    // mirror the CSS starting states (y:0 drops the CSS translate GSAP would read as px)
    gsap.set(lines, { yPercent: 110, y: 0 });
    gsap.set([actions, ...cols, bar], { autoAlpha: 0, y: 24 });
    gsap.set(rule, { scaleX: 0, transformOrigin: '0% 50%' });

    const once = (el, margin, play) => {
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        play();
      }, { rootMargin: margin });
      io.observe(el);
    };
    once($('.fg1-head'), '0px 0px -16% 0px', () => {
      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .to(lines, { yPercent: 0, duration: 1.5, stagger: 0.13 })
        .to(actions, { autoAlpha: 1, y: 0, duration: 1.3 }, 0.42);
    });
    once($('.fg1-row'), '0px 0px -10% 0px', () => {
      gsap.timeline()
        .to(rule, { scaleX: 1, duration: 1.8, ease: 'expo.inOut' })
        .to(cols, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.09, ease: 'power3.out' }, 0.25);
    });
    once(bar, '0px 0px -2% 0px', () => {
      gsap.to(bar, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: 0.2 });
    });
  }

  window.addEventListener('scroll', update, { passive: true });

  /* ============================================================
     The lanyard
     ============================================================ */

  const canvas = $('.fg1-strap');
  const card = $('.fg1-card');
  const halo = $('.fg1-halo');
  const holo = $('.fg1-holo-in');
  const slot = $('.fg1-slot');
  const row = $('.fg1-row');
  const ctx = canvas.getContext('2d');

  const N = 10;          // strap segments
  const SUB = 1 / 120;   // fixed sub-step (s)
  const ITER = 14;       // constraint iterations per sub-step
  const CARD_W = 0.22;   // inverse mass of the two card points (heavier)

  let ready = false, wantDrop = false, dropped = false, lit = false;
  let W = 0, H = 0, dpr = 1;
  let cw = 0, ch = 0, holeY = 0, sc = 1;
  let ax = 0, ay = 0, segLen = 0, hookLen = 0, sw = 0, restT = 0, restCy = 0;
  let fadeA = 0, fadeB = 0, fadeGrad = null;

  // points: 0 = anchor, 1..N = strap, N+1 = card hole (T), N+2 = card bottom (B)
  const P = [];
  const T = N + 1, B = N + 2;
  for (let i = 0; i <= B; i++) P.push({ x: 0, y: 0, px: 0, py: 0, w: 1 });
  P[0].w = 0;
  P[T].w = CARD_W;
  P[B].w = CARD_W;

  let twist = 0, twistV = 0;          // deg, deg/s
  let awake = false, visible = false, raf = 0, sinceDrop = 9;
  let last = 0, acc = 0, calm = 0;
  let grab = null;
  let logoBmp = null;
  let lastBox = null;

  function layout() {
    const r = foot.getBoundingClientRect();
    W = r.width;
    H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    cw = card.offsetWidth;
    ch = card.offsetHeight;
    sc = cw / 280;
    const fs = cw / 17.5;                 // the card's em
    holeY = fs * (0.62 + 0.26);           // centre of the punched slot
    card.style.transformOrigin = `50% ${holeY}px`;
    sw = Math.round(19 * sc);             // strap width
    hookLen = 30 * sc;
    // the credential owns columns 10-12; at rest its bottom edge sits on
    // the bottom of the menu / tour / contact row
    const s = slot.getBoundingClientRect();
    ax = Math.round(s.left - r.left + s.width / 2);
    ay = -Math.round(40 * sc);
    const rowBottom = row.getBoundingClientRect().bottom - r.top;
    restT = rowBottom - ch + holeY;
    restCy = rowBottom - ch / 2;
    segLen = (restT - ay - hookLen) / N;
    foot.style.setProperty('--fg1-cy', `${restCy.toFixed(1)}px`);
    // the strap comes out of the dark: erased above fadeA, fully there at fadeB
    fadeA = Math.min(70, restT * 0.2);
    fadeB = Math.max(fadeA + 60, restT * 0.62);
    fadeGrad = ctx.createLinearGradient(0, fadeA, 0, fadeB);
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      const s2 = t * t * (3 - 2 * t);
      fadeGrad.addColorStop(t, `rgba(0,0,0,${(1 - s2).toFixed(3)})`);
    }
    lastBox = null;
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
     it falls, snaps taut and swings in */
  function drop() {
    if (dropped || !motion || small()) return;
    if (!ready) { wantDrop = true; return; }
    dropped = true;
    onScrollDrop = null;
    sinceDrop = 0;
    const off = 90 * sc;
    const top = -(ch + hookLen + 36 * sc);
    set(P[T], ax + off, top);
    set(P[B], ax + off + 6 * sc, top + (ch - holeY));
    for (let i = 1; i <= N; i++) {
      const t = i / N;
      // slack strap bunched above the edge
      set(P[i], ax + off * t * 0.9, ay - 40 * sc - Math.sin(t * Math.PI) * 120 * sc - t * 60 * sc);
    }
    P[T].py -= 3 * sc; // a little initial downward speed
    P[B].py -= 3 * sc;
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

  // stiff = share of the error fixed per iteration: < 1 gives the strap a
  // little give, so the snap when it goes taut is firm but not a whip
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

  let tf = '', hx = NaN, ho = NaN, hl = NaN;

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
  logoImg.onload = () => { if (!ready) return; buildLogo(); draw(); };
  logoImg.src = '../assets/img/igreen-logo.svg';

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // dirty rect = last frame's box + this frame's box
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i <= T; i++) {
      const p = P[i];
      if (p.x < x0) x0 = p.x;
      if (p.x > x1) x1 = p.x;
      if (p.y < y0) y0 = p.y;
      if (p.y > y1) y1 = p.y;
    }
    const pad = sw + 14 * sc;
    const box = { x0: x0 - pad, y0: Math.min(y0, ay) - pad, x1: x1 + pad, y1: y1 + pad };
    if (lastBox) {
      const cx0 = Math.min(box.x0, lastBox.x0), cy0 = Math.min(box.y0, lastBox.y0);
      const cx1 = Math.max(box.x1, lastBox.x1), cy1 = Math.max(box.y1, lastBox.y1);
      ctx.clearRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
    } else {
      ctx.clearRect(0, 0, W, H);
    }
    lastBox = box;
    if (!dropped) return;
    drawStrap();
    drawHook();
    fadeTop(box);
    placeCard();
  }

  // the strap emerges from the dark above: erase it toward the top edge
  function fadeTop(box) {
    if (box.y0 >= fadeB) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = fadeGrad;
    const top = Math.min(box.y0, fadeA);
    ctx.fillRect(box.x0, top, box.x1 - box.x0, fadeB - top);
    ctx.globalCompositeOperation = 'source-over';
  }

  function strapPath() {
    ctx.beginPath();
    ctx.moveTo(P[0].x, P[0].y - sw);
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
        if (next + logoBmp.len * 0.5 > N * segLen - 8 * sc) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return; }
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        const pa = P[Math.max(0, i - (t < 0.5 ? 1 : 0))];
        const pb = P[Math.min(N, i + 1 + (t >= 0.5 ? 1 : 0))];
        const ang = Math.atan2(pb.y - pa.y, pb.x - pa.x) - Math.PI / 2;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.drawImage(logoBmp.c, -logoBmp.w / 2, -logoBmp.h / 2, logoBmp.w, logoBmp.h);
        next += gap;
      }
      run += L;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // the strap folds over a metal ring; a short clip runs into the card slot
  let metalGrad = null;
  function drawHook() {
    const a = P[N], b = P[T];
    const ang = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(a.x, a.y);
    ctx.rotate(ang);
    const u = sc;
    if (!metalGrad || metalGrad.u !== u) {
      const g = ctx.createLinearGradient(-sw * 0.42, 0, sw * 0.42, 0);
      g.addColorStop(0, '#5E6B60');
      g.addColorStop(0.35, '#E9F1E4');
      g.addColorStop(0.6, '#A9B6A8');
      g.addColorStop(1, '#4C584E');
      metalGrad = { g, u };
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
    ctx.strokeStyle = metalGrad.g;
    roundRect(-sw * 0.36, 3.2 * u, sw * 0.72, 6 * u, 2.6 * u);
    ctx.stroke();
    // swivel barrel
    ctx.fillStyle = metalGrad.g;
    roundRect(-2.4 * u, 8.6 * u, 4.8 * u, 6.4 * u, 2.2 * u);
    ctx.fill();
    // clip strip down to the slot
    const end = Math.max(16 * u, len);
    roundRect(-1.7 * u, 14 * u, 3.4 * u, end - 14 * u, 1.2 * u);
    ctx.fill();
    ctx.fillStyle = 'rgba(10, 20, 12, 0.35)';
    ctx.fillRect(-0.35 * u, 16 * u, 0.7 * u, Math.max(1, end - 19 * u));
    // the jaw that grips through the slot
    ctx.fillStyle = metalGrad.g;
    roundRect(-6.5 * u, end - 2.6 * u, 13 * u, 4.6 * u, 1.8 * u);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(-5.6 * u, end + 1.1 * u, 11.2 * u, 0.9 * u);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    const o = Math.min(0.8, 0.22 + v / 2000 + Math.abs(twist) / 40);
    // (written as !(a <= b) so the first frame, against NaN, always writes)
    if (!(Math.abs(x - hx) <= 0.05)) { holo.style.transform = `translate3d(${x.toFixed(2)}%,0,0)`; hx = x; }
    if (!(Math.abs(o - ho) <= 0.005)) { holo.style.opacity = o.toFixed(3); ho = o; }

    // the rim lights up as the card enters the backlight (and dims when
    // it is lifted out of it)
    const cy = t.y + (b.y - t.y) * ((ch / 2 - holeY) / (ch - holeY));
    const k = clamp01((cy - (restCy - 1.15 * ch)) / (1.15 * ch));
    const l = k * k * (3 - 2 * k);
    if (!(Math.abs(l - hl) <= 0.004)) { halo.style.opacity = l.toFixed(3); hl = l; }
    if (!lit && l > 0.9) { lit = true; foot.classList.add('fg1-lit'); }
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
    // on fast screens most frames carry no new physics step: nothing to draw
    if (!n) { raf = requestAnimationFrame(frame); return; }
    draw();

    // sleep once everything is still
    let vmax = 0;
    for (let i = 1; i <= B; i++) {
      const p = P[i];
      const vv = Math.abs(p.x - p.px) + Math.abs(p.y - p.py);
      if (vv > vmax) vmax = vv;
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

  // read-only snapshot for the verification scripts
  foot.fg1State = () => ({ awake, dropped, visible, lit, grab: !!grab, twist, raf: !!raf, cardX: P[B].x, cardY: P[B].y });

  watchers.push((live) => {
    visible = live;
    if (live && awake) wake();
  });

  /* ---------------------------------------------------------- input */

  function local(e) {
    const r = foot.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  if (motion) {
    card.addEventListener('pointerdown', (e) => {
      if (!dropped || e.button > 0) return;
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
      if (!dropped || (!e.movementX && !e.movementY)) return;
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

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      measure();
      update();
      if (small()) return;
      layout();
      if (dropped) { restPose(); draw(); }
    }, 160);
  });

  const start = () => {
    measure();
    if (!small()) {
      layout();
      restPose();
      ready = true;
      draw();
      if (!motion) {
        // calm static state: the credential hangs at rest, lit
        dropped = true;
        lit = true;
        foot.classList.add('fg1-lit');
        draw();
      } else {
        onScrollDrop = drop;
        if (wantDrop) drop();
      }
    }
    update();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  else window.addEventListener('load', start);
})();
