import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { API_URL } from './config';

export type Role = 'admin' | 'kasir';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

interface LoginResponse {
  token: string;
  expiresAt: string;
  user: User;
}

const TOKEN_KEY = 'mamnungs_token';
const USER_KEY = 'mamnungs_user';
const EXP_KEY = 'mamnungs_exp';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly user = signal<User | null>(this.readUser());
  readonly isLoggedIn = computed(() => this.user() !== null);

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(`${API_URL}/auth/login`, { email, password }).pipe(
      tap((res) => {
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        localStorage.setItem(EXP_KEY, res.expiresAt);
        this.user.set(res.user);
      }),
    );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXP_KEY);
    this.user.set(null);
    this.router.navigateByUrl('/login');
  }

  homeFor(role: Role): string {
    return role === 'admin' ? '/admin/dashboard' : '/kasir';
  }

  private readUser(): User | null {
    try {
      const exp = localStorage.getItem(EXP_KEY);
      if (!exp || new Date(exp) < new Date()) return null;
      return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
    } catch {
      return null;
    }
  }
}