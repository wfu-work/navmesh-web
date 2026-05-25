import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { CustomDomain, MappingsService, PortMapping } from '../mappings.service';

@Component({
  selector: 'app-custom-domains',
  templateUrl: './custom-domains.component.html',
  styleUrls: ['../mappings.component.less', './custom-domains.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class CustomDomainsComponent implements OnInit {
  private readonly mappingsService = inject(MappingsService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected q = {
    page: 1,
    size: 10,
    domain: '',
    mappingGuid: '',
    status: '',
  };

  protected data: CustomDomain[] = [];
  protected mappings: PortMapping[] = [];
  protected totalCount = 0;
  protected loading = false;
  protected saving = false;
  protected modalVisible = false;

  protected readonly statusTag: STColumnTag = {
    1: { text: '启用', color: 'green' },
    0: { text: '禁用', color: 'default' },
  };

  protected readonly verifiedTag: STColumnTag = {
    true: { text: '已验证', color: 'green' },
    false: { text: '待验证', color: 'gold' },
  };

  protected readonly form = this.fb.group({
    domain: ['', [Validators.required]],
    mappingGuid: ['', [Validators.required]],
  });

  protected readonly columns: STColumn<CustomDomain>[] = [
    { title: '域名', index: 'domain', render: 'domainRender', fixed: 'left', width: 260 },
    { title: '绑定映射', index: 'mappingGuid', render: 'mappingRender', width: 260 },
    { title: '验证状态', index: 'verified', type: 'tag', tag: this.verifiedTag, width: 120 },
    { title: '状态', index: 'status', type: 'tag', tag: this.statusTag, width: 100 },
    { title: '验证 Token', index: 'verifyToken', render: 'tokenRender', width: 360 },
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
      width: 150,
      buttons: [
        {
          icon: 'check-circle',
          iif: (item) => !item.verified && item.status !== 0,
          click: (item) => this.verify(item),
          pop: {
            title: '确认使用当前 Token 标记该域名为已验证？',
            okType: 'primary',
            icon: 'check-circle',
          },
        },
        {
          icon: 'stop',
          className: 'text-error',
          iif: (item) => item.status !== 0,
          click: (item) => this.disable(item),
          pop: {
            title: '禁用后该自定义域名不再参与映射，确认继续？',
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
      domains: this.mappingsService.customDomains(this.q),
      mappings: this.mappingsService.list({ page: 1, size: 500 }),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ domains, mappings }) => {
          this.data = (domains.data ?? []).map((item) => this.normalizeDomain(item));
          this.totalCount = domains.total ?? 0;
          this.mappings = (mappings.data ?? []).map((item) => this.normalizeMapping(item));
        },
        error: () => this.message.error('自定义域名加载失败'),
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
    this.q = { page: 1, size: this.q.size, domain: '', mappingGuid: '', status: '' };
    this.load();
  }

  protected openModal(): void {
    this.form.reset({ domain: '', mappingGuid: '' });
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
      .saveCustomDomain({
        domain: value.domain.trim(),
        mappingGuid: value.mappingGuid,
      })
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.message.success('自定义域名已保存');
          this.modalVisible = false;
          this.load();
        },
        error: () => this.message.error('自定义域名保存失败'),
      });
  }

  protected verify(item: CustomDomain): void {
    this.mappingsService.verifyCustomDomain(item.domain, item.verifyToken).subscribe({
      next: () => {
        this.message.success('自定义域名已验证');
        this.load();
      },
      error: () => this.message.error('自定义域名验证失败'),
    });
  }

  protected disable(item: CustomDomain): void {
    this.mappingsService.disableCustomDomain(item.domain).subscribe({
      next: () => {
        this.message.success('自定义域名已禁用');
        this.load();
      },
      error: () => this.message.error('自定义域名禁用失败'),
    });
  }

  protected mappingName(guid: string): string {
    const mapping = this.mappings.find((item) => item.guid === guid);
    return mapping?.publicHost || mapping?.name || guid || '-';
  }

  private normalizeDomain(item: CustomDomain): CustomDomain {
    return {
      ...item,
      mappingGuid: this.firstText(item.mappingGuid, item.mapping_guid),
      verifyToken: this.firstText(item.verifyToken, item.verify_token),
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
}
