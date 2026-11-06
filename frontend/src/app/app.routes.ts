import { Routes } from '@angular/router';
import { authGuard, guestGuard, homeRedirectGuard, roleGuard } from './core/guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login').then((m) => m.Login),
  },
  // Struk di luar layout (tanpa sidebar) supaya bersih saat dicetak
  {
    path: 'transaksi/:id/struk',
    canActivate: [roleGuard('kasir', 'admin')],
    loadComponent: () => import('./pages/transaksi/receipt').then((m) => m.Receipt),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },
      {
        path: 'admin/dashboard',
        canActivate: [roleGuard('admin')],
        loadComponent: () => import('./pages/admin/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'admin/categories',
        canActivate: [roleGuard('admin')],
        loadComponent: () => import('./pages/admin/categories').then((m) => m.Categories),
      },
      {
        path: 'admin/products',
        canActivate: [roleGuard('admin')],
        loadComponent: () => import('./pages/admin/products').then((m) => m.Products),
      },
      {
        path: 'admin/products/new',
        canActivate: [roleGuard('admin')],
        loadComponent: () => import('./pages/admin/product-form').then((m) => m.ProductForm),
      },
      {
        path: 'admin/products/:id/edit',
        canActivate: [roleGuard('admin')],
        loadComponent: () => import('./pages/admin/product-form').then((m) => m.ProductForm),
      },
      {
        path: 'admin/reports',
        canActivate: [roleGuard('admin')],
        loadComponent: () => import('./pages/admin/reports').then((m) => m.Reports),
      },
      {
        path: 'kasir',
        canActivate: [roleGuard('kasir', 'admin')],
        loadComponent: () => import('./pages/kasir/pos').then((m) => m.Pos),
      },
      {
        path: 'kasir/pembayaran/:id',
        canActivate: [roleGuard('kasir', 'admin')],
        loadComponent: () => import('./pages/kasir/qris').then((m) => m.Qris),
      },
      {
        path: 'transaksi',
        canActivate: [roleGuard('kasir', 'admin')],
        loadComponent: () => import('./pages/transaksi/history').then((m) => m.History),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];