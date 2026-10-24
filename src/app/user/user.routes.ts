import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth.guard';

export const USER_ROUTES: Routes = [
  {
    path: 'login',
    title: 'Sign in | World of Games',
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    title: 'Register | World of Games',
    loadComponent: () =>
      import('./register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'user/:id',
    title: 'Your profile | World of Games',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./detail/detail.component').then((m) => m.UserDetailComponent),
  },
  {
    path: 'cart',
    title: 'Cart | World of Games',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./cart/cart.component').then((m) => m.CartComponent),
  },
];
