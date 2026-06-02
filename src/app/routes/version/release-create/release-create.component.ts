import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadFile, NzUploadModule } from 'ng-zorro-antd/upload';
import { catchError, finalize, of } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { DeviceGroup, DevicesService } from '../../devices/devices.service';

type ReleaseType = 'rain' | 'hipnames' | 'dic' | 'navmesh';
type ReleasePlatform = { os: string; arch: string };

@Component({
  selector: 'app-release-create',
  templateUrl: './release-create.component.html',
  styleUrls: ['./release-create.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent, NzUploadModule],
})
export class ReleaseCreateComponent implements OnInit {
  private readonly devicesService = inject(DevicesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  protected uploading = false;
  protected loading = false;
  protected deviceTypes: DeviceGroup[] = [];
  protected file?: File;
  protected fileList: NzUploadFile[] = [];
  protected editingGuid = '';
  protected existingFileName = '';

  protected readonly releaseTypes: Array<{ label: string; value: ReleaseType; uploadTitle: string; uploadHint: string; tag: string }> = [
    {
      label: '北斗降雨水位版本',
      value: 'rain',
      uploadTitle: '上传北斗降雨水位软件包',
      uploadHint: '维护北斗降雨水位设备的软件、安装包或固件版本，支持保留多个历史版本用于下载。',
      tag: 'Rain',
    },
    {
      label: '单机版版本',
      value: 'hipnames',
      uploadTitle: '上传单机版软件包',
      uploadHint: '维护单机版设备的软件、安装包或固件版本，支持保留多个历史版本用于下载。',
      tag: 'Hipnames',
    },
    {
      label: '视觉位移版本',
      value: 'dic',
      uploadTitle: '上传视觉位移软件包',
      uploadHint: '维护视觉位移设备的软件、安装包或固件版本，支持保留多个历史版本用于下载。',
      tag: 'Dic',
    },
    {
      label: '边缘客户端版本',
      value: 'navmesh',
      uploadTitle: '上传边缘客户端',
      uploadHint: '文件名建议使用 navmesh-client-linux-amd64 这类格式；未填写系统和架构时会从文件名自动识别。',
      tag: 'Navmesh',
    },
  ];

  protected readonly form = this.fb.group({
    releaseType: ['rain' as ReleaseType, [Validators.required]],
    version: ['', [Validators.required]],
    deviceType: ['all'],
    os: [''],
    arch: [''],
    downloadUrl: [''],
    changeLog: [''],
  });

  ngOnInit(): void {
    this.editingGuid = this.route.snapshot.paramMap.get('guid') || '';
    if (!this.editingGuid) {
      const releaseType = this.releaseTypeFromQuery(this.route.snapshot.queryParamMap.get('releaseType'));
      this.form.controls.releaseType.setValue(releaseType);
    }
    this.form.controls.releaseType.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.setDefaultDeviceType(value);
    });
    this.loadDeviceTypes();
    if (this.editingGuid) {
      this.loadRelease();
    }
  }

  protected pageTitle(): string {
    return this.editingGuid ? '编辑版本' : '新建版本';
  }

  protected pageDescription(): string {
    return this.editingGuid
      ? '维护版本号、设备类型、平台、更新内容，必要时可重新选择软件包替换安装文件。'
      : '上传北斗降雨水位、单机版、视觉位移或边缘客户端安装包，保存后可在版本列表中下载历史版本。';
  }

  protected currentType(): (typeof this.releaseTypes)[number] {
    const releaseType = this.form.controls.releaseType.value;
    return this.releaseTypes.find((item) => item.value === releaseType) ?? this.releaseTypes[0];
  }

  protected beforeUpload = (file: NzUploadFile): boolean => {
    this.fileList = [file];
    this.file = this.rawFile(file);
    if (this.file) {
      if (!this.form.controls.version.value) {
        this.form.controls.version.setValue(this.versionFromFileName(this.file.name));
      }
      this.applyDetectedPlatform(this.platformFromFileName(this.file.name));
      void this.platformFromFile(this.file).then((platform) => {
        this.applyDetectedPlatform(platform);
        this.cdr.markForCheck();
      });
      this.cdr.markForCheck();
    }
    return false;
  };

  protected removeFile = (): boolean => {
    this.fileList = [];
    this.file = undefined;
    return true;
  };

  protected upload(): void {
    if (this.form.invalid || (!this.editingGuid && !this.file)) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      if (!this.file && !this.editingGuid) this.message.warning('请选择软件包文件');
      return;
    }
    const value = this.form.getRawValue();
    const payload = new FormData();
    if (this.file) payload.append('file', this.file);
    payload.append('releaseType', value.releaseType);
    payload.append('version', this.cleanValue(value.version));
    payload.append('deviceType', this.cleanValue(value.deviceType) || 'all');
    payload.append('os', this.cleanValue(value.os));
    payload.append('arch', this.cleanValue(value.arch));
    if (this.cleanValue(value.downloadUrl)) payload.append('downloadUrl', this.cleanValue(value.downloadUrl));
    if (this.cleanValue(value.changeLog)) payload.append('changeLog', this.cleanValue(value.changeLog));

    this.uploading = true;
    const request = this.editingGuid ? this.devicesService.updateRelease(this.editingGuid, payload) : this.devicesService.uploadRelease(payload);
    request
      .pipe(
        finalize(() => {
          this.uploading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.message.success(this.editingGuid ? '版本已保存' : '版本包已上传');
          this.router.navigate(['/version/release'], { queryParams: { releaseType: value.releaseType } });
        },
        error: () => this.message.error(this.editingGuid ? '版本保存失败' : '版本包上传失败'),
      });
  }

  protected cancel(): void {
    this.router.navigate(['/version/release'], { queryParams: { releaseType: this.form.controls.releaseType.value } });
  }

  private loadDeviceTypes(): void {
    this.devicesService
      .groups({ page: 1, size: 200, status: 1, all: true })
      .pipe(catchError(() => of({ data: [], total: 0, page: 1, size: 200 })))
      .subscribe((res) => {
        this.deviceTypes = res.data ?? [];
        if (!this.editingGuid) {
          this.setDefaultDeviceType(this.form.controls.releaseType.value);
        }
        this.cdr.markForCheck();
      });
  }

  private loadRelease(): void {
    this.loading = true;
    this.devicesService
      .release(this.editingGuid)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (item) => {
          const releaseType = this.releaseTypeFromQuery(item.releaseType || item.release_type || 'rain');
          this.existingFileName = item.fileName || '';
          this.form.patchValue(
            {
              releaseType,
              version: item.version || '',
              deviceType: item.deviceType || item.device_type || 'all',
              os: item.os || 'all',
              arch: item.arch || 'all',
              downloadUrl: item.downloadUrl || '',
              changeLog: item.changeLog || item.change_log || '',
            },
            { emitEvent: false },
          );
        },
        error: () => this.message.error('版本详情加载失败'),
      });
  }

  private setDefaultDeviceType(releaseType: ReleaseType): void {
    const deviceType = this.findDeviceTypeValue(releaseType);
    this.form.controls.deviceType.setValue(deviceType, { emitEvent: false });
  }

  private findDeviceTypeValue(releaseType: ReleaseType): string {
    const item = this.deviceTypes.find((type) => {
      const values = [type.key, type.group_key, type.guid, type.name]
        .map((value) => `${value ?? ''}`.trim().toLowerCase())
        .filter(Boolean);
      return values.includes(releaseType);
    });
    return item?.key || item?.group_key || item?.guid || 'all';
  }

  private releaseTypeFromQuery(value: string | null): ReleaseType {
    switch (value) {
      case 'rain':
      case 'device_software':
        return 'rain';
      case 'hipnames':
      case 'standalone':
        return 'hipnames';
      case 'dic':
      case 'visual_displacement':
        return 'dic';
      case 'navmesh':
      case 'navmesh_client':
        return 'navmesh';
      default:
        return 'rain';
    }
  }

  private versionFromFileName(fileName: string): string {
    const match = fileName.match(/v\d+(?:\.\d+){1,3}(?:[-+][A-Za-z0-9._-]+)?/);
    return match?.[0] ?? '';
  }

  private platformFromFileName(fileName: string): ReleasePlatform {
    const normalized = fileName.toLowerCase();
    const osAliases: Record<string, string> = {
      linux: 'linux',
      darwin: 'darwin',
      macos: 'darwin',
      osx: 'darwin',
      windows: 'windows',
      win32: 'windows',
      win64: 'windows',
    };
    const archAliases: Record<string, string> = {
      amd64: 'amd64',
      x86_64: 'amd64',
      x64: 'amd64',
      arm64: 'arm64',
      aarch64: 'arm64',
      armv8: 'arm64',
    };
    const os = this.matchAlias(normalized, osAliases);
    const arch = this.matchAlias(normalized, archAliases);
    return {
      os,
      arch,
    };
  }

  private matchAlias(fileName: string, aliases: Record<string, string>): string {
    const keys = Object.keys(aliases).sort((a, b) => b.length - a.length);
    const match = keys.find((key) => new RegExp(`(^|[^a-z0-9])${this.escapeRegExp(key)}([^a-z0-9]|$)`).test(fileName));
    return match ? aliases[match] : '';
  }

  private async platformFromFile(file: File): Promise<ReleasePlatform> {
    try {
      const bytes = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
      return this.platformFromBinary(bytes);
    } catch {
      return { os: '', arch: '' };
    }
  }

  private platformFromBinary(bytes: Uint8Array): ReleasePlatform {
    if (bytes.length >= 20 && bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) {
      const littleEndian = bytes[5] !== 2;
      return { os: 'linux', arch: this.archFromElfMachine(this.uint16(bytes, 18, littleEndian)) };
    }

    if (bytes.length >= 64 && bytes[0] === 0x4d && bytes[1] === 0x5a) {
      const peOffset = this.uint32(bytes, 0x3c, true);
      if (peOffset + 6 <= bytes.length && bytes[peOffset] === 0x50 && bytes[peOffset + 1] === 0x45 && bytes[peOffset + 2] === 0 && bytes[peOffset + 3] === 0) {
        return { os: 'windows', arch: this.archFromPeMachine(this.uint16(bytes, peOffset + 4, true)) };
      }
    }

    if (bytes.length >= 8) {
      const magicBE = this.uint32(bytes, 0, false);
      const magicLE = this.uint32(bytes, 0, true);
      if (magicBE === 0xcafebabe || magicLE === 0xcafebabe) {
        return this.platformFromFatMachO(bytes, magicBE === 0xcafebabe);
      }
      if ([0xfeedface, 0xfeedfacf].includes(magicBE)) {
        return { os: 'darwin', arch: this.archFromMachOCpu(this.uint32(bytes, 4, false)) };
      }
      if ([0xfeedface, 0xfeedfacf].includes(magicLE)) {
        return { os: 'darwin', arch: this.archFromMachOCpu(this.uint32(bytes, 4, true)) };
      }
    }

    return { os: '', arch: '' };
  }

  private platformFromFatMachO(bytes: Uint8Array, bigEndian: boolean): ReleasePlatform {
    const count = Math.min(this.uint32(bytes, 4, !bigEndian), 8);
    const archs = new Set<string>();
    for (let index = 0; index < count; index++) {
      const offset = 8 + index * 20;
      if (offset + 4 > bytes.length) break;
      const arch = this.archFromMachOCpu(this.uint32(bytes, offset, !bigEndian));
      if (arch) archs.add(arch);
    }
    if (archs.size > 1) return { os: 'darwin', arch: 'all' };
    return { os: 'darwin', arch: [...archs][0] || '' };
  }

  private applyDetectedPlatform(platform: ReleasePlatform): void {
    if (platform.os && this.shouldAutofillPlatform(this.form.controls.os.value)) {
      this.form.controls.os.setValue(platform.os);
    }
    if (platform.arch && this.shouldAutofillPlatform(this.form.controls.arch.value)) {
      this.form.controls.arch.setValue(platform.arch);
    }
  }

  private shouldAutofillPlatform(value: unknown): boolean {
    const text = this.cleanValue(value);
    return !text || text === 'all';
  }

  private archFromElfMachine(machine: number): string {
    if (machine === 62) return 'amd64';
    if (machine === 183) return 'arm64';
    return '';
  }

  private archFromPeMachine(machine: number): string {
    if (machine === 0x8664) return 'amd64';
    if (machine === 0xaa64) return 'arm64';
    return '';
  }

  private archFromMachOCpu(cpuType: number): string {
    if (cpuType === 0x01000007) return 'amd64';
    if (cpuType === 0x0100000c) return 'arm64';
    return '';
  }

  private uint16(bytes: Uint8Array, offset: number, littleEndian: boolean): number {
    if (offset + 2 > bytes.length) return 0;
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, littleEndian);
  }

  private uint32(bytes: Uint8Array, offset: number, littleEndian: boolean): number {
    if (offset + 4 > bytes.length) return 0;
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, littleEndian);
  }

  private cleanValue(value: unknown): string {
    return `${value ?? ''}`.trim();
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private rawFile(file: NzUploadFile): File {
    return (file.originFileObj ?? file) as File;
  }
}
