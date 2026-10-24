import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, provideRouter } from '@angular/router';
import { ImageUploadService } from 'src/app/services/image/image-upload.service';
import { RepoUserService } from 'src/app/services/user/user.service';
import { User } from 'src/app/types/types';
import { createUserServiceMock, mockUser } from 'src/app/utils/mocks';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let srv: ReturnType<typeof createUserServiceMock>;
  let router: Router;

  let images: jasmine.SpyObj<ImageUploadService>;

  const setup = async (current: Partial<User> = {}) => {
    srv = createUserServiceMock();
    images = jasmine.createSpyObj<ImageUploadService>('images', ['upload']);
    images.upload.and.resolveTo('https://cdn/avatar.png');
    srv.currentUser$.next(current as User);
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: RepoUserService, useValue: srv },
        { provide: ImageUploadService, useValue: images },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges();
  };

  it('does not register with an invalid form', async () => {
    await setup();
    await component.handleSubmit();
    expect(srv.registerUser).not.toHaveBeenCalled();
  });

  it('registers a new user and goes to login', fakeAsync(() => {
    setup();
    tick();
    component.newUser.setValue({
      name: 'Neo',
      email: 'neo@matrix.dev',
      password: 'secret123',
      img: '',
    });
    component.handleSubmit();
    tick();
    expect(srv.registerUser).toHaveBeenCalledWith(
      jasmine.objectContaining({ email: 'neo@matrix.dev', img: '' }),
    );
    tick(1500);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('edits the current user when one is loaded', fakeAsync(() => {
    setup(mockUser);
    tick();
    expect(component.isUpdate).toBeTrue();
    expect(component.newUser.value.email).toBe(mockUser.email);
    component.handleSubmit();
    tick(1500);
    expect(srv.updateUser).toHaveBeenCalledWith(
      mockUser.id as string,
      jasmine.any(Object),
    );
    expect(router.navigate).toHaveBeenCalledWith([`/user/${mockUser.id}`]);
  }));

  it('uploads the avatar before registering', fakeAsync(() => {
    setup();
    tick();
    const file = new File(['x'], 'me.png', { type: 'image/png' });
    component.saveImage({ target: { files: [file] } } as unknown as Event);
    component.newUser.setValue({
      name: 'Neo',
      email: 'neo@matrix.dev',
      password: 'secret123',
      img: '',
    });
    component.handleSubmit();
    tick();
    expect(images.upload).toHaveBeenCalledWith('avatars/neo@matrix.dev', file);
    expect(srv.registerUser).toHaveBeenCalledWith(
      jasmine.objectContaining({ img: 'https://cdn/avatar.png' }),
    );
    tick(1500);
  }));

  it('does not send a blank password or wipe the avatar on edit', fakeAsync(() => {
    setup({ ...mockUser, img: 'https://cdn/old.png' });
    tick();
    component.handleSubmit();
    tick(1500);
    const sent = srv.updateUser.calls.mostRecent().args[1];
    expect(sent.password).toBeUndefined();
    expect(sent.img).toBe('https://cdn/old.png');
  }));
});
