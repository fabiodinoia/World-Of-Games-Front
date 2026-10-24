import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RepoUserService } from '../services/user/user.service';

/** Lets signed-in users through; otherwise redirects to /login?returnUrl=… */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(RepoUserService).token$.value) {
    return true;
  }
  return inject(Router).createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
