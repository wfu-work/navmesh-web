import { ChangeDetectorRef, Directive, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';

import { Device, DeviceStatus, DevicesService } from './devices.service';

@Directive()
export abstract class DevicePageBase {
  protected readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  protected readonly devicesService = inject(DevicesService);
  protected readonly message = inject(NzMessageService);
  protected readonly cdr = inject(ChangeDetectorRef);

  protected readonly guid = this.route.snapshot.paramMap.get('guid') ?? '';
  protected loading = false;
  protected device?: Device;

  protected title(): string {
    return this.device?.name || this.device?.hostname || this.guid || '设备详情';
  }

  protected osIconSrc(item: Device): string {
    return `assets/icons/${this.osKind(item)}.svg`;
  }

  protected osLabel(item: Device): string {
    const value = this.osText(item);
    if (value.includes('ubuntu')) return 'Ubuntu';
    if (value.includes('centos')) return 'CentOS';
    if (value.includes('darwin') || value.includes('mac')) return 'Mac';
    if (value.includes('win')) return 'Windows';
    if (value.includes('debian')) return 'Debian';
    if (value.includes('linux')) return 'Linux';
    return item.os || '未知系统';
  }

  protected osClass(item: Device): string {
    return `os-${this.osKind(item)}`;
  }

  protected statusText(status: DeviceStatus | undefined): string {
    const map: Record<DeviceStatus, string> = {
      1: '已注册',
      2: '在线',
      3: '离线',
      4: '已禁用',
    };
    return status ? map[status] : '未知';
  }

  protected statusClass(status: DeviceStatus | undefined): string {
    const map: Record<DeviceStatus, string> = {
      1: 'status-registered',
      2: 'status-online',
      3: 'status-offline',
      4: 'status-disabled',
    };
    return status ? map[status] : 'status-unknown';
  }

  protected deviceStateClass(status: DeviceStatus | undefined): string {
    const map: Record<DeviceStatus, string> = {
      1: 'device-registered',
      2: 'device-online',
      3: 'device-offline',
      4: 'device-disabled',
    };
    return status ? map[status] : 'device-unknown';
  }

  protected statusLabel(status: number | undefined): string {
    return status === 0 ? '禁用' : '启用';
  }

  protected formatBytes(value: number): string {
    if (!value) return '0 B';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
    return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }

  protected formatUsage(used: number | undefined, total: number | undefined): string {
    if (!total) return '-';
    const percent = used ? ` (${Math.min(100, (used / total) * 100).toFixed(1)}%)` : '';
    return `${this.formatBytes(used || 0)} / ${this.formatBytes(total)}${percent}`;
  }

  protected formatDuration(ms: number): string {
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

  protected normalizeDevice(item: Device): Device {
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
      arch: this.firstText(item.arch),
      memoryTotal: this.firstNumber(item.memoryTotal, item.memory_total),
      memoryUsed: this.firstNumber(item.memoryUsed, item.memory_used),
      memoryFree: this.firstNumber(item.memoryFree, item.memory_free),
      diskTotal: this.firstNumber(item.diskTotal, item.disk_total),
      diskUsed: this.firstNumber(item.diskUsed, item.disk_used),
      diskFree: this.firstNumber(item.diskFree, item.disk_free),
      diskUsedPct: this.firstNumber(item.diskUsedPct, item.disk_used_pct),
      privateIp: this.firstText(item.privateIp, item.private_ip, item.hostIp, item.host_ip),
      clientVersion: this.firstText(item.clientVersion, item.client_version),
      lastHeartbeatAt: this.firstNumber(item.lastHeartbeatAt, item.last_heartbeat_at, item.lastSeenTime, item.last_seen_time),
      lastMetricAt: this.firstNumber(item.lastMetricAt, item.last_metric_at),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  protected firstText(...values: Array<string | undefined | null>): string {
    return values.find((value) => value !== undefined && value !== null && value !== '') ?? '';
  }

  protected firstNumber(...values: Array<number | undefined | null>): number {
    return values.find((value) => value !== undefined && value !== null) ?? 0;
  }

  protected firstBoolean(...values: Array<boolean | undefined | null>): boolean {
    return values.find((value) => value !== undefined && value !== null) ?? false;
  }

  protected guidPrefix(guid: string | undefined): string {
    return guid ? `${guid.slice(0, 8)}...` : '';
  }

  private osKind(item: Device): 'linux' | 'ubuntu' | 'centos' | 'windows' | 'macos' {
    const value = this.osText(item);
    if (value.includes('ubuntu')) return 'ubuntu';
    if (value.includes('centos')) return 'centos';
    if (value.includes('darwin') || value.includes('mac')) return 'macos';
    if (value.includes('win')) return 'windows';
    return 'linux';
  }

  private osText(item: Device): string {
    return [item.os, item.osVersion, item.kernel, item.arch]
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean)
      .join(' ');
  }
}
