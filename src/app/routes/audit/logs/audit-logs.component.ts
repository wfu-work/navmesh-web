import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { AuditLog, AuditService } from '../audit.service';

@Component({
  selector: 'app-audit-logs',
  templateUrl: './audit-logs.component.html',
  styleUrls: ['../audit.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class AuditLogsComponent implements OnInit {
  private readonly auditService = inject(AuditService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected q = {
    page: 1,
    size: 10,
    actor: '',
    action: '',
    resource: '',
    resourceId: '',
  };

  protected data: AuditLog[] = [];
  protected totalCount = 0;
  protected loading = false;

  protected readonly actionTag: STColumnTag = {
    login: { text: '登录', color: 'green' },
    login_failed: { text: '登录失败', color: 'red' },
    save: { text: '保存', color: 'blue' },
    disable: { text: '禁用', color: 'gold' },
    change_password: { text: '改密', color: 'purple' },
  };

  protected readonly columns: STColumn<AuditLog>[] = [
    { title: '操作者', index: 'actor', render: 'actorRender', fixed: 'left', width: 160 },
    { title: '动作', index: 'action', type: 'tag', tag: this.actionTag, width: 120 },
    { title: '资源', index: 'resource', width: 160, default: '-' },
    { title: '资源 ID', index: 'resourceId', render: 'resourceRender', width: 240 },
    { title: '来源 IP', index: 'sourceIp', width: 150, default: '-' },
    { title: '说明', index: 'message', render: 'messageRender', width: 300 },
    {
      title: '时间',
      index: 'createTime',
      type: 'date',
      dateFormat: 'yyyy-MM-dd HH:mm:ss',
      width: 180,
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    this.auditService
      .list(this.q)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          this.data = (res.data ?? []).map((item) => this.normalizeLog(item));
          this.totalCount = res.total ?? 0;
        },
        error: () => this.message.error('审计日志加载失败'),
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
    this.q = { page: 1, size: this.q.size, actor: '', action: '', resource: '', resourceId: '' };
    this.load();
  }

  protected actionText(value: string): string {
    const map: Record<string, string> = {
      login: '登录',
      login_failed: '登录失败',
      save: '保存',
      disable: '禁用',
      change_password: '修改密码',
    };
    return map[value] ?? value;
  }

  private normalizeLog(item: AuditLog): AuditLog {
    return {
      ...item,
      resourceId: this.firstText(item.resourceId, item.resource_id),
      sourceIp: this.firstText(item.sourceIp, item.source_ip),
      createTime: this.firstNumber(item.createTime, item.create_time),
    };
  }

  private firstText(...values: Array<string | undefined>): string {
    return values.find((value) => value !== undefined && value !== '') ?? '';
  }

  private firstNumber(...values: Array<number | undefined>): number {
    return values.find((value) => value !== undefined && value !== null) ?? 0;
  }
}
