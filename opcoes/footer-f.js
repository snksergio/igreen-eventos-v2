/* ============================================================
   Rodapé F — "Letreiro" (see footer-f.css)
   1. Arrival: the card rises from below as it enters, the title lines
      come up out of their masks, the form settles, the glow fades in
      under the card and the marquee arrives with a rush that eases off.
   2. The marquee: its steady drift is a Web Animation on the track (it
      runs on the compositor, no JS per frame at rest). Scrolling changes
      its playback rate: the rest direction follows the last scroll
      direction (down = leftward), velocity adds a push and a small skew
      on the wrapper, and both ease back to rest. A small gsap.ticker
      callback runs only while something is settling, then removes
      itself. Hover/focus brings it to a stop and turns it lime. The
      animation is paused off-screen and while the tab is hidden.
   Only transform and opacity change per frame.
   ============================================================ */

(() => {
  window.ffReady = true;

  const html = document.documentElement;
  const stage = document.querySelector('.ff-stage');
  const card = document.querySelector('.ff-card');
  const mq = document.querySelector('.ff-marquee');
  const skewEl = mq.querySelector('.ff-skew');
  const track = mq.querySelector('.ff-track');
  const group = track.querySelector('.ff-group');
  const glow = stage.querySelector('.ff-glow');

  /* ---------- form: visual only, nothing is sent ---------- */
  const form = document.querySelector('.ff-form');
  let sentT;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.classList.add('is-sent');
    clearTimeout(sentT);
    sentT = setTimeout(() => form.classList.remove('is-sent'), 3200);
  });

  /* ---------- city picker (button + listbox) ---------- */
  (() => {
    const box = form.querySelector('.ff-select');
    const btn = box.querySelector('.ff-select-btn');
    const val = box.querySelector('.ff-select-v');
    const list = box.querySelector('.ff-options');
    const hidden = box.querySelector('input[type="hidden"]');
    const opts = [...list.querySelectorAll('[role="option"]')];
    let active = -1;

    const setActive = (i) => {
      opts.forEach((o, k) => o.classList.toggle('is-active', k === i));
      active = i;
      if (i >= 0) list.setAttribute('aria-activedescendant', opts[i].id);
      else list.removeAttribute('aria-activedescendant');
    };
    const open = () => {
      box.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      const sel = opts.findIndex((o) => o.getAttribute('aria-selected') === 'true');
      setActive(sel >= 0 ? sel : 0);
      list.focus({ preventScroll: true });
    };
    const close = (refocus) => {
      box.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      setActive(-1);
      if (refocus) btn.focus({ preventScroll: true });
    };
    const choose = (i) => {
      opts.forEach((o, k) => o.setAttribute('aria-selected', String(k === i)));
      const o = opts[i];
      val.classList.remove('is-empty');
      val.innerHTML = '';
      val.append(o.querySelector('span').textContent);
      const t = document.createElement('time');
      t.textContent = o.querySelector('time').textContent;
      val.append(t);
      hidden.value = o.querySelector('span').textContent;
      close(true);
    };

    btn.addEventListener('click', () => (box.classList.contains('is-open') ? close(true) : open()));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); }
    });
    list.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(opts.length - 1, active + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(0, active - 1)); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
      else if (e.key === 'End') { e.preventDefault(); setActive(opts.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (active >= 0) choose(active); }
      else if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'Tab') { close(false); }
    });
    opts.forEach((o, i) => {
      o.addEventListener('pointerenter', () => setActive(i));
      o.addEventListener('click', () => choose(i));
    });
    document.addEventListener('pointerdown', (e) => {
      if (box.classList.contains('is-open') && !box.contains(e.target)) close(false);
    });
  })();

  document.querySelector('.ff-top').addEventListener('click', (e) => {
    e.preventDefault();
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
  });

  /* ---------- fill the track with enough copies of the phrase ---------- */
  let groupW = 0;
  function fill() {
    track.querySelectorAll('.ff-group:not(:first-child)').forEach((n) => n.remove());
    groupW = group.getBoundingClientRect().width;
    const copies = Math.ceil(mq.clientWidth / groupW) + 2;
    for (let i = 1; i < copies; i++) track.appendChild(group.cloneNode(true));
  }
  fill();

  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!window.gsap || !window.ScrollTrigger || calm || !track.animate) {
    html.classList.remove('ff-js');
    addEventListener('resize', fill);
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- marquee engine ---------- */
  const clampSkew = gsap.utils.clamp(-8, 8);
  const clampV = gsap.utils.clamp(-4200, 4200);
  const baseSpeed = () => Math.max(46, innerWidth * 0.045);   // px/s at rest

  let dirT = 1, dir = 1;          // rest direction: 1 = leftward (after scrolling down)
  let pushT = 0, push = 0;        // scroll push in px/s (+ = leftward)
  let holdT = 1, hold = 1;        // 0 while hovered (stopped)
  let skew = 0, rate = 1, lastRate = 1;
  let onScreen = false;
  const G = { in: 0 };            // glow entrance (tweened)
  let lastGlow = -1, lastSkew = '';
  const setSkew = (v) => {
    const s = `skewX(${(Math.abs(v) < 0.01 ? 0 : v).toFixed(2)}deg)`;
    if (s !== lastSkew) { skewEl.style.transform = s; lastSkew = s; }
  };

  let anim = null, dur = 1;
  function build() {
    const frac = anim ? ((anim.currentTime % dur) + dur) % dur / dur : 0;
    if (anim) anim.cancel();
    dur = (groupW / baseSpeed()) * 1000;
    anim = track.animate(
      [{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(${-groupW}px,0,0)` }],
      { duration: dur, iterations: Infinity, easing: 'linear' }
    );
    // start deep into the loop so a negative rate (rightward) never reaches time 0
    anim.currentTime = dur * (20000 + frac);
    anim.playbackRate = rate;
    if (!onScreen || document.hidden) anim.pause();
  }
  build();

  const paintGlow = () => {
    const g = G.in * (0.78 + Math.min(Math.abs(push) / 2600, 1) * 0.22);
    if (Math.abs(g - lastGlow) > 0.003) { glow.style.opacity = g.toFixed(3); lastGlow = g; }
  };

  // settles push / direction / hold / skew; removes itself once at rest
  let ticking = false;
  function tick(time, deltaMs) {
    const dt = Math.min(deltaMs, 64) / 1000;
    const ease = (r) => 1 - Math.exp(-dt * r);

    pushT *= Math.exp(-dt * 2.6);
    push += (pushT - push) * ease(6);
    dir += (dirT - dir) * ease(1.8);
    hold += (holdT - hold) * ease(holdT ? 2.4 : 5.5);
    skew += (clampSkew(push * 0.0034) * hold - skew) * ease(8);

    rate = (dir + (push * 0.36) / baseSpeed()) * hold;
    if (Math.abs(rate - lastRate) > 0.002) { anim.updatePlaybackRate(rate); lastRate = rate; }
    setSkew(skew);
    paintGlow();

    const settled = Math.abs(pushT) < 2 && Math.abs(push) < 2 && Math.abs(dirT - dir) < 0.002 &&
      Math.abs(holdT - hold) < 0.002 && Math.abs(skew) <= 0.01;
    if (settled) {
      push = pushT = 0; dir = dirT; hold = holdT; skew = 0;
      rate = dir * hold;
      anim.updatePlaybackRate(rate); lastRate = rate;
      setSkew(0);
      paintGlow();
      gsap.ticker.remove(tick);
      ticking = false;
    }
  }
  const wake = () => {
    if (!ticking && onScreen && !document.hidden) { gsap.ticker.add(tick); ticking = true; }
  };
  const sleep = () => { if (ticking) { gsap.ticker.remove(tick); ticking = false; } };

  const sync = () => {
    if (onScreen && !document.hidden) { anim.play(); wake(); }
    else { anim.pause(); sleep(); }
  };
  new IntersectionObserver((entries) => {
    onScreen = entries[0].isIntersecting;
    sync();
  }, { rootMargin: '80px 0px' }).observe(mq);
  document.addEventListener('visibilitychange', sync);

  // scroll velocity → push + direction (only while the card is around)
  ScrollTrigger.create({
    trigger: card,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate(self) {
      const v = clampV(self.getVelocity());
      if (Math.abs(v) > Math.abs(pushT) || Math.sign(v) !== Math.sign(pushT)) pushT = v;
      dirT = self.direction;
      wake();
    },
  });

  // hover / focus: stop, lime, glow core
  const hot = (on) => { holdT = on ? 0 : 1; stage.classList.toggle('is-hot', on); wake(); };
  mq.addEventListener('pointerenter', () => hot(true));
  mq.addEventListener('pointerleave', () => hot(false));
  mq.addEventListener('focus', () => hot(true));
  mq.addEventListener('blur', () => hot(false));

  const rebuild = () => { fill(); build(); };
  let rT;
  addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(rebuild, 120); });
  if (document.fonts) document.fonts.ready.then(rebuild);

  /* ---------- arrival ---------- */
  if (!html.classList.contains('ff-js')) {
    G.in = 1;
    paintGlow();
    return;
  }

  const arrive = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
  arrive
    .to(card, { opacity: 1, y: 0, scale: 1, duration: 1.6 }, 0)
    .to('.ff-tl-in', { y: 0, duration: 1.4, stagger: 0.1 }, 0.22)
    .to('.ff-rv', { opacity: 1, y: 0, duration: 1.2, stagger: 0.08, ease: 'power3.out' }, 0.45)
    .to('.ff-fv', { opacity: 1, y: 0, duration: 1.1, stagger: 0.07, ease: 'power3.out' }, 0.5)
    .add(() => { pushT = 3000; dirT = 1; wake(); }, 0.3)          // the letters rush in and ease off
    .to(G, { in: 1, duration: 2.4, ease: 'sine.inOut', onUpdate: paintGlow }, 0.55);

  ScrollTrigger.create({
    trigger: card,
    start: 'top 86%',
    once: true,
    onEnter: () => arrive.play(),
  });

  const settleBase = gsap.timeline({ paused: true });
  settleBase.to('.ff-bv', { opacity: 1, y: 0, duration: 1.2, stagger: 0.08, ease: 'power3.out' });
  ScrollTrigger.create({
    trigger: '.ff-base-in',
    start: 'top 92%',
    once: true,
    onEnter: () => settleBase.play(),
  });
})();
