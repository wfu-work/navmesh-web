import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface SSHEntrypoint {
  id: number;
  ip: string;
  deviceGuid: string;
  device_guid?: string;
  status: number;
  createTime: number;
  create_time?: number;
  updateTime: number;
  update_time?: number;
}

export interface SaveSSHEntrypointPayload {
  ip: string;
  deviceGuid?: string;
  status: number;
}

export interface SSHAlias {
  id: number;
  deviceGuid: string;
  device_guid?: string;
  alias: string;
  domain: string;
  entrypointIp: string;
  entrypoint_ip?: string;
  status: number;
  createTime: number;
  create_time?: number;
  updateTime: number;
  update_time?: number;
}

export interface SaveSSHAliasPayload {
  deviceGuid: string;
  alias: string;
  domain: string;
  entrypointIp: string;
  status: number;
}

@Injectable({ providedIn: 'root' })
export class SSHService {
  private readonly http = inject(HttpClient);

  listEntrypoints(): Observable<SSHEntrypoint[]> {
    return this.http.get<SSHEntrypoint[]>('/ssh-entrypoints/list');
  }

  saveEntrypoint(payload: SaveSSHEntrypointPayload): Observable<SSHEntrypoint> {
    return this.http.post<SSHEntrypoint>('/ssh-entrypoints', payload);
  }

  listAliases(): Observable<SSHAlias[]> {
    return this.http.get<SSHAlias[]>('/ssh-aliases/list');
  }

  saveAlias(payload: SaveSSHAliasPayload): Observable<SSHAlias> {
    return this.http.post<SSHAlias>('/ssh-aliases', payload);
  }

  disableAlias(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`/ssh-aliases/${id}`);
  }
}
