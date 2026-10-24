import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { homeGuard } from 'src/app/guards/home.guard';
import { RepoUserService } from 'src/app/services/user/user.service';
import { createUserServiceMock, mockLogged } from 'src/app/utils/mocks';

describe('homeGuard', () => {
  let srv: ReturnType<typeof createUserServiceMock>;
  const run = () =>
    TestBed.runInInjectionContext(() =>
      homeGuard({} as ActivatedRouteSnapshot, { url: '/home' } as RouterStateSnapshot),
    );
  const serialize = (tree: UrlTree) => TestBed.inject(Router).serializeUrl(tree);

  beforeEach(() => {
    srv = createUserServiceMock(mockLogged);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: RepoUserService, useValue: srv }],
    });
  });

  it('lets a logged-in user through', () => {
    expect(run()).toBeTrue();
    expect(srv.restoreSession).not.toHaveBeenCalled();
  });

  it('sends a guest to the landing', () => {
    srv.token$.next('');
    const result = run() as UrlTree;
    expect(srv.restoreSession).toHaveBeenCalledTimes(1);
    expect(serialize(result)).toBe('/');
  });

  it('restores a token kept only in localStorage and lets the user through', () => {
    srv.token$.next('');
    srv.restoreSession.and.callFake(() => srv.token$.next('tok'));
    expect(run()).toBeTrue();
    expect(srv.restoreSession).toHaveBeenCalledTimes(1);
  });
});
