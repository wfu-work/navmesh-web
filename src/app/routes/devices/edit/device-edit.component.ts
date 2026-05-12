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

import { DevicePayload, DevicesService } from '../devices.service';

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

  protected form = this.fb.group({
    sncode: ['', [Validators.required]],
    alias: ['', [Validators.required]],
    deviceId: [''],
    deviceType: ['', [Validators.required]],
    remark: [''],
    hostname: ['', [Validators.required]],
    hostIp: [''],
    clientVersion: [''],
    sshPort: [22],
    webPort: [0],
    webDomain: [''],
    status: [1],
  });

  ngOnInit(): void {
    if (this.guid === 'new') {
      this.message.info('设备由客户端自动注册，不能手动新建');
      this.back();
      return;
    }
    this.load();
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
            deviceId: device.deviceId || device.device_id || '',
            deviceType: device.deviceType || device.device_type || '',
            remark: device.remark || '',
            hostname: device.hostname,
            hostIp: device.hostIp || device.host_ip || device.privateIp || device.private_ip || '',
            clientVersion: device.clientVersion,
            sshPort: device.sshPort || device.ssh_port || 22,
            webPort: device.webPort || device.web_port || 0,
            webDomain: device.webDomain || device.web_domain || '',
            status: this.normalizeStatus(device.status),
          });
        },
        error: () => this.message.error('设备信息加载失败'),
      });
  }

  protected submit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }

    const payload = this.toPayload();
    this.saving = true;
    this.devicesService
      .update(this.guid, payload)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.message.success('设备已保存');
          this.back();
        },
        error: () => this.message.error('设备保存失败'),
      });
  }

  protected back(): void {
    this.router.navigate(['/devices/list']);
  }

  private toPayload(): DevicePayload {
    const value = this.form.getRawValue();
    return {
      name: value.alias.trim(),
      sncode: value.sncode.trim(),
      alias: value.alias.trim(),
      deviceId: value.deviceId.trim(),
      deviceType: value.deviceType.trim(),
      type: value.deviceType.trim(),
      remark: value.remark.trim(),
      hostname: value.hostname.trim(),
      hostIp: value.hostIp.trim(),
      clientVersion: value.clientVersion.trim(),
      sshPort: value.sshPort,
      webPort: value.webPort,
      webDomain: value.webDomain.trim(),
      status: this.normalizeStatus(value.status),
    };
  }

  private normalizeStatus(status: DevicePayload['status'] | number): 1 | 2 | 3 | 4 {
    const map: Record<string, 1 | 2 | 3 | 4> = {
      registered: 1,
      online: 2,
      offline: 3,
      disabled: 4,
    };
    const normalized = map[String(status)] ?? Number(status);
    return normalized === 2 || normalized === 3 || normalized === 4 ? normalized : 1;
  }
}
