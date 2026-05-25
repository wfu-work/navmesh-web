import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DevicesService } from '../../devices/devices.service';
import { SessionsService, TunnelSession } from '../sessions.service';

@Component({
  selector: 'app-session-list',
  templateUrl: './session-list.component.html',
  styleUrls: ['../sessions.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class SessionListComponent implements OnInit {
  private readonly sessionsService = inject(SessionsService);
  private readonly devicesService = inject(DevicesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected q = {
    page: 1,
    size: 10,
    deviceGuid: '',
    sessionType: '',
    publicHost: '',
    status: '',
  };

  protected data: TunnelSession[] = [];
  protected devices: Device[] = [];
  protected totalCount = 0;
  protected loading = false;

  protected readonly typeTag: STColumnTag = {
    ssh: { text: 'SSH', color: 'purple' },
    http: { text: 'HTTP', color: 'blue' },
    https: { text: 'HTTPS', color: 'green' },
  };

  protected readonly statusTag: STColumnTag = {
    1: { text: '进行中', color: 'green' },
    0: { text: '已结束', color: 'default' },
  };

  protected readonly columns: STColumn<TunnelSession>[] = [
    { title: '会话', index: 'guid', render: 'sessionRender', fixed: 'left', width: 260 },
    { title: '类型', index: 'sessionType', type: 'tag', tag: this.typeTag, width: 100 },
    { title: '绑定设备', index: 'deviceGuid', render: 'deviceRender', width: 260 },
    { title: '访问入口', index: 'publicHost', render: 'hostRender', width: 220 },
    { title: '来源 IP', index: 'sourceIp', width: 150, default: '-' },
    { title: '目标服务', index: 'targetHost', render: 'targetRender', width: 180 },
    { title: '状态', index: 'status', type: 'tag', tag: this.statusTag, width: 100 },
    { title: '流量', index: 'bytesIn', render: 'trafficRender', width: 150 },
    {
      title: '开始时间',
      index: 'startTime',
      type: 'date',
      dateFormat: 'yyyy-MM-dd HH:mm:ss',
      width: 180,
    },
    {
      title: '结束时间',
      index: 'endTime',
      type: 'date',
      dateFormat: 'yyyy-MM-dd HH:mm:ss',
      width: 180,
    },
    { title: '断开原因', index: 'disconnectReason', render: 'reasonRender', width: 260 },
    {
      title: '操作',
      fixed: 'right',
      width: 130,
      buttons: [
        {
          icon: 'close-circle',
          className: 'text-error',
          iif: (item) => item.status === 1,
          click: (item) => this.closeSession(item),
          pop: {
            title: '确认关闭该进行中的会话？',
            okType: 'danger',
            icon: 'close-circle',
          },
        },
        {
          icon: 'desktop',
          click: (item) => this.openDevice(item.deviceGuid),
        },
      ],
    },
  ];

  ngOnInit(): void {
    const deviceGuid = this.route.snapshot.queryParamMap.get('deviceGuid');
    if (deviceGuid) {
      this.q.deviceGuid = deviceGuid;
    }
    this.load();
  }

  protected load(): void {
    this.loading = true;
    forkJoin({
      sessions: this.sessionsService.list(this.q),
      devices: this.devicesService.list({ page: 1, size: 500 }),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ sessions, devices }) => {
          this.data = (sessions.data ?? []).map((item) => this.normalizeSession(item));
          this.totalCount = sessions.total ?? 0;
          this.devices = devices.data ?? [];
        },
        error: () => this.message.error('会话记录加载失败'),
      });
  }

  protected tableChange(event: STChange): void {
    switch (event.type) {
      case 'pi':
      case 'ps':
      case 'filter':
      case 'sort':
        this.q.page = event.pi;
        this.q.size = event.ps;
        this.load();
        break;
      default:
        break;
    }
  }

  protected search(): void {
    this.q.page = 1;
    this.load();
  }

  protected reset(): void {
    this.q = { page: 1, size: this.q.size, deviceGuid: '', sessionType: '', publicHost: '', status: '' };
    this.load();
  }

  protected openDevice(deviceGuid: string): void {
    this.router.navigate(['/devices/detail', deviceGuid]);
  }

  protected closeSession(item: TunnelSession): void {
    this.sessionsService.close(item.guid).subscribe({
      next: () => {
        this.message.success('会话已关闭');
        this.load();
      },
      error: () => this.message.error('会话关闭失败'),
    });
  }

  protected deviceName(guid: string | undefined): string {
    if (!guid) return '-';
    const device = this.devices.find((item) => item.guid === guid);
    return device?.alias || device?.sncode || device?.hostname || device?.name || device?.guid || guid;
  }

  protected sessionTitle(item: TunnelSession): string {
    return item.publicHost || `${item.targetHost || '-'}:${item.targetPort || '-'}`;
  }

  protected duration(item: TunnelSession): string {
    const end = item.endTime || Date.now();
    return this.formatDuration(Number(end) - Number(item.startTime || 0));
  }

  protected formatBytes(value: number): string {
    if (!value) return '0 B';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  protected statusText(status: number): string {
    return status === 1 ? '进行中' : '已结束';
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

  private formatDuration(ms: number): string {
    if (!Number.isFinite(ms) || ms <= 0) return '-';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds} 秒`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} 分钟`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时 ${minutes % 60} 分钟`;
    const days = Math.floor(hours / 24);
    return `${days} 天 ${hours % 24} 小时`;
  }

  private firstText(...values: Array<string | undefined>): string {
    return values.find((value) => value !== undefined && value !== '') ?? '';
  }

  private firstNumber(...values: Array<number | undefined>): number {
    return values.find((value) => value !== undefined && value !== null) ?? 0;
  }
}
