import { Directive, ElementRef, inject, input } from '@angular/core';
import { ViewTransitionInfo } from '@angular/router';
import { prefersReducedMotion } from './motion';

/**
 * The cover-art morph between a game card and the detail page.
 *
 * The detail page's cover always carries `view-transition-name: game-cover`
 * (see detail.component.scss). Clicking a card gives *that* card's cover the
 * same name just before the router starts the view transition, so the browser
 * morphs one into the other. Only one element may hold a name at a time, so
 * the previous holder is always cleared first.
 */
export const COVER_TRANSITION_NAME = 'game-cover';

let namedCover: HTMLElement | null = null;

const clearNamedCover = (): void => {
  namedCover?.style.removeProperty('view-transition-name');
  namedCover = null;
};

const supportsViewTransitions = (): boolean =>
  typeof document !== 'undefined' && 'startViewTransition' in document;

@Directive({
  selector: '[appCoverMorph]',
  host: { '(click)': 'onClick($event)' },
})
export class CoverMorphDirective {
  /** Cover to morph; defaults to the `.cover` inside the host. */
  readonly appCoverMorph = input<HTMLElement | ''>('');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected onClick(event: MouseEvent): void {
    // Modified clicks open a new tab: no transition will run here.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!supportsViewTransitions() || prefersReducedMotion()) return;
    const cover = this.appCoverMorph() || this.host.querySelector<HTMLElement>('.cover');
    if (!cover) return;
    clearNamedCover();
    cover.style.setProperty('view-transition-name', COVER_TRANSITION_NAME);
    namedCover = cover;
  }
}

/**
 * Router hook for `withViewTransitions`: query-param-only navigations (genre
 * filters) skip the page crossfade, and the card's temporary name is cleared
 * once the transition is done, whatever its outcome.
 */
export function onViewTransitionCreated({ transition, from, to }: ViewTransitionInfo): void {
  if (samePath(from, to)) {
    clearNamedCover();
    transition.skipTransition();
    return;
  }
  transition.finished.finally(clearNamedCover);
}

type Snapshot = ViewTransitionInfo['from'];

const pathOf = (snapshot: Snapshot): string => {
  const segments: string[] = [];
  for (let s: Snapshot | null = snapshot; s; s = s.firstChild) {
    segments.push(...s.url.map((u) => u.path));
  }
  return segments.join('/');
};

const samePath = (from: Snapshot, to: Snapshot): boolean => pathOf(from) === pathOf(to);
