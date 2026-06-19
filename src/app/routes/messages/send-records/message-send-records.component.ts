import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { MessageSendDebugComponent } from '../send-debug/message-send-debug.component';
import { MessageSendRecord, MessagesService } from '../messages.service';

@Component({
  selector: 'app-message-send-records',
  templateUrl: './message-send-records.component.html',
  styleUrls: ['../messages.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class MessageSendRecordsComponent implements OnInit {
  private readonly messagesService = inject(MessagesService);
  private readonly message = inject(NzMessageService);
  private readonly modalService = inject(NzModalService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected q = { page: 1, size: 10, keyword: '', sendStatus: '', receiveStatus: '', templateCode: '' };
  protected data: MessageSendRecord[] = [];
  protected totalCount = 0;
  protected loading = false;
  protected debugModalOpen = false;
  protected debugSubmitting = false;

  protected readonly sendStatusTag: STColumnTag = {
    pending: { text: '发送中', color: 'blue' },
    success: { text: '成功', color: 'green' },
    failed: { text: '失败', color: 'red' },
  };

  protected readonly receiveStatusTag: STColumnTag = {
    waiting: { text: '等待', color: 'blue' },
    accepted: { text: '已受理', color: 'green' },
    failed: { text: '失败', color: 'red' },
  };

  protected readonly columns: STColumn<MessageSendRecord>[] = [
    { title: '邮件', index: 'subject', render: 'mailRender', width: 340 },
    { title: '接收人', index: 'recipientEmail', render: 'recipientRender', width: 260 },
    { title: '发送状态', index: 'sendStatus', type: 'tag', tag: this.sendStatusTag, width: 110 },
    { title: '接收状态', index: 'receiveStatus', type: 'tag', tag: this.receiveStatusTag, width: 110 },
    { title: '最后发送', index: 'lastSendTime', type: 'date', dateFormat: 'yyyy-MM-dd HH:mm:ss', width: 180 },
    { title: '错误信息', index: 'errorMessage', render: 'errorRender', width: 320 },
    {
      title: '操作',
      fixed: 'right',
      width: 120,
      buttons: [
        {
          icon: 'redo',
          iif: (item) => this.retryable(item),
          click: (item) => this.retry(item),
          pop: { title: '重新发送该邮件？', okType: 'primary', icon: 'redo' },
        },
        {
          icon: 'delete',
          className: 'text-error',
          click: (item) => this.delete(item),
          pop: { title: '删除后该发送记录无法恢复，确认删除？', okType: 'danger', icon: 'delete' },
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
      .sendRecords(this.q)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          this.data = (res.data ?? []).map((item) => this.normalize(item));
          this.totalCount = res.total ?? 0;
        },
        error: () => this.message.error('发送记录加载失败'),
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
    this.q = { page: 1, size: this.q.size, keyword: '', sendStatus: '', receiveStatus: '', templateCode: '' };
    this.load();
  }

  protected openDebugModal(): void {
    if (this.debugModalOpen || this.debugSubmitting) return;
    this.debugModalOpen = true;
    const modal = this.modalService.create({
      nzTitle: '调试发送邮件',
      nzContent: MessageSendDebugComponent,
      nzOkText: '发送',
      nzCancelText: '取消',
      nzMaskClosable: false,
      nzWidth: 680,
      nzData: { templateCode: this.q.templateCode },
      nzOnOk: (componentInstance) => {
        if (this.debugSubmitting) return false;
        this.debugSubmitting = true;
        modal.updateConfig({ nzOkLoading: true, nzCancelDisabled: true });
        componentInstance
          .submit()
          .pipe(
            finalize(() => {
              this.debugSubmitting = false;
              modal.updateConfig({ nzOkLoading: false, nzCancelDisabled: false });
              this.cdr.markForCheck();
            }),
          )
          .subscribe({
            next: (success) => {
              if (!success) return;
              modal.close();
              this.message.success('调试邮件已发送');
              this.load();
            },
            error: (error) => {
              this.message.error(error?.message || '调试邮件发送失败');
              this.load();
            },
          });
        return false;
      },
    });
    modal.afterClose.subscribe(() => {
      this.debugModalOpen = false;
      this.debugSubmitting = false;
      this.cdr.markForCheck();
    });
  }

  protected retry(item: MessageSendRecord): void {
    if (!this.retryable(item)) return;
    this.messagesService.retrySendRecord(item.guid).subscribe({
      next: () => {
        this.message.success('邮件重试发送成功');
        this.load();
      },
      error: (error) => {
        this.message.error(error?.message || '邮件重试发送失败');
        this.load();
      },
    });
  }

  protected delete(item: MessageSendRecord): void {
    if (!item.guid) {
      this.message.error('发送记录缺少标识，无法删除');
      return;
    }
    this.messagesService.deleteSendRecord(item.guid).subscribe({
      next: () => {
        this.message.success('发送记录已删除');
        if (this.data.length === 1 && this.q.page > 1) {
          this.q.page -= 1;
        }
        this.load();
      },
      error: () => this.message.error('发送记录删除失败'),
    });
  }

  protected retryable(item: MessageSendRecord): boolean {
    return item.sendStatus === 'failed' && item.retryCount < item.maxRetries;
  }

  protected templateText(item: MessageSendRecord): string {
    const code = item.templateCode || '-';
    const name = item.templateName || '邮件模板';
    return `${name} · ${code}`;
  }

  protected senderText(item: MessageSendRecord): string {
    return item.fromName ? `${item.fromName} <${item.fromEmail || '-'}>` : item.fromEmail || '-';
  }

  protected successCount(): number {
    return this.data.filter((item) => item.sendStatus === 'success').length;
  }

  protected failedCount(): number {
    return this.data.filter((item) => item.sendStatus === 'failed').length;
  }

  protected retryableCount(): number {
    return this.data.filter((item) => this.retryable(item)).length;
  }

  private normalize(item: MessageSendRecord): MessageSendRecord {
    return {
      ...item,
      batchGuid: item.batchGuid || item.batch_guid || '',
      templateCode: item.templateCode || item.template_code || '',
      templateName: item.templateName || item.template_name || '',
      recipientGuid: item.recipientGuid || item.recipient_guid || '',
      recipientName: item.recipientName || item.recipient_name || '',
      recipientEmail: item.recipientEmail || item.recipient_email || '',
      fromEmail: item.fromEmail || item.from_email || '',
      fromName: item.fromName || item.from_name || '',
      sendStatus: item.sendStatus || item.send_status || 'pending',
      receiveStatus: item.receiveStatus || item.receive_status || 'waiting',
      retryCount: Number(item.retryCount ?? item.retry_count ?? 0),
      maxRetries: Number(item.maxRetries ?? item.max_retries ?? 3),
      errorMessage: item.errorMessage || item.error_message || '',
      lastSendTime: item.lastSendTime ?? item.last_send_time,
      nextRetryTime: item.nextRetryTime ?? item.next_retry_time,
      successTime: item.successTime ?? item.success_time,
      createTime: item.createTime ?? item.create_time,
      updateTime: item.updateTime ?? item.update_time,
    };
  }
}
