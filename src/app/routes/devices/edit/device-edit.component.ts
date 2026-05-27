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

import { DeviceStatus, DevicesService } from '../devices.service';

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

  protected form = this.fb.group({
    sncode: ['', [Validators.required]],
    alias: ['', [Validators.required]],
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
          this.form.disable({ emitEvent: false });
        },
        error: () => this.message.error('设备信息加载失败'),
      });
  }

  protected submit(): void {
    this.message.info('设备基础信息由客户端注册和心跳上报维护');
  }

  protected back(): void {
    this.router.navigate(['/devices/list']);
  }

  protected manageGroup(): void {
    this.router.navigate(['/devices/list'], { queryParams: { type: this.form.controls.deviceType.value } });
  }

  protected manageTokens(): void {
    this.router.navigate(['/devices/detail', this.guid], { queryParams: { tab: 'access' } });
  }

  private normalizeStatus(status: DeviceStatus | number): 1 | 2 | 3 | 4 {
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
