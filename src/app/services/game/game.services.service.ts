import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, throwError } from 'rxjs';
import { Game } from 'src/app/types/types';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RepoGameService {
  private readonly apiUrl = `${environment.apiUrl}/games/`;
  private readonly _games$ = new BehaviorSubject<Game[]>([]);
  readonly gameInfo$ = new BehaviorSubject<Game>({} as Game);

  constructor(private readonly http: HttpClient) {}

  get games$(): Observable<Game[]> {
    return this._games$.asObservable();
  }

  /** Last catalog snapshot entry for an id, if any (for instant detail render). */
  cachedGame(id: string): Game | undefined {
    return this._games$.value.find((g) => g.id === id);
  }

  /** POST answers `{ results: [game] }`, the new game carrying its `id`. */
  createGame(game: Game): Observable<Game> {
    return this.http.post<{ results: Game[] }>(this.apiUrl, game).pipe(
      map((response) => response.results[0]),
      catchError((error) => {
        console.error('Failed to create game:', error);
        return throwError(() => error);
      }),
    );
  }

  loadGame(id: string): Observable<Game> {
    return this.http.get<{ results: Game[] }>(this.apiUrl + id).pipe(
      map((response) => response.results[0]),
      catchError((error) => {
        console.error('Failed to load game:', error);
        return throwError(() => error);
      }),
    );
  }

  loadAllGames(): Observable<Game[]> {
    return this.http.get<{ results: Game[][] }>(this.apiUrl).pipe(
      map((response) => {
        this._games$.next(response.results[0]);
        return response.results[0];
      }),
      catchError((error) => {
        console.error('Failed to load games:', error);
        return throwError(() => error);
      }),
    );
  }

  queryGame(category: string): Observable<Game[]> {
    const url =
      category === 'all' || category === ''
        ? this.apiUrl
        : `${this.apiUrl}filter/${category}`;

    return this.http.get<{ results: Game[][] }>(url).pipe(
      map((response) => {
        this._games$.next(response.results[0]);
        return response.results[0];
      }),
      catchError((error) => {
        console.error('Failed to query games:', error);
        return throwError(() => error);
      }),
    );
  }

  updateGame(id: string, game: Game): Observable<Game> {
    return this.http.put<Game>(this.apiUrl + id, game).pipe(
      catchError((error) => {
        console.error('Failed to update game:', error);
        return throwError(() => error);
      }),
    );
  }

  deleteGame(id: string): Observable<void> {
    return this.http.delete<void>(this.apiUrl + id).pipe(
      catchError((error) => {
        console.error('Failed to delete game:', error);
        return throwError(() => error);
      }),
    );
  }
}
