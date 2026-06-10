import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PageEntity } from '@shared';
import { Observable } from 'rxjs';

export interface MappingQuery {
  keyword?: string;
  content?: string;
  deviceGuid?: string;
  deviceGuids?: string;
  status?: string | number;
  page?: number;
  size?: number;
}

export interface PortMapping {
  id: number;
  guid: string;
  deviceGuid: string;
  device_guid?: string;
  name: string;
  publicHost: string;
  public_host?: string;
  targetHost: string;
  target_host?: string;
  targetPort: number;
  target_port?: number;
  protocol: string;
  isCustomDomain: boolean;
  is_custom_domain?: boolean;
  status: number;
  createTime: number;
  create_time?: number;
  updateTime: number;
  update_time?: number;
}

export interface SavePortMappingPayload {
  guid?: string;
  deviceGuid: string;
  name: string;
  publicHost: string;
  targetHost: string;
  targetPort: number;
  protocol: string;
  isCustomDomain: boolean;
  status: number;
}

export interface AccessLogQuery {
  mappingGuid?: string;
  host?: string;
  deviceGuid?: string;
  method?: string;
  path?: string;
  statusCode?: string | number;
  minDurationMs?: string | number;
  minTunnelOpenMs?: string | number;
  minUpstreamMs?: string | number;
  minFirstByteMs?: string | number;
  reusedConn?: string | boolean;
  hasError?: string | boolean;
  page?: number;
  size?: number;
}

export interface HTTPAccessLog {
  id: number;
  mappingGuid: string;
  mapping_guid?: string;
  deviceGuid: string;
  device_guid?: string;
  host: string;
  method: string;
  path: string;
  sourceIp: string;
  source_ip?: string;
  statusCode: number;
  status_code?: number;
  durationMs: number;
  duration_ms?: number;
  tunnelOpenMs: number;
  tunnel_open_ms?: number;
  upstreamMs: number;
  upstream_ms?: number;
  firstByteMs: number;
  first_byte_ms?: number;
  reusedConn: boolean;
  reused_conn?: boolean;
  bytesIn: number;
  bytes_in?: number;
  bytesOut: number;
  bytes_out?: number;
  errorMessage: string;
  error_message?: string;
  createTime: number;
  create_time?: number;
}

@Injectable({ providedIn: 'root' })
export class HttpAccessService {
  private readonly http = inject(HttpClient);

  list(params?: MappingQuery): Observable<PageEntity<PortMapping>> {
    return this.http.get<PageEntity<PortMapping>>('/port-mappings/list', {
      params: this.cleanParams(params),
    });
  }

  save(payload: SavePortMappingPayload): Observable<PortMapping> {
    return this.http.post<PortMapping>('/port-mappings', payload);
  }

  disable(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/port-mappings/${guid}`);
  }

  accessLogs(params?: AccessLogQuery): Observable<PageEntity<HTTPAccessLog>> {
    return this.http.get<PageEntity<HTTPAccessLog>>('/http-access-logs/list', {
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
