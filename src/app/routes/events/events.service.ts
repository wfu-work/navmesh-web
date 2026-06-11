import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PageEntity } from '@shared';
import { Observable } from 'rxjs';

export interface EventQuery {
  keyword?: string;
  level?: string;
  source?: string;
  status?: string;
  deviceGuid?: string;
  startAt?: string;
  endAt?: string;
  page?: number;
  size?: number;
  pageSize?: number;
  limit?: number;
}

export type EventStatus = 0 | 1 | 2 | '0' | '1' | '2';

export interface EventItem {
  guid: string;
  deviceGuid: string;
  device_guid?: string;
  deviceSncode?: string;
  device_sncode?: string;
  source: string;
  eventType?: string;
  event_type?: string;
  level: string;
  title: string;
  message: string;
  status: EventStatus;
  payload: string;
  payload_json?: string;
  occurredAt: number;
  occurred_at?: number;
  closedAt: number;
  closed_at?: number;
  createTime: number;
  create_time?: number;
  updateTime: number;
  update_time?: number;
}

export function eventDisplayTitle(item: Partial<EventItem>): string {
  const type = firstEventText(item.eventType, item.event_type, item.source).toLowerCase();
  const title = firstEventText(item.title).toLowerCase();
  const key = title || type;

  if (type === 'device_offline' || key.includes('device tunnel offline')) return '设备离线提醒';
  if (type === 'disk_usage_high') return '磁盘空间不足';
  if (type === 'session_rejected' && key.includes('ssh')) return 'SSH 会话拒绝';
  if (type === 'session_rejected' && key.includes('http')) return 'HTTP 会话拒绝';
  if (type === 'session_rejected') return '访问会话拒绝';
  if (type === 'open_tcp_failed' && key.includes('ssh')) return 'SSH 目标连接失败';
  if (type === 'open_tcp_failed' && key.includes('http')) return 'HTTP 映射连接失败';
  if (type === 'open_tcp_failed') return '目标服务连接失败';
  if (type === 'auth') return '认证事件';
  if (type === 'mapping') return 'HTTP 映射事件';
  if (type === 'tunnel') return '隧道连接事件';
  if (type === 'device') return '设备事件';

  return firstEventText(item.title, item.eventType, item.event_type, item.source, '事件');
}

export function eventDisplayMessage(item: Partial<EventItem>): string {
  const type = firstEventText(item.eventType, item.event_type, item.source).toLowerCase();
  const title = firstEventText(item.title).toLowerCase();
  const message = firstEventText(item.message);

  if (type === 'device_offline' || title.includes('device tunnel offline')) {
    return '设备隧道已断开，请检查设备网络或 navmesh-client 运行状态。';
  }
  if (type === 'disk_usage_high') {
    return message || '设备磁盘使用率已达到告警阈值，请及时清理空间。';
  }
  if (type === 'open_tcp_failed' && title.includes('http')) {
    return 'HTTP 映射无法连接目标服务，请检查设备在线状态和本地 Web 服务端口。';
  }
  if (type === 'open_tcp_failed' && title.includes('ssh')) {
    return 'SSH 隧道无法连接目标端口，请检查设备在线状态和本机 SSH 服务。';
  }
  if (type === 'session_rejected') {
    return message || '访问会话被策略或并发限制拒绝，请检查访问策略和会话限制。';
  }

  return message || firstEventText(item.title, item.eventType, item.event_type, '事件已记录。');
}

export function eventSourceText(source: string | undefined): string {
  const map: Record<string, string> = {
    device: '设备',
    device_offline: '设备离线',
    disk_usage_high: '磁盘告警',
    ssh: 'SSH',
    http: 'HTTP',
    tunnel: '隧道',
    auth: '认证',
    mapping: '映射',
    session_rejected: '会话拒绝',
    open_tcp_failed: '连接失败',
    client_upgrade: '客户端升级',
    vpn_restart: 'VPN 重启',
  };
  return map[String(source)] ?? (source || '-');
}

export function eventSourceColor(source: string | undefined): string {
  const map: Record<string, string> = {
    device: 'green',
    device_offline: 'orange',
    disk_usage_high: 'gold',
    ssh: 'purple',
    http: 'blue',
    tunnel: 'cyan',
    auth: 'gold',
    mapping: 'geekblue',
    session_rejected: 'gold',
    open_tcp_failed: 'red',
    client_upgrade: 'processing',
    vpn_restart: 'purple',
  };
  return map[String(source)] ?? 'default';
}

export function isOpenEventStatus(status: EventStatus | undefined): boolean {
  return String(status) === '1';
}

export function isClosedEventStatus(status: EventStatus | undefined): boolean {
  return String(status) === '0' || String(status) === '2';
}

function firstEventText(...values: Array<string | undefined>): string {
  return values.find((value) => value !== undefined && value !== '') ?? '';
}

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);

  list(params?: EventQuery): Observable<PageEntity<EventItem>> {
    const { deviceGuid, pageSize, limit, ...rest } = params ?? {};
    const requestParams: Record<string, string | number | boolean> = {};
    Object.entries(rest).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        requestParams[key] = value;
      }
    });
    if (pageSize && !requestParams['size']) {
      requestParams['size'] = pageSize;
    }
    if (limit && !requestParams['size']) {
      requestParams['size'] = limit;
    }
    if (deviceGuid) {
      requestParams['deviceGuid'] = deviceGuid;
    }

    return this.http.get<PageEntity<EventItem>>('/events/list', { params: requestParams });
  }

  ack(guid: string): Observable<boolean> {
    return this.http.post<boolean>(`/events/${guid}/ack`, {});
  }

  close(guid: string): Observable<boolean> {
    return this.http.post<boolean>(`/events/${guid}/close`, {});
  }
}
