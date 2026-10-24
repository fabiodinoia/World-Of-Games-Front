import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { ImageUploadService } from 'src/app/services/image/image-upload.service';
import { of, throwError } from 'rxjs';
import { AddComponent } from './add.component';
import { RepoGameService } from 'src/app/services/game/game.services.service';
import { RepoUserService } from 'src/app/services/user/user.service';
import {
  createGameServiceMock,
  createUserServiceMock,
  mockGame,
  mockLogged,
} from 'src/app/utils/mocks';

describe('AddComponent', () => {
  let fixture: ComponentFixture<AddComponent>;
  let component: AddComponent;
  let gameSrv: ReturnType<typeof createGameServiceMock>;
  let router: Router;

  const validGame = {
    gameName: 'Zelda',
    releaseDate: '2023-05-12',
    category: 'RPG',
    price: 59,
    description: 'Adventure',
  };

  let images: jasmine.SpyObj<ImageUploadService>;

  const setup = async (gameToEdit = {}) => {
    gameSrv = createGameServiceMock();
    images = jasmine.createSpyObj<ImageUploadService>('images', ['upload']);
    images.upload.and.resolveTo('https://cdn/cover.png');
    gameSrv.gameInfo$.next(gameToEdit as never);
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, AddComponent],
      providers: [
        provideRouter([]),
        { provide: RepoGameService, useValue: gameSrv },
        { provide: RepoUserService, useValue: createUserServiceMock() },
        { provide: ImageUploadService, useValue: images },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AddComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges();
  };

  it('starts in create mode with an invalid form', async () => {
    await setup();
    expect(component.isUpdate).toBeFalse();
    expect(component.newGame.invalid).toBeTrue();
  });

  it('does not submit an invalid form', async () => {
    await setup();
    await component.handleSubmit();
    expect(gameSrv.createGame).not.toHaveBeenCalled();
    expect(component.newGame.touched).toBeTrue();
  });

  it('requires a cover image (file or URL) to create', fakeAsync(() => {
    setup();
    tick();
    component.newGame.setValue({ ...validGame, img: '  ' });
    component.handleSubmit();
    tick();
    expect(component.imageMissing).toBeTrue();
    expect(gameSrv.createGame).not.toHaveBeenCalled();
  }));

  it('creates a game from a pasted image URL and opens its page', fakeAsync(() => {
    setup();
    tick();
    component.newGame.setValue({ ...validGame, img: 'https://img/x.png' });
    component.handleSubmit();
    tick();
    expect(gameSrv.createGame).toHaveBeenCalledWith(
      jasmine.objectContaining({ gameName: 'Zelda', img: 'https://img/x.png' }),
    );
    expect(component.isSuccess).toBeTrue();
    tick(1500);
    expect(router.navigate).toHaveBeenCalledWith(['/games', mockGame.id]);
  }));

  it('falls back to the profile when the API returns no id', fakeAsync(() => {
    setup();
    tick();
    gameSrv.createGame.and.returnValue(of({ ...mockGame, id: undefined }));
    component.newGame.setValue({ ...validGame, img: 'https://img/x.png' });
    component.handleSubmit();
    tick(1500);
    expect(router.navigate).toHaveBeenCalledWith([`/user/${mockLogged.id}`]);
  }));

  it('previews the pasted URL and flags one that fails to load', fakeAsync(() => {
    setup();
    tick();
    component.newGame.patchValue({ img: 'https://img/x.png' });
    expect(component.previewSrc).toBe('https://img/x.png');
    component.onPreviewError();
    expect(component.previewFailed).toBeTrue();
    component.newGame.patchValue({ img: 'https://img/y.png' });
    expect(component.previewFailed).toBeFalse();
  }));

  it('switches to update mode when a game is being edited', fakeAsync(() => {
    setup(mockGame);
    tick();
    expect(component.isUpdate).toBeTrue();
    expect(component.newGame.value.gameName).toBe(mockGame.gameName);
    component.handleSubmit();
    tick(1500);
    expect(gameSrv.updateGame).toHaveBeenCalledWith(
      mockGame.id as string,
      jasmine.any(Object),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/games', mockGame.id]);
  }));

  it('shows then clears the error state on failure', fakeAsync(() => {
    setup();
    tick();
    gameSrv.createGame.and.returnValue(throwError(() => new Error('x')));
    component.newGame.setValue({ ...validGame, img: 'https://img/x.png' });
    component.handleSubmit();
    tick();
    expect(component.isError).toBeTrue();
    tick(3000);
    expect(component.isError).toBeFalse();
  }));

  it('uploads the cover image before creating the game', fakeAsync(() => {
    setup();
    tick();
    const file = new File(['x'], 'cover.png', { type: 'image/png' });
    component.saveImage({ target: { files: [file] } } as unknown as Event);
    component.newGame.setValue({ ...validGame, img: '' });
    component.handleSubmit();
    tick();
    expect(images.upload).toHaveBeenCalledWith('games/Zelda', file);
    expect(gameSrv.createGame).toHaveBeenCalledWith(
      jasmine.objectContaining({ img: 'https://cdn/cover.png' }),
    );
    tick(1500);
  }));

  it('shows the error state when the upload fails', fakeAsync(() => {
    setup();
    tick();
    images.upload.and.rejectWith(new Error('no firebase'));
    const file = new File(['x'], 'cover.png', { type: 'image/png' });
    component.saveImage({ target: { files: [file] } } as unknown as Event);
    component.newGame.setValue({ ...validGame, img: '' });
    component.handleSubmit();
    tick();
    expect(component.isError).toBeTrue();
    expect(component.isSubmitting).toBeFalse();
    expect(gameSrv.createGame).not.toHaveBeenCalled();
    tick(3000);
  }));

  it('keeps the existing cover when editing without a new image', fakeAsync(() => {
    setup({ ...mockGame, img: 'https://cdn/old.png' });
    tick();
    expect(component.newGame.value.img).toBe('https://cdn/old.png');
    component.newGame.patchValue({ img: '' });
    component.handleSubmit();
    tick(1500);
    expect(gameSrv.updateGame).toHaveBeenCalledWith(
      mockGame.id as string,
      jasmine.objectContaining({ img: 'https://cdn/old.png' }),
    );
  }));
});
