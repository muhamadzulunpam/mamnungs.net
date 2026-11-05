import { DatePipe, CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { errorMessages } from '../../core/errors';
import { ReportData } from '../../core/models';
import { ReportService } from '../../core/report.service';
import { RupiahPipe } from '../../core/rupiah.pipe';
import { ToastService } from '../../core/toast.service';

const fmt = (d: Date) => d.toLocaleDateString('en-CA'); // format YYYY-MM-DD

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RupiahPipe],
  template: `
    <!-- ============ HEADER ============ -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Laporan Penjualan</h1>
        <p class="page-subtitle">
          Hanya transaksi <strong>lunas</strong> yang dihitung dalam laporan ini.
        </p>
      </div>
      <button class="btn-export" [disabled]="exporting()" (click)="export()">
        <i class="bi bi-download"></i>
        <span>{{ exporting() ? 'Mengunduh...' : 'Export CSV' }}</span>
      </button>
    </div>

    <!-- ============ TOOLBAR FILTER ============ -->
    <div class="toolbar">
      <div class="date-group">
        <div class="date-field">
          <label>Dari</label>
          <div class="date-input-wrap">
            <i class="bi bi-calendar3"></i>
            <input type="date" [ngModel]="from()" (ngModelChange)="setFrom($event)" />
          </div>
        </div>
        <div class="date-arrow">
          <i class="bi bi-arrow-right"></i>
        </div>
        <div class="date-field">
          <label>Sampai</label>
          <div class="date-input-wrap">
            <i class="bi bi-calendar3"></i>
            <input type="date" [ngModel]="to()" (ngModelChange)="setTo($event)" />
          </div>
        </div>
      </div>

      <div class="preset-group">
        <button class="preset-btn" [class.active]="isToday()" (click)="preset('today')">
          <i class="bi bi-calendar-day"></i> Hari Ini
        </button>
        <button class="preset-btn" [class.active]="isWeek()" (click)="preset('week')">
          <i class="bi bi-calendar-week"></i> 7 Hari
        </button>
        <button class="preset-btn" [class.active]="isMonth()" (click)="preset('month')">
          <i class="bi bi-calendar-month"></i> Bulan Ini
        </button>
      </div>
    </div>

    @if (data(); as r) {
      <!-- ============ STAT CARDS (COMPACT) ============ -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background:#eef7e0; color:#6ba324">
            <i class="bi bi-cash-stack"></i>
          </div>
          <div class="stat-body">
            <div class="stat-label">Total Penjualan</div>
            <div class="stat-value">{{ r.summary.total | rupiah }}</div>
            <div class="stat-sub">periode terpilih</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background:#e0f2fe; color:#0ea5e9">
            <i class="bi bi-receipt"></i>
          </div>
          <div class="stat-body">
            <div class="stat-label">Transaksi</div>
            <div class="stat-value">{{ r.summary.count }}</div>
            <div class="stat-sub">transaksi lunas</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background:#fce7f3; color:#ec4899">
            <i class="bi bi-calculator"></i>
          </div>
          <div class="stat-body">
            <div class="stat-label">Rata-rata</div>
            <div class="stat-value">{{ r.summary.average | rupiah }}</div>
            <div class="stat-sub">per transaksi</div>
          </div>
        </div>
      </div>

      <!-- ============ MAIN GRID ============ -->
      <div class="main-grid">
        <!-- Metode Pembayaran -->
        <div class="panel">
          <div class="panel-header">
            <div>
              <h3 class="panel-title"><i class="bi bi-credit-card-2-front"></i> Metode Pembayaran</h3>
              <p class="panel-sub">Distribusi per metode</p>
            </div>
          </div>

          @if (r.byMethod.length > 0) {
            <div class="method-list">
              @for (m of r.byMethod; track m.method) {
                <div class="method-row">
                  <div class="method-icon" [style.background]="getMethodStyle(m.method).bg" [style.color]="getMethodStyle(m.method).color">
                    <i class="bi" [class]="getMethodStyle(m.method).icon"></i>
                  </div>
                  <div class="method-info">
                    <div class="method-top">
                      <span class="method-name">{{ methodLabel(m.method) }}</span>
                      <span class="method-share">{{ share(m.total) }}%</span>
                    </div>
                    <div class="method-bottom">
                      <span class="method-total">{{ m.total | rupiah }}</span>
                      <span class="method-count">{{ m.count }} trx</span>
                    </div>
                    <div class="progress-track">
                      <div class="progress-fill" [style.width.%]="share(m.total)" [style.background]="getMethodStyle(m.method).color"></div>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-state">
              <div class="empty-icon"><i class="bi bi-credit-card"></i></div>
              <div class="empty-title">Belum Ada Data</div>
              <div class="empty-message">Belum ada transaksi lunas dalam periode ini.</div>
            </div>
          }
        </div>

        <!-- Produk Terlaris -->
        <div class="panel">
          <div class="panel-header">
            <div>
              <h3 class="panel-title"><i class="bi bi-trophy"></i> Produk Terlaris</h3>
              <p class="panel-sub">Top 5 menu di periode ini</p>
            </div>
          </div>

          @if (r.topProducts.length > 0) {
            <div class="product-list">
              @for (p of r.topProducts; track p.name; let i = $index) {
                <div class="product-row">
                  <div class="product-rank" [style.background]="productColors[i % 5] + '20'" [style.color]="productColors[i % 5]">
                    {{ i + 1 }}
                  </div>
                  <div class="product-info">
                    <div class="product-name">{{ p.name }}</div>
                    <div class="product-detail">{{ p.sold }} terjual · {{ p.revenue | rupiah }}</div>
                    <div class="progress-track">
                      <div class="progress-fill" [style.width.%]="(p.sold / maxSold()) * 100" [style.background]="productColors[i % 5]"></div>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-state">
              <div class="empty-icon"><i class="bi bi-cup-straw"></i></div>
              <div class="empty-title">Belum Ada Penjualan</div>
              <div class="empty-message">Produk terlaris akan muncul setelah ada transaksi lunas.</div>
            </div>
          }
        </div>
      </div>

      <!-- ============ DAILY TABLE ============ -->
      <div class="panel table-panel">
        <div class="panel-header">
          <div>
            <h3 class="panel-title"><i class="bi bi-calendar3"></i> Penjualan Per Hari</h3>
            <p class="panel-sub">{{ r.daily.length }} hari tercatat dalam periode ini</p>
          </div>
        </div>

        @if (r.daily.length > 0) {
          <div class="table-wrap">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Transaksi</th>
                  <th>Total</th>
                  <th class="text-end">Proporsi</th>
                </tr>
              </thead>
              <tbody>
                @for (d of r.daily; track d.date) {
                  <tr>
                    <td>
                      <div class="date-cell">
                        <i class="bi bi-calendar2-check"></i>
                        <span>{{ d.date | date: 'EEE, d MMM y' : '+0700' }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="trx-badge">{{ d.count }} trx</span>
                    </td>
                    <td>
                      <span class="total-cell">{{ d.total | rupiah }}</span>
                    </td>
                    <td>
                      <div class="bar-cell">
                        <div class="bar-track">
                          <div class="bar-fill" [style.width.%]="(d.total / maxDaily()) * 100"></div>
                        </div>
                        <span class="bar-percent">{{ Math.round((d.total / r.summary.total) * 100) }}%</span>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr class="row-total">
                  <td><strong>TOTAL</strong></td>
                  <td><strong>{{ r.summary.count }} trx</strong></td>
                  <td><strong>{{ r.summary.total | rupiah }}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        } @else {
          <div class="empty-state">
            <div class="empty-icon"><i class="bi bi-calendar-x"></i></div>
            <div class="empty-title">Tidak Ada Transaksi</div>
            <div class="empty-message">Belum ada transaksi lunas di rentang tanggal yang dipilih. Coba ubah filter tanggal.</div>
          </div>
        }
      </div>
    }
  `,
  styles: `
    @import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css');

    /* ============ HEADER ============ */
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .page-title { font-size: 26px; font-weight: 800; color: #14210a; letter-spacing: -0.8px; margin: 0 0 4px; }
    .page-subtitle { font-size: 13.5px; color: #6b7a5e; margin: 0; }
    .page-subtitle strong { color: #14210a; font-weight: 700; }

    .btn-export { display: inline-flex; align-items: center; gap: 8px; padding: 11px 20px; background: linear-gradient(135deg, #84bd33 0%, #6ba324 100%); color: #ffffff; text-decoration: none; border: none; border-radius: 12px; font-family: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; transition: all 0.25s; box-shadow: 0 8px 20px -8px rgba(107, 163, 36, 0.6); }
    .btn-export:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 24px -8px rgba(107, 163, 36, 0.7); color: #ffffff; }
    .btn-export:disabled { opacity: 0.7; cursor: wait; }

    /* ============ TOOLBAR ============ */
    .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 18px; background: #ffffff; border: 1px solid #eef2e6; border-radius: 16px; margin-bottom: 20px; flex-wrap: wrap; box-shadow: 0 4px 20px -12px rgba(20, 33, 10, 0.08); }
    .date-group { display: flex; align-items: flex-end; gap: 10px; }
    .date-field label { display: block; font-size: 11px; font-weight: 700; color: #6b7a5e; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 5px; }
    .date-input-wrap { position: relative; display: flex; align-items: center; background: #f8fbf3; border: 1.5px solid #e2e8d5; border-radius: 10px; padding: 0 12px; transition: all 0.2s; }
    .date-input-wrap:focus-within { border-color: #84bd33; background: #ffffff; box-shadow: 0 0 0 4px rgba(132, 189, 51, 0.12); }
    .date-input-wrap > i { color: #a3b190; font-size: 13px; pointer-events: none; margin-right: 8px; }
    .date-input-wrap:focus-within > i { color: #6ba324; }
    .date-input-wrap input { border: none; background: transparent; padding: 9px 0; font-family: inherit; font-size: 12.5px; font-weight: 600; color: #14210a; outline: none; cursor: pointer; width: 120px; }
    .date-input-wrap input::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
    .date-arrow { padding-bottom: 10px; color: #cbd5b5; font-size: 14px; }

    .preset-group { display: flex; gap: 6px; flex-wrap: wrap; }
    .preset-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 10px; background: #f8fbf3; border: 1.5px solid #e2e8d5; color: #4a5a3d; font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all 0.18s; white-space: nowrap; }
    .preset-btn:hover { border-color: #84bd33; color: #6ba324; background: #f0f8e5; }
    .preset-btn.active { background: linear-gradient(135deg, #84bd33, #6ba324); border-color: #6ba324; color: #ffffff; box-shadow: 0 4px 12px -4px rgba(107, 163, 36, 0.5); }
    .preset-btn i { font-size: 13px; }

    /* ============ STAT CARDS ============ */
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .stat-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: #ffffff; border: 1px solid #eef2e6; border-radius: 14px; transition: all 0.2s; min-width: 0; }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 12px 24px -12px rgba(60, 100, 20, 0.15); border-color: #d8e8bf; }
    .stat-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
    .stat-body { flex: 1; min-width: 0; }
    .stat-label { font-size: 10.5px; font-weight: 700; color: #6b7a5e; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .stat-value { font-size: 16px; font-weight: 800; color: #14210a; letter-spacing: -0.3px; font-family: ui-monospace, monospace; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .stat-sub { font-size: 10.5px; color: #94a3b8; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* ============ MAIN GRID ============ */
    .main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    @media (max-width: 900px) { .main-grid { grid-template-columns: 1fr; } }

    /* ============ PANEL ============ */
    .panel { background: #ffffff; border: 1px solid #eef2e6; border-radius: 18px; padding: 20px; box-shadow: 0 4px 20px -12px rgba(20, 33, 10, 0.08); }
    .panel-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
    .panel-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 800; color: #14210a; margin: 0 0 2px; letter-spacing: -0.2px; }
    .panel-title i { color: #6ba324; font-size: 15px; }
    .panel-sub { font-size: 12px; color: #94a3b8; margin: 0; }

    /* Metode */
    .method-list { display: flex; flex-direction: column; gap: 16px; }
    .method-row { display: flex; align-items: center; gap: 12px; }
    .method-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
    .method-info { flex: 1; min-width: 0; }
    .method-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; }
    .method-name { font-size: 13.5px; font-weight: 700; color: #14210a; }
    .method-share { font-size: 13px; font-weight: 800; color: #6ba324; font-family: ui-monospace, monospace; }
    .method-bottom { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 7px; }
    .method-total { font-size: 12.5px; color: #4a5a3d; font-weight: 600; font-family: ui-monospace, monospace; }
    .method-count { font-size: 11px; color: #94a3b8; }
    .progress-track { height: 6px; background: #f0f4e8; border-radius: 100px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 100px; transition: width 0.5s ease; }

    /* Produk */
    .product-list { display: flex; flex-direction: column; gap: 14px; }
    .product-row { display: flex; align-items: center; gap: 12px; }
    .product-rank { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; flex-shrink: 0; }
    .product-info { flex: 1; min-width: 0; }
    .product-name { font-size: 13.5px; font-weight: 700; color: #14210a; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .product-detail { font-size: 11.5px; color: #94a3b8; margin-bottom: 6px; }

    /* ============ TABLE ============ */
    .table-panel { padding-bottom: 8px; }
    .table-wrap { overflow-x: auto; margin: 0 -20px; padding: 0 20px; }
    .custom-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    .custom-table th { text-align: left; padding: 10px 12px; font-size: 11.5px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 1.5px solid #eef2e6; white-space: nowrap; }
    .custom-table th.text-end { text-align: right; }
    .custom-table td { padding: 12px; border-bottom: 1px solid #f4f7ee; color: #14210a; vertical-align: middle; }
    .custom-table tbody tr { transition: background 0.15s; }
    .custom-table tbody tr:hover { background: #fafcf6; }

    .date-cell { display: flex; align-items: center; gap: 8px; font-weight: 600; }
    .date-cell i { color: #a3b190; font-size: 13px; }
    .trx-badge { display: inline-flex; align-items: center; padding: 4px 10px; background: #f0f8e5; color: #558a1a; border-radius: 100px; font-size: 11.5px; font-weight: 700; white-space: nowrap; }
    .total-cell { font-family: ui-monospace, monospace; font-weight: 800; font-size: 13.5px; color: #14210a; white-space: nowrap; }

    .bar-cell { display: flex; align-items: center; gap: 10px; justify-content: flex-end; }
    .bar-track { flex: 1; max-width: 180px; height: 8px; background: #f0f4e8; border-radius: 100px; overflow: hidden; }
    .bar-fill { height: 100%; background: linear-gradient(90deg, #a3d65c 0%, #84bd33 100%); border-radius: 100px; transition: width 0.5s ease; }
    .bar-percent { font-size: 11.5px; font-weight: 700; color: #6b7a5e; font-family: ui-monospace, monospace; min-width: 34px; text-align: right; }

    .row-total { background: #fafcf6; border-top: 2px solid #eef2e6; }
    .row-total td { padding: 14px 12px; border-bottom: none; font-size: 13.5px; }
    .row-total td strong { color: #14210a; font-weight: 800; }

    /* ============ EMPTY STATE ============ */
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center; }
    .empty-icon { width: 68px; height: 68px; border-radius: 20px; background: linear-gradient(135deg, #f0f8e5 0%, #e8efdb 100%); color: #84bd33; display: flex; align-items: center; justify-content: center; font-size: 30px; margin-bottom: 14px; }
    .empty-title { font-size: 15px; font-weight: 800; color: #14210a; margin-bottom: 4px; }
    .empty-message { font-size: 12.5px; color: #6b7a5e; line-height: 1.5; max-width: 280px; }

    /* ============ RESPONSIVE ============ */
    @media (max-width: 768px) {
      .toolbar { padding: 12px 14px; }
      .date-group { flex: 1; width: 100%; }
      .date-field { flex: 1; }
      .date-input-wrap { width: 100%; }
      .date-input-wrap input { width: 100%; }
      .date-arrow { display: none; }
      .preset-group { width: 100%; }
      .preset-btn { flex: 1; justify-content: center; }
      .stats-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .page-title { font-size: 22px; }
      .btn-export { width: 100%; justify-content: center; }
      .panel { padding: 16px; }
      .table-wrap { margin: 0 -16px; padding: 0 16px; }
      .custom-table th, .custom-table td { padding: 10px 8px; font-size: 12.5px; }
      .bar-track { max-width: 80px; }
      .bar-percent { min-width: 30px; font-size: 10.5px; }
    }
  `,
})
export class Reports implements OnInit {
  private api = inject(ReportService);
  private toast = inject(ToastService);

  from = signal(fmt(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  to = signal(fmt(new Date()));
  data = signal<ReportData | null>(null);
  exporting = signal(false);

  maxDaily = computed(() => Math.max(...(this.data()?.daily.map((d) => d.total) ?? [0]), 1));
  maxSold = computed(() => Math.max(...(this.data()?.topProducts.map((p) => p.sold) ?? [0]), 1));

  Math = Math; // expose untuk template
  productColors = ['#84bd33', '#f4a82a', '#22c55e', '#ec4899', '#0ea5e9'];

  // Helper Cek State Aktif
  isToday = () => {
    const t = fmt(new Date());
    return this.from() === t && this.to() === t;
  }
  
  isWeek = () => {
    const now = new Date();
    const s = new Date();
    s.setDate(now.getDate() - 6);
    return this.from() === fmt(s) && this.to() === fmt(now);
  }
  
  isMonth = () => {
    const now = new Date();
    const start = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
    return this.from() === start && this.to() === fmt(now);
  }

  // Helper Metode
  getMethodStyle(method: string) {
    const m = method.toUpperCase();
    if (m === 'CASH') return { bg: '#eef7e0', color: '#6ba324', icon: 'bi-cash-coin' };
    if (m === 'QRIS') return { bg: '#dbeafe', color: '#1d4ed8', icon: 'bi-qr-code' };
    if (m === 'DEBIT') return { bg: '#fef3c7', color: '#d97706', icon: 'bi-credit-card' };
    if (m === 'TRANSFER') return { bg: '#fce7f3', color: '#ec4899', icon: 'bi-bank' };
    return { bg: '#f4f7ee', color: '#6b7a5e', icon: 'bi-wallet2' };
  }

  methodLabel(method: string) {
    const m = method.toUpperCase();
    if (m === 'CASH') return 'Tunai';
    if (m === 'QRIS') return 'QRIS';
    if (m === 'DEBIT') return 'Debit';
    if (m === 'TRANSFER') return 'Transfer';
    return method;
  }

  // Lifecycle & API
  ngOnInit() {
    this.load();
  }

  load() {
    if (!this.from() || !this.to() || this.from() > this.to()) return;

    this.api.get(this.from(), this.to()).subscribe({
      next: (r) => this.data.set(r),
      error: (err) => this.toast.error(errorMessages(err)[0]),
    });
  }

  setFrom(v: string) { this.from.set(v); this.load(); }
  setTo(v: string) { this.to.set(v); this.load(); }

  preset(kind: 'today' | 'week' | 'month') {
    const now = new Date();

    if (kind === 'today') {
      this.from.set(fmt(now));
    } else if (kind === 'week') {
      const s = new Date();
      s.setDate(now.getDate() - 6);
      this.from.set(fmt(s));
    } else {
      this.from.set(fmt(new Date(now.getFullYear(), now.getMonth(), 1)));
    }

    this.to.set(fmt(now));
    this.load();
  }

  share(total: number) {
    const sum = this.data()?.summary.total ?? 0;
    return sum > 0 ? Math.round((total / sum) * 100) : 0;
  }

  export() {
    this.exporting.set(true);

    this.api.export(this.from(), this.to()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `laporan-${this.from()}-sd-${this.to()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: (err) => {
        this.toast.error(errorMessages(err)[0]);
        this.exporting.set(false);
      },
    });
  }
}