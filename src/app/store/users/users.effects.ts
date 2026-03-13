import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpClient } from '@angular/common/http';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { loadUsers, loadUsersSuccess, loadUsersFailure } from './users.feature';
import { User } from './user.model';
import { API_CONFIG } from '../../core/api.config';

@Injectable()
export class UsersEffects {
  private actions$ = inject(Actions);
  private http = inject(HttpClient);

  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUsers),
      switchMap(() =>
        this.http
          .get<{ users: User[]; total: number }>(
            `${API_CONFIG.baseUrl}/users?limit=8`,
          )
          .pipe(
            map((res) => loadUsersSuccess({ users: res.users, total: res.total })),
            catchError((err) =>
              of(loadUsersFailure({ error: err.message ?? 'Bilinmeyen hata' })),
            ),
          ),
      ),
    ),
  );
}
