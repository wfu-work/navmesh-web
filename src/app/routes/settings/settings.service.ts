import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface NavMeshProfile {
  id: number;
  username: string;
  status: number;
  createTime: number;
  updateTime: number;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class NavMeshSettingsService {
  private readonly http = inject(HttpClient);

  list(): Observable<unknown> {
    return this.http.get('/settings/list');
  }

  save(key: string, value: unknown): Observable<unknown> {
    return this.http.put(`/settings/${key}`, { value });
  }

  profile(): Observable<NavMeshProfile> {
    return this.http.get<NavMeshProfile>('/navmesh-auth/profile');
  }

  changePassword(payload: ChangePasswordPayload): Observable<boolean> {
    return this.http.put<boolean>('/navmesh-auth/password', payload);
  }
}
