import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_URL } from './config';
import { OrdersResponse, Receipt } from './models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private url = `${API_URL}/orders`;

  list(date: string, page: number) {
    const params = new HttpParams().set('date', date).set('page', page);
    return this.http.get<OrdersResponse>(this.url, { params });
  }

  get(id: number) {
    return this.http.get<Receipt>(`${this.url}/${id}`);
  }
}