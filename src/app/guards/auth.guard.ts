import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { RepoUserService } from '../services/user/user.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private readonly srv: RepoUserService,
    private readonly router: Router
  ) {}

  canActivate(): boolean {
    if (this.srv.token$.value) {
      return true;
    }
    this.router.navigate(['/login']);
    return false;
  }
}
