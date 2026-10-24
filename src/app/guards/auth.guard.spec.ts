import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { authGuard } from './auth.guard';
import { RepoUserService } from '../services/user/user.service';
import { createUserServiceMock } from '../utils/mocks';

describe('authGuard', () => {
  let srv: ReturnType<typeof createUserServiceMock>;
  const run = (url: string) =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

  beforeEach(() => {
    srv = createUserServiceMock();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: RepoUserService, useValue: srv },
      ],
    });
  });

  it('allows navigation with a token', () => {
    expect(run('/cart')).toBeTrue();
  });

  it('redirects to /login with a returnUrl without a token', () => {
    srv.token$.next('');
    const result = run('/cart') as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe(
      '/login?returnUrl=%2Fcart',
    );
  });
});
