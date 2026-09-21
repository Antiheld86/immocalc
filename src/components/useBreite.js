import { useEffect, useRef, useState } from "react";

/**
 * Misst die Breite eines Elements. Diagramme zeichnen damit in echten Pixeln
 * statt in einem skalierten viewBox — so bleibt die Schrift auf dem Handy lesbar.
 */
export function useBreite(start = 760) {
  const ref = useRef(null);
  const [breite, setBreite] = useState(start);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const messen = () => setBreite(Math.round(el.getBoundingClientRect().width) || start);
    messen();
    if (typeof ResizeObserver === "undefined") return undefined;
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, [start]);

  return [ref, breite];
}
