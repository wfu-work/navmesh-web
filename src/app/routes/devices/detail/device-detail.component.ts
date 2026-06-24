import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { SHARED_IMPORTS } from '@shared';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import {
  MetricSummaryComponent,
  MetricSummaryItem,
  MetricSummaryTone,
} from 'src/app/shared/components/metric-summary/metric-summary.component';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { SessionsService, TunnelSession } from '../../sessions/sessions.service';
import { TunnelConnection, TunnelsService } from '../../tunnels/tunnels.service';
import { Device, DeviceStatus, DeviceTrafficDay, DeviceTypeDefault } from '../devices.service';
import { DevicePageBase } from '../device-page-base';

interface TrafficWindowOption {
  label: string;
  value: string;
  days: number;
  buckets: number;
}

interface TrafficBucket {
  label: string;
  inbound: number;
  outbound: number;
  total: number;
  count: number;
  inboundHeight: number;
  outboundHeight: number;
}

interface TrafficPoint {
  time: number;
  inbound: number;
  outbound: number;
}

@Component({
  selector: 'app-device-detail',
  templateUrl: './device-detail.component.html',
  styleUrls: ['../list/device-list.component.less', './device-detail.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent, NzEmptyModule, MetricSummaryComponent],
})
export class DeviceDetailComponent extends DevicePageBase implements OnInit {
  private readonly sessionsService = inject(SessionsService);
  private readonly tunnelsService = inject(TunnelsService);

  protected sessions: TunnelSession[] = [];
  protected trafficDays: DeviceTrafficDay[] = [];
  protected connections: TunnelConnection[] = [];
  protected types: DeviceTypeDefault[] = [];
  protected trafficWindow = '7d';

  protected readonly trafficWindowOptions: TrafficWindowOption[] = [
    { label: '今日', value: '1d', days: 1, buckets: 1 },
    { label: '近 7 天', value: '7d', days: 7, buckets: 7 },
    { label: '近 30 天', value: '30d', days: 30, buckets: 30 },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    if (!this.guid) {
      this.message.error('设备标识不存在');
      return;
    }

    this.loading = true;
    forkJoin({
      detail: this.devicesService.get(this.guid),
      sessions: this.sessionsService.list({ page: 1, size: 100, deviceGuid: this.guid }),
      trafficDaily: this.devicesService.deviceTrafficDaily(this.guid, { days: 30 }),
      connections: this.tunnelsService.connections(),
      types: this.devicesService.typeDefaults().pipe(catchError(() => of([] as DeviceTypeDefault[]))),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ detail, sessions, trafficDaily, connections, types }) => {
          this.device = this.normalizeDevice(detail.device);
          this.types = (types ?? []).map((item) => this.normalizeType(item));
          this.sessions = (sessions.data ?? []).map((item) => this.normalizeSession(item));
          this.trafficDays = (trafficDaily.items ?? []).map((item) => this.normalizeTrafficDay(item));
          this.connections = (connections ?? []).filter((item) => item.deviceGuid === this.guid);
        },
        error: () => this.message.error('设备详情加载失败'),
      });
  }

  protected edit(): void {
    if (!this.guid) return;
    this.router.navigate(['/devices/edit', this.guid]);
  }

  protected metrics(): void {
    if (!this.guid) return;
    this.router.navigate(['/sessions/list'], { queryParams: { deviceGuid: this.guid } });
  }

  protected activeConnectionCount(): number {
    return this.connections.length;
  }

  protected activeSessionCount(): number {
    return this.sessions.filter((item) => item.status === 1).length;
  }

  protected todayTraffic(): number {
    return this.trafficPointsForDays(1).reduce((sum, item) => sum + item.inbound + item.outbound, 0);
  }

  protected summaryItems(item: Device): MetricSummaryItem[] {
    const networkType = String(this.firstText(item.networkType, item.network_type)).trim().toLowerCase();
    const signalItem =
      networkType === 'ethernet'
        ? { label: '链路类型', value: this.networkLabel(item), tone: 'primary' as MetricSummaryTone }
        : { label: '信号强度', value: this.signalText(item), tone: this.signalPercent(item) ? 'success' as MetricSummaryTone : 'muted' as MetricSummaryTone };
    return [
      { label: '在线状态', value: this.statusText(item.status), tone: this.statusTone(item.status) },
      { label: '当前连接', value: this.activeConnectionCount(), tone: this.activeConnectionCount() ? 'primary' : 'muted' },
      signalItem,
      { label: '实时速率', value: this.rateText(item), tone: this.rateText(item) !== '-' ? 'primary' : 'muted' },
      { label: '今日 4G', value: this.formatBytes(this.todayTraffic()), tone: this.todayTraffic() ? 'primary' : 'muted' },
    ];
  }

  protected inboundTraffic(): number {
    return this.trafficPoints().reduce((sum, item) => sum + item.inbound, 0);
  }

  protected outboundTraffic(): number {
    return this.trafficPoints().reduce((sum, item) => sum + item.outbound, 0);
  }

  protected trafficResetCount(): number {
    return this.trafficDaysInWindow().reduce((sum, item) => sum + this.firstNumber(item.resetCount, item.reset_count), 0);
  }

  protected recentSessions(): TunnelSession[] {
    return this.sessions.slice(0, 6);
  }

  protected trafficTotal(): number {
    return this.inboundTraffic() + this.outboundTraffic();
  }

  protected trafficRecordCount(): number {
    return this.trafficDaysInWindow().reduce((sum, item) => sum + this.firstNumber(item.sampleCount, item.sample_count), 0);
  }

  protected trafficWindowLabel(): string {
    return this.trafficWindowOption().label;
  }

  protected peakTrafficBucket(): TrafficBucket | undefined {
    return this.trafficBars().filter((item) => item.total > 0).reduce<TrafficBucket | undefined>((peak, item) => {
      if (!peak || item.total > peak.total) return item;
      return peak;
    }, undefined);
  }

  protected hasTrafficData(): boolean {
    return this.trafficBars().some((item) => item.total > 0);
  }

  protected trafficBars(): TrafficBucket[] {
    const option = this.trafficWindowOption();
    const buckets = Array.from({ length: option.buckets }, () => ({ inbound: 0, outbound: 0, count: 0 }));
    const today = this.startOfLocalDay(Date.now());
    const start = today - (option.buckets - 1) * this.dayMs();
    this.trafficPoints().forEach((item) => {
      const index = Math.round((item.time - start) / this.dayMs());
      if (index < 0 || index >= buckets.length) return;
      buckets[index].inbound += item.inbound;
      buckets[index].outbound += item.outbound;
      buckets[index].count += 1;
    });
    const max = Math.max(...buckets.flatMap((item) => [item.inbound, item.outbound]), 1);
    return buckets.map((item, index) => {
      const inboundHeight = item.inbound > 0 ? Math.max(6, Math.round((item.inbound / max) * 100)) : 0;
      const outboundHeight = item.outbound > 0 ? Math.max(6, Math.round((item.outbound / max) * 100)) : 0;
      return {
        label: this.trafficBucketLabel(index, option, start),
        inbound: item.inbound,
        outbound: item.outbound,
        total: item.inbound + item.outbound,
        count: item.count,
        inboundHeight,
        outboundHeight,
      };
    });
  }

  protected activationText(status: DeviceStatus | undefined): string {
    const map: Record<DeviceStatus, string> = {
      1: '已注册，等待设备使用独立凭证上线',
      2: '已激活并在线',
      3: '已激活，当前离线',
      4: '设备已禁用',
    };
    return status ? map[status] : '未知';
  }

  protected typeName(type: string | undefined): string {
    const value = this.firstText(type);
    if (!value) return '-';
    const item = this.types.find((row) => this.typeValue(row) === value);
    return item?.name || this.fallbackTypeName(value);
  }

  protected displayText(value: string | number | undefined | null): string {
    const text = `${value ?? ''}`.trim();
    return text || '-';
  }

  protected endpoint(host: string | undefined, port: number | undefined): string {
    const value = this.firstText(host);
    if (!value) return '-';
    return port && port > 0 ? `${value}:${port}` : value;
  }

  protected systemText(item: Device): string {
    return [item.os, item.osVersion].filter(Boolean).join(' ') || '-';
  }

  protected kernelText(item: Device): string {
    return this.firstText(item.kernel, item.kernelVersion, item.kernel_version, '-');
  }

  protected displayBytes(value: number | undefined): string {
    return value && value > 0 ? this.formatBytes(value) : '-';
  }

  protected usageText(used: number | undefined, total: number | undefined): string {
    if (!total || total <= 0) return '-';
    return `${this.formatBytes(used || 0)} / ${this.formatBytes(total)}`;
  }

  protected usagePercent(used: number | undefined, total: number | undefined): number {
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round(((used || 0) / total) * 100)));
  }

  protected diskPercent(item: Device): number {
    if (item.diskUsedPct !== undefined && item.diskUsedPct >= 0) {
      return Math.min(100, Math.max(0, Math.round(item.diskUsedPct)));
    }
    return this.usagePercent(item.diskUsed, item.diskTotal);
  }

  private statusTone(status: DeviceStatus | undefined): MetricSummaryTone {
    const map: Record<string, MetricSummaryTone> = {
      1: 'warning',
      2: 'success',
      3: 'danger',
      4: 'muted',
    };
    return map[String(status)] ?? 'muted';
  }

  private normalizeSession(item: TunnelSession): TunnelSession {
    return {
      ...item,
      deviceGuid: this.firstText(item.deviceGuid, item.device_guid),
      sessionType: this.firstText(item.sessionType, item.session_type),
      sourceIp: this.firstText(item.sourceIp, item.source_ip),
      targetHost: this.firstText(item.targetHost, item.target_host),
      targetPort: this.firstNumber(item.targetPort, item.target_port),
      publicHost: this.firstText(item.publicHost, item.public_host),
      bytesIn: this.firstNumber(item.bytesIn, item.bytes_in),
      bytesOut: this.firstNumber(item.bytesOut, item.bytes_out),
      startTime: this.firstNumber(item.startTime, item.start_time),
      endTime: this.firstNumber(item.endTime, item.end_time),
      disconnectReason: this.firstText(item.disconnectReason, item.disconnect_reason),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private normalizeTrafficDay(item: DeviceTrafficDay): DeviceTrafficDay {
    return {
      ...item,
      deviceGuid: this.firstText(item.deviceGuid, item.device_guid),
      rxBytes: this.firstNumber(item.rxBytes, item.rx_bytes),
      txBytes: this.firstNumber(item.txBytes, item.tx_bytes),
      totalBytes: this.firstNumber(item.totalBytes, item.total_bytes),
      sampleCount: this.firstNumber(item.sampleCount, item.sample_count),
      resetCount: this.firstNumber(item.resetCount, item.reset_count),
      firstSeenTime: this.firstNumber(item.firstSeenTime, item.first_seen_time),
      lastSeenTime: this.firstNumber(item.lastSeenTime, item.last_seen_time),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private normalizeType(item: DeviceTypeDefault): DeviceTypeDefault {
    return {
      ...item,
      key: this.firstText(item.key, item.group_key, item.guid, item.type),
    };
  }

  private typeValue(item: DeviceTypeDefault | undefined): string {
    return this.firstText(item?.key, item?.group_key, item?.guid, item?.type);
  }

  private fallbackTypeName(value: string): string {
    const map: Record<string, string> = {
      rain: '北斗降雨水位',
      hipnames: '单机版',
      dic: '视觉位移',
      navmesh: '边缘客户端',
      device_software: '北斗降雨水位',
      standalone: '单机版',
      visual_displacement: '视觉位移',
      navmesh_client: '边缘客户端',
    };
    return map[value] || value;
  }

  private trafficPoints(): TrafficPoint[] {
    return this.trafficPointsForDays(this.trafficWindowOption().days);
  }

  private trafficPointsForDays(days: number): TrafficPoint[] {
    return this.trafficDaysForWindow(days).map((item) => ({
      time: this.dayTime(item.day),
      inbound: this.firstNumber(item.rxBytes, item.rx_bytes),
      outbound: this.firstNumber(item.txBytes, item.tx_bytes),
    }));
  }

  private trafficWindowOption(): TrafficWindowOption {
    return this.trafficWindowOptions.find((item) => item.value === this.trafficWindow) ?? this.trafficWindowOptions[1];
  }

  private trafficDaysInWindow(): DeviceTrafficDay[] {
    return this.trafficDaysForWindow(this.trafficWindowOption().days);
  }

  private trafficDaysForWindow(days: number): DeviceTrafficDay[] {
    const today = this.startOfLocalDay(Date.now());
    const start = today - (days - 1) * this.dayMs();
    const end = today + this.dayMs();
    return this.trafficDays.filter((item) => {
      const time = this.dayTime(item.day);
      return time >= start && time < end;
    });
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

  private trafficBucketLabel(index: number, option: TrafficWindowOption, start: number): string {
    const bucketStart = start + index * this.dayMs();
    const date = new Date(bucketStart);
    return option.value === '1d' ? '今日' : `${date.getMonth() + 1}/${date.getDate()}`;
  }
}
