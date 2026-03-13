import { Component, signal, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {
  Subject,
  BehaviorSubject,
  ReplaySubject,
  AsyncSubject,
  interval,
  defer,
  throwError,
  EMPTY,
} from 'rxjs';
import {
  shareReplay,
  exhaustMap,
  retry,
  catchError,
  finalize,
  withLatestFrom,
  map,
  tap,
  startWith,
} from 'rxjs/operators';
import { API_CONFIG } from '../../core/api.config';

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subjects.html',
  styleUrl: './subjects.css',
})
export class SubjectsComponent {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  // ─── 1. Subject Ailesi ───────────────────────────────────────────────────

  subjectLogs     = signal<string[]>([]);
  behaviorLogs    = signal<string[]>([]);
  replayLogs      = signal<string[]>([]);
  asyncLogs       = signal<string[]>([]);

  runSubjectDemo(): void {
    const logs: string[] = [];
    const subject = new Subject<number>();

    // A abone olur
    subject.subscribe((v) => logs.push(`  [A] aldı: ${v}`));
    logs.push('A abone oldu');
    subject.next(1);
    subject.next(2);
    logs.push('→ 1 ve 2 yayınlandı');

    // B geç abone olur — önceki değerleri göremez
    subject.subscribe((v) => logs.push(`  [B] aldı: ${v}`));
    logs.push('B abone oldu (geç — önceki değerler kayıp)');
    subject.next(3);
    logs.push('→ 3 yayınlandı');

    this.subjectLogs.set(logs);
  }

  runBehaviorDemo(): void {
    const logs: string[] = [];
    const bs = new BehaviorSubject<number>(0);

    logs.push('A abone oldu (başlangıç değeri: 0)');
    bs.subscribe((v) => logs.push(`  [A] aldı: ${v}`));

    bs.next(1);
    bs.next(2);
    logs.push('→ 1 ve 2 yayınlandı');

    // B geç abone olur ama ANLIKTAKI değeri (2) hemen alır
    logs.push('B abone oldu (geç — ama anlık değeri alır)');
    bs.subscribe((v) => logs.push(`  [B] aldı: ${v}`));

    bs.next(3);
    logs.push('→ 3 yayınlandı');

    this.behaviorLogs.set(logs);
  }

  runReplayDemo(): void {
    const logs: string[] = [];
    const rs = new ReplaySubject<number>(3); // son 3 değeri tamponla

    rs.next(1);
    rs.next(2);
    rs.next(3);
    rs.next(4);
    logs.push('→ 1, 2, 3, 4 yayınlandı (abone yok)');

    // A geç abone olur — son 3 değeri (2, 3, 4) hemen alır
    logs.push('A abone oldu → son 3 tampon değerini alır:');
    rs.subscribe((v) => logs.push(`  [A] aldı: ${v}`));

    rs.next(5);
    logs.push('→ 5 yayınlandı');

    this.replayLogs.set(logs);
  }

  runAsyncSubjectDemo(): void {
    const logs: string[] = [];
    const as = new AsyncSubject<number>();

    as.subscribe((v) => logs.push(`  [A] aldı: ${v}`));
    logs.push('A abone oldu');

    as.next(1);
    as.next(2);
    as.next(3);
    logs.push('→ 1, 2, 3 yayınlandı — A henüz hiçbirini almadı');

    as.complete();
    logs.push('complete() çağrıldı → A sadece son değeri (3) aldı');

    this.asyncLogs.set(logs);
  }

  // ─── 2. shareReplay ──────────────────────────────────────────────────────

  shareReplayLogs = signal<string[]>([]);

  runWithoutShareReplay(): void {
    this.shareReplayLogs.set(['shareReplay YOK — her abone ayrı HTTP isteği yapar:']);
    // Aynı Observable'a iki abone = iki ayrı HTTP isteği
    const obs$ = this.http.get(`${API_CONFIG.baseUrl}/posts/1`);

    obs$.subscribe(() =>
      this.shareReplayLogs.update((l) => [...l, '  [A] isteği tamamlandı (1. HTTP çağrısı)']),
    );
    obs$.subscribe(() =>
      this.shareReplayLogs.update((l) => [...l, '  [B] isteği tamamlandı (2. HTTP çağrısı)']),
    );
    this.shareReplayLogs.update((l) => [
      ...l,
      '→ Network sekmesinde 2 ayrı istek gör!',
    ]);
  }

  runWithShareReplay(): void {
    this.shareReplayLogs.set(['shareReplay(1) var — tek HTTP isteği, iki abone paylaşır:']);
    // shareReplay(1) ile tek istek, sonuç cache'lenir
    const obs$ = this.http
      .get(`${API_CONFIG.baseUrl}/posts/1`)
      .pipe(shareReplay(1));

    obs$.subscribe(() =>
      this.shareReplayLogs.update((l) => [...l, "  [A] cache'den aldı ✓"]),
    );
    obs$.subscribe(() =>
      this.shareReplayLogs.update((l) => [...l, "  [B] cache'den aldı ✓"]),
    );
    this.shareReplayLogs.update((l) => [
      ...l,
      '→ Network sekmesinde yalnızca 1 istek gör!',
    ]);
  }

  // ─── 3. exhaustMap ───────────────────────────────────────────────────────

  private exhaustClick$ = new Subject<void>();
  exhaustLogs = signal<string[]>([]);
  exhaustLoading = signal(false);
  private exhaustReqNum = 0;

  constructor() {
    // exhaustMap: mevcut inner Observable tamamlanmadan gelen yeni değerleri YOKSAYAR
    this.exhaustClick$
      .pipe(
        exhaustMap(() => {
          const n = ++this.exhaustReqNum;
          this.exhaustLoading.set(true);
          this.exhaustLogs.update((l) => [...l, `→ İstek #${n} başladı...`]);
          return this.http.get(`${API_CONFIG.baseUrl}/posts/${n}`).pipe(
            finalize(() => {
              this.exhaustLoading.set(false);
              this.exhaustLogs.update((l) => [...l, `✓ İstek #${n} tamamlandı`]);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    // withLatestFrom demo kurulumu
    this.captureClick$
      .pipe(
        withLatestFrom(this.autoCounter$),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(([, count]) => {
        this.captureLog.update((l) => [
          ...l,
          `Yakalandı: sayaç = ${count}`,
        ]);
      });
  }

  clickExhaust(): void {
    if (this.exhaustLoading()) {
      this.exhaustLogs.update((l) => [...l, '⚡ Tıklama yoksayıldı (meşgul)']);
    }
    this.exhaustClick$.next();
  }

  // ─── 4. retry ────────────────────────────────────────────────────────────

  retryLogs    = signal<string[]>([]);
  retryLoading = signal(false);

  runRetryDemo(): void {
    this.retryLoading.set(true);
    this.retryLogs.set(['Başladı...']);
    let attempt = 0;

    // defer: her abone olunduğunda (her retry'da) fabrika yeniden çalışır
    defer(() => {
      attempt++;
      this.retryLogs.update((l) => [...l, `Deneme ${attempt}...`]);
      if (attempt < 3) {
        return throwError(() => new Error('Sunucu hatası (simüle)'));
      }
      return this.http.get(`${API_CONFIG.baseUrl}/posts/1`);
    })
      .pipe(
        tap({ error: (err) => this.retryLogs.update((l) => [...l, `  ✗ ${err.message}`]) }),
        retry({ count: 3, delay: 600 }),
        catchError(() => {
          this.retryLogs.update((l) => [...l, 'Tüm denemeler başarısız!']);
          return EMPTY;
        }),
        finalize(() => this.retryLoading.set(false)),
      )
      .subscribe({
        next: () =>
          this.retryLogs.update((l) => [...l, `✓ Deneme ${attempt} başarılı!`]),
      });
  }

  // ─── 5. withLatestFrom ───────────────────────────────────────────────────

  // Otomatik artan sayaç
  private autoCounter$ = interval(1000).pipe(
    startWith(0),
    map((n) => n + 1),
    shareReplay(1),
  );

  counterSignal = signal(0);
  captureLog    = signal<string[]>([]);
  private captureClick$ = new Subject<void>();

  captureCount(): void {
    // withLatestFrom pipeline constructor'da kuruldu
    this.captureClick$.next();
  }

  ngOnInit(): void {
    // counter'ı signal'e bağla (görüntü için)
    this.autoCounter$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((n) => this.counterSignal.set(n));
  }

  // ─── 6. defer() ──────────────────────────────────────────────────────────

  deferLogs    = signal<string[]>([]);
  deferLoading = signal(false);
  private deferSubNum = 0;

  runDeferDemo(): void {
    this.deferLoading.set(true);
    this.deferLogs.set([]);

    // defer: her subscribe'da fabrika çalışır → taze timestamp
    const deferred$ = defer(() => {
      const n = ++this.deferSubNum;
      const ts = new Date().toLocaleTimeString('tr-TR', { hour12: false });
      this.deferLogs.update((l) => [...l, `Abone ${n} → fabrika çalıştı (${ts})`]);
      return this.http
        .get<any>(`${API_CONFIG.baseUrl}/posts/${n}`)
        .pipe(map((p) => `"${p.title.substring(0, 30)}..."`));
    });

    // İki abone — her biri kendi fabrikasını çalıştırır
    deferred$.subscribe((title) =>
      this.deferLogs.update((l) => [...l, `  [A] başlık: ${title}`]),
    );
    deferred$.subscribe((title) => {
      this.deferLogs.update((l) => [...l, `  [B] başlık: ${title}`]);
      this.deferLoading.set(false);
    });
  }

  // ─── Kod snippet'leri ─────────────────────────────────────────────────────

  readonly snippetSubjectFamily = `// Subject: geçmiş değerler kaybolur
const s = new Subject<number>();
s.subscribe(v => console.log('[A]', v));
s.next(1); s.next(2);
s.subscribe(v => console.log('[B]', v)); // B 1 ve 2'yi kaçırdı
s.next(3); // A ve B alır

// BehaviorSubject: anlık değeri yeni subscriber'a verir
const bs = new BehaviorSubject(0);
bs.next(1); bs.next(2);
bs.subscribe(v => console.log(v)); // hemen 2 alır

// ReplaySubject(n): son n değeri tamponlar
const rs = new ReplaySubject(3);
rs.next(1); rs.next(2); rs.next(3); rs.next(4);
rs.subscribe(v => console.log(v)); // 2, 3, 4 alır (son 3)

// AsyncSubject: complete() sonrası sadece son değer
const as = new AsyncSubject();
as.next(1); as.next(2); as.next(3);
as.subscribe(v => console.log(v)); // henüz hiçbir şey
as.complete(); // -> 3 alır`;

  readonly snippetShareReplay = `// shareReplay(1) — HTTP çağrısını tekrarlama, cache'le
const data$ = http.get('/api/config').pipe(shareReplay(1));

// İlk subscribe: HTTP isteği yapılır
data$.subscribe(d => console.log('[A]', d));
// İkinci subscribe: cache'den gelir, yeni istek yok!
data$.subscribe(d => console.log('[B]', d));

// Ne zaman kullan?
// - Aynı HTTP verisine birden fazla yerde ihtiyaç olduğunda
// - Service içinde singleton stream olarak
// - Sayfa boyunca değişmeyen verileri cache'lemek için`;

  readonly snippetExhaustMap = `// exhaustMap — mevcut istek bitmeden yenilerini yoksay
// Form submit spam koruması için idealdir

clicks$.pipe(
  exhaustMap(() =>
    http.post('/api/submit', form.value).pipe(
      finalize(() => loading.set(false))
    )
  )
).subscribe(res => result.set(res));

// switchMap   → öncekini iptal et, yeniyi başlat (arama)
// mergeMap    → paralel çalıştır (bağımsız işlemler)
// concatMap   → sıraya koy (sıralı işlemler)
// exhaustMap  → meşgulken yeni istekleri yoksay (submit)`;

  readonly snippetRetry = `// retry — hata sonrası yeniden dene
http.get('/api/data').pipe(
  retry(3),           // 3 kez dene
  catchError(err => of(fallback))
).subscribe();

// Gelişmiş: delay ile exponential backoff
http.get('/api/data').pipe(
  retry({ count: 3, delay: (err, attempt) => timer(attempt * 1000) }),
  catchError(err => EMPTY)
).subscribe();

// defer() ile birlikte: her retry'da taze bir Observable
defer(() => http.get('/api/data')).pipe(
  retry(3)
).subscribe();`;

  readonly snippetTakeUntilDestroyed = `// takeUntilDestroyed — Angular 16+ memory leak önleme
// Bileşen destroy olunca subscription otomatik iptal edilir

@Component({...})
class MyComponent {
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    // Constructor dışında destroyRef gereklidir
    interval(1000).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(n => this.count.set(n));
  }

  constructor() {
    // Constructor içinde arg'sız kullanılabilir
    interval(1000).pipe(
      takeUntilDestroyed()
    ).subscribe(n => this.count.set(n));
  }
}
// Bileşen yok edilince → subscription otomatik iptal!`;

  readonly snippetWithLatestFrom = `// withLatestFrom — trigger olmadan değer alma
// Fark: combineLatest her iki kaynak değişince tetikler
//       withLatestFrom sadece SOL kaynak değişince tetikler

const counter$ = interval(1000);
const button$ = new Subject<void>();

button$.pipe(
  withLatestFrom(counter$),       // counter$ değişince tetiklenmez
  map(([_click, count]) => count) // sadece click gelince
).subscribe(count =>
  console.log('tıklandı, sayaç:', count)
);`;

  readonly snippetDefer = `// defer() — her subscribe'da yeni Observable üret (lazy factory)

// SORUN: Observable, tanımlandığı anda çalışır
const eagerTime$ = of(new Date()); // HEMEN çalışır
sub1 = eagerTime$.subscribe(); // aynı timestamp
sub2 = eagerTime$.subscribe(); // aynı timestamp

// ÇÖZÜM: defer ile factory pattern
const lazyTime$ = defer(() => of(new Date())); // subscribe'da çalışır
sub1 = lazyTime$.subscribe(); // farklı timestamp
sub2 = lazyTime$.subscribe(); // farklı timestamp

// Retry ile mükemmel uyum:
// Her retry → fabrika yeniden çağrılır → taze Observable`;
}
