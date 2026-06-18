import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS } from '@shared';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { Observable, finalize, forkJoin, map, of } from 'rxjs';

import { messageTypeLabel } from '../message-type-options';
import { MessageRecipient, MessageTemplate, MessagesService } from '../messages.service';

interface DebugModalData {
  templateCode?: string;
}

@Component({
  selector: 'app-message-send-debug',
  templateUrl: './message-send-debug.component.html',
  styleUrls: ['./message-send-debug.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS],
})
export class MessageSendDebugComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly messagesService = inject(MessagesService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly data = inject<DebugModalData | undefined>(NZ_MODAL_DATA);

  protected loading = false;
  protected submitting = false;
  protected templates: MessageTemplate[] = [];
  protected recipients: MessageRecipient[] = [];

  protected readonly form = this.fb.group({
    templateCode: [this.data?.templateCode ?? '', [Validators.required]],
    recipientGuids: [[] as string[], [Validators.required]],
  });

  ngOnInit(): void {
    this.loading = true;
    forkJoin({
      templates: this.messagesService.templates({ page: 1, size: 100, status: 1, channel: 'email' }),
      recipients: this.messagesService.recipients({ page: 1, size: 200, status: 1 }),
    }).subscribe({
      next: ({ templates, recipients }) => {
        this.templates = templates.data ?? [];
        this.recipients = (recipients.data ?? []).filter((item) => Boolean(item.email));
        if (!this.form.controls.templateCode.value && this.templates.length) {
          this.form.controls.templateCode.setValue(this.templates[0].code);
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  submit(): Observable<boolean> {
    if (this.submitting) {
      return of(false);
    }
    if (this.form.invalid) {
      this.markFormDirty(this.form.controls);
      return of(false);
    }
    this.submitting = true;
    const value = this.form.getRawValue();
    return this.messagesService
      .debugSend({
        templateCode: value.templateCode.trim(),
        recipientGuids: value.recipientGuids,
      })
      .pipe(
        map(() => true),
        finalize(() => {
          this.submitting = false;
          this.cdr.markForCheck();
        }),
      );
  }

  protected templateOptionLabel(item: MessageTemplate): string {
    return `${item.name || messageTypeLabel(item.code)} · ${item.code}`;
  }

  protected recipientOptionLabel(item: MessageRecipient): string {
    return `${item.name || item.email} · ${item.email}`;
  }

  private markFormDirty(controls: Record<string, AbstractControl>): void {
    Object.values(controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
  }
}
