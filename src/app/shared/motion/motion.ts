/**
 * Motion helpers shared by the imperative (WAAPI) effects. Durations and the
 * easing mirror the `--dur-*` / `--ease-out` tokens in styles.scss so CSS and
 * script-driven motion move the same way.
 */
export const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
export const DUR_FAST = 120;
export const DUR_BASE = 200;
export const DUR_SLOW = 420;

/** True when the visitor asked the OS for less motion (or there's no window). */
export const prefersReducedMotion = (): boolean =>
  typeof matchMedia !== 'function' ||
  matchMedia('(prefers-reduced-motion: reduce)').matches;

/** WAAPI is available on this element (missing in some test/SSR shims). */
export const canAnimate = (el: Element | null | undefined): el is HTMLElement =>
  !!el && typeof (el as HTMLElement).animate === 'function';
