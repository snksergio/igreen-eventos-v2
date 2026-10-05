/* ============================================================
   Rodapé B — "Logo gigante"  (see footer-b.css)
   1. Arrival: the statement rises out of its mask, the CTA, the grid
      and the bar follow, the hairline draws across.
   2. Signature, scrubbed with the scroll: the mark powers on from left
      to right (one gradient slab slides inside the logo mask) while a
      soft bloom grows around it; when the page bottoms out the bulb in
      the "g" warms up and glows (one-shot, not a loop).
   3. Lit glass: a light follows the pointer over the mark (two small
      gradients moved with transform, masked by the logo and its edge).
   4. Review switch Logo / Frase: the phrase "iGreen Live" is drawn once
      on a canvas with the site's font and used as the same masks.
   Idle = nothing running (the clock ticks once a minute while the
   footer is on screen).
   ============================================================ */

(() => {
  const root = document.documentElement;
  const footer = document.querySelector('.fb-footer');
  if (!footer) return;

  const $ = (s) => footer.querySelector(s);
  const $$ = (s) => [...footer.querySelectorAll(s)];
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const isStatic = root.classList.contains('fb-static') || !hasGsap;
  if (isStatic) root.classList.add('fb-static');

  const mark = $('.fb-mark');
  const lit = $('.fb-lit');
  const acc = $('.fb-m-acc');
  const halo = $('.fb-halo');
  const bloom = $('.fb-bloom');
  const sheen = $('.fb-m-sheen');
  const rim = $('.fb-m-rim');
  const lightSoft = $('.fb-light-soft');
  const lightRim = $('.fb-light-rim');
  const layers = {
    base: $('.fb-m-base'),
    edge: $('.fb-m-edge'),
    lit: $('.fb-m-lit'),
    acc,
    sheen,
    rim,
  };

  /* ---------- newsletter: visual only ---------- */

  const form = $('.fb-news');
  if (form) {
    const input = form.querySelector('input');
    const msg = form.querySelector('.fb-news-s');
    const msg0 = msg.textContent;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
      form.classList.toggle('is-invalid', !ok);
      form.classList.toggle('is-sent', ok);
      msg.textContent = ok ? 'Pronto. A próxima data chega no seu e-mail.' : 'Confira o e-mail digitado.';
      if (!ok) input.focus();
    });
    input.addEventListener('input', () => {
      if (form.classList.contains('is-sent') || form.classList.contains('is-invalid')) {
        form.classList.remove('is-sent', 'is-invalid');
        msg.textContent = msg0;
      }
    });
  }

  /* ---------- clock: Brasília time, once a minute, only on screen ---------- */

  const timeEl = $('.fb-time');
  const fmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  let clockT = 0;
  let onScreen = false;
  const paint = () => { timeEl.textContent = fmt.format(new Date()); };
  const tick = () => {
    paint();
    clockT = setTimeout(tick, 60000 - (Date.now() % 60000) + 40);
  };
  const syncClock = () => {
    const run = onScreen && !document.hidden;
    if (run && !clockT) tick();
    else if (!run && clockT) { clearTimeout(clockT); clockT = 0; }
  };
  paint();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => { onScreen = en[0].isIntersecting; syncClock(); }).observe(footer);
  }
  document.addEventListener('visibilitychange', syncClock);

  /* ---------- the phrase masks (drawn once, on demand) ---------- */

  let phrase = null;
  let phraseJob = null;

  const blobUrl = (canvas) => new Promise((res) => canvas.toBlob((b) => res(URL.createObjectURL(b)), 'image/png'));

  async function buildPhrase() {
    const w = mark.clientWidth;
    const h = mark.clientHeight;
    if (phrase && Math.abs(phrase.w - w) < 2) return phrase;
    try { await document.fonts.load('600 100px "Instrument Sans"'); } catch (e) { /* fall back silently */ }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.round(w * dpr);
    const H = Math.round(h * dpr);
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    const TEXT = 'iGreen Live';
    const setFont = (fs) => {
      ctx.font = `600 ${fs}px "Instrument Sans", "Helvetica Neue", Arial, sans-serif`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${(-0.028 * fs).toFixed(2)}px`;
    };
    // fit the ink of the phrase to the exact width of the logo
    setFont(100);
    let m = ctx.measureText(TEXT);
    const fs = (100 * W) / (m.actualBoundingBoxLeft + m.actualBoundingBoxRight);
    setFont(fs);
    m = ctx.measureText(TEXT);
    const x = m.actualBoundingBoxLeft;
    const asc = m.actualBoundingBoxAscent;
    const desc = m.actualBoundingBoxDescent;
    const by = Math.round((H + asc - desc) / 2); // ink centred in the same box as the logo
    const draw = (fn) => { ctx.clearRect(0, 0, W, H); fn(); return blobUrl(c); };

    const fill = await draw(() => ctx.fillText(TEXT, x, by));
    // outlines = stroke minus fill: the variable font has overlapping
    // contours, so only the outer half of the stroke is kept (no seams inside)
    ctx.lineJoin = 'round';
    const outline = (px) => () => {
      ctx.lineWidth = px * 2 * dpr;
      ctx.strokeText(TEXT, x, by);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillText(TEXT, x, by);
      ctx.globalCompositeOperation = 'source-over';
    };
    const edge = await draw(outline(1.1));
    const rimEdge = await draw(outline(2.6));
    const pre = ctx.measureText('iGreen ').width;
    const lm = ctx.measureText('Live');
    const accent = await draw(() => ctx.fillText('Live', x + pre, by));
    const cx = x + pre + (lm.actualBoundingBoxRight - lm.actualBoundingBoxLeft) / 2;

    if (phrase) [phrase.fill, phrase.edge, phrase.rim, phrase.accent].forEach((u) => URL.revokeObjectURL(u));
    phrase = {
      w, fill, edge, accent, rim: rimEdge,
      hx: `${((cx / W) * 100).toFixed(2)}%`,
      hy: `${(((by - lm.actualBoundingBoxAscent * 0.5) / H) * 100).toFixed(2)}%`,
    };
    return phrase;
  }
  const ensurePhrase = () => {
    if (!phraseJob || (phrase && Math.abs(phrase.w - mark.clientWidth) >= 2)) phraseJob = buildPhrase();
    return phraseJob;
  };

  const setMask = (el, url) => {
    if (url) {
      el.style.webkitMaskImage = `url("${url}")`;
      el.style.maskImage = `url("${url}")`;
    } else {
      el.style.removeProperty('-webkit-mask-image');
      el.style.removeProperty('mask-image');
    }
  };
  const applyMode = (mode) => {
    const p = mode === 'phrase' ? phrase : null;
    setMask(layers.base, p && p.fill);
    setMask(layers.sheen, p && p.fill);
    setMask(layers.lit, p && p.fill);
    setMask(layers.acc, p && p.accent);
    setMask(layers.edge, p && p.edge);
    setMask(layers.rim, p && p.rim);
    mark.style.setProperty('--hx', p ? p.hx : '17.5%');
    mark.style.setProperty('--hy', p ? p.hy : '52%');
    mark.dataset.mode = mode;
    mark.setAttribute('aria-label', p ? 'iGreen Live' : 'iGreen');
  };

  /* ---------- review switch ---------- */

  const sw = $('.fb-switch');
  const swBtns = $$('.fb-switch button');
  const thumb = $('.fb-switch-thumb');
  let mode = 'logo';
  let swapping = false;
  const placeThumb = (btn, instant) => {
    thumb.style.width = `${btn.offsetWidth}px`;
    const x = btn.offsetLeft - 3;
    if (hasGsap && !instant && !isStatic) gsap.to(thumb, { x, duration: 0.55, ease: 'expo.out' });
    else thumb.style.transform = `translateX(${x}px)`;
  };
  placeThumb(swBtns[0], true);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => placeThumb(swBtns.find((b) => b.dataset.mode === mode), true));
  }

  let replay = () => {}; // set below when motion is on

  swBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const next = btn.dataset.mode;
      if (next === mode || swapping) return;
      swapping = true;
      mode = next;
      swBtns.forEach((b) => {
        b.setAttribute('aria-checked', String(b === btn));
        b.tabIndex = b === btn ? 0 : -1;
      });
      placeThumb(btn);
      if (next === 'phrase') await ensurePhrase();
      await replay(() => applyMode(next));
      swapping = false;
    });
  });
  // arrow keys inside the radio group
  sw.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const i = swBtns.findIndex((b) => b.dataset.mode === mode);
    const j = (i + (e.key === 'ArrowRight' ? 1 : swBtns.length - 1)) % swBtns.length;
    swBtns[j].focus();
    swBtns[j].click();
  });

  // prepare the phrase quietly once the page is calm, so the switch is instant
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
  idle(() => ensurePhrase());

  // keep the phrase masks crisp if the width changes
  let rzT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rzT);
    rzT = setTimeout(async () => {
      if (mode !== 'phrase') { phraseJob = null; return; }
      await ensurePhrase();
      applyMode('phrase');
    }, 220);
  });

  if (isStatic) {
    replay = async (swap) => { swap(); };
    return;
  }

  /* ================= motion ================= */

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- 1. arrival (plays once) ---------- */

  const line = $$('.fb-li');
  const cta = $('.fb-cta');
  const cols = $$('.fb-grid .fb-rv');
  const bar = $('.fb-bar');
  const rule = $('.fb-rule');

  gsap.set(line, { yPercent: 112, y: 0 });
  gsap.set(cta, { autoAlpha: 0, y: 22 });
  gsap.set(cols, { autoAlpha: 0, y: 26 });
  gsap.set(bar, { autoAlpha: 0, y: 16 });
  gsap.set(rule, { scaleX: 0, transformOrigin: '0% 50%' });

  ScrollTrigger.create({
    trigger: $('.fb-head'),
    start: 'top 86%',
    once: true,
    onEnter: () => {
      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .to(line, { yPercent: 0, duration: 1.5 })
        .to(cta, { autoAlpha: 1, y: 0, duration: 1.3 }, 0.3);
    },
  });
  ScrollTrigger.create({
    trigger: $('.fb-grid'),
    start: 'top 92%',
    once: true,
    onEnter: () => {
      gsap.timeline()
        .to(rule, { scaleX: 1, duration: 1.8, ease: 'expo.inOut' })
        .to(cols, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.08, ease: 'power3.out' }, 0.25)
        .to(bar, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'power3.out' }, 0.55);
    },
  });

  /* ---------- 2. power-on (scrubbed) + bulb (one-shot) ---------- */

  gsap.set(lit, { xPercent: -100, x: 0 });
  gsap.set(halo, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 0.6 });
  const setLit = gsap.quickSetter(lit, 'xPercent');
  const setBloom = gsap.quickSetter(bloom, 'opacity');

  const bulb = gsap.timeline({ paused: true })
    .fromTo(acc, { opacity: 0 }, { opacity: 0.9, duration: 0.07, ease: 'power1.in' })
    .to(acc, { opacity: 0.28, duration: 0.11, ease: 'none' })
    .to(acc, { opacity: 1, duration: 0.7, ease: 'power2.out' })
    .to(halo, { opacity: 1, scale: 1, duration: 1.8, ease: 'expo.out' }, 0.15);

  const state = { scroll: 0, intro: 1 };
  let bulbOn = false;
  let power = 0;
  const render = () => {
    power = Math.min(state.scroll, state.intro);
    setLit(-100 + 108.34 * power); // ends with the hot edge past the last letter
    setBloom(power);
    if (power > 0.985 && !bulbOn) {
      bulbOn = true;
      bulb.timeScale(1).play();
    } else if (power < 0.72 && bulbOn) {
      bulbOn = false;
      bulb.timeScale(2.4).reverse();
    }
  };

  gsap.to(state, {
    scroll: 1,
    ease: 'sine.inOut',
    onUpdate: render,
    scrollTrigger: {
      trigger: mark,
      start: 'top bottom',
      end: 'max', // complete exactly at the end of the page
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });

  // switch: fade the mark, swap the shape, power it on again
  replay = (swap) => new Promise((resolve) => {
    gsap.timeline({ onComplete: resolve })
      .to(mark, { autoAlpha: 0, duration: 0.32, ease: 'power2.in' })
      .add(() => {
        swap();
        bulbOn = false;
        bulb.pause(0);
        state.intro = 0;
        render();
      })
      .to(mark, { autoAlpha: 1, duration: 0.45, ease: 'power2.out' })
      .to(state, { intro: 1, duration: 1.9, ease: 'power2.inOut', onUpdate: render }, '-=0.25');
  });

  /* ---------- 3. lit glass: the pointer light ---------- */

  if (matchMedia('(hover: hover)').matches) {
    gsap.set([lightSoft, lightRim], { xPercent: -50, yPercent: -50, x: 0, y: 0 });
    const q = (el, p, d) => gsap.quickTo(el, p, { duration: d, ease: 'power3.out' });
    const sx = q(lightSoft, 'x', 0.9);
    const sy = q(lightSoft, 'y', 0.9);
    const rx = q(lightRim, 'x', 0.6);
    const ry = q(lightRim, 'y', 0.6);
    const fs = q(sheen, 'opacity', 0.7);
    const fr = q(rim, 'opacity', 0.7);
    let primed = false;

    footer.addEventListener('pointermove', (e) => {
      const r = mark.getBoundingClientRect();
      const x = e.clientX - r.left;
      const yRaw = e.clientY - r.top;
      // anywhere over the footer the light travels along the mark;
      // the closer the pointer, the brighter it gets
      const y = gsap.utils.clamp(r.height * 0.12, r.height * 0.88, yRaw);
      const dist = yRaw < 0 ? -yRaw : Math.max(0, yRaw - r.height);
      const near = gsap.utils.clamp(0.22, 1, 1 - dist / 620);
      const k = near * (0.55 + 0.45 * power); // dimmer while the mark is still off
      if (!primed) { // first contact: place the light without a long glide
        primed = true;
        gsap.set([lightSoft, lightRim], { x, y });
      }
      sx(x); sy(y); rx(x); ry(y);
      fs(k); fr(k * 0.9);
    });
    footer.addEventListener('pointerleave', () => { fs(0); fr(0); primed = false; });
  }

  // magnetic primary CTA
  const mag = $('.fb-mag');
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

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
})();
