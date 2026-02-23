import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { switchMap, take, takeUntil } from 'rxjs/operators';
import { RepoGameService } from 'src/app/services/game/game.services.service';
import { RepoUserService } from 'src/app/services/user/user.service';
import { Game } from 'src/app/types/types';

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailComponent implements OnInit, OnDestroy {
  game: Game = {} as Game;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly srv: RepoGameService,
    private readonly userSrv: RepoUserService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params
      .pipe(
        switchMap((params) => {
          const id = params['id'];
          const cached = this.srv['_games$'].value.find((g: Game) => g.id === id);
          if (cached) {
            this.game = cached;
            this.cdr.markForCheck();
          }
          return this.srv.loadGame(id);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (game) => {
          if (game) {
            this.game = game;
            this.cdr.markForCheck();
          }
        },
        error: () => {},
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addToCart(): void {
    const userId = this.userSrv.userLogged$.value.id;
    if (!userId) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.userSrv
      .getCurrentUser(userId)
      .pipe(take(1))
      .subscribe((user) => {
        const shopListIds = (user.shopList ?? []).map((g) => g.id as string);
        shopListIds.push(this.game.id as string);
        this.userSrv
          .updateUser(userId, { shopList: shopListIds } as Partial<Game>)
          .pipe(take(1))
          .subscribe(() => {
            this.router.navigateByUrl('/cart');
          });
      });
  }
}
