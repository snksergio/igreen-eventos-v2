/* ============================================================
   Rodapé G — "Crachá"
   - Entrance: the statement rises out of its line masks, the rest
     follows; when the panel is well in view the credential drops in
     from above the top edge and swings to rest.
   - Physics: verlet / position-based. A strap of N points hangs from
     a pinned anchor on the panel's top edge (slack allowed), a rigid
     hook joins it to the card, and the card itself is a rigid bar
     (hole -> bottom) so it rotates like a real badge. A damped spring
     adds the twist around the vertical axis from sideways speed.
   - Draw: the strap on one canvas (dirty-rect clears, DPR <= 1.5),
     the card is a DOM node moved with transform only.
   - The loop sleeps at rest, off-screen and on a hidden tab.
   ============================================================ */

(() => {
  const footer = document.getElementById('fg-footer');
  if (!footer) return;

  const panel = footer.querySelector('.fg-panel');
  const canvas = footer.querySelector('.fg-strap');
  const card = footer.querySelector('.fg-card');
  const holo = footer.querySelector('.fg-holo-in');
  const foil = footer.querySelector('.fg-seal-foil');
  const ctx = canvas.getContext('2d');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmall = () => window.innerWidth <= 900;
  const hasGsap = typeof window.gsap !== 'undefined';
  // shared by the entrance (which asks for the drop) and the physics
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
  })(footer.querySelector('.fg-qr'));

  /* ---------------------------------------------------------- entrance */

  if (hasGsap && !reduce && !isSmall()) {
    const gsap = window.gsap;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
    footer.classList.add('fg-js');

    const lines = footer.querySelectorAll('.fg-line-in');
    // the CSS parks the lines below their masks; GSAP takes over from there
    gsap.set(lines, { yPercent: 105, y: 0 });
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    tl.to(lines, { yPercent: 0, duration: 1.35, stagger: 0.12 }, 0)
      .fromTo(footer.querySelector('.fg-sub'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out' }, 0.45)
      .fromTo(footer.querySelector('.fg-actions'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out' }, 0.55)
      .fromTo(footer.querySelectorAll('.fg-col'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1, stagger: 0.07, ease: 'power3.out' }, 0.7)
      .fromTo(footer.querySelector('.fg-bar'), { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power2.out' }, 1.0);

    if (window.ScrollTrigger) {
      window.ScrollTrigger.create({ trigger: panel, start: 'top 70%', once: true, onEnter: () => tl.play() });
      window.ScrollTrigger.create({ trigger: panel, start: 'top 42%', once: true, onEnter: () => drop() });
    } else {
      tl.play();
    }

    // magnetic primary CTA: drifts a few px toward the pointer
    const cta = footer.querySelector('.fg-cta');
    if (cta) {
      const qx = gsap.quickTo(cta, 'x', { duration: 0.6, ease: 'power3.out' });
      const qy = gsap.quickTo(cta, 'y', { duration: 0.6, ease: 'power3.out' });
      cta.addEventListener('pointermove', (e) => {
        const r = cta.getBoundingClientRect();
        qx((e.clientX - (r.left + r.width / 2)) * 0.18);
        qy((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      cta.addEventListener('pointerleave', () => { qx(0); qy(0); });
    }
  }

  if (isSmall()) return; // static fallback: the lanyard stage is hidden

  /* ---------------------------------------------------------- physics */

  const N = 10;              // strap segments
  const SUB = 1 / 120;       // fixed sub-step (s)
  const ITER = 14;           // constraint iterations per sub-step
  const CARD_W = 0.22;       // inverse mass of the two card points (heavier)

  let W = 0, H = 0, dpr = 1;
  let cw = 0, ch = 0, holeY = 0, sc = 1;
  let ax = 0, ay = 0, segLen = 0, hookLen = 0, sw = 0;

  // points: 0 = anchor, 1..N = strap, N+1 = card hole (T), N+2 = card bottom (B)
  const P = [];
  const T = N + 1, B = N + 2;
  for (let i = 0; i <= B; i++) P.push({ x: 0, y: 0, px: 0, py: 0, w: 1 });
  P[0].w = 0;
  P[T].w = CARD_W;
  P[B].w = CARD_W;

  let twist = 0, twistV = 0;           // deg, deg/s
  let awake = false, visible = false, raf = 0, sinceDrop = 9;
  let last = 0, acc = 0, calm = 0;
  let grab = null;                      // { s, ox, oy, tx, ty, ptx, pty }
  let logoBmp = null;

  function layout() {
    const r = panel.getBoundingClientRect();
    W = r.width;
    H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    cw = card.offsetWidth;
    ch = card.offsetHeight;
    sc = cw / 280;
    const fs = cw / 17.5;               // the card's em
    holeY = fs * (0.62 + 0.26);          // centre of the punched slot
    card.style.transformOrigin = `50% ${holeY}px`;
    sw = Math.round(19 * sc);           // strap width
    hookLen = 30 * sc;
    // the badge hangs at a fixed share of the panel width, inside the
    // 1240 grid on laptops and drifting into the margin on wide screens
    ax = Math.round(Math.min(W * 0.83, W - cw / 2 - 40));
    ay = -6;
    const restTop = Math.max(H * 0.29, 230 * sc);
    segLen = (restTop - ay - hookLen) / N;
    lastBox = null;
    buildLogo();
  }

  function restPose() {
    for (let i = 0; i <= N; i++) set(P[i], ax, ay + i * segLen);
    set(P[T], ax, P[N].y + hookLen);
    set(P[B], ax, P[T].y + (ch - holeY));
    twist = twistV = 0;
  }
  function set(p, x, y) { p.x = p.px = x; p.y = p.py = y; }

  /* the drop: everything starts above the top edge, offset sideways, so
     it falls, snaps taut and swings in */
  function drop() {
    if (dropped || reduce || isSmall()) return;
    if (!ready) { wantDrop = true; return; }
    dropped = true;
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
    // (smoothstep between 30 and 160 px/s so the tail dies without a seam)
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

  let lastBox = null;
  let tf = '', hx = NaN, ho = NaN, fr = NaN;

  function buildLogo() {
    if (!logoImg.complete || !logoImg.naturalWidth) return;
    // printed along the strap: rotated so it reads top to bottom
    const lh = sw * 0.46;                 // logo height across the strap
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
  const logoImg = new Image();
  logoImg.onload = () => { if (!ready) return; buildLogo(); draw(); };
  logoImg.src = '../assets/img/igreen-logo.svg';

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // dirty rect = last frame's box + this frame's box
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i <= T; i++) {
      const p = P[i];
      if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
      if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
    }
    const pad = sw + 12;
    const box = { x0: x0 - pad, y0: Math.min(y0, ay) - pad, x1: x1 + pad, y1: y1 + pad };
    if (lastBox) {
      const cx0 = Math.min(box.x0, lastBox.x0), cy0 = Math.min(box.y0, lastBox.y0);
      const cx1 = Math.max(box.x1, lastBox.x1), cy1 = Math.max(box.y1, lastBox.y1);
      ctx.clearRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
    } else {
      ctx.clearRect(0, 0, W, H);
    }
    lastBox = box;

    drawSlot();
    if (dropped) {
      drawStrap();
      drawHook();
      placeCard();
    }
  }

  // the slit in the panel's top edge the strap feeds out of
  function drawSlot() {
    const w = sw + 12 * sc, h = 7 * sc;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#000301';
    roundRect(ax - w / 2, -h / 2, w, h, h / 2);
    ctx.fill();
    // lit lower lip
    ctx.fillStyle = 'rgba(216, 255, 166, 0.16)';
    ctx.fillRect(ax - w / 2 + h / 2, h / 2 - 0.5, w - h, 1);
  }

  function strapPath() {
    ctx.beginPath();
    ctx.moveTo(P[0].x, P[0].y - sw); // starts beyond the cut edge
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
    let acc = 0, next = 22 * sc;
    for (let i = 0; i < N; i++) {
      const a = P[i], b = P[i + 1];
      const L = Math.hypot(b.x - a.x, b.y - a.y);
      if (L < 0.001) continue;
      while (next - acc <= L) {
        const t = (next - acc) / L;
        if (next + logoBmp.len * 0.5 > N * segLen - 8 * sc) return;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        // tangent from the neighbours for a smooth turn
        const pa = P[Math.max(0, i - (t < 0.5 ? 1 : 0))];
        const pb = P[Math.min(N, i + 1 + (t >= 0.5 ? 1 : 0))];
        const ang = Math.atan2(pb.y - pa.y, pb.x - pa.x) - Math.PI / 2;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.drawImage(logoBmp.c, -logoBmp.w / 2, -logoBmp.h / 2, logoBmp.w, logoBmp.h);
        next += gap;
      }
      acc += L;
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
    if (!(Math.abs(x - hx) <= 0.05)) { holo.style.transform = `translate3d(${x.toFixed(2)}%,0,0)`; hx = x; }
    if (!(Math.abs(o - ho) <= 0.005)) { holo.style.opacity = o.toFixed(3); ho = o; }
    const f = deg * 5 + twist * 4;
    if (!(Math.abs(f - fr) <= 0.1)) { foil.style.transform = `rotate(${f.toFixed(1)}deg)`; fr = f; }
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

  // read-only snapshot for the verification scripts
  footer.fgState = () => ({ awake, dropped, visible, grab: !!grab, twist, cardY: P[B].y, cardX: P[B].x });

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
    const r = panel.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  if (!reduce) {
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
      if (!dropped || !e.movementX && !e.movementY) return;
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
    visible = entries[0].isIntersecting;
    if (visible && awake) wake();
  }, { rootMargin: '80px 0px' });
  io.observe(panel);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && awake) wake();
  });

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (isSmall()) return;
      layout();
      restPose();
      draw();
    }, 160);
  });

  const start = () => {
    layout();
    restPose();
    ready = true;
    draw(); // the empty slot waits on the top edge
    if (wantDrop) drop();
    if (reduce) {
      dropped = true; // shown at rest, no physics
      draw();
    } else if (!hasGsap || !window.ScrollTrigger) {
      // no ScrollTrigger: drop when the panel is well in view
      const io2 = new IntersectionObserver((en) => {
        if (en[0].intersectionRatio > 0.45) { drop(); io2.disconnect(); }
      }, { threshold: [0, 0.45] });
      io2.observe(panel);
    }
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  else window.addEventListener('load', start);
})();
