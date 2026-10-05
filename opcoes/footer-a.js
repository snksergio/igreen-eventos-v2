/* ============================================================
   Rodapé A — "Bloco lima"  (see footer-a.css)
   1. Arrival: the statement lines rise out of their masks, the CTA
      and the info grid follow, the hairline draws across.
   2. Signature, scrubbed with the scroll: the dark sheet lifts off the
      lime band waiting at the bottom of the screen; the band opens from
      the page's bottom edge and the giant letters rise out of it one
      after another, completing exactly as the page bottoms out.
   Only transform and opacity move. Nothing runs while idle.
   ============================================================ */

(() => {
  const root = document.documentElement;
  const footer = document.querySelector('.fa-footer');
  if (!footer) return;

  const band = footer.querySelector('.fa-band');
  const upBtn = footer.querySelector('.fa-up');

  // back to top: smooth unless the reader asked for less motion
  if (upBtn) {
    upBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
    });
  }

  if (root.classList.contains('fa-static') || !window.gsap || !window.ScrollTrigger) {
    root.classList.add('fa-static');
    band.classList.add('is-done');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const sheet = footer.querySelector('.fa-close');
  const lines = footer.querySelectorAll('.fa-li');
  const cta = footer.querySelector('.fa-cta');
  const cols = footer.querySelectorAll('.fa-grid .fa-rv');
  const rule = footer.querySelector('.fa-rule');
  const spill = footer.querySelector('.fa-spill');
  const bar = footer.querySelector('.fa-bar');
  const chars = footer.querySelectorAll('.fa-ch');

  // starting states (mirror the CSS so nothing flashes; y:0 drops the
  // CSS translate that GSAP would otherwise read back as pixels)
  gsap.set(lines, { yPercent: 110, y: 0 });
  gsap.set(cta, { autoAlpha: 0, y: 24 });
  gsap.set(cols, { autoAlpha: 0, y: 26 });
  gsap.set(rule, { scaleX: 0, transformOrigin: '0% 50%' });
  gsap.set(spill, { autoAlpha: 0 });
  gsap.set(chars, { yPercent: 108, y: 0 });

  /* ---------- 1. arrival (plays once) ---------- */

  ScrollTrigger.create({
    trigger: footer.querySelector('.fa-head'),
    start: 'top 84%',
    once: true,
    onEnter: () => {
      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .to(lines, { yPercent: 0, duration: 1.5, stagger: 0.13 })
        .to(cta, { autoAlpha: 1, y: 0, duration: 1.3 }, 0.42);
    },
  });

  ScrollTrigger.create({
    trigger: footer.querySelector('.fa-grid'),
    start: 'top 92%',
    once: true,
    onEnter: () => {
      gsap.timeline()
        .to(rule, { scaleX: 1, duration: 1.8, ease: 'expo.inOut' })
        .to(cols, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.08, ease: 'power3.out' }, 0.25);
    },
  });

  /* ---------- 2. the band (scrubbed) ----------
     from the moment the sheet's lower edge reaches the bottom of the
     screen until the end of the page — exactly the band's height */

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

  /* ---------- magnetic primary CTA ---------- */

  const mag = footer.querySelector('.fa-mag');
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

  // web font metrics change the heights: re-measure once they are in
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
})();
