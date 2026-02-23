import { Component, OnDestroy, NgZone, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RepoUserService } from 'src/app/services/user/user.service';
import { Login } from 'src/app/types/types';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnDestroy {
  login: FormGroup;
  isSuccess = false;
  isError = false;
  isSubmitting = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly form: FormBuilder,
    private readonly srv: RepoUserService,
    private readonly router: Router,
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.login = form.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  handleSubmit(): void {
    if (this.login.invalid) {
      this.login.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.isError = false;
    this.cdr.markForCheck();

    const credentials: Login = {
      email: this.login.value.email,
      password: this.login.value.password,
    };

    this.srv
      .loginUser(credentials)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.isSuccess = true;
          this.cdr.markForCheck();
          setTimeout(() => {
            this.isSuccess = false;
            this.zone.run(() => {
              this.router.navigate(['/games']);
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
          this.login.reset();
        },
      });
  }
}
