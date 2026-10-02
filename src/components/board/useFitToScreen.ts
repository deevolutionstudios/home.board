import { useEffect, useLayoutEffect, useState } from "react";

export const FIT_MAX_ITEMS = 8;
export const FIT_MIN_ITEMS = 4;

/**
 * Measures the whole page after every render and shrinks the shared
 * list-item budget whenever the board would overflow the screen, so the
 * page never grows a scrollbar. Grows back only when there is generous
 * slack, so it does not oscillate.
 */
export function useFitToScreen() {
  const [budget, setBudget] = useState(FIT_MAX_ITEMS);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener("resize", bump);
    // Re-check whenever page content changes size (new parcel, list item, holiday box…)
    const ro = new ResizeObserver(bump);
    ro.observe(document.body);
    const main = document.querySelector("main");
    if (main) ro.observe(main);
    return () => {
      window.removeEventListener("resize", bump);
      ro.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const doc = document.documentElement;
    const overflow = doc.scrollHeight - window.innerHeight;
    if (overflow > 4 && budget > FIT_MIN_ITEMS) {
      setBudget((b) => Math.max(FIT_MIN_ITEMS, b - 1));
    } else if (overflow < -70 && budget < FIT_MAX_ITEMS) {
      // One spare row (~64px) is enough to grow back — fills the lists as soon as space returns.
      setBudget((b) => Math.min(FIT_MAX_ITEMS, b + 1));
    }
  }, [budget, tick]);

  return budget;
}
