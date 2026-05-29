import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { STChange, STColumn } from '@delon/abc/st';
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

  protected readonly actionOptions = [
    { value: 'login', label: '登录', color: 'green' },
    { value: 'login_failed', label: '登录失败', color: 'red' },
    { value: 'save', label: '保存', color: 'blue' },
    { value: 'update', label: '更新', color: 'cyan' },
    { value: 'create', label: '创建', color: 'green' },
    { value: 'delete', label: '删除', color: 'red' },
    { value: 'disable', label: '禁用', color: 'gold' },
    { value: 'enable', label: '启用', color: 'green' },
    { value: 'rotate', label: '轮换', color: 'purple' },
    { value: 'assign', label: '分配', color: 'geekblue' },
    { value: 'ack', label: '确认', color: 'cyan' },
    { value: 'close', label: '关闭', color: 'orange' },
    { value: 'verify', label: '验证', color: 'lime' },
    { value: 'cleanup_retention', label: '清理留存', color: 'magenta' },
    { value: 'change_password', label: '修改密码', color: 'purple' },
  ];

  private readonly actionMap = new Map(this.actionOptions.map((item) => [item.value, item]));

  protected readonly columns: STColumn<AuditLog>[] = [
    { title: '操作者', index: 'actor', render: 'actorRender', fixed: 'left', width: 160 },
    { title: '动作', index: 'action', render: 'actionRender', width: 120 },
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

  protected actionText(value: string | undefined): string {
    if (!value) return '-';
    return this.actionMap.get(value)?.label ?? value;
  }

  protected actionColor(value: string | undefined): string {
    if (!value) return 'default';
    return this.actionMap.get(value)?.color ?? 'default';
  }

  private normalizeLog(item: AuditLog): AuditLog {
    return {
      ...item,
      action: this.firstText(item.action),
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
