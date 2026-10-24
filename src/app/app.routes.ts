import { Routes } from '@angular/router';
import { landingGuard } from 'src/app/guards/landing.guard';
import { homeGuard } from 'src/app/guards/home.guard';
import { authGuard } from 'src/app/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [landingGuard],
    loadComponent: () => import('src/app/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'home',
    canActivate: [homeGuard],
    title: 'World of Games',
    loadComponent: () =>
      import('./home/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'games',
    canActivate: [authGuard],
    loadChildren: () => import('./game/game.routes').then((m) => m.GAME_ROUTES),
  },
  {
    path: '',
    loadChildren: () => import('./user/user.routes').then((m) => m.USER_ROUTES),
  },
  {
    path: '**',
    title: 'Page not found | World of Games',
    loadComponent: () =>
      import('./not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
