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

import { DeviceStatus, DeviceTypeDefault, DevicesService } from '../devices.service';

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
          this.form.patchValue({
            sncode: device.sncode,
            alias: device.alias || device.sncode,
            deviceType: device.deviceType || device.device_type || '',
            remark: device.remark || '',
            hostname: device.hostname,
            hostIp: device.hostIp || device.host_ip || device.privateIp || device.private_ip || '',
            clientVersion: device.clientVersion,
            status: this.normalizeStatus(device.status),
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
    const editableControls = [this.form.controls.sncode, this.form.controls.alias, this.form.controls.deviceType];
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
    this.router.navigate(['/devices/list'], { queryParams: { type: this.form.controls.deviceType.value } });
  }

  protected manageTokens(): void {
    this.router.navigate(['/devices/config', this.guid]);
  }

  protected typeValue(item: DeviceTypeDefault | undefined): string {
    return this.firstText(item?.key, item?.group_key, item?.guid, item?.type);
  }

  protected typeLabel(item: DeviceTypeDefault): string {
    return this.firstText(item.name, item.remark, this.typeValue(item));
  }

  protected typeIcon(item: DeviceTypeDefault): string {
    return this.normalizeIcon(this.firstText(item.icon, this.defaultTypeIcon(this.typeValue(item))));
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
    return this.firstText(this.form.controls.remark.value, this.form.controls.hostname.value, '客户端注册设备');
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

  private normalizeStatus(status: DeviceStatus | number): 1 | 2 | 3 | 4 {
    return status === 2 || status === 3 || status === 4 ? status : 1;
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

  private normalizeIcon(icon: string | undefined): string {
    if (icon === 'terminal') return 'code';
    return icon || 'appstore';
  }
}
