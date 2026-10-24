import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { provideRouter, Router } from '@angular/router';
import { HeaderComponent } from './header.component';
import { RepoUserService } from 'src/app/services/user/user.service';
import {
  createUserServiceMock,
  mockLogged,
  mockUser,
} from 'src/app/utils/mocks';

@Component({ template: '' })
class DummyComponent {}

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let component: HeaderComponent;
  let srv: ReturnType<typeof createUserServiceMock>;
  let router: Router;

  beforeEach(async () => {
    srv = createUserServiceMock();
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([{ path: '**', component: DummyComponent }]),
        { provide: RepoUserService, useValue: srv },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('reflects the logged user and cart size', () => {
    expect(component.isLoggedIn()).toBeTrue();
    expect(component.userId()).toBe(mockLogged.id);
    expect(component.userName()).toBe(mockUser.name);
    expect(component.cartCount()).toBe(mockUser.cart?.length ?? 0);
  });

  it('switches to Login/Register when logged out', () => {
    srv.userLogged$.next({ id: '', email: '', role: 'logout' });
    fixture.detectChanges();
    expect(component.isLoggedIn()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Register');
    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toContain('Store');
    expect(text).not.toContain('Sell a game');
  });

  it('shows Store and Sell a game when logged in', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Store');
    expect(text).toContain('Sell a game');
  });

  it('toggles the mobile menu and closes it on navigation', async () => {
    component.toggleMobileMenu();
    expect(component.mobileMenuOpen()).toBeTrue();
    await router.navigateByUrl('/games?category=RPG');
    fixture.detectChanges();
    expect(component.mobileMenuOpen()).toBeFalse();
    expect(component.isActive('/games')).toBeTrue();
    expect(component.isActive('/cart')).toBeFalse();
  });

  it('loads the profile after a reload restores only the token', () => {
    srv.getCurrentUser.calls.reset();
    srv.currentUser$.next({} as never);
    srv.userLogged$.next({ id: 'other-id', email: 'x@y.z', role: 'user' });
    fixture.detectChanges();
    expect(srv.getCurrentUser).toHaveBeenCalledWith('other-id');
  });

  [498, 403, 404, 500].forEach((status) => {
    it(`logs out quietly when the profile load fails with ${status}`, () => {
      spyOn(console, 'warn');
      srv.logout.calls.reset();
      srv.getCurrentUser.and.returnValue(
        throwError(() => new HttpErrorResponse({ status })),
      );
      srv.currentUser$.next({} as never);
      srv.userLogged$.next({ id: 'stale-id', email: 'x@y.z', role: 'user' });
      fixture.detectChanges();
      expect(srv.logout).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalled();
    });
  });
});
