import { Component, OnInit, NgZone, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { RepoUserService } from 'src/app/services/user/user.service';
import { Game, User } from 'src/app/types/types';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartComponent implements OnInit {
  currentUser$!: Observable<User>;

  constructor(
    private readonly srv: RepoUserService,
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUser();
  }

  getTotal(shopList: Game[] | undefined): number {
    if (!shopList) return 0;
    return shopList.reduce((sum, game) => sum + (game.price ?? 0), 0);
  }

  removeGame(game: Game): void {
    this.currentUser$.pipe(take(1)).subscribe((user: User) => {
      const shopListIds = (user.shopList ?? []).map((g) => g.id as string);
      const index = shopListIds.findIndex((id) => id === game.id);
      if (index === -1) return;

      shopListIds.splice(index, 1);
      const userId = user.id as string;
      this.srv
        .updateUser(userId, { shopList: shopListIds } as Partial<Game>)
        .pipe(take(1))
        .subscribe(() => {
          this.zone.run(() => {
            this.loadUser();
            this.cdr.markForCheck();
          });
        });
    });
  }

  private loadUser(): void {
    const userId = this.srv.userLogged$.value.id;
    if (userId) {
      this.currentUser$ = this.srv.getCurrentUser(userId);
      this.cdr.markForCheck();
    }
  }
}
