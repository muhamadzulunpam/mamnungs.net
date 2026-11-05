import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from './config';
import { Category } from './models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);
  private url = `${API_URL}/categories`;

  list() { return this.http.get<Category[]>(this.url); }
  create(name: string) { return this.http.post<Category>(this.url, { name }); }
  update(id: number, name: string) { return this.http.put<Category>(`${this.url}/${id}`, { name }); }
  remove(id: number) { return this.http.delete<void>(`${this.url}/${id}`); }
}