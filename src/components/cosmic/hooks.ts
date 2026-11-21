import { useEffect, useRef, useState } from "react";

/** Normalized pointer (-1..1) tracked on window, so the canvas can stay pointer-events: none. */
export function usePointer() {
  const p = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      p.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      p.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const orient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      p.current.x = Math.max(-1, Math.min(1, e.gamma / 30));
      p.current.y = Math.max(-1, Math.min(1, (45 - e.beta) / 30));
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("deviceorientation", orient, { passive: true });
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("deviceorientation", orient); };
  }, []);
  return p;
}

function useMedia(q: string) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(q);
    setM(mq.matches);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}

export const useReducedMotion = () => useMedia("(prefers-reduced-motion: reduce)");
export const useIsSmallScreen = () => useMedia("(max-width: 768px)");
