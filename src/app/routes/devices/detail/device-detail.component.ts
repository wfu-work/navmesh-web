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
import { DeviceStatus, DeviceTypeDefault } from '../devices.service';
import { DevicePageBase } from '../device-page-base';
import { HTTPAccessLog, HttpAccessService } from '../http-access.service';

interface TrafficWindowOption {
  label: string;
  value: string;
  duration: number;
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
  private readonly httpAccessService = inject(HttpAccessService);
  private readonly sessionsService = inject(SessionsService);
  private readonly tunnelsService = inject(TunnelsService);

  protected sessions: TunnelSession[] = [];
  protected accessLogs: HTTPAccessLog[] = [];
  protected connections: TunnelConnection[] = [];
  protected types: DeviceTypeDefault[] = [];
  protected trafficWindow = '24h';

  protected readonly trafficWindowOptions: TrafficWindowOption[] = [
    { label: '过去 1 小时', value: '1h', duration: 60 * 60 * 1000, buckets: 6 },
    { label: '过去 6 小时', value: '6h', duration: 6 * 60 * 60 * 1000, buckets: 6 },
    { label: '过去 24 小时', value: '24h', duration: 24 * 60 * 60 * 1000, buckets: 8 },
    { label: '过去 7 天', value: '7d', duration: 7 * 24 * 60 * 60 * 1000, buckets: 7 },
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
      accessLogs: this.httpAccessService.accessLogs({ page: 1, size: 100, deviceGuid: this.guid }),
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
        next: ({ detail, sessions, accessLogs, connections, types }) => {
          this.device = this.normalizeDevice(detail.device);
          this.types = (types ?? []).map((item) => this.normalizeType(item));
          this.sessions = (sessions.data ?? []).map((item) => this.normalizeSession(item));
          this.accessLogs = (accessLogs.data ?? []).map((item) => this.normalizeLog(item));
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

  protected totalTraffic(): number {
    return this.sessions.reduce((sum, item) => sum + item.bytesIn + item.bytesOut, 0);
  }

  protected summaryItems(item: { status?: DeviceStatus }): MetricSummaryItem[] {
    return [
      { label: '在线状态', value: this.statusText(item.status), tone: this.statusTone(item.status) },
      { label: '当前连接', value: this.activeConnectionCount(), tone: this.activeConnectionCount() ? 'primary' : 'muted' },
      { label: '进行中会话', value: this.activeSessionCount(), tone: this.activeSessionCount() ? 'success' : 'muted' },
      { label: '累计流量', value: this.formatBytes(this.totalTraffic()), tone: this.totalTraffic() ? 'primary' : 'muted' },
    ];
  }

  protected inboundTraffic(): number {
    return this.trafficPoints().reduce((sum, item) => sum + item.inbound, 0);
  }

  protected outboundTraffic(): number {
    return this.trafficPoints().reduce((sum, item) => sum + item.outbound, 0);
  }

  protected errorLogCount(): number {
    const minTime = Date.now() - this.trafficWindowOption().duration;
    return this.accessLogs.filter((item) => {
      const time = this.logTime(item);
      return time >= minTime && (item.statusCode >= 500 || item.errorMessage);
    }).length;
  }

  protected recentSessions(): TunnelSession[] {
    return this.sessions.slice(0, 6);
  }

  protected trafficTotal(): number {
    return this.inboundTraffic() + this.outboundTraffic();
  }

  protected trafficRecordCount(): number {
    return this.trafficPoints().length;
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
    const now = Date.now();
    const bucketMs = option.duration / buckets.length;
    this.trafficPoints().forEach((item) => {
      const age = now - item.time;
      if (age < 0 || age > option.duration) return;
      const index = Math.min(buckets.length - 1, Math.floor((option.duration - age) / bucketMs));
      buckets[index].inbound += item.inbound;
      buckets[index].outbound += item.outbound;
      buckets[index].count += 1;
    });
    const max = Math.max(...buckets.flatMap((item) => [item.inbound, item.outbound]), 1);
    return buckets.map((item, index) => {
      const inboundHeight = item.inbound > 0 ? Math.max(6, Math.round((item.inbound / max) * 100)) : 0;
      const outboundHeight = item.outbound > 0 ? Math.max(6, Math.round((item.outbound / max) * 100)) : 0;
      return {
        label: this.trafficBucketLabel(index, option, now, bucketMs),
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

  private normalizeLog(item: HTTPAccessLog): HTTPAccessLog {
    return {
      ...item,
      mappingGuid: this.firstText(item.mappingGuid, item.mapping_guid),
      deviceGuid: this.firstText(item.deviceGuid, item.device_guid),
      sourceIp: this.firstText(item.sourceIp, item.source_ip),
      statusCode: this.firstNumber(item.statusCode, item.status_code),
      durationMs: this.firstNumber(item.durationMs, item.duration_ms),
      tunnelOpenMs: this.firstNumber(item.tunnelOpenMs, item.tunnel_open_ms),
      upstreamMs: this.firstNumber(item.upstreamMs, item.upstream_ms),
      firstByteMs: this.firstNumber(item.firstByteMs, item.first_byte_ms),
      reusedConn: this.firstBoolean(item.reusedConn, item.reused_conn),
      bytesIn: this.firstNumber(item.bytesIn, item.bytes_in),
      bytesOut: this.firstNumber(item.bytesOut, item.bytes_out),
      errorMessage: this.firstText(item.errorMessage, item.error_message),
      createTime: this.firstNumber(item.createTime, item.create_time),
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

  private trafficSessions(): TunnelSession[] {
    const minTime = Date.now() - this.trafficWindowOption().duration;
    return this.sessions.filter((item) => {
      const time = this.sessionTime(item);
      return time >= minTime;
    });
  }

  private trafficLogs(): HTTPAccessLog[] {
    const minTime = Date.now() - this.trafficWindowOption().duration;
    return this.accessLogs.filter((item) => this.logTime(item) >= minTime);
  }

  private trafficPoints(): TrafficPoint[] {
    return [
      ...this.trafficSessions().map((item) => ({
        time: this.sessionTime(item),
        inbound: item.bytesIn,
        outbound: item.bytesOut,
      })),
      ...this.trafficLogs().map((item) => ({
        time: this.logTime(item),
        inbound: item.bytesIn,
        outbound: item.bytesOut,
      })),
    ];
  }

  private trafficWindowOption(): TrafficWindowOption {
    return this.trafficWindowOptions.find((item) => item.value === this.trafficWindow) ?? this.trafficWindowOptions[2];
  }

  private sessionTime(item: TunnelSession): number {
    return this.normalizeTimestamp(item.startTime || item.createTime || 0);
  }

  private logTime(item: HTTPAccessLog): number {
    return this.normalizeTimestamp(item.createTime || 0);
  }

  private normalizeTimestamp(time: number): number {
    return time > 0 && time < 1000000000000 ? time * 1000 : time;
  }

  private trafficBucketLabel(index: number, option: TrafficWindowOption, now: number, bucketMs: number): string {
    const bucketStart = now - option.duration + index * bucketMs;
    const date = new Date(bucketStart);
    if (option.value === '7d') {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
    if (option.value === '1h') {
      return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    return `${date.getHours()}h`;
  }
}
