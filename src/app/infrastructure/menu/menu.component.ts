import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RepoUserService } from 'src/app/services/user/user.service';
import { MenuItems } from 'src/app/types/types';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuComponent {
  isButtonClicked = false;
  btns: MenuItems[];

  constructor(private readonly srv: RepoUserService) {
    this.btns = [
      { path: 'games', label: 'Home', icon: 'home' },
      { path: 'cart', label: 'Cart', icon: 'shopping_cart' },
      { path: 'games/create', label: 'Add', icon: 'add_circle_outline' },
      { path: 'account', label: 'Account', icon: 'person' },
    ];
  }

  getPath(btn: MenuItems): string {
    if (btn.path === 'account') {
      const userId = this.srv.userLogged$.value.id;
      return userId ? `user/${userId}` : 'login';
    }
    return btn.path;
  }

  onClickButton(): void {
    this.isButtonClicked = true;
    setTimeout(() => {
      this.isButtonClicked = false;
    }, 900);
  }
}
