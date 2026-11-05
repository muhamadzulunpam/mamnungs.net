import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, merge } from 'rxjs';
import { CommonModule } from '@angular/common';
import { CategoryService } from '../../core/category.service';
import { fileUrl } from '../../core/config';
import { errorMessages } from '../../core/errors';
import { Category, Paged, Product } from '../../core/models';
import { ProductService } from '../../core/product.service';
import { RupiahPipe } from '../../core/rupiah.pipe';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RupiahPipe],
  template: `
    <!-- ============ HEADER ============ -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Menu & Produk</h1>
        <p class="page-subtitle">
          Kelola menu es teler, harga, dan ketersediaan stok.
        </p>
      </div>
      <a routerLink="/admin/products/new" class="btn-primary-custom">
        <i class="bi bi-plus-lg"></i> Tambah Produk
      </a>
    </div>

    <!-- ============ TOOLBAR FILTER ============ -->
    <div class="toolbar">
      <!-- Search -->
      <div class="toolbar-search">
        <i class="bi bi-search"></i>
        <input type="search" [formControl]="search" placeholder="Cari nama produk..." autocomplete="off" />
        @if (search.value) {
          <button class="toolbar-clear" (click)="search.setValue('')" title="Hapus pencarian">
            <i class="bi bi-x-lg"></i>
          </button>
        }
      </div>

      <!-- Kategori Dropdown -->
      <div class="toolbar-select">
        <i class="bi bi-tags"></i>
        <select [formControl]="categoryId">
          <option [ngValue]="null">Semua Kategori</option>
          @for (c of categories(); track c.id) {
            <option [ngValue]="c.id">{{ c.name }}</option>
          }
        </select>
        <i class="bi bi-chevron-down select-caret"></i>
      </div>
    </div>

    <!-- ============ TABLE PANEL ============ -->
    <div class="table-panel">
      @if (items().length === 0) {
        <!-- Empty State -->
        <div class="empty-state">
          <div class="empty-icon"><i class="bi bi-cup-straw"></i></div>
          <h4 class="empty-title">Produk Tidak Ditemukan</h4>
          <p class="empty-message">
            Tidak ada produk yang cocok dengan filter Anda, atau belum ada produk yang ditambahkan.
          </p>
          <a routerLink="/admin/products/new" class="empty-btn">
            <i class="bi bi-plus-lg"></i> Tambah Produk Baru
          </a>
        </div>
      } @else {
        <div class="table-wrap">
          <table class="custom-table">
            <thead>
              <tr>
                <th style="width: 70px">Foto</th>
                <th>Nama Produk</th>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Status</th>
                <th class="text-end">Aksi</th>
              </tr>
            </thead>
            <tbody>
              @for (p of items(); track p.id) {
                <tr>
                  <!-- Foto -->
                  <td>
                    <div class="product-image-wrap">
                      @if (img(p.image); as src) {
                        <img [src]="src" alt="Preview" class="product-image" />
                      } @else {
                        <div class="product-image product-image-placeholder">
                          {{ p.name.charAt(0).toUpperCase() }}
                        </div>
                      }
                    </div>
                  </td>

                  <!-- Nama -->
                  <td>
                    <div class="product-name">{{ p.name }}</div>
                    <div class="product-meta">ID #{{ p.id }}</div>
                  </td>

                  <!-- Kategori -->
                  <td>
                    @if (p.categoryName) {
                      <span class="badge-category">
                        <i class="bi bi-tag-fill"></i> {{ p.categoryName }}
                      </span>
                    } @else {
                      <span class="badge-category badge-category-empty">Tanpa Kategori</span>
                    }
                  </td>

                  <!-- Harga -->
                  <td>
                    <span class="price-tag">{{ p.price | rupiah }}</span>
                  </td>

                  <!-- Status Toggle -->
                  <td>
                    <button
                      [class]="'status-pill ' + (p.isAvailable ? 'status-available' : 'status-empty')"
                      title="Klik untuk mengubah status"
                      (click)="toggle(p)"
                    >
                      <span class="status-dot"></span>
                      {{ p.isAvailable ? 'Tersedia' : 'Habis' }}
                    </button>
                  </td>

                  <!-- Aksi -->
                  <td class="text-end">
                    <div class="action-group">
                      <a [routerLink]="['/admin/products', p.id, 'edit']" class="btn-action btn-edit" title="Ubah">
                        <i class="bi bi-pencil"></i><span>Ubah</span>
                      </a>
                      <button class="btn-action btn-delete" (click)="askDelete(p)" title="Hapus">
                        <i class="bi bi-trash3"></i><span>Hapus</span>
                      </button>
                    </div>
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
                dari <strong>{{ r.total }}</strong> produk
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

    <!-- ============ CONFIRM DELETE MODAL ============ -->
    @if (showDeleteModal()) {
      <div class="modal-overlay" (click)="cancelDelete()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <button class="modal-close" (click)="cancelDelete()">
            <i class="bi bi-x-lg"></i>
          </button>

          <div class="modal-icon-wrap">
            <i class="bi bi-trash3"></i>
          </div>

          <h3 class="modal-title">Hapus Produk?</h3>
          <p class="modal-message">
            Produk <strong>"{{ targetProduct()?.name }}"</strong> akan dihapus permanen.
            Tindakan ini tidak dapat dibatalkan.
          </p>

          <div class="modal-actions">
            <button class="btn-cancel" [disabled]="deleting()" (click)="cancelDelete()">
              Batal
            </button>
            <button class="btn-confirm" [disabled]="deleting()" (click)="confirmDelete()">
              @if (deleting()) {
                <span class="spinner"></span>
              } @else {
                Ya, Hapus
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    @import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css');

    /* ============ HEADER ============ */
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .page-title { font-size: 26px; font-weight: 800; color: #14210a; letter-spacing: -0.8px; margin: 0 0 4px; }
    .page-subtitle { font-size: 13.5px; color: #6b7a5e; margin: 0; }
    
    .btn-primary-custom {
      display: inline-flex; align-items: center; gap: 8px; padding: 11px 20px;
      background: linear-gradient(135deg, #84bd33 0%, #6ba324 100%); border: none; border-radius: 12px;
      font-size: 13.5px; font-weight: 700; font-family: inherit; color: #ffffff; cursor: pointer; text-decoration: none;
      transition: all 0.25s; box-shadow: 0 8px 20px -8px rgba(107, 163, 36, 0.6);
    }
    .btn-primary-custom:hover { transform: translateY(-2px); box-shadow: 0 12px 24px -8px rgba(107, 163, 36, 0.7); color: #ffffff; }

    /* ============ TOOLBAR ============ */
    .toolbar { display: flex; align-items: center; gap: 12px; padding: 12px; background: #ffffff; border: 1px solid #eef2e6; border-radius: 14px; margin-bottom: 14px; flex-wrap: wrap; }
    
    .toolbar-search { position: relative; display: flex; align-items: center; flex: 1; min-width: 220px; }
    .toolbar-search > i { position: absolute; left: 14px; color: #a3b190; font-size: 14px; pointer-events: none; }
    .toolbar-search input {
      width: 100%; padding: 10px 36px 10px 38px; border: 1.5px solid #e2e8d5; border-radius: 10px;
      background: #f8fbf3; font-size: 13.5px; font-family: inherit; color: #14210a; transition: all 0.2s; outline: none;
    }
    .toolbar-search input::placeholder { color: #a3b190; }
    .toolbar-search input:focus { border-color: #84bd33; background: #ffffff; box-shadow: 0 0 0 4px rgba(132, 189, 51, 0.12); }
    .toolbar-search:focus-within > i { color: #6ba324; }
    
    .toolbar-clear {
      position: absolute; right: 10px; width: 22px; height: 22px; border-radius: 50%; border: none;
      background: #e8efdb; color: #6b7a5e; cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 10px; transition: all 0.15s;
    }
    .toolbar-clear:hover { background: #d8e8bf; color: #14210a; }

    .toolbar-select { position: relative; display: flex; align-items: center; min-width: 180px; }
    .toolbar-select > i:first-child { position: absolute; left: 12px; color: #a3b190; font-size: 14px; pointer-events: none; }
    .toolbar-select .select-caret { position: absolute; right: 12px; color: #a3b190; font-size: 11px; pointer-events: none; }
    .toolbar-select select {
      width: 100%; padding: 10px 32px 10px 36px; border: 1.5px solid #e2e8d5; border-radius: 10px;
      background: #f8fbf3; font-size: 13.5px; font-family: inherit; color: #14210a; cursor: pointer; transition: all 0.2s;
      outline: none; appearance: none; -webkit-appearance: none;
    }
    .toolbar-select select:focus { border-color: #84bd33; background: #ffffff; box-shadow: 0 0 0 4px rgba(132, 189, 51, 0.12); }
    .toolbar-select:focus-within > i { color: #6ba324; }

    /* ============ TABLE ============ */
    .table-panel { background: #ffffff; border: 1px solid #eef2e6; border-radius: 18px; padding: 8px; box-shadow: 0 4px 20px -12px rgba(20, 33, 10, 0.08); }
    .table-wrap { overflow-x: auto; border-radius: 12px; }

    .custom-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13.5px; }
    .custom-table thead th {
      text-align: left; padding: 14px 16px; font-size: 11.5px; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.5px; background: #fafcf6; border-bottom: 1.5px solid #eef2e6; white-space: nowrap;
    }
    .custom-table thead th:first-child { border-radius: 12px 0 0 0; }
    .custom-table thead th:last-child { border-radius: 0 12px 0 0; }
    .custom-table tbody td { padding: 14px 16px; border-bottom: 1px solid #f4f7ee; color: #14210a; vertical-align: middle; }
    .custom-table tbody tr { transition: background 0.15s; }
    .custom-table tbody tr:hover { background: #fafcf6; }
    .custom-table tbody tr:last-child td { border-bottom: none; }

    /* Product Image */
    .product-image-wrap { width: 52px; height: 52px; border-radius: 12px; overflow: hidden; background: #f4f9f0; flex-shrink: 0; }
    .product-image { width: 100%; height: 100%; object-fit: cover; display: block; }
    .product-image-placeholder {
      display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800;
      color: #6ba324; background: linear-gradient(135deg, #eef7e0 0%, #e0f0c8 100%);
    }

    /* Product Info */
    .product-name { font-size: 14px; font-weight: 700; color: #14210a; margin-bottom: 2px; line-height: 1.3; }
    .product-meta { font-size: 11px; color: #94a3b8; font-family: ui-monospace, monospace; }

    /* Category Badge */
    .badge-category { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; background: #f0f8e5; color: #558a1a; border-radius: 100px; font-size: 11.5px; font-weight: 700; white-space: nowrap; }
    .badge-category i { font-size: 10.5px; }
    .badge-category-empty { background: #f4f7ee; color: #94a3b8; font-style: italic; }

    /* Price */
    .price-tag { font-family: ui-monospace, monospace; font-size: 13.5px; font-weight: 800; color: #14210a; letter-spacing: -0.3px; white-space: nowrap; }

    /* Status Pill */
    .status-pill {
      display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 100px;
      border: 1.5px solid transparent; font-family: inherit; font-size: 11.5px; font-weight: 700;
      cursor: pointer; transition: all 0.18s; white-space: nowrap; min-width: 90px; justify-content: center; min-height: 30px;
    }
    .status-available { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
    .status-available:hover { background: #bbf7d0; transform: translateY(-1px); }
    .status-empty { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }
    .status-empty:hover { background: #fecaca; transform: translateY(-1px); }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

    /* Action Buttons */
    .action-group { display: inline-flex; gap: 6px; justify-content: flex-end; }
    .btn-action {
      display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 9px;
      font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; text-decoration: none;
      border: 1.5px solid transparent; transition: all 0.18s; white-space: nowrap;
    }
    .btn-edit { background: #f8fbf3; border-color: #e2e8d5; color: #4a5a3d; }
    .btn-edit:hover { background: #f0f8e5; border-color: #84bd33; color: #6ba324; transform: translateY(-1px); }
    .btn-delete { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
    .btn-delete:hover { background: #ef4444; border-color: #ef4444; color: #ffffff; transform: translateY(-1px); box-shadow: 0 6px 16px -6px rgba(239, 68, 68, 0.6); }

    /* ============ PAGINATION ============ */
    .pagination-wrap { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 16px; border-top: 1px solid #f4f7ee; flex-wrap: wrap; }
    .pagination-info { font-size: 12.5px; color: #6b7a5e; }
    .pagination-info strong { color: #14210a; font-weight: 700; }
    .pagination-nav { display: flex; }
    .pagination { display: flex; gap: 4px; list-style: none; padding: 0; margin: 0; }
    .page-item .page-link {
      display: inline-flex; align-items: center; justify-content: center; min-width: 34px; height: 34px;
      padding: 0 10px; border-radius: 9px; border: 1.5px solid #e2e8d5; background: #ffffff; color: #4a5a3d;
      font-family: inherit; font-size: 12.5px; font-weight: 600; text-decoration: none; transition: all 0.15s; cursor: pointer;
    }
    .page-item .page-link:hover { border-color: #84bd33; color: #6ba324; background: #f0f8e5; }
    .page-item.active .page-link { background: linear-gradient(135deg, #84bd33, #6ba324); border-color: #6ba324; color: #ffffff; }
    .page-item.disabled .page-link { background: #fafcf6; color: #cbd5b5; border-color: #eef2e6; cursor: not-allowed; }

    /* ============ EMPTY STATE ============ */
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 24px; text-align: center; }
    .empty-icon { width: 90px; height: 90px; border-radius: 24px; background: linear-gradient(135deg, #f0f8e5 0%, #e8efdb 100%); display: flex; align-items: center; justify-content: center; font-size: 40px; color: #84bd33; margin-bottom: 20px; }
    .empty-title { font-size: 17px; font-weight: 800; color: #14210a; margin: 0 0 6px; }
    .empty-message { font-size: 13.5px; color: #6b7a5e; line-height: 1.6; margin: 0 0 20px; max-width: 340px; }
    .empty-btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg, #84bd33, #6ba324); color: #fff;
      border: none; border-radius: 12px; font-size: 13.5px; font-weight: 700; cursor: pointer; transition: all 0.2s; text-decoration: none;
      box-shadow: 0 8px 20px -8px rgba(107, 163, 36, 0.6);
    }
    .empty-btn:hover { transform: translateY(-1px); box-shadow: 0 12px 24px -8px rgba(107, 163, 36, 0.7); color: #fff; }

    /* ============ MODAL ============ */
    .modal-overlay { position: fixed; inset: 0; background: rgba(20, 33, 10, 0.55); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 1000; animation: fade-in 0.2s ease; }
    .modal-card { position: relative; width: 100%; max-width: 440px; background: #ffffff; border-radius: 22px; padding: 32px 28px 26px; box-shadow: 0 30px 70px -20px rgba(20, 33, 10, 0.35); text-align: center; animation: pop-in 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    .modal-close { position: absolute; top: 14px; right: 14px; width: 34px; height: 34px; border-radius: 50%; border: none; background: #f4f7ee; color: #6b7a5e; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 13px; transition: all 0.2s; }
    .modal-close:hover { background: #e8efdb; color: #14210a; transform: rotate(90deg); }
    .modal-icon-wrap { width: 68px; height: 68px; border-radius: 20px; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 30px; margin: 4px auto 20px; }
    .modal-title { font-size: 20px; font-weight: 800; color: #14210a; margin: 0 0 8px; }
    .modal-message { font-size: 13.5px; color: #6b7a5e; line-height: 1.6; margin: 0 0 26px; }
    .modal-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    
    .btn-cancel, .btn-confirm { padding: 12px 18px; border-radius: 12px; font-family: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s; display: flex; align-items: center; justify-content: center; min-height: 44px; }
    .btn-cancel { background: #f4f7ee; border: 1.5px solid #e2e8d5; color: #4a5a3d; }
    .btn-cancel:hover { background: #e8efdb; color: #14210a; }
    .btn-confirm { background: linear-gradient(135deg, #ef4444, #dc2626); color: #ffffff; box-shadow: 0 8px 20px -8px rgba(220, 38, 38, 0.6); }
    .btn-confirm:hover { transform: translateY(-1px); box-shadow: 0 12px 24px -8px rgba(220, 38, 38, 0.7); }
    
    .spinner { width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pop-in { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }

    /* ============ RESPONSIVE ============ */
    @media (max-width: 768px) {
      .toolbar { padding: 10px; }
      .toolbar-search { min-width: 100%; }
      .toolbar-select { width: 100%; }
      .pagination-wrap { flex-direction: column; align-items: stretch; }
      .pagination-info { text-align: center; }
      .pagination { justify-content: center; }
    }
    @media (max-width: 640px) {
      .btn-action span { display: none; }
      .btn-action { padding: 8px 10px; }
      .page-title { font-size: 22px; }
      .custom-table thead th, .custom-table tbody td { padding: 10px 12px; }
      .product-image-wrap { width: 44px; height: 44px; }
      .status-pill { padding: 5px 9px; font-size: 11px; min-width: 76px; }
    }
  `,
})
export class Products implements OnInit {
  private api = inject(ProductService);
  private categoryApi = inject(CategoryService);
  private toast = inject(ToastService);

  search = new FormControl('', { nonNullable: true });
  categoryId = new FormControl<number | null>(null);

  categories = signal<Category[]>([]);
  result = signal<Paged<Product> | null>(null);
  items = computed(() => this.result()?.items ?? []);
  page = signal(1);

  // State Delete Modal
  showDeleteModal = signal(false);
  targetProduct = signal<Product | null>(null);
  deleting = signal(false);

  img = fileUrl;
  Math = Math; // expose Math untuk template

  constructor() {
    merge(
      this.search.valueChanges.pipe(debounceTime(300)),
      this.categoryId.valueChanges
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });
  }

  ngOnInit() {
    this.categoryApi.list().subscribe((c) => this.categories.set(c));
    this.load();
  }

  load() {
    this.api
      .list({ search: this.search.value, categoryId: this.categoryId.value, page: this.page() })
      .subscribe((r) => this.result.set(r));
  }

  go(page: number) {
    this.page.set(page);
    this.load();
  }

  toggle(p: Product) {
    this.api.toggle(p.id).subscribe({
      next: () => this.load(),
      error: (err) => this.toast.error(errorMessages(err)[0]),
    });
  }

  // --- Delete Logic (Menggunakan Modal Kustom) ---
  askDelete(p: Product) {
    this.targetProduct.set(p);
    this.showDeleteModal.set(true);
  }

  cancelDelete() {
    this.showDeleteModal.set(false);
    setTimeout(() => this.targetProduct.set(null), 250);
  }

  confirmDelete() {
    const p = this.targetProduct();
    if (!p) return;

    this.deleting.set(true);
    this.api.remove(p.id).subscribe({
      next: () => {
        this.toast.success('Produk berhasil dihapus.');
        
        // Cek jika ini adalah item terakhir di halaman, mundur 1 halaman
        if (this.items().length === 1 && this.page() > 1) {
          this.page.update((n) => n - 1);
        }
        
        this.deleting.set(false);
        this.cancelDelete();
        this.load();
      },
      error: (err) => {
        this.toast.error(errorMessages(err)[0]);
        this.deleting.set(false);
        this.cancelDelete();
      },
    });
  }
}