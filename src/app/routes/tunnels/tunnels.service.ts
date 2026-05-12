import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface TunnelConnection {
  deviceGuid: string;
  sncode: string;
  alias: string;
  remoteAddr: string;
  connectedTime: number;
  lastActiveTime: number;
}

@Injectable({ providedIn: 'root' })
export class TunnelsService {
  private readonly http = inject(HttpClient);

  connections(): Observable<TunnelConnection[]> {
    return this.http.get<TunnelConnection[]>('/tunnel/connections');
  }
}
