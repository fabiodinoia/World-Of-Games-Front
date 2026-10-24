import {
  AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnDestroy,
  inject, signal, viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of, switchMap, take } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { GlobePinsComponent } from 'src/app/landing/globe-pins/globe-pins.component';
import { RepoGameService } from 'src/app/services/game/game.services.service';
import { RepoUserService } from 'src/app/services/user/user.service';
import { prefersReducedMotion } from 'src/app/shared/motion/motion';
import { RevealDirective } from 'src/app/shared/motion/reveal';
import { ScreenPoint } from 'src/app/shared/three/globe/globe-math';
import { GLOBE_PINS, PinLink, resolvePinLinks } from 'src/app/shared/three/globe/globe-pins';
import { GlobeHandle, SceneFactory, SceneHandle } from 'src/app/shared/three/scene-types';
import { ThreeHostComponent } from 'src/app/shared/three/three-host.component';
import { DEMO_CREDENTIALS } from 'src/app/user/login/demo-credentials';

/** Total pointer travel (px) after which a press counts as a drag, not a tap. */
const DRAG_THRESHOLD_PX = 6;

@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RevealDirective, ThreeHostComponent, GlobePinsComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  protected isSubmitting = signal(false);
  protected isError = signal(false);

  /** Lazy chunk: three.js and the globe scene load only after the hero has rendered. */
  protected readonly loadGlobe = (): Promise<SceneFactory> =>
    import('src/app/shared/three/globe/globe.scene').then(
      (m) => (canvas: HTMLCanvasElement) => m.createGlobeScene(canvas, 'assets/3d/earth-globe.jpg'),
    );
  /** Set once the scene is live; pins and drag stay off until then (poster / no-WebGL path). */
  protected readonly globe = signal<GlobeHandle | null>(null);
  protected readonly points = signal<ScreenPoint[]>([]);
  /** Hardcoded pins link to the catalog until the game ids are resolved by name. */
  protected readonly links = signal<PinLink[]>(resolvePinLinks(GLOBE_PINS, []));
  protected readonly isDragging = signal(false);

  private userSrv = inject(RepoUserService);
  private gameSrv = inject(RepoGameService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private globeEl = viewChild.required<ElementRef<HTMLElement>>('globeEl');

  private unsubscribeProject: (() => void) | null = null;
  private observer: IntersectionObserver | null = null;
  private drag: {
    pointerId: number;
    lastX: number;
    lastY: number;
    startX: number;
    startY: number;
  } | null = null;
  private dragged = false;
  /** Spin gates: the idle spin runs only in view, without reduced motion, and while no pin is
   *  hovered and nothing in the globe overlay has focus (so pins hold still under the user). */
  private inView = true; // no IntersectionObserver: assume visible
  private reduced = false;
  /** Index of the hovered pin, if any. */
  private hoveredPin: number | null = null;
  /** Pin holding keyboard focus, if any (mouse focus from a press doesn't pause). */
  private focusedPin: HTMLElement | null = null;
  private resyncTimer: ReturnType<typeof setTimeout> | undefined;

  /** A press released outside the globe (no capture yet) never reaches onDragEnd: end it here. */
  private readonly onWindowPointerUp = (): void => this.abortDrag();
  /** Window lost focus mid-press (alt-tab, dialog): no pointerup will follow. */
  private readonly onWindowBlur = (): void => this.abortDrag();
  /**
   * ThreeHostComponent restarts the loop unconditionally when the tab returns, and its listener is
   * registered after ours (after the async scene load), so it runs later in the same dispatch.
   * Re-apply the pause gates on a macrotask: a microtask would still run between the two listeners.
   */
  private readonly onVisibility = (): void => {
    if (document.hidden) return;
    clearTimeout(this.resyncTimer);
    this.resyncTimer = setTimeout(() => this.syncSpin(), 0);
  };

  /** Capture phase: swallow the click that ends a drag before any pin link sees it. */
  private readonly onClickCapture = (ev: MouseEvent): void => {
    if (!this.dragged) return;
    ev.preventDefault();
    ev.stopPropagation();
    this.dragged = false;
  };

  ngAfterViewInit(): void {
    this.globeEl().nativeElement.addEventListener('click', this.onClickCapture, true);
    window.addEventListener('pointerup', this.onWindowPointerUp);
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  loginAsDemo(): void {
    this.isSubmitting.set(true);
    this.isError.set(false);
    this.userSrv.loginUser(DEMO_CREDENTIALS).subscribe({
      next: () => this.router.navigateByUrl('/home'),
      error: () => {
        this.isSubmitting.set(false);
        this.isError.set(true);
      },
    });
  }

  protected onGlobeReady(h: SceneHandle): void {
    if (this.globe()) return;
    const handle = h as GlobeHandle; // the globe loader only ever builds a GlobeHandle
    this.globe.set(handle);
    // onProject replays the last frame, so a reduced-motion single render still yields pins.
    this.unsubscribeProject = handle.onProject((pts) => {
      this.points.set(pts);
      this.dropBackFacingPause(pts);
    });
    this.reduced = prefersReducedMotion();
    this.observeVisibility();
    // Reuse the catalog snapshot if another page already loaded it; fetch only when it's empty.
    this.gameSrv.games$
      .pipe(
        take(1),
        switchMap((cached) => (cached.length ? of(cached) : this.gameSrv.loadAllGames())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (games) => this.links.set(resolvePinLinks(GLOBE_PINS, games)),
        error: () => undefined, // cold/slow backend: pins keep linking to /games
      });
  }

  protected onDragStart(ev: PointerEvent): void {
    this.dragged = false; // a drag that ended off any link leaves no click behind
    if (ev.button !== 0 || !this.globe()) return;
    this.drag = {
      pointerId: ev.pointerId,
      lastX: ev.clientX,
      lastY: ev.clientY,
      startX: ev.clientX,
      startY: ev.clientY,
    };
  }

  protected onDragMove(ev: PointerEvent): void {
    const handle = this.globe();
    if (!this.drag || !handle) return;
    // No button held: the release happened where we couldn't see it (outside the globe before
    // capture, or outside the window). End the drag instead of rotating on plain hover.
    if (ev.buttons === 0) {
      this.abortDrag();
      return;
    }
    const dx = ev.clientX - this.drag.lastX;
    const dy = ev.clientY - this.drag.lastY;
    if (dx === 0 && dy === 0) return;
    handle.dragBy(dx, dy);
    this.drag.lastX = ev.clientX;
    this.drag.lastY = ev.clientY;
    if (
      !this.dragged &&
      Math.hypot(ev.clientX - this.drag.startX, ev.clientY - this.drag.startY) >= DRAG_THRESHOLD_PX
    ) {
      this.dragged = true;
      this.isDragging.set(true);
      // Capture only once it's a real drag: with capture active the click retargets to the
      // wrapper, so capturing on pointerdown would stop a still tap from reaching the pin link.
      try {
        (ev.currentTarget as HTMLElement | null)?.setPointerCapture?.(ev.pointerId);
      } catch {
        // Synthetic events carry no active pointer: capture is best-effort.
      }
    }
  }

  protected onDragEnd(ev: PointerEvent): void {
    if (!this.drag) return;
    const el = ev.currentTarget as HTMLElement | null;
    if (el?.hasPointerCapture?.(ev.pointerId)) el.releasePointerCapture(ev.pointerId);
    this.endDrag();
  }

  /** Cancelled pointers produce no click, so nothing is left to swallow. */
  protected onDragCancel(ev: PointerEvent): void {
    this.onDragEnd(ev);
    this.dragged = false;
  }

  protected onPinHover(index: number | null): void {
    this.hoveredPin = index;
    this.syncSpin();
  }

  protected onOverlayFocusIn(ev: FocusEvent): void {
    // Chrome focuses a link on mousedown: only keyboard focus should hold the globe still.
    const target = ev.target as HTMLElement;
    this.focusedPin = this.isKeyboardFocus(target) ? target : null;
    this.syncSpin();
  }

  protected onOverlayFocusOut(ev: FocusEvent): void {
    // Moving focus between pins: the focusin that follows decides.
    const next = ev.relatedTarget as Node | null;
    if (next && this.globeEl().nativeElement.contains(next)) return;
    this.focusedPin = null;
    this.syncSpin();
  }

  /** `:focus-visible` is the browser's keyboard-focus heuristic; without support, assume keyboard. */
  protected isKeyboardFocus(el: Element): boolean {
    try {
      return el.matches(':focus-visible');
    } catch {
      return true;
    }
  }

  /**
   * A drag can turn the hovered/focused pin to the back (visibility: hidden), which may fire no
   * mouseleave/focusout: drop that pause so the spin can't stay stuck.
   */
  private dropBackFacingPause(pts: ScreenPoint[]): void {
    let changed = false;
    if (this.hoveredPin !== null && !pts[this.hoveredPin]?.front) {
      this.hoveredPin = null;
      changed = true;
    }
    const focused = this.focusedPin;
    if (focused) {
      const pins = Array.from(this.globeEl().nativeElement.querySelectorAll('app-globe-pins a'));
      const index = pins.indexOf(focused);
      if (index < 0 || !pts[index]?.front) {
        this.focusedPin = null;
        focused.blur(); // it is about to be hidden anyway; don't leave focus on an invisible link
        changed = true;
      }
    }
    if (changed) this.syncSpin();
  }

  /** End a drag whose pointerup we never saw; no click on a pin follows, so clear `dragged` too. */
  private abortDrag(): void {
    if (!this.drag) return;
    const el = this.globeEl().nativeElement;
    // pointerId comes from pointerdown: a blur event carries none.
    if (el.hasPointerCapture?.(this.drag.pointerId)) el.releasePointerCapture(this.drag.pointerId);
    this.endDrag();
    this.dragged = false;
  }

  private endDrag(): void {
    this.drag = null;
    this.isDragging.set(false);
    this.globe()?.release();
  }

  /** Run the idle spin only when every gate allows it; never start() while offscreen. */
  private syncSpin(): void {
    const handle = this.globe();
    if (!handle) return;
    if (!this.inView || this.hoveredPin !== null || this.focusedPin) handle.stop();
    else if (!this.reduced) handle.start();
  }

  /** Pause rendering while the hero is scrolled out of view. */
  private observeVisibility(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    this.observer = new IntersectionObserver(([entry]) => {
      this.inView = !!entry?.isIntersecting;
      this.syncSpin();
    });
    this.observer.observe(this.globeEl().nativeElement);
  }

  // Scene disposal stays with ThreeHostComponent.
  ngOnDestroy(): void {
    this.globeEl().nativeElement.removeEventListener('click', this.onClickCapture, true);
    window.removeEventListener('pointerup', this.onWindowPointerUp);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibility);
    clearTimeout(this.resyncTimer);
    this.observer?.disconnect();
    this.unsubscribeProject?.();
  }
}
