import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DeviceStatus, DeviceToken, DevicesService } from '../devices.service';

@Component({
  selector: 'app-device-detail',
  templateUrl: './device-detail.component.html',
  styleUrls: ['../list/device-list.component.less', './device-detail.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent, NzEmptyModule],
})
export class DeviceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly devicesService = inject(DevicesService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly guid = this.route.snapshot.paramMap.get('guid') ?? '';
  protected loading = false;
  protected device?: Device;
  protected tokens: DeviceToken[] = [];

  protected readonly tokenStatusTag: STColumnTag = {
    1: { text: '启用', color: 'green' },
    0: { text: '禁用', color: 'red' },
  };

  protected readonly tokenColumns: STColumn<DeviceToken>[] = [
    { title: '凭证名称', index: 'name', render: 'tokenNameRender', width: 240 },
    { title: '凭证前缀', index: 'tokenPrefix', render: 'tokenPrefixRender', width: 160 },
    { title: '状态', index: 'status', type: 'tag', tag: this.tokenStatusTag, width: 100 },
    { title: '过期时间', index: 'expiresAt', render: 'expiresAtRender', width: 180 },
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
      width: 100,
      buttons: [
        {
          icon: 'check-circle',
          iif: (item) => item.status === 0,
          click: (item) => this.enableToken(item),
          pop: {
            title: '启用后设备可继续使用该凭证接入，确认继续？',
            okType: 'primary',
            icon: 'check-circle',
          },
        },
        {
          icon: 'stop',
          className: 'text-error',
          iif: (item) => item.status !== 0,
          click: (item) => this.disableToken(item),
          pop: {
            title: '禁用后设备将无法使用该凭证接入，确认继续？',
            okType: 'danger',
            icon: 'stop',
          },
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    if (!this.guid) {
      this.message.error('设备 GUID 不存在');
      return;
    }

    this.loading = true;
    this.devicesService
      .get(this.guid)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (detail) => {
          this.device = this.normalizeDevice(detail.device);
          this.tokens = (detail.tokens ?? []).map((token) => this.normalizeToken(token));
        },
        error: () => this.message.error('设备详情加载失败'),
      });
  }

  protected back(): void {
    this.router.navigate(['/devices/list']);
  }

  protected edit(): void {
    if (!this.guid) return;
    this.router.navigate(['/devices/edit', this.guid]);
  }

  protected metrics(): void {
    if (!this.guid) return;
    this.router.navigate(['/sessions/list'], { queryParams: { deviceGuid: this.guid } });
  }

  protected tokenManage(): void {
    this.router.navigate(['/devices/tokens']);
  }

  protected title(): string {
    return this.device?.name || this.device?.hostname || this.guid || '设备详情';
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

  protected statusText(status: DeviceStatus | undefined): string {
    const map: Record<string, string> = {
      0: '已注册',
      1: '已注册',
      2: '在线',
      3: '离线',
      4: '已禁用',
      registered: '已注册',
      online: '在线',
      offline: '离线',
      disabled: '已禁用',
    };
    return map[String(status)] ?? '未知';
  }

  protected statusClass(status: DeviceStatus | undefined): string {
    const map: Record<string, string> = {
      0: 'status-registered',
      1: 'status-registered',
      2: 'status-online',
      3: 'status-offline',
      4: 'status-unknown',
      registered: 'status-registered',
      online: 'status-online',
      offline: 'status-offline',
      disabled: 'status-unknown',
    };
    return map[String(status)] ?? 'status-unknown';
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

  protected enabledTokenCount(): number {
    return this.tokens.filter((token) => token.status === 1).length;
  }

  protected formatTags(value: string | undefined): string[] {
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

  protected disableToken(token: DeviceToken): void {
    const deviceGuid = token.deviceGuid || this.guid;
    this.devicesService.disableToken(deviceGuid, token.guid).subscribe({
      next: () => {
        this.message.success('凭证已禁用');
        this.load();
      },
      error: () => this.message.error('凭证禁用失败'),
    });
  }

  protected enableToken(token: DeviceToken): void {
    const deviceGuid = token.deviceGuid || this.guid;
    this.devicesService.enableToken(deviceGuid, token.guid).subscribe({
      next: () => {
        this.message.success('凭证已启用');
        this.load();
      },
      error: () => this.message.error('凭证启用失败'),
    });
  }

  private normalizeDevice(item: Device): Device {
    return {
      ...item,
      name: this.firstText(item.alias, item.name, item.sncode, item.deviceId, item.device_id, item.hostname, item.guid),
      hostname: this.firstText(item.hostname, item.remark),
      ip: this.firstText(item.sourceIp, item.source_ip, item.ip),
      sourceIp: this.firstText(item.sourceIp, item.source_ip, item.ip),
      hostIp: this.firstText(item.hostIp, item.host_ip, item.privateIp, item.private_ip),
      deviceId: this.firstText(item.deviceId, item.device_id),
      deviceType: this.firstText(item.deviceType, item.device_type),
      sshPort: this.firstNumber(item.sshPort, item.ssh_port),
      webPort: this.firstNumber(item.webPort, item.web_port),
      webDomain: this.firstText(item.webDomain, item.web_domain),
      osVersion: this.firstText(item.osVersion, item.os_version),
      kernel: this.firstText(item.kernel, item.kernelVersion, item.kernel_version),
      privateIp: this.firstText(item.privateIp, item.private_ip, item.hostIp, item.host_ip),
      clientVersion: this.firstText(item.clientVersion, item.client_version, item.clientVersion, item.client_version),
      lastHeartbeatAt: this.firstNumber(item.lastHeartbeatAt, item.last_heartbeat_at, item.lastSeenTime, item.last_seen_time),
      lastMetricAt: this.firstNumber(item.lastMetricAt, item.last_metric_at),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private normalizeToken(token: DeviceToken): DeviceToken {
    return {
      ...token,
      tokenPrefix: this.firstText(token.tokenPrefix, token.token_prefix),
      lastUsedAt: this.firstNumber(token.lastUsedAt, token.last_used_at),
      expiresAt: this.firstNumber(token.expiresAt, token.expireTime, token.expire_time),
      createTime: this.firstNumber(token.createTime, token.create_time),
      updateTime: this.firstNumber(token.updateTime, token.update_time),
    };
  }

  private firstText(...values: Array<string | undefined>): string {
    return values.find((value) => value !== undefined && value !== '') ?? '';
  }

  private firstNumber(...values: Array<number | undefined>): number {
    return values.find((value) => value !== undefined && value !== null) ?? 0;
  }
}
