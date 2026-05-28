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
    key: ['', [Validators.required]],
    name: ['', [Validators.required]],
    icon: ['appstore'],
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

  protected readonly iconOptions = [
    { value: 'appstore' },
    { value: 'code' },
    { value: 'radar-chart' },
    { value: 'dot-chart' },
    { value: 'cloud' },
    { value: 'database' },
    { value: 'experiment' },
    { value: 'deployment-unit' },
    { value: 'control' },
    { value: 'global' },
    { value: 'api' },
    { value: 'dashboard' },
    { value: 'desktop' },
    { value: 'laptop' },
    { value: 'mobile' },
    { value: 'tablet' },
    { value: 'hdd' },
    { value: 'cloud-server' },
    { value: 'cluster' },
    { value: 'partition' },
    { value: 'apartment' },
    { value: 'branches' },
    { value: 'node-index' },
    { value: 'gateway' },
    { value: 'wifi' },
    { value: 'usb' },
    { value: 'monitor' },
    { value: 'container' },
    { value: 'line-chart' },
    { value: 'bar-chart' },
    { value: 'area-chart' },
    { value: 'box-plot' },
    { value: 'fund' },
    { value: 'fund-projection-screen' },
    { value: 'tool' },
    { value: 'setting' },
    { value: 'sliders' },
    { value: 'rocket' },
    { value: 'thunderbolt' },
    { value: 'bug' },
    { value: 'build' },
    { value: 'security-scan' },
    { value: 'safety-certificate' },
    { value: 'key' },
    { value: 'lock' },
    { value: 'printer' },
    { value: 'scan' },
    { value: 'barcode' },
    { value: 'qrcode' },
    { value: 'environment' },
    { value: 'compass' },
    { value: 'pushpin' },
    { value: 'fire' },
    { value: 'apple' },
    { value: 'windows' },
    { value: 'android' },
  ];

  protected readonly columns: STColumn<DeviceGroup>[] = [
    { title: '设备类型', index: 'name', render: 'nameRender' },
    { title: '图标', index: 'icon', render: 'iconRender', width: 90 },
    { title: '唯一标识', index: 'key', render: 'keyRender' },
    { title: '默认 Web 端口', index: 'defaultWebPort', render: 'portRender' },
    { title: '默认映射域名', index: 'defaultDomain', render: 'domainRender' },
    { title: '排序', index: 'sort' },
    { title: '说明', index: 'remark', default: '-' },
    { title: '状态', index: 'status', type: 'tag', tag: this.statusTag },
    {
      title: '更新时间',
      index: 'updateTime',
      type: 'date',
      dateFormat: 'yyyy-MM-dd HH:mm:ss',
    },
    {
      title: '操作',
      buttons: [
        { icon: 'edit', click: (item) => this.openModal(item) },
        { icon: 'appstore', click: (item) => this.openDevices(this.groupKey(item)) },
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
      key: this.groupKey(row) ?? '',
      name: row?.name ?? '',
      icon: this.iconLabel(row?.icon),
      defaultWebPort: row?.defaultWebPort ?? 0,
      defaultDomain: row?.defaultDomain ?? '',
      sort: row?.sort ?? 0,
      remark: row?.remark ?? '',
      status: row?.status ?? 1,
    });
    if (row) {
      this.form.controls.key.disable({ emitEvent: false });
    } else {
      this.form.controls.key.enable({ emitEvent: false });
    }
    this.modalVisible = true;
  }

  protected save(): void {
    if (this.saving) {
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
    this.saving = true;
    this.devicesService
      .saveGroup({
        guid: this.editingGuid || undefined,
        key: value.key.trim(),
        name: value.name.trim(),
        icon: value.icon,
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
          this.saving = false;
          this.modalVisible = false;
          this.cdr.detectChanges();
          this.load();
        },
        error: () => this.message.error('设备类型保存失败'),
      });
  }

  protected disable(item: DeviceGroup): void {
    this.devicesService.disableGroup(item.guid || this.groupKey(item)).subscribe({
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

  protected selectIcon(icon: string): void {
    this.form.controls.icon.setValue(icon);
    this.form.controls.icon.markAsDirty();
  }

  private normalizeGroup(item: DeviceGroup): DeviceGroup {
    return {
      ...item,
      key: this.firstText(item.key, item.group_key, item.guid),
      icon: this.iconLabel(item.icon),
      defaultWebPort: this.firstNumber(item.defaultWebPort, item.default_web_port),
      defaultDomain: this.firstText(item.defaultDomain, item.default_domain),
      sort: this.firstNumber(item.sort),
      remark: this.firstText(item.remark, item.description),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  protected groupKey(item: DeviceGroup | undefined): string {
    return this.firstText(item?.key, item?.group_key, item?.guid);
  }

  protected iconLabel(icon: string | undefined): string {
    if (icon === 'terminal') return 'code';
    return icon || 'appstore';
  }

  private firstText(...values: Array<string | undefined>): string {
    return values.find((value) => value !== undefined && value !== '') ?? '';
  }

  private firstNumber(...values: Array<number | undefined>): number {
    return values.find((value) => value !== undefined && value !== null) ?? 0;
  }
}
