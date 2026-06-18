import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS } from '@shared';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { Observable, map, of } from 'rxjs';

import { MESSAGE_TYPE_OPTIONS, normalizeMessageTypes } from '../message-type-options';
import { MessageRecipient, MessagesService } from '../messages.service';

@Component({
  selector: 'app-message-recipient-edit',
  templateUrl: './recipient-edit.component.html',
  styleUrls: ['./recipient-edit.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS],
})
export class RecipientEditComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly messagesService = inject(MessagesService);
  protected readonly row = inject<MessageRecipient | undefined>(NZ_MODAL_DATA);
  protected readonly messageTypeOptions = MESSAGE_TYPE_OPTIONS;

  protected readonly form = this.fb.group({
    name: [this.row?.name ?? '', [Validators.required]],
    email: [this.row?.email ?? '', [Validators.required, Validators.email]],
    messageTypes: [this.initialMessageTypes(), [Validators.required]],
    tags: [this.row?.tags ?? ''],
    remark: [this.row?.remark ?? ''],
    status: [this.row?.status ?? 1],
  });

  submit(): Observable<boolean> {
    if (this.form.invalid) {
      this.markFormDirty(this.form.controls);
      return of(false);
    }
    const value = this.form.getRawValue();
    return this.messagesService
      .saveRecipient({
        guid: this.row?.guid,
        name: value.name.trim(),
        email: value.email.trim(),
        messageTypes: value.messageTypes.join(','),
        tags: value.tags.trim(),
        remark: value.remark.trim(),
        status: Number(value.status),
      })
      .pipe(map(() => true));
  }

  private initialMessageTypes(): string[] {
    if (!this.row) {
      return normalizeMessageTypes();
    }
    return normalizeMessageTypes(this.row.messageTypes || this.row.message_types);
  }

  private markFormDirty(controls: Record<string, AbstractControl>): void {
    Object.values(controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
  }
}
