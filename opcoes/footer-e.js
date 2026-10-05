/* ============================================================
   Rodapé E — "Gaveta" (see footer-e.css)
   The room is fixed under the page. A spacer after the sheet gives the
   scroll distance of the lift; its height comes from the room's real
   height minus the strip of sheet that stays in view at the very end.
   One scrubbed timeline over that distance:
     sheet  — recedes (scale, from its bottom edge), dims, casts a shadow
     room   — the light comes on, the content settles downward a touch
              (counter to the sheet going up) and the giant word rises
              from behind the floor.
   Only transform and opacity change per frame.
   ============================================================ */

(() => {
  const html = document.documentElement;
  const sheet = document.querySelector('.fe-sheet');
  const room = document.querySelector('.fe-room');
  const spacer = document.querySelector('.fe-spacer');
  if (!sheet || !room || !spacer) return;

  const roomIn = room.querySelector('.fe-room-in');
  const markBox = room.querySelector('.fe-mark');
  const mark = room.querySelector('.fe-mark-t');
  const kicker = room.querySelector('.fe-kicker');

  const CUT = 0.2; // share of the word's em hidden under the floor (keep in sync with the visible ratio below)

  // the giant word fills the content column; in the fixed room it may not
  // climb into the bar above it, so it is also capped by the free height
  function fitMark(live) {
    mark.style.setProperty('--fe-mark-size', '100px');
    const w = mark.getBoundingClientRect().width;
    let size = (100 * markBox.clientWidth) / w;
    if (live) {
      const free = room.clientHeight - (roomIn.offsetTop + roomIn.offsetHeight) - 28;
      size = Math.min(size, free / (0.74 - CUT + 0.02));
    }
    mark.style.setProperty('--fe-mark-size', Math.max(size, 80).toFixed(2) + 'px');
  }

  const noScroll = !window.gsap || !window.ScrollTrigger;
  if (noScroll) {
    fitMark(false);
    if (document.fonts) document.fonts.ready.then(() => fitMark(false));
    addEventListener('resize', () => fitMark(false));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  const mm = gsap.matchMedia();

  mm.add(
    {
      live: '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
      calm: '(max-width: 899px), (prefers-reduced-motion: reduce)',
    },
    (ctx) => {
      if (ctx.conditions.calm) {
        fitMark(false);
        const onR = () => fitMark(false);
        if (document.fonts) document.fonts.ready.then(onR);
        addEventListener('resize', onR);
        return () => removeEventListener('resize', onR);
      }

      html.classList.add('fe-live', 'kp-ready');

      const shadow = sheet.querySelector('.fe-sheet-shadow');
      const sheetDim = sheet.querySelector('.fe-sheet-dim');
      const roomDim = room.querySelector('.fe-room-dim');
      const lines = room.querySelectorAll('.fe-line-in');
      const side = room.querySelector('.fe-side');

      // real sizes, measured before every ScrollTrigger refresh
      const layout = () => {
        const lip = Math.min(40, Math.max(22, innerHeight * 0.032));
        spacer.style.height = Math.round(room.offsetHeight - lip) + 'px';
        fitMark(true);
      };
      layout();
      ScrollTrigger.addEventListener('refreshInit', layout);

      // the room is only painted from just before the lift begins
      ScrollTrigger.create({
        trigger: spacer,
        start: 'top bottom+=240',
        end: 'bottom top',
        toggleClass: { targets: html, className: 'fe-room-on' },
      });

      let kickOn = false;
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: spacer,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: 0.9,
          invalidateOnRefresh: true,
          onUpdate(self) {
            const p = self.progress;
            html.classList.toggle('fe-nav-off', p > 0.5);
            // the badge plays once the top of the room is in the light;
            // it re-arms when the sheet comes back down over it
            if (!kickOn && p > 0.74) { kickOn = true; kicker.classList.add('is-in'); }
            else if (kickOn && p < 0.18) { kickOn = false; kicker.classList.remove('is-in'); }
          },
        },
      });

      tl
        // the sheet
        .to(sheet, { scale: 0.94, duration: 0.55, ease: 'power2.out' }, 0)
        .to(shadow, { opacity: 1, duration: 0.22, ease: 'power1.out' }, 0)
        .to(sheetDim, { opacity: 0.62, duration: 0.85, ease: 'power1.in' }, 0)
        // the room
        .fromTo(roomDim, { opacity: 0.9 }, { opacity: 0, duration: 0.78, ease: 'power1.out' }, 0)
        .fromTo(roomIn, { y: () => -innerHeight * 0.075 }, { y: 0, duration: 1, ease: 'power2.out' }, 0)
        .fromTo(mark, { yPercent: 42 }, { yPercent: 0, duration: 0.8, ease: 'power3.out' }, 0)
        .fromTo(lines, { y: 44 }, { y: 0, duration: 0.5, stagger: 0.07, ease: 'power2.out' }, 0.44)
        .fromTo(side, { y: 26 }, { y: 0, duration: 0.5, ease: 'power2.out' }, 0.5);

      // fonts change the room's height: measure again once they are in
      if (document.fonts && document.fonts.status !== 'loaded') {
        document.fonts.ready.then(() => ScrollTrigger.refresh());
      }

      // magnetic CTA: the pill leans toward the pointer
      const cta = room.querySelector('.fe-cta');
      const qx = gsap.quickTo(cta, 'x', { duration: 0.7, ease: 'power3.out' });
      const qy = gsap.quickTo(cta, 'y', { duration: 0.7, ease: 'power3.out' });
      const lean = gsap.utils.clamp(-7, 7);
      const onMove = (e) => {
        const r = cta.getBoundingClientRect();
        qx(lean((e.clientX - (r.left + r.width / 2)) * 0.1));
        qy(lean((e.clientY - (r.top + r.height / 2)) * 0.22));
      };
      const onLeave = () => { qx(0); qy(0); };
      cta.addEventListener('pointermove', onMove);
      cta.addEventListener('pointerleave', onLeave);

      return () => {
        ScrollTrigger.removeEventListener('refreshInit', layout);
        cta.removeEventListener('pointermove', onMove);
        cta.removeEventListener('pointerleave', onLeave);
        html.classList.remove('fe-live', 'fe-room-on', 'fe-nav-off', 'kp-ready');
        kicker.classList.remove('is-in');
        spacer.style.height = '';
        gsap.set([cta], { clearProps: 'transform' });
        fitMark(false);
      };
    }
  );
})();
