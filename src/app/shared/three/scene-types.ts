import type { ScreenPoint } from 'src/app/shared/three/globe/globe-math';

export interface SceneHandle {
  start(): void; // begin rAF loop (idles the model)
  stop(): void; // halt rAF loop
  renderOnce(): void; // single static frame (reduced motion)
  setPointer(nx: number, ny: number): void; // normalized -1..1, no-op if unsupported
  setDrag(dxPx: number): void; // horizontal drag delta, no-op if unsupported
  dispose(): void; // free GPU resources, lose context
}
export type SceneFactory = (canvas: HTMLCanvasElement) => Promise<SceneHandle>;

/** SceneHandle plus what the landing globe's DOM pin layer and two-axis drag need. */
export interface GlobeHandle extends SceneHandle {
  /** Rotate by a pointer delta in CSS px; also renders a frame if the loop is stopped. */
  dragBy(dxPx: number, dyPx: number): void;
  /** Pointer released: idle spin resumes (if running) and tilt eases back to TILT_DEFAULT over ~600 ms. */
  release(): void;
  /** Called after every rendered frame with one ScreenPoint per GLOBE_PINS entry (same order), in canvas CSS px. Returns an unsubscribe fn. */
  onProject(cb: (points: ScreenPoint[]) => void): () => void;
}
