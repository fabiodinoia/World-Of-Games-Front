import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject,
  input, output, signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScreenPoint } from 'src/app/shared/three/globe/globe-math';
import { PinLink } from 'src/app/shared/three/globe/globe-pins';

/** Front pin depth above which the front-most pin gets a label on its own. */
const AUTO_LABEL_DEPTH = 0.55;

/** Widest label card plus its 12px offset from the dot (longest copy: "Clair Obscur: Expedition 33"). */
const LABEL_SPAN_PX = 212;

export type LabelPlacement = 'right' | 'center' | 'left';

/** Horizontal room (CSS px) from the overlay's left edge to each viewport edge. */
export interface LabelRoom {
  left: number;
  right: number;
}

/**
 * Which side of the dot the label card opens on. The body clips horizontal overflow, so a card that
 * would run past the viewport's right edge flips to the left of the dot; when neither side fits
 * (narrow phones, dot near the middle) it sits centred above the dot. Unmeasured room (null) keeps
 * the reference placement on the right.
 */
export function labelPlacement(x: number, room: LabelRoom | null): LabelPlacement {
  if (!room || x + LABEL_SPAN_PX <= room.right) return 'right';
  return x - LABEL_SPAN_PX >= -room.left ? 'left' : 'center';
}

/**
 * DOM overlay for the landing globe: one routerLink per pin, positioned from
 * the per-frame projected points. Elements are created once (tracked by city)
 * and only their transform/opacity bindings change each frame.
 */
@Component({
  selector: 'app-globe-pins',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (ready()) {
      @for (link of links(); track link.city; let i = $index) {
        @let p = points()[i];
        <a
          class="globe-pin"
          [class.globe-pin--back]="!p.front"
          [class.globe-pin--labelled]="labelIndex() === i"
          [routerLink]="link.href"
          [attr.aria-label]="link.label"
          [attr.tabindex]="p.front ? null : -1"
          [attr.aria-hidden]="p.front ? null : 'true'"
          [style.transform]="'translate(' + p.x + 'px, ' + p.y + 'px)'"
          (mouseenter)="activate(i); pinHover.emit(i)"
          (focus)="activate(i)"
          (mouseleave)="deactivate(i); pinHover.emit(null)"
          (blur)="deactivate(i)"
        >
          <span class="globe-pin__dot" [style.opacity]="p.depth"></span>
          @if (labelIndex() === i) {
            @let side = placement(p.x);
            <span
              class="globe-pin__label"
              [class.globe-pin__label--center]="side === 'center'"
              [class.globe-pin__label--left]="side === 'left'"
              aria-hidden="true"
            >
              <span class="globe-pin__city">Most wanted in {{ link.city }}</span>
              <span class="globe-pin__game">{{ link.game }}</span>
            </span>
          }
        </a>
      }
    }
  `,
  styleUrl: './globe-pins.component.scss',
})
export class GlobePinsComponent {
  readonly links = input.required<PinLink[]>();
  readonly points = input.required<ScreenPoint[]>();
  /** Index of the pin the pointer entered, or null when it left, so the host can hold the globe still. */
  readonly pinHover = output<number | null>();

  protected readonly active = signal<number | null>(null);
  /** Room around the overlay, re-measured on layout changes (not per frame). */
  protected readonly room = signal<LabelRoom | null>(null);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const measure = () => {
        const left = host.getBoundingClientRect().left;
        this.room.set({ left, right: document.documentElement.clientWidth - left });
      };
      measure();
      window.addEventListener('resize', measure);
      const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
      ro?.observe(host);
      destroyRef.onDestroy(() => {
        window.removeEventListener('resize', measure);
        ro?.disconnect();
      });
    });
  }

  protected readonly ready = computed(() => this.points().length === this.links().length);

  /** Hovered/focused front pin wins; else the deepest front pin past the threshold. */
  protected readonly labelIndex = computed<number | null>(() => {
    const points = this.points();
    const active = this.active();
    if (active !== null && points[active]?.front) return active;
    let best: number | null = null;
    points.forEach((p, i) => {
      if (p.front && (best === null || p.depth > points[best].depth)) best = i;
    });
    return best !== null && points[best].depth > AUTO_LABEL_DEPTH ? best : null;
  });

  protected placement(x: number): LabelPlacement {
    return labelPlacement(x, this.room());
  }

  protected activate(i: number): void {
    this.active.set(i);
  }

  protected deactivate(i: number): void {
    if (this.active() === i) this.active.set(null);
  }
}
