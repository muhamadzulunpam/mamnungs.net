import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">
          <i class="bi bi-cup-straw"></i>
          <span>Mamnungs</span>
        </div>

        <nav class="menu">
          @for (m of menus(); track m.href) {
            <a [routerLink]="m.href" routerLinkActive="active" class="menu-item">
              <i class="bi" [class]="m.icon"></i>
              <span>{{ m.label }}</span>
            </a>
          }
        </nav>

        <button class="logout" (click)="auth.logout()">
          <i class="bi bi-box-arrow-left"></i> Keluar
        </button>
      </aside>

      <div class="content">
        <header class="topbar">
          <div class="ms-auto d-flex align-items-center gap-2">
            <div class="text-end lh-sm">
              <div class="fw-semibold">{{ auth.user()?.name }}</div>
              <div class="role">{{ auth.user()?.role }}</div>
            </div>
            <div class="avatar">{{ auth.user()?.name?.charAt(0) }}</div>
          </div>
        </header>

        <main class="main">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    .layout { display: flex; min-height: 100vh; background: #f6f9f1; }
    .sidebar { width: 240px; flex-shrink: 0; background: linear-gradient(180deg, #1c2e0f, #14210a);
      color: #fff; display: flex; flex-direction: column; padding: 20px 14px; position: sticky; top: 0; height: 100vh; }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 18px; padding: 4px 8px 22px; }
    .brand i { background: linear-gradient(135deg, #84bd33, #6ba324); border-radius: 12px; padding: 9px; }
    .menu { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .menu-item { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 12px;
      color: #c5d1b3; text-decoration: none; font-weight: 600; font-size: 14px; }
    .menu-item:hover { background: rgba(255,255,255,.08); color: #fff; }
    .menu-item.active { background: linear-gradient(135deg, #84bd33, #6ba324); color: #fff; }
    .logout { background: transparent; border: 0; color: #f5b5b5; text-align: left; padding: 11px 14px;
      border-radius: 12px; font-weight: 600; }
    .logout:hover { background: rgba(239,68,68,.15); }
    .content { flex: 1; min-width: 0; }
    .topbar { height: 64px; background: #fff; border-bottom: 1px solid #eef2e6; display: flex;
      align-items: center; padding: 0 24px; }
    .role { font-size: 11px; font-weight: 700; color: #6ba324; text-transform: uppercase; }
    .avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #84bd33, #558a1a);
      color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; text-transform: uppercase; }
    .main { padding: 24px; }
  `,
})
export class Shell {
  auth = inject(AuthService);

  menus = computed(() =>
    this.auth.user()?.role === 'admin'
      ? [
          { label: 'Dashboard', href: '/admin/dashboard', icon: 'bi-speedometer2' },
          { label: 'Kasir / POS', href: '/kasir', icon: 'bi-cart3' },
        ]
      : [{ label: 'Kasir / POS', href: '/kasir', icon: 'bi-cart3' }],
  );
}