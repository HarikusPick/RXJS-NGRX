import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PostsState } from './post.model';

// Selector: Store'dan dilim seçer, memoize edilir (aynı girdi → aynı çıktı)
export const selectPostsState = createFeatureSelector<PostsState>('posts');

export const selectPosts = createSelector(selectPostsState, (s) => s.posts);
export const selectPostsTotal = createSelector(selectPostsState, (s) => s.total);
export const selectPostsLoading = createSelector(selectPostsState, (s) => s.loading);
export const selectPostsError = createSelector(selectPostsState, (s) => s.error);
