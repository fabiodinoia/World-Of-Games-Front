import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, EMPTY, filter, switchMap } from 'rxjs';
import { RouterLink } from '@angular/router';
import { RepoUserService } from 'src/app/services/user/user.service';
import { IconComponent } from 'src/app/shared/icon/icon.component';
import { bumpCartBadge, CartFlightService } from 'src/app/shared/motion/cart-flight.service';
import { currentUrl } from '../navigation';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
})
export class HeaderComponent {
  private readonly users = inject(RepoUserService);
  private readonly loggedUser = toSignal(this.users.userLogged$, {
    requireSync: true,
  });
  private readonly currentUser = toSignal(this.users.currentUser$, {
    requireSync: true,
  });
  private readonly url = currentUrl();

  readonly userId = computed(() => this.loggedUser()?.id ?? '');
  readonly isLoggedIn = computed(() => !!this.userId());
  readonly userName = computed(() => this.currentUser()?.name ?? '');
  readonly initial = computed(() => (this.userName() || 'A').trim().charAt(0));
  readonly cartCount = computed(
    () => this.currentUser()?.cart?.length ?? 0,
  );
  readonly mobileMenuOpen = signal(false);

  constructor() {
    // After a reload only the token is restored: load the profile so the
    // account name and cart badge are right on every page.
    toObservable(this.userId)
      .pipe(
        distinctUntilChanged(),
        filter((id) => !!id && !this.users.currentUser$.value?.id),
        switchMap((id) =>
          this.users.getCurrentUser(id).pipe(
            catchError((error) => {
              // Stale/invalid session (498/403/404/500...): drop it quietly
              // and fall back to the logged-out UI.
              console.warn('Session restore failed, logging out:', error?.status ?? error);
              this.users.logout();
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();

    // One bump on the cart badge when an added game lands in it.
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    inject(CartFlightService)
      .landed$.pipe(takeUntilDestroyed())
      .subscribe(() => bumpCartBadge(host.querySelector<HTMLElement>('[data-cart-target]')));

    // Close the mobile menu whenever navigation completes.
    effect(() => {
      this.url();
      this.mobileMenuOpen.set(false);
    });
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  isActive(path: string): boolean {
    return this.url().startsWith(path);
  }
}
