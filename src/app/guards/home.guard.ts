import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RepoUserService } from 'src/app/services/user/user.service';

/** /home is the signed-in storefront; guests go to the landing. A token kept only in storage is restored first. */
export const homeGuard: CanActivateFn = () => {
  const users = inject(RepoUserService);
  if (!users.token$.value) users.restoreSession();
  return users.token$.value ? true : inject(Router).createUrlTree(['/']);
};
