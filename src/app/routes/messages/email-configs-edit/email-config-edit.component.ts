import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS } from '@shared';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { Observable, map, of } from 'rxjs';

import { MessageEmailConfig, MessagesService } from '../messages.service';

@Component({
  selector: 'app-email-config-edit',
  templateUrl: './email-config-edit.component.html',
  styleUrls: ['./email-config-edit.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS],
})
export class EmailConfigEditComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly messagesService = inject(MessagesService);
  protected readonly row = inject<MessageEmailConfig | undefined>(NZ_MODAL_DATA);

  protected readonly form = this.fb.group({
    name: [this.row?.name ?? '', [Validators.required]],
    host: [this.row?.host ?? '', [Validators.required]],
    port: [this.row?.port ?? 465, [Validators.required, Validators.min(1), Validators.max(65535)]],
    username: [this.row?.username ?? ''],
    password: [''],
    fromEmail: [this.firstText(this.row?.fromEmail, this.row?.from_email), [Validators.required, Validators.email]],
    fromName: [this.firstText(this.row?.fromName, this.row?.from_name, 'NavMesh')],
    encryption: [this.row?.encryption || 'ssl'],
    isDefault: [Boolean(this.row?.isDefault ?? this.row?.is_default)],
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
      .saveEmailConfig({
        guid: this.row?.guid,
        name: value.name.trim(),
        host: value.host.trim(),
        port: Number(value.port || 0),
        username: value.username.trim(),
        password: value.password.trim(),
        fromEmail: value.fromEmail.trim(),
        fromName: value.fromName.trim(),
        encryption: value.encryption,
        isDefault: value.isDefault,
        remark: value.remark.trim(),
        status: Number(value.status),
      })
      .pipe(map(() => true));
  }

  private markFormDirty(controls: Record<string, AbstractControl>): void {
    Object.values(controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
  }

  private firstText(...values: Array<string | undefined>): string {
    return values.find((value) => value !== undefined && value !== '') ?? '';
  }
}
