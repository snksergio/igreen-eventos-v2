/* ============================================================
   Rodapé C — "Palavra perfurada"

   Geometry: the giant word is measured with the real font (canvas
   metrics, same family/width/weight/tracking as the SVG text) and
   fitted to the card; the zoom point is the stem of the I.

   Motion (desktop, motion allowed), all scrubbed with ~1 s of lag:
   1. arrival  — the photo drifts inside the letters (parallax) and
                 the house lights come up (dim layer fades);
   2. pinned   — the photo keeps drifting a beat, then the camera
                 centres on the I and flies through it: the panel
                 (vector, re-drawn crisp each frame) and its HTML
                 content scale together; the photo pulls back to 1:1;
   3. ending   — once the stem covers the screen the panel is hidden
                 and the closing line, CTA and bottom bar rise in.

   Per frame we only write: the photo's transform, the dim layer's
   opacity, one SVG transform attribute, the plane's transform and
   opacity. No layout reads during scroll.
   ============================================================ */

(() => {
  const foot = document.querySelector('.fc-foot');
  if (!foot) return;

  const root = document.documentElement;
  const $ = (s) => foot.querySelector(s);

  const track = $('.fc-track');
  const stage = $('.fc-stage');
  const photo = $('.fc-photo');
  const dim = $('.fc-photo-dim');
  const svg = $('.fc-veil');
  const zoomG = $('.fc-zoom');
  const word = $('.fc-word');
  const mask = svg.querySelector('#fc-holes');
  const mFull = $('.fc-m-full');
  const vPage = $('.fc-v-page');
  const vCard = $('.fc-v-card');
  const vGlow = $('.fc-v-glow');
  const glow = svg.querySelector('#fc-glow');
  const plane = $('.fc-plane');
  const card = $('.fc-card');
  const grid = $('.fc-grid');
  const kicker = $('.fc-kicker');

  const WORD = 'AO VIVO';
  const I_INDEX = 4;            // the I of VIVO: the door we fly through
  const TRACK_EM = -0.012;      // keep in sync with .fc-word letter-spacing
  const FONT = (px) => `condensed 700 ${px}px "Instrument Sans"`;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const clamp01 = (v) => clamp(v, 0, 1);
  const smooth = (t) => t * t * (3 - 2 * t);

  const S = { e: 0, d: 0, z: 0 }; // arrival, dwell, zoom (0..1 each)
  let M = null;                   // word metrics at 100px
  let G = null;                   // current geometry
  let isStatic = root.classList.contains('fc-static');

  /* ---------- measuring ---------- */

  function measure() {
    const c = document.createElement('canvas').getContext('2d');
    c.font = FONT(100);
    c.letterSpacing = `${TRACK_EM * 100}px`;
    const m = c.measureText(WORD);
    const mi = c.measureText('I');
    const penI = c.measureText(WORD.slice(0, I_INDEX + 1)).width - mi.width;
    M = {
      inkL: -m.actualBoundingBoxLeft,
      inkR: m.actualBoundingBoxRight,
      asc: m.actualBoundingBoxAscent,
      desc: m.actualBoundingBoxDescent,
      stemL: penI - mi.actualBoundingBoxLeft,
      stemR: penI + mi.actualBoundingBoxRight,
      iAsc: mi.actualBoundingBoxAscent,
      adv: m.width,
    };
  }

  // offset of an element inside the stage, in layout pixels (ignores transforms)
  function offsetIn(el) {
    let x = 0;
    let y = 0;
    let n = el;
    while (n && n !== stage) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n = n.offsetParent;
    }
    return { x, y };
  }

  function layout() {
    if (!M) return;
    const W = stage.clientWidth;
    const H = stage.clientHeight;

    const cw = card.offsetWidth;
    const pad = clamp(cw * 0.019, 16, 44);   // word inset inside the card
    const inkW100 = M.inkR - M.inkL;
    const inkH100 = M.asc + M.desc;
    let fs = ((cw - pad * 2) / inkW100) * 100;

    if (isStatic) {
      // the word reserves its own room under the grid
      const room = (inkH100 * fs) / 100 + clamp(cw * 0.05, 36, 72) + pad;
      grid.style.paddingBottom = `${Math.round(room)}px`;
    } else {
      grid.style.paddingBottom = '';
      // never let the word climb into the grid on short screens
      const gridBottom = grid.offsetTop + grid.offsetHeight;
      const avail = card.offsetHeight - pad - gridBottom - clamp(H * 0.06, 36, 90);
      fs = Math.min(fs, (avail / inkH100) * 100);
    }

    const o = offsetIn(card);
    const cx = o.x;
    const cy = o.y;
    const ch = card.offsetHeight;
    const cs = getComputedStyle(card);
    const r = parseFloat(cs.borderTopLeftRadius) || 24;
    const k = fs / 100;
    // motion: the panel is the whole (100vh) stage; static: only the card's
    // own block (the closing scene follows below it in the same stage)
    const H2 = isStatic ? Math.round(cy + ch + (parseFloat(cs.marginBottom) || 0)) : H;

    // word: ink centred in the card, ink bottom one inset above the card's bottom
    const inkW = inkW100 * k;
    const inkH = inkH100 * k;
    const x = cx + (cw - inkW) / 2 - M.inkL * k;
    const y = cy + ch - pad - M.desc * k;
    word.setAttribute('font-size', fs.toFixed(3));
    word.setAttribute('x', x.toFixed(2));
    word.setAttribute('y', y.toFixed(2));

    if (isStatic) {
      // the photo only has to sit behind the word: scale it so the lit wall
      // of the stage (about 55-74% of the photo height) fills the letters
      svg.style.height = `${H2}px`;
      photo.style.top = `${Math.round(y - inkH * 3)}px`;
      photo.style.height = `${Math.round(inkH * 4)}px`;
    } else {
      svg.style.height = '';
      photo.style.top = '';
      photo.style.height = '';
    }

    // the panel
    svg.setAttribute('viewBox', `0 0 ${W} ${H2}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H2);
    const big = { x: -20 * W, y: -20 * H2, width: 41 * W, height: 41 * H2 };
    [mask, mFull, vPage].forEach((el) => {
      Object.entries(big).forEach(([a, v]) => el.setAttribute(a, v));
    });
    [vCard, vGlow].forEach((el) => {
      el.setAttribute('x', cx);
      el.setAttribute('y', cy);
      el.setAttribute('width', cw);
      el.setAttribute('height', ch);
      el.setAttribute('rx', r);
    });
    glow.setAttribute('gradientTransform', `translate(${cx + cw / 2} ${cy + ch}) scale(${cw * 0.62} ${ch * 0.95})`);

    // the door: the I's stem
    const stemL = x + M.stemL * k;
    const stemR = x + M.stemR * k;
    const capT = y - M.iAsc * k;
    const capB = y;
    const sCover = Math.max(W / (stemR - stemL), H2 / (capB - capT));

    G = {
      W,
      H: H2,
      wordTop: y - M.asc * k,
      px: (stemL + stemR) / 2,
      py: (capT + capB) / 2,
      cx: W / 2,
      cy: H2 / 2,
      lnS: Math.log(sCover * 1.45),
      stemL,
      stemR,
      capT,
      capB,
    };
    last = {};
    foot.classList.add('fc-ready');
  }

  /* ---------- per-frame render ---------- */

  let last = {};
  const put = (key, el, prop, val) => {
    if (last[key] === val) return;
    last[key] = val;
    if (prop === 'attr') el.setAttribute('transform', val);
    else if (prop === 'fill') el.setAttribute('fill', val);
    else if (el instanceof SVGElement && prop === 'opacity') el.setAttribute('opacity', val);
    else el.style[prop] = val;
  };

  function render() {
    if (!G) return;
    if (isStatic) {
      put('zoom', zoomG, 'attr', 'matrix(1 0 0 1 0 0)');
      put('pageFill', vPage, 'fill', '#010702');
      return;
    }
    const { W, H } = G;

    // photo: drifts during arrival and dwell, pulls back to 1:1 during the zoom
    const zp = smooth(clamp01(S.z / 0.9));
    const sc = 1.3 - 0.3 * zp;
    const oBase = -0.12 + 0.18 * S.e + 0.06 * S.d;      // fraction of H, |o| <= 0.12
    const o = oBase * ((sc - 1) / 0.3);                  // stays inside the overscan
    put('photo', photo, 'transform', `translate3d(0, ${(o * H).toFixed(2)}px, 0) scale(${sc.toFixed(4)})`);
    put('dim', dim, 'opacity', (0.78 * (1 - smooth(clamp01(S.e / 0.95)))).toFixed(3));

    // fly-through: constant zoom speed in log space, centring on the I first
    const u = S.z;
    const s = Math.exp(G.lnS * Math.pow(u, 1.55));
    const kq = smooth(clamp01(u / 0.5));
    const qx = G.px + (G.cx - G.px) * kq;
    const qy = G.py + (G.cy - G.py) * kq;
    const tx = qx - s * G.px;
    const ty = qy - s * G.py;
    const m = `${s.toFixed(5)} 0 0 ${s.toFixed(5)} ${tx.toFixed(2)} ${ty.toFixed(2)}`;
    put('zoom', zoomG, 'attr', `matrix(${m})`);
    put('plane', plane, 'transform', `matrix(${m.split(' ').join(',')})`);

    // the page around the card takes the panel's colour as we approach,
    // so the card's edges dissolve instead of sliding past
    const pf = smooth(clamp01(u / 0.16));
    put('pageFill', vPage, 'fill', `rgb(${Math.round(1 + 5 * pf)}, ${Math.round(7 + 10 * pf)}, ${Math.round(2 + 8 * pf)})`);
    put('glowO', vGlow, 'opacity', (1 - pf).toFixed(3));

    const po = 1 - smooth(clamp01(u / 0.2));
    put('planeO', plane, 'opacity', po.toFixed(3));
    put('planeV', plane, 'visibility', po < 0.01 ? 'hidden' : '');

    // once the stem covers the whole screen the panel stops being drawn
    const covered =
      qx + s * (G.stemL - G.px) < -1 &&
      qx + s * (G.stemR - G.px) > W + 1 &&
      qy + s * (G.capT - G.py) < -1 &&
      qy + s * (G.capB - G.py) > H + 1;
    put('veil', svg, 'visibility', covered ? 'hidden' : '');
  }

  /* ---------- kicker (the site's badge, played by us) ---------- */

  function playKicker() {
    if (!kicker || !root.classList.contains('kp-ready')) return;
    if (!kicker.classList.contains('is-in')) {
      kicker.classList.add('is-in');
      return;
    }
    const busy = kicker.getAnimations({ subtree: true }).some((a) => a.playState === 'running');
    if (busy) return;
    kicker.classList.add('kp-reset');
    void kicker.offsetWidth;
    kicker.classList.remove('kp-reset');
  }

  /* ---------- magnetic CTA (closing scene) ---------- */

  function magnet(el) {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
    const move = (e) => {
      const b = el.getBoundingClientRect();
      xTo((e.clientX - (b.left + b.width / 2)) * 0.22);
      yTo((e.clientY - (b.top + b.height / 2)) * 0.32);
    };
    const leave = () => {
      xTo(0);
      yTo(0);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      gsap.set(el, { x: 0, y: 0 });
    };
  }

  /* ---------- modes ---------- */

  function motionMode() {
    gsap.registerPlugin(ScrollTrigger);

    // arrival: parallax inside the letters + the house lights come up
    gsap.to(S, {
      e: 1,
      ease: 'none',
      onUpdate: render,
      scrollTrigger: {
        trigger: track,
        // starts when the top of the word reaches the bottom of the screen
        start: () => `top bottom-=${Math.round(G ? G.wordTop - 24 : innerHeight * 0.55)}`,
        end: 'top top',
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    // the panel's content settles in once
    const rv = foot.querySelectorAll('.fc-rv');
    gsap.set(rv, { autoAlpha: 0, y: 34 });
    ScrollTrigger.create({
      trigger: track,
      start: 'top 74%',
      once: true,
      onEnter: () => {
        gsap.to(rv, { autoAlpha: 1, y: 0, duration: 1.4, ease: 'expo.out', stagger: 0.075 });
        gsap.delayedCall(0.35, playKicker);
      },
    });

    // pinned: dwell, fly through the I, closing scene
    const endIn = $('.fc-end-in');
    const lines = foot.querySelectorAll('.fc-el-in');
    const after = foot.querySelectorAll('.fc-end-actions, .fc-end-meta');
    const bar = $('.fc-bar');

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: track, start: 'top top', end: 'bottom bottom', scrub: 1 },
    });
    tl.to(S, { d: 1, duration: 0.12, onUpdate: render }, 0)
      .to(S, { z: 1, duration: 0.64, onUpdate: render }, 0.12)
      .to('.fc-scrim', { opacity: 1, duration: 0.14 }, 0.62)
      .fromTo(endIn, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.005 }, 0.7)
      .fromTo(lines, { yPercent: 108 }, { yPercent: 0, duration: 0.15, stagger: 0.035, ease: 'power3.out' }, 0.7)
      .fromTo(after, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.13, stagger: 0.03, ease: 'power3.out' }, 0.78)
      .fromTo(bar, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.12, ease: 'power3.out' }, 0.84)
      .to({}, { duration: 0.04 }, 0.96);

    const unMagnet = magnet($('.fc-magnet'));
    ScrollTrigger.addEventListener('refreshInit', layout);
    ScrollTrigger.addEventListener('refresh', render);
    render();
    return () => {
      ScrollTrigger.removeEventListener('refreshInit', layout);
      ScrollTrigger.removeEventListener('refresh', render);
      unMagnet();
      gsap.set([photo, dim, plane, svg], { clearProps: 'all' });
      zoomG.removeAttribute('transform');
      last = {};
    };
  }

  function staticMode() {
    render();
  }

  /* ---------- boot ---------- */

  const boot = () => {
    measure();
    if (kicker && !matchMedia('(prefers-reduced-motion: reduce)').matches) root.classList.add('kp-ready');
    if (kicker) kicker.addEventListener('mouseenter', playKicker);

    const mm = gsap.matchMedia();
    mm.add(
      {
        motion: '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
        still: '(max-width: 899px), (prefers-reduced-motion: reduce)',
      },
      (ctx) => {
        isStatic = !ctx.conditions.motion;
        root.classList.toggle('fc-static', isStatic);
        layout();
        if (isStatic) {
          staticMode();
          playKicker();
          return undefined;
        }
        return motionMode();
      }
    );

    // the motion version re-measures on ScrollTrigger's refresh; the static
    // one has no ScrollTrigger, so it listens itself
    let rt = 0;
    window.addEventListener('resize', () => {
      if (!isStatic) return;
      clearTimeout(rt);
      rt = setTimeout(() => {
        layout();
        render();
      }, 120);
    });
  };

  const fontReady = document.fonts
    ? Promise.all([document.fonts.load(FONT(100), WORD), document.fonts.ready]).catch(() => {})
    : Promise.resolve();
  fontReady.then(boot);
})();
