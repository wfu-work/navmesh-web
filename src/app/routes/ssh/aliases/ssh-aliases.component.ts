import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DevicesService } from '../../devices/devices.service';
import { SSHAlias, SSHEntrypoint, SSHService } from '../ssh.service';

@Component({
  selector: 'app-ssh-aliases',
  templateUrl: './ssh-aliases.component.html',
  styleUrls: ['../entrypoints/ssh-entrypoints.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class SSHAliasesComponent implements OnInit {
  private readonly sshService = inject(SSHService);
  private readonly devicesService = inject(DevicesService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected data: SSHAlias[] = [];
  protected devices: Device[] = [];
  protected entrypoints: SSHEntrypoint[] = [];
  protected loading = false;
  protected saving = false;
  protected modalVisible = false;

  protected readonly statusTag: STColumnTag = {
    1: { text: '启用', color: 'green' },
    0: { text: '禁用', color: 'red' },
  };

  protected readonly form = this.fb.group({
    deviceGuid: ['', [Validators.required]],
    alias: ['', [Validators.required]],
    domain: ['', [Validators.required]],
    entrypointIp: ['', [Validators.required]],
    status: [1],
  });

  protected readonly columns: STColumn<SSHAlias>[] = [
    { title: 'SSH 域名', index: 'domain', render: 'domainRender', fixed: 'left', width: 260 },
    { title: '设备别名', index: 'alias', width: 160, default: '-' },
    { title: '绑定设备', index: 'deviceGuid', render: 'deviceRender', width: 260 },
    { title: '入口 IP', index: 'entrypointIp', render: 'entrypointRender', width: 220 },
    { title: '状态', index: 'status', type: 'tag', tag: this.statusTag, width: 100 },
    {
      title: '更新时间',
      index: 'updateTime',
      type: 'date',
      dateFormat: 'yyyy-MM-dd HH:mm:ss',
      width: 180,
    },
    {
      title: '操作',
      fixed: 'right',
      width: 140,
      buttons: [
        { icon: 'edit', click: (item) => this.openModal(item) },
        {
          icon: 'stop',
          className: 'text-error',
          iif: (item) => item.status !== 0,
          click: (item) => this.disable(item),
          pop: {
            title: '禁用后该 SSH 域名将不能继续路由到设备，确认继续？',
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
    this.loading = true;
    forkJoin({
      aliases: this.sshService.listAliases(),
      entrypoints: this.sshService.listEntrypoints(),
      devices: this.devicesService.list({ page: 1, size: 500 }),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ aliases, entrypoints, devices }) => {
          this.data = (aliases ?? []).map((item) => this.normalizeAlias(item));
          this.entrypoints = (entrypoints ?? []).map((item) => this.normalizeEntrypoint(item));
          this.devices = devices.data ?? [];
        },
        error: () => this.message.error('SSH 别名加载失败'),
      });
  }

  protected openModal(item?: SSHAlias): void {
    this.form.reset({
      deviceGuid: item?.deviceGuid ?? '',
      alias: item?.alias ?? '',
      domain: item?.domain ?? '',
      entrypointIp: item?.entrypointIp ?? '',
      status: item?.status ?? 1,
    });
    this.modalVisible = true;
  }

  protected save(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }
    const value = this.form.getRawValue();
    this.saving = true;
    this.sshService
      .saveAlias({
        deviceGuid: value.deviceGuid,
        alias: value.alias.trim(),
        domain: value.domain.trim(),
        entrypointIp: value.entrypointIp.trim(),
        status: value.status,
      })
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.message.success('SSH 别名已保存');
          this.modalVisible = false;
          this.load();
        },
        error: () => this.message.error('SSH 别名保存失败'),
      });
  }

  protected disable(item: SSHAlias): void {
    this.sshService.disableAlias(item.id).subscribe({
      next: () => {
        this.message.success('SSH 别名已禁用');
        this.load();
      },
      error: () => this.message.error('SSH 别名禁用失败'),
    });
  }

  protected deviceName(guid: string | undefined): string {
    if (!guid) return '-';
    const device = this.devices.find((item) => item.guid === guid);
    return device?.alias || device?.sncode || device?.hostname || device?.guid || guid;
  }

  protected deviceAlias(guid: string | undefined): string {
    const device = this.devices.find((item) => item.guid === guid);
    return device?.alias || device?.sncode || '';
  }

  protected fillAliasFromDevice(deviceGuid: string): void {
    const alias = this.deviceAlias(deviceGuid);
    if (alias && !this.form.controls.alias.value) {
      this.form.controls.alias.setValue(alias);
    }
  }

  private normalizeAlias(item: SSHAlias): SSHAlias {
    return {
      ...item,
      deviceGuid: this.firstText(item.deviceGuid, item.device_guid),
      entrypointIp: this.firstText(item.entrypointIp, item.entrypoint_ip),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private normalizeEntrypoint(item: SSHEntrypoint): SSHEntrypoint {
    return {
      ...item,
      deviceGuid: this.firstText(item.deviceGuid, item.device_guid),
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
