import { DatePipe, CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OrdersResponse } from '../../core/models';
import { OrderService } from '../../core/order.service';
import { RupiahPipe } from '../../core/rupiah.pipe';

const STATUS: Record<string, { label: string; cls: string; icon: string }> = {
  PAID: { label: 'Lunas', cls: 'status-paid', icon: 'bi-check-circle-fill' },
  PENDING: { label: 'Menunggu', cls: 'status-pending', icon: 'bi-clock-fill' },
  CANCELLED: { label: 'Dibatalkan', cls: 'status-cancelled', icon: 'bi-x-circle-fill' },
  EXPIRED: { label: 'Kedaluwarsa', cls: 'status-expired', icon: 'bi-dash-circle-fill' },
};

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, RupiahPipe],
  template: `
    <!-- ============ HEADER ============ -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Riwayat Transaksi</h1>
        <p class="page-subtitle">
          Lihat dan kelola riwayat penjualan berdasarkan tanggal.
        </p>
      </div>

      <!-- Date filter group -->
      <div class="date-filter-group">
        <div class="date-quick">
          <button class="date-quick-btn" [class.active]="isToday()" (click)="setDate(0)">
            Hari Ini
          </button>
          <button class="date-quick-btn" [class.active]="isYesterday()" (click)="setDate(-1)">
            Kemarin
          </button>
        </div>

        <div class="date-picker">
          <i class="bi bi-calendar3"></i>
          <input type="date" class="date-input" 
                 [ngModel]="date()" (ngModelChange)="changeDate($event)" />
        </div>
      </div>
    </div>

    <!-- ============ DATE BANNER ============ -->
    <div class="date-banner">
      <div class="date-banner-icon">
        <i class="bi bi-calendar-check"></i>
      </div>
      <div class="date-banner-text">
        <div class="date-banner-label">Menampilkan data untuk</div>
        <div class="date-banner-value">{{ date() | date: 'EEEE, d MMMM yyyy' : '+0700' }}</div>
      </div>
    </div>

    <!-- ============ STAT CARDS (COMPACT) ============ -->
    <div class="stats-grid">
      <!-- Transaksi Lunas -->
      <div class="stat-card">
        <div class="stat-icon" style="background:#eef7e0; color:#6ba324">
          <i class="bi bi-receipt"></i>
        </div>
        <div class="stat-body">
          <div class="stat-label">Transaksi Lunas</div>
          <div class="stat-value">{{ result()?.summary?.count ?? 0 }}</div>
          <div class="stat-sub">transaksi berhasil</div>
        </div>
      </div>

      <!-- Total Penjualan -->
      <div class="stat-card">
        <div class="stat-icon" style="background:#dcfce7; color:#15803d">
          <i class="bi bi-cash-stack"></i>
        </div>
        <div class="stat-body">
          <div class="stat-label">Total Penjualan</div>
          <div class="stat-value">{{ result()?.summary?.total | rupiah }}</div>
          <div class="stat-sub">dari {{ result()?.summary?.count ?? 0 }} transaksi</div>
        </div>
      </div>

      <!-- Rata-rata -->
      <div class="stat-card">
        <div class="stat-icon" style="background:#dbeafe; color:#1d4ed8">
          <i class="bi bi-calculator"></i>
        </div>
        <div class="stat-body">
          <div class="stat-label">Rata-rata</div>
          <div class="stat-value">{{ average() | rupiah }}</div>
          <div class="stat-sub">per transaksi</div>
        </div>
      </div>
    </div>

    <!-- ============ TABLE PANEL ============ -->
    <div class="table-panel">
      @if (items().length === 0) {
        <!-- Empty State -->
        <div class="empty-state">
          <div class="empty-icon"><i class="bi bi-receipt-cutoff"></i></div>
          <h4 class="empty-title">Belum Ada Transaksi</h4>
          <p class="empty-message">
            Belum ada transaksi tercatat di tanggal ini. Pilih tanggal lain atau mulai transaksi baru di kasir.
          </p>
          <a routerLink="/kasir" class="empty-btn">
            <i class="bi bi-cart3"></i> Buka Kasir
          </a>
        </div>
      } @else {
        <div class="table-wrap">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Jam</th>
                <th>Kasir</th>
                <th>Metode</th>
                <th>Total</th>
                <th>Status</th>
                <th class="text-end">Aksi</th>
              </tr>
            </thead>
            <tbody>
              @for (o of items(); track o.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/transaksi', o.id, 'struk']" class="invoice-link">
                      <i class="bi bi-receipt"></i> {{ o.invoiceNumber }}
                    </a>
                  </td>
                  <td>
                    <div class="time-cell">
                      <i class="bi bi-clock"></i>
                      <span>{{ o.createdAt | date: 'HH:mm' : '+0700' }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="cashier-cell">
                      <div class="cashier-avatar">{{ (o.cashierName || 'U').charAt(0).toUpperCase() }}</div>
                      <span>{{ o.cashierName }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="method-badge">
                      <i class="bi" [ngClass]="getMethodIcon(o.paymentMethod)"></i>
                      {{ o.paymentMethod }}
                    </span>
                  </td>
                  <td>
                    <span class="total-cell">{{ o.total | rupiah }}</span>
                  </td>
                  <td>
                    <span class="status-pill" [class]="status(o.status).cls">
                      <i class="bi" [class]="status(o.status).icon"></i>
                      {{ status(o.status).label }}
                    </span>
                  </td>
                  <td class="text-end">
                    <a [routerLink]="['/transaksi', o.id, 'struk']" class="btn-action btn-receipt">
                      <i class="bi bi-printer"></i><span>Struk</span>
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (result(); as r) {
          @if (r.totalPages > 1) {
            <div class="pagination-wrap">
              <div class="pagination-info">
                Menampilkan <strong>{{ (r.page - 1) * 10 + 1 }}</strong>–<strong>{{ Math.min(r.page * 10, r.total) }}</strong>
                dari <strong>{{ r.total }}</strong> transaksi
              </div>
              <nav class="pagination-nav">
                <ul class="pagination">
                  <li class="page-item" [class.disabled]="r.page <= 1">
                    <button class="page-link" [disabled]="r.page <= 1" (click)="go(r.page - 1)">
                      <i class="bi bi-chevron-left"></i> Prev
                    </button>
                  </li>
                  <li class="page-item active">
                    <span class="page-link">{{ r.page }}</span>
                  </li>
                  <li class="page-item" [class.disabled]="r.page >= r.totalPages">
                    <button class="page-link" [disabled]="r.page >= r.totalPages" (click)="go(r.page + 1)">
                      Next <i class="bi bi-chevron-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          }
        }
      }
    </div>
  `,
  styles: `
    @import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css');

    /* ============ HEADER ============ */
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .page-title { font-size: 26px; font-weight: 800; color: #14210a; letter-spacing: -0.8px; margin: 0 0 4px; }
    .page-subtitle { font-size: 13.5px; color: #6b7a5e; margin: 0; }

    /* Date Filter Group */
    .date-filter-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .date-quick { display: inline-flex; gap: 4px; padding: 4px; background: #ffffff; border: 1.5px solid #e2e8d5; border-radius: 12px; }
    .date-quick-btn { padding: 8px 14px; border: none; background: transparent; color: #4a5a3d; font-family: inherit; font-size: 12.5px; font-weight: 700; border-radius: 9px; cursor: pointer; transition: all 0.18s; }
    .date-quick-btn:hover { color: #6ba324; background: #f8fbf3; }
    .date-quick-btn.active { background: linear-gradient(135deg, #84bd33, #6ba324); color: #ffffff; box-shadow: 0 4px 12px -4px rgba(107, 163, 36, 0.5); }

    .date-picker { position: relative; display: flex; align-items: center; background: #ffffff; border: 1.5px solid #e2e8d5; border-radius: 12px; padding: 0 14px; transition: all 0.2s; }
    .date-picker:focus-within { border-color: #84bd33; box-shadow: 0 0 0 4px rgba(132, 189, 51, 0.12); }
    .date-picker > i { color: #a3b190; font-size: 14px; pointer-events: none; margin-right: 8px; }
    .date-picker:focus-within > i { color: #6ba324; }
    .date-input { border: none; background: transparent; padding: 10px 0; font-family: inherit; font-size: 13px; font-weight: 600; color: #14210a; outline: none; cursor: pointer; }
    .date-input::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; transition: opacity 0.15s; }
    .date-input::-webkit-calendar-picker-indicator:hover { opacity: 1; }

    /* ============ DATE BANNER ============ */
    .date-banner { display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: linear-gradient(135deg, #f0f8e5 0%, #e8efdb 100%); border: 1px solid #d8e8bf; border-radius: 14px; margin-bottom: 20px; }
    .date-banner-icon { width: 44px; height: 44px; border-radius: 12px; background: #ffffff; color: #6ba324; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; box-shadow: 0 4px 12px -4px rgba(107, 163, 36, 0.25); }
    .date-banner-label { font-size: 11px; font-weight: 700; color: #6b7a5e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .date-banner-value { font-size: 15px; font-weight: 800; color: #14210a; letter-spacing: -0.3px; text-transform: capitalize; }

    /* ============ STAT CARDS ============ */
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .stat-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: #ffffff; border: 1px solid #eef2e6; border-radius: 14px; transition: all 0.2s; min-width: 0; }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 12px 24px -12px rgba(60, 100, 20, 0.15); border-color: #d8e8bf; }
    .stat-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
    .stat-body { flex: 1; min-width: 0; }
    .stat-label { font-size: 10.5px; font-weight: 700; color: #6b7a5e; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .stat-value { font-size: 16px; font-weight: 800; color: #14210a; letter-spacing: -0.3px; font-family: ui-monospace, monospace; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .stat-sub { font-size: 10.5px; color: #94a3b8; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* ============ TABLE ============ */
    .table-panel { background: #ffffff; border: 1px solid #eef2e6; border-radius: 18px; padding: 8px; box-shadow: 0 4px 20px -12px rgba(20, 33, 10, 0.08); }
    .table-wrap { overflow-x: auto; border-radius: 12px; }

    .custom-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13.5px; }
    .custom-table thead th { text-align: left; padding: 14px 16px; font-size: 11.5px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; background: #fafcf6; border-bottom: 1.5px solid #eef2e6; white-space: nowrap; }
    .custom-table thead th:first-child { border-radius: 12px 0 0 0; }
    .custom-table thead th:last-child { border-radius: 0 12px 0 0; }
    .custom-table tbody td { padding: 14px 16px; border-bottom: 1px solid #f4f7ee; color: #14210a; vertical-align: middle; }
    .custom-table tbody tr { transition: background 0.15s; }
    .custom-table tbody tr:hover { background: #fafcf6; }
    .custom-table tbody tr:last-child td { border-bottom: none; }

    /* Invoice & Cells */
    .invoice-link { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; background: #f0f8e5; color: #558a1a; border-radius: 8px; font-family: ui-monospace, monospace; font-size: 12px; font-weight: 800; text-decoration: none; transition: all 0.15s; white-space: nowrap; }
    .invoice-link:hover { background: #84bd33; color: #ffffff; transform: translateY(-1px); }

    .time-cell { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #4a5a3d; font-weight: 600; }
    .time-cell i { color: #a3b190; font-size: 12px; }

    .cashier-cell { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
    .cashier-avatar { width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #84bd33, #558a1a); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0; }

    .method-badge { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; background: #f4f7ee; color: #4a5a3d; border-radius: 8px; font-size: 11.5px; font-weight: 700; white-space: nowrap; }
    .method-badge i { font-size: 11px; color: #6b7a5e; }

    .total-cell { font-family: ui-monospace, monospace; font-size: 13.5px; font-weight: 800; color: #14210a; letter-spacing: -0.3px; white-space: nowrap; }

    /* Status */
    .status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 100px; font-size: 11.5px; font-weight: 700; white-space: nowrap; }
    .status-pill i { font-size: 10px; }
    .status-paid { background: #dcfce7; color: #15803d; }
    .status-pending { background: #fef3c7; color: #b45309; }
    .status-cancelled { background: #fee2e2; color: #b91c1c; }
    .status-expired { background: #f1f5f9; color: #64748b; }
    .status-default { background: #f4f7ee; color: #6b7a5e; }

    /* Actions */
    .btn-action { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 9px; font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; text-decoration: none; border: 1.5px solid transparent; transition: all 0.18s; white-space: nowrap; }
    .btn-action i { font-size: 13px; }
    .btn-receipt { background: #f8fbf3; border-color: #e2e8d5; color: #4a5a3d; }
    .btn-receipt:hover { background: #f0f8e5; border-color: #84bd33; color: #6ba324; transform: translateY(-1px); }

    /* ============ EMPTY STATE ============ */
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 24px; text-align: center; }
    .empty-icon { width: 90px; height: 90px; border-radius: 24px; background: linear-gradient(135deg, #f0f8e5 0%, #e8efdb 100%); display: flex; align-items: center; justify-content: center; font-size: 40px; color: #84bd33; margin-bottom: 20px; }
    .empty-title { font-size: 17px; font-weight: 800; color: #14210a; margin: 0 0 6px; }
    .empty-message { font-size: 13.5px; color: #6b7a5e; line-height: 1.6; margin: 0 0 20px; max-width: 340px; }
    .empty-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg, #84bd33, #6ba324); color: #fff; border: none; border-radius: 12px; font-size: 13.5px; font-weight: 700; cursor: pointer; transition: all 0.2s; text-decoration: none; box-shadow: 0 8px 20px -8px rgba(107, 163, 36, 0.6); }
    .empty-btn:hover { transform: translateY(-1px); box-shadow: 0 12px 24px -8px rgba(107, 163, 36, 0.7); color: #fff; }

    /* ============ PAGINATION ============ */
    .pagination-wrap { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 16px; border-top: 1px solid #f4f7ee; flex-wrap: wrap; }
    .pagination-info { font-size: 12.5px; color: #6b7a5e; }
    .pagination-info strong { color: #14210a; font-weight: 700; }
    .pagination-nav { display: flex; }
    .pagination { display: flex; gap: 4px; list-style: none; padding: 0; margin: 0; }
    .page-item .page-link { display: inline-flex; align-items: center; justify-content: center; min-width: 34px; height: 34px; padding: 0 10px; border-radius: 9px; border: 1.5px solid #e2e8d5; background: #ffffff; color: #4a5a3d; font-family: inherit; font-size: 12.5px; font-weight: 600; text-decoration: none; transition: all 0.15s; cursor: pointer; }
    .page-item .page-link:hover { border-color: #84bd33; color: #6ba324; background: #f0f8e5; }
    .page-item.active .page-link { background: linear-gradient(135deg, #84bd33, #6ba324); border-color: #6ba324; color: #ffffff; box-shadow: 0 4px 12px -4px rgba(107, 163, 36, 0.5); }
    .page-item.disabled .page-link { background: #fafcf6; color: #cbd5b5; border-color: #eef2e6; cursor: not-allowed; }

    /* ============ RESPONSIVE ============ */
    @media (max-width: 900px) {
      .stats-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .date-filter-group { width: 100%; }
      .date-quick { flex: 1; }
      .date-quick-btn { flex: 1; text-align: center; }
      .date-picker { flex: 1; }
      .date-input { width: 100%; }
      .pagination-wrap { flex-direction: column; align-items: stretch; }
      .pagination-info { text-align: center; }
      .pagination { justify-content: center; }
    }
    @media (max-width: 640px) {
      .page-title { font-size: 22px; }
      .btn-action span { display: none; }
      .btn-action { padding: 8px 10px; }
      .custom-table thead th, .custom-table tbody td { padding: 12px 10px; }
    }
  `,
})
export class History implements OnInit {
  private api = inject(OrderService);

  // State
  date = signal(new Date().toLocaleDateString('en-CA')); // format YYYY-MM-DD
  page = signal(1);
  result = signal<OrdersResponse | null>(null);
  
  // Computed
  items = computed(() => this.result()?.items ?? []);
  average = computed(() => {
    const count = this.result()?.summary?.count ?? 0;
    const total = this.result()?.summary?.total ?? 0;
    return count > 0 ? Math.round(total / count) : 0;
  });

  Math = Math; // expose untuk template

  // Helpers
  status = (s: string) => STATUS[s] ?? { label: s, cls: 'status-default', icon: 'bi-circle-fill' };
  
  getMethodIcon(method: string | undefined): string {
    if (!method) return 'bi-dash';
    const m = method.toUpperCase();
    if (m === 'CASH') return 'bi-cash-coin';
    if (m === 'QRIS') return 'bi-qr-code';
    if (m === 'DEBIT') return 'bi-credit-card';
    if (m === 'TRANSFER') return 'bi-bank';
    return 'bi-wallet2';
  }

  isToday = () => this.date() === new Date().toLocaleDateString('en-CA');
  
  isYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return this.date() === d.toLocaleDateString('en-CA');
  };

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.list(this.date(), this.page()).subscribe((r) => this.result.set(r));
  }

  setDate(offsetDays: number) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    this.changeDate(d.toLocaleDateString('en-CA'));
  }

  changeDate(value: string) {
    if (!value) return;
    this.date.set(value);
    this.page.set(1);
    this.load();
  }

  go(page: number) {
    this.page.set(page);
    this.load();
  }
}