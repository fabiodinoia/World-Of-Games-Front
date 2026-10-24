import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Hand-drawn 24px stroke icons (no icon font, nothing fetched at runtime). */
const PATHS = {
  cart: 'M3 4h2.2l2.3 10.3a1 1 0 0 0 1 .7h8.8a1 1 0 0 0 1-.8L20 7.5H6M8.5 19.5a1 1 0 1 0 2 0a1 1 0 1 0-2 0M15.5 19.5a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
  'cart-add': 'M3 4h2.2l2.3 10.3a1 1 0 0 0 1 .7h8.8a1 1 0 0 0 1-.8L20 7.5H6M8.5 19.5a1 1 0 1 0 2 0a1 1 0 1 0-2 0M15.5 19.5a1 1 0 1 0 2 0a1 1 0 1 0-2 0M13 8.5v4M11 10.5h4',
  'arrow-left': 'M19 12H5M11 18l-6-6 6-6',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  user: 'M8 8a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 21c0-4 3.6-6 8-6s8 2 8 6',
  logout: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M14 9.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0',
  menu: 'M4 7h16M4 12h16M4 17h16',
  search: 'M5 11a6 6 0 1 0 12 0a6 6 0 1 0-12 0M15.5 15.5L20 20',
} as const;

export type IconName = keyof typeof PATHS;

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round" focusable="false"><path [attr.d]="d()" /></svg>`,
  styles: `
    :host { display: inline-block; width: 1.25em; height: 1.25em; flex-shrink: 0; }
    svg { display: block; width: 100%; height: 100%; }
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  protected readonly d = computed(() => PATHS[this.name()]);
}
