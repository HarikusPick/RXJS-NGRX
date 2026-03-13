import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {
  of,
  from,
  interval,
  forkJoin,
  combineLatest,
  Subject,
  BehaviorSubject,
} from 'rxjs';
import {
  map,
  filter,
  scan,
  take,
  takeUntil,
  switchMap,
  mergeMap,
  concatMap,
  catchError,
  startWith,
  finalize,
} from 'rxjs/operators';
import { API_CONFIG } from '../../core/api.config';

@Component({
  selector: 'app-rxjs-operators',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rxjs-operators.html',
  styleUrl: './rxjs-operators.css',
})
export class RxjsOperatorsComponent {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  // ─── Bölüm 1: Temel Dönüşüm Operatörleri ────────────────────────────────

  mapOutput = signal<string[]>([]);
  filterOutput = signal<string[]>([]);
  scanOutput = signal<string[]>([]);

  runMap(): void {
    this.mapOutput.set([]);
    // map: her değeri dönüştürür
    of(1, 2, 3, 4, 5).pipe(
      map((n) => `${n}  →  karesi = ${n * n}`),
    ).subscribe((v) => this.mapOutput.update((p) => [...p, v]));
  }

  runFilter(): void {
    this.filterOutput.set([]);
    // filter: koşulu sağlayanları geçirir
    from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).pipe(
      filter((n) => n % 2 === 0),
      map((n) => `✓  ${n}  (çift sayı geçti)`),
    ).subscribe((v) => this.filterOutput.update((p) => [...p, v]));
  }

  runScan(): void {
    this.scanOutput.set([]);
    // scan: reduce gibi ama her adımda değer yayınlar (sepet toplamı için ideal)
    from([150, 299, 89, 450, 120]).pipe(
      scan((acc, curr) => acc + curr, 0), // 0 başlangıç değeri
      map((total) => `Birikimli toplam: ${total}₺`),
    ).subscribe((v) => this.scanOutput.update((p) => [...p, v]));
  }

  // ─── Bölüm 2: Zaman Operatörleri ─────────────────────────────────────────

  timerOutput = signal<string[]>([]);
  private stop$ = new Subject<void>();
  isTimerRunning = signal(false);

  startTimer(): void {
    if (this.isTimerRunning()) return;
    this.timerOutput.set([]);
    this.isTimerRunning.set(true);

    // interval: her X ms'de bir 0,1,2... yayınlar
    // take(10): 10 değer aldıktan sonra tamamla
    // takeUntil: stop$ yayınlayınca durdur
    interval(400).pipe(
      take(10),
      map((n) => `Tick #${n + 1}  /  ${(n + 1) * 400}ms geçti`),
      takeUntil(this.stop$),
    ).subscribe({
      next: (v) => this.timerOutput.update((p) => [...p, v]),
      complete: () => this.isTimerRunning.set(false),
    });
  }

  stopTimer(): void {
    this.stop$.next();
    this.isTimerRunning.set(false);
  }

  // ─── Bölüm 3: Düzleştirme Operatörleri (switchMap / mergeMap / concatMap) ─

  switchMapOutput = signal<string[]>([]);
  mergeMapOutput = signal<string[]>([]);
  concatMapOutput = signal<string[]>([]);
  switchMapLoading = signal(false);
  mergeMapLoading = signal(false);
  concatMapLoading = signal(false);

  runSwitchMap(): void {
    this.switchMapOutput.set(['▶ Başlatıldı — yeni gelince önceki HTTP isteği iptal edilir']);
    this.switchMapLoading.set(true);
    // switchMap: yeni dış değer gelince önceki inner observable'ı iptal eder
    // Arama kutusu için ideal (kullanıcı yazmaya devam edince eski istek iptal)
    of(1, 2, 3).pipe(
      switchMap((id) =>
        this.http
          .get<{ id: number; title: string }>(`${API_CONFIG.baseUrl}/posts/${id}`)
          .pipe(map((p) => `[switchMap] Post ${id}: ${p.title}`)),
      ),
      finalize(() => this.switchMapLoading.set(false)),
    ).subscribe((v) => this.switchMapOutput.update((p) => [...p, v]));
  }

  runMergeMap(): void {
    this.mergeMapOutput.set(['▶ Başlatıldı — tüm istekler eş zamanlı çalışır']);
    this.mergeMapLoading.set(true);
    // mergeMap: tüm inner observable'ları eş zamanlı başlatır, sonuçlar karışık gelebilir
    // Paralel yüklemeler için kullanışlı
    of(1, 2, 3).pipe(
      mergeMap((id) =>
        this.http
          .get<{ id: number; title: string }>(`${API_CONFIG.baseUrl}/posts/${id}`)
          .pipe(map((p) => `[mergeMap] Post ${id}: ${p.title}`)),
      ),
      finalize(() => this.mergeMapLoading.set(false)),
    ).subscribe((v) => this.mergeMapOutput.update((p) => [...p, v]));
  }

  runConcatMap(): void {
    this.concatMapOutput.set(['▶ Başlatıldı — istekler sırayla beklenir']);
    this.concatMapLoading.set(true);
    // concatMap: bir inner tamamlanmadan diğerine geçmez, sıralı garanti
    // Upload sırası veya adım adım işlemler için ideal
    of(1, 2, 3).pipe(
      concatMap((id) =>
        this.http
          .get<{ id: number; title: string }>(`${API_CONFIG.baseUrl}/posts/${id}`)
          .pipe(map((p) => `[concatMap] Post ${id}: ${p.title}`)),
      ),
      finalize(() => this.concatMapLoading.set(false)),
    ).subscribe((v) => this.concatMapOutput.update((p) => [...p, v]));
  }

  // ─── Bölüm 4: Birleştirme Operatörleri ───────────────────────────────────

  combineLatestOutput = signal<string>('');
  forkJoinOutput = signal<string[]>([]);
  forkJoinLoading = signal(false);
  forkJoinTime = signal(0);

  runCombineLatest(): void {
    const price$ = new BehaviorSubject(100);
    const qty$ = new BehaviorSubject(3);
    const discount$ = new BehaviorSubject(0.15);

    // combineLatest: herhangi biri değişince hepsinin son değeriyle emit eder
    // Form alanları birbirini etkileyen hesaplamalarda kullanışlı
    combineLatest([price$, qty$, discount$]).pipe(
      take(1),
      map(([price, qty, disc]) => {
        const gross = price * qty;
        const net = gross * (1 - disc);
        return `${price}₺ × ${qty} adet − %${disc * 100} indirim = ${net.toFixed(0)}₺ net`;
      }),
    ).subscribe((v) => this.combineLatestOutput.set(v));
  }

  runForkJoin(): void {
    this.forkJoinOutput.set([]);
    this.forkJoinLoading.set(true);
    const start = Date.now();

    // forkJoin: tüm observable'lar tamamlanınca son değerlerini birlikte verir
    // Sayfanın ilk yüklemesinde birden fazla API çağrısı için ideal
    forkJoin({
      post: this.http.get<{ title: string }>(`${API_CONFIG.baseUrl}/posts/1`),
      user: this.http.get<{ firstName: string; lastName: string }>(`${API_CONFIG.baseUrl}/users/1`),
      product: this.http.get<{ title: string }>(`${API_CONFIG.baseUrl}/products/1`),
    }).pipe(
      finalize(() => this.forkJoinLoading.set(false)),
    ).subscribe(({ post, user, product }) => {
      const ms = Date.now() - start;
      this.forkJoinTime.set(ms);
      this.forkJoinOutput.set([
        `Post: "${post.title}"`,
        `User: ${user.firstName} ${user.lastName}`,
        `Product: "${product.title}"`,
        `⏱ ${ms}ms — 3 istek paralel! Sıralı olsaydı ~${ms * 3}ms sürerdi.`,
      ]);
    });
  }

  // ─── Bölüm 5: Hata Yönetimi ──────────────────────────────────────────────

  catchErrorOutput = signal<string>('');
  startWithOutput = signal<string[]>([]);

  runCatchError(): void {
    this.catchErrorOutput.set('');
    // catchError: hata oluşunca stream'i kurtarır, başka bir observable döndür
    this.http.get(`${API_CONFIG.baseUrl}/nonexistent-endpoint-404`).pipe(
      catchError((err) =>
        of({
          yakalandiHata: true,
          statusCode: err.status,
          mesaj: `catchError devreye girdi → hata: ${err.status}`,
        }),
      ),
    ).subscribe((v) => this.catchErrorOutput.set(JSON.stringify(v, null, 2)));
  }

  runStartWith(): void {
    this.startWithOutput.set([]);
    this.http.get<{ title: string }>(`${API_CONFIG.baseUrl}/posts/1`).pipe(
      map((post) => `✓ Yüklendi: "${post.title}"`),
      startWith('⏳ startWith → hemen tetiklendi (HTTP cevap beklenmeden)'),
    ).subscribe((v) => this.startWithOutput.update((p) => [...p, v]));
  }

  readonly snippetForkJoin = `// 3 API isteğini PARALEL başlat,
// hepsi tamamlanınca birlikte sonuç al
forkJoin({
  post:    http.get('/posts/1'),
  user:    http.get('/users/1'),
  product: http.get('/products/1')
})`;

  readonly snippetCatchError = `// Hatalı URL'e istek gönder
http.get('/nonexistent').pipe(
  catchError(err =>
    // hata yerine güvenli değer döndür
    of({ hata: err.status, mesaj: 'yakalandı' })
  )
)`;
}
