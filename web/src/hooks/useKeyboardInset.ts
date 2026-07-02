import { useEffect, useState } from "react";

/**
 * Height (px) of the on-screen keyboard overlapping the layout viewport, via the
 * VisualViewport API.
 *
 * Bottom-sheet modals are `position: fixed`, and iOS Safari does NOT scroll fixed
 * elements out of the keyboard's way — so a docked sheet ends up hidden behind
 * the keyboard. We read the overlap here and pad the overlay by this amount to
 * lift the sheet above the keyboard. Returns 0 on desktop, when the keyboard is
 * closed, or when the API is unavailable.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const overlap = window.innerHeight - vv.height - vv.offsetTop;
      setInset(overlap > 1 ? overlap : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
