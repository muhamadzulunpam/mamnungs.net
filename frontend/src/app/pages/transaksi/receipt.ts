import { DatePipe, CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessages } from '../../core/errors';
import { Receipt as ReceiptModel } from '../../core/models';
import { OrderService } from '../../core/order.service';
import { RupiahPipe } from '../../core/rupiah.pipe';

@Component({
  selector: 'app-receipt',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, RupiahPipe],
  template: `
    <div class="struk-page">
      <!-- ============ ACTION BAR (no print) ============ -->
      <div class="action-bar no-print">
        <div class="action-bar-inner">
          <div class="action-info">
            <div class="action-icon"><i class="bi bi-receipt"></i></div>
            <div>
              <div class="action-title">Struk Transaksi</div>
              <div class="action-sub">{{ receipt()?.invoiceNumber || 'Memuat...' }}</div>
            </div>
          </div>

          <div class="action-buttons">
            @if (isKasir()) {
              <a routerLink="/kasir" class="btn-action btn-primary-action">
                <i class="bi bi-plus-lg"></i><span>Transaksi Baru</span>
              </a>
            }
            <a routerLink="/transaksi" class="btn-action btn-ghost-action">
              <i class="bi bi-clock-history"></i><span>Riwayat</span>
            </a>
            @if (receipt()) {
              <button class="btn-action btn-print" (click)="print()">
                <i class="bi bi-printer"></i><span>Cetak Struk</span>
              </button>
            }
          </div>
        </div>
      </div>

      <!-- ============ ERROR STATE ============ -->
      @if (error()) {
        <div class="alert-custom no-print">
          <i class="bi bi-exclamation-circle-fill"></i> {{ error() }}
        </div>
      }

      <!-- ============ STRUK ============ -->
      @if (receipt(); as r) {
        <div class="struk-wrapper">
          <div class="struk">
            <!-- Store Header -->
            <div class="struk-header">
              <div class="store-logo"><i class="bi bi-cup-straw"></i></div>
              <div class="store-name">{{ r.store.name }}</div>
              @if (r.store.address) {
                <div class="store-address">{{ r.store.address }}</div>
              }
            </div>

            <div class="divider-solid"></div>

            <!-- Transaction Info -->
            <div class="info-block">
              <div class="info-row">
                <span class="info-label">No. Invoice</span>
                <span class="info-value info-value-strong">{{ r.invoiceNumber }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Waktu</span>
                <span class="info-value">{{ r.createdAt | date: 'dd/MM/yyyy HH:mm' : '+0700' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Kasir</span>
                <span class="info-value">{{ r.cashierName }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Metode</span>
                <span class="info-value">{{ r.paymentMethod }}</span>
              </div>
            </div>

            <div class="divider-dash"></div>

            <!-- Items -->
            <div class="items-block">
              <div class="items-header">
                <span class="items-header-title">Item</span>
                <span class="items-header-total">Total</span>
              </div>
              @for (i of r.items; track $index) {
                <div class="item-row">
                  <div class="item-name">{{ i.name }}</div>
                  <div class="item-detail">
                    <span class="item-qty">{{ i.quantity }} × {{ i.price | rupiah }}</span>
                    <span class="item-subtotal">{{ i.subtotal | rupiah }}</span>
                  </div>
                </div>
              }
            </div>

            <div class="divider-dash"></div>

            <!-- Summary -->
            <div class="summary-block">
              @if (r.discount > 0) {
                <div class="summary-row">
                  <span class="summary-label">Diskon</span>
                  <span class="summary-value summary-discount">−{{ r.discount | rupiah }}</span>
                </div>
              }
              <div class="summary-row summary-row-total">
                <span class="summary-label-total">TOTAL</span>
                <span class="summary-value-total">{{ r.total | rupiah }}</span>
              </div>
            </div>

            <!-- Payment Detail (CASH) -->
            @if (r.paymentMethod === 'CASH' && r.amountReceived !== null) {
              <div class="divider-dash"></div>
              <div class="payment-block">
                <div class="payment-row">
                  <span class="payment-label">Tunai</span>
                  <span class="payment-value">{{ r.amountReceived | rupiah }}</span>
                </div>
                <div class="payment-row">
                  <span class="payment-label">Kembali</span>
                  <span class="payment-value payment-change">{{ r.changeAmount | rupiah }}</span>
                </div>
              </div>
            }

            <!-- Notes -->
            @if (r.notes) {
              <div class="divider-dash"></div>
              <div class="notes-block">
                <div class="notes-label"><i class="bi bi-chat-left-text"></i> Catatan</div>
                <div class="notes-text">{{ r.notes }}</div>
              </div>
            }

            <div class="divider-dash"></div>

            <!-- Footer -->
            <div class="struk-footer">
              <div class="thanks-title">Terima Kasih 🙏</div>
              <div class="thanks-text">Selamat menikmati es teler kami!</div>
              <div class="thanks-sub">Semoga harimu menyenangkan ✨</div>
            </div>

            <div class="divider-solid"></div>

            <!-- Meta Footer -->
            <div class="meta-footer">
              <div class="meta-row">
                <span>Dicetak</span>
                <span>{{ now | date: 'dd/MM/yy HH:mm' : '+0700' }}</span>
              </div>
              <div class="meta-row">
                <span>Total item</span>
                <span>{{ totalItems() }} item</span>
              </div>
            </div>

            <!-- Barcode -->
            <div class="struk-barcode">
              <div class="barcode-bars">
                @for (n of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]; track n) {
                  <span [style.height]="n % 3 === 0 ? '20px' : '18px'" [style.width]="n % 4 === 0 ? '3px' : '1.5px'"></span>
                }
              </div>
              <div class="barcode-text">{{ r.invoiceNumber }}</div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    @import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css');

    /* ============ PAGE ============ */
    .struk-page { min-height: 100vh; background: #f4f9f0; background-image: radial-gradient(at 15% 15%, rgba(132, 189, 51, 0.12) 0, transparent 45%), radial-gradient(at 85% 85%, rgba(244, 168, 42, 0.1) 0, transparent 45%); padding: 24px 12px 60px; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; }

    /* ============ ACTION BAR ============ */
    .action-bar { max-width: 500px; margin: 0 auto 20px; }
    .action-bar-inner { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 18px; background: #ffffff; border: 1px solid #eef2e6; border-radius: 16px; box-shadow: 0 4px 20px -12px rgba(20, 33, 10, 0.15); flex-wrap: wrap; }
    
    .action-info { display: flex; align-items: center; gap: 12px; }
    .action-icon { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #eef7e0, #e0f0c8); color: #6ba324; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
    .action-title { font-size: 14px; font-weight: 800; color: #14210a; }
    .action-sub { font-size: 11.5px; color: #94a3b8; font-family: ui-monospace, monospace; margin-top: 1px; }

    .action-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
    .btn-action { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 10px; font-family: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; text-decoration: none; border: 1.5px solid transparent; transition: all 0.18s; white-space: nowrap; }
    .btn-action i { font-size: 13px; }
    .btn-primary-action { background: linear-gradient(135deg, #84bd33, #6ba324); color: #ffffff; box-shadow: 0 6px 16px -6px rgba(107, 163, 36, 0.6); }
    .btn-primary-action:hover { transform: translateY(-1px); box-shadow: 0 10px 20px -6px rgba(107, 163, 36, 0.7); color: #ffffff; }
    .btn-ghost-action { background: #ffffff; border-color: #e2e8d5; color: #4a5a3d; }
    .btn-ghost-action:hover { border-color: #84bd33; color: #6ba324; background: #f8fbf3; }
    .btn-print { background: #14210a; color: #ffffff; border-color: #14210a; }
    .btn-print:hover { background: #2a3d1a; border-color: #2a3d1a; transform: translateY(-1px); box-shadow: 0 8px 20px -8px rgba(20, 33, 10, 0.5); }

    .alert-custom { display: flex; align-items: center; gap: 8px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 12px 14px; border-radius: 12px; font-size: 13px; margin-bottom: 20px; font-weight: 500; max-width: 500px; margin-left: auto; margin-right: auto; }

    /* ============ STRUK WRAPPER & PAPER ============ */
    .struk-wrapper { display: flex; flex-direction: column; align-items: center; gap: 20px; }
    
    .struk {
      width: 340px; max-width: 100%; background: #ffffff; padding: 24px 20px 20px;
      font-family: 'Courier New', ui-monospace, monospace; font-size: 12.5px;
      color: #14210a; line-height: 1.5; border-radius: 4px;
      box-shadow: 0 20px 50px -20px rgba(20, 33, 10, 0.25), 0 0 0 1px rgba(20, 33, 10, 0.04);
      position: relative;
    }

    /* Efek gerigi thermal */
    .struk::before, .struk::after {
      content: ''; position: absolute; left: 0; right: 0; height: 8px;
      background-image: radial-gradient(circle, transparent 50%, #ffffff 50%);
      background-size: 12px 12px; background-repeat: repeat-x;
    }
    .struk::before { top: -8px; background-position: 0 4px; }
    .struk::after { bottom: -8px; background-position: 0 -4px; transform: rotate(180deg); }

    /* ============ HEADER ============ */
    .struk-header { text-align: center; margin-bottom: 14px; }
    .store-logo { width: 52px; height: 52px; margin: 0 auto 10px; border-radius: 14px; background: linear-gradient(135deg, #84bd33, #6ba324); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 26px; box-shadow: 0 6px 16px -6px rgba(107, 163, 36, 0.5); }
    .store-name { font-size: 17px; font-weight: 800; color: #14210a; letter-spacing: -0.5px; margin-bottom: 4px; font-family: 'Plus Jakarta Sans', sans-serif; }
    .store-address { font-size: 11px; color: #4a5a3d; line-height: 1.4; max-width: 240px; margin: 0 auto; }

    /* ============ DIVIDERS ============ */
    .divider-solid { height: 2px; background: #14210a; margin: 12px 0; border-radius: 2px; }
    .divider-dash { height: 1px; margin: 10px 0; background-image: linear-gradient(90deg, #94a3b8 50%, transparent 50%); background-size: 8px 1px; background-repeat: repeat-x; }

    /* ============ INFO BLOCK ============ */
    .info-block { margin-bottom: 4px; }
    .info-row { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 4px; font-size: 12px; }
    .info-label { color: #6b7a5e; flex-shrink: 0; }
    .info-value { color: #14210a; text-align: right; word-break: break-word; }
    .info-value-strong { font-weight: 800; letter-spacing: 0.5px; }

    /* ============ ITEMS ============ */
    .items-block { margin-bottom: 4px; }
    .items-header { display: grid; grid-template-columns: 1fr auto; gap: 8px; font-size: 10.5px; font-weight: 800; color: #6b7a5e; text-transform: uppercase; letter-spacing: 0.6px; padding-bottom: 6px; border-bottom: 1px dashed #cbd5b5; margin-bottom: 8px; }
    .items-header-total { text-align: right; }
    
    .item-row { margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dotted #e2e8d5; }
    .item-row:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0; }
    .item-name { font-size: 12.5px; font-weight: 700; color: #14210a; margin-bottom: 2px; line-height: 1.35; }
    .item-detail { display: flex; justify-content: space-between; gap: 12px; font-size: 11.5px; color: #4a5a3d; }
    .item-qty { white-space: nowrap; }
    .item-subtotal { font-weight: 800; color: #14210a; white-space: nowrap; font-family: ui-monospace, monospace; }

    /* ============ SUMMARY ============ */
    .summary-block { margin-bottom: 4px; }
    .summary-row { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; margin-bottom: 4px; }
    .summary-label { color: #6b7a5e; }
    .summary-value { color: #14210a; font-weight: 600; }
    .summary-discount { color: #dc2626; font-weight: 700; }
    .summary-row-total { margin-top: 8px; padding-top: 10px; border-top: 2px solid #14210a; font-size: 15px; }
    .summary-label-total { font-weight: 800; letter-spacing: 1px; color: #14210a; }
    .summary-value-total { font-weight: 800; color: #14210a; font-size: 17px; letter-spacing: -0.3px; }

    /* ============ PAYMENT ============ */
    .payment-block { margin-bottom: 4px; }
    .payment-row { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; margin-bottom: 4px; }
    .payment-label { color: #6b7a5e; }
    .payment-value { font-weight: 700; color: #14210a; font-family: ui-monospace, monospace; }
    .payment-change { color: #15803d; }

    /* ============ NOTES ============ */
    .notes-block { background: #fafcf6; border-left: 3px solid #84bd33; padding: 8px 10px; border-radius: 4px; margin-bottom: 4px; }
    .notes-label { display: flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 800; color: #6ba324; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
    .notes-text { font-size: 11.5px; color: #14210a; font-style: italic; line-height: 1.4; }

    /* ============ FOOTER ============ */
    .struk-footer { text-align: center; padding: 12px 0 4px; }
    .thanks-title { font-size: 14px; font-weight: 800; color: #14210a; margin-bottom: 4px; letter-spacing: -0.3px; font-family: 'Plus Jakarta Sans', sans-serif; }
    .thanks-text { font-size: 11.5px; color: #4a5a3d; margin-bottom: 2px; line-height: 1.4; }
    .thanks-sub { font-size: 10.5px; color: #94a3b8; font-style: italic; }

    /* ============ META FOOTER ============ */
    .meta-footer { margin-top: 10px; font-size: 10px; color: #94a3b8; }
    .meta-row { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 2px; }

    /* ============ BARCODE ============ */
    .struk-barcode { margin-top: 16px; padding-top: 12px; text-align: center; }
    .barcode-bars { display: flex; justify-content: center; align-items: flex-end; gap: 2px; height: 24px; margin-bottom: 4px; }
    .barcode-bars span { display: inline-block; background: #14210a; border-radius: 1px; }
    .barcode-text { font-family: ui-monospace, monospace; font-size: 10px; color: #4a5a3d; letter-spacing: 2px; font-weight: 700; }

    /* ============ RESPONSIVE ============ */
    @media (max-width: 640px) {
      .struk-page { padding: 16px 10px 80px; }
      .action-bar-inner { padding: 12px; }
      .action-buttons { width: 100%; }
      .btn-action { flex: 1; justify-content: center; }
      .btn-action span { font-size: 11.5px; }
    }

    /* ============ PRINT OPTIMIZATION (58mm) ============ */
    @media print {
      .no-print { display: none !important; }
      .struk-page { background: #ffffff; padding: 0; min-height: 0; }
      .struk-wrapper { gap: 0; }
      .struk { width: 100%; max-width: 58mm; margin: 0 auto; padding: 3mm 2mm; box-shadow: none; border-radius: 0; font-size: 10.5px; line-height: 1.35; }
      .struk::before, .struk::after { display: none; }
      .store-logo { width: 36px; height: 36px; font-size: 18px; margin-bottom: 6px; }
      .store-name { font-size: 13px; }
      .store-address { font-size: 9px; }
      .divider-solid { height: 1.5px; margin: 6px 0; }
      .divider-dash { margin: 5px 0; }
      .info-row, .summary-row, .payment-row { font-size: 10px; margin-bottom: 2px; }
      .item-row { margin-bottom: 5px; padding-bottom: 4px; }
      .item-name { font-size: 10.5px; }
      .item-detail { font-size: 10px; }
      .summary-row-total { font-size: 12px; padding-top: 6px; margin-top: 5px; }
      .summary-value-total { font-size: 13px; }
      .struk-footer { padding: 6px 0 2px; }
      .thanks-title { font-size: 11px; }
      .thanks-text { font-size: 9.5px; }
      .thanks-sub { font-size: 9px; }
      .meta-footer { font-size: 8.5px; }
      .struk-barcode { margin-top: 8px; padding-top: 6px; }
      .barcode-bars { height: 18px; }
      .barcode-text { font-size: 8.5px; }
      
      @page { margin: 0; size: 58mm auto; }
    }
  `,
})
export class Receipt implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(OrderService);
  private auth = inject(AuthService);

  receipt = signal<ReceiptModel | null>(null);
  error = signal<string | null>(null);
  isKasir = computed(() => this.auth.user()?.role === 'kasir');
  
  totalItems = computed(() => {
    const r = this.receipt();
    return r ? r.items.reduce((sum, i) => sum + i.quantity, 0) : 0;
  });

  now = new Date(); // Untuk timestamp cetak

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.api.get(id).subscribe({
      next: (r) => this.receipt.set(r),
      error: (err) => this.error.set(errorMessages(err)[0]),
    });
  }

  print() {
    window.print();
  }
}