import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RepoUserService } from 'src/app/services/user/user.service';
import { Login } from 'src/app/types/types';
import { DEMO_CREDENTIALS } from './demo-credentials';
import { AuthArtComponent } from 'src/app/shared/auth-art/auth-art.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthArtComponent],
})
export class LoginComponent {
  private readonly srv = inject(RepoUserService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly login = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly isError = signal(false);
  readonly isSubmitting = signal(false);
  /** Which button started the sign-in, so only that one shows the busy bar. */
  readonly viaDemo = signal(false);
  readonly demoEmail = DEMO_CREDENTIALS.email;

  handleSubmit(): void {
    if (this.login.invalid) {
      this.login.markAllAsTouched();
      return;
    }
    this.viaDemo.set(false);
    this.signIn(this.login.getRawValue());
  }

  /** One-click sign-in with the seeded demo account. */
  loginAsDemo(): void {
    this.viaDemo.set(true);
    this.login.setValue({ ...DEMO_CREDENTIALS });
    this.signIn({ ...DEMO_CREDENTIALS });
  }

  private signIn(credentials: Login): void {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.isError.set(false);

    this.srv
      .loginUser(credentials)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // Go straight on: the button stays busy until the router's view transition swaps the
        // page, so there is no idle "signed in" moment and no form reset flashing underneath.
        next: () => {
          this.router
            .navigateByUrl(this.returnUrl(this.viaDemo() ? '/home' : '/games'))
            .finally(() => this.isSubmitting.set(false));
        },
        error: () => {
          this.isSubmitting.set(false);
          this.isError.set(true);
          setTimeout(() => this.isError.set(false), 3000);
        },
      });
  }

  /** Where to go after login: the guarded page that sent us here, else the given default. */
  private returnUrl(fallback: string): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    // Only allow in-app paths (no protocol-relative or absolute URLs).
    return url && url.startsWith('/') && !url.startsWith('//') ? url : fallback;
  }
}
