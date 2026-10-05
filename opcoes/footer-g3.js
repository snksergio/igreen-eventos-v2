/* ============================================================
   Rodapé G3 — "Holofote"  (see footer-g3.css)
   1. Arrival: the statement rises out of its line masks in the dark,
      the CTA, the info grid and the bar follow as they enter.
   2. Signature (one shot, when the footer fills most of the screen):
      a single spotlight strikes from above — a quick strike, a breath,
      then it warms up while its iris opens — and the credential drops
      into the beam, snaps taut on its strap and swings to rest.
   3. Follow spot: while the card swings the beam re-aims after it on
      a critically damped spring (it trails, never overshoots); the
      pool on the floor, the card's shadow in it and the lit stage edge
      travel with it; a card thrown out of the light sinks into shadow
      until the spot catches up. Transform/opacity only.
   - Grab and throw like footer-g, but the strap is long (anchor above
     the stage) so it swings slowly; soft cushions keep a thrown card on
     the stage side, never over the statement.
   - Physics (from footer-g): verlet strap of N points from an anchor
     above the stage, rigid hook, the card as a rigid bar (hole ->
     bottom), a damped spring for the twist. One canvas for the strap
     (dirty-rect clears, DPR <= 1.5), the card is a DOM node.
   - The loop sleeps at rest (card and beam still), off-screen and on a
     hidden tab. No ScrollTrigger: one-shot IntersectionObservers, so
     nothing keeps a frame loop alive while idle.
   ============================================================ */

(() => {
  const foot = document.getElementById('fg3-foot');
  if (!foot) return;

  const root = document.documentElement;
  const $ = (s) => foot.querySelector(s);
  const $$ = (s) => Array.from(foot.querySelectorAll(s));

  const inner = $('.fg3-in');
  const bar = $('.fg3-bar');
  const statement = $('.fg3-st');
  const canvas = $('.fg3-strap');
  const card = $('.fg3-card');
  const holo = $('.fg3-holo-in');
  const foil = $('.fg3-seal-foil');
  const aim = $('.fg3-aim');
  const poolX = $('.fg3-pool-x');
  const shadeX = $('.fg3-shade-x');
  const shade = $('.fg3-shade');
  const lipX = $('.fg3-lip-x');
  const dim = $('.fg3-dim');
  const ctx = canvas.getContext('2d');

  const hasGsap = typeof window.gsap !== 'undefined';
  if (!hasGsap) root.classList.add('fg3-static');
  const still = root.classList.contains('fg3-static'); // reduced motion, narrow, or no GSAP
  const isSmall = () => window.innerWidth < 900;

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
        if (rnd() > 0.52) out += `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.4"/>`;
      }
    }
    const finder = (x, y) =>
      `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.8" fill="none" stroke="currentColor" stroke-width="1"/>` +
      `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.9"/>`;
    svg.innerHTML = `<g fill="currentColor">${out}${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}</g>`;
  })($('.fg3-qr'));

  /* ---------------------------------------------------------- back to top */

  const up = $('.fg3-up');
  if (up) {
    up.addEventListener('click', (e) => {
      e.preventDefault();
      const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
    });
  }

  /* ---------------------------------------------------------- arrival */

  let lit = still;

  function once(el, rootMargin, fn) {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      fn();
    }, { rootMargin });
    io.observe(el);
  }

  function lightsOn() {
    if (lit) return;
    lit = true;
    const gsap = window.gsap;
    const cone = $('.fg3-cone');
    const pool = $('.fg3-pool');
    gsap.timeline()
      // the strike, a breath, then the lamp warms up while the iris opens
      .fromTo(cone, { opacity: 0, scaleX: 0.36 }, { opacity: 0.62, duration: 0.08, ease: 'power2.out' }, 0)
      .to(cone, { opacity: 0.46, duration: 0.18, ease: 'sine.inOut' }, 0.08)
      .to(cone, { opacity: 1, duration: 1.7, ease: 'expo.out' }, 0.26)
      .to(cone, { scaleX: 1, duration: 2.1, ease: 'expo.out' }, 0.04)
      .fromTo(pool, { opacity: 0, scaleX: 0.42, scaleY: 0.6 }, { opacity: 1, scaleX: 1, scaleY: 1, duration: 2.1, ease: 'expo.out' }, 0.04)
      .fromTo($('.fg3-lip'), { opacity: 0 }, { opacity: 1, duration: 1.6, ease: 'power2.out' }, 0.18)
      .fromTo($('.fg3-bounce'), { opacity: 0 }, { opacity: 1, duration: 2.6, ease: 'sine.out' }, 0.12)
      .call(drop, null, 0.82);
  }

  if (!still) {
    const gsap = window.gsap;
    const lines = $$('.fg3-li');
    const cta = $('.fg3-cta');
    const rule = $('.fg3-rule');
    const cols = $$('.fg3-grid .fg3-rv');

    // starting states mirror the CSS (y:0 drops the CSS translate)
    gsap.set(lines, { yPercent: 112, y: 0 });
    gsap.set([cta, ...cols, bar], { autoAlpha: 0, y: 22 });
    gsap.set(rule, { scaleX: 0, transformOrigin: '0% 50%' });

    once($('.fg3-head'), '0px 0px -14% 0px', () => {
      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .to(lines, { yPercent: 0, duration: 1.5, stagger: 0.13 })
        .to(cta, { autoAlpha: 1, y: 0, duration: 1.3 }, 0.42);
    });
    once($('.fg3-grid'), '0px 0px -6% 0px', () => {
      gsap.timeline()
        .to(rule, { scaleX: 1, duration: 1.8, ease: 'expo.inOut' })
        .to(cols, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.08, ease: 'power3.out' }, 0.25)
        .to(bar, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'power3.out' }, 0.45);
    });
    // the lamp strikes once the stage fills the screen (footer top in the upper 18%)
    once(foot, '0px 0px -82% 0px', lightsOn);

    // magnetic primary CTA
    const mag = $('.fg3-mag');
    if (mag && matchMedia('(hover: hover)').matches) {
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

  if (isSmall()) return; // static fallback: the stage and the light are hidden

  /* ---------------------------------------------------------- physics */

  const N = 10;              // strap segments
  const SUB = 1 / 120;       // fixed sub-step (s)
  const ITER = 14;           // constraint iterations per sub-step
  const CARD_W = 0.22;       // inverse mass of the two card points (heavier)
  const AIM_W = 3.3;         // follow-spot spring (rad/s): trails ~0.3 s

  let W = 0, H = 0, dpr = 1;
  let cw = 0, ch = 0, holeY = 0, sc = 1;
  let ax = 0, ay = 0, segLen = 0, hookLen = 0, sw = 0;
  let floorY = 0, xMin = 0, yMin = 0;
  // the lamp (above the stage) and the beam's aim
  let Lx = 0, Ly = 0, th = 0, thV = 0, th0 = 0, hit0 = 0, poolHalf = 300, beamA = 0.3;

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
  let grab = null;
  let logoBmp = null;

  function layout() {
    const fr = foot.getBoundingClientRect();
    const ir = inner.getBoundingClientRect();
    W = fr.width;
    H = fr.height;
    // the stage edge = the bar's hairline (layout offsets: the bar may be
    // mid-entrance with a transform on it)
    floorY = inner.offsetTop + bar.offsetTop;
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

    // the badge hangs flush with the right edge of the content grid
    ax = Math.round(ir.right - fr.left - cw / 2);
    // the anchor is far above the stage (out of sight): a long strap, so
    // the card can start above the stage and swings slowly, like a lanyard
    // hanging from the rig
    ay = -Math.round(ch + 40);
    // the cushions: the card's axis stays right of the info grid's last
    // column (with some lean allowed) and its hole stays on stage
    const gridRight = ir.left - fr.left + ((ir.width - 11 * 24) * 8) / 12 + 7 * 24;
    xMin = gridRight - cw * 0.1;
    yMin = 36;
    // its top lines up with the statement, its foot stays well clear of the floor
    const stTop = inner.offsetTop + statement.offsetTop;
    let restTop = Math.max(stTop + 0.1 * cw, H * 0.48 - ch / 2);
    restTop = Math.min(restTop, floorY - ch - Math.max(96, H * 0.12));
    segLen = (restTop - ay - hookLen) / N;

    // the lamp hangs above the stage, a little outside the card: close
    // enough that the beam visibly opens on its way down
    Lx = ax + W * 0.045;
    Ly = -H * 0.42;
    const cy0 = restTop + ch * 0.46;
    th0 = Math.atan2(ax - Lx, cy0 - Ly);
    // beam edge: ~1.6 card widths wide where the card hangs
    const d = Math.hypot(ax - Lx, cy0 - Ly);
    const A = Math.atan((0.82 * cw) / d);
    beamA = A;
    const coneTop = -Ly - 180;                    // starts 180 px above the stage (under the fly)
    const coneH = (floorY - Ly) / Math.cos(th0) - coneTop + 30;
    const coneW = 2 * (coneTop + coneH) * Math.tan(A * 1.36);
    hit0 = Lx + (floorY - Ly) * Math.tan(th0);
    poolHalf = (floorY - Ly) * Math.tan(A);
    const poolW = poolHalf * 2.25;

    const st = foot.style;
    st.setProperty('--fg3-a', `${((A * 180) / Math.PI).toFixed(3)}deg`);
    st.setProperty('--fg3-cone-top', `${coneTop.toFixed(1)}px`);
    st.setProperty('--fg3-cone-w', `${coneW.toFixed(1)}px`);
    st.setProperty('--fg3-cone-h', `${coneH.toFixed(1)}px`);
    st.setProperty('--fg3-floor', `${floorY}px`);
    st.setProperty('--fg3-r0', `${(-Ly - coneTop).toFixed(1)}px`);
    st.setProperty('--fg3-r', `${Math.round(Math.min(H * 0.34, restTop + ch * 0.2))}px`);
    st.setProperty('--fg3-fly', `${Math.round(Math.max(96, Math.min(H * 0.17, restTop - 24)))}px`);
    st.setProperty('--fg3-hit', `${hit0.toFixed(1)}px`);
    st.setProperty('--fg3-pool-w', `${poolW.toFixed(1)}px`);
    st.setProperty('--fg3-pool-h', `${(poolW * 0.15).toFixed(1)}px`);
    aim.style.left = `${Lx.toFixed(1)}px`;
    aim.style.top = `${Ly.toFixed(1)}px`;

    lastBox = null;
    lth = NaN;
    buildLogo();
  }

  function restPose() {
    for (let i = 0; i <= N; i++) set(P[i], ax, ay + i * segLen);
    set(P[T], ax, P[N].y + hookLen);
    set(P[B], ax, P[T].y + (ch - holeY));
    twist = twistV = 0;
    th = th0;
    thV = 0;
  }
  function set(p, x, y) { p.x = p.px = x; p.y = p.py = y; }

  /* the drop: the card starts just above the stage, beside the anchor,
     with its strap folded up above it (every segment within its length,
     so nothing is yanked); it falls through the beam, the strap snaps
     taut and it swings in */
  function drop() {
    if (dropped || still || isSmall()) return;
    if (!ready) { wantDrop = true; return; }
    dropped = true;
    sinceDrop = 0;
    const off = 74 * sc;
    const tx = ax + off, ty = ay + 18 * sc;
    set(P[T], tx, ty);
    set(P[B], tx + 4 * sc, ty + (ch - holeY));
    // the strap: anchor -> fold above -> clip, points evenly spaced
    const ex = tx, ey = ty - hookLen;
    const Ls = N * segLen * 0.97;
    const mx = (ax + ex) / 2;
    const leg = (h) => Math.hypot(mx - ax, h) + Math.hypot(ex - mx, h + (ey - ay));
    let lo = 0, hi = Ls;
    for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (leg(m) < Ls) lo = m; else hi = m; }
    const top = ay - lo;
    const l1 = Math.hypot(mx - ax, top - ay), l2 = Math.hypot(ex - mx, ey - top);
    for (let i = 1; i <= N; i++) {
      const sd = (i / N) * (l1 + l2);
      if (sd <= l1) { const t = sd / l1; set(P[i], ax + (mx - ax) * t, ay + (top - ay) * t); }
      else { const t = (sd - l1) / l2; set(P[i], mx + (ex - mx) * t, top + (ey - top) * t); }
    }
    P[T].py -= 2 * sc; // a little initial downward speed
    P[B].py -= 2 * sc;
    wake();
  }

  // the point of the card the beam looks at: a little above its centre
  function cardAim() {
    const k = (ch * 0.46 - holeY) / (ch - holeY);
    return { x: P[T].x + (P[B].x - P[T].x) * k, y: P[T].y + (P[B].y - P[T].y) * k };
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
      const m = 20 * sc; // velocity cap: a hard throw stays a gesture, not a launch
      const v = Math.hypot(vx, vy);
      if (v > m) { vx *= m / v; vy *= m / v; }
      // the strap soaks up the snap: the rebound is damped, the swing is not
      if (sinceDrop > 0.4 && sinceDrop < 1.6) vy *= 1 - 2.4 * dt;
      p.px = p.x; p.py = p.y;
      p.x += vx;
      p.y += vy + g * dt * dt;
    }

    // soft cushions keep a thrown card on its side of the stage: it may
    // lean over the info grid, never fly across the statement or above
    // the stage; inside a cushion it is pushed back and loses speed
    if (!grab && sinceDrop > 1.2) {
      for (let i = T; i <= B; i++) {
        const p = P[i];
        let hit = false;
        if (p.x < xMin) { p.x += (xMin - p.x) * 0.05; hit = true; }
        if (i === T && p.y < yMin) { p.y += (yMin - p.y) * 0.05; hit = true; }
        if (hit) { p.px += (p.x - p.px) * 0.04; p.py += (p.y - p.py) * 0.04; }
      }
    }

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

    // follow spot: critically damped, aims at the card once it is on stage
    const c = cardAim();
    const tgt = c.y > -ch * 0.25 ? Math.max(-0.42, Math.min(0.42, Math.atan2(c.x - Lx, c.y - Ly))) : th0;
    thV += (AIM_W * AIM_W * (tgt - th) - 2 * AIM_W * thV) * dt;
    th += thV * dt;
    aimTgt = tgt;
  }
  let aimTgt = 0;

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
      // the card never goes through the stage floor
      if (p.y > floorY - m) p.y = floorY - m;
    }
  }

  /* ---------------------------------------------------------- render */

  let lastBox = null;
  let tf = '', hx = NaN, ho = NaN, fr = NaN;

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

    if (dropped) {
      drawStrap();
      drawHook();
      placeCard();
    }
    placeLight();
  }

  function strapPath() {
    ctx.beginPath();
    ctx.moveTo(P[0].x, P[0].y - sw); // starts beyond the top of the stage
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
    // woven edge, body, then a soft centre sheen where the beam catches it
    strapPath();
    ctx.lineWidth = sw;
    ctx.strokeStyle = '#21522F';
    ctx.stroke();
    ctx.lineWidth = sw - 2.4;
    ctx.strokeStyle = '#0B2113';
    ctx.stroke();
    ctx.lineWidth = sw * 0.36;
    ctx.strokeStyle = 'rgba(226, 255, 190, 0.045)';
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
      g.addColorStop(0.35, '#EEF6E8');
      g.addColorStop(0.6, '#A9B6A8');
      g.addColorStop(1, '#4C584E');
      metalGrad = { g, u };
    }
    ctx.fillStyle = '#21522F';
    roundRect(-sw / 2, -3 * u, sw, 8 * u, 3 * u);
    ctx.fill();
    ctx.fillStyle = '#0B2113';
    roundRect(-sw / 2 + 1.2, -3 * u, sw - 2.4, 6.8 * u, 2.4 * u);
    ctx.fill();
    ctx.fillStyle = 'rgba(216, 255, 166, 0.22)';
    for (let x = -sw / 2 + 3 * u; x < sw / 2 - 2 * u; x += 2.6 * u) ctx.fillRect(x, -0.6 * u, 1.3 * u, 0.8);
    ctx.lineWidth = 1.7 * u;
    ctx.strokeStyle = metalGrad.g;
    roundRect(-sw * 0.36, 3.2 * u, sw * 0.72, 6 * u, 2.6 * u);
    ctx.stroke();
    ctx.fillStyle = metalGrad.g;
    roundRect(-2.4 * u, 8.6 * u, 4.8 * u, 6.4 * u, 2.2 * u);
    ctx.fill();
    const end = Math.max(16 * u, len);
    roundRect(-1.7 * u, 14 * u, 3.4 * u, end - 14 * u, 1.2 * u);
    ctx.fill();
    ctx.fillStyle = 'rgba(10, 20, 12, 0.35)';
    ctx.fillRect(-0.35 * u, 16 * u, 0.7 * u, Math.max(1, end - 19 * u));
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
    const o = Math.min(0.8, 0.12 + v / 2000 + Math.abs(twist) / 40);
    if (!(Math.abs(x - hx) <= 0.05)) { holo.style.transform = `translate3d(${x.toFixed(2)}%,0,0)`; hx = x; }
    if (!(Math.abs(o - ho) <= 0.005)) { holo.style.opacity = o.toFixed(3); ho = o; }
    const f = deg * 5 + twist * 4;
    if (!(Math.abs(f - fr) <= 0.1)) { foil.style.transform = `rotate(${f.toFixed(1)}deg)`; fr = f; }
  }

  // the beam, the pool, the lit stage edge and the card's shadow on the floor
  let lth = NaN, lsx = NaN, lss = NaN, lso = NaN, ldo = NaN;
  function placeLight() {
    if (!(Math.abs(th - lth) <= 2e-5)) {
      lth = th;
      aim.style.transform = `rotate(${(-th).toFixed(5)}rad)`;
      const dx = (Lx + (floorY - Ly) * Math.tan(th) - hit0).toFixed(2);
      poolX.style.transform = `translate3d(${dx}px,0,0)`;
      lipX.style.transform = `translate3d(${dx}px,0,0)`;
    }
    if (!dropped) return;
    // the card, seen from the lamp, projected onto the floor
    const c = cardAim();
    const dy = Math.max(40, c.y - Ly);
    const mag = (floorY - Ly) / dy;
    const sx = Lx + (c.x - Lx) * mag;
    const t = P[T], b = P[B];
    const ang = Math.atan2(-(b.x - t.x), b.y - t.y);
    const span = cw * Math.abs(Math.cos(ang)) * Math.max(0.2, Math.abs(Math.cos((twist * Math.PI) / 180))) + ch * Math.abs(Math.sin(ang));
    const s = Math.min(2.4, (span * mag) / (cw * 1.45));
    const hit = Lx + (floorY - Ly) * Math.tan(th);
    const off = (sx - hit) / (poolHalf * 0.9);
    // only where the beam lands, and only once the card is in the light
    const inBeam = Math.exp(-off * off);
    const onStage = Math.max(0, Math.min(1, (c.y + ch * 0.2) / (ch * 0.9)));
    const o = inBeam * onStage * Math.min(1, 1.35 / Math.max(1, mag));
    if (!(Math.abs(sx - lsx) <= 0.05) || !(Math.abs(s - lss) <= 0.002)) {
      shadeX.style.transform = `translate3d(${(sx - hit0).toFixed(2)}px,0,0) scaleX(${s.toFixed(3)})`;
      lsx = sx; lss = s;
    }
    if (!(Math.abs(o - lso) <= 0.004)) { shade.style.opacity = o.toFixed(3); lso = o; }
    // thrown out of the beam the card sinks into shadow until the spot catches up
    const k = (Math.atan2(c.x - Lx, c.y - Ly) - th) / (beamA * 0.8);
    const dk = 0.5 * (1 - Math.exp(-k * k));
    if (!(Math.abs(dk - ldo) <= 0.004)) { dim.style.opacity = dk.toFixed(3); ldo = dk; }
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
    if (!n) { raf = requestAnimationFrame(frame); return; }
    draw();

    // sleep once the card and the beam are both still
    let vmax = 0;
    for (let i = 1; i <= B; i++) {
      const p = P[i];
      const v = Math.abs(p.x - p.px) + Math.abs(p.y - p.py);
      if (v > vmax) vmax = v;
    }
    const beamStill = Math.abs(th - aimTgt) < 2e-4 && Math.abs(thV) < 2e-3;
    if (!grab && vmax < 0.012 && Math.abs(twistV) < 0.4 && Math.abs(twist) < 0.25 && beamStill) {
      if (++calm > 24) { awake = false; return; }
    } else calm = 0;
    raf = requestAnimationFrame(frame);
  }

  // read-only snapshot for the verification scripts
  foot.fg3State = () => ({ awake, dropped, visible, lit, grab: !!grab, twist, th, th0, cardX: P[B].x, cardY: P[B].y });

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
    const r = foot.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  if (!still) {
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
        grab.dk = 0.5;
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

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (isSmall()) return;
      layout();
      restPose();
      tf = '';
      draw();
    }, 160);
  });

  const start = () => {
    layout();
    restPose();
    ready = true;
    if (still) dropped = true; // the light is on and the card at rest, no physics
    draw();
    if (wantDrop) drop();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  else window.addEventListener('load', start);
})();
