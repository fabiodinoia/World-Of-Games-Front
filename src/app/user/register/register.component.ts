import { Component, OnInit, OnDestroy, inject, NgZone, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RepoUserService } from 'src/app/services/user/user.service';
import { User } from 'src/app/types/types';
import {
  Storage,
  getDownloadURL,
  ref,
  StorageReference,
  uploadBytes,
} from '@angular/fire/storage';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent implements OnInit, OnDestroy {
  newUser: FormGroup;
  isSuccess = false;
  isError = false;
  isUpdate = false;
  isSubmitting = false;
  avatarPreview: string | null = null;
  userToUpdate: User | undefined;
  private readonly storage = inject(Storage);
  private userImg = new File([], '');
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly form: FormBuilder,
    private readonly srv: RepoUserService,
    private readonly router: Router,
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.newUser = form.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
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
      const avatarRef = ref(this.storage, `avatars/${this.newUser.value.email}`);
      await this.uploadImage(avatarRef, this.userImg);
      avatar = await this.getImage(avatarRef);
    }

    const sendNewUser: User = {
      name: this.newUser.value.name,
      email: this.newUser.value.email,
      password: this.newUser.value.password,
      img: avatar,
    };

    if (this.isUpdate) {
      observable = this.srv.updateUser(
        this.userToUpdate!.id as string,
        sendNewUser
      ) as Observable<User>;
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
          this.zone.run(() => {
            if (this.isUpdate) {
              this.router.navigate([`/user/${this.userToUpdate!.id}`]);
            } else {
              this.router.navigate(['/login']);
            }
          });
        }, 1500);
      },
      error: () => {
        this.isSubmitting = false;
        this.isError = true;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.isError = false;
          this.cdr.markForCheck();
        }, 3000);
      },
      complete: () => {
        this.newUser.reset();
      },
    });
  }

  private async uploadImage(storage: StorageReference, avatar: File): Promise<void> {
    await uploadBytes(storage, avatar);
  }

  private async getImage(storage: StorageReference): Promise<string> {
    return getDownloadURL(storage);
  }
}
