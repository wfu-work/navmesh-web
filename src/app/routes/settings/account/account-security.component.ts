import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin, switchMap } from 'rxjs';
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
          this.profile = {
            ...profile,
            username: profile.username || profile.name || profile.nickName || '-',
            status: this.firstNumber(profile.status, profile.enable),
            createTime: this.timestamp(profile.createTime || profile.create_time),
            updateTime: this.timestamp(profile.updateTime || profile.update_time),
          };
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
    forkJoin({
      oldPassword: this.settingsService.encryptSecret(value.oldPassword),
      newPassword: this.settingsService.encryptSecret(value.newPassword),
    })
      .pipe(
        switchMap((payload) => this.settingsService.changePassword(payload)),
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.message.success('密码已更新，请使用新密码登录');
          this.form.reset();
          this.load();
        },
        error: (e) => this.message.error(e?.message || '密码更新失败，请检查当前密码是否正确'),
      });
  }

  protected statusText(status: number | undefined): string {
    if (status === undefined) return '-';
    return status === 1 ? '启用' : '禁用';
  }

  protected statusClass(status: number | undefined): string {
    if (status === undefined) return '';
    return status === 1 ? 'account-status-enabled' : 'account-status-disabled';
  }

  protected statusColor(status: number | undefined): string {
    if (status === undefined) return 'default';
    return status === 1 ? 'green' : 'red';
  }

  protected displayName(): string {
    return this.profile?.nickName || this.profile?.name || this.profile?.username || '-';
  }

  protected avatarSrc(): string {
    return this.profile?.avatar || 'assets/avatar.gif';
  }

  protected roleText(): string {
    const roles = this.profile?.roleCodeList ?? [];
    return roles.length ? roles.join(' / ') : '管理员';
  }

  protected passwordStrength(): number {
    const value = this.form.controls.newPassword.value;
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    return score;
  }

  protected passwordStrengthText(): string {
    const score = this.passwordStrength();
    if (!this.form.controls.newPassword.value) return '等待输入';
    if (score <= 1) return '偏弱';
    if (score <= 3) return '中等';
    return '较强';
  }

  protected passwordStrengthClass(): string {
    const score = this.passwordStrength();
    if (!this.form.controls.newPassword.value) return '';
    if (score <= 1) return 'strength-weak';
    if (score <= 3) return 'strength-medium';
    return 'strength-strong';
  }

  protected timestamp(value: number | undefined): number {
    return value || 0;
  }

  private firstNumber(...values: Array<number | undefined>): number {
    return values.find((value) => value !== undefined && value !== null) ?? 0;
  }
}
