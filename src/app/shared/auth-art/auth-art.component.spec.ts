import { TestBed } from '@angular/core/testing';
import { AuthArtComponent } from './auth-art.component';

describe('AuthArtComponent', () => {
  it('renders 3 columns of 6 covers (2 x 3), all decorative', () => {
    const fixture = TestBed.createComponent(AuthArtComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const cols = el.querySelectorAll('.wall__col');
    expect(cols.length).toBe(3);
    cols.forEach((c) => expect(c.querySelectorAll('img').length).toBe(6));
    el.querySelectorAll('img').forEach((i) => expect(i.getAttribute('alt')).toBe(''));
  });
});
