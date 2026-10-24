import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Observable } from 'rxjs';
import { RepoUserService } from 'src/app/services/user/user.service';
import { Game, User } from 'src/app/types/types';
import { Router, RouterLink } from '@angular/router';
import { RepoGameService } from 'src/app/services/game/game.services.service';
import { AsyncPipe } from '@angular/common';
import { ConfirmDialogComponent } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { IconComponent } from 'src/app/shared/icon/icon.component';
import { PriceComponent } from 'src/app/shared/price/price.component';
import { CoverMorphDirective } from 'src/app/shared/motion/cover-morph';
import { ImgSkeletonDirective } from 'src/app/shared/motion/img-skeleton';

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AsyncPipe, IconComponent, PriceComponent, ConfirmDialogComponent, CoverMorphDirective, ImgSkeletonDirective],
})
export class UserDetailComponent {
  private readonly srv = inject(RepoUserService);
  private readonly router = inject(Router);
  private readonly gamesrv = inject(RepoGameService);
  private readonly cdr = inject(ChangeDetectorRef);

  currentUser$: Observable<User> = this.srv.getCurrentUser(
    this.srv.userLogged$.value.id,
  );

  /** Listing waiting for delete confirmation. */
  readonly pendingGame = signal<Game | null>(null);
  readonly confirmAccount = signal(false);
  readonly isDeleting = signal(false);

  initial(user: User): string {
    return (user.name || user.email || '?').trim().charAt(0);
  }

  editGame(game: Game): void {
    this.gamesrv.gameInfo$.next(game);
    this.router.navigate(['/games/create']);
  }

  editUser(): void {
    this.router.navigate(['/register']);
  }

  cancelDialogs(): void {
    if (this.isDeleting()) return;
    this.pendingGame.set(null);
    this.confirmAccount.set(false);
  }

  deleteGame(game: Partial<Game>): void {
    this.isDeleting.set(true);
    this.gamesrv.deleteGame(game.id as string).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.pendingGame.set(null);
        this.currentUser$ = this.srv.getCurrentUser(
          this.srv.userLogged$.value.id,
        );
        this.cdr.markForCheck();
      },
      error: () => this.isDeleting.set(false),
    });
  }

  deleteUser(user: Partial<User>): void {
    this.isDeleting.set(true);
    this.srv.deleteUser(user.id as string).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.confirmAccount.set(false);
        this.srv.logout();
        this.router.navigate(['/']);
      },
      error: () => this.isDeleting.set(false),
    });
  }

  logoutUser(): void {
    this.srv.logout();
    this.router.navigate(['/']);
  }
}
