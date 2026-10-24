import { inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/** Current router path (no query/fragment) as a signal, updated on every navigation. */
export const currentUrl = (): Signal<string> => {
  const router = inject(Router);
  return toSignal(
    router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => pathOf(e.urlAfterRedirects)),
    ),
    { initialValue: pathOf(router.url) },
  );
};

const pathOf = (url: string): string => url.split(/[?#]/)[0];
