import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CategoryService } from '../../core/category.service';
import { fileUrl } from '../../core/config';
import { errorMessages } from '../../core/errors';
import { Category } from '../../core/models';
import { ProductService } from '../../core/product.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <!-- ============ BREADCRUMB ============ -->
    <nav class="breadcrumb-nav">
      <a routerLink="/admin/dashboard" class="breadcrumb-link">Dashboard</a>
      <i class="bi bi-chevron-right breadcrumb-sep"></i>
      <a routerLink="/admin/products" class="breadcrumb-link">Produk</a>
      <i class="bi bi-chevron-right breadcrumb-sep"></i>
      <span class="breadcrumb-current">{{ id ? 'Ubah' : 'Tambah' }}</span>
    </nav>

    <!-- ============ HEADER ============ -->
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ id ? 'Ubah Produk' : 'Tambah Produk Baru' }}</h1>
        <p class="page-subtitle">
          {{ id ? 'Perbarui informasi menu, harga, atau ketersediaan stok.' : 'Tambahkan menu es teler baru ke katalog Anda.' }}
        </p>
      </div>
    </div>

    <!-- ============ FORM WRAP (2 Kolom) ============ -->
    <div class="form-wrap">
      <!-- KIRI: FORM -->
      <div class="form-card">
        @if (errors().length) {
          <div class="alert-custom">
            <i class="bi bi-exclamation-circle-fill"></i>
            <div>
              @for (e of errors(); track $index) { <div>{{ e }}</div> }
            </div>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()">
          <!-- SECTION: Info Dasar -->
          <div class="section-title">
            <i class="bi bi-info-circle"></i> Informasi Dasar
          </div>

          <!-- Nama Produk -->
          <div class="input-group-custom">
            <label class="input-label">Nama Produk <span class="required">*</span></label>
            <div class="input-wrapper" [class.has-error]="invalid('name')">
              <i class="bi bi-cup-straw input-icon"></i>
              <input type="text" formControlName="name" placeholder="Contoh: Es Teler Special" autocomplete="off" />
            </div>
            @if (invalid('name')) {
              <div class="error-text"><i class="bi bi-exclamation-circle"></i> Nama produk wajib diisi (maks. 150 karakter).</div>
            }
          </div>

          <!-- Kategori -->
          <div class="input-group-custom">
            <label class="input-label">Kategori <span class="required">*</span></label>
            <div class="input-wrapper input-wrapper-select" [class.has-error]="invalid('categoryId')">
              <i class="bi bi-tags input-icon"></i>
              <select formControlName="categoryId">
                <option [ngValue]="null" disabled>Pilih kategori</option>
                @for (c of categories(); track c.id) {
                  <option [ngValue]="c.id">{{ c.name }}</option>
                }
              </select>
              <i class="bi bi-chevron-down select-caret"></i>
            </div>
            @if (invalid('categoryId')) {
              <div class="error-text"><i class="bi bi-exclamation-circle"></i> Pilih kategori.</div>
            }
          </div>

          <!-- Harga -->
          <div class="input-group-custom">
            <label class="input-label">Harga <span class="required">*</span></label>
            <div class="input-wrapper" [class.has-error]="invalid('price')">
              <span class="input-prefix">Rp</span>
              <input type="text" inputmode="numeric" [value]="priceDisplay()" (input)="onPriceInput($event)" placeholder="0" class="input-with-prefix" />
            </div>
            @if (invalid('price')) {
              <div class="error-text"><i class="bi bi-exclamation-circle"></i> Isi harga antara 0 dan 10.000.000.</div>
            } @else {
              <div class="hint-text"><i class="bi bi-info-circle"></i> Masukkan angka saja, format otomatis</div>
            }
          </div>

          <!-- Deskripsi -->
          <div class="input-group-custom">
            <label class="input-label">Deskripsi <span class="label-optional">opsional</span></label>
            <div class="input-wrapper input-wrapper-textarea">
              <textarea formControlName="description" rows="4" placeholder="Ceritakan keunggulan menu ini, bahan utama, atau varian topping..."></textarea>
              <div class="textarea-counter">{{ form.controls.description.value.length }}/500</div>
            </div>
          </div>

          <!-- SECTION: Foto -->
          <div class="section-title section-title-spaced">
            <i class="bi bi-image"></i> Foto Produk
          </div>

          <div class="input-group-custom">
            <label class="input-label">Foto <span class="label-optional">JPG, PNG, WebP · maks 2MB</span></label>

            @if (!preview()) {
              <div class="upload-zone" (click)="fileInput.click()">
                <div class="upload-icon"><i class="bi bi-cloud-arrow-up"></i></div>
                <div class="upload-title"><strong>Klik untuk upload</strong> atau drag & drop</div>
                <div class="upload-hint">Format JPG, PNG, atau WebP · Maks 2 MB</div>
              </div>
            } @else {
              <div class="image-preview">
                <img [src]="preview()!" alt="Preview" class="image-preview-img" />
                <div class="image-preview-overlay">
                  <button type="button" class="preview-btn" (click)="fileInput.click()"><i class="bi bi-arrow-repeat"></i> Ganti</button>
                  <button type="button" class="preview-btn preview-btn-danger" (click)="removeImage()"><i class="bi bi-trash3"></i> Hapus</button>
                </div>
              </div>
            }

            <!-- Input File Hidden -->
            <input #fileInput type="file" accept="image/*" class="d-none" (change)="pickFile($event)" />
          </div>

          <!-- SECTION: Pengaturan -->
          <div class="section-title section-title-spaced">
            <i class="bi bi-gear"></i> Pengaturan
          </div>

          <div class="toggle-row" (click)="toggleAvailability()">
            <div class="toggle-info">
              <div class="toggle-title">Tersedia Dijual</div>
              <div class="toggle-sub">
                {{ form.controls.isAvailable.value ? 'Produk akan muncul di menu kasir' : 'Produk disembunyikan dari menu kasir' }}
              </div>
            </div>
            <div class="toggle-switch" [class.is-on]="form.controls.isAvailable.value">
              <div class="toggle-knob"></div>
            </div>
          </div>

          <!-- Tombol Aksi -->
          <div class="form-actions">
            <a routerLink="/admin/products" class="btn-cancel">
              <i class="bi bi-arrow-left"></i> Batal
            </a>
            <button type="submit" class="btn-submit" [disabled]="saving()">
              @if (!saving()) {
                <span><i class="bi bi-check-lg"></i> {{ id ? 'Simpan Perubahan' : 'Simpan Produk' }}</span>
              } @else {
                <span class="spinner"></span>
              }
            </button>
          </div>
        </form>
      </div>

      <!-- KANAN: SIDEBAR (Live Preview) -->
      <aside class="form-aside">
        <div class="aside-card">
          <div class="aside-title"><i class="bi bi-eye"></i> Preview</div>
          <div class="product-preview">
            <div class="product-preview-img">
              @if (preview()) {
                <img [src]="preview()!" alt="Preview" />
              } @else {
                <div class="product-preview-placeholder"><i class="bi bi-cup-straw"></i></div>
              }
            </div>
            <div class="product-preview-body">
              <div class="product-preview-name">{{ form.controls.name.value || 'Nama Produk' }}</div>
              @if (selectedCategory(); as cat) {
                <div class="product-preview-cat"><i class="bi bi-tag-fill"></i> {{ cat.name }}</div>
              }
              <div class="product-preview-price">
                {{ form.controls.price.value ? 'Rp ' + (form.controls.price.value | number:'1.0-0':'id-ID') : 'Rp 0' }}
              </div>
              <div class="product-preview-status" [class.available]="form.controls.isAvailable.value" [class.empty]="!form.controls.isAvailable.value">
                <span class="status-dot"></span>
                {{ form.controls.isAvailable.value ? 'Tersedia' : 'Habis' }}
              </div>
            </div>
          </div>
        </div>

        <div class="tips-card">
          <div class="tips-icon"><i class="bi bi-lightbulb"></i></div>
          <div class="tips-title">Tips Produk</div>
          <ul class="tips-list">
            <li><i class="bi bi-check-circle-fill"></i> <span>Nama produk singkat & mudah dibaca kasir</span></li>
            <li><i class="bi bi-check-circle-fill"></i> <span>Foto produk terang & background bersih</span></li>
            <li><i class="bi bi-check-circle-fill"></i> <span>Harga pembulatan 500 untuk memudahkan</span></li>
            <li><i class="bi bi-check-circle-fill"></i> <span>Toggle <strong>Tersedia</strong> untuk kontrol stok cepat</span></li>
          </ul>
        </div>
      </aside>
    </div>
  `,
  styles: `
    @import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css');

    /* ============ BREADCRUMB & HEADER ============ */
    .breadcrumb-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; font-size: 12.5px; }
    .breadcrumb-link { color: #6b7a5e; text-decoration: none; font-weight: 600; transition: color 0.15s; }
    .breadcrumb-link:hover { color: #6ba324; }
    .breadcrumb-sep { color: #cbd5b5; font-size: 10px; }
    .breadcrumb-current { color: #14210a; font-weight: 700; }

    .page-header { margin-bottom: 24px; }
    .page-title { font-size: 26px; font-weight: 800; color: #14210a; letter-spacing: -0.8px; margin: 0 0 4px; }
    .page-subtitle { font-size: 13.5px; color: #6b7a5e; margin: 0; }

    /* ============ LAYOUT ============ */
    .form-wrap { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; max-width: 1100px; }
    @media (max-width: 960px) {
      .form-wrap { grid-template-columns: 1fr; }
      .form-aside { order: -1; }
    }

    /* ============ FORM CARD ============ */
    .form-card { background: #ffffff; border: 1px solid #eef2e6; border-radius: 20px; padding: 28px 24px 24px; box-shadow: 0 4px 20px -12px rgba(20, 33, 10, 0.08); }
    
    .alert-custom { display: flex; align-items: flex-start; gap: 8px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 12px 14px; border-radius: 12px; font-size: 13px; margin-bottom: 20px; font-weight: 500; }
    .alert-custom i { font-size: 16px; margin-top: 1px; }

    .section-title { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; color: #6ba324; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px dashed #e2e8d5; }
    .section-title-spaced { margin-top: 28px; }

    /* ============ INPUTS ============ */
    .input-group-custom { margin-bottom: 20px; }
    .input-label { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 8px; }
    .required { color: #ef4444; }
    .label-optional { font-size: 11px; font-weight: 500; color: #94a3b8; background: #f4f7ee; padding: 2px 8px; border-radius: 100px; text-transform: none; letter-spacing: 0; }

    .input-wrapper { position: relative; display: flex; align-items: center; }
    .input-icon { position: absolute; left: 16px; color: #a3b190; font-size: 16px; pointer-events: none; transition: color 0.2s; z-index: 2; }
    
    .input-wrapper input, .input-wrapper select, .input-wrapper textarea {
      width: 100%; padding: 14px 16px 14px 44px; border: 1.5px solid #e2e8d5; border-radius: 12px;
      background: #f8fbf3; font-size: 14px; font-family: inherit; color: #14210a; transition: all 0.2s ease; outline: none;
    }
    .input-wrapper input::placeholder, .input-wrapper textarea::placeholder { color: #a3b190; }
    .input-wrapper input:focus, .input-wrapper select:focus, .input-wrapper textarea:focus { border-color: #84bd33; background: #ffffff; box-shadow: 0 0 0 4px rgba(132, 189, 51, 0.15); }
    .input-wrapper:focus-within .input-icon { color: #6ba324; }
    .input-wrapper.has-error input, .input-wrapper.has-error select { border-color: #ef4444; background: #fef7f7; }

    /* Select */
    .input-wrapper-select select { cursor: pointer; appearance: none; padding-right: 40px; }
    .select-caret { position: absolute; right: 16px; color: #a3b190; font-size: 12px; pointer-events: none; }
    .input-wrapper-select:focus-within .select-caret { color: #6ba324; }

    /* Textarea */
    .input-wrapper-textarea textarea { padding: 14px 16px; resize: vertical; min-height: 100px; line-height: 1.5; }
    .textarea-counter { position: absolute; bottom: 10px; right: 12px; font-size: 11px; color: #a3b190; font-family: ui-monospace, monospace; background: #ffffff; padding: 2px 6px; border-radius: 6px; pointer-events: none; }

    /* Price */
    .input-prefix { position: absolute; left: 16px; color: #6ba324; font-weight: 800; font-size: 14px; pointer-events: none; z-index: 2; }
    .input-wrapper .input-with-prefix { padding-left: 44px; font-family: ui-monospace, monospace; font-weight: 700; letter-spacing: 0.3px; }

    .hint-text, .error-text { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 500; margin-top: 6px; }
    .hint-text { color: #94a3b8; }
    .error-text { color: #dc2626; font-weight: 600; }

    /* ============ UPLOAD ZONE ============ */
    .upload-zone {
      display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 20px;
      border: 2px dashed #d8e8bf; border-radius: 14px; background: #fafcf6; cursor: pointer; transition: all 0.2s; text-align: center;
    }
    .upload-zone:hover { border-color: #84bd33; background: #f0f8e5; transform: translateY(-1px); }
    .upload-icon { width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, #eef7e0 0%, #e0f0c8 100%); color: #6ba324; display: flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 12px; }
    .upload-title { font-size: 13.5px; color: #4a5a3d; margin-bottom: 4px; }
    .upload-title strong { color: #6ba324; font-weight: 800; }
    .upload-hint { font-size: 11.5px; color: #94a3b8; }

    /* ============ IMAGE PREVIEW ============ */
    .image-preview { position: relative; width: 100%; max-width: 320px; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 24px -12px rgba(20, 33, 10, 0.2); }
    .image-preview-img { width: 100%; height: auto; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
    .image-preview-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(20, 33, 10, 0.75), transparent 50%); display: flex; align-items: flex-end; justify-content: center; gap: 8px; padding: 14px; opacity: 0; transition: opacity 0.2s; }
    .image-preview:hover .image-preview-overlay { opacity: 1; }
    .preview-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 9px; border: none; background: rgba(255, 255, 255, 0.95); color: #14210a; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
    .preview-btn:hover { background: #ffffff; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
    .preview-btn-danger { background: rgba(239, 68, 68, 0.95); color: #ffffff; }
    .preview-btn-danger:hover { background: #dc2626; }

    /* ============ TOGGLE SWITCH ============ */
    .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 16px; background: #fafcf6; border: 1.5px solid #eef2e6; border-radius: 14px; cursor: pointer; transition: all 0.2s; margin-bottom: 8px; }
    .toggle-row:hover { background: #f4f9f0; border-color: #d8e8bf; }
    .toggle-info { flex: 1; }
    .toggle-title { font-size: 13.5px; font-weight: 700; color: #14210a; margin-bottom: 2px; }
    .toggle-sub { font-size: 11.5px; color: #94a3b8; }
    .toggle-switch { position: relative; width: 48px; height: 28px; border-radius: 100px; background: #e2e8d5; transition: background 0.25s ease; flex-shrink: 0; }
    .toggle-switch.is-on { background: linear-gradient(135deg, #84bd33, #6ba324); }
    .toggle-knob { position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; background: #ffffff; border-radius: 50%; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15); transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
    .toggle-switch.is-on .toggle-knob { transform: translateX(20px); }

    /* ============ ACTIONS ============ */
    .form-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 20px; margin-top: 24px; border-top: 1px solid #f4f7ee; }
    .btn-cancel, .btn-submit { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 22px; border-radius: 12px; font-family: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; text-decoration: none; border: 1.5px solid transparent; transition: all 0.2s; min-height: 44px; }
    .btn-cancel { background: #f4f7ee; border-color: #e2e8d5; color: #4a5a3d; }
    .btn-cancel:hover { background: #e8efdb; color: #14210a; transform: translateY(-1px); }
    .btn-submit { background: linear-gradient(135deg, #84bd33 0%, #6ba324 100%); color: #ffffff; box-shadow: 0 8px 20px -8px rgba(107, 163, 36, 0.6); }
    .btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 24px -8px rgba(107, 163, 36, 0.7); }
    .btn-submit:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }
    .spinner { width: 18px; height: 18px; border: 2.5px solid rgba(255, 255, 255, 0.3); border-top-color: #ffffff; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ============ ASIDE (PREVIEW) ============ */
    .form-aside { display: flex; flex-direction: column; gap: 16px; position: sticky; top: 90px; }
    .aside-card, .tips-card { background: #ffffff; border: 1px solid #eef2e6; border-radius: 18px; padding: 18px; }
    .aside-title { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 800; color: #6ba324; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px; }
    
    .product-preview { background: #fafcf6; border: 1px solid #eef2e6; border-radius: 14px; overflow: hidden; }
    .product-preview-img { aspect-ratio: 4 / 3; background: #f0f4e8; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .product-preview-img img { width: 100%; height: 100%; object-fit: cover; }
    .product-preview-placeholder { font-size: 44px; color: #cbd5b5; }
    .product-preview-body { padding: 14px; }
    .product-preview-name { font-size: 14px; font-weight: 800; color: #14210a; margin-bottom: 6px; line-height: 1.3; word-break: break-word; }
    .product-preview-cat { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: #558a1a; background: #f0f8e5; padding: 3px 8px; border-radius: 100px; font-weight: 700; margin-bottom: 10px; }
    .product-preview-price { font-size: 18px; font-weight: 800; color: #14210a; font-family: ui-monospace, monospace; letter-spacing: -0.5px; margin-bottom: 10px; }
    .product-preview-status { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; }
    .product-preview-status.available { background: #dcfce7; color: #15803d; }
    .product-preview-status.empty { background: #fee2e2; color: #b91c1c; }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

    .tips-card { background: linear-gradient(160deg, #f0f8e5 0%, #e8efdb 100%); border-color: #d8e8bf; }
    .tips-icon { width: 40px; height: 40px; border-radius: 11px; background: #ffffff; color: #f59e0b; display: flex; align-items: center; justify-content: center; font-size: 18px; margin-bottom: 12px; box-shadow: 0 4px 12px -4px rgba(245, 158, 11, 0.4); }
    .tips-title { font-size: 14px; font-weight: 800; color: #14210a; margin-bottom: 12px; }
    .tips-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
    .tips-list li { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; color: #4a5a3d; line-height: 1.5; }
    .tips-list i { color: #84bd33; font-size: 13px; margin-top: 2px; flex-shrink: 0; }

    /* ============ RESPONSIVE ============ */
    @media (max-width: 640px) {
      .page-title { font-size: 22px; }
      .form-card { padding: 20px 16px; }
      .form-actions { flex-direction: column-reverse; }
      .btn-cancel, .btn-submit { width: 100%; }
      .image-preview { max-width: 100%; }
    }
  `,
})
export class ProductForm implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ProductService);
  private categoryApi = inject(CategoryService);
  private toast = inject(ToastService);

  id = Number(this.route.snapshot.paramMap.get('id')) || null;

  categories = signal<Category[]>([]);
  preview = signal<string | null>(null);
  errors = signal<string[]>([]);
  saving = signal(false);
  
  private file: File | null = null;
  private rawPrice = signal<number | null>(null);

  form = this.fb.group({
    categoryId: this.fb.control<number | null>(null, Validators.required),
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(150)]),
    description: this.fb.nonNullable.control(''),
    price: this.fb.control<number | null>(null, [Validators.required, Validators.min(0), Validators.max(10_000_000)]),
    isAvailable: this.fb.nonNullable.control(true),
  });

  ngOnInit() {
    this.categoryApi.list().subscribe((c) => this.categories.set(c));

    if (this.id) {
      this.api.get(this.id).subscribe((p) => {
        this.form.patchValue({
          categoryId: p.categoryId,
          name: p.name,
          description: p.description ?? '',
          price: p.price,
          isAvailable: p.isAvailable,
        });
        this.rawPrice.set(p.price);
        this.preview.set(fileUrl(p.image));
      });
    }

    // Dengerin perubahan price dari form untuk update rawPrice
    this.form.controls.price.valueChanges.subscribe(val => this.rawPrice.set(val));
  }

  invalid(name: string) {
    const c = this.form.get(name)!;
    return c.touched && c.invalid;
  }

  // --- Helper Harga (Format Rupiah) ---
  priceDisplay() {
    const val = this.rawPrice();
    return val ? new Intl.NumberFormat('id-ID').format(val) : '';
  }

  onPriceInput(event: Event) {
    const input = event.target as HTMLInputElement;
    // Hanya ambil angka
    const numericString = input.value.replace(/\D/g, '');
    const numValue = numericString ? parseInt(numericString, 10) : null;
    
    // Update form control (biar validasi jalan)
    this.form.controls.price.setValue(numValue);
    
    // Update tampilan (dengan titik)
    input.value = numValue ? new Intl.NumberFormat('id-ID').format(numValue) : '';
  }

  // --- File Upload ---
  pickFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0] ?? null;
    if (!file) return;

    // Validasi file size (maks 2MB)
    if (file.size > 2 * 1024 * 1024) {
      this.toast.error('Ukuran foto maksimal 2 MB.');
      return;
    }

    this.file = file;
    this.preview.set(URL.createObjectURL(file));
  }

  removeImage() {
    this.file = null;
    this.preview.set(null);
    // Reset input file value biar bisa upload file yang sama dua kali
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  // --- Toggle Switch ---
  toggleAvailability() {
    const current = this.form.controls.isAvailable.value;
    this.form.controls.isAvailable.setValue(!current);
  }

  // --- Submit ---
  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const data = new FormData();
    data.append('CategoryId', String(v.categoryId));
    data.append('Name', v.name);
    data.append('Description', v.description);
    data.append('Price', String(v.price));
    data.append('IsAvailable', String(v.isAvailable));
    
    if (this.file) data.append('Image', this.file);

    this.saving.set(true);
    this.errors.set([]);

    const request = this.id ? this.api.update(this.id, data) : this.api.create(data);

    request.subscribe({
      next: () => {
        this.toast.success(this.id ? 'Produk berhasil diubah.' : 'Produk berhasil ditambahkan.');
        this.router.navigateByUrl('/admin/products');
      },
      error: (err) => {
        this.errors.set(errorMessages(err));
        this.saving.set(false);
      },
    });
  }

  // --- Computed ---
  selectedCategory = () => {
    const catId = this.form.controls.categoryId.value;
    return this.categories().find(c => c.id === catId) || null;
  }
}