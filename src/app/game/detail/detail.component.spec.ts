import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { DESKTOP_QUERY, DetailComponent, ownerId } from './detail.component';
import { RepoGameService } from 'src/app/services/game/game.services.service';
import { RepoUserService } from 'src/app/services/user/user.service';
import { Game, LoggedUser } from 'src/app/types/types';
import {
  createGameServiceMock,
  createUserServiceMock,
  mockGame,
  mockLogged,
} from 'src/app/utils/mocks';
import { WEBGL_SUPPORT } from 'src/app/shared/three/webgl-support';
import { ThreeHostComponent } from 'src/app/shared/three/three-host.component';
import { SceneHandle } from 'src/app/shared/three/scene-types';
import { By } from '@angular/platform-browser';

describe('DetailComponent (game)', () => {
  let fixture: ComponentFixture<DetailComponent>;
  let component: DetailComponent;
  let gameSrv: ReturnType<typeof createGameServiceMock>;
  let userSrv: ReturnType<typeof createUserServiceMock>;
  let router: Router;

  const loggedOut: LoggedUser = { id: '', email: '', role: 'logout' };
  const ownedGame: Game = { ...mockGame, owner: { id: mockLogged.id } };

  /** Viewport the fake matchMedia reports for the 3D case gate; reset per test. */
  let desktop: boolean;
  beforeEach(() => (desktop = true));

  const setup = async (
    logged = mockLogged,
    game: Game = mockGame,
    load: Observable<Game> = of(game),
  ) => {
    const realMatchMedia = window.matchMedia.bind(window);
    spyOn(window, 'matchMedia').and.callFake((query: string) =>
      query === DESKTOP_QUERY
        ? ({
            matches: desktop,
            media: query,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
          } as unknown as MediaQueryList)
        : realMatchMedia(query),
    );
    gameSrv = createGameServiceMock();
    gameSrv.loadGame.and.returnValue(load);
    userSrv = createUserServiceMock(logged);
    await TestBed.configureTestingModule({
      imports: [DetailComponent],
      providers: [
        provideRouter([]),
        { provide: RepoGameService, useValue: gameSrv },
        { provide: RepoUserService, useValue: userSrv },
        { provide: ActivatedRoute, useValue: { params: of({ id: game.id }) } },
        // Keep the 3D case on its poster: no WebGL / dynamic three.js import in tests.
        { provide: WEBGL_SUPPORT, useValue: () => false },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DetailComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges();
  };

  const ownerButtons = () =>
    fixture.nativeElement.querySelector('.detail-page__owner-actions');

  it('loads the game from the route id, even logged out', async () => {
    await setup(loggedOut);
    expect(gameSrv.loadGame).toHaveBeenCalledWith(mockGame.id as string);
    expect(component.game()).toEqual(mockGame);
    expect(fixture.nativeElement.textContent).toContain(mockGame.gameName);
  });

  it('shows a not-found state when the API fails', async () => {
    await setup(
      loggedOut,
      mockGame,
      throwError(() => new Error('404')),
    );
    expect(component.notFound()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain("doesn't exist");
  });

  it('hides owner controls from non-owners and visitors', async () => {
    await setup(loggedOut, ownedGame);
    expect(component.isOwner()).toBeFalse();
    expect(ownerButtons()).toBeNull();
  });

  it('shows owner controls to the owner', async () => {
    await setup(mockLogged, ownedGame);
    expect(component.isOwner()).toBeTrue();
    expect(ownerButtons()).toBeTruthy();
  });

  it('editGame hands the game to the editor', async () => {
    await setup(mockLogged, ownedGame);
    component.editGame();
    expect(gameSrv.gameInfo$.value).toEqual(ownedGame);
    expect(router.navigate).toHaveBeenCalledWith(['/games/create']);
  });

  it('asks for confirmation in a dialog before deleting', async () => {
    await setup(mockLogged, ownedGame);
    component.requestDelete();
    fixture.detectChanges();
    expect(component.confirmOpen()).toBeTrue();
    const dialog: HTMLDialogElement =
      fixture.nativeElement.querySelector('app-confirm-dialog dialog');
    expect(dialog.open).toBeTrue();
    expect(gameSrv.deleteGame).not.toHaveBeenCalled();

    component.cancelDelete();
    fixture.detectChanges();
    expect(dialog.open).toBeFalse();
    expect(gameSrv.deleteGame).not.toHaveBeenCalled();

    component.requestDelete();
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector(
        '[data-testid="confirm-accept"]',
      ) as HTMLButtonElement
    ).click();
    expect(gameSrv.deleteGame).toHaveBeenCalledWith(ownedGame.id as string);
    expect(router.navigate).toHaveBeenCalledWith(['/games']);
    expect(component.confirmOpen()).toBeFalse();
  });

  it('never opens the delete dialog for non-owners', async () => {
    await setup(mockLogged, mockGame);
    component.requestDelete();
    component.deleteGame();
    expect(component.confirmOpen()).toBeFalse();
    expect(gameSrv.deleteGame).not.toHaveBeenCalled();
  });

  it('addToCart sends logged-out users to login', async () => {
    await setup(loggedOut);
    component.addToCart();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/login'],
      jasmine.any(Object),
    );
    expect(userSrv.addToCart).not.toHaveBeenCalled();
  });

  it('addToCart adds the game and stays on the page', async () => {
    await setup();
    component.addToCart();
    expect(userSrv.addToCart).toHaveBeenCalledWith(mockGame.id as string);
    expect(router.navigateByUrl).not.toHaveBeenCalledWith('/cart');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('keeps the cover img (morph target + flight origin) beside the 3D case', async () => {
    await setup();
    const cover: HTMLElement = fixture.nativeElement.querySelector('.detail-page__cover');
    expect(cover.querySelector('img')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.detail-page__cover img')).toBe(
      cover.querySelector('img'),
    );
    expect(cover.querySelector('app-three-host')).toBeTruthy();
  });

  it('dragging the cover does not crash before the 3D scene is ready', async () => {
    await setup();
    const cover: HTMLElement = fixture.nativeElement.querySelector('.detail-page__cover');
    const pointer = (type: string, clientX: number) =>
      cover.dispatchEvent(new PointerEvent(type, { clientX, bubbles: true }));
    expect(() => {
      pointer('pointerdown', 10);
      pointer('pointermove', 40);
      pointer('pointerup', 40);
      pointer('pointercancel', 40);
    }).not.toThrow();
  });

  it('drives the scene with drag deltas and resumes idle on release', async () => {
    await setup();
    const handle = jasmine.createSpyObj<SceneHandle>('SceneHandle', [
      'start',
      'stop',
      'renderOnce',
      'setPointer',
      'setDrag',
      'dispose',
    ]);
    const threeHost = fixture.debugElement.query(By.directive(ThreeHostComponent));
    (threeHost.componentInstance as ThreeHostComponent).ready.emit(handle);
    const cover: HTMLElement = fixture.nativeElement.querySelector('.detail-page__cover');
    const pointer = (type: string, clientX: number) =>
      cover.dispatchEvent(new PointerEvent(type, { clientX, bubbles: true }));

    expect(cover.classList).not.toContain('detail-page__cover--live');
    fixture.detectChanges();
    // Live scene: the flat art fades out but stays rendered (morph + flight origin).
    expect(cover.classList).toContain('detail-page__cover--live');
    expect(cover.querySelector('img')).toBeTruthy();

    pointer('pointermove', 99); // no drag in progress: ignored
    expect(handle.setDrag).not.toHaveBeenCalled();

    pointer('pointerdown', 10);
    pointer('pointermove', 40);
    pointer('pointermove', 35);
    expect(handle.setDrag.calls.allArgs()).toEqual([[30], [-5]]);

    pointer('pointerup', 35);
    expect(handle.setDrag).toHaveBeenCalledTimes(3);
    expect(handle.setDrag.calls.mostRecent().args).toEqual([0]);
  });

  it('resumes the idle spin when a press is released (capture path)', async () => {
    await setup();
    const handle = jasmine.createSpyObj<SceneHandle>('SceneHandle', [
      'start',
      'stop',
      'renderOnce',
      'setPointer',
      'setDrag',
      'dispose',
    ]);
    const threeHost = fixture.debugElement.query(By.directive(ThreeHostComponent));
    (threeHost.componentInstance as ThreeHostComponent).ready.emit(handle);
    const cover: HTMLElement = fixture.nativeElement.querySelector('.detail-page__cover');
    const captureSpy = spyOn(cover, 'setPointerCapture');
    spyOn(cover, 'hasPointerCapture').and.returnValue(true);
    const releaseSpy = spyOn(cover, 'releasePointerCapture');

    cover.dispatchEvent(new PointerEvent('pointerdown', { clientX: 10, pointerId: 7, bubbles: true }));
    expect(captureSpy).toHaveBeenCalledWith(7);

    cover.dispatchEvent(new PointerEvent('pointerup', { clientX: 10, pointerId: 7, bubbles: true }));
    expect(releaseSpy).toHaveBeenCalledWith(7);
    expect(handle.setDrag).toHaveBeenCalledOnceWith(0);
  });

  it('mounts the 3D case only on desktop widths (cover img always stays)', async () => {
    desktop = false;
    await setup();
    const cover: HTMLElement = fixture.nativeElement.querySelector('.detail-page__cover');
    expect(cover.querySelector('img')).toBeTruthy();
    expect(cover.querySelector('app-three-host')).toBeNull();
  });

  it('ignores non-primary buttons and zero-dx moves mid-drag', async () => {
    await setup();
    const handle = jasmine.createSpyObj<SceneHandle>('SceneHandle', [
      'start',
      'stop',
      'renderOnce',
      'setPointer',
      'setDrag',
      'dispose',
    ]);
    const threeHost = fixture.debugElement.query(By.directive(ThreeHostComponent));
    (threeHost.componentInstance as ThreeHostComponent).ready.emit(handle);
    const cover: HTMLElement = fixture.nativeElement.querySelector('.detail-page__cover');
    const pointer = (type: string, clientX: number, button = 0) =>
      cover.dispatchEvent(new PointerEvent(type, { clientX, button, bubbles: true }));

    pointer('pointerdown', 10, 2); // right click: no drag starts
    pointer('pointermove', 40);
    expect(handle.setDrag).not.toHaveBeenCalled();

    pointer('pointerdown', 10);
    pointer('pointermove', 10); // vertical-only move: must not send the idle-resume 0
    expect(handle.setDrag).not.toHaveBeenCalled();
    pointer('pointermove', 25);
    expect(handle.setDrag).toHaveBeenCalledOnceWith(15);
  });

  it('ownerId handles populated, bare and missing owners', () => {
    expect(ownerId(null)).toBe('');
    expect(ownerId({ ...mockGame, owner: 'abc' })).toBe('abc');
    expect(ownerId({ ...mockGame, owner: { id: 'x' } })).toBe('x');
    expect(ownerId({ ...mockGame, owner: undefined })).toBe('');
  });
});
