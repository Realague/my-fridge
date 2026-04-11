/** Shared easing for list entrance animations */
export const motionEase = [0.25, 0.1, 0.25, 1] as const;

export function motionDuration(reduceMotion: boolean): number {
  return reduceMotion ? 0 : 0.3;
}

export const motionStagger = 0.05;

/** Viewport options: reveal as the user scrolls; `margin` triggers slightly before the row is fully visible */
export const scrollRevealViewport = {
  once: true,
  amount: 0.2,
  margin: '0px 0px -10% 0px',
} as const;

/** Fade up when the element enters the viewport (scroll) */
export function scrollRevealFadeUp(prefersReducedMotion: boolean) {
  if (prefersReducedMotion) {
    return {
      initial: false as const,
      animate: { opacity: 1, y: 0 } as const,
      transition: { duration: 0 },
    };
  }
  return {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: scrollRevealViewport,
    transition: {
      duration: motionDuration(false),
      ease: motionEase,
    },
  };
}

/** Slide in from the right when the element enters the viewport */
export function scrollRevealSlideRight(prefersReducedMotion: boolean) {
  if (prefersReducedMotion) {
    return {
      initial: false as const,
      animate: { opacity: 1, x: 0 } as const,
      transition: { duration: 0 },
    };
  }
  return {
    initial: { opacity: 0, x: 28 },
    whileInView: { opacity: 1, x: 0 },
    viewport: scrollRevealViewport,
    transition: {
      duration: motionDuration(false),
      ease: motionEase,
    },
  };
}
