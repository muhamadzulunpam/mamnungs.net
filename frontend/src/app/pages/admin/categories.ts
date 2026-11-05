import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CategoryService } from '../../core/category.service';
import { errorMessages } from '../../core/errors';
import { Category } from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <!-- ============ HEADER ============ -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Kategori Menu</h1>
        <p class="page-subtitle">
          Kelola kategori untuk mengelompokkan menu es teler Anda.
        </p>
      </div>
      <!-- Tombol untuk scroll ke form jika di mobile -->
      <button class="btn-primary-custom d-lg-none" (click)="focusForm()">
        <i class="bi bi-plus-lg"></i> Tambah
      </button>
    </div>

    <!-- ============ FORM CARD (Tambah / Edit) ============ -->
    <div class="form-panel" id="form-panel">
      <div class="form-header">
        <div class="form-icon" [class.is-edit]="editingId()">
          <i class="bi" [ngClass]="editingId() ? 'bi-pencil-square' : 'bi-plus-circle'"></i>
        </div>
        <div>
          <h3 class="form-title">
            {{ editingId() ? 'Ubah Kategori' : 'Tambah Kategori Baru' }}
          </h3>
          <p class="form-sub">
            {{ editingId() ? 'Perbarui nama kategori sesuai kebutuhan.' : 'Buat kategori baru untuk mengelompokkan menu.' }}
          </p>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()" class="form-body">
        <div class="input-group-custom">
          <label class="input-label">
            Nama Kategori <span class="required">*</span>
          </label>
          <div class="input-wrapper" [class.has-error]="error()">
            <i class="bi bi-tag input-icon"></i>
            <input
              id="category-input"
              type="text"
              formControlName="name"
              maxlength="100"
              [placeholder]="editingId() ? 'Ubah nama kategori...' : 'Contoh: Es Teler, Minuman, Topping'"
              autocomplete="off"
            />
            <!-- Character counter -->
            <span class="char-counter">{{ form.controls.name.value.length }}/100</span>
          </div>
          @if (error()) {
            <div class="error-text">
              <i class="bi bi-exclamation-circle"></i> {{ error() }}
            </div>
          } @else if (form.controls.name.value.length > 90) {
            <div class="error-text" style="color: #f59e0b;">
              <i class="bi bi-exclamation-triangle"></i> Hampir mencapai batas maksimal
            </div>
          }
        </div>

        <div class="form-actions">
          @if (editingId()) {
            <button type="button" class="btn-cancel" (click)="cancel()">
              <i class="bi bi-x-lg"></i> Batal
            </button>
          }
          <button type="submit" class="btn-submit" [disabled]="saving() || form.invalid">
            @if (saving()) {
              <span class="spinner"></span> Menyimpan...
            } @else {
              <i class="bi bi-check-lg"></i>
              {{ editingId() ? 'Simpan Perubahan' : 'Simpan Kategori' }}
            }
          </button>
        </div>
      </form>
    </div>

    <!-- ============ TABLE CARD ============ -->
    <div class="table-panel">
      @if (items().length === 0) {
        <!-- Empty State -->
        <div class="empty-state">
          <div class="empty-icon"><i class="bi bi-tags"></i></div>
          <h4 class="empty-title">Belum Ada Kategori</h4>
          <p class="empty-message">
            Mulai dengan membuat kategori pertama Anda, seperti 'Es Teler', 'Minuman', atau 'Topping'.
          </p>
          <button class="empty-btn" (click)="focusForm()">
            <i class="bi bi-plus-lg"></i> Tambah Kategori Pertama
          </button>
        </div>
      } @else {
        <div class="table-wrap">
          <table class="custom-table">
            <thead>
              <tr>
                <th style="width: 60px">#</th>
                <th>Nama Kategori</th>
                <th>Jumlah Produk</th>
                <th class="text-end">Aksi</th>
              </tr>
            </thead>
            <tbody>
              @for (c of items(); track c.id; let i = $index) {
                <tr>
                  <td>
                    <span class="row-number">{{ (i + 1).toString().padStart(2, '0') }}</span>
                  </td>
                  <td>
                    <div class="category-cell">
                      <div class="category-icon"><i class="bi bi-tag-fill"></i></div>
                      <div>
                        <div class="category-name">{{ c.name }}</div>
                        <div class="category-meta">ID #{{ c.id }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge-count">
                      <i class="bi bi-cup-straw"></i> {{ c.productsCount }} produk
                    </span>
                  </td>
                  <td class="text-end">
                    <div class="action-group">
                      <button class="btn-action btn-edit" (click)="edit(c)" title="Ubah">
                        <i class="bi bi-pencil"></i><span>Ubah</span>
                      </button>
                      <button class="btn-action btn-delete" (click)="askDelete(c)" title="Hapus">
                        <i class="bi bi-trash3"></i><span>Hapus</span>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
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

          <h3 class="modal-title">Hapus Kategori?</h3>
          <p class="modal-message">
            Kategori <strong>"{{ targetCategory()?.name }}"</strong> akan dihapus permanen.
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
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-end;
      gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
    }
    .page-title {
      font-size: 26px; font-weight: 800; color: #14210a;
      letter-spacing: -0.8px; margin: 0 0 4px;
    }
    .page-subtitle { font-size: 13.5px; color: #6b7a5e; margin: 0; }
    
    .btn-primary-custom {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 11px 20px; background: linear-gradient(135deg, #84bd33 0%, #6ba324 100%);
      border: none; border-radius: 12px; font-size: 13.5px; font-weight: 700;
      font-family: inherit; color: #ffffff; cursor: pointer; transition: all 0.25s;
      box-shadow: 0 8px 20px -8px rgba(107, 163, 36, 0.6);
    }
    .btn-primary-custom:hover { transform: translateY(-2px); box-shadow: 0 12px 24px -8px rgba(107, 163, 36, 0.7); }

    /* ============ FORM PANEL ============ */
    .form-panel {
      background: #ffffff; border: 1px solid #eef2e6; border-radius: 20px;
      padding: 24px; margin-bottom: 20px; box-shadow: 0 4px 20px -12px rgba(20, 33, 10, 0.08);
      max-width: 800px;
    }
    .form-header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px dashed #e2e8d5; }
    .form-icon {
      width: 46px; height: 46px; border-radius: 13px; background: #eef7e0; color: #6ba324;
      display: flex; align-items: center; justify-content: center; font-size: 22px; transition: all 0.3s;
    }
    .form-icon.is-edit { background: #fef3c7; color: #d97706; }
    .form-title { font-size: 16px; font-weight: 800; color: #14210a; margin: 0 0 2px; }
    .form-sub { font-size: 12.5px; color: #94a3b8; margin: 0; }

    .form-body { display: flex; flex-direction: column; gap: 16px; }
    .input-label { display: block; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 8px; }
    .required { color: #ef4444; }

    .input-wrapper { position: relative; display: flex; align-items: center; }
    .input-icon { position: absolute; left: 16px; color: #a3b190; font-size: 16px; pointer-events: none; }
    .input-wrapper input {
      width: 100%; padding: 14px 60px 14px 44px; border: 1.5px solid #e2e8d5;
      border-radius: 12px; background: #f8fbf3; font-size: 14px; font-family: inherit;
      color: #14210a; transition: all 0.2s; outline: none;
    }
    .input-wrapper input::placeholder { color: #a3b190; }
    .input-wrapper input:focus { border-color: #84bd33; background: #ffffff; box-shadow: 0 0 0 4px rgba(132, 189, 51, 0.15); }
    .input-wrapper:focus-within .input-icon { color: #6ba324; }
    .input-wrapper.has-error input { border-color: #ef4444; background: #fef7f7; }

    .char-counter {
      position: absolute; right: 16px; font-size: 11px; font-weight: 700;
      color: #94a3b8; font-family: ui-monospace, monospace; pointer-events: none;
    }

    .error-text { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #dc2626; margin-top: 6px; font-weight: 600; }

    .form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
    
    .btn-cancel, .btn-submit {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 12px 20px; border-radius: 12px; font-family: inherit; font-size: 13.5px; font-weight: 700;
      cursor: pointer; transition: all 0.2s; min-height: 44px;
    }
    .btn-cancel { background: #f4f7ee; border: 1.5px solid #e2e8d5; color: #4a5a3d; }
    .btn-cancel:hover { background: #e8efdb; color: #14210a; }
    .btn-submit {
      background: linear-gradient(135deg, #84bd33 0%, #6ba324 100%); color: #ffffff; border: none;
      box-shadow: 0 8px 20px -8px rgba(107, 163, 36, 0.6);
    }
    .btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 24px -8px rgba(107, 163, 36, 0.7); }
    .btn-submit:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

    .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ============ TABLE PANEL ============ */
    .table-panel { background: #ffffff; border: 1px solid #eef2e6; border-radius: 18px; padding: 8px; box-shadow: 0 4px 20px -12px rgba(20, 33, 10, 0.08); }
    .table-wrap { overflow-x: auto; border-radius: 12px; }

    .custom-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13.5px; }
    .custom-table thead th {
      text-align: left; padding: 14px 16px; font-size: 11.5px; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.5px; background: #fafcf6; border-bottom: 1.5px solid #eef2e6; white-space: nowrap;
    }
    .custom-table thead th:first-child { border-radius: 12px 0 0 0; }
    .custom-table thead th:last-child { border-radius: 0 12px 0 0; }
    .custom-table tbody td { padding: 16px; border-bottom: 1px solid #f4f7ee; color: #14210a; vertical-align: middle; }
    .custom-table tbody tr { transition: background 0.15s; }
    .custom-table tbody tr:hover { background: #fafcf6; }
    .custom-table tbody tr:last-child td { border-bottom: none; }

    .row-number {
      display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 32px;
      padding: 0 8px; background: #f4f9f0; color: #6ba324; font-family: ui-monospace, monospace;
      font-size: 12px; font-weight: 700; border-radius: 8px;
    }

    .category-cell { display: flex; align-items: center; gap: 12px; }
    .category-icon {
      width: 40px; height: 40px; border-radius: 11px; background: linear-gradient(135deg, #eef7e0 0%, #e0f0c8 100%);
      color: #6ba324; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;
    }
    .category-name { font-size: 14px; font-weight: 700; color: #14210a; margin-bottom: 2px; }
    .category-meta { font-size: 11.5px; color: #94a3b8; font-family: ui-monospace, monospace; }

    .badge-count {
      display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; background: #f0f8e5;
      color: #558a1a; border-radius: 100px; font-size: 12px; font-weight: 700; white-space: nowrap;
    }

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

    /* ============ EMPTY STATE ============ */
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 24px; text-align: center; }
    .empty-icon {
      width: 90px; height: 90px; border-radius: 24px; background: linear-gradient(135deg, #f0f8e5 0%, #e8efdb 100%);
      display: flex; align-items: center; justify-content: center; font-size: 40px; color: #84bd33; margin-bottom: 20px;
    }
    .empty-title { font-size: 17px; font-weight: 800; color: #14210a; margin: 0 0 6px; }
    .empty-message { font-size: 13.5px; color: #6b7a5e; line-height: 1.6; margin: 0 0 20px; max-width: 340px; }
    .empty-btn {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg, #84bd33, #6ba324);
      color: #fff; border: none; border-radius: 12px; font-size: 13.5px; font-weight: 700; cursor: pointer; transition: all 0.2s;
      box-shadow: 0 8px 20px -8px rgba(107, 163, 36, 0.6);
    }
    .empty-btn:hover { transform: translateY(-1px); box-shadow: 0 12px 24px -8px rgba(107, 163, 36, 0.7); }

    /* ============ MODAL ============ */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(20, 33, 10, 0.55); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 1000;
      animation: fade-in 0.2s ease;
    }
    .modal-card {
      position: relative; width: 100%; max-width: 440px; background: #ffffff; border-radius: 22px;
      padding: 32px 28px 26px; box-shadow: 0 30px 70px -20px rgba(20, 33, 10, 0.35); text-align: center;
      animation: pop-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .modal-close {
      position: absolute; top: 14px; right: 14px; width: 34px; height: 34px; border-radius: 50%;
      border: none; background: #f4f7ee; color: #6b7a5e; cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 13px; transition: all 0.2s;
    }
    .modal-close:hover { background: #e8efdb; color: #14210a; transform: rotate(90deg); }
    .modal-icon-wrap {
      width: 68px; height: 68px; border-radius: 20px; background: #fee2e2; color: #dc2626;
      display: flex; align-items: center; justify-content: center; font-size: 30px; margin: 4px auto 20px;
    }
    .modal-title { font-size: 20px; font-weight: 800; color: #14210a; margin: 0 0 8px; }
    .modal-message { font-size: 13.5px; color: #6b7a5e; line-height: 1.6; margin: 0 0 26px; }
    .modal-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .modal-actions .btn-cancel { background: #f4f7ee; color: #4a5a3d; border: 1.5px solid #e2e8d5; }
    .modal-actions .btn-cancel:hover { background: #e8efdb; color: #14210a; }
    .modal-actions .btn-confirm {
      background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; border: none;
      box-shadow: 0 8px 20px -8px rgba(220, 38, 38, 0.6);
    }
    .modal-actions .btn-confirm:hover { transform: translateY(-1px); box-shadow: 0 12px 24px -8px rgba(220, 38, 38, 0.7); }

    /* ============ ANIMATIONS ============ */
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pop-in { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }

    /* ============ RESPONSIVE ============ */
    @media (max-width: 640px) {
      .btn-action span { display: none; }
      .btn-action { padding: 8px 10px; }
      .page-title { font-size: 22px; }
      .custom-table thead th, .custom-table tbody td { padding: 12px; }
      .form-panel { padding: 18px; }
    }
  `,
})
export class Categories implements OnInit {
  private api = inject(CategoryService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  // State List
  items = signal<Category[]>([]);
  editingId = signal<number | null>(null);
  saving = signal(false);
  error = signal<string | null>(null);

  // State Delete Modal
  showDeleteModal = signal(false);
  targetCategory = signal<Category | null>(null);
  deleting = signal(false);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.list().subscribe((data) => this.items.set(data));
  }

  // Scroll ke form saat klik dari tabel atau tombol mobile
  focusForm() {
    document.getElementById('form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => document.getElementById('category-input')?.focus(), 300);
  }

  edit(c: Category) {
    this.editingId.set(c.id);
    this.form.setValue({ name: c.name });
    this.error.set(null);
    this.focusForm();
  }

  cancel() {
    this.editingId.set(null);
    this.form.reset();
    this.error.set(null);
  }

  save() {
    if (this.form.invalid) return;

    this.saving.set(true);
    this.error.set(null);

    const name = this.form.getRawValue().name;
    const id = this.editingId();
    const request = id ? this.api.update(id, name) : this.api.create(name);

    request.subscribe({
      next: () => {
        this.toast.success(id ? 'Kategori berhasil diubah.' : 'Kategori berhasil ditambahkan.');
        this.cancel();
        this.saving.set(false);
        this.load();
      },
      error: (err) => {
        this.error.set(errorMessages(err)[0]);
        this.saving.set(false);
      },
    });
  }

  // --- Delete Logic ---
  askDelete(c: Category) {
    this.targetCategory.set(c);
    this.showDeleteModal.set(true);
  }

  cancelDelete() {
    this.showDeleteModal.set(false);
    setTimeout(() => this.targetCategory.set(null), 250); // delay agar animasi smooth
  }

  confirmDelete() {
    const c = this.targetCategory();
    if (!c) return;

    this.deleting.set(true);
    this.api.remove(c.id).subscribe({
      next: () => {
        this.toast.success('Kategori berhasil dihapus.');
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