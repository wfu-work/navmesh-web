import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
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

  protected readonly statusTag: STColumnTag = {
    1: { text: '启用', color: 'green' },
    0: { text: '禁用', color: 'default' },
  };

  protected readonly form = this.fb.group({
    guid: [''],
    name: ['', [Validators.required]],
    description: [''],
  });

  protected readonly columns: STColumn<DeviceGroup>[] = [
    { title: '分组', index: 'name', render: 'nameRender', fixed: 'left', width: 260 },
    { title: '说明', index: 'description', render: 'descriptionRender', width: 360 },
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
      width: 130,
      buttons: [
        { icon: 'edit', click: (item) => this.openModal(item) },
        {
          icon: 'stop',
          className: 'text-error',
          iif: (item) => item.status !== 0,
          click: (item) => this.disable(item),
          pop: {
            title: '禁用后该分组不再用于新分配，确认继续？',
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
        error: () => this.message.error('设备分组加载失败'),
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
    this.form.reset({
      guid: item?.guid ?? '',
      name: item?.name ?? '',
      description: item?.description ?? '',
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
    this.devicesService
      .saveGroup({
        guid: value.guid || undefined,
        name: value.name.trim(),
        description: value.description.trim(),
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
          this.message.success('设备分组已保存');
          this.modalVisible = false;
          this.load();
        },
        error: () => this.message.error('设备分组保存失败'),
      });
  }

  protected disable(item: DeviceGroup): void {
    this.devicesService.disableGroup(item.guid).subscribe({
      next: () => {
        this.message.success('设备分组已禁用');
        this.load();
      },
      error: () => this.message.error('设备分组禁用失败'),
    });
  }

  private normalizeGroup(item: DeviceGroup): DeviceGroup {
    return {
      ...item,
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private firstNumber(...values: Array<number | undefined>): number {
    return values.find((value) => value !== undefined && value !== null) ?? 0;
  }
}
