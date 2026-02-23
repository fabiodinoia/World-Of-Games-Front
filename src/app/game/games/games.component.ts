import { Component, OnInit, OnDestroy, NgZone, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { RepoGameService } from 'src/app/services/game/game.services.service';
import { RepoUserService } from 'src/app/services/user/user.service';
import { Game, gameCategory } from 'src/app/types/types';

interface CategoryOption {
  label: string;
  value: gameCategory | 'all';
}

@Component({
  selector: 'app-games',
  templateUrl: './games.component.html',
  styleUrls: ['./games.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamesComponent implements OnInit, OnDestroy {
  games: Game[] = [];
  selectedCategory: gameCategory | 'all' = 'all';
  isLoading = true;
  private readonly destroy$ = new Subject<void>();

  readonly categories: CategoryOption[] = [
    { label: 'All', value: 'all' },
    { label: 'MOBA', value: 'MOBA' },
    { label: 'RPG', value: 'RPG' },
    { label: 'MMO', value: 'MMO' },
    { label: 'FPS', value: 'FPS' },
    { label: 'Action', value: 'Action' },
  ];

  constructor(
    private readonly srv: RepoUserService,
    private readonly router: Router,
    private readonly gamesrv: RepoGameService,
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const categoryParam = this.route.snapshot.queryParamMap.get('category');
    if (categoryParam && this.categories.some((c) => c.value === categoryParam)) {
      this.selectedCategory = categoryParam as gameCategory;
    }
    this.loadGames();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCategorySelect(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.loadGames();
  }

  loadGames(): void {
    this.gamesrv
      .queryGame(this.selectedCategory)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (games) => {
          this.zone.run(() => {
            this.games = games;
            this.isLoading = false;
            this.cdr.markForCheck();
          });
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  addCart(game: Game): void {
    const userId = this.srv.userLogged$.value.id;
    if (!userId) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.srv
      .getCurrentUser(userId)
      .pipe(take(1))
      .subscribe((user) => {
        const shopListIds = (user.shopList ?? []).map((g) => g.id as string);
        shopListIds.push(game.id as string);
        this.srv
          .updateUser(userId, { shopList: shopListIds } as Partial<Game>)
          .pipe(take(1))
          .subscribe(() => {
            this.zone.run(() => {
              this.router.navigateByUrl('/cart');
            });
          });
      });
  }

  trackByGameId(_index: number, game: Game): string {
    return game.id ?? '';
  }
}
