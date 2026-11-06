import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from './config';
import { PaymentInfo } from './models';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);
  private url = `${API_URL}/payments`;

  get(orderId: number) {
    return this.http.get<PaymentInfo>(`${this.url}/${orderId}`);
  }

  status(orderId: number) {
    return this.http.get<{ status: string }>(`${this.url}/${orderId}/status`);
  }

  cancel(orderId: number) {
    return this.http.post<{ status: string }>(`${this.url}/${orderId}/cancel`, {});
  }
}