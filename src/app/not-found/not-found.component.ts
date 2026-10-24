import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { RepoUserService } from 'src/app/services/user/user.service';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="page">
      <section class="lost">
        <p class="lost__code" aria-hidden="true"><span>4</span><span class="lost__zero">0</span><span>4</span></p>
        <h1>Page not found</h1>
        <p class="lost__text">There's nothing at <code>{{ path }}</code>. The link may be old, or the listing was taken down.</p>
        <div class="lost__actions">
          @if (loggedUser().id) {
            <a class="btn btn--primary" routerLink="/games">Go to the store</a>
            <a class="btn btn--outline" routerLink="/">Home page</a>
          } @else {
            <a class="btn btn--primary" routerLink="/">Home page</a>
          }
        </div>
      </section>
    </div>
  `,
  styles: `
    .lost { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-4); padding-block: var(--space-8); max-width: 60ch; }
    .lost__code {
      font-family: var(--font-display); font-weight: 900; line-height: 0.8;
      font-size: clamp(7rem, 26vw, 15rem); color: transparent; -webkit-text-stroke: 2px var(--volt);
    }
    .lost__code span { display: inline-block; }
    /* The middle digit has lost a screw: it hangs crooked from its top-right
       corner. It drops once on arrival and swings back level on hover. */
    .lost__zero { transform: rotate(-10deg); transform-origin: 88% 8%; }
    @media (prefers-reduced-motion: no-preference) {
      .lost__zero {
        transition: transform var(--dur-slow) var(--ease-out);
        animation: lost-drop 500ms cubic-bezier(0.3, 1.6, 0.5, 1) 250ms backwards;
      }
      .lost__code:hover .lost__zero { transform: rotate(-3deg); }
    }
    @keyframes lost-drop { from { transform: none; } }
    .lost__text { color: var(--haze); font-size: var(--text-lg); }
    code { color: var(--paper); overflow-wrap: anywhere; }
    .lost__actions { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-top: var(--space-2); }
  `,
})
export class NotFoundComponent {
  readonly path = inject(Router).url;
  // The store is sign-in only, so guests get just the way back home.
  readonly loggedUser = toSignal(inject(RepoUserService).userLogged$, { requireSync: true });
}
