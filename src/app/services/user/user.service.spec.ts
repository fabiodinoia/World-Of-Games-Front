import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  mockLogin,
  mockResp,
  mockResp1,
  mockToken,
  mockUser,
  mockUser1,
  TestApiUserUrl,
} from 'src/app/utils/mocks';
import { User } from 'src/app/types/types';
import { RepoUserService } from './user.service';
import { provideHttpClient } from '@angular/common/http';

describe('RepoUserService', () => {
  let service: RepoUserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RepoUserService);
    http = TestBed.inject(HttpTestingController);
    localStorage.removeItem('Token');
    spyOn(console, 'error');
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('Token');
  });

  it('loginUser should store the token and decode the logged user', () => {
    service.loginUser(mockLogin).subscribe((t) => expect(t).toBe(mockToken));
    const req = http.expectOne(`${TestApiUserUrl}/login`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResp);
    expect(service.token$.value).toBe(mockToken);
    expect(localStorage.getItem('Token')).toBe(mockToken);
    expect(service.userLogged$.value).toBeDefined();
  });

  it('loginUser should rethrow on failure', () => {
    let failed = false;
    service.loginUser(mockLogin).subscribe({ error: () => (failed = true) });
    http
      .expectOne(`${TestApiUserUrl}/login`)
      .flush('bad', { status: 401, statusText: 'Unauthorized' });
    expect(failed).toBeTrue();
    expect(service.token$.value).toBe('');
  });

  it('logout should clear token, storage and user state', () => {
    localStorage.setItem('Token', mockToken);
    service.token$.next(mockToken);
    service.logout();
    expect(localStorage.getItem('Token')).toBeNull();
    expect(service.token$.value).toBe('');
    expect(service.userLogged$.value.role).toBe('logout');
  });

  it('restoreSession should rehydrate a stored token', () => {
    localStorage.setItem('Token', mockToken);
    service.restoreSession();
    expect(service.token$.value).toBe(mockToken);
  });

  it('restoreSession should drop an invalid stored token', () => {
    localStorage.setItem('Token', 'not-a-jwt');
    service.restoreSession();
    expect(service.token$.value).toBe('');
    expect(localStorage.getItem('Token')).toBeNull();
  });

  it('restoreSession should do nothing without a token', () => {
    service.restoreSession();
    expect(service.token$.value).toBe('');
  });

  it('getCurrentUser should GET the user and publish it', () => {
    service
      .getCurrentUser('12345')
      .subscribe((u) => expect(u).toEqual(mockUser));
    const req = http.expectOne(`${TestApiUserUrl}/12345`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResp1);
    expect(service.currentUser$.value).toEqual(mockUser);
  });

  it('registerUser should POST to /register', () => {
    service.registerUser(mockUser).subscribe();
    const req = http.expectOne(`${TestApiUserUrl}/register`);
    expect(req.request.method).toBe('POST');
    req.flush(mockUser);
  });

  it('updateUser should PUT to the user id', () => {
    service.updateUser('123', { name: mockUser1.name }).subscribe();
    const req = http.expectOne(`${TestApiUserUrl}/123`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockUser1);
  });

  it('deleteUser should DELETE the user id', () => {
    service.deleteUser('123').subscribe();
    const req = http.expectOne(`${TestApiUserUrl}/123`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('addToCart appends the game id to the logged user cart', () => {
    service.userLogged$.next({ id: '12345', email: '', role: 'user' });
    let published: User | undefined;
    service.currentUser$.subscribe((u) => (published = u));
    service.addToCart('new-game').subscribe();
    http.expectOne(`${TestApiUserUrl}/12345`).flush(mockResp1);
    const put = http.expectOne(`${TestApiUserUrl}/12345`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({
      cart: [...(mockUser.cart ?? []).map((g) => g.id), 'new-game'],
    });
    const updated = {
      ...mockUser,
      cart: [...(mockUser.cart ?? []), { id: 'new-game' } as never],
    };
    put.flush(mockUser);
    http
      .expectOne(`${TestApiUserUrl}/12345`)
      .flush({ ...mockResp1, results: [updated] });
    expect(published?.cart?.map((g) => g.id)).toContain('new-game');
  });
});
