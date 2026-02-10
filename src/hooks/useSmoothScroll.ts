import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';

// Routes that use their own nested scroll containers (overflow-y-auto)
// Lenis hijacks wheel events at document level, breaking scroll in these layouts
const LENIS_DISABLED_PATTERNS = [
  /^\/script-gen\/[^/]+/,   // Workspace routes
  /^\/creator-lab\/[^/]+/,
  /^\/ad-studio\/[^/]+/,
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

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Add lenis class to html element
    document.documentElement.classList.add('lenis');

    return () => {
      lenis.destroy();
      document.documentElement.classList.remove('lenis');
    };
  }, [isDisabledRoute]);
};
