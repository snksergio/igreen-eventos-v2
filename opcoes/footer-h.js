/* ============================================================
   Rodapé H — "Telão de LED"
   One canvas, dot-matrix LED wall.

   How it stays cheap:
   - The ticker text is rasterised ONCE into a tiny "map" canvas where
     1 px = 1 LED (supersampled, then a contrast curve so letters are
     crisp but keep a little anti-aliasing).
   - Each frame: fill the off-LED colour, draw the visible slice of the
     map scaled up by the pitch with bilinear filtering and a sub-LED
     offset (so the scroll is smooth: each LED fades between its
     neighbours), add the cursor spotlight, then keep only the dots with
     one 'destination-in' pattern fill. That is a handful of GPU blits
     and almost no JS per frame; nothing is laid out per frame.
   - The spotlight's bigger, brighter LEDs are a second small pass on a
     tile around the cursor.
   - Off-screen / hidden tab: the loop stops. Before power-on it is a
     single static frame.
   ============================================================ */

(() => {
  const footer = document.getElementById('fh-footer');
  if (!footer) return;

  const wall = footer.querySelector('.fh-wall');
  const canvas = footer.querySelector('.fh-led');
  const seams = footer.querySelector('.fh-seams');
  const ctx = canvas.getContext('2d');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmall = () => window.innerWidth <= 900;
  const hasGsap = typeof window.gsap !== 'undefined';
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------------------------------------------------------- entrance */

  // shared by the entrance triggers and the wall
  let wantPower = false, ready = false, powering = false, powered = false;
  if (hasGsap && !reduce && !isSmall()) {
    const gsap = window.gsap;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
    footer.classList.add('fh-js');
    const lines = footer.querySelectorAll('.fh-line-in');
    gsap.set(lines, { yPercent: 105, y: 0 });
    const top = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
      .to(lines, { yPercent: 0, duration: 1.35, stagger: 0.12 }, 0)
      .fromTo(footer.querySelector('.fh-next'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out' }, 0.35);
    const base = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
      .fromTo(footer.querySelectorAll('.fh-brand, .fh-col'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1, stagger: 0.07 }, 0)
      .fromTo(footer.querySelector('.fh-bar'), { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power2.out' }, 0.4);

    if (window.ScrollTrigger) {
      const ST = window.ScrollTrigger;
      ST.create({ trigger: footer.querySelector('.fh-top'), start: 'top 80%', once: true, onEnter: () => top.play() });
      ST.create({ trigger: wall, start: 'center 70%', once: true, onEnter: () => powerOn() });
      ST.create({ trigger: footer.querySelector('.fh-base'), start: 'top 90%', once: true, onEnter: () => base.play() });
    } else {
      top.play(); base.play(); wantPower = true;
    }

    const cta = footer.querySelector('.fh-cta');
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

  /* ---------------------------------------------------------- the wall */

  const ROWS = 36;              // LED rows
  const SPEED = 10;             // LEDs per second at cruise
  const OFF = 'rgb(17, 42, 22)';        // an LED that is off
  const STANDBY = 'rgb(9, 24, 12)';     // before the wall powers on
  // two tones like the site's headings: the cities lit, the rest muted
  const LIME = '#B4FF4A', MUTE = '#6E9C38';

  let dpr = 1, P = 8, cols = 0, cw = 0, ch = 0;
  let map = null, loopCols = 0, startCol = 0, endCol = 0;
  let dotPat = null, bigPat = null, edgeGrad = null;
  let spotCv = null, sctx = null, spotSize = 0, R = 0;

  let offset = 0;               // in LED columns (float)
  let power = 0, poweredAt = 0;
  let visible = false, raf = 0, last = 0;
  const spot = { x: 0, y: 0, tx: 0, ty: 0, a: 0, ta: 0 };

  /* the ticker: segments of [text, colour]; '*' is a lit star separator */
  const TICKER = [
    ['Próxima parada', MUTE], '*',
    ['Goiânia', LIME], [' 16 ago', MUTE], '*',
    ['São Paulo', LIME], [' 23 ago', MUTE], '*',
    ['Belo Horizonte', LIME], [' 30 ago', MUTE], '*',
    ['Curitiba', LIME], [' 6 set', MUTE], '*',
    ['Recife', LIME], [' 13 set', MUTE], '*',
    ['Rio de Janeiro', LIME], [' 20 set', MUTE], '*',
  ];

  async function buildMap() {
    try { await document.fonts.load('600 96px "Instrument Sans"'); } catch (e) { /* fallback font */ }
    const SS = 4;                       // supersampling
    const F = 25 * SS;                  // font size: 25 LEDs
    const base = 27.5 * SS;             // baseline row
    const t = document.createElement('canvas');
    const g = t.getContext('2d');
    const font = `600 ${F}px "Instrument Sans", "Helvetica Neue", Arial, sans-serif`;
    g.font = font;
    if ('letterSpacing' in g) g.letterSpacing = `${(F * 0.025).toFixed(1)}px`;
    const sepW = F * 1.5;
    let width = 0;
    for (const s of TICKER) width += s === '*' ? sepW : g.measureText(s[0]).width;
    loopCols = Math.ceil(width / SS);
    t.width = loopCols * SS;
    t.height = ROWS * SS;
    g.font = font;
    if ('letterSpacing' in g) g.letterSpacing = `${(F * 0.025).toFixed(1)}px`;
    g.textBaseline = 'alphabetic';
    let x = 0;
    for (const s of TICKER) {
      if (s === '*') {
        // four-point star, the site's seal mark
        const cx = x + sepW / 2, cy = base - F * 0.34, r = F * 0.2;
        g.fillStyle = LIME;
        g.beginPath();
        g.moveTo(cx, cy - r);
        g.quadraticCurveTo(cx + r * 0.12, cy - r * 0.12, cx + r, cy);
        g.quadraticCurveTo(cx + r * 0.12, cy + r * 0.12, cx, cy + r);
        g.quadraticCurveTo(cx - r * 0.12, cy + r * 0.12, cx - r, cy);
        g.quadraticCurveTo(cx - r * 0.12, cy - r * 0.12, cx, cy - r);
        g.fill();
        x += sepW;
      } else {
        if (s[0] === 'Goiânia') startCol = x / SS;
        g.fillStyle = s[1];
        g.fillText(s[0], x, base);
        x += g.measureText(s[0]).width;
        if (s[0] === ' 16 ago') endCol = x / SS;
      }
    }

    // downsample to 1 px per LED, then tighten the edges
    const m = document.createElement('canvas');
    const extra = 460;                  // room for the widest wall's slice
    m.width = loopCols + extra;
    m.height = ROWS;
    const mg = m.getContext('2d');
    mg.imageSmoothingEnabled = true;
    mg.imageSmoothingQuality = 'high';
    for (let k = 0; k * loopCols < m.width; k++) mg.drawImage(t, k * loopCols, 0, loopCols, ROWS);
    const id = mg.getImageData(0, 0, m.width, ROWS);
    const d = id.data;
    for (let i = 3; i < d.length; i += 4) {
      const a = d[i] / 255;
      const q = Math.max(0, Math.min(1, (a - 0.16) / 0.5));
      d[i] = Math.round(q * q * (3 - 2 * q) * 255);
    }
    mg.putImageData(id, 0, 0);
    map = m;
  }

  function dotCell(core, edge, halo) {
    const c = document.createElement('canvas');
    c.width = c.height = P;
    const g = c.getContext('2d');
    const r = P / 2;
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(core, 'rgba(0,0,0,1)');
    gr.addColorStop(edge, `rgba(0,0,0,${halo})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, P, P);
    return c;
  }

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const ww = wall.clientWidth;
    const pitch = Math.max(6, Math.min(12, ww / 205));
    P = Math.max(6, Math.round(pitch * dpr));
    cols = Math.floor((ww * dpr) / P);
    cw = cols * P;
    ch = ROWS * P;
    canvas.width = cw;
    canvas.height = ch;
    canvas.style.width = `${cw / dpr}px`;
    canvas.style.height = `${ch / dpr}px`;
    wall.style.height = `${ch / dpr}px`;
    // centre on whole device pixels so every LED stays crisp
    const left = Math.floor((ww * dpr - cw) / 2) / dpr;
    canvas.style.marginLeft = `${left}px`;
    if (seams) {
      seams.style.left = `${left}px`;
      seams.style.width = `${cw / dpr}px`;
      seams.style.height = `${ch / dpr}px`;
      seams.style.setProperty('--fh-cx', `${(16 * P) / dpr}px`);
      seams.style.setProperty('--fh-cy', `${(12 * P) / dpr}px`);
    }

    dotPat = ctx.createPattern(dotCell(0.56, 0.74, 0.2), 'repeat');
    // edges of the wall fade out (like the screen meets the dark wings)
    edgeGrad = ctx.createLinearGradient(0, 0, cw, 0);
    edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
    edgeGrad.addColorStop(0.05, 'rgba(0,0,0,1)');
    edgeGrad.addColorStop(0.95, 'rgba(0,0,0,1)');
    edgeGrad.addColorStop(1, 'rgba(0,0,0,0)');

    R = P * 17;
    spotSize = (Math.ceil((2 * R) / P) + 2) * P;
    spotCv = spotCv || document.createElement('canvas');
    spotCv.width = spotCv.height = spotSize;
    sctx = spotCv.getContext('2d');
    bigPat = sctx.createPattern(dotCell(0.72, 0.86, 0.3), 'repeat');

    if (map && cols + 4 > map.width - loopCols) buildMap().then(render);
  }

  /* ---------------------------------------------------------- draw */

  function slice(g, dx, dy) {
    const o = ((offset % loopCols) + loopCols) % loopCols;
    const c0 = Math.floor(o);
    const f = o - c0;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'low'; // plain bilinear: the sub-LED blend
    g.drawImage(map, c0, 0, cols + 2, ROWS, -f * P + dx, dy, (cols + 2) * P, ROWS * P);
  }

  function render() {
    if (!map || !cw) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, cw, ch);

    if (!powered && !powering) {
      // standby: the dark grid only
      ctx.fillStyle = STANDBY;
      ctx.fillRect(0, 0, cw, ch);
    } else if (powering) {
      // a scanline sweeps down; rows above it are on
      const front = power * (ROWS + 3) - 1.5;
      const on = Math.max(0, Math.min(ROWS, Math.floor(front))) * P;
      ctx.fillStyle = OFF;
      ctx.fillRect(0, 0, cw, on);
      ctx.fillStyle = STANDBY;
      ctx.fillRect(0, on, cw, ch - on);
      if (on > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, cw, on);
        ctx.clip();
        slice(ctx, 0, 0);
        ctx.restore();
      }
      // the bright front and its short afterglow
      ctx.globalCompositeOperation = 'lighter';
      const fr = Math.floor(front);
      const glow = [0.95, 0.42, 0.16];
      for (let k = 0; k < glow.length; k++) {
        const r = fr - k;
        if (r < 0 || r >= ROWS) continue;
        ctx.fillStyle = `rgba(200, 255, 140, ${glow[k]})`;
        ctx.fillRect(0, r * P, cw, P);
      }
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.fillStyle = OFF;
      ctx.fillRect(0, 0, cw, ch);
      slice(ctx, 0, 0);
    }

    // spotlight: light added before the dot mask, so every LED under it
    // brightens (off ones glow green, lit ones go pale)
    const sp = powered && spot.a > 0.004;
    if (sp) {
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, R);
      gr.addColorStop(0, `rgba(216, 255, 166, ${0.52 * spot.a})`);
      gr.addColorStop(0.45, `rgba(168, 255, 53, ${0.18 * spot.a})`);
      gr.addColorStop(1, 'rgba(168, 255, 53, 0)');
      ctx.fillStyle = gr;
      ctx.fillRect(spot.x - R, spot.y - R, 2 * R, 2 * R);
    }

    // keep only the LEDs
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = dotPat;
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'source-over';

    if (sp) spotPass();
  }

  // the LEDs under the cursor also grow: same image, bigger dots, faded out
  // radially, laid over the small ones
  function spotPass() {
    const sx = Math.floor((spot.x - R) / P) * P - P;
    const sy = Math.floor((spot.y - R) / P) * P - P;
    const g = sctx;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, spotSize, spotSize);
    g.fillStyle = OFF;
    g.fillRect(0, 0, spotSize, spotSize);
    slice(g, -sx, -sy);
    const cx = spot.x - sx, cy = spot.y - sy;
    g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    gr.addColorStop(0, `rgba(216, 255, 166, ${0.62 * spot.a})`);
    gr.addColorStop(0.5, `rgba(168, 255, 53, ${0.2 * spot.a})`);
    gr.addColorStop(1, 'rgba(168, 255, 53, 0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, spotSize, spotSize);
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = bigPat;
    g.fillRect(0, 0, spotSize, spotSize);
    const fall = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.92);
    fall.addColorStop(0, `rgba(0,0,0,${spot.a})`);
    fall.addColorStop(0.55, `rgba(0,0,0,${0.55 * spot.a})`);
    fall.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fall;
    g.fillRect(0, 0, spotSize, spotSize);
    g.globalCompositeOperation = 'source-over';
    ctx.drawImage(spotCv, sx, sy);
  }

  /* ---------------------------------------------------------- loop */

  const POWER_MS = 1500;
  let powerT0 = 0;

  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    // ~60 fps is plenty for a slow ticker; on 120-240 Hz screens skip the rest
    if (now - last < 15.5) { raf = requestAnimationFrame(frame); return; }
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0) || dt > 0.1) dt = 1 / 60;

    if (powering) {
      const p = Math.min(1, (now - powerT0) / POWER_MS);
      power = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // ease in-out
      if (p >= 1) { powering = false; powered = true; poweredAt = now; }
    }
    if (powered) {
      // the ticker eases up to cruise speed after power-on
      const k = Math.min(1, (now - poweredAt) / 1600);
      const e = 1 - Math.pow(1 - k, 3);
      offset += SPEED * e * dt;
      // spotlight follow + fade
      spot.x += (spot.tx - spot.x) * 0.2;
      spot.y += (spot.ty - spot.y) * 0.2;
      spot.a += (spot.ta - spot.a) * 0.1;
      if (spot.ta === 0 && spot.a < 0.004) spot.a = 0;
    }
    render();
    if (powering || powered) raf = requestAnimationFrame(frame);
  }

  // read-only snapshot for the verification scripts
  footer.fhState = () => ({ powered, powering, visible, running: !!raf, offset, spot: { ...spot }, P, cols });

  function run() {
    if (raf || !visible || document.hidden || reduce || isSmall()) return;
    if (!powering && !powered) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function powerOn() {
    if (!ready) { wantPower = true; return; }
    if (powering || powered) return;
    powering = true;
    powerT0 = performance.now();
    wall.classList.add('is-on');
    run();
  }

  /* ---------------------------------------------------------- input */

  if (finePointer && !reduce) {
    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) * dpr, y = (e.clientY - r.top) * dpr;
      if (spot.ta === 0) { spot.x = x; spot.y = y; }
      spot.tx = x; spot.ty = y; spot.ta = 1;
    });
    canvas.addEventListener('pointerleave', () => { spot.ta = 0; });
  }

  /* ---------------------------------------------------------- lifecycle */

  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) run();
  });
  io.observe(wall);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) run(); });

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { layout(); render(); }, 160);
  });

  (async () => {
    await buildMap();
    layout();
    // the wall opens on the next stop, centred (or from its start if it is wider)
    const span = endCol - startCol;
    offset = span < cols * 0.92 ? Math.round((startCol + endCol) / 2 - cols / 2) : startCol - Math.round(cols * 0.04);
    ready = true;
    if (reduce || isSmall()) {
      powered = true; // a calm, still frame
      wall.classList.add('is-on');
      render();
      return;
    }
    render();
    if (wantPower) powerOn();
  })();
})();
