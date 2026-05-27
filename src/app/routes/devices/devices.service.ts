import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PageEntity } from '@shared';
import { Observable } from 'rxjs';

export interface DeviceQuery {
  keyword?: string;
  content?: string;
  status?: string;
  type?: string;
  groupGuid?: string;
  tag?: string;
  page?: number;
  size?: number;
}

export interface DeviceTokenPayload {
  name?: string;
  expireTime?: number;
}

export interface DevicePayload {
  guid?: string;
  name?: string;
  sncode?: string;
  hostname: string;
  alias?: string;
  remark?: string;
  deviceType?: string;
  type?: string;
  hostIp?: string;
  sourceIp?: string;
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
  groupGuid?: string;
  group_guid?: string;
}

export type DeviceStatus = 1 | 2 | 3 | 4;

export interface Device {
  guid: string;
  name: string;
  hostname: string;
  sncode?: string;
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
  groupGuid?: string;
  group_guid?: string;
  createTime: number;
  create_time?: number;
  updateTime: number;
  update_time?: number;
}

export interface DeviceToken {
  guid: string;
  deviceGuid?: string;
  token?: string;
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
  token: string;
  item: DeviceToken;
}

export interface DeviceTypeDefault {
  guid?: string;
  key?: string;
  group_key?: string;
  type?: string;
  name?: string;
  defaultWebPort?: number;
  default_web_port?: number;
  webPort?: number;
  defaultDomain?: string;
  default_domain?: string;
  webDomain?: string;
  sort?: number;
  remark: string;
  status?: number;
  createTime?: number;
  create_time?: number;
  updateTime?: number;
  update_time?: number;
}

export interface DeviceGroupQuery {
  keyword?: string;
  status?: string | number;
  all?: boolean | string;
  page?: number;
  size?: number;
}

export interface DeviceGroup {
  id: number;
  guid: string;
  key?: string;
  group_key?: string;
  name: string;
  description?: string;
  defaultWebPort?: number;
  default_web_port?: number;
  defaultDomain?: string;
  default_domain?: string;
  sort?: number;
  remark?: string;
  status: number;
  createTime: number;
  create_time?: number;
  updateTime: number;
  update_time?: number;
}

export interface SaveDeviceGroupPayload {
  guid?: string;
  key?: string;
  name: string;
  description?: string;
  defaultWebPort?: number;
  defaultDomain?: string;
  sort?: number;
  remark?: string;
  status: number;
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

  update(guid: string, payload: DevicePayload): Observable<Device> {
    return this.http.put<Device>(`/devices/${guid}`, payload);
  }

  delete(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/devices/${guid}`);
  }

  enable(guid: string): Observable<boolean> {
    return this.http.post<boolean>(`/devices/${guid}/enable`, {});
  }

  disable(guid: string): Observable<boolean> {
    return this.http.post<boolean>(`/devices/${guid}/disable`, {});
  }

  createToken(deviceGuid: string, payload: DeviceTokenPayload): Observable<DeviceTokenResult> {
    return this.http.post<DeviceTokenResult>(`/devices/${deviceGuid}/tokens`, payload);
  }

  disableToken(deviceGuid: string, tokenGuid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/devices/${deviceGuid}/tokens/${tokenGuid}`);
  }

  enableToken(deviceGuid: string, tokenGuid: string): Observable<boolean> {
    return this.http.post<boolean>(`/devices/${deviceGuid}/tokens/${tokenGuid}/enable`, {});
  }

  rotateToken(deviceGuid: string, tokenGuid: string): Observable<DeviceTokenResult> {
    return this.http.post<DeviceTokenResult>(`/devices/${deviceGuid}/tokens/${tokenGuid}/rotate`, {});
  }

  typeDefaults(): Observable<DeviceTypeDefault[]> {
    return this.http.get<DeviceTypeDefault[]>('/devices/types/defaults');
  }

  groups(params?: DeviceGroupQuery): Observable<PageEntity<DeviceGroup>> {
    return this.http.get<PageEntity<DeviceGroup>>('/device-groups/list', {
      params: this.cleanParams(params),
    });
  }

  saveGroup(payload: SaveDeviceGroupPayload): Observable<DeviceGroup> {
    return this.http.post<DeviceGroup>('/device-groups', payload);
  }

  disableGroup(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/device-groups/${guid}`);
  }

  assignGroup(deviceGuid: string, groupGuid: string): Observable<boolean> {
    return this.http.put<boolean>(`/devices/${deviceGuid}/group`, { groupGuid });
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
