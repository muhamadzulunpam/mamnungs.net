import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  success(text: string) { this.show('success', text); }
  error(text: string) { this.show('error', text); }
  clear() { this.message.set(null); }

  private show(type: 'success' | 'error', text: string) {
    this.message.set({ type, text });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.message.set(null), 4000);
  }
}