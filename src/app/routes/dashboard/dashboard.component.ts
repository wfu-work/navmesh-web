import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';
import { PanelComponent } from 'src/app/shared/components/panel/panel.component';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DevicesService } from '../devices/devices.service';
import { HTTPAccessLog, HttpAccessService, PortMapping } from '../devices/http-access.service';
import { EventItem, EventsService, isOpenEventStatus } from '../events/events.service';
import { DashboardActiveRulesComponent } from './widgets/active-rules';
import { DashboardAdviceComponent } from './widgets/dashboard-advice';
import type { DashboardInsight } from './widgets/dashboard-advice';
import { DashboardShortcutsComponent } from './widgets/dashboard-shortcuts';
import { DashboardTrafficTrendComponent } from './widgets/traffic-trend';
import type { TrafficDistributionBucket, TrafficWindowOption } from './widgets/traffic-trend';

interface TrafficSummary {
  inbound: number;
  outbound: number;
  total: number;
}

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
    DashboardAdviceComponent,
    DashboardShortcutsComponent,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly devicesService = inject(DevicesService);
  private readonly httpAccessService = inject(HttpAccessService);
  private readonly eventsService = inject(EventsService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected devices: Device[] = [];
  protected mappings: PortMapping[] = [];
  protected events: EventItem[] = [];
  protected accessLogs: HTTPAccessLog[] = [];
  protected trafficWindow = '24h';
  protected readonly trafficWindowOptions: TrafficWindowOption[] = [
    { value: '1h', label: '过去 1 小时', hours: 1 },
    { value: '6h', label: '过去 6 小时', hours: 6 },
    { value: '24h', label: '过去 24 小时', hours: 24 },
    { value: '7d', label: '过去 7 天', hours: 24 * 7 },
  ];
  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    forkJoin({
      devices: this.devicesService.list({ page: 1, size: 500 }),
      mappings: this.httpAccessService.list({ page: 1, size: 500 }),
      events: this.eventsService.list({ page: 1, size: 100 }),
      accessLogs: this.httpAccessService.accessLogs({ page: 1, size: 1000 }),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ devices, mappings, events, accessLogs }) => {
          this.devices = devices.data ?? [];
          this.mappings = mappings.data ?? [];
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

  protected recentFailureCount(): number {
    return this.accessLogs.filter((item) => this.statusCode(item) >= 500 || item.errorMessage || item.error_message).length;
  }

  protected trafficSummary(): TrafficSummary {
    return this.filteredAccessLogs().reduce(
      (summary, item) => {
        summary.inbound += this.bytesIn(item);
        summary.outbound += this.bytesOut(item);
        summary.total = summary.inbound + summary.outbound;
        return summary;
      },
      { inbound: 0, outbound: 0, total: 0 },
    );
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
    const windowOption = this.selectedTrafficWindow();
    const windowMs = windowOption.hours * 60 * 60 * 1000;
    const bucketMs = windowMs / bucketCount;

    buckets.forEach((bucket) => {
      const time = now - windowMs + bucket.index * bucketMs;
      bucket.label = this.formatBucketLabel(time, windowOption.hours);
    });

    this.filteredAccessLogs(now, windowMs).forEach((item) => {
      const time = this.logTime(item);
      const age = now - time;
      const index = Math.min(bucketCount - 1, Math.floor((windowMs - age) / bucketMs));
      buckets[index].inbound += this.bytesIn(item);
      buckets[index].outbound += this.bytesOut(item);
    });

    return buckets;
  }

  protected trafficWindowLabel(): string {
    return this.selectedTrafficWindow().label;
  }

  protected dashboardInsights(): DashboardInsight[] {
    const onlineDevices = this.onlineDeviceCount();
    const offlineDevices = Math.max(this.devices.length - onlineDevices, 0);
    const failures = this.recentFailureCount();
    const openEvents = this.openEventCount();
    const traffic = this.trafficSummary();
    return [
      {
        title: '设备连接',
        content:
          offlineDevices > 0
            ? `当前有 ${offlineDevices} 台设备离线，建议优先检查客户端进程、网络连通性和隧道连接状态。`
            : `当前 ${onlineDevices} 台设备保持在线，设备心跳和隧道连接处于稳定状态。`,
        tone: offlineDevices > 0 ? 'danger' : 'success',
      },
      {
        title: 'HTTP 映射',
        content:
          failures > 0
            ? `近期出现 ${failures} 条失败访问，建议查看访问日志中的 5xx、上游连接错误和目标端口。`
            : `近期未发现明显 HTTP 访问失败，映射服务可以继续保持当前配置。`,
        tone: failures > 0 ? 'danger' : 'success',
      },
      {
        title: '事件处理',
        content:
          openEvents > 0
            ? `事件中心还有 ${openEvents} 条未处理事件，建议完成确认或关闭，避免告警持续堆积。`
            : `当前暂无未处理事件，可以定期巡检访问日志和设备状态。`,
        tone: openEvents > 0 ? 'warning' : 'success',
      },
      {
        title: '流量观察',
        content:
          traffic.total > 0
            ? `${this.trafficWindowLabel()}累计 ${this.formatBytes(traffic.total)}，入站 ${this.formatBytes(traffic.inbound)}，出站 ${this.formatBytes(traffic.outbound)}。`
            : `${this.trafficWindowLabel()}暂未统计到访问流量，若设备已开放服务，请确认映射域名和访问入口。`,
        tone: traffic.total > 0 ? 'neutral' : 'warning',
      },
    ];
  }

  protected formatBytes(value: number): string {
    if (!value) return '0 B';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
    return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }

  private filteredAccessLogs(now = Date.now(), windowMs = this.selectedTrafficWindow().hours * 60 * 60 * 1000): HTTPAccessLog[] {
    return this.accessLogs.filter((item) => {
      const age = now - this.logTime(item);
      return age >= 0 && age <= windowMs;
    });
  }

  private selectedTrafficWindow(): TrafficWindowOption {
    return this.trafficWindowOptions.find((item) => item.value === this.trafficWindow) ?? this.trafficWindowOptions[0];
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

  private formatBucketLabel(time: number, hours: number): string {
    const date = new Date(time);
    if (hours > 24) {
      return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
}
