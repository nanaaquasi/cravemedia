import { useEffect, useState, RefObject } from "react";

export function useCanScroll(ref: RefObject<HTMLElement | null>) {
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const checkScroll = () => {
      // 1px leniency to account for sub-pixel rendering differences
      setCanScroll(el.scrollWidth > el.clientWidth + 1);
    };

    checkScroll();

    const observer = new ResizeObserver(() => checkScroll());
    observer.observe(el);

    return () => observer.disconnect();
  }, [ref]);

  return canScroll;
}
