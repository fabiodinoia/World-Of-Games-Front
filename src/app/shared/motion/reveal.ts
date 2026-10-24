import {
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  Injectable,
  input,
  OnInit,
} from '@angular/core';
import { canAnimate, DUR_SLOW, EASE_OUT, prefersReducedMotion } from './motion';

/** Delay between items that enter the viewport together (a row). */
const STAGGER_MS = 45;
/** Cap so a tall batch never waits more than ~0.35s for its last item. */
const MAX_STAGGER_STEPS = 8;

/**
 * One shared IntersectionObserver for every reveal on the page. Each element
 * animates once; elements with a key are remembered for the rest of the
 * session, so going back to the catalog doesn't replay the whole wall.
 */
@Injectable({ providedIn: 'root' })
export class RevealService {
  private readonly seen = new Set<string>();
  private readonly keys = new WeakMap<Element, string>();
  private observer?: IntersectionObserver;

  /** Hides `el` until it scrolls into view. No-op without IntersectionObserver. */
  observe(el: HTMLElement, key: string): void {
    if (key && this.seen.has(key)) return;
    if (typeof IntersectionObserver !== 'function' || !canAnimate(el)) return;
    this.observer ??= new IntersectionObserver((entries) => this.onIntersect(entries), {
      rootMargin: '0px 0px -6% 0px',
      threshold: 0.1,
    });
    el.style.opacity = '0';
    if (key) this.keys.set(el, key);
    this.observer.observe(el);
  }

  unobserve(el: HTMLElement): void {
    this.observer?.unobserve(el);
  }

  private onIntersect(entries: IntersectionObserverEntry[]): void {
    const reduced = prefersReducedMotion();
    const entering = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
    entering.forEach((el, i) => {
      this.observer?.unobserve(el);
      const key = this.keys.get(el);
      if (key) this.seen.add(key);
      el.style.removeProperty('opacity');
      const delay = Math.min(i, MAX_STAGGER_STEPS) * STAGGER_MS;
      el.animate(
        reduced
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, transform: 'translate3d(0, 18px, 0)' },
              { opacity: 1, transform: 'none' },
            ],
        {
          duration: reduced ? 240 : DUR_SLOW,
          delay: reduced ? 0 : delay,
          easing: EASE_OUT,
          fill: 'backwards',
        },
      );
    });
  }
}

/**
 * Rise-and-fade the host the first time it enters the viewport.
 * Optional value: a session key (e.g. the game id) so it only plays once.
 */
@Directive({ selector: '[appReveal]' })
export class RevealDirective implements OnInit {
  readonly appReveal = input<string>('');

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly reveals = inject(RevealService);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.reveals.unobserve(this.el));
  }

  ngOnInit(): void {
    this.reveals.observe(this.el, this.appReveal());
  }
}
