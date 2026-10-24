import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { RepoUserService } from 'src/app/services/user/user.service';
import { Game, User } from 'src/app/types/types';
import { IconComponent } from 'src/app/shared/icon/icon.component';
import { PriceComponent } from 'src/app/shared/price/price.component';
import { CoverMorphDirective } from 'src/app/shared/motion/cover-morph';
import { RouterLink } from '@angular/router';
import { AsyncPipe, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, PriceComponent, RouterLink, AsyncPipe, CurrencyPipe, CoverMorphDirective],
})
export class CartComponent implements OnInit {
  currentUser$!: Observable<User>;

  constructor(
    private readonly srv: RepoUserService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadUser();
  }

  getTotal(cart: Game[] | undefined): number {
    if (!cart) return 0;
    return cart.reduce((sum, game) => sum + (game.price ?? 0), 0);
  }

  removeGame(game: Game): void {
    this.currentUser$.pipe(take(1)).subscribe((user: User) => {
      const cartIds = (user.cart ?? []).map((g) => g.id as string);
      const index = cartIds.findIndex((id) => id === game.id);
      if (index === -1) return;

      cartIds.splice(index, 1);
      const userId = user.id as string;
      this.srv
        .updateUser(userId, { cart: cartIds })
        .pipe(take(1))
        .subscribe(() => {
          this.loadUser();
          this.cdr.markForCheck();
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
