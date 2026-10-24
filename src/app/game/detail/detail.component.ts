import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  LOCALE_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, map, switchMap, tap } from 'rxjs';
import { RepoGameService } from 'src/app/services/game/game.services.service';
import { RepoUserService } from 'src/app/services/user/user.service';
import { ConfirmDialogComponent } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { formatReleaseDate } from 'src/app/shared/format/release-date';
import { IconComponent } from 'src/app/shared/icon/icon.component';
import { PriceComponent } from 'src/app/shared/price/price.component';
import { CartFlightService } from 'src/app/shared/motion/cart-flight.service';
import { SceneFactory, SceneHandle } from 'src/app/shared/three/scene-types';
import type { BackInfo } from 'src/app/shared/three/scenes/game-case.scene';
import { ThreeHostComponent } from 'src/app/shared/three/three-host.component';
import { Game } from 'src/app/types/types';
import { ImgSkeletonDirective } from 'src/app/shared/motion/img-skeleton';

/** Mirrors the SCSS `max-width: 720px` breakpoint that hides the 3D case. */
export const DESKTOP_QUERY = '(min-width: 721px)';

/** Resolves `game.owner` (populated object or bare id) to the owner's id. */
export const ownerId = (game: Game | null): string => {
  const owner = game?.owner;
  if (!owner) return '';
  if (typeof owner === 'string') return owner;
  return owner.id ?? (owner as { _id?: string })._id ?? '';
};

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, PriceComponent, ConfirmDialogComponent, ThreeHostComponent, ImgSkeletonDirective],
})
export class DetailComponent {
  private readonly gameSrv = inject(RepoGameService);
  private readonly userSrv = inject(RepoUserService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly cartFx = inject(CartFlightService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  /** Same pipe/locale as `<app-price>`, so the box shows the exact on-page price string. */
  private readonly currency = new CurrencyPipe(inject(LOCALE_ID));

  readonly game = signal<Game | null>(null);
  readonly notFound = signal(false);
  readonly isDeleting = signal(false);
  readonly confirmOpen = signal(false);
  readonly isAdding = signal(false);
  readonly justAdded = signal(false);

  /** Lazy chunk: three.js only loads when the 3D case actually mounts. */
  protected readonly loadCase = (): Promise<SceneFactory> =>
    import('src/app/shared/three/scenes/game-case.scene').then(
      (m) => (canvas: HTMLCanvasElement) =>
        m.createGameCaseScene(canvas, this.game()?.img, this.backInfo() ?? undefined),
    );
  /** Set once the scene is live; until then drags are ignored. */
  protected readonly caseHandle = signal<SceneHandle | null>(null);
  /** The 3D case only mounts on desktop widths, so mobile never loads three.js or a WebGL context. */
  protected readonly isDesktop = signal(false);
  private dragX: number | null = null;

  private readonly loggedUser = toSignal(this.userSrv.userLogged$, {
    requireSync: true,
  });

  /** Copy for the generated back-of-box texture; price mirrors `<app-price>` ("Free" or `€29.99`). */
  private readonly backInfo = computed((): BackInfo | null => {
    const game = this.game();
    if (!game) return null;
    return {
      title: game.gameName ?? '',
      description: game.description ?? '',
      genre: game.category ?? '',
      price: game.price ? (this.currency.transform(game.price, 'EUR') ?? '') : 'Free',
    };
  });

  readonly releaseDate = computed(() => formatReleaseDate(this.game()?.releaseDate));

  /** Seller name when the API populated the owner. */
  readonly sellerName = computed(() => {
    const owner = this.game()?.owner;
    return owner && typeof owner === 'object' ? (owner.name ?? '') : '';
  });

  /** Only the owner gets Edit/Delete (the API answers 403 to anyone else). */
  readonly isOwner = computed(() => {
    const userId = this.loggedUser().id;
    return !!userId && ownerId(this.game()) === userId;
  });

  constructor() {
    if (typeof matchMedia === 'function') {
      const desktopQuery = matchMedia(DESKTOP_QUERY);
      this.isDesktop.set(desktopQuery.matches);
      const onChange = (ev: MediaQueryListEvent): void => {
        if (!ev.matches) this.caseHandle.set(null); // three-host unmounts and disposes the scene
        this.isDesktop.set(ev.matches);
      };
      desktopQuery.addEventListener('change', onChange);
      inject(DestroyRef).onDestroy(() => desktopQuery.removeEventListener('change', onChange));
    }

    inject(ActivatedRoute)
      .params.pipe(
        map((params) => params['id'] as string),
        tap((id) => {
          this.notFound.set(false);
          // Show the cached catalog entry instantly, then refresh from the API.
          this.game.set(this.gameSrv.cachedGame(id) ?? null);
        }),
        switchMap((id) =>
          this.gameSrv.loadGame(id).pipe(
            catchError(() => {
              if (!this.game()) this.notFound.set(true);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((game) => {
        if (game) this.game.set(game);
      });

    effect(() => {
      const name = this.game()?.gameName;
      if (name) this.title.setTitle(`${name} | World of Games`);
    });
  }

  addToCart(event?: Event): void {
    const game = this.game();
    if (!game) return;
    if (!this.loggedUser().id) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }
    this.cartFx.press(event?.currentTarget as HTMLElement | null | undefined);
    this.isAdding.set(true);
    this.userSrv.addToCart(game.id as string).subscribe({
      next: () => {
        // Stay on the page; the cover lands in the header cart, whose count is the feedback.
        this.cartFx.fly(this.host.querySelector<HTMLElement>('.detail-page__cover img'));
        this.isAdding.set(false);
        this.justAdded.set(true);
        setTimeout(() => this.justAdded.set(false), 1500);
      },
      error: () => this.isAdding.set(false),
    });
  }

  onCaseDragStart(ev: PointerEvent): void {
    // Primary button only, and only once the scene is live (no needless capture on mobile/poster).
    if (ev.button !== 0 || !this.caseHandle()) return;
    this.dragX = ev.clientX;
    // Capture on the cover so pointerup still lands here when released outside it.
    const cover = ev.currentTarget as HTMLElement | null;
    try {
      cover?.setPointerCapture?.(ev.pointerId);
    } catch {
      // Synthetic events carry no active pointer: capture is best-effort.
    }
  }

  onCaseDrag(ev: PointerEvent): void {
    const handle = this.caseHandle();
    if (this.dragX === null || !handle) return;
    const dx = ev.clientX - this.dragX;
    if (dx === 0) return; // setDrag(0) means "resume idle": reserve it for the drag end
    handle.setDrag(dx);
    this.dragX = ev.clientX;
  }

  /** Always ends with setDrag(0): the scene resumes its idle spin on that signal. */
  onCaseDragEnd(ev?: PointerEvent): void {
    const cover = ev?.currentTarget as HTMLElement | null | undefined;
    if (ev && cover?.hasPointerCapture?.(ev.pointerId)) cover.releasePointerCapture(ev.pointerId);
    this.dragX = null;
    this.caseHandle()?.setDrag(0);
  }

  editGame(): void {
    const game = this.game();
    if (!game || !this.isOwner()) return;
    this.gameSrv.gameInfo$.next(game);
    this.router.navigate(['/games/create']);
  }

  /** Opens the confirmation dialog; nothing is deleted until it's accepted. */
  requestDelete(): void {
    if (this.isOwner()) this.confirmOpen.set(true);
  }

  cancelDelete(): void {
    if (!this.isDeleting()) this.confirmOpen.set(false);
  }

  deleteGame(): void {
    const game = this.game();
    if (!game || !this.isOwner() || this.isDeleting()) return;
    this.isDeleting.set(true);
    this.gameSrv.deleteGame(game.id as string).subscribe({
      next: () => {
        this.confirmOpen.set(false);
        this.router.navigate(['/games']);
      },
      error: () => this.isDeleting.set(false),
    });
  }
}
