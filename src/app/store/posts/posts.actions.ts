import { createAction, props } from '@ngrx/store';
import { Post } from './post.model';

// Action: yalnızca ne olduğunu tanımlar, nasıl değişeceğini değil
export const loadPosts = createAction('[Posts] Load Posts');

export const loadPostsSuccess = createAction(
  '[Posts] Load Posts Success',
  props<{ posts: Post[]; total: number }>(),
);

export const loadPostsFailure = createAction(
  '[Posts] Load Posts Failure',
  props<{ error: string }>(),
);
