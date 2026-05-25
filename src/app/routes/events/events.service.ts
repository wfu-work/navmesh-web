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
  source: string;
  eventType?: string;
  level: string;
  title: string;
  message: string;
  status: EventStatus;
  payload: string;
  occurredAt: number;
  closedAt: number;
  createTime: number;
  updateTime: number;
}

export function isOpenEventStatus(status: EventStatus | undefined): boolean {
  return String(status) === '1';
}

export function isClosedEventStatus(status: EventStatus | undefined): boolean {
  return String(status) === '0' || String(status) === '2';
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
