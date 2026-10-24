import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RepoUserService } from 'src/app/services/user/user.service';
import { User } from 'src/app/types/types';
import { ImageUploadService } from 'src/app/services/image/image-upload.service';
import { AuthArtComponent } from 'src/app/shared/auth-art/auth-art.component';
import { IconComponent } from 'src/app/shared/icon/icon.component';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ReactiveFormsModule, RouterLink, AuthArtComponent, IconComponent],
})
export class RegisterComponent implements OnInit, OnDestroy {
  newUser: FormGroup;
  isSuccess = false;
  isError = false;
  isUpdate = false;
  isSubmitting = false;
  avatarPreview: string | null = null;
  userToUpdate: User | undefined;
  private readonly images = inject(ImageUploadService);
  private userImg = new File([], '');
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly form: FormBuilder,
    private readonly srv: RepoUserService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.newUser = form.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      img: '',
    });
  }

  ngOnInit(): void {
    const currentUser = this.srv.currentUser$.value;
    if (currentUser?.id) {
      this.userToUpdate = currentUser;
      this.newUser.patchValue({
        name: this.userToUpdate.name,
        email: this.userToUpdate.email,
        password: '',
        img: '',
      });
      this.isUpdate = true;
      if (this.userToUpdate.img) {
        this.avatarPreview = this.userToUpdate.img;
      }
      this.newUser.get('password')?.clearValidators();
      this.newUser.get('password')?.updateValueAndValidity();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  saveImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.userImg = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.avatarPreview = reader.result as string;
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(this.userImg);
    }
  }

  async handleSubmit(): Promise<void> {
    if (this.newUser.invalid) {
      this.newUser.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.isError = false;
    this.cdr.markForCheck();

    let avatar = '';
    let observable: Observable<User>;

    if (this.userImg.name) {
      try {
        avatar = await this.images.upload(
          `avatars/${this.newUser.value.email}`,
          this.userImg,
        );
      } catch {
        this.showError();
        return;
      }
    }

    const sendNewUser: Pick<User, 'name' | 'email' | 'password' | 'img'> = {
      name: this.newUser.value.name,
      email: this.newUser.value.email,
      password: this.newUser.value.password,
      img: avatar || this.userToUpdate?.img || '',
    };

    if (this.isUpdate) {
      const { password, ...profile } = sendNewUser;
      // Blank password on edit means "keep the current one".
      observable = this.srv.updateUser(
        this.userToUpdate!.id as string,
        password ? { ...profile, password } : profile,
      );
    } else {
      observable = this.srv.registerUser(sendNewUser);
    }

    observable.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.isSuccess = true;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.isSuccess = false;
          if (this.isUpdate) {
            this.router.navigate([`/user/${this.userToUpdate!.id}`]);
          } else {
            this.router.navigate(['/login']);
          }
        }, 1500);
      },
      error: () => this.showError(),
      complete: () => {
        this.newUser.reset();
      },
    });
  }

  private showError(): void {
    this.isSubmitting = false;
    this.isError = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.isError = false;
      this.cdr.markForCheck();
    }, 3000);
  }
}
