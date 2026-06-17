import { Injectable, NgZone, inject } from '@angular/core';
import { DA_SERVICE_TOKEN } from '@delon/auth';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

import { ReconnectWebSocket } from './reconnect-websocket';

export interface EventNotification<T = unknown> {
  type: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class EventWebSocketService {
  private readonly tokenService = inject(DA_SERVICE_TOKEN);
  private readonly zone = inject(NgZone);
  private readonly client = new ReconnectWebSocket<EventNotification>({
    url: () => this.buildUrl(),
    parse: (data) => JSON.parse(data) as EventNotification,
  });

  readonly notifications$: Observable<EventNotification> = new Observable((subscriber) =>
    this.client.messages$.subscribe({
      next: (notification) => {
        if (notification?.type) {
          this.zone.run(() => subscriber.next(notification));
        }
      },
      error: (error) => this.zone.run(() => subscriber.error(error)),
      complete: () => this.zone.run(() => subscriber.complete()),
    }),
  );

  connect(): void {
    this.client.connect();
  }

  disconnect(): void {
    this.client.disconnect();
  }

  private buildUrl(): string {
    const token = String(this.tokenService.get()?.token || '');
    if (!token) return '';
    const baseUrl = this.normalizeBaseUrl(environment.api?.baseUrl || '/api');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const base =
      baseUrl.startsWith('http://') || baseUrl.startsWith('https://')
        ? baseUrl.replace(/^http/, 'ws')
        : `${protocol}//${window.location.host}${baseUrl}`;
    return `${base}/events/ws?token=${encodeURIComponent(token)}`;
  }

  private normalizeBaseUrl(baseUrl: string): string {
    const trimmed = baseUrl.trim() || '/api';
    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
  }
}
