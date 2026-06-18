import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { MESSAGE_TYPE_OPTIONS, messageTypeLabel, normalizeMessageTypes, parseMessageTypes } from '../message-type-options';
import { MessageRecipient, MessagesService } from '../messages.service';
import { RecipientEditComponent } from '../recipient-edit/recipient-edit.component';

@Component({
  selector: 'app-message-recipients',
  templateUrl: './message-recipients.component.html',
  styleUrls: ['../messages.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class MessageRecipientsComponent implements OnInit {
  private readonly messagesService = inject(MessagesService);
  private readonly modalService = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected q = { page: 1, size: 10, keyword: '', status: '', tag: '', messageType: '' };
  protected data: MessageRecipient[] = [];
  protected totalCount = 0;
  protected loading = false;
  protected readonly messageTypeOptions = MESSAGE_TYPE_OPTIONS;

  protected readonly statusTag: STColumnTag = {
    1: { text: '启用', color: 'green' },
    0: { text: '禁用', color: 'red' },
  };

  protected readonly columns: STColumn<MessageRecipient>[] = [
    { title: '人员', index: 'name', render: 'nameRender' },
    { title: '邮箱', index: 'email', render: 'emailRender' },
    { title: '消息类型', index: 'messageTypes', render: 'messageTypesRender', width: 220 },
    { title: '标签', index: 'tags', render: 'tagsRender' },
    { title: '状态', index: 'status', type: 'tag', tag: this.statusTag, width: 90 },
    { title: '更新时间', index: 'updateTime', type: 'date', dateFormat: 'yyyy-MM-dd HH:mm:ss', width: 180 },
    {
      title: '操作',
      width: 140,
      buttons: [
        { icon: 'edit', click: (item) => this.edit(item) },
        {
          icon: 'stop',
          className: 'text-error',
          iif: (item) => item.status !== 0,
          click: (item) => this.disable(item),
          pop: { title: '禁用后该人员不会收到通知，确认继续？', okType: 'danger', icon: 'stop' },
        },
        {
          icon: 'delete',
          className: 'text-error',
          click: (item) => this.delete(item),
          pop: { title: '删除后无法恢复，确认删除该通知人员？', okType: 'danger', icon: 'delete' },
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
      .recipients(this.q)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (res) => {
          this.data = (res.data ?? []).map((item) => ({
            ...item,
            messageTypes: normalizeMessageTypes(item.messageTypes || item.message_types).join(','),
            updateTime: item.updateTime ?? item.update_time,
          }));
          this.totalCount = res.total ?? 0;
        },
        error: () => this.message.error('通知人员加载失败'),
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
    this.q = { page: 1, size: this.q.size, keyword: '', status: '', tag: '', messageType: '' };
    this.load();
  }

  protected openModal(): void {
    this.edit('new');
  }

  protected edit(item: MessageRecipient | 'new'): void {
    const row =
      item === 'new'
        ? undefined
        : {
            ...item,
            messageTypes: normalizeMessageTypes(item.messageTypes || item.message_types).join(','),
          };
    const modal = this.modalService.create({
      nzTitle: row ? '编辑通知人员' : '新增通知人员',
      nzContent: RecipientEditComponent,
      nzOkText: '保存',
      nzCancelText: '取消',
      nzMaskClosable: false,
      nzWidth: 720,
      nzData: row,
      nzOnOk: (componentInstance) => {
        componentInstance.submit().subscribe({
          next: (success) => {
            if (!success) return;
            modal.close();
            this.message.success('通知人员已保存');
            this.load();
          },
          error: (error) => this.message.error(error.message || '通知人员保存失败'),
        });
        return false;
      },
    });
  }

  protected disable(item: MessageRecipient): void {
    this.messagesService.disableRecipient(item.guid).subscribe({
      next: () => {
        this.message.success('通知人员已禁用');
        this.load();
      },
      error: () => this.message.error('通知人员禁用失败'),
    });
  }

  protected delete(item: MessageRecipient): void {
    this.messagesService.deleteRecipient(item.guid).subscribe({
      next: () => {
        this.message.success('通知人员已删除');
        this.load();
      },
      error: () => this.message.error('通知人员删除失败'),
    });
  }

  protected tagList(tags: string): string[] {
    return (tags || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  protected messageTypeList(messageTypes: string): string[] {
    return parseMessageTypes(messageTypes);
  }

  protected messageTypeLabel(messageType: string): string {
    return messageTypeLabel(messageType);
  }
}
