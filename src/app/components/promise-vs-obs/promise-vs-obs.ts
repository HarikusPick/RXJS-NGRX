import { Component, inject, OnDestroy, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { forkJoin, from, EMPTY, Subscription } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { API_CONFIG } from '../../core/api.config';

@Component({
  selector: 'app-promise-vs-obs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './promise-vs-obs.html',
  styleUrl: './promise-vs-obs.css',
})
export class PromiseVsObsComponent implements OnDestroy {
  private http = inject(HttpClient);
  private activeSub: Subscription | null = null;

  // ─── 1. Tek İstek: Promise vs Observable ─────────────────────────────────

  promiseResult = signal<any>(null);
  promiseLoading = signal(false);
  promiseError = signal<string | null>(null);
  promiseTime = signal(0);

  // async/await ile Promise — okunması kolay ama iptal edilemez
  async fetchWithPromise(): Promise<void> {
    this.promiseLoading.set(true);
    this.promiseError.set(null);
    this.promiseResult.set(null);
    const start = Date.now();
    try {
      const res = await fetch(`${API_CONFIG.baseUrl}/posts/1`);
      const data = await res.json();
      this.promiseResult.set(data);
      this.promiseTime.set(Date.now() - start);
    } catch (e: any) {
      this.promiseError.set(e.message);
    } finally {
      this.promiseLoading.set(false);
    }
  }

  obsResult = signal<any>(null);
  obsLoading = signal(false);
  obsError = signal<string | null>(null);
  obsTime = signal(0);

  // Observable ile HttpClient — pipe + operatörler, iptal edilebilir
  fetchWithObservable(): void {
    this.obsLoading.set(true);
    this.obsError.set(null);
    this.obsResult.set(null);
    const start = Date.now();
    this.activeSub = this.http.get(`${API_CONFIG.baseUrl}/posts/1`).pipe(
      catchError((err) => {
        this.obsError.set(err.message);
        return EMPTY;
      }),
      finalize(() => this.obsLoading.set(false)),
    ).subscribe((data) => {
      this.obsResult.set(data);
      this.obsTime.set(Date.now() - start);
    });
  }

  // Observable iptal etme (Promise bunu yapamaz!)
  cancelObservable(): void {
    this.activeSub?.unsubscribe();
    this.obsLoading.set(false);
    this.obsResult.set(null);
  }

  // ─── 2. Paralel İstekler: Promise.all vs forkJoin ────────────────────────

  promiseAllResult = signal<string[]>([]);
  promiseAllLoading = signal(false);
  promiseAllTime = signal(0);

  async fetchWithPromiseAll(): Promise<void> {
    this.promiseAllLoading.set(true);
    this.promiseAllResult.set([]);
    const start = Date.now();
    try {
      const [postsRes, usersRes, productsRes] = await Promise.all([
        fetch(`${API_CONFIG.baseUrl}/posts?limit=3`),
        fetch(`${API_CONFIG.baseUrl}/users?limit=3`),
        fetch(`${API_CONFIG.baseUrl}/products?limit=3`),
      ]);
      const [posts, users, products] = await Promise.all([
        postsRes.json(),
        usersRes.json(),
        productsRes.json(),
      ]);
      const ms = Date.now() - start;
      this.promiseAllTime.set(ms);
      this.promiseAllResult.set([
        `Posts: ${posts.total} toplam`,
        `Users: ${users.total} toplam`,
        `Products: ${products.total} toplam`,
        `⏱ ${ms}ms (3 paralel istek)`,
      ]);
    } finally {
      this.promiseAllLoading.set(false);
    }
  }

  forkJoinResult = signal<string[]>([]);
  forkJoinLoading = signal(false);
  forkJoinTime = signal(0);

  fetchWithForkJoin(): void {
    this.forkJoinLoading.set(true);
    this.forkJoinResult.set([]);
    const start = Date.now();
    forkJoin({
      posts: this.http.get<any>(`${API_CONFIG.baseUrl}/posts?limit=3`),
      users: this.http.get<any>(`${API_CONFIG.baseUrl}/users?limit=3`),
      products: this.http.get<any>(`${API_CONFIG.baseUrl}/products?limit=3`),
    }).pipe(
      finalize(() => this.forkJoinLoading.set(false)),
    ).subscribe(({ posts, users, products }) => {
      const ms = Date.now() - start;
      this.forkJoinTime.set(ms);
      this.forkJoinResult.set([
        `Posts: ${posts.total} toplam`,
        `Users: ${users.total} toplam`,
        `Products: ${products.total} toplam`,
        `⏱ ${ms}ms (3 paralel istek)`,
      ]);
    });
  }

  // ─── 3. from(Promise) — Promise'i Observable'a dönüştür ──────────────────

  fromResult = signal<any>(null);
  fromLoading = signal(false);

  // from() ile native fetch Promise'ini Observable zinciriyle yönet
  fetchWithFrom(): void {
    this.fromLoading.set(true);
    this.fromResult.set(null);
    from(
      fetch(`${API_CONFIG.baseUrl}/posts/2`).then((r) => r.json()),
    ).pipe(
      map((post: any) => ({ id: post.id, title: post.title, tags: post.tags })),
      finalize(() => this.fromLoading.set(false)),
    ).subscribe((data) => this.fromResult.set(data));
  }

  ngOnDestroy(): void {
    this.activeSub?.unsubscribe();
  }

  readonly snippetPromise = `async fetchData() {
  const res = await fetch('/posts/1');
  const data = await res.json();
  // data kullan
}`;

  readonly snippetObservable = `this.http.get('/posts/1').pipe(
  catchError(err => EMPTY),
  finalize(() => this.loading.set(false))
).subscribe(data => {
  // data kullan
});`;

  readonly snippetPromiseAll = `const [posts, users, products] =
  await Promise.all([
    fetch('/posts?limit=3').then(r => r.json()),
    fetch('/users?limit=3').then(r => r.json()),
    fetch('/products?limit=3').then(r => r.json()),
  ]);`;

  readonly snippetForkJoin = `forkJoin({
  posts:    http.get('/posts?limit=3'),
  users:    http.get('/users?limit=3'),
  products: http.get('/products?limit=3'),
}).subscribe(({ posts, users, products }) => {
  // hepsi tamamlanınca burada
});`;

  readonly snippetFrom = `// fetch() bir Promise döndürür
// from() ile Observable'a dönüştür, artık pipe() kullanabilirsin
from(fetch('/posts/2').then(r => r.json())).pipe(
  map(post => ({ id: post.id, title: post.title })),
  finalize(() => loading.set(false))
).subscribe(data => result.set(data));`;
}
