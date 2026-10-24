import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RepoGameService } from 'src/app/services/game/game.services.service';
import { RepoUserService } from 'src/app/services/user/user.service';
import { IconComponent } from 'src/app/shared/icon/icon.component';
import { PriceComponent } from 'src/app/shared/price/price.component';
import { CartFlightService } from 'src/app/shared/motion/cart-flight.service';
import { CoverMorphDirective } from 'src/app/shared/motion/cover-morph';
import { RevealDirective } from 'src/app/shared/motion/reveal';
import { GAME_CATEGORIES, gameCategory } from 'src/app/types/categories';
import { Game } from 'src/app/types/types';

type CategoryFilter = gameCategory | 'all';

interface CategoryOption {
  label: string;
  value: CategoryFilter;
}

@Component({
  selector: 'app-games',
  templateUrl: './games.component.html',
  styleUrls: ['./games.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, PriceComponent, CoverMorphDirective, RevealDirective],
})
export class GamesComponent implements OnInit {
  private readonly userSrv = inject(RepoUserService);
  private readonly gameSrv = inject(RepoGameService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cartFx = inject(CartFlightService);

  readonly games = signal<Game[]>([]);
  readonly selectedCategory = signal<CategoryFilter>('all');
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);
  readonly skeletons = Array.from({ length: 10 }, (_, i) => i);
  private lastLoaded: CategoryFilter | null = null;

  readonly categories: CategoryOption[] = [
    { label: 'All', value: 'all' },
    ...GAME_CATEGORIES.map((value) => ({ label: value, value })),
  ];

  readonly heading = computed(() =>
    this.selectedCategory() === 'all' ? 'All games' : `${this.selectedCategory()} games`,
  );

  readonly resultLabel = computed(() => {
    const n = this.games().length;
    return n === 1 ? '1 game' : `${n} games`;
  });

  ngOnInit(): void {
    // The URL is the source of truth, so genre links from the header, footer
    // or home page work even while the catalog is already open.
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const param = params.get('category');
        const match = this.categories.find((c) => c.value === param);
        const category = match?.value ?? 'all';
        if (category === this.lastLoaded) return;
        this.selectedCategory.set(category);
        this.loadGames();
      });
  }

  selectCategory(category: CategoryFilter): void {
    this.selectedCategory.set(category);
    this.loadGames();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: category === 'all' ? null : category },
      replaceUrl: true,
    });
  }

  loadGames(): void {
    this.lastLoaded = this.selectedCategory();
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.gameSrv
      .queryGame(this.selectedCategory())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (games) => {
          this.games.set(games);
          this.isLoading.set(false);
        },
        error: () => {
          this.games.set([]);
          this.isLoading.set(false);
          this.loadFailed.set(true);
        },
      });
  }

  addCart(game: Game, event?: Event): void {
    const userId = this.userSrv.userLogged$.value.id;
    if (!userId) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    const button = event?.currentTarget as HTMLElement | null | undefined;
    this.cartFx.press(button);
    const cover = button?.closest('.game-card')?.querySelector<HTMLElement>('.cover img');

    this.userSrv.addToCart(game.id as string).subscribe(() => {
      // Stay in the store; the cover lands in the header cart, whose count is the feedback.
      this.cartFx.fly(cover);
    });
  }
}
