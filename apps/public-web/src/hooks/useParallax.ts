import { useEffect, useState } from 'react';

export function useParallax(maxOffset = 34) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let frame = 0;
    const updateOffset = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setOffset(Math.min(window.scrollY * 0.08, maxOffset));
      });
    };

    window.addEventListener('scroll', updateOffset, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateOffset);
    };
  }, [maxOffset]);

  return offset;
}
