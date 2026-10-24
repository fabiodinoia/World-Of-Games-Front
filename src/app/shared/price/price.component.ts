import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Notched shelf-label price. Zero reads "Free" in mint. */
@Component({
  selector: 'app-price',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe],
  template: `<span class="price-tag" [class.price-tag--free]="isFree()" [class.price-tag--lg]="size() === 'lg'">
    @if (isFree()) { Free } @else { {{ value() | currency: 'EUR' }} }
  </span>`,
  styles: `:host { display: inline-flex; }`,
})
export class PriceComponent {
  readonly value = input<number | null | undefined>(0);
  readonly size = input<'md' | 'lg'>('md');
  protected readonly isFree = computed(() => !this.value());
}
