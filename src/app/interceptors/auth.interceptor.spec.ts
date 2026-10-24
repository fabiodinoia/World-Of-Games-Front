import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { authInterceptor, INVALID_TOKEN_STATUS } from './auth.interceptor';
import { RepoUserService } from '../services/user/user.service';
import { createUserServiceMock } from '../utils/mocks';
import { environment } from 'src/environments/environment';

describe('authInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let srv: ReturnType<typeof createUserServiceMock>;
  const api = `${environment.apiUrl}/games/`;

  beforeEach(() => {
    srv = createUserServiceMock();
    TestBed.configureTestingModule({
      providers: [
        { provide: RepoUserService, useValue: srv },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  it('adds the bearer token to API calls', () => {
    http.get(api).subscribe();
    const req = ctrl.expectOne(api);
    expect(req.request.headers.get('Authorization')).toBe('Bearer TestToken');
    req.flush({});
  });

  it('sends API calls anonymously when logged out', () => {
    srv.token$.next('');
    http.get(api).subscribe();
    const req = ctrl.expectOne(api);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('never leaks the token to third-party hosts', () => {
    http.get('https://example.com/x').subscribe();
    const req = ctrl.expectOne('https://example.com/x');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('clears the session when the API rejects the token', () => {
    let failed = false;
    http.get(api).subscribe({ error: () => (failed = true) });
    ctrl
      .expectOne(api)
      .flush('', { status: INVALID_TOKEN_STATUS, statusText: 'Invalid' });
    expect(failed).toBeTrue();
    expect(srv.logout).toHaveBeenCalled();
  });

  it('does not log out on other errors', () => {
    http.get(api).subscribe({ error: () => undefined });
    ctrl.expectOne(api).flush('', { status: 403, statusText: 'Forbidden' });
    expect(srv.logout).not.toHaveBeenCalled();
  });
});
