import { Component } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  imports: [HeaderComponent, FooterComponent],
})
export class LayoutComponent {
  /**
   * With <base href="/"> a bare "#main" link resolves to "/#main" and would
   * navigate home, so move focus to the main landmark in place instead.
   */
  skipToMain(event: Event, main: HTMLElement): void {
    event.preventDefault();
    main.focus();
    main.scrollIntoView();
  }
}
