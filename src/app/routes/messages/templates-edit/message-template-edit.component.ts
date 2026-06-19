import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { debounceTime, finalize } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { MessageTemplate, MessagesService } from '../messages.service';

interface TemplatePreset {
  code: string;
  label: string;
  subject: string;
  content: string;
  description: string;
}

type PreviewMode = 'desktop' | 'mobile';

@Component({
  selector: 'app-message-template-edit',
  templateUrl: './message-template-edit.component.html',
  styleUrls: ['./message-template-edit.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class MessageTemplateEditComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly messagesService = inject(MessagesService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);
  private previewRequestSeq = 0;
  private previewObjectUrl = '';

  protected readonly identity = this.route.snapshot.paramMap.get('identity') ?? this.route.snapshot.paramMap.get('guid') ?? '';
  protected readonly subjectPlaceholder = '例如 {{deviceAlias}} 已离线';
  protected readonly contentPlaceholder = '支持纯文本或 HTML，可使用 {{eventTitle}}、{{deviceAlias}}、{{downloadUrl}} 等变量';
  protected readonly templatePresets: TemplatePreset[] = [
    {
      code: 'release_published_notice',
      label: '版本发布通知',
      subject: '{{releaseType}} {{version}} 已发布',
      content:
        '<p>有新的 {{releaseType}} 版本发布，适用范围：{{deviceScope}}，目标平台：{{platform}}。</p><p>更新说明：{{changeLog}}</p><p>下载地址：{{downloadUrl}}</p>',
      description: '版本管理发布新版本后自动发送，模板编码不要修改。',
    },
    {
      code: 'device_offline_notice',
      label: '设备离线通知',
      subject: '{{deviceAlias}} 已离线',
      content:
        '<p>设备 {{deviceAlias}} 已超过心跳阈值未上报，请尽快检查现场网络、电源和客户端进程。</p><p>设备编号：{{deviceSncode}}，设备类型：{{deviceType}}，最后在线：{{lastSeenTime}}</p><p>事件说明：{{eventMessage}}</p>',
      description: '设备心跳超时离线后发送，可用于通知运维人员排查现场网络、电源或客户端状态。',
    },
    {
      code: 'disk_usage_high_notice',
      label: '磁盘阈值通知',
      subject: '{{deviceAlias}} 磁盘使用率达到 {{diskUsedPct}}%',
      content:
        '<p>设备 {{deviceAlias}} 的磁盘使用率已达到 {{diskUsedPct}}%，超过 {{diskThreshold}}% 告警阈值，请及时清理日志、数据文件或扩容磁盘。</p><p>设备编号：{{deviceSncode}}，设备类型：{{deviceType}}</p><p>磁盘使用：已用 {{diskUsed}} / 总量 {{diskTotal}}，剩余 {{diskFree}}</p><p>事件说明：{{eventMessage}}</p>',
      description: '设备心跳上报磁盘使用率达到告警阈值后发送，同一设备每天最多触发一次。',
    },
  ];
  protected readonly variableGroups = [
    {
      title: '通用事件',
      items: [
        { token: '{{eventTitle}}', label: '事件标题' },
        { token: '{{eventMessage}}', label: '事件正文' },
        { token: '{{time}}', label: '事件发生时间' },
        { token: '{{deviceSncode}}', label: '设备编号' },
        { token: '{{deviceAlias}}', label: '设备别名或设备号' },
        { token: '{{deviceType}}', label: '设备类型' },
        { token: '{{hostIp}}', label: '内网地址' },
        { token: '{{wanIp}}', label: '公网地址' },
        { token: '{{clientVersion}}', label: '客户端版本' },
        { token: '{{lastSeenTime}}', label: '最后在线时间' },
      ],
    },
    {
      title: '版本发布',
      items: [
        { token: '{{releaseType}}', label: '版本类型' },
        { token: '{{version}}', label: '版本号' },
        { token: '{{platform}}', label: '目标平台' },
        { token: '{{os}}', label: '目标系统' },
        { token: '{{arch}}', label: '目标架构' },
        { token: '{{deviceScope}}', label: '适用设备' },
        { token: '{{fileName}}', label: '安装包文件名' },
        { token: '{{downloadUrl}}', label: '下载地址' },
        { token: '{{changeLog}}', label: '更新说明' },
        { token: '{{publishedAt}}', label: '发布时间' },
        { token: '{{releaseGuid}}', label: '版本标识' },
        { token: '{{releaseSize}}', label: '文件大小' },
      ],
    },
    {
      title: '磁盘阈值',
      items: [
        { token: '{{diskUsedPct}}', label: '磁盘使用率' },
        { token: '{{diskThreshold}}', label: '告警阈值' },
        { token: '{{diskUsed}}', label: '磁盘已用' },
        { token: '{{diskFree}}', label: '磁盘剩余' },
        { token: '{{diskTotal}}', label: '磁盘总量' },
      ],
    },
  ];
  protected loading = false;
  protected saving = false;
  protected previewLoading = false;
  protected previewSubject = '';
  protected previewHtml = '';
  protected previewUrl?: SafeResourceUrl;
  protected previewError = '';
  protected previewMode: PreviewMode = 'desktop';
  protected template?: MessageTemplate;

  protected readonly form = this.fb.group({
    code: ['', [Validators.required]],
    channel: ['email'],
    subject: ['', [Validators.required]],
    content: ['', [Validators.required]],
    description: [''],
    status: [1],
  });

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.clearPreviewUrl());
    this.form.valueChanges.pipe(debounceTime(500), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadPreview();
    });
    if (this.identity) {
      this.load();
    } else {
      this.applyTemplatePreset(this.templatePresets[0]);
    }
  }

  protected pageTitle(): string {
    return this.identity ? '编辑消息模板' : '新增消息模板';
  }

  protected pageDescription(): string {
    return this.identity
      ? '维护邮件通知模板的主题、正文变量和启用状态，保存后新通知将按最新内容发送。'
      : '新建邮件通知模板，可用于设备离线、版本发布等事件通知。';
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.markFormDirty(this.form.controls);
      return;
    }
    const value = this.form.getRawValue();
    this.saving = true;
    this.messagesService
      .saveTemplate({
        guid: this.template?.guid,
        code: value.code.trim(),
        name: this.templateName(value.code),
        channel: value.channel,
        subject: value.subject.trim(),
        content: value.content.trim(),
        description: value.description.trim(),
        status: Number(value.status),
      })
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.message.success('消息模板已保存');
          this.back();
        },
        error: (error) => this.message.error(error?.message || '消息模板保存失败'),
      });
  }

  protected back(): void {
    this.router.navigate(['/messages/templates']);
  }

  protected refreshPreview(): void {
    this.loadPreview();
  }

  protected setPreviewMode(mode: PreviewMode): void {
    this.previewMode = mode;
  }

  protected applySelectedTemplate(code: string): void {
    if (this.identity) return;
    const preset = this.templatePresets.find((item) => item.code === code);
    if (!preset) return;
    this.applyTemplatePreset(preset);
  }

  protected selectedPreset(): TemplatePreset {
    return this.templatePresets.find((item) => item.code === this.form.controls.code.value) ?? this.templatePresets[0];
  }

  private templateName(code: string): string {
    return this.templatePresets.find((item) => item.code === code)?.label ?? code.trim();
  }

  private load(): void {
    this.loading = true;
    this.messagesService
      .template(this.identity)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (item) => {
          this.template = item;
          this.form.patchValue({
            code: item.code || '',
            channel: item.channel || 'email',
            subject: item.subject || '',
            content: item.content || '',
            description: item.description || '',
            status: Number(item.status ?? 1),
          });
        },
        error: () => this.message.error('消息模板详情加载失败'),
      });
  }

  private loadPreview(): void {
    const value = this.form.getRawValue();
    const code = value.code.trim();
    const subject = value.subject.trim();
    const content = value.content.trim();
    const requestSeq = ++this.previewRequestSeq;
    if (!code || !subject || !content) {
      this.previewSubject = '';
      this.previewHtml = '';
      this.clearPreviewUrl();
      this.previewError = '';
      this.previewLoading = false;
      this.cdr.markForCheck();
      return;
    }
    this.previewLoading = true;
    this.previewError = '';
    this.messagesService
      .previewTemplate({ code, subject, content })
      .pipe(
        finalize(() => {
          if (requestSeq === this.previewRequestSeq) {
            this.previewLoading = false;
            this.cdr.markForCheck();
          }
        }),
      )
      .subscribe({
        next: (result) => {
          if (requestSeq !== this.previewRequestSeq) return;
          this.previewSubject = result.subject || subject;
          this.setPreviewHtml(result.html || '');
          this.previewError = '';
        },
        error: (error) => {
          if (requestSeq !== this.previewRequestSeq) return;
          this.previewSubject = '';
          this.previewHtml = '';
          this.clearPreviewUrl();
          this.previewError = error?.message || '邮件预览生成失败';
        },
      });
  }

  private setPreviewHtml(html: string): void {
    this.previewHtml = html;
    this.clearPreviewUrl();
    if (!html) return;
    this.previewObjectUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewObjectUrl);
  }

  private clearPreviewUrl(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = '';
    }
    this.previewUrl = undefined;
  }

  private applyTemplatePreset(preset: TemplatePreset): void {
    this.form.patchValue({
      code: preset.code,
      channel: 'email',
      subject: preset.subject,
      content: preset.content,
      description: preset.description,
    });
  }

  private markFormDirty(controls: Record<string, AbstractControl>): void {
    Object.values(controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
  }
}
