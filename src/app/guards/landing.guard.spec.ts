import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { landingGuard } from 'src/app/guards/landing.guard';
import { RepoUserService } from 'src/app/services/user/user.service';
import { createUserServiceMock, mockLogged } from 'src/app/utils/mocks';

describe('landingGuard', () => {
  let srv: ReturnType<typeof createUserServiceMock>;
  const run = () =>
    TestBed.runInInjectionContext(() =>
      landingGuard({} as ActivatedRouteSnapshot, { url: '/' } as RouterStateSnapshot),
    );
  const serialize = (tree: UrlTree) => TestBed.inject(Router).serializeUrl(tree);

  beforeEach(() => {
    srv = createUserServiceMock(mockLogged);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: RepoUserService, useValue: srv }],
    });
  });

  it('redirects a logged-in user to /home', () => {
    const result = run() as UrlTree;
    expect(serialize(result)).toBe('/home');
    expect(srv.restoreSession).not.toHaveBeenCalled();
  });

  it('shows the landing to a logged-out user', () => {
    srv.token$.next('');
    expect(run()).toBeTrue();
    expect(srv.restoreSession).toHaveBeenCalledTimes(1);
  });

  it('restores a token kept only in localStorage and redirects to /home', () => {
    srv.token$.next('');
    srv.restoreSession.and.callFake(() => srv.token$.next('tok'));
    const result = run() as UrlTree;
    expect(srv.restoreSession).toHaveBeenCalledTimes(1);
    expect(serialize(result)).toBe('/home');
  });
});
