import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DevicesService } from '../../devices/devices.service';
import { MappingsService, PortMapping } from '../mappings.service';

@Component({
  selector: 'app-mapping-list',
  templateUrl: './mapping-list.component.html',
  styleUrls: ['../mappings.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class MappingListComponent implements OnInit {
  private readonly mappingsService = inject(MappingsService);
  private readonly devicesService = inject(DevicesService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  protected q = {
    page: 1,
    size: 10,
    keyword: '',
    status: '',
  };

  protected data: PortMapping[] = [];
  protected devices: Device[] = [];
  protected totalCount = 0;
  protected loading = false;
  protected saving = false;
  protected modalVisible = false;

  protected readonly statusTag: STColumnTag = {
    1: { text: '启用', color: 'green' },
    0: { text: '禁用', color: 'red' },
  };

  protected readonly protocolTag: STColumnTag = {
    http: { text: 'HTTP', color: 'blue' },
    https: { text: 'HTTPS', color: 'green' },
  };

  protected readonly form = this.fb.group({
    guid: [''],
    deviceGuid: ['', [Validators.required]],
    name: ['', [Validators.required]],
    publicHost: ['', [Validators.required]],
    targetHost: ['127.0.0.1', [Validators.required]],
    targetPort: [80, [Validators.required, Validators.min(1), Validators.max(65535)]],
    protocol: ['http', [Validators.required]],
    isCustomDomain: [false],
  });

  protected readonly columns: STColumn<PortMapping>[] = [
    { title: '外部 Host', index: 'publicHost', render: 'hostRender', fixed: 'left', width: 260 },
    { title: '名称', index: 'name', width: 160, default: '-' },
    { title: '绑定设备', index: 'deviceGuid', render: 'deviceRender', width: 260 },
    { title: '目标服务', index: 'targetHost', render: 'targetRender', width: 220 },
    { title: '协议', index: 'protocol', type: 'tag', tag: this.protocolTag, width: 100 },
    { title: '域名类型', index: 'isCustomDomain', render: 'domainTypeRender', width: 120 },
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
      width: 170,
      buttons: [
        { icon: 'edit', click: (item) => this.openModal(item) },
        {
          icon: 'file-search',
          click: (item) => this.openLogs(item),
        },
        {
          icon: 'stop',
          className: 'text-error',
          iif: (item) => item.status !== 0,
          click: (item) => this.disable(item),
          pop: {
            title: '禁用后该 Host 将不再转发到设备，确认继续？',
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
      mappings: this.mappingsService.list(this.q),
      devices: this.devicesService.list({ page: 1, size: 500 }),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ mappings, devices }) => {
          this.data = (mappings.data ?? []).map((item) => this.normalizeMapping(item));
          this.totalCount = mappings.total ?? 0;
          this.devices = devices.data ?? [];
        },
        error: () => this.message.error('HTTP 映射加载失败'),
      });
  }

  protected tableChange(event: STChange): void {
    switch (event.type) {
      case 'pi':
      case 'ps':
      case 'filter':
      case 'sort':
        this.q.page = event.pi;
        this.q.size = event.ps;
        this.load();
        break;
      default:
        break;
    }
  }

  protected search(): void {
    this.q.page = 1;
    this.load();
  }

  protected reset(): void {
    this.q = { page: 1, size: this.q.size, keyword: '', status: '' };
    this.load();
  }

  protected openModal(item?: PortMapping): void {
    const normalized = item ? this.normalizeMapping(item) : undefined;
    this.form.reset({
      guid: normalized?.guid ?? '',
      deviceGuid: normalized?.deviceGuid ?? '',
      name: normalized?.name ?? '',
      publicHost: normalized?.publicHost ?? '',
      targetHost: normalized?.targetHost ?? '127.0.0.1',
      targetPort: normalized?.targetPort || this.defaultWebPort(normalized?.deviceGuid) || 80,
      protocol: normalized?.protocol || 'http',
      isCustomDomain: normalized?.isCustomDomain ?? false,
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
    this.mappingsService
      .save({
        guid: value.guid || undefined,
        deviceGuid: value.deviceGuid,
        name: value.name.trim(),
        publicHost: value.publicHost.trim(),
        targetHost: value.targetHost.trim(),
        targetPort: Number(value.targetPort),
        protocol: value.protocol,
        isCustomDomain: value.isCustomDomain,
        status: 1,
      })
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.message.success('HTTP 映射已保存');
          this.modalVisible = false;
          this.load();
        },
        error: () => this.message.error('HTTP 映射保存失败'),
      });
  }

  protected disable(item: PortMapping): void {
    this.mappingsService.disable(item.guid).subscribe({
      next: () => {
        this.message.success('HTTP 映射已禁用');
        this.load();
      },
      error: () => this.message.error('HTTP 映射禁用失败'),
    });
  }

  protected openLogs(item: PortMapping): void {
    this.router.navigate(['/mappings/access-logs'], { queryParams: { host: item.publicHost } });
  }

  protected deviceName(guid: string | undefined): string {
    if (!guid) return '-';
    const device = this.devices.find((item) => item.guid === guid);
    return device?.alias || device?.sncode || device?.hostname || device?.name || device?.guid || guid;
  }

  protected fillFromDevice(deviceGuid: string): void {
    const device = this.devices.find((item) => item.guid === deviceGuid);
    if (!device) return;
    if (!this.form.controls.name.value) {
      this.form.controls.name.setValue(device.alias || device.name || device.hostname || device.sncode || '');
    }
    if (!this.form.controls.publicHost.value && device.webDomain) {
      this.form.controls.publicHost.setValue(device.webDomain);
      this.form.controls.isCustomDomain.setValue(true);
    }
    const webPort = this.defaultWebPort(deviceGuid);
    if (webPort && (!this.form.controls.targetPort.value || this.form.controls.targetPort.value === 80)) {
      this.form.controls.targetPort.setValue(webPort);
    }
  }

  protected statusText(status: number): string {
    return status === 0 ? '禁用' : '启用';
  }

  private defaultWebPort(deviceGuid: string | undefined): number {
    if (!deviceGuid) return 0;
    const device = this.devices.find((item) => item.guid === deviceGuid);
    return Number(device?.webPort || device?.web_port || 0);
  }

  private normalizeMapping(item: PortMapping): PortMapping {
    return {
      ...item,
      deviceGuid: this.firstText(item.deviceGuid, item.device_guid),
      publicHost: this.firstText(item.publicHost, item.public_host),
      targetHost: this.firstText(item.targetHost, item.target_host),
      targetPort: this.firstNumber(item.targetPort, item.target_port),
      isCustomDomain: this.firstBoolean(item.isCustomDomain, item.is_custom_domain),
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

  private firstBoolean(...values: Array<boolean | undefined>): boolean {
    return values.find((value) => value !== undefined && value !== null) ?? false;
  }
}
