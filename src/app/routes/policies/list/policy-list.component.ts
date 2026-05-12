import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DevicesService } from '../../devices/devices.service';
import { MappingsService, PortMapping } from '../../mappings/mappings.service';
import { AccessPolicy, PoliciesService } from '../policies.service';

@Component({
  selector: 'app-policy-list',
  templateUrl: './policy-list.component.html',
  styleUrls: ['../policies.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class PolicyListComponent implements OnInit {
  private readonly policiesService = inject(PoliciesService);
  private readonly devicesService = inject(DevicesService);
  private readonly mappingsService = inject(MappingsService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected q = {
    page: 1,
    size: 10,
    scope: '',
    targetId: '',
    status: '',
  };

  protected data: AccessPolicy[] = [];
  protected devices: Device[] = [];
  protected mappings: PortMapping[] = [];
  protected totalCount = 0;
  protected loading = false;
  protected saving = false;
  protected modalVisible = false;

  protected readonly statusTag: STColumnTag = {
    1: { text: '启用', color: 'green' },
    0: { text: '禁用', color: 'default' },
  };

  protected readonly scopeTag: STColumnTag = {
    global: { text: '全局', color: 'geekblue' },
    device: { text: '设备', color: 'green' },
    mapping: { text: '映射', color: 'blue' },
  };

  protected readonly form = this.fb.group({
    guid: [''],
    name: ['', [Validators.required]],
    scope: ['device', [Validators.required]],
    targetId: ['', [Validators.required]],
    allowSsh: [true],
    allowHttp: [true],
  });

  protected readonly columns: STColumn<AccessPolicy>[] = [
    { title: '策略', index: 'name', render: 'nameRender', fixed: 'left', width: 240 },
    { title: '范围', index: 'scope', type: 'tag', tag: this.scopeTag, width: 100 },
    { title: '目标', index: 'targetId', render: 'targetRender', width: 280 },
    { title: 'SSH', index: 'allowSsh', render: 'sshRender', width: 90 },
    { title: 'HTTP', index: 'allowHttp', render: 'httpRender', width: 90 },
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
            title: '禁用后该访问策略将不再参与 SSH/HTTP 判定，确认继续？',
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
      policies: this.policiesService.list(this.q),
      devices: this.devicesService.list({ page: 1, size: 500 }),
      mappings: this.mappingsService.list({ page: 1, size: 500 }),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ policies, devices, mappings }) => {
          this.data = (policies.data ?? []).map((item) => this.normalizePolicy(item));
          this.totalCount = policies.total ?? 0;
          this.devices = devices.data ?? [];
          this.mappings = (mappings.data ?? []).map((item) => this.normalizeMapping(item));
        },
        error: () => this.message.error('访问策略加载失败'),
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
    this.q = { page: 1, size: this.q.size, scope: '', targetId: '', status: '' };
    this.load();
  }

  protected openModal(item?: AccessPolicy): void {
    const normalized = item ? this.normalizePolicy(item) : undefined;
    this.form.reset({
      guid: normalized?.guid ?? '',
      name: normalized?.name ?? '',
      scope: normalized?.scope || 'device',
      targetId: normalized?.targetId ?? '',
      allowSsh: normalized?.allowSsh ?? true,
      allowHttp: normalized?.allowHttp ?? true,
    });
    if (this.form.controls.scope.value === 'global') {
      this.form.controls.targetId.clearValidators();
      this.form.controls.targetId.setValue('');
    } else {
      this.form.controls.targetId.setValidators([Validators.required]);
    }
    this.form.controls.targetId.updateValueAndValidity();
    this.modalVisible = true;
  }

  protected onScopeChange(scope: string): void {
    this.form.controls.targetId.setValue('');
    if (scope === 'global') {
      this.form.controls.targetId.clearValidators();
    } else {
      this.form.controls.targetId.setValidators([Validators.required]);
    }
    this.form.controls.targetId.updateValueAndValidity();
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
    this.policiesService
      .save({
        guid: value.guid || undefined,
        name: value.name.trim(),
        scope: value.scope,
        targetId: value.scope === 'global' ? '' : value.targetId,
        allowSsh: value.allowSsh,
        allowHttp: value.allowHttp,
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
          this.message.success('访问策略已保存');
          this.modalVisible = false;
          this.load();
        },
        error: () => this.message.error('访问策略保存失败'),
      });
  }

  protected disable(item: AccessPolicy): void {
    this.policiesService.disable(item.guid).subscribe({
      next: () => {
        this.message.success('访问策略已禁用');
        this.load();
      },
      error: () => this.message.error('访问策略禁用失败'),
    });
  }

  protected targetName(item: AccessPolicy): string {
    if (item.scope === 'global') return '全部设备与映射';
    if (item.scope === 'device') {
      const device = this.devices.find((row) => row.guid === item.targetId);
      return device?.alias || device?.sncode || device?.hostname || device?.name || item.targetId || '-';
    }
    if (item.scope === 'mapping') {
      const mapping = this.mappings.find((row) => row.guid === item.targetId);
      return mapping?.publicHost || mapping?.name || item.targetId || '-';
    }
    return item.targetId || '-';
  }

  protected targetMeta(item: AccessPolicy): string {
    if (item.scope === 'global') return 'global';
    return item.targetId || '-';
  }

  private normalizePolicy(item: AccessPolicy): AccessPolicy {
    return {
      ...item,
      targetId: this.firstText(item.targetId, item.target_id),
      allowSsh: this.firstBoolean(item.allowSsh, item.allow_ssh),
      allowHttp: this.firstBoolean(item.allowHttp, item.allow_http),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private normalizeMapping(item: PortMapping): PortMapping {
    return {
      ...item,
      publicHost: this.firstText(item.publicHost, item.public_host),
      targetHost: this.firstText(item.targetHost, item.target_host),
      targetPort: this.firstNumber(item.targetPort, item.target_port),
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
