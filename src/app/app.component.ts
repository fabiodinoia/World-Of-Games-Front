import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutComponent } from './infrastructure/layout/layout.component';
import { RepoUserService } from './services/user/user.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [LayoutComponent, RouterOutlet],
  host: { '(document:visibilitychange)': 'onVisibilityChange()' },
})
export class AppComponent implements OnInit {
  private readonly userService = inject(RepoUserService);

  ngOnInit(): void {
    this.userService.restoreSession();
  }

  /** Lets CSS pause idle loops (hero backdrop drift) while the tab is hidden. */
  protected onVisibilityChange(): void {
    document.documentElement.toggleAttribute('data-tab-hidden', document.hidden);
  }
}
