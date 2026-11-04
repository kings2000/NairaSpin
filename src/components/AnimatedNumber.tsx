import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';

/** Counts smoothly from the previous value to the new one using requestAnimationFrame. */
export function AnimatedNumber({ value, duration = 600 }: { value: number; duration?: number }) {
  const reduced = useGameStore((s) => s.reducedMotion);
  const [display, setDisplay] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    if (reduced || from.current === value) {
      from.current = value;
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = Math.round(origin + (value - origin) * eased);
      from.current = v;
      setDisplay(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced]);

  return <>{display.toLocaleString()}</>;
}
