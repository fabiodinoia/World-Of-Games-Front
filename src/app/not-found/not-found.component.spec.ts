import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { NotFoundComponent } from './not-found.component';
import { RepoUserService } from 'src/app/services/user/user.service';

describe('NotFoundComponent', () => {
  const render = async (id: string) => {
    const userLogged$ = new BehaviorSubject({ id, email: '', role: id ? 'user' : 'logout' });
    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: [provideRouter([]), { provide: RepoUserService, useValue: { userLogged$ } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(NotFoundComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('explains the missing page and links signed-in users back to the store', async () => {
    const el = await render('u1');
    expect(el.querySelector('h1')?.textContent).toContain('Page not found');
    expect(el.querySelector('a[href="/games"]')).toBeTruthy();
  });

  it('sends guests home instead of to the sign-in-only store', async () => {
    const el = await render('');
    expect(el.querySelector('a[href="/games"]')).toBeNull();
    expect(el.querySelector('a[href="/"]')?.textContent).toContain('Home page');
  });

  it('renders the 2D 404 code with no video loop', async () => {
    const el = await render('');
    expect(el.querySelector('.lost__code')).toBeTruthy();
    expect(el.querySelector('.lost__zero')).toBeTruthy();
    expect(el.querySelector('video')).toBeNull();
    expect(el.querySelector('app-loop-video')).toBeNull();
  });
});
