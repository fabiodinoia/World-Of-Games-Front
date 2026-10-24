import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { FooterComponent } from './footer.component';
import { RepoUserService } from 'src/app/services/user/user.service';
import { createUserServiceMock } from 'src/app/utils/mocks';

@Component({ template: '' })
class DummyComponent {}

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;
  let component: FooterComponent;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [
        provideRouter([{ path: '**', component: DummyComponent }]),
        { provide: RepoUserService, useValue: createUserServiceMock() },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('tracks whether a user is logged in', () => {
    expect(component.isLogged()).toBeTrue();
  });

  it('tracks the current path, ignoring query params', async () => {
    await router.navigateByUrl('/login?returnUrl=%2Fcart');
    fixture.detectChanges();
    expect(component.currentPage()).toBe('/login');
    expect(fixture.nativeElement.textContent).toContain('Register');
  });
});
