import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DeviceStatus, DevicesService } from '../devices.service';

@Component({
  selector: 'app-device-list',
  templateUrl: './device-list.component.html',
  styleUrls: ['./device-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
  standalone: true,
})
export class DeviceListComponent implements OnInit {
  private readonly devicesService = inject(DevicesService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  q = {
    page: 1,
    size: 10,
    status: '',
    content: '',
    type: '',
  };

  protected data: Device[] = [];
  protected totalCount = 0;
  protected loading = false;

  protected statusTag: STColumnTag = {
    0: { text: '已注册', color: 'gold' },
    1: { text: '已注册', color: 'gold' },
    2: { text: '在线', color: 'green' },
    3: { text: '离线', color: 'red' },
    4: { text: '已禁用', color: 'default' },
    online: { text: '在线', color: 'green' },
    offline: { text: '离线', color: 'red' },
    registered: { text: '已注册', color: 'gold' },
    disabled: { text: '已禁用', color: 'default' },
  };

  columns: STColumn<Device>[] = [
    { title: '设备', index: 'name', render: 'nameRender', fixed: 'left', width: 220 },
    { title: '主机名', index: 'hostname', render: 'hostnameRender', width: 180 },
    { title: 'IP', index: 'ip', render: 'ipRender', width: 220 },
    { title: '设备类型', index: 'deviceType', width: 130, default: '-' },
    { title: '客户端版本', index: 'clientVersion', width: 130, default: '-' },
    { title: '状态', index: 'status', type: 'tag', tag: this.statusTag, width: 120 },
    {
      title: '最近心跳',
      index: 'lastHeartbeatAt',
      type: 'date',
      dateFormat: 'yyyy-MM-dd HH:mm:ss',
      width: 180,
    },
    {
      title: '创建时间',
      index: 'createTime',
      type: 'date',
      dateFormat: 'yyyy-MM-dd HH:mm:ss',
      width: 180,
    },
    {
      title: '操作',
      fixed: 'right',
      width: 180,
      buttons: [
        {
          icon: 'edit',
          click: (item) => this.edit(item.guid),
        },
        {
          icon: 'folder-view',
          click: (item) => this.detail(item.guid),
        },
        {
          icon: 'line-chart',
          click: (item) => this.metrics(item.guid),
        },
        {
          icon: 'delete',
          className: 'text-error',
          click: (item) => this.delete(item.guid),
          pop: {
            title: '删除后会禁用该设备接入，确认继续？',
            okType: 'danger',
            icon: 'delete',
          },
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.getData();
  }

  protected getData(): void {
    this.loading = true;
    this.devicesService
      .list(this.q)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          this.data = (res.data ?? []).map((item) => this.normalizeDevice(item));
          this.totalCount = res.total ?? 0;
        },
        error: () => this.message.error('设备列表加载失败'),
      });
  }

  protected edit(guid: string): void {
    this.router.navigate(['/devices/edit', guid]);
  }

  protected detail(guid: string): void {
    this.router.navigate(['/devices/detail', guid]);
  }

  protected metrics(guid: string): void {
    this.router.navigate(['/sessions/list'], { queryParams: { deviceGuid: guid } });
  }

  protected delete(guid: string): void {
    this.devicesService.delete(guid).subscribe({
      next: (r) => {
        if (r) {
          this.message.success('删除成功');
          this.getData();
        } else {
          this.message.error('删除失败');
        }
      },
      error: () => this.message.error('删除失败'),
    });
  }

  protected statusText(status: DeviceStatus | undefined): string {
    const map: Record<string, string> = {
      0: '已注册',
      1: '已注册',
      2: '在线',
      3: '离线',
      4: '已禁用',
      online: '在线',
      offline: '离线',
      registered: '已注册',
      disabled: '已禁用',
    };
    return map[String(status)] ?? (status ? String(status) : '未知');
  }

  protected deviceStateClass(status: DeviceStatus | undefined): string {
    const map: Record<string, string> = {
      0: 'device-registered',
      1: 'device-registered',
      2: 'device-online',
      3: 'device-offline',
      4: 'device-unknown',
      registered: 'device-registered',
      online: 'device-online',
      offline: 'device-offline',
      disabled: 'device-unknown',
    };
    return map[String(status)] ?? 'device-unknown';
  }

  protected osIcon(os: string | undefined): string {
    const value = String(os || '').toLowerCase();
    if (value.includes('darwin') || value.includes('mac')) return 'apple';
    if (value.includes('win')) return 'windows';
    if (value.includes('linux') || value.includes('ubuntu') || value.includes('debian') || value.includes('centos')) return 'code';
    return 'desktop';
  }

  protected osClass(os: string | undefined): string {
    const value = String(os || '').toLowerCase();
    if (value.includes('darwin') || value.includes('mac')) return 'os-macos';
    if (value.includes('win')) return 'os-windows';
    if (value.includes('linux') || value.includes('ubuntu') || value.includes('debian') || value.includes('centos')) return 'os-linux';
    return 'os-unknown';
  }

  protected formatTags(value: string): string[] {
    if (!value) return [];
    try {
      const tags = JSON.parse(value) as unknown;
      return Array.isArray(tags) ? tags.map(String) : [];
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  /**
   * 表格复选框变化回调
   *
   * @param {STChange} event
   * @memberof ListComponent
   */
  tableChange(event: STChange): void {
    switch (event.type) {
      case 'checkbox':
        break;
      case 'pi':
      case 'ps':
      case 'filter':
      case 'sort':
        this.q.page = event.pi;
        this.q.size = event.ps;
        this.getData();
        break;
      default:
        break;
    }
  }

  private normalizeDevice(item: Device): Device {
    return {
      ...item,
      name: this.firstText(item.name, item.alias, item.sncode, item.guid),
      hostname: this.firstText(item.hostname, item.remark),
      ip: this.firstText(item.ip, item.hostIp, item.host_ip, item.sourceIp, item.source_ip),
      deviceType: this.firstText(item.deviceType, item.device_type),
      sshPort: this.firstNumber(item.sshPort, item.ssh_port),
      webPort: this.firstNumber(item.webPort, item.web_port),
      webDomain: this.firstText(item.webDomain, item.web_domain),
      osVersion: this.firstText(item.osVersion, item.os_version),
      kernel: this.firstText(item.kernel, item.kernelVersion, item.kernel_version),
      privateIp: this.firstText(item.privateIp, item.private_ip),
      clientVersion: this.firstText(item.clientVersion, item.client_version, item.clientVersion, item.client_version),
      lastHeartbeatAt: this.firstNumber(item.lastHeartbeatAt, item.last_heartbeat_at, item.lastSeenTime, item.last_seen_time),
      lastMetricAt: this.firstNumber(item.lastMetricAt, item.last_metric_at),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private firstText(...values: Array<string | undefined>): string {
    return values.find((value) => value !== undefined && value !== '') ?? '';
  }

  private firstNumber(...values: Array<number | undefined>): number {
    return values.find((value) => value !== undefined && value !== null) ?? 0;
  }
}
