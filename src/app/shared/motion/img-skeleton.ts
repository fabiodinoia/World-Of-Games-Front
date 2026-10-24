import { Directive, signal } from '@angular/core';

/** Loads faster than this count as cached: they appear at once, without the fade-in. */
const CACHED_MS = 100;

/**
 * Shimmer placeholder for an image until it has loaded, then a short fade-in.
 * Styles live in styles.scss (`.img-loading`, `.img-fade-in`); a failed image just
 * drops the shimmer so the container's own background shows.
 */
@Directive({
  selector: 'img[appImgSkeleton]',
  host: {
    '[class.img-loading]': 'state() === "loading"',
    '[class.img-fade-in]': 'state() === "faded"',
    '(load)': 'done(true)',
    '(error)': 'done(false)',
  },
})
export class ImgSkeletonDirective {
  protected readonly state = signal<'loading' | 'shown' | 'faded'>('loading');
  private readonly start = performance.now();

  protected done(ok: boolean): void {
    if (this.state() !== 'loading') return;
    const slow = performance.now() - this.start > CACHED_MS;
    this.state.set(ok && slow ? 'faded' : 'shown');
  }
}
