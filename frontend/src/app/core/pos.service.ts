import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from './config';
import { CheckoutPayload, CheckoutResult, PosCategory, PosProduct } from './models';

@Injectable({ providedIn: 'root' })
export class PosService {
  private http = inject(HttpClient);
  private url = `${API_URL}/pos`;

  menu() {
    return this.http.get<{ categories: PosCategory[]; products: PosProduct[] }>(`${this.url}/menu`);
  }

  checkout(payload: CheckoutPayload) {
    return this.http.post<CheckoutResult>(`${this.url}/checkout`, payload);
  }
}