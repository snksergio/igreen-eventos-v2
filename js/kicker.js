/* ============================================================
   Section kickers (proposta 09·C) — see css/kicker.css
   The entrance plays once when a badge is fully on screen. Inside the
   editions' line masks the badge is shown and hidden with the heading,
   so there it replays every time the line is revealed. Hover replays.
   ============================================================ */

(() => {
  const kickers = document.querySelectorAll('.kicker3d');
  if (!kickers.length || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('kp-ready');

  const busy = (k) => k.getAnimations({ subtree: true }).some((a) => a.playState === 'running');

  // a finished CSS animation can't be restarted directly, so switch the
  // badge's animations off for one style pass and back on
  const replay = (k) => {
    if (!k.classList.contains('is-in') || busy(k)) return;
    k.classList.add('kp-reset');
    void k.offsetWidth;
    k.classList.remove('kp-reset');
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const k = e.target;
      const masked = !!k.closest('.od-m');
      if (e.intersectionRatio >= 0.9) {
        // a beat after the section's own fade-in has begun
        clearTimeout(k._kpT);
        k._kpT = setTimeout(() => k.classList.add('is-in'), masked ? 120 : 260);
        if (!masked) io.unobserve(k);
      } else if (masked && !e.isIntersecting) {
        clearTimeout(k._kpT);
        k.classList.remove('is-in');
      }
    });
  }, { threshold: [0, 0.9] });

  kickers.forEach((k) => {
    io.observe(k);
    k.addEventListener('mouseenter', () => replay(k));
  });
})();
