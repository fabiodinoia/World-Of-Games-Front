import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RepoGameService } from 'src/app/services/game/game.services.service';
import { RepoUserService } from 'src/app/services/user/user.service';
import { Game } from 'src/app/types/types';
import { GAME_CATEGORIES } from 'src/app/types/categories';
import { ImageUploadService } from 'src/app/services/image/image-upload.service';
import { IconComponent } from 'src/app/shared/icon/icon.component';
import { PriceComponent } from 'src/app/shared/price/price.component';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ReactiveFormsModule, RouterLink, IconComponent, PriceComponent],
})
export class AddComponent implements OnInit, OnDestroy {
  newGame: FormGroup;
  isSuccess = false;
  isError = false;
  isUpdate = false;
  isSubmitting = false;
  imageMissing = false;
  gameToUpdate: Game | undefined;
  readonly categories = GAME_CATEGORIES;

  /** What the live preview shows: the chosen file, else the pasted URL. */
  previewSrc = '';
  previewFailed = false;
  fileName = '';

  private readonly images = inject(ImageUploadService);
  private gameImg = new File([], '');
  private fileUrl = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly form: FormBuilder,
    private readonly srv: RepoGameService,
    private readonly userSrv: RepoUserService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.newGame = form.group({
      gameName: ['', Validators.required],
      releaseDate: ['', Validators.required],
      category: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(1.0)]],
      description: '',
      img: '',
    });
  }

  ngOnInit(): void {
    this.gameToUpdate = this.srv.gameInfo$.value;
    if (this.gameToUpdate?.id) {
      this.newGame.patchValue({
        gameName: this.gameToUpdate.gameName,
        releaseDate: this.gameToUpdate.releaseDate,
        category: this.gameToUpdate.category,
        price: this.gameToUpdate.price,
        description: this.gameToUpdate.description,
        img: this.gameToUpdate.img ?? '',
      });
      this.isUpdate = true;
      this.srv.gameInfo$.next({} as Game);
    }
    this.syncPreview();
    this.newGame
      .get('img')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((url) => {
        // The control emits before the parent group's value updates.
        this.imageMissing = false;
        this.syncPreview(url);
      });
  }

  ngOnDestroy(): void {
    this.revokeFileUrl();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get value(): Partial<Game> {
    return this.newGame.value;
  }

  saveImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.gameImg = input.files[0];
      this.fileName = this.gameImg.name;
      this.imageMissing = false;
      this.revokeFileUrl();
      this.fileUrl = URL.createObjectURL(this.gameImg);
      this.syncPreview();
    }
  }

  clearFile(input: HTMLInputElement): void {
    input.value = '';
    this.gameImg = new File([], '');
    this.fileName = '';
    this.revokeFileUrl();
    this.syncPreview();
  }

  onPreviewError(): void {
    this.previewFailed = true;
    this.cdr.markForCheck();
  }

  async handleSubmit(): Promise<void> {
    if (this.newGame.invalid) {
      this.newGame.markAllAsTouched();
      return;
    }

    const pastedUrl = String(this.newGame.value.img ?? '').trim();
    // The API rejects games without a cover: require a file or a URL.
    this.imageMissing = !this.gameImg.name && !pastedUrl && !this.isUpdate;
    if (this.imageMissing) {
      this.cdr.markForCheck();
      return;
    }

    this.isSubmitting = true;
    this.isError = false;
    this.cdr.markForCheck();

    let gameImg = pastedUrl;
    let observable: Observable<Game>;

    if (this.gameImg.name) {
      try {
        gameImg = await this.images.upload(
          `games/${this.newGame.value.gameName}`,
          this.gameImg,
        );
      } catch {
        this.showError();
        return;
      }
    }

    const sendNewGame: Game = {
      gameName: this.newGame.value.gameName,
      releaseDate: this.newGame.value.releaseDate,
      category: this.newGame.value.category,
      price: this.newGame.value.price,
      description: this.newGame.value.description,
      img: gameImg || this.gameToUpdate?.img || '',
    };

    if (this.isUpdate) {
      observable = this.srv.updateGame(
        this.gameToUpdate?.id as string,
        sendNewGame,
      );
    } else {
      observable = this.srv.createGame(sendNewGame);
    }

    observable.pipe(takeUntil(this.destroy$)).subscribe({
      next: (saved) => {
        this.isSubmitting = false;
        this.isSuccess = true;
        this.cdr.markForCheck();
        // Land on the game's own page; fall back to the profile list.
        const gameId = this.isUpdate ? this.gameToUpdate?.id : saved?.id;
        const target = gameId
          ? ['/games', gameId]
          : [`/user/${this.userSrv.userLogged$.value.id}`];
        setTimeout(() => {
          this.isSuccess = false;
          this.router.navigate(target);
        }, 1200);
      },
      error: () => this.showError(),
      complete: () => {
        this.newGame.reset();
      },
    });
  }

  private syncPreview(url: unknown = this.newGame.value.img): void {
    this.previewSrc = this.fileUrl || String(url ?? '').trim();
    this.previewFailed = false;
    this.cdr.markForCheck();
  }

  private revokeFileUrl(): void {
    if (this.fileUrl) URL.revokeObjectURL(this.fileUrl);
    this.fileUrl = '';
  }

  private showError(): void {
    this.isSubmitting = false;
    this.isError = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.isError = false;
      this.cdr.markForCheck();
    }, 3000);
  }
}
