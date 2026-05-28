import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { SHARED_IMPORTS } from '@shared';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { finalize, forkJoin } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { SessionsService, TunnelSession } from '../../sessions/sessions.service';
import { TunnelConnection, TunnelsService } from '../../tunnels/tunnels.service';
import { DeviceStatus } from '../devices.service';
import { DevicePageBase } from '../device-page-base';
import { HTTPAccessLog, HttpAccessService } from '../http-access.service';

@Component({
  selector: 'app-device-detail',
  templateUrl: './device-detail.component.html',
  styleUrls: ['../list/device-list.component.less', './device-detail.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent, NzEmptyModule],
})
export class DeviceDetailComponent extends DevicePageBase implements OnInit {
  private readonly httpAccessService = inject(HttpAccessService);
  private readonly sessionsService = inject(SessionsService);
  private readonly tunnelsService = inject(TunnelsService);

  protected sessions: TunnelSession[] = [];
  protected accessLogs: HTTPAccessLog[] = [];
  protected connections: TunnelConnection[] = [];

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
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ detail, sessions, accessLogs, connections }) => {
          this.device = this.normalizeDevice(detail.device);
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

  protected inboundTraffic(): number {
    return this.sessions.reduce((sum, item) => sum + item.bytesIn, 0);
  }

  protected outboundTraffic(): number {
    return this.sessions.reduce((sum, item) => sum + item.bytesOut, 0);
  }

  protected errorLogCount(): number {
    return this.accessLogs.filter((item) => item.statusCode >= 500 || item.errorMessage).length;
  }

  protected recentSessions(): TunnelSession[] {
    return this.sessions.slice(0, 6);
  }

  protected trafficBars(): Array<{ label: string; value: number; height: number }> {
    const buckets = Array.from({ length: 8 }, () => 0);
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const bucketMs = dayMs / buckets.length;
    this.sessions.forEach((item) => {
      const time = item.startTime || item.createTime || 0;
      const age = now - time;
      if (age < 0 || age > dayMs) return;
      const index = Math.min(buckets.length - 1, Math.floor((dayMs - age) / bucketMs));
      buckets[index] += item.bytesIn + item.bytesOut;
    });
    const max = Math.max(...buckets, 1);
    return buckets.map((value, index) => ({
      label: `${index * 3}h`,
      value,
      height: value > 0 ? Math.max(12, Math.round((value / max) * 100)) : 6,
    }));
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
      bytesIn: this.firstNumber(item.bytesIn, item.bytes_in),
      bytesOut: this.firstNumber(item.bytesOut, item.bytes_out),
      errorMessage: this.firstText(item.errorMessage, item.error_message),
      createTime: this.firstNumber(item.createTime, item.create_time),
    };
  }
}
