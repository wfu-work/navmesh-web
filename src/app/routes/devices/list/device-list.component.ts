import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DeviceStatus, DeviceTypeDefault, DevicesService } from '../devices.service';

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
  private readonly route = inject(ActivatedRoute);

  q = {
    page: 1,
    size: 10,
    status: '',
    content: '',
    type: '',
  };

  protected data: Device[] = [];
  protected types: DeviceTypeDefault[] = [];
  protected totalCount = 0;
  protected loading = false;

  ngOnInit(): void {
    this.q.type = this.route.snapshot.queryParamMap.get('type') ?? '';
    this.loadTypes();
    this.getData();
  }

  protected loadTypes(): void {
    this.devicesService.typeDefaults().subscribe({
        next: (res) => {
        this.types = (res ?? []).map((item) => this.normalizeType(item));
        this.cdr.markForCheck();
      },
      error: () => this.message.error('设备类型加载失败'),
    });
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

  protected accessConfig(guid: string): void {
    this.router.navigate(['/devices/detail', guid], { queryParams: { tab: 'access' } });
  }

  protected metrics(guid: string): void {
    this.router.navigate(['/sessions/list'], { queryParams: { deviceGuid: guid } });
  }

  protected delete(guid: string): void {
    this.devicesService.delete(guid).subscribe({
      next: (r) => {
        if (r) {
          this.message.success('设备已禁用');
          this.getData();
        } else {
          this.message.error('设备禁用失败');
        }
      },
      error: () => this.message.error('设备禁用失败'),
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

  protected statusColor(status: DeviceStatus | undefined): string {
    const map: Record<string, string> = {
      0: 'gold',
      1: 'gold',
      2: 'success',
      3: 'error',
      4: 'default',
      registered: 'gold',
      online: 'success',
      offline: 'error',
      disabled: 'default',
    };
    return map[String(status)] ?? 'default';
  }

  protected activationText(status: DeviceStatus | undefined): string {
    const value = String(status);
    if (value === 'registered' || value === '1' || value === '0') return '待激活';
    if (value === 'online' || value === '2') return '已激活';
    if (value === 'offline' || value === '3') return '已激活';
    if (value === 'disabled' || value === '4') return '已禁用';
    return '未知';
  }

  protected activationColor(status: DeviceStatus | undefined): string {
    const value = String(status);
    if (value === 'registered' || value === '1' || value === '0') return 'gold';
    if (value === 'online' || value === '2') return 'success';
    if (value === 'offline' || value === '3') return 'blue';
    if (value === 'disabled' || value === '4') return 'default';
    return 'default';
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

  protected typeName(type: string | undefined): string {
    if (!type) return '-';
    const item = this.types.find((row) => this.typeValue(row) === type);
    return item?.remark || type;
  }

  protected productName(type: string | undefined): string {
    if (!type) return '-';
    const item = this.types.find((row) => this.typeValue(row) === type);
    return this.typeValue(item) || type;
  }

  protected typeValue(item: DeviceTypeDefault | undefined): string {
    return this.firstText(item?.guid, item?.type, item?.name);
  }

  protected productLink(type: string | undefined): void {
    if (!type) return;
    this.q.type = type;
    this.q.page = 1;
    this.getData();
  }

  protected reset(): void {
    this.q = { page: 1, size: this.q.size, status: '', content: '', type: '' };
    this.getData();
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

  protected pageChange(page: number): void {
    this.q.page = page;
    this.getData();
  }

  protected trackByGuid(_: number, item: Device): string {
    return item.guid;
  }

  private normalizeDevice(item: Device): Device {
    return {
      ...item,
      name: this.firstText(item.alias, item.name, item.sncode, item.hostname, item.guid),
      hostname: this.firstText(item.hostname, item.remark),
      ip: this.firstText(item.sourceIp, item.source_ip, item.ip),
      sourceIp: this.firstText(item.sourceIp, item.source_ip, item.ip),
      hostIp: this.firstText(item.hostIp, item.host_ip, item.privateIp, item.private_ip),
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
      groupGuid: this.firstText(item.groupGuid, item.group_guid),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private normalizeType(item: DeviceTypeDefault): DeviceTypeDefault {
    return {
      ...item,
      guid: this.firstText(item.guid, item.type, item.name),
      type: this.firstText(item.type, item.guid, item.name),
      name: this.firstText(item.name, item.type, item.guid),
      webPort: this.firstNumber(item.webPort, item.defaultWebPort, item.default_web_port),
      webDomain: this.firstText(item.webDomain, item.defaultDomain, item.default_domain),
      sort: this.firstNumber(item.sort),
      status: this.firstNumber(item.status),
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
