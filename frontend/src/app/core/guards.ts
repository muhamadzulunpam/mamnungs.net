import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Role } from './auth.service';

// Hanya untuk yang sudah login
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};

// Halaman login: kalau sudah login, arahkan ke beranda sesuai role
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const user = auth.user();
  return user ? inject(Router).createUrlTree([auth.homeFor(user.role)]) : true;
};

// Batasi berdasarkan role
export const roleGuard = (...roles: Role[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();

  if (!user) return router.createUrlTree(['/login']);
  return roles.includes(user.role) ? true : router.createUrlTree([auth.homeFor(user.role)]);
};

// Untuk alamat "/": arahkan ke beranda sesuai role
export const homeRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();
  return router.createUrlTree([user ? auth.homeFor(user.role) : '/login']);
};