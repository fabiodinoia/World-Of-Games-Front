import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from '../footer/footer.component';
import { HeaderComponent } from '../header/header.component';
import { LayoutComponent } from './layout.component';
import { RepoUserService } from 'src/app/services/user/user.service';
import { createUserServiceMock } from 'src/app/utils/mocks';

describe('LayoutComponent', () => {
  let fixture: ComponentFixture<LayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        LayoutComponent,
        FooterComponent,
        HeaderComponent,
      ],
      providers: [
        provideRouter([]),
        { provide: RepoUserService, useValue: createUserServiceMock() },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LayoutComponent);
    fixture.detectChanges();
  });

  it('renders header and footer', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-header')).toBeTruthy();
    expect(el.querySelector('app-footer')).toBeTruthy();
  });

  it('skip link focuses the main landmark without navigating', () => {
    const el: HTMLElement = fixture.nativeElement;
    const link = el.querySelector('.skip-link') as HTMLAnchorElement;
    const event = new MouseEvent('click', { cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBeTrue();
    expect(document.activeElement).toBe(el.querySelector('main'));
  });
});
