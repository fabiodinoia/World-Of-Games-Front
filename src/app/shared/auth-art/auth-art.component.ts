import { ChangeDetectionStrategy, Component } from '@angular/core';

/** 1x1 transparent GIF: phones get this instead of the decorative covers. */
const BLANK =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * Decorative cover wall beside the sign-in and register forms (desktop only).
 * Three columns drift upward forever: each column renders its covers twice and
 * its track slides by exactly one copy (-50%), so the loop is seamless.
 */
@Component({
  selector: 'app-auth-art',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <div class="wall">
      @for (col of columns; track $index) {
        <div class="wall__col">
          <div class="wall__track">
            @for (copy of copies; track copy) {
              <div class="wall__half">
                @for (slug of col; track slug) {
                  <picture>
                    <source media="(max-width: 900px)" [attr.srcset]="blank" />
                    <img [src]="'assets/covers/' + slug + '-cover.jpeg'" alt="" width="240" height="320" decoding="async" />
                  </picture>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; position: relative; overflow: hidden; mask-image: linear-gradient(to top, transparent, #000 6%); } /* mask fades the bottom edge to nothing (the box can end on a fractional pixel) */
    .wall {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-3);
      transform: rotate(-8deg) scale(1.25);
      transform-origin: 40% 40%;
      opacity: 0.85;
    }
    /* 1:4 stays just under one copy (4 cover widths + gaps), so the window never outruns the two copies. */
    .wall__col { overflow: hidden; aspect-ratio: 1 / 4; }
    .wall__track {
      display: flex;
      flex-direction: column;
      will-change: transform;
      animation: wall-up 48s linear infinite;
    }
    .wall__col:nth-child(2) .wall__track { animation-duration: 62s; animation-delay: -24s; }
    .wall__col:nth-child(3) .wall__track { animation-duration: 55s; }
    /* padding-bottom keeps the seam gap equal to the normal gap, so -50% lands exactly on copy 2. */
    .wall__half { display: flex; flex-direction: column; gap: var(--space-3); padding-bottom: var(--space-3); }
    @keyframes wall-up { to { transform: translateY(-50%); } }
    @media (prefers-reduced-motion: reduce) {
      .wall__track { animation: none; }
    }
    img { display: block; width: 100%; aspect-ratio: 3 / 4; object-fit: cover; border-radius: var(--radius-cover); }
    :host::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent 40%, var(--ink)), linear-gradient(0deg, var(--ink), transparent 35%);
    }
  `,
})
export class AuthArtComponent {
  readonly blank = BLANK;
  /** Three columns of three covers; each column is rendered twice for the loop. */
  readonly columns = [
    ['er', 'kh', 'lol'],
    ['e33', 'v', 'sm'],
    ['gow', 'ff', 'gta'],
  ];
  readonly copies = [0, 1];
}
