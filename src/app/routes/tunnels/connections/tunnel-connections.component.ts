import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { STColumn } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DevicesService } from '../../devices/devices.service';
import { TunnelConnection, TunnelsService } from '../tunnels.service';

@Component({
  selector: 'app-tunnel-connections',
  templateUrl: './tunnel-connections.component.html',
  styleUrls: ['../tunnels.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class TunnelConnectionsComponent implements OnInit {
  private readonly tunnelsService = inject(TunnelsService);
  private readonly devicesService = inject(DevicesService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  protected data: TunnelConnection[] = [];
  protected devices: Device[] = [];
  protected loading = false;

  protected readonly columns: STColumn<TunnelConnection>[] = [
    { title: '设备', index: 'deviceGuid', render: 'deviceRender', fixed: 'left', width: 280 },
    { title: '远端地址', index: 'remoteAddr', render: 'remoteRender', width: 220 },
    { title: '协议', index: 'protocol', render: 'protocolRender', width: 100 },
    {
      title: '连接时间',
      index: 'connectedTime',
      type: 'date',
      dateFormat: 'yyyy-MM-dd HH:mm:ss',
      width: 180,
    },
    {
      title: '最后活动',
      index: 'lastActiveTime',
      type: 'date',
      dateFormat: 'yyyy-MM-dd HH:mm:ss',
      width: 180,
    },
    { title: '在线时长', index: 'connectedTime', render: 'durationRender', width: 140 },
    {
      title: '操作',
      fixed: 'right',
      width: 130,
      buttons: [
        {
          icon: 'history',
          click: (item) => this.openSessions(item.deviceGuid),
        },
        {
          icon: 'desktop',
          click: (item) => this.openDevice(item.deviceGuid),
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    forkJoin({
      connections: this.tunnelsService.connections(),
      devices: this.devicesService.list({ page: 1, size: 500 }),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ connections, devices }) => {
          this.data = connections ?? [];
          this.devices = devices.data ?? [];
        },
        error: () => this.message.error('在线连接加载失败'),
      });
  }

  protected openSessions(deviceGuid: string): void {
    this.router.navigate(['/sessions/list'], { queryParams: { deviceGuid } });
  }

  protected openDevice(deviceGuid: string): void {
    this.router.navigate(['/devices/detail', deviceGuid]);
  }

  protected deviceName(item: TunnelConnection): string {
    const device = this.devices.find((row) => row.guid === item.deviceGuid);
    return device?.alias || item.alias || device?.sncode || item.sncode || device?.hostname || device?.name || item.deviceGuid;
  }

  protected deviceMeta(item: TunnelConnection): string {
    const device = this.devices.find((row) => row.guid === item.deviceGuid);
    return device?.hostname || device?.sourceIp || device?.hostIp || item.sncode || item.deviceGuid;
  }

  protected activeAge(item: TunnelConnection): string {
    return this.formatDuration(Date.now() - Number(item.lastActiveTime || 0));
  }

  protected connectionAge(item: TunnelConnection): string {
    return this.formatDuration(Date.now() - Number(item.connectedTime || 0));
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
}
