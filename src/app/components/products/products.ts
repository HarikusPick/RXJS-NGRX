import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {
  BehaviorSubject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  Observable,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { API_CONFIG } from '../../core/api.config';

interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  thumbnail: string;
  brand?: string;
  category: string;
}

interface ProductsVm {
  products: Product[];
  total: number;
  loading: boolean;
  error: string | null;
}

// BehaviorSubject: anlık değeri tutar, yeni abone olunduğunda son değeri hemen verir
const _user$ = new BehaviorSubject<{ name: string } | null>(null);
const _authLoading$ = new BehaviorSubject<boolean>(false);

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class ProductsComponent {
  private http = inject(HttpClient);

  // FormControl — input değişikliklerini observable olarak yakala
  searchQuery = new FormControl('', { nonNullable: true });

  // BehaviorSubject'ten readonly observable'a dönüştür (dışarıdan next() çağrılamasın)
  user$ = _user$.asObservable();
  authLoading$ = _authLoading$.asObservable();

  // Ana observable pipeline:
  // valueChanges → startWith → debounce → distinct → switchMap(HTTP) → map/catchError
  products$: Observable<ProductsVm> = this.searchQuery.valueChanges.pipe(
    startWith(''),              // abonelik başlar başlamaz ilk değeri tetikle
    debounceTime(300),          // kullanıcı yazmayı bırakana kadar 300ms bekle
    distinctUntilChanged(),     // aynı değer tekrar gelirse geçme
    switchMap((query) => {
      // switchMap: yeni değer gelince önceki HTTP isteğini iptal eder!
      const url = query.trim()
        ? `${API_CONFIG.baseUrl}/products/search?q=${encodeURIComponent(query)}`
        : `${API_CONFIG.baseUrl}/products?limit=15`;

      return this.http.get<{ products: Product[]; total: number }>(url).pipe(
        map((res) => ({
          products: res.products,
          total: res.total,
          loading: false,
          error: null,
        })),
        startWith({ products: [], total: 0, loading: true, error: null }),
        catchError(() =>
          of({ products: [], total: 0, loading: false, error: 'API isteği başarısız!' }),
        ),
      );
    }),
  );

  login(): void {
    if (_authLoading$.value) return;
    _authLoading$.next(true);
    setTimeout(() => {
      _user$.next({ name: 'BehaviorSubject Kullanıcısı' });
      _authLoading$.next(false);
    }, 800);
  }

  logout(): void {
    _user$.next(null);
  }

  // Code snippet strings — template içinde { } @ parse edilmesini önler
  readonly snippetBehaviorSubject = `const user$ = new BehaviorSubject<User | null>(null);
const readonly$ = user$.asObservable();  // dışarıya sadece okuma ver

user$.next({ name: 'Hacı' });   // değer güncelle
user$.value;                     // anlık değeri oku (sync)

// Template'de:
// @if (user$ | async; as user) { ... }`;

  readonly snippetPipeline = `searchQuery.valueChanges.pipe(
  startWith(''),            // abonelik başlayınca tetikle
  debounceTime(300),        // 300ms bekle
  distinctUntilChanged(),   // aynı değer tekrar gelirse geçme
  switchMap(q =>            // yeni değer gelince önceki HTTP isteğini iptal et!
    http.get(url).pipe(
      map(res => ({ products: res.products, loading: false })),
      startWith({ loading: true }),
      catchError(() => of({ error: 'Hata!' }))
    )
  )
)`;
}
