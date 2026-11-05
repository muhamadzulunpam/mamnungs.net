import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router'; // <--- a) TAMBAHAN IMPORT
import { CommonModule } from '@angular/common';
import { fileUrl } from '../../core/config';
import { errorMessages } from '../../core/errors';
import { CartItem, CheckoutResult, PosCategory, PosProduct } from '../../core/models';
import { PosService } from '../../core/pos.service';
import { RupiahPipe } from '../../core/rupiah.pipe';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RupiahPipe], // <--- a) MASUKKAN RouterLink
  template: `
    <!-- ============ HEADER ============ -->
    <div class="pos-header">
      <div>
        <h1 class="pos-title"><i class="bi bi-shop"></i> Kasir</h1>
        <p class="pos-subtitle">
          Pilih menu, atur jumlah, dan proses pembayaran.
          <kbd class="kbd-shortcut">F2</kbd> untuk fokus pencarian.
        </p>
      </div>
    </div>

    <div class="pos-grid">
      <!-- ============ KOLOM KIRI: MENU ============ -->
      <div class="pos-menu">
        <!-- Toolbar: Search -->
        <div class="pos-toolbar">
          <div class="pos-search">
            <i class="bi bi-search"></i>
            <input 
              #searchInput
              type="text" 
              placeholder="Cari menu... (F2)" 
              autocomplete="off"
              [ngModel]="search()" 
              (ngModelChange)="search.set($event)" 
            />
            @if (search()) {
              <button class="pos-search-clear" (click)="search.set('')"><i class="bi bi-x-lg"></i></button>
            }
          </div>
        </div>

        <!-- Category Pills -->
        <div class="category-scroller">
          <button class="cat-pill" [class.active]="activeCategory() === null" (click)="activeCategory.set(null)">
            <i class="bi bi-grid-3x3-gap-fill"></i> Semua
            <span class="cat-count">{{ products().length }}</span>
          </button>
          @for (c of categories(); track c.id) {
            <button class="cat-pill" [class.active]="activeCategory() === c.id" (click)="activeCategory.set(c.id)">
              {{ c.name }}
              <span class="cat-count">{{ categoryCount(c.id) }}</span>
            </button>
          }
        </div>

        <!-- Result Info -->
        @if (search() || activeCategory() !== null) {
          <div class="result-line">
            <i class="bi bi-funnel-fill"></i>
            Menampilkan <strong>{{ filtered().length }}</strong> dari <strong>{{ products().length }}</strong> menu
            <button class="result-clear" (click)="search.set(''); activeCategory.set(null)">Reset</button>
          </div>
        }

        <!-- Menu Grid -->
        @if (filtered().length > 0) {
          <div class="menu-grid">
            @for (p of filtered(); track p.id) {
              <button 
                class="menu-card" 
                [class.in-cart]="qtyInCart(p.id) > 0"
                (click)="add(p)"
              >
                <div class="menu-card-img">
                  @if (img(p.image); as src) {
                    <img [src]="src" alt="Menu" />
                  } @else {
                    <div class="menu-card-placeholder"><i class="bi bi-cup-straw"></i></div>
                  }
                  @if (qtyInCart(p.id) > 0) {
                    <div class="menu-card-qty-badge">{{ qtyInCart(p.id) }}</div>
                  }
                </div>
                <div class="menu-card-body">
                  <div class="menu-card-name">{{ p.name }}</div>
                  <div class="menu-card-price">{{ p.price | rupiah }}</div>
                </div>
              </button>
            }
          </div>
        } @else {
          <!-- Empty State Menu -->
          <div class="menu-empty">
            <div class="menu-empty-icon"><i class="bi bi-search"></i></div>
            <div class="menu-empty-title">Menu Tidak Ditemukan</div>
            <div class="menu-empty-text">Coba kata kunci lain atau reset filter.</div>
            <button class="menu-empty-btn" (click)="search.set(''); activeCategory.set(null)">
              <i class="bi bi-arrow-counterclockwise"></i> Reset Filter
            </button>
          </div>
        }
      </div>

      <!-- ============ KOLOM KANAN: CART ============ -->
      <aside class="pos-cart">
        <div class="cart-card">
          @if (success(); as s) {
            <!-- Success Screen -->
            <div class="cart-success">
              <div class="success-icon"><i class="bi bi-check-circle-fill"></i></div>
              <h3 class="success-title">Pembayaran Berhasil!</h3>
              <div class="success-invoice">{{ s.invoiceNumber }}</div>
              
              <div class="success-details">
                <div class="success-row"><span>Total</span><strong>{{ s.total | rupiah }}</strong></div>
                <div class="success-row"><span>Diterima</span><span>{{ s.amountReceived | rupiah }}</span></div>
              </div>
              
              <div class="success-change">
                <div class="label">Kembalian</div>
                <div class="value">{{ s.change | rupiah }}</div>
              </div>

               <a [routerLink]="['/transaksi', s.orderId, 'struk']" class="btn-outline-struk">
                <i class="bi bi-printer"></i> Lihat / Cetak Struk
              </a>

              <button class="btn-new-trx" (click)="newTransaction()">
                <i class="bi bi-plus-lg"></i> Transaksi Baru
              </button>
            </div>
          } @else {
            <!-- Cart Header -->
            <div class="cart-header">
              <div class="cart-header-left">
                <div class="cart-icon"><i class="bi bi-bag-check-fill"></i></div>
                <div>
                  <div class="cart-title">Keranjang</div>
                  <div class="cart-subtitle">{{ totalItems() }} item · {{ cart().length }} jenis</div>
                </div>
              </div>
              @if (cart().length) {
                <button class="cart-clear" title="Kosongkan keranjang" (click)="clear()">
                  <i class="bi bi-trash3"></i>
                </button>
              }
            </div>

            <!-- Cart Body -->
            <div class="cart-body">
              @if (!cart().length) {
                <div class="cart-empty">
                  <div class="cart-empty-icon"><i class="bi bi-bag"></i></div>
                  <div class="cart-empty-title">Keranjang Kosong</div>
                  <div class="cart-empty-text">Klik menu di sebelah kiri untuk menambahkan.</div>
                </div>
              } @else {
                <div class="cart-items">
                  @for (i of cart(); track i.productId) {
                    <div class="cart-item">
                      <div class="cart-item-img">
                        @if (img(i.image); as src) {
                          <img [src]="src" alt="" />
                        } @else {
                          <div class="cart-item-placeholder">{{ i.name.charAt(0).toUpperCase() }}</div>
                        }
                      </div>
                      
                      <div class="cart-item-info">
                        <div class="cart-item-name">{{ i.name }}</div>
                        <div class="cart-item-price">{{ i.price | rupiah }}</div>
                      </div>

                      <div class="cart-item-controls">
                        <button class="qty-btn" (click)="changeQty(i.productId, -1)">
                          <i class="bi" [class]="i.quantity === 1 ? 'bi-trash3' : 'bi-dash-lg'"></i>
                        </button>
                        <input class="qty-input" type="number" min="1" max="99" 
                               [value]="i.quantity" (change)="setQty(i.productId, $event)" />
                        <button class="qty-btn qty-btn-plus" (click)="changeQty(i.productId, 1)">
                          <i class="bi bi-plus-lg"></i>
                        </button>
                      </div>

                      <div class="cart-item-subtotal">{{ (i.price * i.quantity) | rupiah }}</div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Payment Section -->
            @if (cart().length) {
              <div class="cart-payment">
                <!-- Error -->
                @if (errors().length) {
                  <div class="cart-error">
                    <i class="bi bi-exclamation-circle-fill"></i>
                    <div>@for (e of errors(); track $index) { <div>{{ e }}</div> }</div>
                  </div>
                }

                <!-- Total -->
                <div class="total-row">
                  <span class="total-label">Total</span>
                  <span class="total-value">{{ total() | rupiah }}</span>
                </div>

                <!-- Notes -->
                <div class="cart-field">
                  <label class="cart-field-label"><i class="bi bi-chat-left-text"></i> Catatan <span class="label-optional">opsional</span></label>
                  <input type="text" class="cart-input" maxlength="500" placeholder="Contoh: es dipisah, tanpa susu"
                         [ngModel]="notes()" (ngModelChange)="notes.set($event)" />
                </div>

                <!-- Cash Input -->
                <div class="cart-field">
                  <label class="cart-field-label"><i class="bi bi-cash-stack"></i> Uang Diterima</label>
                  <div class="cash-input-wrap">
                    <span class="cash-prefix">Rp</span>
                    <input type="text" inputmode="numeric" class="cash-input" placeholder="0"
                           [ngModel]="receivedDisplay()" (ngModelChange)="onReceivedInput($event)" />
                  </div>
                </div>

                <!-- Quick Cash -->
                <div class="quick-cash">
                  @for (n of quickAmounts(); track n) {
                    <button class="quick-cash-btn" 
                            [class.active]="received() === n" 
                            [class.is-exact]="n === total()"
                            (click)="received.set(n)">
                      {{ n === total() ? 'Uang Pas' : (n | rupiah) }}
                    </button>
                  }
                </div>

                <!-- Change -->
                <div class="change-row" [class.is-negative]="change() < 0">
                  <span class="change-label"><i class="bi bi-arrow-return-left"></i> Kembalian</span>
                  <span class="change-value">
                    {{ change() < 0 ? '− ' + (-change() | rupiah) : (change() | rupiah) }}
                  </span>
                </div>

                <!-- Pay Button -->
                <button class="pay-btn" [disabled]="!canPay()" (click)="pay()">
                  @if (!paying()) {
                    <span><i class="bi bi-check-circle-fill"></i> Bayar Tunai <span class="pay-amount">{{ total() | rupiah }}</span></span>
                  } @else {
                    <span class="pay-spinner"><span class="mini-spinner"></span> Memproses...</span>
                  }
                </button>
              </div>
            }
          }
        </div>
      </aside>
    </div>
  `,
  styles: `
    @import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css');

    /* ============ HEADER ============ */
    .pos-header { margin-bottom: 20px; }
    .pos-title { display: flex; align-items: center; gap: 10px; font-size: 26px; font-weight: 800; color: #14210a; letter-spacing: -0.8px; margin: 0 0 4px; }
    .pos-title i { color: #6ba324; font-size: 22px; }
    .pos-subtitle { font-size: 13.5px; color: #6b7a5e; margin: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .kbd-shortcut { display: inline-flex; align-items: center; padding: 2px 7px; background: #f0f8e5; border: 1px solid #d8e8bf; border-radius: 6px; font-size: 11px; font-weight: 700; color: #558a1a; font-family: ui-monospace, monospace; }

    /* ============ GRID ============ */
    .pos-grid { display: grid; grid-template-columns: 1fr 400px; gap: 20px; align-items: start; }
    @media (max-width: 1100px) { .pos-grid { grid-template-columns: 1fr 360px; } }
    @media (max-width: 900px) { .pos-grid { grid-template-columns: 1fr; } }

    /* ============ KOLOM KIRI (MENU) ============ */
    .pos-menu { min-width: 0; }
    
    .pos-toolbar { display: flex; gap: 10px; margin-bottom: 12px; }
    .pos-search { position: relative; display: flex; align-items: center; flex: 1; }
    .pos-search > i { position: absolute; left: 16px; color: #a3b190; font-size: 15px; pointer-events: none; }
    .pos-search input {
      width: 100%; padding: 13px 40px 13px 44px; border: 1.5px solid #e2e8d5; border-radius: 14px;
      background: #ffffff; font-size: 14px; font-family: inherit; color: #14210a; transition: all 0.2s; outline: none;
      box-shadow: 0 2px 8px -4px rgba(20, 33, 10, 0.06);
    }
    .pos-search input:focus { border-color: #84bd33; box-shadow: 0 0 0 4px rgba(132, 189, 51, 0.12); }
    .pos-search:focus-within > i { color: #6ba324; }
    .pos-search-clear {
      position: absolute; right: 12px; width: 24px; height: 24px; border-radius: 50%; border: none;
      background: #e8efdb; color: #6b7a5e; cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 10px; transition: all 0.15s;
    }
    .pos-search-clear:hover { background: #d8e8bf; color: #14210a; }

    /* Category Pills */
    .category-scroller { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 10px; margin-bottom: 12px; scrollbar-width: thin; }
    .category-scroller::-webkit-scrollbar { height: 5px; }
    .category-scroller::-webkit-scrollbar-thumb { background: #d8e8bf; border-radius: 10px; }
    .cat-pill {
      display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 11px;
      border: 1.5px solid #e2e8d5; background: #ffffff; color: #4a5a3d; font-family: inherit; font-size: 13px;
      font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.18s; flex-shrink: 0;
    }
    .cat-pill:hover { border-color: #84bd33; color: #6ba324; background: #f8fbf3; }
    .cat-pill.active { background: linear-gradient(135deg, #84bd33 0%, #6ba324 100%); border-color: #6ba324; color: #ffffff; box-shadow: 0 6px 16px -6px rgba(107, 163, 36, 0.5); }
    .cat-count { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 100px; background: rgba(0, 0, 0, 0.06); font-size: 10.5px; font-weight: 700; }
    .cat-pill.active .cat-count { background: rgba(255, 255, 255, 0.25); }

    /* Result Info */
    .result-line { display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px; background: #f0f8e5; border: 1px solid #d8e8bf; border-radius: 10px; font-size: 12px; color: #4a5a3d; margin-bottom: 14px; }
    .result-line strong { color: #14210a; font-weight: 700; }
    .result-line i { color: #6ba324; font-size: 11px; }
    .result-clear { background: none; border: none; color: #dc2626; font-family: inherit; font-size: 11.5px; font-weight: 700; cursor: pointer; padding: 0; margin-left: 4px; text-decoration: underline; }

    /* Menu Grid */
    .menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    .menu-card {
      position: relative; display: flex; flex-direction: column; background: #ffffff;
      border: 1.5px solid #eef2e6; border-radius: 16px; overflow: hidden; cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); text-align: left; font-family: inherit; padding: 0;
    }
    .menu-card:hover { transform: translateY(-3px); border-color: #84bd33; box-shadow: 0 16px 32px -16px rgba(107, 163, 36, 0.4); }
    .menu-card:active { transform: translateY(-1px) scale(0.98); }
    .menu-card.in-cart { border-color: #84bd33; background: #fafcf6; }
    .menu-card-img { position: relative; aspect-ratio: 4 / 3; background: #f4f9f0; overflow: hidden; }
    .menu-card-img img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.3s; }
    .menu-card:hover .menu-card-img img { transform: scale(1.05); }
    .menu-card-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 42px; color: #cbd5b5; background: linear-gradient(135deg, #f0f8e5 0%, #e8efdb 100%); }
    .menu-card-qty-badge {
      position: absolute; top: 8px; right: 8px; min-width: 26px; height: 26px; padding: 0 8px;
      background: linear-gradient(135deg, #84bd33, #6ba324); color: #ffffff; border-radius: 100px;
      display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;
      box-shadow: 0 4px 12px rgba(107, 163, 36, 0.5); border: 2px solid #ffffff;
    }
    .menu-card-body { padding: 10px 12px 12px; }
    .menu-card-name { font-size: 13px; font-weight: 700; color: #14210a; line-height: 1.3; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .menu-card-price { font-size: 13px; font-weight: 800; color: #6ba324; font-family: ui-monospace, monospace; letter-spacing: -0.3px; }

    /* Menu Empty */
    .menu-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; background: #ffffff; border: 1px solid #eef2e6; border-radius: 18px; text-align: center; }
    .menu-empty-icon { width: 80px; height: 80px; border-radius: 22px; background: linear-gradient(135deg, #f0f8e5 0%, #e8efdb 100%); color: #84bd33; display: flex; align-items: center; justify-content: center; font-size: 34px; margin-bottom: 16px; }
    .menu-empty-title { font-size: 16px; font-weight: 800; color: #14210a; margin-bottom: 4px; }
    .menu-empty-text { font-size: 13px; color: #6b7a5e; margin-bottom: 16px; }
    .menu-empty-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; background: #f4f7ee; border: 1.5px solid #e2e8d5; border-radius: 10px; color: #4a5a3d; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
    .menu-empty-btn:hover { background: #e8efdb; color: #14210a; }

    /* ============ KOLOM KANAN (CART) ============ */
    .pos-cart { min-width: 0; }
    .cart-card { position: sticky; top: 90px; background: #ffffff; border: 1px solid #eef2e6; border-radius: 20px; box-shadow: 0 8px 32px -16px rgba(20, 33, 10, 0.15); overflow: hidden; display: flex; flex-direction: column; max-height: calc(100vh - 110px); }
    @media (max-width: 900px) { .cart-card { position: static; max-height: none; } }

    /* Header */
    .cart-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; background: linear-gradient(135deg, #f8fbf3 0%, #f0f8e5 100%); border-bottom: 1px solid #eef2e6; }
    .cart-header-left { display: flex; align-items: center; gap: 12px; }
    .cart-icon { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #84bd33, #6ba324); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 6px 16px -6px rgba(107, 163, 36, 0.6); }
    .cart-title { font-size: 15px; font-weight: 800; color: #14210a; line-height: 1.2; }
    .cart-subtitle { font-size: 11.5px; color: #6b7a5e; font-weight: 600; margin-top: 2px; }
    .cart-clear { width: 34px; height: 34px; border-radius: 10px; border: 1.5px solid #fecaca; background: #fef2f2; color: #dc2626; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 13px; transition: all 0.18s; }
    .cart-clear:hover { background: #ef4444; border-color: #ef4444; color: #ffffff; transform: rotate(-8deg) scale(1.05); }

    /* Body */
    .cart-body { flex: 1; overflow-y: auto; padding: 12px; min-height: 120px; }
    .cart-body::-webkit-scrollbar { width: 6px; }
    .cart-body::-webkit-scrollbar-thumb { background: #d8e8bf; border-radius: 10px; }

    .cart-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center; }
    .cart-empty-icon { width: 68px; height: 68px; border-radius: 20px; background: #f4f9f0; color: #cbd5b5; display: flex; align-items: center; justify-content: center; font-size: 30px; margin-bottom: 14px; }
    .cart-empty-title { font-size: 14.5px; font-weight: 800; color: #14210a; margin-bottom: 4px; }
    .cart-empty-text { font-size: 12.5px; color: #94a3b8; line-height: 1.5; }

    .cart-items { display: flex; flex-direction: column; gap: 8px; }
    .cart-item { display: grid; grid-template-columns: 44px 1fr auto; grid-template-areas: "img info subtotal" "img controls subtotal"; gap: 6px 10px; padding: 10px; background: #fafcf6; border: 1.5px solid #f0f4e8; border-radius: 12px; transition: all 0.15s; }
    .cart-item:hover { background: #f4f9f0; border-color: #d8e8bf; }
    .cart-item-img { grid-area: img; width: 44px; height: 44px; border-radius: 10px; overflow: hidden; background: #f0f4e8; flex-shrink: 0; align-self: center; }
    .cart-item-img img { width: 100%; height: 100%; object-fit: cover; }
    .cart-item-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; color: #6ba324; background: linear-gradient(135deg, #eef7e0 0%, #e0f0c8 100%); }
    .cart-item-info { grid-area: info; min-width: 0; align-self: end; }
    .cart-item-name { font-size: 12.5px; font-weight: 700; color: #14210a; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cart-item-price { font-size: 11px; color: #94a3b8; font-family: ui-monospace, monospace; margin-top: 1px; }
    .cart-item-controls { grid-area: controls; display: inline-flex; align-items: center; gap: 3px; align-self: start; }
    
    .qty-btn { width: 24px; height: 24px; border-radius: 7px; border: 1.5px solid #e2e8d5; background: #ffffff; color: #4a5a3d; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 11px; transition: all 0.15s; padding: 0; }
    .qty-btn:hover { border-color: #84bd33; color: #6ba324; background: #f0f8e5; }
    .qty-btn-plus { background: linear-gradient(135deg, #84bd33, #6ba324); border-color: #6ba324; color: #ffffff; }
    .qty-btn-plus:hover { background: linear-gradient(135deg, #6ba324, #558a1a); border-color: #558a1a; color: #ffffff; transform: scale(1.05); }
    .qty-input { width: 34px; height: 24px; border: 1.5px solid #e2e8d5; border-radius: 7px; background: #ffffff; text-align: center; font-family: ui-monospace, monospace; font-size: 12px; font-weight: 700; color: #14210a; outline: none; padding: 0; }
    .qty-input:focus { border-color: #84bd33; box-shadow: 0 0 0 3px rgba(132, 189, 51, 0.15); }
    .cart-item-subtotal { grid-area: subtotal; align-self: center; text-align: right; font-family: ui-monospace, monospace; font-size: 13px; font-weight: 800; color: #14210a; white-space: nowrap; }

    /* Payment Section */
    .cart-payment { border-top: 2px dashed #eef2e6; padding: 16px 18px 18px; background: linear-gradient(180deg, #fafcf6 0%, #ffffff 100%); max-height: 55vh; overflow-y: auto; }
    .cart-payment::-webkit-scrollbar { width: 5px; }
    .cart-payment::-webkit-scrollbar-thumb { background: #d8e8bf; border-radius: 10px; }

    .cart-error { display: flex; align-items: flex-start; gap: 6px; padding: 9px 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; color: #dc2626; font-size: 12px; font-weight: 600; margin-bottom: 12px; }

    .total-row { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1px solid #f0f4e8; }
    .total-label { font-size: 13px; font-weight: 700; color: #6b7a5e; text-transform: uppercase; letter-spacing: 0.5px; }
    .total-value { font-size: 22px; font-weight: 800; color: #14210a; font-family: ui-monospace, monospace; letter-spacing: -0.8px; }

    .cart-field { margin-bottom: 12px; }
    .cart-field-label { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; }
    .cart-field-label i { color: #a3b190; font-size: 13px; }
    .label-optional { font-size: 10.5px; font-weight: 500; color: #94a3b8; background: #f4f7ee; padding: 2px 7px; border-radius: 100px; text-transform: none; }
    
    .cart-input { width: 100%; padding: 10px 12px; border: 1.5px solid #e2e8d5; border-radius: 10px; background: #ffffff; font-size: 13px; font-family: inherit; color: #14210a; transition: all 0.2s; outline: none; }
    .cart-input:focus { border-color: #84bd33; box-shadow: 0 0 0 4px rgba(132, 189, 51, 0.12); }

    .cash-input-wrap { position: relative; display: flex; align-items: center; }
    .cash-prefix { position: absolute; left: 14px; font-size: 13px; font-weight: 800; color: #6ba324; pointer-events: none; }
    .cash-input { width: 100%; padding: 11px 12px 11px 40px; border: 1.5px solid #e2e8d5; border-radius: 10px; background: #ffffff; font-family: ui-monospace, monospace; font-size: 15px; font-weight: 800; color: #14210a; transition: all 0.2s; outline: none; }
    .cash-input:focus { border-color: #84bd33; box-shadow: 0 0 0 4px rgba(132, 189, 51, 0.12); }

    .quick-cash { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
    .quick-cash-btn { flex: 1; min-width: fit-content; padding: 8px 10px; border-radius: 9px; border: 1.5px solid #e2e8d5; background: #ffffff; color: #4a5a3d; font-family: inherit; font-size: 11.5px; font-weight: 700; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
    .quick-cash-btn:hover { border-color: #84bd33; color: #6ba324; background: #f8fbf3; transform: translateY(-1px); }
    .quick-cash-btn.active { background: #f0f8e5; border-color: #84bd33; color: #558a1a; }
    .quick-cash-btn.is-exact { background: linear-gradient(135deg, #84bd33, #6ba324); border-color: #6ba324; color: #ffffff; }
    .quick-cash-btn.is-exact:hover { background: linear-gradient(135deg, #6ba324, #558a1a); color: #ffffff; }

    .change-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #f0f8e5; border: 1px solid #d8e8bf; border-radius: 10px; margin-bottom: 14px; transition: all 0.2s; }
    .change-row.is-negative { background: #fef2f2; border-color: #fecaca; }
    .change-label { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #4a5a3d; text-transform: uppercase; letter-spacing: 0.3px; }
    .change-row.is-negative .change-label { color: #dc2626; }
    .change-value { font-family: ui-monospace, monospace; font-size: 15px; font-weight: 800; color: #6ba324; letter-spacing: -0.3px; }
    .change-row.is-negative .change-value { color: #dc2626; }

    .pay-btn { width: 100%; padding: 15px; border: none; border-radius: 13px; background: linear-gradient(135deg, #84bd33 0%, #6ba324 100%); color: #ffffff; font-family: inherit; font-size: 15px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.25s; box-shadow: 0 10px 24px -8px rgba(107, 163, 36, 0.6); letter-spacing: 0.2px; min-height: 52px; position: relative; overflow: hidden; }
    .pay-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 28px -8px rgba(107, 163, 36, 0.7); }
    .pay-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
    .pay-amount { font-family: ui-monospace, monospace; font-size: 13px; padding: 3px 9px; background: rgba(255, 255, 255, 0.25); border-radius: 7px; font-weight: 800; }
    .pay-spinner { display: flex; align-items: center; gap: 10px; }
    .mini-spinner { width: 18px; height: 18px; border: 2.5px solid rgba(255, 255, 255, 0.3); border-top-color: #ffffff; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Success Screen */
    .cart-success { display: flex; flex-direction: column; align-items: center; padding: 32px 24px; text-align: center; animation: fade-in 0.4s ease; }
    .success-icon { width: 80px; height: 80px; border-radius: 24px; background: #dcfce7; color: #15803d; display: flex; align-items: center; justify-content: center; font-size: 40px; margin-bottom: 20px; box-shadow: 0 10px 30px -10px rgba(22, 163, 74, 0.4); }
    .success-title { font-size: 20px; font-weight: 800; color: #14210a; margin-bottom: 4px; }
    .success-invoice { font-size: 12.5px; color: #6ba324; font-family: ui-monospace, monospace; font-weight: 700; background: #f0f8e5; padding: 4px 10px; border-radius: 100px; margin-bottom: 20px; }
    
    .success-details { width: 100%; background: #fafcf6; border: 1px solid #eef2e6; border-radius: 14px; padding: 16px; margin-bottom: 16px; }
    .success-row { display: flex; justify-content: space-between; font-size: 13.5px; color: #4a5a3d; margin-bottom: 6px; }
    .success-row:last-child { margin-bottom: 0; }
    .success-row strong { color: #14210a; font-weight: 800; font-family: ui-monospace, monospace; }

    .success-change { width: 100%; background: #f0f8e5; border: 1px dashed #84bd33; border-radius: 14px; padding: 16px; margin-bottom: 24px; }
    .success-change .label { font-size: 11.5px; font-weight: 700; color: #558a1a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .success-change .value { font-size: 32px; font-weight: 800; color: #14210a; font-family: ui-monospace, monospace; letter-spacing: -1px; line-height: 1; }

    .btn-new-trx { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; background: linear-gradient(135deg, #84bd33, #6ba324); color: #ffffff; border: none; border-radius: 12px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 8px 20px -8px rgba(107, 163, 36, 0.6); }
    .btn-new-trx:hover { transform: translateY(-2px); box-shadow: 0 12px 24px -8px rgba(107, 163, 36, 0.7); }

    @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    /* ============ RESPONSIVE ============ */
    @media (max-width: 640px) {
      .pos-title { font-size: 22px; }
      .menu-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
      .menu-card-body { padding: 8px 10px 10px; }
      .menu-card-name { font-size: 12px; }
      .menu-card-price { font-size: 12px; }
    }
      .btn-outline-struk {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      background: #ffffff;
      border: 1.5px solid #e2e8d5;
      border-radius: 12px;
      color: #4a5a3d;
      font-family: inherit;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      margin-bottom: 8px;
    }

    .btn-outline-struk:hover {
      border-color: #84bd33;
      color: #6ba324;
      background: #f8fbf3;
      transform: translateY(-1px);
    }
  `,
})
export class Pos implements OnInit {
  private api = inject(PosService);

  categories = signal<PosCategory[]>([]);
  products = signal<PosProduct[]>([]);
  search = signal('');
  activeCategory = signal<number | null>(null);

  cart = signal<CartItem[]>([]);
  notes = signal('');
  
  // received signal menyimpan nilai asli (number)
  received = signal<number | null>(null);
  
  paying = signal(false);
  errors = signal<string[]>([]);
  success = signal<CheckoutResult | null>(null);

  img = fileUrl;

  // Computed
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const cat = this.activeCategory();
    return this.products().filter(
      (p) => (cat === null || p.categoryId === cat) && p.name.toLowerCase().includes(q)
    );
  });

  total = computed(() => this.cart().reduce((sum, i) => sum + i.price * i.quantity, 0));
  totalItems = computed(() => this.cart().reduce((sum, i) => sum + i.quantity, 0));
  change = computed(() => (this.received() ?? 0) - this.total());

  canPay = computed(
    () => this.cart().length > 0 && this.received() !== null && this.change() >= 0 && !this.paying()
  );

  quickAmounts = computed(() => {
    const t = this.total();
    if (t === 0) return [];
    return [...new Set([t, ...[20000, 50000, 100000, 200000].filter((n) => n >= t)])];
  });

  // Received Display (Format Rupiah)
  receivedDisplay = computed(() => {
    const val = this.received();
    return val ? new Intl.NumberFormat('id-ID').format(val) : '';
  });

  ngOnInit() {
    this.loadMenu();
  }

  loadMenu() {
    this.api.menu().subscribe((m) => {
      this.categories.set(m.categories);
      this.products.set(m.products);
    });
  }

  // Helper
  categoryCount(catId: number) {
    return this.products().filter((p) => p.categoryId === catId).length;
  }

  qtyInCart(productId: number) {
    return this.cart().find((i) => i.productId === productId)?.quantity ?? 0;
  }

  onReceivedInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const numericString = input.value.replace(/\D/g, '');
    const numValue = numericString ? parseInt(numericString, 10) : null;
    
    this.received.set(numValue);
    input.value = numValue ? new Intl.NumberFormat('id-ID').format(numValue) : '';
  }

  // Cart Actions
  add(p: PosProduct) {
    this.success.set(null);
    this.cart.update((items) => {
      if (items.some((i) => i.productId === p.id)) {
        return items.map((i) =>
          i.productId === p.id ? { ...i, quantity: Math.min(i.quantity + 1, 99) } : i
        );
      }
      return [
        { productId: p.id, name: p.name, price: p.price, image: p.image, quantity: 1 },
        ...items,
      ];
    });
  }

  changeQty(productId: number, delta: number) {
    this.cart.update((items) =>
      items
        .map((i) =>
          i.productId === productId
            ? { ...i, quantity: Math.min(Math.max(i.quantity + delta, 0), 99) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  }

  setQty(productId: number, event: Event) {
    const input = event.target as HTMLInputElement;
    let val = parseInt(input.value, 10);
    if (isNaN(val) || val <= 0) {
      // Hapus jika 0 atau kosong
      this.cart.update((items) => items.filter((i) => i.productId !== productId));
    } else {
      val = Math.min(val, 99);
      this.cart.update((items) =>
        items.map((i) => (i.productId === productId ? { ...i, quantity: val } : i))
      );
      // Update input value jika di-clamp
      input.value = String(val);
    }
  }

  clear() {
    if (!confirm('Kosongkan keranjang?')) return;
    this.resetForm();
  }

  newTransaction() {
    this.success.set(null);
  }

  pay() {
    if (!this.canPay()) return;

    this.paying.set(true);
    this.errors.set([]);

    this.api
      .checkout({
        items: this.cart().map((i) => ({ productId: i.productId, quantity: i.quantity })),
        notes: this.notes(),
        amountReceived: this.received()!,
      })
      .subscribe({
        next: (res) => {
          this.success.set(res);
          this.resetForm();
          this.paying.set(false);
          this.loadMenu();
        },
        error: (err) => {
          this.errors.set(errorMessages(err));
          this.paying.set(false);
          this.loadMenu();
        },
      });
  }

  private resetForm() {
    this.cart.set([]);
    this.notes.set('');
    this.received.set(null);
    this.errors.set([]);
  }
}