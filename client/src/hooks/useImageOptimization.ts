import { useEffect, useRef } from 'react';

export function useImageOptimization() {
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    // Intersection Observer for lazy loading
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      }, {
        rootMargin: '50px',
      });

      imageRefs.current.forEach((img) => {
        if (img) imageObserver.observe(img);
      });

      return () => {
        imageRefs.current.forEach((img) => {
          if (img) imageObserver.unobserve(img);
        });
      };
    }
  }, []);

  return imageRefs;
}
