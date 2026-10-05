/* ============================================================
   Rodapé G5 — "Crachá no centro"  (see footer-g5.css)
   1. Arrival, read from the scroll position (no layout reads while
      scrolling, no permanent loop):
      - the floor glow rises into place with a ~1 s lag;
      - the two halves of the statement rise out of their masks,
        leaving the slot on the central axis empty;
      - the calls to action, the link groups (from the axis outward)
        and the bottom bar settle in;
      - the credential drops from above the screen into the slot,
        snaps its strap taut, swings and comes to rest (one-shot).
   2. Physics (verlet / position-based, from footer-g): a strap of N
      points hangs from an anchor above the screen, a rigid hook joins
      it to the card, the card is a rigid bar (slot -> bottom) so it
      rotates like a real badge; a damped spring adds the twist around
      the vertical axis. Grab and throw it. The backlight on the wall
      follows the card.
   3. Draw: the strap on one small canvas around the anchor (dirty-rect
      clears, DPR <= 1.5); the card and the backlight move by transform.
   The physics loop sleeps at rest, off-screen and on a hidden tab.
   ============================================================ */

(() => {
  const foot = document.getElementById('fg5-foot');
  if (!foot) return;

  const root = document.documentElement;
  const $ = (s) => foot.querySelector(s);
  const $$ = (s) => Array.from(foot.querySelectorAll(s));

  const canvas = $('.fg5-strap');
  const card = $('.fg5-card');
  const dock = $('.fg5-dock');
  const halo = $('.fg5-halo');
  const holo = $('.fg5-holo-in');
  const foil = $('.fg5-seal-foil');
  const ctx = canvas.getContext('2d');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmall = () => window.innerWidth < 900;
  const hasGsap = typeof window.gsap !== 'undefined';
  const motion = root.classList.contains('fg5-js') && hasGsap && !reduce;
  if (!motion) root.classList.remove('fg5-js');

  // shared by the arrival (which asks for the drop) and the physics
  let ready = false, wantDrop = false, dropped = false;

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
  })($('.fg5-qr'));

  /* ---------------------------------------------------------- back to top */

  const up = $('.fg5-up');
  if (up) {
    up.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  /* ---------------------------------------------------------- arrival */

  // a tiny scrub: a frame is requested only while the smoothed value is
  // still catching up with its target (no loop for the page's life)
  function scrub(render, tau) {
    let cur = null, tgt = 0, raf = 0, last = 0;
    const step = (t) => {
      const dt = last ? Math.min(0.1, (t - last) / 1000) : 1 / 60;
      last = t;
      cur += (tgt - cur) * (1 - Math.exp(-dt / tau));
      if (Math.abs(tgt - cur) < 0.0005) cur = tgt;
      render(cur);
      if (cur === tgt) { raf = 0; last = 0; }
      else raf = requestAnimationFrame(step);
    };
    return {
      to(v) {
        tgt = v;
        if (cur === null) { cur = v; render(cur); }
        else if (!raf && cur !== tgt) raf = requestAnimationFrame(step);
      },
    };
  }

  function arrival() {
    const gsap = window.gsap;
    const words = $$('.fg5-wi');
    const rv = $$('[data-rv]');
    const rise = $('.fg5-rise');

    // starting states (mirror the CSS; y:0 drops the CSS translate)
    gsap.set(words, { yPercent: 106, y: 0 });
    gsap.set(rv, { autoAlpha: 0, y: 18 });

    let G = null;
    const measure = () => {
      const r = foot.getBoundingClientRect();
      G = { top: r.top + window.scrollY, vh: window.innerHeight };
    };

    // the floor glow rises with the footer, from below and dim
    let lastRise = '';
    const riseS = scrub((p) => {
      const s = `translate3d(0,${((1 - p) * 24).toFixed(2)}%,0)`;
      if (s !== lastRise) {
        rise.style.transform = s;
        rise.style.opacity = (0.2 + 0.8 * p).toFixed(3);
        lastRise = s;
      }
    }, 0.32);

    let saidWords = false, saidRest = false, saidDrop = false;
    const update = () => {
      if (!G) return;
      // 0 when the footer's top meets the bottom of the screen, 1 when it
      // reaches the top
      const p = (window.scrollY + G.vh - G.top) / G.vh;
      riseS.to(Math.max(0, Math.min(1, p)));
      if (!saidWords && p > 0.3) {
        saidWords = true;
        gsap.to(words, { yPercent: 0, duration: 1.5, ease: 'expo.out', stagger: 0.14 });
      }
      if (!saidRest && p > 0.52) {
        saidRest = true;
        // from the axis outward: calls to action, inner groups, outer groups, bar
        const tl = gsap.timeline({ defaults: { duration: 1.2, ease: 'power3.out' } });
        rv.forEach((el) => {
          const o = +el.dataset.rv || 0;
          tl.to(el, { autoAlpha: 1, y: 0, duration: o === 3 ? 1.4 : 1.2 }, o * 0.11);
        });
      }
      if (!saidDrop && p > 0.74) {
        saidDrop = true;
        drop();
      }
    };

    let rt = 0;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { measure(); update(); }, 140);
    });
    window.addEventListener('scroll', update, { passive: true });
    measure();
    update();
    // web fonts and images change the heights above: re-measure once in
    const again = () => { measure(); update(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(again);
    window.addEventListener('load', again);

    // magnetic primary call to action
    const mag = $('.fg5-mag');
    if (mag && matchMedia('(hover: hover)').matches) {
      const xTo = gsap.quickTo(mag, 'x', { duration: 0.7, ease: 'power3.out' });
      const yTo = gsap.quickTo(mag, 'y', { duration: 0.7, ease: 'power3.out' });
      let r = null;
      mag.addEventListener('pointerenter', () => { r = mag.getBoundingClientRect(); });
      mag.addEventListener('pointermove', (e) => {
        if (!r) r = mag.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.14);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      mag.addEventListener('pointerleave', () => { r = null; xTo(0); yTo(0); });
    }
  }

  if (motion) arrival();

  /* ---------------------------------------------------------- physics */

  const N = 12;              // strap segments
  const SUB = 1 / 120;       // fixed sub-step (s)
  const ITER = 14;           // constraint iterations per sub-step
  const CARD_W = 0.22;       // inverse mass of the two card points (heavier)
  // the strap's give while the drop snaps it taut, then it firms up
  const SNAP_T = 0.5, SNAP_K = 0.5, SNAP_R = 2, GIVE = 0.015;
  // air drag: a base, plus a little more once the motion is small, so it
  // swings past the centre about twice and then settles
  const DRAG_A = 0.85, DRAG_B = 1.4;

  let W = 0, H = 0, dpr = 1;
  let cw = 0, ch = 0, holeY = 0, sc = 1;
  let ax = 0, ay = 0, segLen = 0, hookLen = 0, sw = 0;
  let restHole = 0;          // the slot's height at rest (footer coords)
  let ox = 0, cvW = 0, cvH = 0; // the canvas box (footer coords)

  // points: 0 = anchor, 1..N = strap, N+1 = card slot (T), N+2 = card bottom (B)
  const P = [];
  const T = N + 1, B = N + 2;
  for (let i = 0; i <= B; i++) P.push({ x: 0, y: 0, px: 0, py: 0, w: 1 });
  P[0].w = 0;
  P[T].w = CARD_W;
  P[B].w = CARD_W;

  let twist = 0, twistV = 0;           // deg, deg/s
  let awake = false, visible = false, raf = 0, sinceDrop = 9;
  let last = 0, acc = 0, calm = 0, frames = 0;
  let grab = null;
  let logoBmp = null;

  function layout() {
    const fr = foot.getBoundingClientRect();
    const d = dock.getBoundingClientRect();
    W = fr.width;
    H = fr.height;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cw = card.offsetWidth;
    ch = card.offsetHeight;
    sc = cw / 280;
    const fs = cw / 17.5;                 // the card's em
    holeY = fs * (0.62 + 0.26);           // centre of the punched slot
    card.style.transformOrigin = `50% ${holeY}px`;
    sw = Math.round(19 * sc);             // strap width
    hookLen = 30 * sc;
    // the badge hangs on the central axis, from an anchor high above the
    // screen: a long lanyard gives a slow, heavy swing
    ax = Math.round(d.left - fr.left + d.width / 2);
    restHole = d.top - fr.top + holeY;
    ay = -Math.round(ch * 1.08 + 40 * sc);
    segLen = (restHole - hookLen - ay) / N;

    // the canvas only covers what the strap can reach below the top edge
    const R = N * segLen + hookLen + 40 * sc;
    const half = Math.sqrt(Math.max(0, R * R - ay * ay)) + sw + 28;
    cvW = Math.min(W, Math.ceil(half * 2));
    cvH = Math.ceil(ay + R + 30 * sc);
    ox = Math.round(Math.max(0, Math.min(W - cvW, ax - cvW / 2)));
    canvas.style.left = ox + 'px';
    canvas.style.width = cvW + 'px';
    canvas.style.height = cvH + 'px';
    canvas.width = Math.round(cvW * dpr);
    canvas.height = Math.round(cvH * dpr);
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

  /* the drop: the card starts above the top edge, a little to the side,
     its strap coiled loose above it; it falls, snaps the strap taut and
     swings into the slot between the two halves */
  function drop() {
    if (dropped || !motion || isSmall()) return;
    if (!ready) { wantDrop = true; return; }
    dropped = true;
    sinceDrop = 0;
    const off = 54 * sc;
    // the card's bottom well above the edge, so it is already falling
    // fast when it comes into view (no hesitation under the menu)
    const yT = -(ch - holeY) - 170 * sc;
    set(P[T], ax + off, yT);
    set(P[B], ax + off + 4 * sc, yT + (ch - holeY));
    const yN = yT - hookLen;
    const loop = Math.max(0, (N * segLen - Math.hypot(off, yN - ay)) / 2);
    for (let i = 1; i <= N; i++) {
      const t = i / N;
      // slack strap looped up above the anchor
      set(P[i], ax + off * t + Math.sin(t * Math.PI) * 26 * sc,
        ay + (yN - ay) * t - Math.sin(t * Math.PI) * loop * 0.92);
    }
    P[T].py -= 5 * sc; // an initial downward speed
    P[B].py -= 5 * sc;
    twist = -16;       // it falls slightly turned and squares up as it settles
    twistV = 0;
    // the backlight on the wall swells as the card lands in front of it
    if (halo && window.gsap) {
      window.gsap.fromTo(halo, { opacity: 0.5 }, { opacity: 1, duration: 1.8, delay: 0.35, ease: 'sine.out' });
    }
    wake();
  }

  function step(dt) {
    // the strap has some give only while the drop snaps it taut, then it
    // firms up to its exact length (no sag at rest)
    sinceDrop += dt;
    const ropeK = sinceDrop < SNAP_T ? SNAP_K : Math.min(1, SNAP_K + (sinceDrop - SNAP_T) * SNAP_R);
    const g = 4300 * Math.max(0.85, Math.min(1.25, sc)); // px/s^2
    // drag: light while swinging, firmer once the motion is small
    const speed = Math.hypot(P[B].x - P[B].px, P[B].y - P[B].py) / dt;
    const q = Math.max(0, Math.min(1, (speed - 30) / 130));
    const drag = grab ? 0.9 : DRAG_A + DRAG_B * (1 - q * q * (3 - 2 * q));
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

    // long-range attachment: no point of the strap (nor the card's slot)
    // may get farther from the anchor than the strap length above it.
    // An iterative chain alone stretches under the heavy card and springs
    // back (a bounce); this keeps the lanyard inextensible, with a hair of
    // give only while the drop snaps it taut
    const give = 1 + (sinceDrop < SNAP_T ? GIVE : Math.max(0, GIVE * (1 - (sinceDrop - SNAP_T) * 3)));

    for (let it = 0; it < ITER; it++) {
      // strap: inextensible but free to go slack
      for (let i = 0; i < N; i++) rope(P[i], P[i + 1], segLen, true, ropeK);
      rope(P[N], P[T], hookLen, false, 1);
      rope(P[T], P[B], ch - holeY, false, 1);
      if (grab) pin();
      for (let i = 2; i <= N; i++) tether(P[i], i * segLen * give);
      tether(P[T], N * segLen * give + hookLen);
      bounds();
    }

    // twist: a damped spring chasing the card's sideways speed
    const vx = ((P[T].x - P[T].px) + (P[B].x - P[B].px)) * 0.5 / dt;
    const target = Math.max(-26, Math.min(26, vx * 0.03));
    twistV += ((target - twist) * 60 - twistV * 7.5) * dt;
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

  function tether(p, max) {
    const dx = p.x - ax, dy = p.y - ay;
    const d = Math.hypot(dx, dy);
    if (d <= max) return;
    const k = max / d;
    p.x = ax + dx * k;
    p.y = ay + dy * k;
  }

  // pin a point on the card's axis (at fraction s from the slot) to the pointer
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
    // once it has dropped in, the card can't be pulled out over the top edge
    if (sinceDrop > 1 && P[T].y < 24) P[T].y = 24;
  }

  /* ---------------------------------------------------------- render */

  let lastBox = null;
  // last written values (start out of range so the first frame always writes)
  let tf = '', hx = Infinity, ho = Infinity, fr = Infinity, hl = '';
  let restCx = 0, restCy = 0;

  // canvas transform: footer coordinates, shifted to the canvas box
  function base() { ctx.setTransform(dpr, 0, 0, dpr, -ox * dpr, 0); }

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
    base();
    // dirty rect = last frame's box + this frame's box
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i <= T; i++) {
      const p = P[i];
      if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
      if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
    }
    const pad = sw + 16 * sc;
    const box = { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
    if (lastBox) {
      const cx0 = Math.min(box.x0, lastBox.x0), cy0 = Math.min(box.y0, lastBox.y0);
      const cx1 = Math.max(box.x1, lastBox.x1), cy1 = Math.max(box.y1, lastBox.y1);
      ctx.clearRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
    } else {
      ctx.clearRect(ox, 0, cvW, cvH);
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
    ctx.moveTo(P[0].x, P[0].y);
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
    ctx.strokeStyle = '#21522F';
    ctx.stroke();
    ctx.lineWidth = sw - 2.4;
    ctx.strokeStyle = '#0B2013';
    ctx.stroke();
    ctx.lineWidth = sw * 0.34;
    ctx.strokeStyle = 'rgba(216, 255, 166, 0.04)';
    ctx.stroke();

    // printed logos at fixed positions along the strap, counted from its
    // lower end so the last one always sits just above the ring
    if (!logoBmp) return;
    const gap = logoBmp.len + 46 * sc;
    const total = N * segLen;
    let s = total - 24 * sc - logoBmp.len * 0.5;
    const marks = [];
    while (s > logoBmp.len) { marks.push(s); s -= gap; }
    let acc = 0, k = marks.length - 1;
    for (let i = 0; i < N && k >= 0; i++) {
      const a = P[i], b = P[i + 1];
      const L = Math.hypot(b.x - a.x, b.y - a.y);
      while (k >= 0 && marks[k] - acc <= L) {
        if (L < 0.001) { k--; continue; }
        const t = (marks[k] - acc) / L;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        k--;
        if (y < -logoBmp.len || x < ox - 40 || x > ox + cvW + 40) continue;
        // tangent from the neighbours for a smooth turn
        const pa = P[Math.max(0, i - (t < 0.5 ? 1 : 0))];
        const pb = P[Math.min(N, i + 1 + (t >= 0.5 ? 1 : 0))];
        const ang = Math.atan2(pb.y - pa.y, pb.x - pa.x) - Math.PI / 2;
        base();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.drawImage(logoBmp.c, -logoBmp.w / 2, -logoBmp.h / 2, logoBmp.w, logoBmp.h);
      }
      acc += L;
    }
    base();
  }

  // the strap folds over a metal ring; a short clip runs into the card slot
  let metalGrad = null;
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
    ctx.fillStyle = '#21522F';
    roundRect(-sw / 2, -3 * u, sw, 8 * u, 3 * u);
    ctx.fill();
    ctx.fillStyle = '#0B2013';
    roundRect(-sw / 2 + 1.2, -3 * u, sw - 2.4, 6.8 * u, 2.4 * u);
    ctx.fill();
    ctx.fillStyle = 'rgba(216, 255, 166, 0.24)';
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
    const o = Math.min(0.8, 0.22 + v / 2000 + Math.abs(twist) / 40);
    if (Math.abs(x - hx) > 0.05) { holo.style.transform = `translate3d(${x.toFixed(2)}%,0,0)`; hx = x; }
    if (Math.abs(o - ho) > 0.005) { holo.style.opacity = o.toFixed(3); ho = o; }
    const f = deg * 5 + twist * 4;
    if (Math.abs(f - fr) > 0.1) { foil.style.transform = `rotate(${f.toFixed(1)}deg)`; fr = f; }

    // the backlight on the wall follows the card (a little behind it)
    if (halo) {
      const cx = (t.x + b.x) / 2, cy = (t.y + b.y) / 2;
      const hs = `translate3d(${((cx - restCx) * 0.8).toFixed(1)}px,${((cy - restCy) * 0.8).toFixed(1)}px,0)`;
      if (hs !== hl) { halo.style.transform = hs; hl = hs; }
    }
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
    frames++;
    draw();

    // sleep once everything is still
    let vmax = 0;
    for (let i = 1; i <= B; i++) {
      const p = P[i];
      const v = Math.abs(p.x - p.px) + Math.abs(p.y - p.py);
      if (v > vmax) vmax = v;
    }
    if (!grab && sinceDrop > 1 && vmax < 0.012 && Math.abs(twistV) < 0.4 && Math.abs(twist) < 0.25) {
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
  foot.fg5State = () => ({
    awake, dropped, visible, frames, raf: !!raf, grab: !!grab,
    twist: +twist.toFixed(3),
    cardX: +((P[T].x + P[B].x) / 2).toFixed(2), cardY: +((P[T].y + P[B].y) / 2).toFixed(2),
    restX: restCx, restY: restCy,
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

  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible && awake) wake();
  }, { rootMargin: '80px 0px' });
  io.observe(foot);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && awake) wake();
  });

  function settle() {
    layout();
    restPose();
    restCx = ax;
    restCy = (P[T].y + P[B].y) / 2;
  }

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (isSmall()) return;
      grab = null;
      settle();
      hl = '';
      draw();
    }, 160);
  });

  const start = () => {
    if (isSmall()) return; // static fallback: the lanyard stage is hidden
    settle();
    ready = true;
    if (!motion) {
      dropped = true; // shown at rest, no physics
      draw();
      return;
    }
    draw();
    if (wantDrop) drop();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  else window.addEventListener('load', start);
})();
