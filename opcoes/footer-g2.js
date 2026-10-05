/* ============================================================
   Rodapé G2 — "Crachá no bloco lima"  (see footer-g2.css)
   1. Arrival (as footer A): the statement lines rise out of their masks,
      the CTA and the info grid follow, the hairline draws across.
   2. Scrubbed with the scroll (as footer A): the dark sheet lifts off the
      lime band waiting at the bottom of the screen and the giant letters
      rise out of it one after another.
   3. The credential: its strap is fastened under the sheet's lower edge.
      While the band is closed the badge lies out of sight below the page
      end. As the sheet lifts, the edge's position is fed into the
      simulation every sub-step: the strap tightens, hoists the badge up
      from below at an angle, and once it leaves the ground it swings free,
      pulled along by the sheet, to end dangling over the lime in front of
      the giant word. It can be grabbed and thrown.
   Physics: verlet / position based (strap of N points, rigid hook, the
   card as a rigid bar hole -> bottom, a damped spring for the twist).
   The strap is drawn on one canvas (dirty rects, DPR <= 1.5), the card is
   a DOM node moved with transform only. The loop sleeps at rest,
   off-screen and on a hidden tab, and never scrolls the page.
   ============================================================ */

(() => {
  const root = document.documentElement;
  const footer = document.querySelector('.fg2-footer');
  if (!footer) return;

  const sheet = footer.querySelector('.fg2-close');
  const band = footer.querySelector('.fg2-band');
  const bar = footer.querySelector('.fg2-bar');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmall = () => window.innerWidth <= 899;


  /* ---------------------------------------------------------- the last screen
     The band is as tall as the badge needs, so at the very end of the page
     the sheet shows only its lower part. Keep that crop clean: the statement
     is either fully in view under the fixed top bar or entirely above the
     screen — never sliced by it. Layout only, measured on load and resize. */

  const head = footer.querySelector('.fg2-head');
  const grid = footer.querySelector('.fg2-grid');
  const NAV = 88; // the site's fixed top bar
  function fitEnd() {
    footer.style.removeProperty('--fg2-gapx');
    if (isSmall()) return;
    const vh = window.innerHeight;
    const hb = band.offsetHeight;
    const sr = sheet.getBoundingClientRect();
    const gr = grid.getBoundingClientRect();
    const hr = head.getBoundingClientRect();
    const gap = gr.top - hr.bottom;         // A's gap, as laid out
    const below = sr.bottom - gr.top;       // the grid and the sheet's lower padding
    const headBottom = vh - hb - below - gap; // where the statement ends on the last screen
    if (headBottom - hr.height >= NAV + 20) return;
    footer.style.setProperty('--fg2-gapx', `${Math.round(Math.max(gap, vh - hb - below + 14))}px`);
  }
  fitEnd();

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
  })(footer.querySelector('.fg2-qr'));

  /* ---------------------------------------------------------- 1 + 2: A's choreography */

  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (root.classList.contains('fg2-static') || !hasGsap) {
    root.classList.add('fg2-static');
    band.classList.add('is-done');
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitEnd);
  } else {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    const lines = footer.querySelectorAll('.fg2-li');
    const cta = footer.querySelector('.fg2-cta');
    const cols = footer.querySelectorAll('.fg2-grid .fg2-rv');
    const rule = footer.querySelector('.fg2-rule');
    const spill = footer.querySelector('.fg2-spill');
    const chars = footer.querySelectorAll('.fg2-ch');

    // starting states (mirror the CSS so nothing flashes; y:0 drops the
    // CSS translate that GSAP would otherwise read back as pixels)
    gsap.set(lines, { yPercent: 110, y: 0 });
    gsap.set(cta, { autoAlpha: 0, y: 24 });
    gsap.set(cols, { autoAlpha: 0, y: 26 });
    gsap.set(rule, { scaleX: 0, transformOrigin: '0% 50%' });
    gsap.set(spill, { autoAlpha: 0 });
    gsap.set(chars, { yPercent: 108, y: 0 });

    ScrollTrigger.create({
      trigger: footer.querySelector('.fg2-head'),
      start: 'top 84%',
      once: true,
      onEnter: () => {
        gsap.timeline({ defaults: { ease: 'expo.out' } })
          .to(lines, { yPercent: 0, duration: 1.5, stagger: 0.13 })
          .to(cta, { autoAlpha: 1, y: 0, duration: 1.3 }, 0.42);
      },
    });

    ScrollTrigger.create({
      trigger: footer.querySelector('.fg2-grid'),
      start: 'top 92%',
      once: true,
      onEnter: () => {
        gsap.timeline()
          .to(rule, { scaleX: 1, duration: 1.8, ease: 'expo.inOut' })
          .to(cols, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.08, ease: 'power3.out' }, 0.25);
      },
    });

    // the band: from the moment the sheet's lower edge reaches the bottom
    // of the screen until the end of the page — exactly the band's height
    let done = false;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: sheet,
        start: 'bottom bottom',
        end: 'max',
        scrub: 0.9,
        invalidateOnRefresh: true,
      },
      onUpdate() {
        const d = this.progress() > 0.995;
        if (d !== done) {
          done = d;
          band.classList.toggle('is-done', d);
        }
      },
    });
    tl.to(chars, { yPercent: 0, duration: 0.5, ease: 'power2.out', stagger: 0.1 }, 0)
      .fromTo(bar, { y: 34 }, { y: 0, duration: 1, ease: 'power2.out' }, 0)
      .to(spill, { autoAlpha: 1, duration: 0.7, ease: 'sine.inOut' }, 0);

    // magnetic primary CTA
    const mag = footer.querySelector('.fg2-mag');
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

    // web font metrics change the heights: re-fit and re-measure once in
    const refit = () => { fitEnd(); ScrollTrigger.refresh(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
    let rz = 0;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(refit, 120); });
  }

  if (isSmall()) return; // static fallback: the lanyard stage is hidden

  /* ---------------------------------------------------------- 3: the credential */

  const canvas = footer.querySelector('.fg2-strap');
  const card = footer.querySelector('.fg2-card');
  const holo = footer.querySelector('.fg2-holo-in');
  const foil = footer.querySelector('.fg2-seal-foil');
  const ctx = canvas.getContext('2d');

  const N = 10;          // strap segments
  const SUB = 1 / 120;   // fixed sub-step (s)
  const ITER = 14;       // constraint iterations per sub-step
  const CARD_W = 0.22;   // inverse mass of the two card points (heavier)
  const LIP = 8;         // the strap is fastened this far under the sheet's edge
  const LAGMAX = 36;     // px: the most the drawing may run ahead of the simulation
  const FOLLOW = 28;     // rad/s: how smoothly the simulated anchor follows the edge
  const VMAX = 1800;     // px/s: the fastest the simulated anchor may travel
  const INERTIA = 0.22;  // share of the sheet's jolts the hanging badge feels
  const MU = 0.2;        // grip of the badge's lower end on the hidden ground

  let W = 0, H = 0, VH = 0, dpr = 1;
  let cw = 0, ch = 0, holeY = 0, L = 0, sc = 1, sw = 0, segLen = 0, hookLen = 0;
  // The simulation runs in the frame of a smoothed anchor (ay) that follows
  // the sheet's edge; it is drawn shifted by `lag` (edge - ay), so on screen
  // the strap always leaves exactly from the edge while the badge only feels
  // a soft share of the scroll's jolts.
  let ax = 0, ay = 0, ayV = 0, lag = 0, yf = 0;
  let tgtPrev = 0;                           // anchor target at the previous frame
  let sheetBottomDoc = 0, footerTopDoc = 0;

  // points: 0 = anchor, 1..N = strap, N+1 = card hole (T), N+2 = card bottom (B)
  const P = [];
  const T = N + 1, B = N + 2;
  for (let i = 0; i <= B; i++) P.push({ x: 0, y: 0, px: 0, py: 0, w: 1, g: false });
  P[0].w = 0;
  P[T].w = CARD_W;
  P[B].w = CARD_W;

  let twist = 0, twistV = 0;               // deg, deg/s
  let awake = false, visible = false, raf = 0;
  let last = 0, acc = 0, calm = 0;
  let grab = null;
  let grounded = true;                      // in the canonical pose under the page end
  let ready = false;
  let logoBmp = null;

  /* ---------- geometry ---------- */

  function measure() {
    const sy = window.scrollY;
    sheetBottomDoc = sheet.getBoundingClientRect().bottom + sy;
    footerTopDoc = footer.getBoundingClientRect().top + sy;
    VH = window.innerHeight;
    W = band.clientWidth;
    H = band.offsetHeight;
  }

  // where the sheet's lower edge is, in the band's frame (the band is the
  // still room: sticky to the bottom of the screen until the page ends)
  function target() {
    const sy = window.scrollY;
    const edge = sheetBottomDoc - sy;
    const top = reduce ? edge : Math.max(footerTopDoc - sy, Math.min(edge, VH - H));
    return Math.max(-LIP, Math.min(H - LIP, edge - top - LIP));
  }

  function layout() {
    measure();
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    cw = card.offsetWidth;
    ch = card.offsetHeight;
    sc = cw / 280;
    const fs = cw / 17.5;                  // the card's em
    holeY = fs * (0.64 + 0.26);            // centre of the punched slot
    L = ch - holeY;
    card.style.transformOrigin = `50% ${holeY}px`;
    sw = Math.max(14, Math.round(19 * sc));
    hookLen = 30 * sc;
    // the badge belongs to the giant word (full bleed, sized with the
    // screen): its right edge lines up with the right edge of the last "o"
    const bandR = band.getBoundingClientRect();
    const lastCh = footer.querySelector('.fg2-giant .fg2-ch:last-child');
    let x = Math.round(lastCh.getBoundingClientRect().right - bandR.left - cw / 2);
    // ...and the strap never runs through the bar's links
    const clear = sw / 2 + 16;
    const lr = footer.querySelector('.fg2-legal').getBoundingClientRect();
    if (x < lr.right - bandR.left + clear) x = Math.round(lr.right - bandR.left + clear);
    ax = Math.max(cw / 2 + 24, Math.min(W - cw / 2 - 24, x));
    // strap length: at the end of the page the badge hangs with its lower
    // edge a little "floor" of lime above the page end
    const floorGap = Math.min(64, Math.max(28, VH * 0.044));
    segLen = (H - floorGap - L - hookLen + LIP) / N;
    // the ground the badge lies on until it is hoisted, out of sight
    yf = H + cw * 0.62;
    lastBox = null;
    buildLogo();
  }

  function set(p, x, y) { p.x = p.px = x; p.y = p.py = y; }

  // hanging straight from the anchor (end of the page, reduced motion)
  function hangPose(y0) {
    ay = y0; ayV = 0; lag = 0;
    for (let i = 0; i <= N; i++) set(P[i], ax, y0 + i * segLen);
    set(P[T], ax, P[N].y + hookLen);
    set(P[B], ax, P[T].y + L);
    twist = twistV = 0;
    grounded = false;
  }

  // the band is closed: the strap runs down past the page end to the badge,
  // which lies on its side on the hidden ground, toward the page corner
  function groundPose() {
    ay = H - LIP; ayV = 0; lag = 0;
    for (let i = 0; i <= N; i++) set(P[i], ax + i * 0.4 * sc, ay + i * segLen * 0.985);
    const ty = Math.min(yf - 2, P[N].y + hookLen);
    set(P[T], P[N].x + 2 * sc, ty);
    const dy = yf - ty;
    set(P[B], P[T].x + Math.sqrt(Math.max(0, L * L - dy * dy)), yf);
    twist = twistV = 0;
    // let it settle where it lies
    for (let k = 0; k < 150; k++) step(SUB, ay);
    for (let i = 1; i <= B; i++) { P[i].px = P[i].x; P[i].py = P[i].y; }
    twist = twistV = 0;
    grounded = true;
  }

  /* ---------- simulation ---------- */

  function step(dt, goal) {
    // the anchor rides the sheet's edge: a critically damped follower,
    // fed every sub-step, so the strap is pulled smoothly, never teleported
    const ay0 = ay;
    ayV += (FOLLOW * FOLLOW * (goal - ay) - 2 * FOLLOW * ayV) * dt;
    if (ayV > VMAX) ayV = VMAX; else if (ayV < -VMAX) ayV = -VMAX;
    ay += ayV * dt;
    // on screen the lanyard is shifted toward the true edge by `lag`: exact
    // for any normal scroll; after a jump (End key, scrollbar) the rest shows
    // for a moment as the strap stretching out from under the sheet
    const lag0 = lag;
    lag = Math.max(-LAGMAX, Math.min(LAGMAX, goal - ay));
    const dl = lag - lag0;
    P[0].x = P[0].px = ax;
    P[0].py = P[0].y;
    P[0].y = ay;
    // what hangs is carried along with the anchor, minus its own inertia
    const carry = (1 - INERTIA) * (ay - ay0);
    for (let i = 1; i <= B; i++) {
      const p = P[i];
      if (!p.g) { p.y += carry; p.py += carry; }
      else { p.y -= dl; p.py -= dl; } // what lies on the ground stays put on screen
    }

    const g = 4300 * Math.max(0.85, Math.min(1.25, sc)); // px/s^2
    // drag: light while swinging, firmer once the motion is small
    const speed = Math.hypot(P[B].x - P[B].px, P[B].y - P[B].py) / dt;
    const q = Math.max(0, Math.min(1, (speed - 30) / 130));
    const drag = grab ? 0.9 : 1.0 + 2.7 * (1 - q * q * (3 - 2 * q));
    const keep = 1 - drag * dt;
    const m = 30 * sc; // velocity cap per sub-step
    for (let i = 1; i <= B; i++) {
      const p = P[i];
      let vx = (p.x - p.px) * keep;
      let vy = (p.y - p.py) * keep;
      const v = Math.hypot(vx, vy);
      if (v > m) { vx *= m / v; vy *= m / v; }
      p.px = p.x; p.py = p.y;
      p.x += vx;
      p.y += vy + g * dt * dt;
    }

    if (grab) {
      grab.k = Math.min(1, grab.k + grab.dk);
      grab.cx = grab.ptx + (grab.tx - grab.ptx) * grab.k;
      grab.cy = grab.pty + (grab.ty - grab.pty) * grab.k;
    }

    for (let it = 0; it < ITER; it++) {
      for (let i = 0; i < N; i++) rope(P[i], P[i + 1], segLen, true);
      rope(P[N], P[T], hookLen, false);
      rope(P[T], P[B], L, false);
      if (grab) { pin(); bounds(); }
      ground();
    }

    // the lower end grips the ground a little: it is dragged, not skated
    for (let i = 1; i <= B; i++) {
      const p = P[i];
      if (p.g) p.px = p.x - (p.x - p.px) * (1 - MU);
    }

    // twist: a damped spring chasing the card's sideways speed
    const vx = ((P[T].x - P[T].px) + (P[B].x - P[B].px)) * 0.5 / dt;
    const tgt = Math.max(-26, Math.min(26, vx * 0.03));
    twistV += ((tgt - twist) * 70 - twistV * 7) * dt;
    twist += twistV * dt;
  }

  function rope(a, b, len, slack) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1e-6;
    if (slack && d <= len) return;
    const wsum = a.w + b.w;
    if (!wsum) return;
    const k = (d - len) / d / wsum;
    a.x += dx * k * a.w; a.y += dy * k * a.w;
    b.x -= dx * k * b.w; b.y -= dy * k * b.w;
  }

  // the hidden ground under the page end (still on screen, so it sits
  // `lag` away in the simulation's frame)
  function ground() {
    const gy = yf - lag;
    for (let i = 1; i <= B; i++) {
      const p = P[i];
      if (p.y >= gy) { p.y = gy; p.g = true; } else p.g = false;
    }
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

  // while held, the badge stays inside the band
  function bounds() {
    for (let i = 1; i <= B; i++) {
      const p = P[i];
      const pad = i >= T ? cw * 0.42 : 6;
      if (p.x < pad) p.x = pad;
      else if (p.x > W - pad) p.x = W - pad;
      if (p.y > H - 6 - lag) p.y = H - 6 - lag;
    }
  }

  /* ---------- render ---------- */

  let lastBox = null;
  // last written values (start far away so the first frame always writes)
  let tf = '', hx = 1e9, ho = 1e9, fr = 1e9;

  const logoImg = new Image();
  logoImg.onload = () => { if (!ready) return; buildLogo(); draw(); };
  logoImg.src = '../assets/img/igreen-logo.svg';

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
    g.globalAlpha = 0.92;
    g.drawImage(logoImg, (-lw * dpr) / 2, (-lh * dpr) / 2, lw * dpr, lh * dpr);
    logoBmp = { c, w: c.width / dpr, h: c.height / dpr, len: lw };
  }

  // drawing space = simulation space shifted by the anchor's lag
  function base() { ctx.setTransform(dpr, 0, 0, dpr, 0, lag * dpr); }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // dirty rect (screen space) = last frame's box + this frame's box
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i <= T; i++) {
      const p = P[i];
      if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
      if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
    }
    const pad = sw + 14 * sc + 8;
    const box = { x0: x0 - pad, y0: Math.min(y0, ay - tail()) - pad + lag, x1: x1 + pad, y1: y1 + pad + lag };
    if (lastBox) {
      const cx0 = Math.min(box.x0, lastBox.x0), cy0 = Math.min(box.y0, lastBox.y0);
      const cx1 = Math.max(box.x1, lastBox.x1), cy1 = Math.max(box.y1, lastBox.y1);
      ctx.clearRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
    } else {
      ctx.clearRect(0, 0, W, H);
    }
    lastBox = box;

    base();
    drawStrap();
    drawHook();
    placeCard();
  }

  // the strap runs on straight up from the anchor to well under the sheet's edge
  function tail() { return Math.max(120, ay + lag - target() + 60); }

  function strapPath(ox, oy) {
    ctx.beginPath();
    ctx.moveTo(P[0].x + ox, P[0].y - tail() + oy); // runs on up under the sheet
    ctx.lineTo(P[0].x + ox, P[0].y + oy);
    for (let i = 1; i < N; i++) {
      const a = P[i], b = P[i + 1];
      ctx.quadraticCurveTo(a.x + ox, a.y + oy, (a.x + b.x) / 2 + ox, (a.y + b.y) / 2 + oy);
    }
    ctx.lineTo(P[N].x + ox, P[N].y + oy);
  }

  function drawStrap() {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'butt';
    // a soft cast shadow on the lime, then woven edge, body, centre sheen
    strapPath(2.5 * sc, 6 * sc);
    ctx.lineWidth = sw + 3;
    ctx.strokeStyle = 'rgba(3, 26, 6, 0.13)';
    ctx.stroke();
    strapPath(0, 0);
    ctx.lineWidth = sw;
    ctx.strokeStyle = '#1E4A2B';
    ctx.stroke();
    ctx.lineWidth = sw - 2.4;
    ctx.strokeStyle = '#0A1E11';
    ctx.stroke();
    ctx.lineWidth = sw * 0.34;
    ctx.strokeStyle = 'rgba(216, 255, 166, 0.04)';
    ctx.stroke();

    // printed logos at fixed places along the strap
    if (!logoBmp) return;
    const gap = logoBmp.len + 40 * sc;
    let run = 0, next = 30 * sc;
    for (let i = 0; i < N; i++) {
      const a = P[i], b = P[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 0.001) continue;
      while (next - run <= len) {
        const t = (next - run) / len;
        if (next + logoBmp.len * 0.5 > N * segLen - 6 * sc) { base(); return; }
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        const pa = P[Math.max(0, i - (t < 0.5 ? 1 : 0))];
        const pb = P[Math.min(N, i + 1 + (t >= 0.5 ? 1 : 0))];
        const ang = Math.atan2(pb.y - pa.y, pb.x - pa.x) - Math.PI / 2;
        base();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.drawImage(logoBmp.c, -logoBmp.w / 2, -logoBmp.h / 2, logoBmp.w, logoBmp.h);
        next += gap;
      }
      run += len;
    }
    base();
  }

  // the strap folds over a metal ring; a short clip runs into the card's slot
  let metalGrad = null;
  function drawHook() {
    const a = P[N], b = P[T];
    const ang = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    base();
    ctx.translate(a.x, a.y);
    ctx.rotate(ang);
    const u = sc;
    if (!metalGrad || metalGrad.u !== u) {
      const g = ctx.createLinearGradient(-sw * 0.42, 0, sw * 0.42, 0);
      g.addColorStop(0, '#56635A');
      g.addColorStop(0.35, '#EEF5E8');
      g.addColorStop(0.6, '#A9B6A8');
      g.addColorStop(1, '#46524A');
      metalGrad = { g, u };
    }
    // strap end: folded over, with a stitched bar
    ctx.fillStyle = '#1E4A2B';
    roundRect(-sw / 2, -3 * u, sw, 8 * u, 3 * u);
    ctx.fill();
    ctx.fillStyle = '#0A1E11';
    roundRect(-sw / 2 + 1.2, -3 * u, sw - 2.4, 6.8 * u, 2.4 * u);
    ctx.fill();
    ctx.fillStyle = 'rgba(216, 255, 166, 0.24)';
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
    const tx = t.x - cw / 2, ty = t.y + lag - holeY;
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
  }

  /* ---------- loop ---------- */

  function frame(now) {
    raf = 0;
    if (!awake || !visible || document.hidden) return;
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) dt = 1 / 60;
    acc += Math.min(dt, 1 / 20);

    // (the edge can only move while the footer is on screen: it is the last
    // thing on the page; resizes re-pose the lanyard in the resize handler)
    const tgt = target();

    let n = 0;
    const steps = Math.min(8, Math.floor(acc / SUB));
    while (acc >= SUB && n < 8) {
      n++;
      // the target is spread over the frame's sub-steps
      const goal = tgtPrev + (tgt - tgtPrev) * (n / Math.max(1, steps));
      step(SUB, goal);
      acc -= SUB;
    }
    if (!n) { raf = requestAnimationFrame(frame); return; }
    tgtPrev = tgt;

    // back under the band's closed edge: reset to the canonical pose
    // (nothing of the lanyard can be seen there) so the hoist reads the
    // same on every pass
    if (!grab && tgt >= H - LIP - 0.5 && ay >= H - LIP - 1) {
      if (!grounded) groundPose();
    } else grounded = false;
    draw();

    // sleep once everything is still and the anchor has caught up
    let vmax = 0;
    for (let i = 1; i <= B; i++) {
      const p = P[i];
      const v = Math.abs(p.x - p.px) + Math.abs(p.y - p.py);
      if (v > vmax) vmax = v;
    }
    if (!grab && vmax < 0.012 && Math.abs(tgt - ay) < 0.05 && Math.abs(ayV) < 1 &&
        Math.abs(twistV) < 0.4 && Math.abs(twist) < 0.25) {
      if (++calm > 24) { awake = false; restSnap(); return; }
    } else calm = 0;
    raf = requestAnimationFrame(frame);
  }

  // at rest: whole device pixels and a flat 2D transform, so the print on
  // the badge is crisp while nothing moves
  function restSnap() {
    const t = P[T], b = P[B];
    const ang = Math.atan2(-(b.x - t.x), b.y - t.y);
    const d = window.devicePixelRatio || 1;
    const r = (v) => (Math.round(v * d) / d).toFixed(2);
    const pos = `translate3d(${r(t.x - cw / 2)}px,${r(t.y + lag - holeY)}px,0)`;
    const s = Math.abs(ang) < 0.003 ? pos : `${pos} rotate(${ang.toFixed(4)}rad)`;
    card.style.transform = s;
    tf = s;
  }

  function wake() {
    if (reduce) return; // the final pose is drawn once, nothing ever runs
    awake = true;
    calm = 0;
    if (!raf && visible && !document.hidden && ready) {
      last = performance.now();
      acc = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  // read-only snapshot for the verification scripts
  footer.fg2State = () => ({
    awake, visible, grab: !!grab, grounded, ay, tgt: target(), H,
    cardX: P[B].x, cardY: P[B].y, holeX: P[T].x, holeY: P[T].y, twist,
  });

  /* ---------- input ---------- */

  let bandR = null;
  function local(e) {
    if (!bandR) bandR = band.getBoundingClientRect();
    // into the simulation's frame
    return { x: e.clientX - bandR.left, y: e.clientY - bandR.top - lag };
  }

  if (!reduce) {
    card.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      bandR = band.getBoundingClientRect();
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
        const reach = N * segLen + hookLen + L * grab.s + 30 * sc;
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
      // a brush of the cursor nudges the badge — gently, and never past a
      // soft sway however fast the pointer crosses it
      if (!e.movementX && !e.movementY) return;
      const vx = P[B].x - P[B].px;
      const cap = 1.6 * sc; // px per sub-step (~ a 10 degree sway)
      const mx = Math.max(-14, Math.min(14, e.movementX)) * 0.022;
      if ((mx > 0 && vx >= cap) || (mx < 0 && vx <= -cap)) return;
      const k = Math.max(-cap - vx, Math.min(cap - vx, mx));
      P[B].px -= k;
      P[T].px -= k * 0.35;
      wake();
    });
    const release = (e) => {
      if (!grab) return;
      grab = null;
      bandR = null;
      card.classList.remove('is-drag');
      if (card.hasPointerCapture && card.hasPointerCapture(e.pointerId)) card.releasePointerCapture(e.pointerId);
      wake();
    };
    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', release);
    card.addEventListener('lostpointercapture', release);
  }

  /* ---------- lifecycle ---------- */

  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) wake();
  }, { rootMargin: '80px 0px' });
  io.observe(footer);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && awake) wake();
  });

  // the sheet moves with the native scroll: every scroll step wakes the
  // simulation, which reads the edge again on each frame
  window.addEventListener('scroll', () => {
    if (!ready || reduce || grab) return;
    if (Math.abs(target() - ay) > 0.05) wake();
  }, { passive: true });

  function settleAt(tgt) {
    // a calm start wherever the page is: on its ground below the page end
    // with the band closed, hanging with a small sway once it's open
    tgtPrev = tgt;
    if (tgt >= H - LIP - 0.5) {
      groundPose();
    } else {
      hangPose(tgt);
      if (!reduce) {
        P[B].px -= 4 * sc; // a little sway to settle out of
        P[T].px -= 1.5 * sc;
      }
    }
  }

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (isSmall()) return;
      if (!hasGsap) fitEnd();
      layout();
      settleAt(reduce ? -LIP : target());
      draw();
      if (reduce) restSnap();
      wake();
    }, 160);
  });

  const start = () => {
    layout();
    ready = true;
    if (reduce) {
      hangPose(-LIP); // the final pose, still
      draw();
      restSnap();
      return;
    }
    settleAt(target());
    draw();
    wake();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  else window.addEventListener('load', start);
})();
