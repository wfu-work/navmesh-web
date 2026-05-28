import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';
import { PanelComponent } from 'src/app/shared/components/panel/panel.component';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DevicesService } from '../devices/devices.service';
import { HTTPAccessLog, HttpAccessService, PortMapping } from '../devices/http-access.service';
import { EventItem, EventsService, isOpenEventStatus } from '../events/events.service';
import { SessionsService, TunnelSession } from '../sessions/sessions.service';
import { TunnelConnection, TunnelsService } from '../tunnels/tunnels.service';
import { DashboardActiveRulesComponent } from './widgets/active-rules';
import { DashboardTrafficTrendComponent } from './widgets/traffic-trend';
import type { TrafficDistributionBucket } from './widgets/traffic-trend';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ...SHARED_IMPORTS,
    TitleLabelComponent,
    PanelComponent,
    DashboardTrafficTrendComponent,
    DashboardActiveRulesComponent,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly devicesService = inject(DevicesService);
  private readonly tunnelsService = inject(TunnelsService);
  private readonly httpAccessService = inject(HttpAccessService);
  private readonly sessionsService = inject(SessionsService);
  private readonly eventsService = inject(EventsService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected devices: Device[] = [];
  protected connections: TunnelConnection[] = [];
  protected mappings: PortMapping[] = [];
  protected sessions: TunnelSession[] = [];
  protected events: EventItem[] = [];
  protected accessLogs: HTTPAccessLog[] = [];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    forkJoin({
      devices: this.devicesService.list({ page: 1, size: 500 }),
      connections: this.tunnelsService.connections(),
      mappings: this.httpAccessService.list({ page: 1, size: 500 }),
      sessions: this.sessionsService.list({ page: 1, size: 100 }),
      events: this.eventsService.list({ page: 1, size: 100 }),
      accessLogs: this.httpAccessService.accessLogs({ page: 1, size: 100 }),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ devices, connections, mappings, sessions, events, accessLogs }) => {
          this.devices = devices.data ?? [];
          this.connections = connections ?? [];
          this.mappings = mappings.data ?? [];
          this.sessions = sessions.data ?? [];
          this.events = events.data ?? [];
          this.accessLogs = accessLogs.data ?? [];
        },
        error: () => this.message.error('工作台数据加载失败'),
      });
  }

  protected onlineDeviceCount(): number {
    return this.devices.filter((item) => String(item.status) === '2' || String(item.status) === 'online').length;
  }

  protected enabledMappingCount(): number {
    return this.mappings.filter((item) => item.status !== 0).length;
  }

  protected openEventCount(): number {
    return this.events.filter((item) => isOpenEventStatus(item.status)).length;
  }

  protected activeSessionCount(): number {
    return this.sessions.filter((item) => item.status === 1).length;
  }

  protected recentFailureCount(): number {
    return this.accessLogs.filter((item) => this.statusCode(item) >= 500 || item.errorMessage || item.error_message).length;
  }

  protected trafficDistribution(): TrafficDistributionBucket[] {
    const bucketCount = 8;
    const buckets = Array.from({ length: bucketCount }, (_, index) => ({
      label: '',
      inbound: 0,
      outbound: 0,
      index,
    }));
    const now = Date.now();
    const windowMs = 60 * 60 * 1000;
    const bucketMs = windowMs / bucketCount;

    buckets.forEach((bucket) => {
      const time = now - windowMs + bucket.index * bucketMs;
      bucket.label = this.formatHourMinute(time);
    });

    this.accessLogs.forEach((item) => {
      const time = this.logTime(item);
      const age = now - time;
      if (age < 0 || age > windowMs) return;
      const index = Math.min(bucketCount - 1, Math.floor((windowMs - age) / bucketMs));
      buckets[index].inbound += this.bytesIn(item);
      buckets[index].outbound += this.bytesOut(item);
    });

    return buckets;
  }

  private statusCode(item: HTTPAccessLog): number {
    return Number(item.statusCode ?? item.status_code ?? 0);
  }

  private logTime(item: HTTPAccessLog): number {
    const time = Number(item.createTime ?? item.create_time ?? 0);
    return time > 0 && time < 1000000000000 ? time * 1000 : time;
  }

  private bytesIn(item: HTTPAccessLog): number {
    return Number(item.bytesIn ?? item.bytes_in ?? 0);
  }

  private bytesOut(item: HTTPAccessLog): number {
    return Number(item.bytesOut ?? item.bytes_out ?? 0);
  }

  private formatHourMinute(time: number): string {
    const date = new Date(time);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
}
