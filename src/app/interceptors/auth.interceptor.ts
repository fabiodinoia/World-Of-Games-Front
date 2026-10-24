import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { RepoUserService } from '../services/user/user.service';
import { environment } from 'src/environments/environment';

/** Backend status for a missing/expired/invalid token. */
export const INVALID_TOKEN_STATUS = 498;

/**
 * Attaches the bearer token to calls to our own API (never to third parties).
 * If the API rejects the token as invalid/expired, the stale session is
 * cleared so the UI falls back to the logged-out experience.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const users = inject(RepoUserService);
  const token = users.token$.value;
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        token &&
        error instanceof HttpErrorResponse &&
        error.status === INVALID_TOKEN_STATUS
      ) {
        users.logout();
      }
      return throwError(() => error);
    }),
  );
};
