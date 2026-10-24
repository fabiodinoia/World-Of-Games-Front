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
import { RouterLink } from '@angular/router';
import { RepoGameService } from 'src/app/services/game/game.services.service';
import { PriceComponent } from 'src/app/shared/price/price.component';
import { CoverMorphDirective } from 'src/app/shared/motion/cover-morph';
import { RevealDirective } from 'src/app/shared/motion/reveal';
import { GAME_CATEGORIES, gameCategory } from 'src/app/types/categories';
import { Game } from 'src/app/types/types';
import { ImgSkeletonDirective } from 'src/app/shared/motion/img-skeleton';

interface Shelf {
  title: string;
  games: Game[];
  category?: gameCategory;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PriceComponent, CoverMorphDirective, RevealDirective, ImgSkeletonDirective],
})
export class HomeComponent implements OnInit {
  private readonly gameSrv = inject(RepoGameService);
  private readonly destroyRef = inject(DestroyRef);

  /** Public: the storefront loads without a session. */
  private readonly allGames = signal<Game[]>([]);
  readonly featuredGames = signal<Game[]>([]);
  readonly isLoading = signal(true);
  readonly loadFailed = signal(false);

  /** Newest release leads the page. */
  readonly spotlight = computed<Game | undefined>(() =>
    [...this.allGames()].sort((a, b) =>
      String(b.releaseDate).localeCompare(String(a.releaseDate)),
    )[0],
  );

  /** One shelf per genre with at least two games, plus free-to-play. */
  readonly shelves = computed<Shelf[]>(() => {
    const games = this.allGames();
    const byGenre = GAME_CATEGORIES.map((category) => ({
      title: category,
      category,
      games: games.filter((g) => g.category === category),
    })).filter((shelf) => shelf.games.length >= 2);
    const free = games.filter((g) => !g.price);
    return free.length ? [...byGenre, { title: 'Free to play', games: free }] : byGenre;
  });

  readonly categoryLinks: { label: string; value: gameCategory }[] =
    GAME_CATEGORIES.map((value) => ({ label: value, value }));

  readonly genreCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const g of this.allGames()) {
      counts.set(g.category, (counts.get(g.category) ?? 0) + 1);
    }
    return counts;
  });

  ngOnInit(): void {
    this.gameSrv
      .loadAllGames()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (games) => {
          this.allGames.set(games);
          this.featuredGames.set(games.slice(0, 4));
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.loadFailed.set(true);
        },
      });
  }

  yearOf(date: string): string {
    return String(date ?? '').slice(0, 4);
  }

  countLabel(category: string): string {
    const n = this.genreCounts().get(category) ?? 0;
    if (!n) return 'Nothing listed yet';
    return n === 1 ? '1 game' : `${n} games`;
  }
}
