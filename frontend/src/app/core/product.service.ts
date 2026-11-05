import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_URL } from './config';
import { Paged, Product } from './models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private url = `${API_URL}/products`;

  list(opts: { search?: string; categoryId?: number | null; page: number; pageSize?: number }) {
    let params = new HttpParams().set('page', opts.page).set('pageSize', opts.pageSize ?? 10);
    if (opts.search) params = params.set('search', opts.search);
    if (opts.categoryId) params = params.set('categoryId', opts.categoryId);
    return this.http.get<Paged<Product>>(this.url, { params });
  }

  get(id: number) { return this.http.get<Product>(`${this.url}/${id}`); }
  create(data: FormData) { return this.http.post<Product>(this.url, data); }
  update(id: number, data: FormData) { return this.http.put<Product>(`${this.url}/${id}`, data); }
  toggle(id: number) { return this.http.patch<{ id: number; isAvailable: boolean }>(`${this.url}/${id}/toggle`, {}); }
  remove(id: number) { return this.http.delete<void>(`${this.url}/${id}`); }
}