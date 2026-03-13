import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store, createSelector } from '@ngrx/store';
import { CartStore, CartItem } from './cart.store';
import { usersFeature, loadUsers } from '../../store/users/users.feature';
import { selectPostsTotal } from '../../store/posts/posts.selectors';
import { loadPosts } from '../../store/posts/posts.actions';

// Gelişmiş: composed selector — iki farklı feature'dan veri birleştirir
// Her değişiklikte yeniden hesaplanmaz, memoize edilir
const selectDashboardStats = createSelector(
  usersFeature.selectTotal,
  usersFeature.selectLoading,
  selectPostsTotal,
  (usersTotal, usersLoading, postsTotal) => ({
    usersTotal,
    usersLoading,
    postsTotal,
    combined: `${usersTotal} kullanıcı, ${postsTotal} gönderi`,
  }),
);

@Component({
  selector: 'app-ngrx-advanced',
  standalone: true,
  imports: [CommonModule],
  // ComponentStore'u lokal sağlayıcı olarak ekle — bileşene özgü, global değil
  providers: [CartStore],
  templateUrl: './ngrx-advanced.html',
  styleUrl: './ngrx-advanced.css',
})
export class NgrxAdvancedComponent implements OnInit {
  private store = inject(Store);
  private cart = inject(CartStore); // lokal ComponentStore

  // ─── createFeature — auto-generated selectors ─────────────────────────
  // Eski yol: createFeatureSelector + her alan için ayrı createSelector
  // Yeni yol: usersFeature.selectXxx hazır geliyor
  users$   = this.store.select(usersFeature.selectUsers);
  loading$ = this.store.select(usersFeature.selectLoading);
  error$   = this.store.select(usersFeature.selectError);
  total$   = this.store.select(usersFeature.selectTotal);

  // ─── Composed selector — iki feature birlikte ─────────────────────────
  stats$ = this.store.select(selectDashboardStats);

  // ─── ComponentStore selectors ─────────────────────────────────────────
  cartItems$  = this.cart.items$;
  cartTotal$  = this.cart.total$;
  cartCount$  = this.cart.count$;

  // Sepete eklenebilecek örnek ürünler
  sampleProducts = [
    { id: 1, name: 'iPhone 15 Pro', price: 42000 },
    { id: 2, name: 'MacBook Air M3', price: 55000 },
    { id: 3, name: 'iPad Pro', price: 28000 },
    { id: 4, name: 'Apple Watch S9', price: 14000 },
    { id: 5, name: 'AirPods Pro', price: 8000 },
  ];

  ngOnInit(): void {
    // createFeature ile tanımlanan store'u tetikle
    this.store.dispatch(loadUsers());
    // Composed selector'da kullandığımız posts total için
    this.store.dispatch(loadPosts());
  }

  addToCart(p: { id: number; name: string; price: number }): void {
    this.cart.addItem(p);
  }

  removeFromCart(id: number): void {
    this.cart.removeItem(id);
  }

  clearCart(): void {
    this.cart.clearCart();
  }

  // ─── Kod snippet'leri ─────────────────────────────────────────────────

  readonly snippetOldWay = `// ESKİ YOL: createFeatureSelector + her alan için createSelector
const selectUsersState = createFeatureSelector<UsersState>('users');

const selectUsers   = createSelector(selectUsersState, s => s.users);
const selectTotal   = createSelector(selectUsersState, s => s.total);
const selectLoading = createSelector(selectUsersState, s => s.loading);
const selectError   = createSelector(selectUsersState, s => s.error);
// 5 satır boilerplate, her alan için tekrar`;

  readonly snippetCreateFeature = `// YENİ YOL: createFeature — selectors otomatik üretilir!
export const usersFeature = createFeature({
  name: 'users',
  reducer: createReducer(
    initialState,
    on(loadUsers, s => ({ ...s, loading: true })),
    on(loadUsersSuccess, (s, { users, total }) => ({ ...s, users, total, loading: false })),
    on(loadUsersFailure, (s, { error }) => ({ ...s, loading: false, error })),
  ),
});

// Otomatik üretilen selectors:
// usersFeature.selectUsersState → tüm state
// usersFeature.selectUsers      → users[]
// usersFeature.selectTotal      → number
// usersFeature.selectLoading    → boolean
// usersFeature.selectError      → string | null`;

  readonly snippetComposedSelector = `// Composed Selector — birden fazla feature'ı birleştir
// Memoize edilir: girdiler değişmeden yeniden hesaplanmaz
const selectDashboard = createSelector(
  usersFeature.selectTotal,   // feature 1'den
  postsFeature.selectTotal,   // feature 2'den
  (usersTotal, postsTotal) => ({
    usersTotal,
    postsTotal,
    combined: usersTotal + postsTotal,
  })
);

// Component'te: this.store.select(selectDashboard)`;

  readonly snippetComponentStore = `// ComponentStore — lokal/geçici state yönetimi
// Global Store'dan farkı: bileşene özgü, route değişince temizlenir

@Injectable()
class CartStore extends ComponentStore<CartState> {
  constructor() { super({ items: [] }); }

  // select() — reaktif dilim
  readonly items$ = this.select(s => s.items);
  readonly total$ = this.select(s => s.items.reduce((t,i) => t + i.price * i.qty, 0));

  // updater() — senkron, saf state güncellemesi
  readonly addItem = this.updater((state, item: CartItem) => ({
    items: [...state.items, item]
  }));

  // effect() — async işlemler (HTTP gibi)
  readonly loadFromApi = this.effect((trigger$) =>
    trigger$.pipe(switchMap(() => http.get('/cart')))
  );
}

// Component'te:
// providers: [CartStore]   ← lokal scope!
// private cart = inject(CartStore);`;

  readonly snippetAdvancedEffect = `// İleri Effect: concatLatestFrom ile güvenli selector okuma
// withLatestFrom yerine concatLatestFrom kullan — race condition yok

loadUserDetails$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadUserDetails),
    concatLatestFrom(() => this.store.select(selectCurrentUserId)),
    switchMap(([action, userId]) =>
      this.http.get('/users/' + userId).pipe(
        map(user => loadUserDetailsSuccess({ user })),
        catchError(err => of(loadUserDetailsFailure({ error: err.message })))
      )
    )
  )
);

// Birden fazla action dispatch eden effect:
loadAndNotify$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadData),
    switchMap(() => http.get('/data').pipe(
      switchMap(data => [
        loadDataSuccess({ data }),
        showNotification({ message: 'Veriler yüklendi' })
      ]),
      catchError(err => of(loadDataFailure({ error: err.message })))
    ))
  )
);`;
}
