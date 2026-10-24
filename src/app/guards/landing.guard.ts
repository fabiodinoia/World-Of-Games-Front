import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RepoUserService } from 'src/app/services/user/user.service';

/** Logged-in visitors skip the landing; a token persisted only in storage is restored first. */
export const landingGuard: CanActivateFn = () => {
  const users = inject(RepoUserService);
  if (!users.token$.value) users.restoreSession();
  return users.token$.value ? inject(Router).createUrlTree(['/home']) : true;
};
