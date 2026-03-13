import { Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { CommonModule } from '@angular/common';
import { loadPosts } from '../../store/posts/posts.actions';
import {
  selectPosts,
  selectPostsLoading,
  selectPostsError,
  selectPostsTotal,
} from '../../store/posts/posts.selectors';

// NgRx akışı:
// Component.dispatch(loadPosts)
//   → PostsEffects (HTTP isteği)
//   → loadPostsSuccess/loadPostsFailure
//   → postsReducer (state günceller)
//   → Selectors ile template'e yansır

@Component({
  selector: 'app-posts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './posts.html',
  styleUrl: './posts.css',
})
export class PostsComponent implements OnInit {
  private store = inject(Store);

  // store.select() → Observable döner, async pipe ile template'de kullanılır
  posts$ = this.store.select(selectPosts);
  loading$ = this.store.select(selectPostsLoading);
  error$ = this.store.select(selectPostsError);
  total$ = this.store.select(selectPostsTotal);

  ngOnInit(): void {
    this.store.dispatch(loadPosts());
  }

  reload(): void {
    this.store.dispatch(loadPosts());
  }

  readonly snippetActions = `export const loadPosts = createAction('[Posts] Load Posts');
export const loadPostsSuccess = createAction(
  '[Posts] Load Posts Success',
  props<{ posts: Post[]; total: number }>()
);`;

  readonly snippetReducer = `on(loadPosts, (state) =>
  ({ ...state, loading: true })),
on(loadPostsSuccess, (state, { posts }) =>
  ({ ...state, posts, loading: false })),`;

  readonly snippetEffect = `loadPosts$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadPosts),
    switchMap(() => this.http.get('/posts').pipe(
      map(res => loadPostsSuccess({ posts: res.posts })),
      catchError(err => of(loadPostsFailure({ error: err })))
    ))
  )
);`;

  readonly snippetSelector = `// Selector
export const selectPosts =
  createSelector(selectPostsState, s => s.posts);

// Component
posts$ = this.store.select(selectPosts);
this.store.dispatch(loadPosts());`;
}
