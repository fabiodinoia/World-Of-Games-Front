import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  map,
  Observable,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import {
  ServerCompleteUserResponse,
  ServerLoginResponse,
} from 'src/app/types/server.response';
import { LoggedUser, Login, User, UserUpdate } from 'src/app/types/types';
import { environment } from 'src/environments/environment';
import * as jose from 'jose';

@Injectable({
  providedIn: 'root',
})
export class RepoUserService {
  private readonly apiUrl = `${environment.apiUrl}/users`;

  readonly token$ = new BehaviorSubject<string>('');
  readonly currentUser$ = new BehaviorSubject<User>({} as User);
  readonly userLogged$ = new BehaviorSubject<LoggedUser>({
    id: '',
    email: '',
    role: 'logout',
  });

  constructor(private readonly http: HttpClient) {}

  registerUser(user: User): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register`, user).pipe(
      catchError((error) => {
        console.error('Registration failed:', error);
        return throwError(() => error);
      }),
    );
  }

  loginUser(user: Login): Observable<string> {
    return this.http
      .post<ServerLoginResponse>(`${this.apiUrl}/login`, user)
      .pipe(
        map((data) => {
          const token = data.results.token;
          this.token$.next(token);
          localStorage.setItem('Token', token);
          const userInfo = jose.decodeJwt(token) as unknown as LoggedUser;
          this.userLogged$.next(userInfo);
          return token;
        }),
        catchError((error) => {
          console.error('Login failed:', error);
          return throwError(() => error);
        }),
      );
  }

  logout(): void {
    localStorage.removeItem('Token');
    this.token$.next('');
    this.currentUser$.next({} as User);
    this.userLogged$.next({ id: '', email: '', role: 'logout' });
  }

  restoreSession(): void {
    const token = localStorage.getItem('Token');
    if (!token) return;

    try {
      const userInfo = jose.decodeJwt(token) as unknown as LoggedUser;
      this.token$.next(token);
      this.userLogged$.next(userInfo);
    } catch {
      localStorage.removeItem('Token');
    }
  }

  getCurrentUser(userId: string): Observable<User> {
    return this.http
      .get<ServerCompleteUserResponse>(`${this.apiUrl}/${userId}`)
      .pipe(
        map((data) => {
          this.currentUser$.next(data.results[0]);
          return data.results[0];
        }),
        catchError((error) => {
          console.error('Failed to fetch user:', error);
          return throwError(() => error);
        }),
      );
  }

  updateUser(id: string, user: UserUpdate): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user).pipe(
      catchError((error) => {
        console.error('Failed to update user:', error);
        return throwError(() => error);
      }),
    );
  }

  /** Appends a game to the logged-in user's cart (the API only accepts own-id updates). */
  addToCart(gameId: string): Observable<User> {
    const userId = this.userLogged$.value.id;
    return this.getCurrentUser(userId).pipe(
      take(1),
      switchMap((user) =>
        this.updateUser(userId, {
          cart: [
            ...(user.cart ?? []).map((g) => g.id as string),
            gameId,
          ],
        }),
      ),
      // Re-fetch so currentUser$ (header badge) reflects the new cart.
      switchMap(() => this.getCurrentUser(userId)),
    );
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error('Failed to delete user:', error);
        return throwError(() => error);
      }),
    );
  }
}
