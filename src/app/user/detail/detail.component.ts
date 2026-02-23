import { Component, ChangeDetectionStrategy, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { RepoUserService } from 'src/app/services/user/user.service';
import { Game, User } from 'src/app/types/types';
import { Router } from '@angular/router';
import { RepoGameService } from 'src/app/services/game/game.services.service';

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailComponent {
  currentUser$: Observable<User>;

  constructor(
    private readonly srv: RepoUserService,
    private readonly router: Router,
    private readonly gamesrv: RepoGameService,
    private readonly zone: NgZone
  ) {
    this.currentUser$ = this.srv.getCurrentUser(this.srv.userLogged$.value.id);
  }

  editGame(game: Game): void {
    this.gamesrv.gameInfo$.next(game);
    this.zone.run(() => {
      this.router.navigate(['/games/create']);
    });
  }

  editUser(): void {
    this.zone.run(() => {
      this.router.navigate(['/register']);
    });
  }

  deleteGame(game: Partial<Game>): void {
    this.gamesrv.deleteGame(game.id as string).subscribe(() => {
      this.currentUser$ = this.srv.getCurrentUser(
        this.srv.userLogged$.value.id
      );
    });
  }

  deleteUser(user: Partial<User>): void {
    this.srv.deleteUser(user.id as string).subscribe(() => {
      this.srv.logout();
      this.zone.run(() => {
        this.router.navigate(['/home']);
      });
    });
  }

  logoutUser(): void {
    this.srv.logout();
    this.zone.run(() => {
      this.router.navigate(['/home']);
    });
  }
}
