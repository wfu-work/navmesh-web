import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';
import { PanelComponent } from 'src/app/shared/components/panel/panel.component';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DeviceTrafficDay, DevicesService } from '../devices/devices.service';
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
  protected trafficDays: DeviceTrafficDay[] = [];
  protected trafficWindow = '7d';
  protected readonly trafficWindowOptions: TrafficWindowOption[] = [
    { value: '1d', label: '今日', days: 1 },
    { value: '7d', label: '近 7 天', days: 7 },
    { value: '30d', label: '近 30 天', days: 30 },
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
      trafficDaily: this.devicesService.trafficDaily({ days: 30 }),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ devices, mappings, events, accessLogs, trafficDaily }) => {
          this.devices = devices.data ?? [];
          this.mappings = mappings.data ?? [];
          this.events = events.data ?? [];
          this.accessLogs = accessLogs.data ?? [];
          this.trafficDays = (trafficDaily.items ?? []).map((item) => this.normalizeTrafficDay(item));
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
    return this.filteredTrafficDays().reduce(
      (summary, item) => {
        summary.inbound += this.trafficRX(item);
        summary.outbound += this.trafficTX(item);
        summary.total = summary.inbound + summary.outbound;
        return summary;
      },
      { inbound: 0, outbound: 0, total: 0 },
    );
  }

  protected trafficDistribution(): TrafficDistributionBucket[] {
    const windowOption = this.selectedTrafficWindow();
    const bucketCount = windowOption.days;
    const today = this.startOfLocalDay(Date.now());
    const start = today - (bucketCount - 1) * this.dayMs();
    const buckets = Array.from({ length: bucketCount }, (_, index) => ({
      label: this.formatDayLabel(start + index * this.dayMs(), bucketCount),
      inbound: 0,
      outbound: 0,
      index,
    }));

    this.filteredTrafficDays().forEach((item) => {
      const index = Math.round((this.dayTime(item.day) - start) / this.dayMs());
      if (index < 0 || index >= buckets.length) return;
      buckets[index].inbound += this.trafficRX(item);
      buckets[index].outbound += this.trafficTX(item);
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
        title: '4G 流量',
        content:
          traffic.total > 0
            ? `${this.trafficWindowLabel()}累计 ${this.formatBytes(traffic.total)}，接收 ${this.formatBytes(traffic.inbound)}，发送 ${this.formatBytes(traffic.outbound)}。`
            : `${this.trafficWindowLabel()}暂未统计到 4G 卡流量，请确认客户端版本已支持网卡采集并能识别蜂窝网卡。`,
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

  private filteredTrafficDays(): DeviceTrafficDay[] {
    const option = this.selectedTrafficWindow();
    const today = this.startOfLocalDay(Date.now());
    const start = today - (option.days - 1) * this.dayMs();
    const end = today + this.dayMs();
    return this.trafficDays.filter((item) => {
      const time = this.dayTime(item.day);
      return time >= start && time < end;
    });
  }

  private selectedTrafficWindow(): TrafficWindowOption {
    return this.trafficWindowOptions.find((item) => item.value === this.trafficWindow) ?? this.trafficWindowOptions[0];
  }

  private statusCode(item: HTTPAccessLog): number {
    return Number(item.statusCode ?? item.status_code ?? 0);
  }

  private normalizeTrafficDay(item: DeviceTrafficDay): DeviceTrafficDay {
    return {
      ...item,
      deviceGuid: item.deviceGuid ?? item.device_guid ?? '',
      rxBytes: Number(item.rxBytes ?? item.rx_bytes ?? 0),
      txBytes: Number(item.txBytes ?? item.tx_bytes ?? 0),
      totalBytes: Number(item.totalBytes ?? item.total_bytes ?? 0),
      sampleCount: Number(item.sampleCount ?? item.sample_count ?? 0),
      resetCount: Number(item.resetCount ?? item.reset_count ?? 0),
      firstSeenTime: Number(item.firstSeenTime ?? item.first_seen_time ?? 0),
      lastSeenTime: Number(item.lastSeenTime ?? item.last_seen_time ?? 0),
      createTime: Number(item.createTime ?? item.create_time ?? 0),
      updateTime: Number(item.updateTime ?? item.update_time ?? 0),
    };
  }

  private trafficRX(item: DeviceTrafficDay): number {
    return Number(item.rxBytes ?? item.rx_bytes ?? 0);
  }

  private trafficTX(item: DeviceTrafficDay): number {
    return Number(item.txBytes ?? item.tx_bytes ?? 0);
  }

  private dayTime(day: string): number {
    const [year, month, date] = day.split('-').map((item) => Number(item));
    if (!year || !month || !date) return 0;
    return new Date(year, month - 1, date).getTime();
  }

  private startOfLocalDay(time: number): number {
    const date = new Date(time);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }

  private dayMs(): number {
    return 24 * 60 * 60 * 1000;
  }

  private formatDayLabel(time: number, dayCount: number): string {
    const date = new Date(time);
    return dayCount === 1 ? '今日' : `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
