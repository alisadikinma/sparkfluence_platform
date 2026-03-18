import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';

// Routes wrapped by ChatLayout use <main overflow-y-auto> as scroll container.
// Lenis hijacks wheel events at document level targeting <html>/<body>, which
// breaks scroll in ChatLayout because <html> has h-screen overflow-hidden.
// Disable Lenis for ALL ChatLayout routes.
const LENIS_DISABLED_PATTERNS = [
  /^\/script-gen/,
  /^\/creator-lab/,
  /^\/ad-studio/,
  /^\/carousel-images/,
  /^\/dashboard/,
  /^\/planner/,
  /^\/gallery/,
  /^\/history/,
  /^\/settings/,
  /^\/billing/,
  /^\/app\/billing/,
];

export const useSmoothScroll = () => {
  const location = useLocation();
  const isDisabledRoute = LENIS_DISABLED_PATTERNS.some(p => p.test(location.pathname));

  useEffect(() => {
    // Skip Lenis on routes with nested scroll containers
    if (isDisabledRoute) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    // Add lenis class to html element
    document.documentElement.classList.add('lenis');

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      document.documentElement.classList.remove('lenis');
    };
  }, [isDisabledRoute]);
};
