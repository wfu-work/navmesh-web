import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { MessageTemplate, MessagesService } from '../messages.service';

@Component({
  selector: 'app-message-templates',
  templateUrl: './message-templates.component.html',
  styleUrls: ['../messages.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class MessageTemplatesComponent implements OnInit {
  private readonly messagesService = inject(MessagesService);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected q = { page: 1, size: 10, keyword: '', status: '', channel: '' };
  protected data: MessageTemplate[] = [];
  protected totalCount = 0;
  protected loading = false;

  protected readonly statusTag: STColumnTag = {
    1: { text: '启用', color: 'green' },
    0: { text: '禁用', color: 'red' },
  };

  protected readonly columns: STColumn<MessageTemplate>[] = [
    { title: '通知场景', index: 'name', render: 'nameRender', width: 180 },
    { title: '编码', index: 'code', render: 'codeRender', width: 240 },
    { title: '主题', index: 'subject', render: 'subjectRender', width: 520 },
    { title: '渠道', index: 'channel', render: 'channelRender', width: 100 },
    { title: '状态', index: 'status', type: 'tag', tag: this.statusTag, width: 90 },
    { title: '更新时间', index: 'updateTime', type: 'date', dateFormat: 'yyyy-MM-dd HH:mm:ss', width: 180 },
    {
      title: '操作',
      fixed: 'right',
      width: 140,
      buttons: [
        { icon: 'edit', click: (item) => this.edit(item) },
        {
          icon: 'stop',
          className: 'text-error',
          iif: (item) => item.status !== 0,
          click: (item) => this.disable(item),
          pop: { title: '禁用后该模板不会用于通知，确认继续？', okType: 'danger', icon: 'stop' },
        },
        {
          icon: 'delete',
          className: 'text-error',
          click: (item) => this.delete(item),
          pop: { title: '删除后无法恢复，确认删除该模板？', okType: 'danger', icon: 'delete' },
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    this.messagesService
      .templates(this.q)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (res) => {
          this.data = (res.data ?? []).map((item) => ({ ...item, updateTime: item.updateTime ?? item.update_time }));
          this.totalCount = res.total ?? 0;
        },
        error: () => this.message.error('消息模板加载失败'),
      });
  }

  protected tableChange(event: STChange): void {
    if (event.type === 'pi' || event.type === 'ps') {
      this.q.page = event.pi;
      this.q.size = event.ps;
      this.load();
    }
  }

  protected search(): void {
    this.q.page = 1;
    this.load();
  }

  protected reset(): void {
    this.q = { page: 1, size: this.q.size, keyword: '', status: '', channel: '' };
    this.load();
  }

  protected create(): void {
    this.router.navigate(['/messages/templates/create']);
  }

  protected edit(item: MessageTemplate): void {
    const identity = item.guid || item.code;
    if (!identity) {
      this.message.error('消息模板缺少标识，无法编辑');
      return;
    }
    this.router.navigate(['/messages/templates/edit', identity]);
  }

  protected disable(item: MessageTemplate): void {
    if (!item.guid) {
      this.message.error('消息模板缺少标识，无法禁用');
      return;
    }
    this.messagesService.disableTemplate(item.guid).subscribe({
      next: () => {
        this.message.success('消息模板已禁用');
        this.load();
      },
      error: () => this.message.error('消息模板禁用失败'),
    });
  }

  protected delete(item: MessageTemplate): void {
    if (!item.guid) {
      this.message.error('消息模板缺少标识，无法删除');
      return;
    }
    this.messagesService.deleteTemplate(item.guid).subscribe({
      next: () => {
        this.message.success('消息模板已删除');
        this.load();
      },
      error: () => this.message.error('消息模板删除失败'),
    });
  }

  protected preview(text: string): string {
    return (text || '').replace(/\s+/g, ' ').trim() || '-';
  }
}
