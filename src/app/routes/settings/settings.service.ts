import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface NavMeshProfile {
  id: number;
  username: string;
  name?: string;
  avatar?: string;
  status: number;
  createTime: number;
  create_time?: number;
  updateTime: number;
  update_time?: number;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export interface NavMeshSetting {
  key: string;
  value: string;
  createTime: number;
  create_time?: number;
  updateTime: number;
  update_time?: number;
}

export interface RetentionCleanupResult {
  auditLogs: number;
  httpAccessLogs: number;
  tunnelSessions: number;
  deviceHeartbeats: number;
  deviceConnections: number;
}

@Injectable({ providedIn: 'root' })
export class NavMeshSettingsService {
  private readonly http = inject(HttpClient);

  list(): Observable<NavMeshSetting[]> {
    return this.http.get<NavMeshSetting[]>('/settings/list');
  }

  save(key: string, value: string): Observable<NavMeshSetting> {
    return this.http.put<NavMeshSetting>(`/settings/${key}`, { value });
  }

  cleanupRetention(): Observable<RetentionCleanupResult> {
    return this.http.post<RetentionCleanupResult>('/maintenance/retention-cleanup', {});
  }

  profile(): Observable<NavMeshProfile> {
    return this.http.get<NavMeshProfile>('/user');
  }

  changePassword(payload: ChangePasswordPayload): Observable<boolean> {
    return this.http.put<boolean>('/navmesh-auth/password', payload);
  }
}
