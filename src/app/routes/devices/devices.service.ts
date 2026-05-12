import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PageEntity } from '@shared';
import { Observable } from 'rxjs';

export interface DeviceQuery {
  keyword?: string;
  status?: string;
  page?: number;
  size?: number;
}

export interface DeviceTokenPayload {
  deviceGuid?: string;
  name?: string;
  expiresAt?: number;
}

export interface DevicePayload {
  guid?: string;
  name: string;
  hostname: string;
  alias?: string;
  remark?: string;
  deviceType?: string;
  hostIp?: string;
  sshPort?: number;
  webPort?: number;
  webDomain?: string;
  os?: string;
  osVersion?: string;
  kernel?: string;
  arch?: string;
  ip?: string;
  privateIp?: string;
  clientVersion?: string;
  status?: DeviceStatus;
  tags?: string[];
}

export type DeviceStatus =
  | 0
  | 1
  | 2
  | 3
  | 4
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | 'registered'
  | 'online'
  | 'offline'
  | 'disabled';

export interface Device {
  guid: string;
  name: string;
  hostname: string;
  sncode?: string;
  deviceId?: string;
  device_id?: string;
  alias?: string;
  remark?: string;
  deviceType?: string;
  device_type?: string;
  hostIp?: string;
  host_ip?: string;
  sourceIp?: string;
  source_ip?: string;
  sshPort?: number;
  ssh_port?: number;
  webPort?: number;
  web_port?: number;
  webDomain?: string;
  web_domain?: string;
  os: string;
  osVersion: string;
  os_version?: string;
  kernel: string;
  kernelVersion?: string;
  kernel_version?: string;
  arch: string;
  ip: string;
  privateIp?: string;
  private_ip?: string;
  location?: string;
  country?: string;
  province?: string;
  city?: string;
  clientVersion?: string;
  client_version?: string;
  status: DeviceStatus;
  lastHeartbeatAt: number;
  last_heartbeat_at?: number;
  lastSeenTime?: number;
  last_seen_time?: number;
  lastMetricAt: number;
  last_metric_at?: number;
  tags: string;
  createTime: number;
  create_time?: number;
  updateTime: number;
  update_time?: number;
}

export interface DeviceToken {
  guid: string;
  deviceGuid?: string;
  name: string;
  tokenPrefix: string;
  token_prefix?: string;
  status: number;
  lastUsedAt: number;
  last_used_at?: number;
  expiresAt: number;
  expireTime?: number;
  expire_time?: number;
  createTime: number;
  create_time?: number;
  updateTime: number;
  update_time?: number;
}

export interface DeviceDetail {
  device: Device;
  tokens: DeviceToken[];
}

export interface DeviceTokenResult {
  guid: string;
  deviceGuid?: string;
  token?: string;
  tokenPrefix: string;
  status: number;
  expiresAt: number;
}

export interface DeviceTypeDefault {
  type: string;
  webPort: number;
  webDomain: string;
  remark: string;
}

@Injectable({ providedIn: 'root' })
export class DevicesService {
  private readonly http = inject(HttpClient);

  list(params?: DeviceQuery): Observable<PageEntity<Device>> {
    return this.http.get<PageEntity<Device>>('/devices/list', { params: { ...params } });
  }

  get(guid: string): Observable<DeviceDetail> {
    return this.http.get<DeviceDetail>(`/devices/${guid}`);
  }

  update(guid: string, payload: DevicePayload): Observable<boolean> {
    return this.http.put<boolean>(`/devices/${guid}`, payload);
  }

  delete(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/devices/${guid}`);
  }

  createToken(payload: DeviceTokenPayload): Observable<DeviceTokenResult> {
    return this.http.post<DeviceTokenResult>('/device-tokens', payload);
  }

  disableToken(deviceGuid: string, tokenGuid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/devices/${deviceGuid}/tokens/${tokenGuid}`);
  }

  rotateToken(guid: string): Observable<DeviceTokenResult> {
    return this.http.post<DeviceTokenResult>(`/device-tokens/${guid}/rotate`, {});
  }

  typeDefaults(): Observable<DeviceTypeDefault[]> {
    return this.http.get<DeviceTypeDefault[]>('/devices/types/defaults');
  }
}
