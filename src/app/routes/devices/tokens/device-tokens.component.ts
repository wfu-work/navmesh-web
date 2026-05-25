import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DeviceToken, DevicesService } from '../devices.service';

@Component({
  selector: 'app-device-tokens',
  templateUrl: './device-tokens.component.html',
  styleUrls: ['../list/device-list.component.less', './device-tokens.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class DeviceTokensComponent implements OnInit {
  private readonly devicesService = inject(DevicesService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected devices: Device[] = [];
  protected tokens: DeviceToken[] = [];
  protected selectedDeviceGuid = '';
  protected loadingDevices = false;
  protected loadingTokens = false;
  protected creating = false;
  protected modalVisible = false;
  protected latestToken = '';

  protected readonly form = this.fb.group({
    name: ['manual', [Validators.required]],
    expireDays: [0, [Validators.min(0)]],
  });

  protected tokenStatusTag: STColumnTag = {
    1: { text: '启用', color: 'green' },
    0: { text: '禁用', color: 'red' },
  };

  protected columns: STColumn<DeviceToken>[] = [
    { title: '凭证名称', index: 'name', render: 'nameRender', fixed: 'left', width: 240 },
    { title: '凭证前缀', index: 'tokenPrefix', render: 'prefixRender', width: 160 },
    { title: '状态', index: 'status', type: 'tag', tag: this.tokenStatusTag, width: 120 },
    {
      title: '最后使用',
      index: 'lastUsedAt',
      render: 'lastUsedAtRender',
      width: 180,
    },
    {
      title: '过期时间',
      index: 'expiresAt',
      render: 'expiresAtRender',
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
      width: 140,
      buttons: [
        {
          icon: 'sync',
          click: (item) => this.rotateToken(item),
          pop: {
            title: '轮换后旧凭证会立即禁用，请确认已准备更新客户端 Token。',
            okType: 'primary',
            icon: 'sync',
          },
        },
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
    this.loadDevices();
  }

  protected loadDevices(): void {
    this.loadingDevices = true;
    this.devicesService
      .list({ page: 1, size: 100 })
      .pipe(
        finalize(() => {
          this.loadingDevices = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          this.devices = res.data ?? [];
          if (!this.selectedDeviceGuid && this.devices.length) {
            this.selectedDeviceGuid = this.devices[0].guid;
            this.loadTokens();
          }
        },
        error: () => this.message.error('设备加载失败'),
      });
  }

  protected deviceChange(): void {
    this.latestToken = '';
    this.loadTokens();
  }

  protected loadTokens(): void {
    if (!this.selectedDeviceGuid) {
      this.tokens = [];
      return;
    }
    this.loadingTokens = true;
    this.devicesService
      .get(this.selectedDeviceGuid)
      .pipe(
        finalize(() => {
          this.loadingTokens = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          this.tokens = (res.tokens ?? []).map((token) => this.normalizeToken(token));
        },
        error: () => this.message.error('凭证加载失败'),
      });
  }

  protected disableToken(token: DeviceToken): void {
    const deviceGuid = token.deviceGuid || this.selectedDeviceGuid;
    this.devicesService.disableToken(deviceGuid, token.guid).subscribe({
      next: () => {
        this.message.success('凭证已禁用');
        this.loadTokens();
      },
      error: () => this.message.error('凭证禁用失败'),
    });
  }

  protected enableToken(token: DeviceToken): void {
    const deviceGuid = token.deviceGuid || this.selectedDeviceGuid;
    this.devicesService.enableToken(deviceGuid, token.guid).subscribe({
      next: () => {
        this.message.success('凭证已启用');
        this.loadTokens();
      },
      error: () => this.message.error('凭证启用失败'),
    });
  }

  protected openCreate(): void {
    if (!this.selectedDeviceGuid) {
      this.message.warning('请先选择设备');
      return;
    }
    this.latestToken = '';
    this.form.reset({ name: 'manual', expireDays: 0 });
    this.modalVisible = true;
  }

  protected createToken(): void {
    if (!this.selectedDeviceGuid) {
      this.message.warning('请先选择设备');
      return;
    }
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }
    const value = this.form.getRawValue();
    this.creating = true;
    this.devicesService
      .createToken(this.selectedDeviceGuid, {
        name: value.name.trim(),
        expireTime: this.expireTime(value.expireDays),
      })
      .pipe(
        finalize(() => {
          this.creating = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          this.latestToken = res.token || '';
          this.message.success('凭证已创建，请及时复制完整 Token');
          this.loadTokens();
        },
        error: () => this.message.error('凭证创建失败'),
      });
  }

  protected rotateToken(token: DeviceToken): void {
    const deviceGuid = token.deviceGuid || this.selectedDeviceGuid;
    this.devicesService.rotateToken(deviceGuid, token.guid).subscribe({
      next: (res) => {
        this.latestToken = res.token || '';
        this.modalVisible = true;
        this.message.success('凭证已轮换，请及时复制新 Token');
        this.loadTokens();
      },
      error: () => this.message.error('凭证轮换失败'),
    });
  }

  private normalizeToken(token: DeviceToken): DeviceToken {
    return {
      ...token,
      tokenPrefix: this.firstText(token.tokenPrefix, token.token_prefix, this.guidPrefix(token.guid)),
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

  private expireTime(days: number): number {
    if (!days || days <= 0) return 0;
    return Date.now() + days * 24 * 60 * 60 * 1000;
  }

  private guidPrefix(guid: string | undefined): string {
    return guid ? `${guid.slice(0, 8)}...` : '';
  }
}
