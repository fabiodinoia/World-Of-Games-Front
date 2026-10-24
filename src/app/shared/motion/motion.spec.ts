import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, UrlSegment, ViewTransitionInfo } from '@angular/router';
import { CartFlightService } from './cart-flight.service';
import { COVER_TRANSITION_NAME, CoverMorphDirective, onViewTransitionCreated } from './cover-morph';
import { RevealService } from './reveal';

const snapshot = (...paths: string[]): ActivatedRouteSnapshot =>
  ({
    url: [],
    firstChild: { url: paths.map((p) => new UrlSegment(p, {})), firstChild: null },
  }) as unknown as ActivatedRouteSnapshot;

const fakeTransition = () => ({
  skipTransition: jasmine.createSpy('skipTransition'),
  finished: Promise.resolve(),
});

describe('motion', () => {
  describe('onViewTransitionCreated', () => {
    it('skips the page transition when only the query string changes', () => {
      const transition = fakeTransition();
      onViewTransitionCreated({
        transition,
        from: snapshot('games'),
        to: snapshot('games'),
      } as unknown as ViewTransitionInfo);
      expect(transition.skipTransition).toHaveBeenCalled();
    });

    it('keeps the transition between different pages', () => {
      const transition = fakeTransition();
      onViewTransitionCreated({
        transition,
        from: snapshot('games'),
        to: snapshot('games', 'abc'),
      } as unknown as ViewTransitionInfo);
      expect(transition.skipTransition).not.toHaveBeenCalled();
    });
  });

  describe('CoverMorphDirective', () => {
    @Component({
      imports: [CoverMorphDirective],
      template: `<a appCoverMorph (click)="$event.preventDefault()"><div class="cover"></div></a>
        <a appCoverMorph id="second" (click)="$event.preventDefault()"><div class="cover"></div></a>`,
    })
    class HostComponent {}

    it('names only the most recently clicked cover', () => {
      if (!('startViewTransition' in document) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        pending('View transitions unavailable in this browser');
        return;
      }
      const fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
      const [first, second] = fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLElement>;
      const name = (el: HTMLElement) =>
        (el.querySelector('.cover') as HTMLElement).style.getPropertyValue('view-transition-name');

      first.dispatchEvent(new MouseEvent('click', { button: 0, bubbles: true, cancelable: true }));
      expect(name(first)).toBe(COVER_TRANSITION_NAME);

      second.dispatchEvent(new MouseEvent('click', { button: 0, bubbles: true, cancelable: true }));
      expect(name(first)).toBe('');
      expect(name(second)).toBe(COVER_TRANSITION_NAME);
    });
  });

  describe('CartFlightService', () => {
    it('lands immediately and returns null when there is no header cart', () => {
      const fx = TestBed.inject(CartFlightService);
      const landed = jasmine.createSpy('landed');
      const sub = fx.landed$.subscribe(landed);
      expect(fx.fly(document.createElement('img'))).toBeNull();
      expect(landed).toHaveBeenCalledTimes(1);
      sub.unsubscribe();
    });

    it('flies the 3D coin sprite instead of a clone of the source image', async () => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        pending('Reduced motion enabled in this browser');
        return;
      }
      const target = document.createElement('div');
      target.setAttribute('data-cart-target', '');
      document.body.append(target);
      const source = document.createElement('img');
      source.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
      document.body.append(source);

      const fx = TestBed.inject(CartFlightService);
      const flight = fx.fly(source);
      const flying = document.body.querySelector<HTMLImageElement>('body > div[aria-hidden="true"] img');
      expect(flying?.getAttribute('src')).toMatch(/assets\/3d\/coin-fly\.png$/);
      expect(flying?.getAttribute('src')).not.toContain('data:image');
      await flight;
      target.remove();
      source.remove();
    });
  });

  describe('RevealService', () => {
    const nextFrames = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 50))));

    it('hides an element until it enters the viewport, then plays once per key', async () => {
      const reveals = TestBed.inject(RevealService);
      const el = document.createElement('div');
      el.style.height = '20px';
      document.body.prepend(el);

      reveals.observe(el, 'reveal-spec');
      expect(el.style.opacity).toBe('0');
      await nextFrames();
      expect(el.style.opacity).toBe('');

      // Same key again (e.g. coming back to the catalog): no hide, no replay.
      const again = document.createElement('div');
      reveals.observe(again, 'reveal-spec');
      expect(again.style.opacity).toBe('');
      el.remove();
    });
  });
});
