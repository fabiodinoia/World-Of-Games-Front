import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RepoUserService } from 'src/app/services/user/user.service';
import { RepoGameService } from 'src/app/services/game/game.services.service';
import {
  createGameServiceMock,
  createUserServiceMock,
  mockGame,
  mockUser,
} from 'src/app/utils/mocks';
import { UserDetailComponent } from './detail.component';

describe('UserDetailComponent', () => {
  let fixture: ComponentFixture<UserDetailComponent>;
  let component: UserDetailComponent;
  let srv: ReturnType<typeof createUserServiceMock>;
  let gameSrv: ReturnType<typeof createGameServiceMock>;
  let router: Router;

  beforeEach(async () => {
    srv = createUserServiceMock();
    gameSrv = createGameServiceMock();
    await TestBed.configureTestingModule({
      imports: [UserDetailComponent],
      providers: [
        provideRouter([]),
        { provide: RepoUserService, useValue: srv },
        { provide: RepoGameService, useValue: gameSrv },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(UserDetailComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges();
  });

  it('renders the current user', () => {
    expect(fixture.nativeElement.textContent).toContain(mockUser.name);
  });

  it('editGame stores the game and opens the editor', () => {
    component.editGame(mockGame);
    expect(gameSrv.gameInfo$.value).toEqual(mockGame);
    expect(router.navigate).toHaveBeenCalledWith(['/games/create']);
  });

  it('editUser opens the register form', () => {
    component.editUser();
    expect(router.navigate).toHaveBeenCalledWith(['/register']);
  });

  it('deleteGame deletes then refreshes the user', () => {
    srv.getCurrentUser.calls.reset();
    component.deleteGame(mockGame);
    expect(gameSrv.deleteGame).toHaveBeenCalledWith(mockGame.id as string);
    expect(srv.getCurrentUser).toHaveBeenCalled();
  });

  it('deleteUser deletes, logs out and goes home', () => {
    component.deleteUser(mockUser);
    expect(srv.deleteUser).toHaveBeenCalledWith(mockUser.id as string);
    expect(srv.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('logoutUser logs out and goes home', () => {
    component.logoutUser();
    expect(srv.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
