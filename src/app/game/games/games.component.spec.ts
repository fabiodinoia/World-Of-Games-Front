import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
  Router,
} from '@angular/router';
import { of, throwError } from 'rxjs';
import { GamesComponent } from './games.component';
import { RepoGameService } from 'src/app/services/game/game.services.service';
import { RepoUserService } from 'src/app/services/user/user.service';
import {
  createGameServiceMock,
  createUserServiceMock,
  mockGame,
  mockGame1,
  mockLogged,
} from 'src/app/utils/mocks';

describe('GamesComponent', () => {
  let fixture: ComponentFixture<GamesComponent>;
  let component: GamesComponent;
  let gameSrv: ReturnType<typeof createGameServiceMock>;
  let userSrv: ReturnType<typeof createUserServiceMock>;
  let router: Router;

  const setup = async (category: string | null = null, logged = mockLogged) => {
    gameSrv = createGameServiceMock();
    userSrv = createUserServiceMock(logged);
    await TestBed.configureTestingModule({
      imports: [GamesComponent],
      providers: [
        provideRouter([]),
        { provide: RepoGameService, useValue: gameSrv },
        { provide: RepoUserService, useValue: userSrv },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(
              convertToParamMap(category ? { category } : {}),
            ),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(GamesComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges();
  };

  it('loads all games on init and renders them', async () => {
    await setup();
    expect(gameSrv.queryGame).toHaveBeenCalledWith('all');
    expect(component.games()).toEqual([mockGame, mockGame1]);
    expect(component.isLoading()).toBeFalse();
    expect(fixture.nativeElement.querySelectorAll('.game-card').length).toBe(2);
  });

  it('honours a valid ?category= query param', async () => {
    await setup('RPG');
    expect(component.selectedCategory()).toBe('RPG');
    expect(gameSrv.queryGame).toHaveBeenCalledWith('RPG');
  });

  it('ignores an unknown ?category= query param', async () => {
    await setup('Nope');
    expect(component.selectedCategory()).toBe('all');
  });

  it('reloads on category change and mirrors it in the URL', async () => {
    await setup();
    component.selectCategory('FPS');
    expect(component.selectedCategory()).toBe('FPS');
    expect(gameSrv.queryGame).toHaveBeenCalledWith('FPS');
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({ queryParams: { category: 'FPS' } }),
    );
  });

  it('accepts the newer genres from the URL', async () => {
    await setup('Sports');
    expect(component.selectedCategory()).toBe('Sports');
    expect(component.heading()).toBe('Sports games');
    expect(gameSrv.queryGame).toHaveBeenCalledWith('Sports');
  });

  it('shows the empty state on error', async () => {
    await setup();
    gameSrv.queryGame.and.returnValue(throwError(() => new Error('x')));
    component.selectCategory('MMO');
    fixture.detectChanges();
    expect(component.isLoading()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('No games found');
  });

  it('addCart sends logged-out users to login with a returnUrl', async () => {
    await setup(null, { id: '', email: '', role: 'logout' });
    component.addCart(mockGame);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: jasmine.any(String) },
    });
    expect(userSrv.addToCart).not.toHaveBeenCalled();
  });

  it('addCart adds the game and stays on the page', async () => {
    await setup();
    component.addCart(mockGame);
    expect(userSrv.addToCart).toHaveBeenCalledWith(mockGame.id as string);
    expect(router.navigateByUrl).not.toHaveBeenCalledWith('/cart');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
