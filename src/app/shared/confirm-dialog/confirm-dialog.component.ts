import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * Modal confirmation built on the native <dialog>: focus trapping, Esc to
 * cancel and the top layer come from the browser.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog class="confirm" aria-labelledby="confirm-title" aria-describedby="confirm-body"
      (cancel)="$event.preventDefault(); cancelled.emit()" (click)="onBackdrop($event)">
      <h2 id="confirm-title" class="confirm__title">{{ heading() }}</h2>
      <p id="confirm-body" class="confirm__body">{{ message() }}</p>
      <div class="confirm__actions">
        <button type="button" class="btn btn--outline" (click)="cancelled.emit()" autofocus>Cancel</button>
        <button type="button" class="btn btn--danger-solid" data-testid="confirm-accept"
          [disabled]="busy()" (click)="confirmed.emit()">{{ busy() ? busyLabel() : confirmLabel() }}</button>
      </div>
    </dialog>
  `,
  styles: `
    .confirm {
      width: min(440px, calc(100vw - 2rem));
      padding: var(--space-6);
      border: 1px solid var(--line);
      border-radius: var(--radius-sheet);
      background: var(--night);
      color: var(--paper);
      box-shadow: var(--shadow-sheet);
    }
    .confirm::backdrop { background: rgb(10 8 24 / 72%); backdrop-filter: blur(3px); }
    .confirm__title { font-size: var(--text-2xl); }
    .confirm__body { margin-top: var(--space-3); color: var(--haze); }
    .confirm__actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-6); }

    /* Open and close both animate: close() runs immediately (state stays
       synchronous), while overlay/display allow-discrete keep the dialog in
       the top layer until its exit transition ends. Browsers without
       allow-discrete simply close instantly. */
    .confirm,
    .confirm::backdrop {
      opacity: 0;
      transition: opacity var(--dur-base) var(--ease-out), overlay var(--dur-base) allow-discrete,
        display var(--dur-base) allow-discrete;
    }
    .confirm[open],
    .confirm[open]::backdrop { opacity: 1; }
    @starting-style {
      .confirm[open],
      .confirm[open]::backdrop { opacity: 0; }
    }
    @media (prefers-reduced-motion: no-preference) {
      .confirm {
        transform: translate3d(0, 6px, 0) scale(0.96);
        transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out),
          overlay var(--dur-base) allow-discrete, display var(--dur-base) allow-discrete;
      }
      .confirm[open] { transform: none; }
      @starting-style {
        .confirm[open] { transform: translate3d(0, 6px, 0) scale(0.96); }
      }
    }
  `,
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly heading = input.required<string>();
  readonly message = input('');
  readonly confirmLabel = input('Delete');
  readonly busyLabel = input('Deleting...');
  readonly busy = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      if (this.open() && !el.open) el.showModal?.();
      if (!this.open() && el.open) el.close();
    });
  }

  /** Clicks on the ::backdrop land on the dialog element itself. */
  protected onBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.cancelled.emit();
  }
}
