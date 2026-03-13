import { createReducer, on } from '@ngrx/store';
import { PostsState } from './post.model';
import { loadPosts, loadPostsSuccess, loadPostsFailure } from './posts.actions';

// Reducer: pure function — mevcut state + action → yeni state
// State'i ASLA doğrudan mutate etme, her zaman yeni nesne döndür
export const initialState: PostsState = {
  posts: [],
  total: 0,
  loading: false,
  error: null,
};

export const postsReducer = createReducer(
  initialState,
  on(loadPosts, (state) => ({ ...state, loading: true, error: null })),
  on(loadPostsSuccess, (state, { posts, total }) => ({
    ...state,
    posts,
    total,
    loading: false,
  })),
  on(loadPostsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
);
