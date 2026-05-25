import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';
import { PanelComponent } from 'src/app/shared/components/panel/panel.component';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DevicesService } from '../devices/devices.service';
import { EventItem, EventsService, isOpenEventStatus } from '../events/events.service';
import { HTTPAccessLog, MappingsService, PortMapping } from '../mappings/mappings.service';
import { SessionsService, TunnelSession } from '../sessions/sessions.service';
import { TunnelConnection, TunnelsService } from '../tunnels/tunnels.service';
import { DashboardActiveRulesComponent } from './widgets/active-rules';
import { DashboardTrafficTrendComponent } from './widgets/traffic-trend';

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
  private readonly mappingsService = inject(MappingsService);
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
      mappings: this.mappingsService.list({ page: 1, size: 500 }),
      sessions: this.sessionsService.list({ page: 1, size: 100 }),
      events: this.eventsService.list({ page: 1, size: 100 }),
      accessLogs: this.mappingsService.accessLogs({ page: 1, size: 100 }),
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

  protected eventTrend(): number[] {
    const buckets = Array.from({ length: 8 }, () => 0);
    const now = Date.now();
    const windowMs = 60 * 60 * 1000;
    const bucketMs = windowMs / buckets.length;
    this.events.forEach((item) => {
      const time = item.occurredAt || item.createTime || item.updateTime || 0;
      const age = now - time;
      if (age < 0 || age > windowMs) return;
      const index = Math.min(buckets.length - 1, Math.floor((windowMs - age) / bucketMs));
      buckets[index] += 1;
    });
    return buckets;
  }

  private statusCode(item: HTTPAccessLog): number {
    return Number(item.statusCode ?? item.status_code ?? 0);
  }
}
