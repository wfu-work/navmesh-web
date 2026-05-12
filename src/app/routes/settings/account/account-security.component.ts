import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { NavMeshProfile, NavMeshSettingsService } from '../settings.service';

@Component({
  selector: 'app-account-security',
  templateUrl: './account-security.component.html',
  styleUrls: ['./account-security.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class AccountSecurityComponent implements OnInit {
  private readonly settingsService = inject(NavMeshSettingsService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected profile?: NavMeshProfile;
  protected loading = false;
  protected saving = false;

  protected readonly form = this.fb.group({
    oldPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    this.settingsService
      .profile()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (profile) => {
          this.profile = profile;
        },
        error: () => this.message.error('账号资料加载失败'),
      });
  }

  protected savePassword(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }
    const value = this.form.getRawValue();
    if (value.newPassword !== value.confirmPassword) {
      this.message.error('两次输入的新密码不一致');
      return;
    }
    this.saving = true;
    this.settingsService
      .changePassword({
        oldPassword: value.oldPassword,
        newPassword: value.newPassword,
      })
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.message.success('密码已更新');
          this.form.reset();
          this.load();
        },
        error: () => this.message.error('密码更新失败'),
      });
  }

  protected statusText(status: number | undefined): string {
    return status === 1 ? '启用' : '禁用';
  }

  protected timestamp(value: number | undefined): number {
    return value || 0;
  }
}
