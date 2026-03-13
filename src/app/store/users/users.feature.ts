import { createFeature, createReducer, on } from '@ngrx/store';
import { createAction, props } from '@ngrx/store';
import { User, UsersState } from './user.model';

// Actions — createFeature ile birlikte tanımlanabilir, ayrı dosyaya gerek yok
export const loadUsers = createAction('[Users] Load');
export const loadUsersSuccess = createAction(
  '[Users] Load Success',
  props<{ users: User[]; total: number }>(),
);
export const loadUsersFailure = createAction(
  '[Users] Load Failure',
  props<{ error: string }>(),
);

const initialState: UsersState = {
  users: [],
  total: 0,
  loading: false,
  error: null,
};

// createFeature: reducer + state + OTOMATİK selector üretimi
// Eski yol: createFeatureSelector + createSelector (her alan için ayrı)
// Yeni yol: createFeature → selectUsers, selectTotal, selectLoading, selectError hazır gelir
export const usersFeature = createFeature({
  name: 'users',
  reducer: createReducer(
    initialState,
    on(loadUsers, (state) => ({ ...state, loading: true, error: null })),
    on(loadUsersSuccess, (state, { users, total }) => ({
      ...state,
      users,
      total,
      loading: false,
    })),
    on(loadUsersFailure, (state, { error }) => ({
      ...state,
      loading: false,
      error,
    })),
  ),
});

// Auto-generated selectors (manuel createSelector yazmak gerekmez):
// usersFeature.selectUsersState → tüm UsersState
// usersFeature.selectUsers     → users[]
// usersFeature.selectTotal     → number
// usersFeature.selectLoading   → boolean
// usersFeature.selectError     → string | null
