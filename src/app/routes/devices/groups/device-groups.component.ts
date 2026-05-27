import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { DeviceGroup, DevicesService } from '../devices.service';

@Component({
  selector: 'app-device-groups',
  templateUrl: './device-groups.component.html',
  styleUrls: ['../list/device-list.component.less', './device-groups.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class DeviceGroupsComponent implements OnInit {
  private readonly devicesService = inject(DevicesService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected q = {
    page: 1,
    size: 10,
    keyword: '',
    status: '',
  };

  protected data: DeviceGroup[] = [];
  protected totalCount = 0;
  protected loading = false;
  protected saving = false;
  protected modalVisible = false;
  protected editingGuid = '';

  protected readonly form = this.fb.group({
    guid: ['', [Validators.required]],
    name: ['', [Validators.required]],
    defaultWebPort: [0],
    defaultDomain: [''],
    sort: [0],
    remark: [''],
    status: [1],
  });

  protected readonly statusTag: STColumnTag = {
    1: { text: '启用', color: 'green' },
    0: { text: '禁用', color: 'red' },
  };

  protected readonly columns: STColumn<DeviceGroup>[] = [
    { title: '设备类型', index: 'name', render: 'nameRender', fixed: 'left', width: 220 },
    { title: '默认 Web 端口', index: 'defaultWebPort', render: 'portRender', width: 160 },
    { title: '默认映射域名', index: 'defaultDomain', render: 'domainRender', width: 260 },
    { title: '排序', index: 'sort', width: 90 },
    { title: '说明', index: 'remark', default: '-', width: 220 },
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
        { icon: 'appstore', click: (item) => this.openDevices(item.guid) },
        {
          icon: 'stop',
          className: 'text-error',
          iif: (item) => item.status !== 0,
          click: (item) => this.disable(item),
          pop: {
            title: '禁用后该类型将不能用于新设备注册，确认继续？',
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
    this.devicesService
      .groups(this.q)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          this.data = (res.data ?? []).map((item) => this.normalizeGroup(item));
          this.totalCount = res.total ?? 0;
        },
        error: () => this.message.error('设备类型加载失败'),
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

  protected openModal(item?: DeviceGroup): void {
    const row = item ? this.normalizeGroup(item) : undefined;
    this.editingGuid = row?.guid ?? '';
    this.form.reset({
      guid: row?.guid ?? '',
      name: row?.name ?? '',
      defaultWebPort: row?.defaultWebPort ?? 0,
      defaultDomain: row?.defaultDomain ?? '',
      sort: row?.sort ?? 0,
      remark: row?.remark ?? '',
      status: row?.status ?? 1,
    });
    if (row) {
      this.form.controls.guid.disable({ emitEvent: false });
    } else {
      this.form.controls.guid.enable({ emitEvent: false });
    }
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
    this.devicesService
      .saveGroup({
        guid: this.editingGuid || value.guid.trim(),
        name: value.name.trim(),
        defaultWebPort: Number(value.defaultWebPort || 0),
        defaultDomain: value.defaultDomain.trim(),
        sort: Number(value.sort || 0),
        remark: value.remark.trim(),
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
          this.message.success('设备类型已保存');
          this.modalVisible = false;
          this.load();
        },
        error: () => this.message.error('设备类型保存失败'),
      });
  }

  protected disable(item: DeviceGroup): void {
    this.devicesService.disableGroup(item.guid).subscribe({
      next: () => {
        this.message.success('设备类型已禁用');
        this.load();
      },
      error: () => this.message.error('设备类型禁用失败'),
    });
  }

  protected openDevices(type: string): void {
    this.router.navigate(['/devices/list'], { queryParams: { type } });
  }

  private normalizeGroup(item: DeviceGroup): DeviceGroup {
    return {
      ...item,
      defaultWebPort: this.firstNumber(item.defaultWebPort, item.default_web_port),
      defaultDomain: this.firstText(item.defaultDomain, item.default_domain),
      sort: this.firstNumber(item.sort),
      remark: this.firstText(item.remark, item.description),
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
