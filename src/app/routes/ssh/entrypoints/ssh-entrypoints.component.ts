import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DevicesService } from '../../devices/devices.service';
import { SSHEntrypoint, SSHService } from '../ssh.service';

@Component({
  selector: 'app-ssh-entrypoints',
  templateUrl: './ssh-entrypoints.component.html',
  styleUrls: ['./ssh-entrypoints.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class SSHEntrypointsComponent implements OnInit {
  private readonly sshService = inject(SSHService);
  private readonly devicesService = inject(DevicesService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected data: SSHEntrypoint[] = [];
  protected devices: Device[] = [];
  protected loading = false;
  protected saving = false;
  protected modalVisible = false;

  protected readonly statusTag: STColumnTag = {
    1: { text: '启用', color: 'green' },
    0: { text: '禁用', color: 'red' },
  };

  protected readonly form = this.fb.group({
    ip: ['', [Validators.required]],
    deviceGuid: [''],
    status: [1],
  });

  protected readonly columns: STColumn<SSHEntrypoint>[] = [
    { title: '入口 IP', index: 'ip', render: 'ipRender', fixed: 'left', width: 220 },
    { title: '绑定设备', index: 'deviceGuid', render: 'deviceRender', width: 260 },
    { title: '状态', index: 'status', type: 'tag', tag: this.statusTag, width: 120 },
    {
      title: '创建时间',
      index: 'createTime',
      type: 'date',
      dateFormat: 'yyyy-MM-dd HH:mm:ss',
      width: 180,
    },
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
      width: 100,
      buttons: [{ icon: 'edit', click: (item) => this.openModal(item) }],
    },
  ];

  ngOnInit(): void {
    this.loadDevices();
    this.load();
  }

  protected load(): void {
    this.loading = true;
    this.sshService
      .listEntrypoints()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          this.data = (res ?? []).map((item) => this.normalizeEntrypoint(item));
        },
        error: () => this.message.error('SSH 入口地址加载失败'),
      });
  }

  protected openModal(item?: SSHEntrypoint): void {
    this.form.reset({
      ip: item?.ip ?? '',
      deviceGuid: item?.deviceGuid ?? '',
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
      .saveEntrypoint({
        ip: value.ip.trim(),
        deviceGuid: value.deviceGuid || '',
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
          this.message.success('SSH 入口地址已保存');
          this.modalVisible = false;
          this.load();
        },
        error: () => this.message.error('SSH 入口地址保存失败'),
      });
  }

  protected deviceName(guid: string | undefined): string {
    if (!guid) return '未绑定';
    const device = this.devices.find((item) => item.guid === guid);
    return device?.alias || device?.sncode || device?.hostname || device?.guid || guid;
  }

  private loadDevices(): void {
    this.devicesService.list({ page: 1, size: 500 }).subscribe({
      next: (res) => {
        this.devices = res.data ?? [];
        this.cdr.markForCheck();
      },
    });
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
