import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PageEntity } from '@shared';
import { Observable } from 'rxjs';

export interface SessionQuery {
  deviceGuid?: string;
  sessionType?: string;
  publicHost?: string;
  status?: string | number;
  page?: number;
  size?: number;
}

export interface TunnelSession {
  id: number;
  guid: string;
  deviceGuid: string;
  device_guid?: string;
  sessionType: string;
  session_type?: string;
  sourceIp: string;
  source_ip?: string;
  username: string;
  targetHost: string;
  target_host?: string;
  targetPort: number;
  target_port?: number;
  publicHost: string;
  public_host?: string;
  status: number;
  bytesIn: number;
  bytes_in?: number;
  bytesOut: number;
  bytes_out?: number;
  startTime: number;
  start_time?: number;
  endTime: number;
  end_time?: number;
  disconnectReason: string;
  disconnect_reason?: string;
  createTime: number;
  create_time?: number;
  updateTime: number;
  update_time?: number;
}

@Injectable({ providedIn: 'root' })
export class SessionsService {
  private readonly http = inject(HttpClient);

  list(params?: SessionQuery): Observable<PageEntity<TunnelSession>> {
    return this.http.get<PageEntity<TunnelSession>>('/tunnel-sessions/list', {
      params: this.cleanParams(params),
    });
  }

  private cleanParams(params?: object): Record<string, string | number | boolean> {
    const result: Record<string, string | number | boolean> = {};
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        result[key] = value as string | number | boolean;
      }
    });
    return result;
  }
}
