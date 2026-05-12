import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
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
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected devices: Device[] = [];
  protected tokens: DeviceToken[] = [];
  protected selectedDeviceGuid = '';
  protected loadingDevices = false;
  protected loadingTokens = false;

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
