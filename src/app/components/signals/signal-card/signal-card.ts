import {
  Component,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signal-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './signal-card.html',
})
export class SignalCardComponent {
  // input() — @Input()'ın signal tabanlı yeni hali (Angular 17.1+)
  // Fark: bu bir Signal, template'te title() şeklinde okunur
  title = input<string>('Ürün');
  basePrice = input<number>(100);

  // output() — @Output() EventEmitter'ın yerini alır
  removed = output<string>();

  // internal signal — bileşen içi durum
  quantity = signal(1);

  // computed() — input() ve signal() birlikte kullanılabilir!
  total = computed(() => this.basePrice() * this.quantity());

  increment(): void {
    this.quantity.update((q) => q + 1);
  }

  decrement(): void {
    this.quantity.update((q) => Math.max(1, q - 1));
  }

  remove(): void {
    this.removed.emit(this.title());
  }
}
