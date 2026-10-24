import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { canAnimate, DUR_BASE, EASE_OUT, prefersReducedMotion } from './motion';

const FLIGHT_MS = 450;
const THUMB_W = 48;
const THUMB_H = 48;
const COIN_SPRITE = 'assets/3d/coin-fly.png';

/**
 * "Added to cart" choreography: the pressed button gives a tag-press, a small
 * 3D coin arcs up to the header cart, and the header bumps its badge
 * when the copy lands (`landed$`). The arc comes from two composited layers:
 * the outer one moves along x with an ease-in, the inner one along y with an
 * ease-out, so the copy shoots up first and then sweeps sideways into the
 * cart, tracing a curve without animating any layout.
 */
@Injectable({ providedIn: 'root' })
export class CartFlightService {
  private readonly landedSubject = new Subject<void>();
  /** Fires when an add-to-cart animation is over (or right away with reduced motion). */
  readonly landed$ = this.landedSubject.asObservable();

  /** Quick squeeze-and-tilt on the button that was just pressed. */
  press(button: Element | null | undefined): void {
    if (!canAnimate(button) || prefersReducedMotion()) return;
    button.animate(
      [
        { transform: 'none' },
        { transform: 'scale(0.92) rotate(-3deg)', offset: 0.35 },
        { transform: 'none' },
      ],
      { duration: 240, easing: EASE_OUT },
    );
  }

  /**
   * Flies a coin sprite from `source` (origin position only) into the header cart.
   * Resolves when it lands; returns null when there is nothing to animate
   * (reduced motion, no cart in the header, no WAAPI) so callers can carry on
   * synchronously.
   */
  fly(source: HTMLElement | null | undefined): Promise<void> | null {
    const target = document.querySelector<HTMLElement>('[data-cart-target]');
    if (!source || !target || !canAnimate(source) || prefersReducedMotion()) {
      this.landedSubject.next();
      return null;
    }

    const from = source.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const startX = from.left + from.width / 2 - THUMB_W / 2;
    const startY = from.top + from.height / 2 - THUMB_H / 2;
    const dx = to.left + to.width / 2 - THUMB_W / 2 - startX;
    const dy = to.top + to.height / 2 - THUMB_H / 2 - startY;

    const { outer, inner } = this.buildThumb(startX, startY);
    document.body.append(outer);

    outer.animate([{ transform: 'translate3d(0, 0, 0)' }, { transform: `translate3d(${dx}px, 0, 0)` }], {
      duration: FLIGHT_MS,
      easing: 'cubic-bezier(0.55, 0, 0.8, 0.6)',
      fill: 'forwards',
    });
    const flight = inner.animate(
      [
        { transform: 'translate3d(0, 0, 0) scale(1.15)', opacity: 1 },
        { transform: `translate3d(0, ${dy * 0.8}px, 0) scale(0.8)`, opacity: 1, offset: 0.6 },
        { transform: `translate3d(0, ${dy}px, 0) scale(0.3)`, opacity: 0.3 },
      ],
      { duration: FLIGHT_MS, easing: 'cubic-bezier(0.15, 0.6, 0.35, 1)', fill: 'forwards' },
    );

    return flight.finished
      .catch(() => undefined)
      .then(() => {
        outer.remove();
        this.landedSubject.next();
      });
  }

  private buildThumb(x: number, y: number): { outer: HTMLElement; inner: HTMLElement } {
    const outer = document.createElement('div');
    outer.setAttribute('aria-hidden', 'true');
    Object.assign(outer.style, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      zIndex: '1000',
      pointerEvents: 'none',
      willChange: 'transform',
    });

    const inner = document.createElement('div');
    Object.assign(inner.style, {
      width: `${THUMB_W}px`,
      height: `${THUMB_H}px`,
      filter: 'drop-shadow(0 8px 10px rgb(0 0 0 / 55%))',
      willChange: 'transform, opacity',
    });

    const img = document.createElement('img');
    img.src = COIN_SPRITE;
    img.alt = '';
    Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'contain' });
    inner.append(img);
    outer.append(inner);
    return { outer, inner };
  }
}

/** Header-side half of the choreography: one bump (or a fade) on landing. */
export const bumpCartBadge = (cart: HTMLElement | null): void => {
  const badge = cart?.querySelector<HTMLElement>('.cart__badge') ?? cart;
  if (!canAnimate(badge)) return;
  if (prefersReducedMotion()) {
    badge.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: DUR_BASE, easing: 'linear' });
    return;
  }
  badge.animate(
    [{ transform: 'none' }, { transform: 'scale(1.4)', offset: 0.4 }, { transform: 'none' }],
    { duration: 240, easing: EASE_OUT },
  );
};
