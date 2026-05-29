import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { ClientRelease, DevicesService } from '../../devices/devices.service';

@Component({
  selector: 'app-client-releases',
  templateUrl: './client-releases.component.html',
  styleUrls: ['../settings.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class ClientReleasesComponent implements OnInit {
  private readonly devicesService = inject(DevicesService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected uploading = false;
  protected releases: ClientRelease[] = [];
  protected total = 0;
  protected file?: File;

  @ViewChild('releaseFileInput')
  private readonly releaseFileInput?: ElementRef<HTMLInputElement>;

  protected q = {
    page: 1,
    size: 10,
    os: '',
    arch: '',
    status: '1',
  };

  protected readonly form = this.fb.group({
    version: ['', [Validators.required]],
    os: [''],
    arch: [''],
    downloadUrl: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    this.devicesService
      .clientReleases(this.q)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          this.releases = res.data ?? [];
          this.total = res.total ?? 0;
        },
        error: () => this.message.error('客户端发布列表加载失败'),
      });
  }

  protected resetSearch(): void {
    this.q = { page: 1, size: this.q.size, os: '', arch: '', status: '1' };
    this.load();
  }

  protected onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.[0];
    if (this.file && !this.form.controls.version.value) {
      this.form.controls.version.setValue(this.versionFromFileName(this.file.name));
    }
  }

  protected upload(): void {
    if (this.form.invalid || !this.file) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      if (!this.file) this.message.warning('请选择 navmesh-client 二进制文件');
      return;
    }
    const value = this.form.getRawValue();
    const payload = new FormData();
    payload.append('file', this.file);
    payload.append('version', value.version.trim());
    if (value.os.trim()) payload.append('os', value.os.trim());
    if (value.arch.trim()) payload.append('arch', value.arch.trim());
    if (value.downloadUrl.trim()) payload.append('downloadUrl', value.downloadUrl.trim());
    this.uploading = true;
    this.devicesService
      .uploadClientRelease(payload)
      .pipe(
        finalize(() => {
          this.uploading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.message.success('客户端二进制已上传');
          this.clearSelectedFile();
          this.form.patchValue({ downloadUrl: '' });
          this.load();
        },
        error: () => this.message.error('客户端二进制上传失败'),
      });
  }

  protected downloadHref(item: ClientRelease): string {
    return item.downloadUrl || `/api/downloads/${encodeURIComponent(item.fileName)}`;
  }

  protected statusText(status: number): string {
    return status === 1 ? '启用' : '禁用';
  }

  protected updateTime(item: ClientRelease): number {
    return item.updateTime || item.update_time || item.createTime || item.create_time || 0;
  }

  protected formatBytes(value: number): string {
    if (!value) return '0 B';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
    return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }

  private versionFromFileName(fileName: string): string {
    const match = fileName.match(/v\d+(?:\.\d+){1,3}(?:[-+][A-Za-z0-9._-]+)?/);
    return match?.[0] ?? '';
  }

  private clearSelectedFile(): void {
    this.file = undefined;
    if (this.releaseFileInput?.nativeElement) {
      this.releaseFileInput.nativeElement.value = '';
    }
  }
}
