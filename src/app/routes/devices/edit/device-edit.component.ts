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
    name: ['', [Validators.required]],
    hostname: ['', [Validators.required]],
    os: [''],
    osVersion: [''],
    kernel: [''],
    arch: [''],
    ip: [''],
    clientVersion: [''],
    status: [0],
    tags: [''],
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
            name: device.name,
            hostname: device.hostname,
            os: device.os,
            osVersion: device.osVersion,
            kernel: device.kernel,
            arch: device.arch,
            ip: device.ip,
            clientVersion: device.clientVersion,
            status: this.normalizeStatus(device.status),
            tags: this.formatTags(device.tags).join(', '),
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
      name: value.name.trim(),
      hostname: value.hostname.trim(),
      os: value.os.trim(),
      osVersion: value.osVersion.trim(),
      kernel: value.kernel.trim(),
      arch: value.arch.trim(),
      ip: value.ip.trim(),
      clientVersion: value.clientVersion.trim(),
      status: this.normalizeStatus(value.status),
      tags: value.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
  }

  private normalizeStatus(status: DevicePayload['status'] | number): 0 | 1 | 2 {
    const map: Record<string, 0 | 1 | 2> = {
      registered: 0,
      online: 1,
      offline: 2,
    };
    const normalized = map[String(status)] ?? Number(status);
    return normalized === 1 || normalized === 2 ? normalized : 0;
  }

  private formatTags(value: string): string[] {
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
}
