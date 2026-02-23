import { Component, OnInit, OnDestroy, inject, NgZone, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RepoGameService } from 'src/app/services/game/game.services.service';
import { RepoUserService } from 'src/app/services/user/user.service';
import { Game } from 'src/app/types/types';
import {
  getDownloadURL,
  ref,
  Storage,
  StorageReference,
  uploadBytes,
} from '@angular/fire/storage';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddComponent implements OnInit, OnDestroy {
  newGame: FormGroup;
  isSuccess = false;
  isError = false;
  isUpdate = false;
  isSubmitting = false;
  gameToUpdate: Game | undefined;
  private readonly storage = inject(Storage);
  private gameImg = new File([], '');
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly form: FormBuilder,
    private readonly srv: RepoGameService,
    private readonly userSrv: RepoUserService,
    private readonly router: Router,
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef
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
        img: '',
      });
      this.isUpdate = true;
      this.srv.gameInfo$.next({} as Game);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  saveImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.gameImg = input.files[0];
    }
  }

  async handleSubmit(): Promise<void> {
    if (this.newGame.invalid) {
      this.newGame.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.isError = false;
    this.cdr.markForCheck();

    let gameImg = '';
    let observable: Observable<Game>;

    if (this.gameImg.name) {
      const avatarRef = ref(this.storage, `games/${this.newGame.value.gameName}`);
      await this.uploadImage(avatarRef, this.gameImg);
      gameImg = await this.getImage(avatarRef);
    }

    const sendNewGame: Game = {
      gameName: this.newGame.value.gameName,
      releaseDate: this.newGame.value.releaseDate,
      category: this.newGame.value.category,
      price: this.newGame.value.price,
      description: this.newGame.value.description,
      img: gameImg,
    };

    if (this.isUpdate) {
      observable = this.srv.updateGame(this.gameToUpdate?.id as string, sendNewGame);
    } else {
      observable = this.srv.createGame(sendNewGame);
    }

    observable.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.isSuccess = true;
        this.cdr.markForCheck();
        const userId = this.userSrv.userLogged$.value.id;
        setTimeout(() => {
          this.isSuccess = false;
          this.zone.run(() => {
            this.router.navigate([`/user/${userId}`]);
          });
        }, 1500);
      },
      error: () => {
        this.isSubmitting = false;
        this.isError = true;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.isError = false;
          this.cdr.markForCheck();
        }, 3000);
      },
      complete: () => {
        this.newGame.reset();
      },
    });
  }

  private async uploadImage(storage: StorageReference, avatar: File): Promise<void> {
    await uploadBytes(storage, avatar);
  }

  private async getImage(storage: StorageReference): Promise<string> {
    return getDownloadURL(storage);
  }
}
