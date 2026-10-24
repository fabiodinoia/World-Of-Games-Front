import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth.guard';

/** The whole `games` subtree is sign-in only (authGuard on the parent in app.routes.ts); `create` keeps its own guard as a safeguard. */
export const GAME_ROUTES: Routes = [
  {
    path: '',
    title: 'Store | World of Games',
    loadComponent: () =>
      import('./games/games.component').then((m) => m.GamesComponent),
  },
  {
    path: 'create',
    title: 'Sell a game | World of Games',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./add/add.component').then((m) => m.AddComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./detail/detail.component').then((m) => m.DetailComponent),
  },
];
