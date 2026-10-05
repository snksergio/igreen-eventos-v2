/* ============================================================
   Rodapé D — "Aurora viva"

   - Live loops: the haze layers are CSS animations (compositor
     thread, transform/opacity only). They run only while the footer
     is on screen and the tab is visible: .fd-live on the footer.
   - Arrival (scroll-linked, ~1 s lag): the haze rises into place and the
     statement pulls into focus — each line cross-fades from a
     pre-blurred copy (text-shadow, rasterised once) to the sharp
     text while settling up a few pixels. No filter is animated.
   - Cursor: the light layers lean toward the pointer at different
     depths and a soft lamp follows it (quickTo, transform only).
   - Clock: Goiânia time (Brasília, America/Sao_Paulo), ticking on
     the second while visible.
   ============================================================ */

(() => {
  const foot = document.querySelector('.fd-foot');
  if (!foot) return;

  const root = document.documentElement;
  const $ = (s) => foot.querySelector(s);
  const $$ = (s) => Array.from(foot.querySelectorAll(s));

  const clockT = $('.fd-clock-t');
  const lamp = $('.fd-lamp');
  const pulls = $$('.fd-pull');

  let onScreen = false;
  let motion = false;

  /* ---------- clock ---------- */

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

  /* ---------- live state: on screen and tab visible ---------- */

  const sync = () => {
    const live = onScreen && !document.hidden;
    foot.classList.toggle('fd-live', live && motion);
    if (live) startClock();
    else stopClock();
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      sync();
    }).observe(foot);
  } else {
    onScreen = true;
  }
  document.addEventListener('visibilitychange', sync);

  /* ---------- cursor: the light leans toward the pointer ---------- */

  function pointer() {
    const movers = pulls.map((el) => ({
      d: parseFloat(el.dataset.depth) || 0.03,
      x: gsap.quickTo(el, 'x', { duration: 1.6, ease: 'power3.out' }),
      y: gsap.quickTo(el, 'y', { duration: 1.6, ease: 'power3.out' }),
    }));
    const lx = gsap.quickTo(lamp, 'x', { duration: 1.1, ease: 'power3.out' });
    const ly = gsap.quickTo(lamp, 'y', { duration: 1.1, ease: 'power3.out' });
    let box = null;

    const enter = (e) => {
      box = foot.getBoundingClientRect();
      // the lamp appears where the pointer already is
      gsap.set(lamp, { x: e.clientX - box.left, y: e.clientY - box.top });
      gsap.to(lamp, { opacity: 1, duration: 1.2, ease: 'sine.out', overwrite: 'auto' });
    };
    const move = (e) => {
      if (!foot.classList.contains('fd-live')) return;
      if (!box) box = foot.getBoundingClientRect();
      const px = e.clientX - box.left;
      const py = e.clientY - box.top;
      const nx = px / box.width - 0.5;
      const ny = py / box.height - 0.5;
      movers.forEach((m) => {
        m.x(nx * box.width * m.d);
        m.y(ny * box.height * m.d * 0.6);
      });
      lx(px);
      ly(py);
    };
    const leave = () => {
      box = null;
      movers.forEach((m) => {
        m.x(0);
        m.y(0);
      });
      gsap.to(lamp, { opacity: 0, duration: 1.4, ease: 'sine.inOut', overwrite: 'auto' });
    };
    // the box moves with the page; re-read it lazily after a scroll
    const invalidate = () => {
      box = null;
    };

    foot.addEventListener('pointerenter', enter);
    foot.addEventListener('pointermove', move);
    foot.addEventListener('pointerleave', leave);
    window.addEventListener('scroll', invalidate, { passive: true });
    return () => {
      foot.removeEventListener('pointerenter', enter);
      foot.removeEventListener('pointermove', move);
      foot.removeEventListener('pointerleave', leave);
      window.removeEventListener('scroll', invalidate);
      gsap.set([...pulls, lamp], { clearProps: 'transform,opacity' });
    };
  }

  /* ---------- arrival ----------
     A tiny scrub instead of ScrollTrigger: ScrollTrigger keeps a
     requestAnimationFrame loop alive for the whole page life, which
     would make the browser service the CSS haze animations on the main
     thread every frame. Here a frame is requested only while the
     smoothed progress is still catching up with the scroll (~1 s lag),
     and no layout is read during scroll (offsets are cached). */

  function scrub(render, tau) {
    let cur = null;
    let tgt = 0;
    let raf = 0;
    let last = 0;
    const step = (t) => {
      const dt = last ? Math.min(0.1, (t - last) / 1000) : 1 / 60;
      last = t;
      cur += (tgt - cur) * (1 - Math.exp(-dt / tau));
      if (Math.abs(tgt - cur) < 0.0005) cur = tgt;
      render(cur);
      if (cur === tgt) {
        raf = 0;
        last = 0;
      } else {
        raf = requestAnimationFrame(step);
      }
    };
    return {
      to(v) {
        tgt = v;
        if (cur === null) {
          cur = v;
          render(cur);
        } else if (!raf && cur !== tgt) {
          raf = requestAnimationFrame(step);
        }
      },
      kill() {
        cancelAnimationFrame(raf);
        raf = 0;
      },
    };
  }

  function arrival() {
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const rise = $('.fd-rise');
    const statement = $('.fd-statement');

    // the haze rises with the footer: from below the frame and dim to its place
    const riseTl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
      .fromTo(rise, { yPercent: 30, opacity: 0.3 }, { yPercent: 0, opacity: 1, duration: 1 });

    // the statement pulls into focus, line by line: a pre-blurred copy
    // appears, then hands over to the sharp text as the line settles
    const lines = $$('.fd-line');
    const focusTl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    lines.forEach((line, i) => {
      const at = i * 0.28;
      const sharp = line.querySelector('.fd-sharp');
      const blur = line.querySelector('.fd-blur');
      focusTl
        .fromTo(line, { yPercent: 34 }, { yPercent: 0, duration: 1, ease: 'power2.out' }, at)
        .fromTo(blur, { opacity: 0 }, { opacity: 1, duration: 0.3 }, at)
        .fromTo(blur, { opacity: 1 }, { opacity: 0, duration: 0.55, immediateRender: false }, at + 0.42)
        .fromTo(sharp, { opacity: 0 }, { opacity: 1, duration: 0.6 }, at + 0.32);
    });

    // cached geometry (document offsets), refreshed on resize
    let G = null;
    const measure = () => {
      const y = window.scrollY;
      const f = foot.getBoundingClientRect();
      const s = statement.getBoundingClientRect();
      G = {
        vh: window.innerHeight,
        footTop: f.top + y,
        footH: f.height,
        stTop: s.top + y,
      };
    };
    const riseS = scrub((p) => riseTl.progress(p), 0.3);
    const focusS = scrub((p) => focusTl.progress(p), 0.3);
    const update = () => {
      if (!G) return;
      const y = window.scrollY;
      const { vh } = G;
      riseS.to(clamp01((y - (G.footTop - vh)) / Math.max(1, G.footH)));
      focusS.to(clamp01((y - (G.stTop - vh * 0.96)) / (vh * 0.62)));
    };
    let rt = 0;
    const onResize = () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        measure();
        update();
      }, 120);
    };
    measure();
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', onResize);

    // the rest settles in once, quietly, as it enters the screen
    const rv = $$('.fd-rv');
    gsap.set(rv, { autoAlpha: 0, y: 26 });
    let queue = [];
    let qt = 0;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        queue.push(e.target);
      });
      if (!queue.length) return;
      clearTimeout(qt);
      qt = setTimeout(() => {
        gsap.to(queue, { autoAlpha: 1, y: 0, duration: 1.4, ease: 'expo.out', stagger: 0.09 });
        queue = [];
      }, 16);
    });
    rv.forEach((el) => io.observe(el));

    return () => {
      riseS.kill();
      focusS.kill();
      io.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', onResize);
      riseTl.kill();
      focusTl.kill();
      gsap.set([...lines, ...$$('.fd-sharp'), ...$$('.fd-blur'), ...rv, rise], { clearProps: 'all' });
    };
  }

  /* ---------- modes ---------- */

  const mm = gsap.matchMedia();
  mm.add(
    {
      motion: '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
      still: '(max-width: 899px), (prefers-reduced-motion: reduce)',
    },
    (ctx) => {
      motion = !!ctx.conditions.motion;
      root.classList.toggle('fd-static', !motion);
      sync();
      if (!motion) return undefined;
      const undoArrival = arrival();
      const undoPointer = pointer();
      return () => {
        undoArrival();
        undoPointer();
      };
    }
  );
})();
