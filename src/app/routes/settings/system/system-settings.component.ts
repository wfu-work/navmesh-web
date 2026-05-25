import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { NavMeshSetting, NavMeshSettingsService } from '../settings.service';

@Component({
  selector: 'app-system-settings',
  templateUrl: './system-settings.component.html',
  styleUrls: ['../settings.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class SystemSettingsComponent implements OnInit {
  private readonly settingsService = inject(NavMeshSettingsService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected saving = false;
  protected settings: NavMeshSetting[] = [];

  protected readonly form = this.fb.group({
    public_domain: ['', [Validators.required]],
    ssh_gateway_domain: ['', [Validators.required]],
    http_mapping_domain: ['', [Validators.required]],
    ssh_listen: ['', [Validators.required]],
    ssh_enabled: [true],
    http_listen: ['', [Validators.required]],
    http_mapping_enabled: [true],
    tunnel_listen: ['', [Validators.required]],
    tunnel_enabled: [true],
    allow_custom_domain: [true],
    default_ssh_port: [22, [Validators.required, Validators.min(1), Validators.max(65535)]],
    device_register_token: ['', [Validators.required]],
    session_idle_timeout: ['30m', [Validators.required]],
    max_concurrent_sessions: [0, [Validators.min(0)]],
    max_device_sessions: [0, [Validators.min(0)]],
    rate_limit_per_minute: [0, [Validators.min(0)]],
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
        error: () => this.message.error('系统配置加载失败'),
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
    const payload = Object.entries(value).map(([key, item]) =>
      this.settingsService.save(key, this.stringifyValue(item)),
    );
    this.saving = true;
    forkJoin(payload)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.message.success('系统配置已保存');
          this.load();
        },
        error: () => this.message.error('系统配置保存失败'),
      });
  }

  protected updatedAt(): number {
    return Math.max(...this.settings.map((item) => this.firstNumber(item.updateTime, item.update_time)), 0);
  }

  private patchForm(): void {
    this.form.patchValue({
      public_domain: this.setting('public_domain', 'navfirst.com'),
      ssh_gateway_domain: this.setting('ssh_gateway_domain', 'ssh.navfirst.com'),
      http_mapping_domain: this.setting('http_mapping_domain', 'qx.navfirst.com'),
      ssh_listen: this.setting('ssh_listen', ':22'),
      ssh_enabled: this.boolSetting('ssh_enabled', true),
      http_listen: this.setting('http_listen', ':8080'),
      http_mapping_enabled: this.boolSetting('http_mapping_enabled', true),
      tunnel_listen: this.setting('tunnel_listen', ':3008'),
      tunnel_enabled: this.boolSetting('tunnel_enabled', true),
      allow_custom_domain: this.boolSetting('allow_custom_domain', true),
      default_ssh_port: this.numberSetting('default_ssh_port', 22),
      device_register_token: this.setting('device_register_token', ''),
      session_idle_timeout: this.setting('session_idle_timeout', '30m'),
      max_concurrent_sessions: this.numberSetting('max_concurrent_sessions', 0),
      max_device_sessions: this.numberSetting('max_device_sessions', 0),
      rate_limit_per_minute: this.numberSetting('rate_limit_per_minute', 0),
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

  private firstNumber(...values: Array<number | undefined>): number {
    return values.find((value) => value !== undefined && value !== null) ?? 0;
  }
}
