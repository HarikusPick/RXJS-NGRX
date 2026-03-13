import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpClient } from '@angular/common/http';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { loadPosts, loadPostsSuccess, loadPostsFailure } from './posts.actions';
import { Post } from './post.model';
import { API_CONFIG } from '../../core/api.config';

// Effect: yan etkileri (HTTP, localStorage vs.) yönetir
// Action'ı dinler → HTTP isteği yapar → yeni action dispatch eder
@Injectable()
export class PostsEffects {
  private actions$ = inject(Actions);
  private http = inject(HttpClient);

  loadPosts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPosts), // yalnızca loadPosts action'ını dinle
      switchMap(() =>
        this.http.get<{ posts: Post[]; total: number }>(`${API_CONFIG.baseUrl}/posts?limit=20`).pipe(
          map((res) => loadPostsSuccess({ posts: res.posts, total: res.total })),
          catchError((err) =>
            of(loadPostsFailure({ error: err.message ?? 'Bilinmeyen hata' })),
          ),
        ),
      ),
    ),
  );
}
