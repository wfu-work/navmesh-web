import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { NavMeshSetting, NavMeshSettingsService, RetentionCleanupResult } from '../settings.service';

@Component({
  selector: 'app-retention-settings',
  templateUrl: './retention-settings.component.html',
  styleUrls: ['../settings.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class RetentionSettingsComponent implements OnInit {
  private readonly settingsService = inject(NavMeshSettingsService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected saving = false;
  protected cleaning = false;
  protected settings: NavMeshSetting[] = [];
  protected cleanupResult?: RetentionCleanupResult;

  protected readonly form = this.fb.group({
    retention_cleanup_enabled: [true],
    retention_cleanup_interval: ['24h', [Validators.required]],
    audit_retention_days: [90, [Validators.required, Validators.min(0)]],
    http_access_retention_days: [30, [Validators.required, Validators.min(0)]],
    session_retention_days: [90, [Validators.required, Validators.min(0)]],
    heartbeat_retention_days: [7, [Validators.required, Validators.min(0)]],
    device_connection_retention_days: [30, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    this.settingsService
      .list()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (items) => {
          this.settings = items ?? [];
          this.patchForm();
        },
        error: () => this.message.error('数据保留策略加载失败'),
      });
  }

  protected save(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }
    const value = this.form.getRawValue();
    const requests = Object.entries(value).map(([key, item]) =>
      this.settingsService.save(key, this.stringifyValue(item)),
    );
    this.saving = true;
    forkJoin(requests)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.message.success('数据保留策略已保存');
          this.load();
        },
        error: () => this.message.error('数据保留策略保存失败'),
      });
  }

  protected cleanup(): void {
    this.cleaning = true;
    this.settingsService
      .cleanupRetention()
      .pipe(
        finalize(() => {
          this.cleaning = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (result) => {
          this.cleanupResult = result;
          this.message.success('保留策略清理已执行');
        },
        error: () => this.message.error('保留策略清理失败'),
      });
  }

  protected deletedTotal(): number {
    const result = this.cleanupResult;
    if (!result) return 0;
    return (
      result.auditLogs +
      result.httpAccessLogs +
      result.tunnelSessions +
      result.deviceHeartbeats +
      result.deviceConnections
    );
  }

  private patchForm(): void {
    this.form.patchValue({
      retention_cleanup_enabled: this.boolSetting('retention_cleanup_enabled', true),
      retention_cleanup_interval: this.setting('retention_cleanup_interval', '24h'),
      audit_retention_days: this.numberSetting('audit_retention_days', 90),
      http_access_retention_days: this.numberSetting('http_access_retention_days', 30),
      session_retention_days: this.numberSetting('session_retention_days', 90),
      heartbeat_retention_days: this.numberSetting('heartbeat_retention_days', 7),
      device_connection_retention_days: this.numberSetting('device_connection_retention_days', 30),
    });
  }

  private setting(key: string, fallback: string): string {
    return this.settings.find((item) => item.key === key)?.value ?? fallback;
  }

  private boolSetting(key: string, fallback: boolean): boolean {
    const value = this.setting(key, fallback ? 'true' : 'false').toLowerCase();
    return value === 'true' || value === '1' || value === 'yes' || value === 'on';
  }

  private numberSetting(key: string, fallback: number): number {
    const value = Number(this.setting(key, String(fallback)));
    return Number.isFinite(value) ? value : fallback;
  }

  private stringifyValue(value: string | number | boolean): string {
    return typeof value === 'boolean' ? String(value) : String(value).trim();
  }
}
