"use client";

import { useState, useRef, useEffect } from "react";

/* Eases a chart's Y-axis ceiling instead of snapping it.

   Without this, dragging a return slider makes the axis jump on every frame
   and the curve appears to stay still while the scale moves underneath it.
   Small changes (under ₹1,000) skip the animation entirely — there is nothing
   to see, and animating them would leave a rAF running on every keystroke.

   Extracted from ProjectionChart so the Goal Gap chart does not start a second
   copy of the same loop. */
export function useAnimatedDomain(targetMax, duration = 400) {
  const [current, setCurrent] = useState(targetMax);
  const animRef = useRef(null);
  const prevRef = useRef(targetMax);

  useEffect(() => {
    const from = prevRef.current;
    const to = targetMax;
    if (Math.abs(from - to) < 1000) { setCurrent(to); prevRef.current = to; return; }
    const start = performance.now();
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(from + (to - from) * eased);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = to;
      }
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [targetMax, duration]);

  return current;
}

export default useAnimatedDomain;
