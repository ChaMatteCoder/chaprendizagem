import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function useRevealAnimations() {
  const location = useLocation();

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      document.body.classList.add('reduced-motion');
      return undefined;
    }

    document.body.classList.add('reveal-ready');

    const revealTargets = document.querySelectorAll(
      '.reveal, .reveal-up, .reveal-left, .reveal-right, .reveal-scale, .stagger',
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.14,
      },
    );

    const observeTarget = (target) => {
      if (target.classList.contains('is-visible')) {
        return;
      }

      observer.observe(target);
    };

    revealTargets.forEach(observeTarget);

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) {
            return;
          }

          if (node.matches('.reveal, .reveal-up, .reveal-left, .reveal-right, .reveal-scale, .stagger')) {
            observeTarget(node);
          }

          node
            .querySelectorAll?.('.reveal, .reveal-up, .reveal-left, .reveal-right, .reveal-scale, .stagger')
            .forEach(observeTarget);
        });
      });
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, [location.pathname, location.hash]);
}
