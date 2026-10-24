import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { RepoUserService } from 'src/app/services/user/user.service';
import { currentUrl } from '../navigation';
import { gameCategory } from 'src/app/types/categories';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class FooterComponent {
  private readonly loggedUser = toSignal(inject(RepoUserService).userLogged$, {
    requireSync: true,
  });

  readonly genres: readonly gameCategory[] = ['Action', 'RPG', 'Sports', 'Indie'];
  readonly currentPage = currentUrl();
  readonly isLogged = computed(() => !!this.loggedUser()?.id);
}
