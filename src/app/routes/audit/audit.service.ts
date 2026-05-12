import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PageEntity } from '@shared';
import { Observable } from 'rxjs';

export interface AuditQuery {
  actor?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  page?: number;
  size?: number;
}

export interface AuditLog {
  id: number;
  actor: string;
  action: string;
  resource: string;
  resourceId: string;
  resource_id?: string;
  message: string;
  sourceIp: string;
  source_ip?: string;
  createTime: number;
  create_time?: number;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);

  list(params?: AuditQuery): Observable<PageEntity<AuditLog>> {
    return this.http.get<PageEntity<AuditLog>>('/audit-logs/list', {
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
