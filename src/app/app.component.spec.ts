import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { RepoUserService } from './services/user/user.service';
import { createUserServiceMock } from './utils/mocks';

describe('AppComponent', () => {
  it('renders the layout and restores the session on start', async () => {
    const srv = createUserServiceMock();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: RepoUserService, useValue: srv },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(srv.restoreSession).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-layout')).toBeTruthy();
  });
});
