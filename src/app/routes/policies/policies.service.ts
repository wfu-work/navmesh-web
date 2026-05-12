import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PageEntity } from '@shared';
import { Observable } from 'rxjs';

export interface PolicyQuery {
  scope?: string;
  targetId?: string;
  status?: string | number;
  page?: number;
  size?: number;
}

export interface AccessPolicy {
  id: number;
  guid: string;
  name: string;
  scope: 'global' | 'device' | 'mapping' | string;
  targetId: string;
  target_id?: string;
  allowSsh: boolean;
  allow_ssh?: boolean;
  allowHttp: boolean;
  allow_http?: boolean;
  status: number;
  createTime: number;
  create_time?: number;
  updateTime: number;
  update_time?: number;
}

export interface SaveAccessPolicyPayload {
  guid?: string;
  name: string;
  scope: string;
  targetId: string;
  allowSsh: boolean;
  allowHttp: boolean;
  status: number;
}

@Injectable({ providedIn: 'root' })
export class PoliciesService {
  private readonly http = inject(HttpClient);

  list(params?: PolicyQuery): Observable<PageEntity<AccessPolicy>> {
    return this.http.get<PageEntity<AccessPolicy>>('/access-policies/list', {
      params: this.cleanParams(params),
    });
  }

  save(payload: SaveAccessPolicyPayload): Observable<AccessPolicy> {
    return this.http.post<AccessPolicy>('/access-policies', payload);
  }

  disable(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/access-policies/${guid}`);
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
