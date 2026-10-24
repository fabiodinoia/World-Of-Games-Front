import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RepoUserService } from 'src/app/services/user/user.service';
import {
  createUserServiceMock,
  mockGame,
  mockGame1,
  mockUser,
} from 'src/app/utils/mocks';
import { CartComponent } from './cart.component';

describe('CartComponent', () => {
  let fixture: ComponentFixture<CartComponent>;
  let component: CartComponent;
  let srv: ReturnType<typeof createUserServiceMock>;

  beforeEach(async () => {
    srv = createUserServiceMock();
    await TestBed.configureTestingModule({
      imports: [CartComponent],
      providers: [
        provideRouter([]),
        { provide: RepoUserService, useValue: srv },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the logged user cart', () => {
    expect(srv.getCurrentUser).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(mockGame.gameName);
  });

  it('computes the total', () => {
    expect(component.getTotal(undefined)).toBe(0);
    expect(component.getTotal([mockGame, mockGame1])).toBe(40);
  });

  it('removes a game from the shop list', () => {
    component.removeGame(mockGame);
    expect(srv.updateUser).toHaveBeenCalledWith(mockUser.id as string, {
      cart: [mockGame1.id],
    });
  });

  it('shows the 2D empty state with no video loop', () => {
    srv.getCurrentUser.and.returnValue(of({ ...mockUser, cart: [] }));
    component.ngOnInit();
    fixture.detectChanges();
    const empty = (fixture.nativeElement as HTMLElement).querySelector('.empty');
    expect(empty).toBeTruthy();
    expect(empty!.querySelector('h2')?.textContent).toContain('Your cart is empty');
    expect(empty!.querySelector('a[href="/games"]')).toBeTruthy();
    expect(empty!.querySelector('video')).toBeNull();
    expect(empty!.querySelector('app-loop-video')).toBeNull();
  });
});
