import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import {
  provideRouter,
  Router,
  ActivatedRoute,
  convertToParamMap,
} from '@angular/router';
import { throwError } from 'rxjs';
import { RepoUserService } from 'src/app/services/user/user.service';
import { createUserServiceMock, mockPass } from 'src/app/utils/mocks';
import { LoginComponent } from './login.component';
import { DEMO_CREDENTIALS } from './demo-credentials';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let srv: ReturnType<typeof createUserServiceMock>;
  let router: Router;

  const setup = async (returnUrl?: string) => {
    srv = createUserServiceMock();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: RepoUserService, useValue: srv },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}),
            },
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
  };

  it('does not call the API with an invalid form', async () => {
    await setup();
    component.handleSubmit();
    expect(srv.loginUser).not.toHaveBeenCalled();
  });

  it('logs in and navigates to the catalog', fakeAsync(() => {
    setup();
    tick();
    component.login.setValue({ email: 'a@b.dev', password: mockPass });
    component.handleSubmit();
    expect(srv.loginUser).toHaveBeenCalledWith({
      email: 'a@b.dev',
      password: mockPass,
    });
    // Navigates straight away, without an artificial pause.
    expect(router.navigateByUrl).toHaveBeenCalledWith('/games');
    tick();
    expect(component.isSubmitting()).toBeFalse();
  }));

  it('returns to the guarded page that redirected here', fakeAsync(() => {
    setup('/cart');
    tick();
    component.login.setValue({ email: 'a@b.dev', password: mockPass });
    component.handleSubmit();
    tick();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/cart');
  }));

  it('ignores external returnUrls', fakeAsync(() => {
    setup('//evil.example');
    tick();
    component.loginAsDemo();
    tick();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
  }));

  it('demo sign-in honours a valid returnUrl', fakeAsync(() => {
    setup('/cart');
    tick();
    component.loginAsDemo();
    tick();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/cart');
  }));

  it('signs in with the demo account in one click', fakeAsync(() => {
    setup();
    tick();
    fixture.nativeElement.querySelector('[data-testid="demo-login"]').click();
    expect(srv.loginUser).toHaveBeenCalledWith({ ...DEMO_CREDENTIALS });
    tick();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
  }));

  it('shows then clears the error state on failure', fakeAsync(() => {
    setup();
    tick();
    srv.loginUser.and.returnValue(throwError(() => new Error('401')));
    component.login.setValue({ email: 'a@b.dev', password: 'wrong' });
    component.handleSubmit();
    expect(component.isError()).toBeTrue();
    expect(component.isSubmitting()).toBeFalse();
    tick(3000);
    expect(component.isError()).toBeFalse();
  }));
});
