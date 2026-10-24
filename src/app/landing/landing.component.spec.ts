import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LandingComponent } from 'src/app/landing/landing.component';
import { RepoGameService } from 'src/app/services/game/game.services.service';
import { RepoUserService } from 'src/app/services/user/user.service';
import { ScreenPoint } from 'src/app/shared/three/globe/globe-math';
import { GlobeHandle } from 'src/app/shared/three/scene-types';
import { WEBGL_SUPPORT } from 'src/app/shared/three/webgl-support';
import { Game } from 'src/app/types/types';
import { DEMO_CREDENTIALS } from 'src/app/user/login/demo-credentials';
import { createGameServiceMock, createUserServiceMock } from 'src/app/utils/mocks';

type FakeGlobe = jasmine.SpyObj<GlobeHandle> & {
  emit: (points: ScreenPoint[]) => void;
  unsubscribe: jasmine.Spy;
};

/** GlobeHandle of spies; `emit` drives the captured onProject callback. */
const createFakeGlobe = (): FakeGlobe => {
  let cb: ((points: ScreenPoint[]) => void) | null = null;
  const unsubscribe = jasmine.createSpy('unsubscribe');
  const handle = jasmine.createSpyObj<GlobeHandle>('GlobeHandle', [
    'start', 'stop', 'renderOnce', 'setPointer', 'setDrag', 'dispose', 'dragBy', 'release', 'onProject',
  ]);
  handle.onProject.and.callFake((fn) => {
    cb = fn;
    return unsubscribe;
  });
  return Object.assign(handle, { emit: (points: ScreenPoint[]) => cb?.(points), unsubscribe });
};

/** Nine front-facing points, spread out so every pin renders and takes clicks. */
const points9: ScreenPoint[] = Array.from({ length: 9 }, (_, i) => ({
  x: 40 + i * 30,
  y: 120,
  front: true,
  depth: 0.5 + i * 0.05,
}));

describe('LandingComponent', () => {
  let fixture: ComponentFixture<LandingComponent>;
  let srv: ReturnType<typeof createUserServiceMock>;
  let gameSrv: ReturnType<typeof createGameServiceMock>;
  let fakeHandle: FakeGlobe;
  let component: LandingComponent;
  let router: Router;
  let el: HTMLElement;

  const query = (sel: string) => el.querySelector<HTMLElement>(sel);

  beforeEach(async () => {
    srv = createUserServiceMock();
    gameSrv = createGameServiceMock();
    fakeHandle = createFakeGlobe();
    await TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [
        provideRouter([]),
        { provide: RepoUserService, useValue: srv },
        { provide: RepoGameService, useValue: gameSrv },
        { provide: WEBGL_SUPPORT, useValue: () => false },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  it('renders the title and the two calls to action', () => {
    expect(query('h1')?.textContent).toContain('World of Games');
    expect(query('[data-testid="landing-login"]')?.getAttribute('href')).toBe('/login');
    expect(query('[data-testid="landing-demo"]')).not.toBeNull();
    expect(query('[data-testid="landing-guest"]')).toBeNull();
  });

  it('renders the globe host beside the hero copy with its poster', () => {
    const host = query('.landing__globe app-three-host');
    expect(host).not.toBeNull();
    expect(host?.getAttribute('aria-label')).toBe('Spinning globe of the most wanted games by city');
    expect(query('.landing__globe img')?.getAttribute('src')).toContain('assets/3d/globe-poster.webp');
    expect(query('.landing__panel h1')).not.toBeNull(); // hero copy untouched
  });

  it('shows no pins until the globe scene is ready (poster / no-WebGL path)', () => {
    expect(query('app-globe-pins')).toBeNull();
  });

  it('does not fetch the catalog before the globe is ready', () => {
    expect(gameSrv.loadAllGames).not.toHaveBeenCalled();
  });

  it('resolves pin links once the globe is ready', () => {
    gameSrv.loadAllGames.and.returnValue(of([{ id: 'g9', gameName: 'FIFA 23' } as Game]));
    component['onGlobeReady'](fakeHandle);
    fixture.detectChanges();
    expect(gameSrv.loadAllGames).toHaveBeenCalledTimes(1);
    expect(component['links']().find((l) => l.city === 'Madrid')?.href).toBe('/games/g9');
  });

  it('reuses the cached catalog instead of fetching it again', () => {
    gameSrv.games$.next([{ id: 'g9', gameName: 'FIFA 23' } as Game]);
    component['onGlobeReady'](fakeHandle);
    expect(gameSrv.loadAllGames).not.toHaveBeenCalled();
    expect(component['links']().find((l) => l.city === 'Madrid')?.href).toBe('/games/g9');
  });

  it('keeps catalog fallback links when the catalog fails', () => {
    gameSrv.loadAllGames.and.returnValue(throwError(() => new Error('cold backend')));
    component['onGlobeReady'](fakeHandle);
    expect(component['links']().every((l) => l.href === '/games')).toBeTrue();
  });

  it('feeds projected points to the pin layer', () => {
    component['onGlobeReady'](fakeHandle);
    fakeHandle.emit(points9);
    fixture.detectChanges();
    expect(el.querySelectorAll('.landing__globe app-globe-pins a').length).toBe(9);
  });

  describe('drag', () => {
    /** `buttons` defaults to "primary held" for down/move, none for up/cancel (like a real mouse). */
    const pointer = (type: string, x: number, y = 100, buttons = /down|move/.test(type) ? 1 : 0) =>
      new PointerEvent(type, {
        bubbles: true, cancelable: true, button: 0, buttons, pointerId: 1, clientX: x, clientY: y,
      });
    const click = () => new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });

    let wrapper: HTMLElement;
    let pin: HTMLAnchorElement;

    beforeEach(() => {
      component['onGlobeReady'](fakeHandle);
      fakeHandle.emit(points9);
      fixture.detectChanges();
      wrapper = query('.landing__globe')!;
      pin = el.querySelector<HTMLAnchorElement>('app-globe-pins a')!;
    });

    it('a click that ends a drag does not navigate; a still tap does', () => {
      spyOn(wrapper, 'setPointerCapture');
      wrapper.dispatchEvent(pointer('pointerdown', 100));
      wrapper.dispatchEvent(pointer('pointermove', 120));
      wrapper.dispatchEvent(pointer('pointerup', 120));
      const dragClick = click();
      pin.dispatchEvent(dragClick);
      expect(fakeHandle.dragBy).toHaveBeenCalledWith(20, 0);
      expect(wrapper.setPointerCapture).toHaveBeenCalledTimes(1);
      expect(fakeHandle.release).toHaveBeenCalled();
      expect(dragClick.defaultPrevented).toBeTrue();
      expect(router.navigateByUrl).not.toHaveBeenCalled();

      wrapper.dispatchEvent(pointer('pointerdown', 100));
      wrapper.dispatchEvent(pointer('pointermove', 103));
      // Capture would retarget the real click to the wrapper, so a still tap must never take it.
      expect(wrapper.setPointerCapture).toHaveBeenCalledTimes(1);
      expect(wrapper).not.toHaveClass('landing__globe--dragging');
      wrapper.dispatchEvent(pointer('pointerup', 103));
      pin.dispatchEvent(click());
      // RouterLink itself prevents the native default on a tap; it navigating proves the click got through.
      expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
    });

    it('takes pointer capture and the grabbing cursor only after the drag threshold', () => {
      spyOn(wrapper, 'setPointerCapture');
      wrapper.dispatchEvent(pointer('pointerdown', 100));
      fixture.detectChanges();
      expect(wrapper.setPointerCapture).not.toHaveBeenCalled();
      expect(wrapper).not.toHaveClass('landing__globe--dragging');
      wrapper.dispatchEvent(pointer('pointermove', 104));
      fixture.detectChanges();
      expect(wrapper.setPointerCapture).not.toHaveBeenCalled();
      wrapper.dispatchEvent(pointer('pointermove', 110));
      wrapper.dispatchEvent(pointer('pointermove', 130));
      fixture.detectChanges();
      expect(wrapper.setPointerCapture).toHaveBeenCalledOnceWith(1);
      expect(wrapper).toHaveClass('landing__globe--dragging');
      wrapper.dispatchEvent(pointer('pointerup', 130));
      fixture.detectChanges();
      expect(wrapper).not.toHaveClass('landing__globe--dragging');
    });

    it('ignores moves without a primary pointerdown', () => {
      wrapper.dispatchEvent(pointer('pointermove', 140));
      expect(fakeHandle.dragBy).not.toHaveBeenCalled();
    });

    it('releases the globe when the pointer is cancelled', () => {
      wrapper.dispatchEvent(pointer('pointerdown', 100));
      wrapper.dispatchEvent(pointer('pointercancel', 100));
      expect(fakeHandle.release).toHaveBeenCalled();
    });

    it('a cancelled drag leaves no click to swallow', () => {
      wrapper.dispatchEvent(pointer('pointerdown', 100));
      wrapper.dispatchEvent(pointer('pointermove', 130));
      wrapper.dispatchEvent(pointer('pointercancel', 130));
      pin.dispatchEvent(click()); // e.g. keyboard Enter: no pointerdown resets the flag
      expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
    });

    it('ends a press released outside the globe on the next buttonless move (no hover rotation)', () => {
      wrapper.dispatchEvent(pointer('pointerdown', 100));
      wrapper.dispatchEvent(pointer('pointermove', 104)); // under the threshold: no capture yet
      // pointerup happened outside the window: the wrapper never saw it.
      wrapper.dispatchEvent(pointer('pointermove', 120, 100, 0));
      wrapper.dispatchEvent(pointer('pointermove', 160, 100, 0));
      fixture.detectChanges();
      expect(fakeHandle.dragBy).toHaveBeenCalledOnceWith(4, 0);
      expect(fakeHandle.release).toHaveBeenCalledTimes(1);
      expect(wrapper).not.toHaveClass('landing__globe--dragging');
      pin.dispatchEvent(click());
      expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
    });

    it('ends a press released elsewhere in the page via the window pointerup', () => {
      wrapper.dispatchEvent(pointer('pointerdown', 100));
      wrapper.dispatchEvent(pointer('pointermove', 104));
      window.dispatchEvent(pointer('pointerup', 300));
      expect(fakeHandle.release).toHaveBeenCalledTimes(1);
      wrapper.dispatchEvent(pointer('pointermove', 140, 100, 0));
      expect(fakeHandle.dragBy).toHaveBeenCalledTimes(1);
    });

    it('ends the drag when the window loses focus mid-press', () => {
      wrapper.dispatchEvent(pointer('pointerdown', 100));
      wrapper.dispatchEvent(pointer('pointermove', 130));
      fixture.detectChanges();
      expect(wrapper).toHaveClass('landing__globe--dragging');
      window.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      expect(fakeHandle.release).toHaveBeenCalledTimes(1);
      expect(wrapper).not.toHaveClass('landing__globe--dragging');
      pin.dispatchEvent(click());
      expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
    });
  });

  describe('spin pause on hover / focus', () => {
    let pins: HTMLAnchorElement[];

    beforeEach(() => {
      component['onGlobeReady'](fakeHandle);
      fakeHandle.emit(points9);
      fixture.detectChanges();
      // Pin the gates the IntersectionObserver / media query would set.
      component['inView'] = true;
      component['reduced'] = false;
      pins = Array.from(el.querySelectorAll<HTMLAnchorElement>('app-globe-pins a'));
      // Synthetic focusin never matches :focus-visible; treat it as keyboard focus unless a test says otherwise.
      spyOn<any>(component, 'isKeyboardFocus').and.returnValue(true);
      fakeHandle.start.calls.reset();
      fakeHandle.stop.calls.reset();
    });

    const focusIn = (target: Element) => target.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    const focusOut = (target: Element, relatedTarget: Element | null = null) =>
      target.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget }));

    it('stops the spin while a pin is hovered and resumes on leave', () => {
      pins[0].dispatchEvent(new MouseEvent('mouseenter'));
      expect(fakeHandle.stop).toHaveBeenCalledTimes(1);
      expect(fakeHandle.start).not.toHaveBeenCalled();
      pins[0].dispatchEvent(new MouseEvent('mouseleave'));
      expect(fakeHandle.start).toHaveBeenCalledTimes(1);
    });

    it('stops the spin while anything in the overlay has focus', () => {
      focusIn(pins[0]);
      expect(fakeHandle.stop).toHaveBeenCalledTimes(1);
      focusOut(pins[0], pins[1]); // Tab to the next pin: still paused
      focusIn(pins[1]);
      expect(fakeHandle.start).not.toHaveBeenCalled();
      focusOut(pins[1], query('[data-testid="landing-login"]'));
      expect(fakeHandle.start).toHaveBeenCalledTimes(1);
    });

    it('stays paused while focused even after the pointer leaves a pin', () => {
      focusIn(pins[0]);
      pins[0].dispatchEvent(new MouseEvent('mouseenter'));
      pins[0].dispatchEvent(new MouseEvent('mouseleave'));
      expect(fakeHandle.start).not.toHaveBeenCalled();
    });

    it('does not resume while the hero is offscreen', () => {
      pins[0].dispatchEvent(new MouseEvent('mouseenter'));
      component['inView'] = false;
      pins[0].dispatchEvent(new MouseEvent('mouseleave'));
      focusIn(pins[0]);
      focusOut(pins[0]);
      expect(fakeHandle.start).not.toHaveBeenCalled();
    });

    it('does not resume under reduced motion', () => {
      component['reduced'] = true;
      pins[0].dispatchEvent(new MouseEvent('mouseenter'));
      pins[0].dispatchEvent(new MouseEvent('mouseleave'));
      expect(fakeHandle.start).not.toHaveBeenCalled();
    });

    it('mouse focus from pressing a pin does not pause the spin', () => {
      (component['isKeyboardFocus'] as jasmine.Spy).and.returnValue(false);
      pins[0].dispatchEvent(new MouseEvent('mouseenter'));
      focusIn(pins[0]); // Chrome focuses the link on mousedown
      pins[0].dispatchEvent(new MouseEvent('mouseleave'));
      expect(fakeHandle.start).toHaveBeenCalled();
      expect(component['focusedPin']).toBeNull();
    });

    it('drops the hover pause when a drag turns the hovered pin to the back', () => {
      pins[0].dispatchEvent(new MouseEvent('mouseenter'));
      expect(fakeHandle.start).not.toHaveBeenCalled();
      fakeHandle.emit(points9.map((p, i) => (i === 0 ? { ...p, front: false } : p)));
      expect(fakeHandle.start).toHaveBeenCalledTimes(1);
    });

    it('drops the focus pause when a drag turns the focused pin to the back', () => {
      focusIn(pins[2]);
      fakeHandle.emit(points9); // still front: stays paused
      expect(fakeHandle.start).not.toHaveBeenCalled();
      fakeHandle.emit(points9.map((p, i) => (i === 2 ? { ...p, front: false } : p)));
      expect(fakeHandle.start).toHaveBeenCalledTimes(1);
      expect(component['focusedPin']).toBeNull();
    });

    describe('tab return', () => {
      /** Stands in for ThreeHostComponent's handler: registered later, starts unconditionally. */
      const hostRestart = () => fakeHandle.start();
      let order: string[];

      beforeEach(() => {
        jasmine.clock().install();
        order = [];
        fakeHandle.start.and.callFake(() => void order.push('start'));
        fakeHandle.stop.and.callFake(() => void order.push('stop'));
        document.addEventListener('visibilitychange', hostRestart);
        spyOnProperty(Document.prototype, 'hidden').and.returnValue(false);
      });

      afterEach(() => {
        document.removeEventListener('visibilitychange', hostRestart);
        jasmine.clock().uninstall();
      });

      it('stays paused while a pin is hovered, even after the host restarts the loop', () => {
        pins[0].dispatchEvent(new MouseEvent('mouseenter'));
        order.length = 0;
        document.dispatchEvent(new Event('visibilitychange'));
        expect(order).toEqual(['start']); // the host's restart ran; our re-sync is deferred
        jasmine.clock().tick(0);
        expect(order).toEqual(['start', 'stop']);
      });

      it('stays stopped while the hero is offscreen', () => {
        component['inView'] = false;
        document.dispatchEvent(new Event('visibilitychange'));
        jasmine.clock().tick(0);
        expect(order.at(-1)).toBe('stop');
      });
    });
  });

  it('stops and disposes cleanly when leaving mid-load', () => {
    component['onGlobeReady'](fakeHandle);
    fixture.destroy();
    expect(fakeHandle.unsubscribe).toHaveBeenCalled(); // onProject's returned fn
  });

  it('logs in with the demo account and navigates to /home', () => {
    query('[data-testid="landing-demo"]')?.click();
    expect(srv.loginUser).toHaveBeenCalledWith(DEMO_CREDENTIALS);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
  });

  it('shows an error and keeps the CTAs when demo sign-in fails', () => {
    srv.loginUser.and.returnValue(throwError(() => new Error('down')));
    query('[data-testid="landing-demo"]')?.click();
    fixture.detectChanges();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(query('[role="alert"]')?.textContent).toContain('Demo sign-in failed');
    expect(query('[data-testid="landing-login"]')).not.toBeNull();
    expect(query('[data-testid="landing-demo"]')).not.toBeNull();
    expect(query('[data-testid="landing-guest"]')).toBeNull();
  });
});
