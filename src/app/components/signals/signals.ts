import {
  Component,
  signal,
  computed,
  effect,
  inject,
  DestroyRef,
  linkedSignal,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toSignal,
  toObservable,
  rxResource,
} from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { interval } from 'rxjs';
import {
  map,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  filter,
  finalize,
} from 'rxjs/operators';
import { of } from 'rxjs';
import { SignalCardComponent } from './signal-card/signal-card';
import { API_CONFIG } from '../../core/api.config';

interface Product {
  id: number;
  title: string;
  price: number;
  thumbnail: string;
}

@Component({
  selector: 'app-signals',
  standalone: true,
  imports: [CommonModule, SignalCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './signals.html',
  styleUrl: './signals.css',
})
export class SignalsComponent {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  // ─── JUNIOR: signal() ────────────────────────────────────────────────────
  count = signal(0);
  theme = signal<'dark' | 'light'>('dark');

  increment(): void { this.count.update((c) => c + 1); }
  decrement(): void { this.count.update((c) => c - 1); }
  resetCount(): void { this.count.set(0); }

  // ─── JUNIOR: computed() ──────────────────────────────────────────────────
  cartItems = signal([
    { id: 1, name: 'Laptop', price: 2500 },
    { id: 2, name: 'Mouse', price: 150 },
    { id: 3, name: 'Klavye', price: 300 },
  ]);
  cartTotal = computed(() => this.cartItems().reduce((s, i) => s + i.price, 0));
  cartCount = computed(() => this.cartItems().length);

  removeCartItem(id: number): void {
    this.cartItems.update((items) => items.filter((i) => i.id !== id));
  }

  addCartItem(): void {
    const nextId = Math.max(...this.cartItems().map((i) => i.id), 0) + 1;
    const price = Math.floor(Math.random() * 500) + 50;
    this.cartItems.update((items) => [
      ...items,
      { id: nextId, name: `Ürün ${nextId}`, price },
    ]);
  }

  // ─── JUNIOR: effect() ────────────────────────────────────────────────────
  effectLog = signal<string[]>([]);

  constructor() {
    // effect() okuduğu sinyaller değiştiğinde otomatik yeniden çalışır
    effect(() => {
      const c = this.count();
      const t = this.theme();
      this.effectLog.update((log) => [
        ...log.slice(-7),
        `[effect] count=${c} · tema=${t}`,
      ]);
    });

    // ─── MID: toObservable() — signal → observable → pipe ────────────────
    toObservable(this.searchQuery)
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        filter((q) => q.length > 1),
        switchMap((q) => {
          this.searchLoading.set(true);
          return this.http
            .get<any>(`${API_CONFIG.baseUrl}/products/search?q=${q}`)
            .pipe(
              map((res) => (res.products as Product[]) ?? []),
              catchError(() => of([] as Product[])),
              finalize(() => this.searchLoading.set(false)),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((results) => this.searchResults.set(results));
  }

  toggleTheme(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  // ─── MID: toSignal() — observable → signal ───────────────────────────────
  // interval Observable'ı signal'a dönüştür — async pipe gerekmez
  private ticker$ = interval(1000).pipe(
    map((n) => {
      const now = new Date();
      return `Tick #${n + 1} — ${now.toLocaleTimeString('tr-TR')}`;
    }),
  );
  tickerSignal = toSignal(this.ticker$, { initialValue: 'Başlıyor...' });

  // HTTP Observable → Signal (toSignal otomatik abone/abonelik iptal yapar)
  topProducts = toSignal(
    this.http.get<any>(`${API_CONFIG.baseUrl}/products?limit=4`).pipe(
      map((res) => res.products as Product[]),
      catchError(() => of([] as Product[])),
    ),
    { initialValue: [] as Product[] },
  );

  // ─── MID: toObservable() alanları ────────────────────────────────────────
  searchQuery = signal('');
  searchResults = signal<Product[]>([]);
  searchLoading = signal(false);
  // (pipeline constructor'da kuruldu)

  // ─── MID: input() / output() — child bileşen demo ───────────────────────
  cardProducts = signal([
    { id: 1, name: 'MacBook Pro', price: 45000 },
    { id: 2, name: 'iPad', price: 18000 },
    { id: 3, name: 'AirPods', price: 4500 },
  ]);
  removedLog = signal<string[]>([]);

  onCardRemoved(name: string): void {
    this.cardProducts.update((p) => p.filter((i) => i.name !== name));
    this.removedLog.update((l) => [...l, `"${name}" kaldırıldı`]);
  }

  // ─── SENIOR: linkedSignal() — Angular 19+ ───────────────────────────────
  categories = ['smartphones', 'laptops', 'fragrances', 'skincare'];
  selectedCategory = signal('smartphones');

  // linkedSignal: selectedCategory değişince currentPage otomatik 1'e döner
  // ama manuel olarak da güncellenebilir (normal signal gibi)
  currentPage = linkedSignal(() => {
    this.selectedCategory(); // bağımlılık takibi
    return 1; // kategori değişince sıfırla
  });

  nextPage(): void { this.currentPage.update((p) => p + 1); }
  prevPage(): void { this.currentPage.update((p) => Math.max(1, p - 1)); }

  // ─── SENIOR: rxResource() — Angular 19+ ─────────────────────────────────
  // Reaktif HTTP kaynağı: request sinyalleri değişince otomatik yeni istek atar
  productsResource = rxResource<Product[], { category: string; skip: number }>({
    params: () => ({
      category: this.selectedCategory(),
      skip: (this.currentPage() - 1) * 4,
    }),
    stream: ({ params: { category, skip } }) =>
      this.http
        .get<any>(
          `${API_CONFIG.baseUrl}/products/category/${category}?limit=4&skip=${skip}`,
        )
        .pipe(map((res) => res.products as Product[])),
  });

  // ─── Kod snippet'leri (template'te {} olmaz) ─────────────────────────────
  readonly snippetSignal = `// signal() — yazılabilir reaktif değer
const count = signal(0);
count.set(5);              // doğrudan ata
count.update(c => c + 1); // önceki değere göre güncelle
count();                   // oku → 6

// Zone.js'e gerek yok, değişimler otomatik takip edilir`;

  readonly snippetComputed = `// computed() — türetilmiş, memoize edilmiş, salt-okunur
const cartTotal = computed(() =>
  cartItems().reduce((s, i) => s + i.price, 0)
);
// cartItems() DEĞİŞMEDEN yeniden hesaplanmaz (memoization)
// Observable'daki map() gibi, ama Signal için`;

  readonly snippetEffect = `// effect() — reaktif yan etki
effect(() => {
  const theme = this.theme(); // bağımlılık olarak takip edilir
  document.body.dataset['theme'] = theme;
  // theme() her değiştiğinde otomatik yeniden çalışır
});
// Cleanup için: effect(() => { ...; return () => cleanup(); })`;

  readonly snippetToSignal = `// toSignal() — Observable'ı Signal'a çevir
const products = toSignal(
  http.get('/products').pipe(map(r => r.products)),
  { initialValue: [] }
);

// Template'te: {{ products().length }} ürün
// async pipe yok, subscribe() yok, unsubscribe() yok!
// toSignal, bileşen destroy olunca otomatik iptal eder`;

  readonly snippetToObservable = `// toObservable() — Signal'ı Observable'a çevir
// Ne zaman? Signal'a debounce/switchMap gibi operatörler uygulamak istediğinde

const query = signal('');
toObservable(query).pipe(
  debounceTime(400),        // 400ms bekle
  distinctUntilChanged(),   // aynı değerse geç
  switchMap(q => http.get('/search?q=' + q))
).subscribe(r => results.set(r));`;

  readonly snippetInput = `// input() — @Input()'ın signal tabanlı yeni hali (Angular 17.1+)
@Component({ selector: 'app-card' })
class CardComponent {
  title     = input<string>('Default'); // opsiyonel
  basePrice = input.required<number>(); // zorunlu
  removed   = output<string>();         // @Output() yerine

  // input() sinyalleri computed() içinde kullanılabilir!
  total = computed(() => basePrice() * quantity());
}

// Ebeveyn template:
// <app-card [title]="name" [basePrice]="price" (removed)="onRemove($event)" />`;

  readonly snippetLinkedSignal = `// linkedSignal() — türetilmiş AMA yazılabilir (Angular 19+)
const category = signal('phones');
const page = linkedSignal(() => {
  category(); // bağımlılık
  return 1;   // kategori değişince sıfırla
});

page.update(p => p + 1); // sayfa 2
category.set('laptops');  // page OTOMATİK 1'e döner!
// Normal computed() yazmak gibi, ama .set()/.update() de çalışır`;

  readonly snippetRxResource = `// rxResource() — reaktif HTTP kaynağı (Angular 19+)
productsResource = rxResource({
  params: () => ({               // reaktif parametreler (signal)
    category: this.selectedCategory(),
    skip: (this.currentPage() - 1) * 4,
  }),
  stream: ({ params }) =>        // params değişince otomatik çağrılır
    http.get('/products/category/' + params.category),
});

// productsResource.value()     → Signal<Product[] | undefined>
// productsResource.isLoading() → Signal<boolean>
// productsResource.error()     → Signal<unknown>
// productsResource.reload()    → manuel yenile`;
}
