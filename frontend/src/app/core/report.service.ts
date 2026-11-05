import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_URL } from './config';
import { ReportData } from './models';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private http = inject(HttpClient);
  private url = `${API_URL}/reports`;

  get(from: string, to: string) {
    return this.http.get<ReportData>(this.url, { params: this.params(from, to) });
  }

  // Diunduh lewat HttpClient (bukan link biasa) agar token login ikut terkirim
  export(from: string, to: string) {
    return this.http.get(`${this.url}/export`, { params: this.params(from, to), responseType: 'blob' });
  }

  private params(from: string, to: string) {
    return new HttpParams().set('from', from).set('to', to);
  }
}