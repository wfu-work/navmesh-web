import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DeviceStatus, DeviceTypeDefault, DevicesService } from '../devices.service';

@Component({
  selector: 'app-device-edit',
  templateUrl: './device-edit.component.html',
  styleUrls: ['./device-edit.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class DeviceEditComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly devicesService = inject(DevicesService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly guid = this.route.snapshot.paramMap.get('guid') ?? 'new';
  protected loading = false;
  protected saving = false;
  protected types: DeviceTypeDefault[] = [];
  protected device?: Device;

  protected form = this.fb.group({
    sncode: ['', [Validators.required]],
    alias: ['', [Validators.required]],
    deviceType: ['', [Validators.required]],
    remark: [''],
    hostname: ['', [Validators.required]],
    hostIp: [''],
    clientVersion: [''],
    status: [1],
  });

  ngOnInit(): void {
    if (this.guid === 'new') {
      this.message.info('设备由客户端自动注册，不能手动新建');
      this.back();
      return;
    }
    this.loadTypes();
    this.load();
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

  protected load(): void {
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
        next: ({ device }) => {
          const item = this.normalizeDevice(device);
          this.device = item;
          this.form.patchValue({
            sncode: item.sncode || '',
            alias: item.alias || item.sncode || '',
            deviceType: item.deviceType || '',
            remark: item.remark || '',
            hostname: item.hostname || '',
            hostIp: item.hostIp || item.privateIp || '',
            clientVersion: item.clientVersion || '',
            status: this.normalizeStatus(item.status),
          });
          this.form.disable({ emitEvent: false });
          this.form.controls.sncode.enable({ emitEvent: false });
          this.form.controls.alias.enable({ emitEvent: false });
          this.form.controls.deviceType.enable({ emitEvent: false });
          this.form.controls.remark.enable({ emitEvent: false });
        },
        error: () => this.message.error('设备信息加载失败'),
      });
  }

  protected submit(): void {
    const editableControls = [
      this.form.controls.sncode,
      this.form.controls.alias,
      this.form.controls.deviceType,
    ];
    if (editableControls.some((control) => control.invalid)) {
      editableControls.forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }
    const value = this.form.getRawValue();
    this.saving = true;
    this.devicesService
      .update(this.guid, {
        hostname: value.hostname,
        sncode: value.sncode.trim(),
        type: value.deviceType.trim(),
        alias: value.alias.trim(),
        remark: value.remark.trim(),
      })
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.message.success('设备资料已保存，客户端重启上线后会同步使用');
          this.load();
        },
        error: () => this.message.error('设备信息保存失败'),
      });
  }

  protected back(): void {
    this.router.navigate(['/devices/list']);
  }

  protected manageGroup(): void {
    this.router.navigate(['/devices/list'], {
      queryParams: { type: this.form.controls.deviceType.value },
    });
  }

  protected manageTokens(): void {
    this.router.navigate(['/devices/config', this.guid]);
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

  protected typeValue(item: DeviceTypeDefault | undefined): string {
    return this.firstText(item?.key, item?.group_key, item?.guid, item?.type);
  }

  protected typeLabel(item: DeviceTypeDefault): string {
    return this.firstText(item.name, item.remark, this.typeValue(item));
  }

  protected typeIcon(item: DeviceTypeDefault): string {
    return this.normalizeIcon(
      this.firstText(item.icon, this.defaultTypeIcon(this.typeValue(item))),
    );
  }

  protected title(): string {
    return this.firstText(
      this.form.controls.alias.value,
      this.form.controls.sncode.value,
      this.form.controls.hostname.value,
      this.guid,
    );
  }

  protected subtitle(): string {
    return this.firstText(
      this.form.controls.remark.value,
      this.form.controls.hostname.value,
      '客户端注册设备',
    );
  }

  protected statusText(status: DeviceStatus | number): string {
    const map: Record<DeviceStatus, string> = {
      1: '已注册',
      2: '在线',
      3: '离线',
      4: '已禁用',
    };
    return map[this.normalizeStatus(status)];
  }

  protected statusClass(status: DeviceStatus | number): string {
    const map: Record<DeviceStatus, string> = {
      1: 'is-registered',
      2: 'is-online',
      3: 'is-offline',
      4: 'is-disabled',
    };
    return map[this.normalizeStatus(status)];
  }

  protected displayText(value: string | number | undefined): string {
    if (value === undefined || value === null || value === '') return '-';
    return String(value);
  }

  protected endpoint(host: string | undefined, port: number | undefined): string {
    if (host && port) return `${host}:${port}`;
    if (host) return host;
    if (port) return `:${port}`;
    return '-';
  }

  protected systemText(item: Device | undefined): string {
    if (!item) return '-';
    return [item.os, item.osVersion].filter(Boolean).join(' ') || '-';
  }

  protected kernelText(item: Device | undefined): string {
    if (!item) return '-';
    return [item.kernel, item.kernelVersion].filter(Boolean).join(' ') || '-';
  }

  protected timeText(value: number | undefined): number {
    return value ?? 0;
  }

  protected formatBytes(value: number | undefined): string {
    if (!value || value <= 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let next = value;
    let unitIndex = 0;
    while (next >= 1024 && unitIndex < units.length - 1) {
      next /= 1024;
      unitIndex += 1;
    }
    const fixed = next >= 10 || unitIndex === 0 ? 0 : 1;
    return `${next.toFixed(fixed)} ${units[unitIndex]}`;
  }

  protected usageText(used: number | undefined, total: number | undefined): string {
    if (!used || !total) return '-';
    return `${this.formatBytes(used)} / ${this.formatBytes(total)}`;
  }

  protected usagePercent(used: number | undefined, total: number | undefined): number {
    if (!used || !total) return 0;
    return Math.min(100, Math.max(0, Math.round((used / total) * 100)));
  }

  protected diskPercent(item: Device | undefined): number {
    if (!item) return 0;
    if (item.diskUsedPct !== undefined && item.diskUsedPct > 0) {
      return Math.min(100, Math.max(0, Math.round(item.diskUsedPct)));
    }
    return this.usagePercent(item.diskUsed, item.diskTotal);
  }

  private normalizeStatus(status: DeviceStatus | number): 1 | 2 | 3 | 4 {
    return status === 2 || status === 3 || status === 4 ? status : 1;
  }

  private normalizeDevice(item: Device): Device {
    return {
      ...item,
      name: this.firstText(item.name, item.alias, item.sncode, item.hostname, item.guid),
      sncode: this.firstText(item.sncode),
      alias: this.firstText(item.alias),
      remark: this.firstText(item.remark),
      deviceType: this.firstText(item.deviceType, item.device_type),
      hostIp: this.firstText(item.hostIp, item.host_ip, item.privateIp, item.private_ip),
      sourceIp: this.firstText(item.sourceIp, item.source_ip, item.ip),
      wanIp: this.firstText(item.wanIp),
      sshPort: this.firstNumber(item.sshPort, item.ssh_port),
      webPort: this.firstNumber(item.webPort, item.web_port),
      webDomain: this.firstText(item.webDomain, item.web_domain),
      osVersion: this.firstText(item.osVersion, item.os_version),
      kernelVersion: this.firstText(item.kernelVersion, item.kernel_version),
      privateIp: this.firstText(item.privateIp, item.private_ip),
      clientVersion: this.firstText(item.clientVersion, item.client_version),
      memoryTotal: this.firstNumber(item.memoryTotal, item.memory_total),
      memoryUsed: this.firstNumber(item.memoryUsed, item.memory_used),
      memoryFree: this.firstNumber(item.memoryFree, item.memory_free),
      diskTotal: this.firstNumber(item.diskTotal, item.disk_total),
      diskUsed: this.firstNumber(item.diskUsed, item.disk_used),
      diskFree: this.firstNumber(item.diskFree, item.disk_free),
      diskUsedPct: this.firstNumber(item.diskUsedPct, item.disk_used_pct),
      lastHeartbeatAt: this.firstNumber(
        item.lastHeartbeatAt,
        item.last_heartbeat_at,
        item.lastSeenTime,
        item.last_seen_time,
      ),
      lastMetricAt: this.firstNumber(item.lastMetricAt, item.last_metric_at),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private normalizeType(item: DeviceTypeDefault): DeviceTypeDefault {
    const key = this.firstText(item.key, item.group_key, item.guid, item.type);
    return {
      ...item,
      key,
      guid: this.firstText(item.guid, key),
      type: this.firstText(item.type, key),
      name: this.firstText(item.name, key),
      icon: this.normalizeIcon(this.firstText(item.icon, this.defaultTypeIcon(key))),
      remark: this.firstText(item.remark),
    };
  }

  private firstText(...values: Array<string | undefined>): string {
    return values.find((value) => value !== undefined && value !== '') ?? '';
  }

  private firstNumber(...values: Array<number | undefined>): number {
    return values.find((value) => value !== undefined && value !== null) ?? 0;
  }

  private defaultTypeIcon(type: string | undefined): string {
    const value = String(type || '').toLowerCase();
    if (value.includes('ssh')) return 'code';
    if (value.includes('radar')) return 'radar-chart';
    if (value.includes('rain')) return 'cloud';
    if (value.includes('data')) return 'database';
    if (value.includes('dic')) return 'experiment';
    if (value.includes('ppp')) return 'deployment-unit';
    if (value.includes('sag')) return 'control';
    return 'appstore';
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

  private normalizeIcon(icon: string | undefined): string {
    if (icon === 'terminal') return 'code';
    return icon || 'appstore';
  }
}
