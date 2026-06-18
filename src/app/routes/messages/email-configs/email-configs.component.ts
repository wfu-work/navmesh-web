import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { EmailConfigEditComponent } from '../email-configs-edit/email-config-edit.component';
import { MessageEmailConfig, MessagesService } from '../messages.service';

@Component({
  selector: 'app-message-email-configs',
  templateUrl: './email-configs.component.html',
  styleUrls: ['../messages.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class EmailConfigsComponent implements OnInit {
  private readonly messagesService = inject(MessagesService);
  private readonly modalService = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected q = { page: 1, size: 9, keyword: '', status: '' };
  protected data: MessageEmailConfig[] = [];
  protected totalCount = 0;
  protected loading = false;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    this.messagesService
      .emailConfigs(this.q)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (res) => {
          this.data = (res.data ?? []).map((item) => this.normalize(item));
          this.totalCount = res.total ?? 0;
        },
        error: () => this.message.error('邮件配置加载失败'),
      });
  }

  protected search(): void {
    this.q.page = 1;
    this.load();
  }

  protected reset(): void {
    this.q = { page: 1, size: this.q.size, keyword: '', status: '' };
    this.load();
  }

  protected pageChange(page: number): void {
    this.q.page = page;
    this.load();
  }

  protected pageSizeChange(size: number): void {
    this.q.page = 1;
    this.q.size = size;
    this.load();
  }

  protected openModal(): void {
    this.edit('new');
  }

  protected edit(item: MessageEmailConfig | 'new'): void {
    const row = item === 'new' ? undefined : this.normalize(item);
    const modal = this.modalService.create({
      nzTitle: row ? '编辑邮件配置' : '新增邮件配置',
      nzContent: EmailConfigEditComponent,
      nzOkText: '保存',
      nzCancelText: '取消',
      nzMaskClosable: false,
      nzWidth: 760,
      nzData: row,
      nzOnOk: (componentInstance) => {
        componentInstance.submit().subscribe({
          next: (success) => {
            if (!success) return;
            modal.close();
            this.message.success('邮件配置已保存');
            this.load();
          },
          error: (error) => this.message.error(error.message || '邮件配置保存失败'),
        });
        return false;
      },
    });
  }

  protected setDefault(item: MessageEmailConfig): void {
    this.messagesService.setDefaultEmailConfig(item.guid).subscribe({
      next: () => {
        this.message.success('默认邮件配置已更新');
        this.load();
      },
      error: () => this.message.error('默认邮件配置更新失败'),
    });
  }

  protected disable(item: MessageEmailConfig): void {
    this.messagesService.disableEmailConfig(item.guid).subscribe({
      next: () => {
        this.message.success('邮件配置已禁用');
        this.load();
      },
      error: () => this.message.error('邮件配置禁用失败'),
    });
  }

  protected delete(item: MessageEmailConfig): void {
    this.messagesService.deleteEmailConfig(item.guid).subscribe({
      next: () => {
        this.message.success('邮件配置已删除');
        this.load();
      },
      error: () => this.message.error('邮件配置删除失败'),
    });
  }

  protected isDefault(item: MessageEmailConfig): boolean {
    return Boolean(item.isDefault ?? item.is_default);
  }

  protected sender(item: MessageEmailConfig): string {
    return item.fromEmail || item.from_email || '-';
  }

  protected senderName(item: MessageEmailConfig): string {
    return item.fromName || item.from_name || '发件名称未设置';
  }

  protected statusText(status: number): string {
    return status === 0 ? '禁用' : '启用';
  }

  protected statusColor(status: number): string {
    return status === 0 ? 'red' : 'green';
  }

  protected cardStateClass(item: MessageEmailConfig): string {
    if (item.status === 0) return 'message-email-disabled';
    if (this.isDefault(item)) return 'message-email-default';
    return 'message-email-enabled';
  }

  protected encryptionText(value: string): string {
    switch ((value || 'ssl').toLowerCase()) {
      case 'starttls':
        return 'STARTTLS';
      case 'none':
        return '无加密';
      default:
        return 'SSL/TLS';
    }
  }

  protected enabledCount(): number {
    return this.data.filter((item) => item.status !== 0).length;
  }

  protected defaultCount(): number {
    return this.data.filter((item) => this.isDefault(item)).length;
  }

  protected trackByGuid(index: number, item: MessageEmailConfig): string {
    return item.guid || String(index);
  }

  private normalize(item: MessageEmailConfig): MessageEmailConfig {
    return {
      ...item,
      fromEmail: item.fromEmail || item.from_email || '',
      fromName: item.fromName || item.from_name || '',
      isDefault: Boolean(item.isDefault ?? item.is_default),
      updateTime: item.updateTime ?? item.update_time,
    };
  }
}
