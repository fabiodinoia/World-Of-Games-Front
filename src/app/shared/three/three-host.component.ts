import {
  ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender,
  inject, input, output, signal, viewChild,
} from '@angular/core';
import { prefersReducedMotion } from 'src/app/shared/motion/motion';
import { SceneFactory, SceneHandle } from 'src/app/shared/three/scene-types';
import { WEBGL_SUPPORT } from 'src/app/shared/three/webgl-support';

@Component({
  selector: 'app-three-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The accessible name lives on the host so it survives the poster -> canvas swap.
  host: { role: 'img', '[attr.aria-label]': 'label()' },
  template: `
    @if (!sceneReady()) {
      <img class="three-host__poster" [src]="poster()" alt="" />
    }
    <canvas #canvas class="three-host__canvas" [class.three-host__canvas--on]="sceneReady()" aria-hidden="true"></canvas>
  `,
  styles: `
    :host { position: relative; display: block; }
    .three-host__poster { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
    .three-host__canvas { width: 100%; height: 100%; opacity: 0; transition: opacity var(--dur-slow) var(--ease-out); }
    .three-host__canvas--on { opacity: 1; }
  `,
})
export class ThreeHostComponent implements OnDestroy {
  sceneLoader = input.required<() => Promise<SceneFactory>>();
  poster = input.required<string>();
  label = input('');
  reducedMotion = input<boolean | null>(null); // test override; null = read media query
  ready = output<SceneHandle>();

  protected sceneReady = signal(false);
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private supportsWebgl = inject(WEBGL_SUPPORT);
  private handle: SceneHandle | null = null;
  private destroyed = false;
  private onVisibility = () => {
    if (!this.handle || this.isReduced()) return;
    document.hidden ? this.handle.stop() : this.handle.start();
  };

  constructor() {
    afterNextRender(() => void this.init());
  }

  private isReduced(): boolean {
    return this.reducedMotion() ?? prefersReducedMotion();
  }

  private async init(): Promise<void> {
    if (!this.supportsWebgl()) return;
    try {
      const factory = await this.sceneLoader()();
      if (this.destroyed) return;
      const handle = await factory(this.canvas().nativeElement);
      if (this.destroyed) {
        handle.dispose(); // destroyed mid-load: free GPU resources, never start
        return;
      }
      this.handle = handle;
      this.isReduced() ? this.handle.renderOnce() : this.handle.start();
      this.sceneReady.set(true);
      document.addEventListener('visibilitychange', this.onVisibility);
      this.ready.emit(this.handle);
    } catch (err) {
      console.warn('three-host scene failed', err);
      this.handle?.dispose();
      this.handle = null; // poster stays; page remains functional
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.handle?.dispose();
  }
}
