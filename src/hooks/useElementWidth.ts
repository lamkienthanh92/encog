import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Tracks the rendered width of an element so charts draw at real pixel size.
 * Measured in a layout effect (before paint) to avoid a first frame at the wrong width;
 * width is 0 until the element has been measured.
 */
export function useElementWidth<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState<number>(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = (): void => {
      const w = Math.floor(el.getBoundingClientRect().width);
      setWidth((prev) => (prev === w ? prev : w));
    };
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}
