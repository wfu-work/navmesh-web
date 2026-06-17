import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { environment } from '@env/environment';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { catchError, finalize, of } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { DeviceGroup, DevicesService, Release } from '../../devices/devices.service';

type ReleaseType = 'rain' | 'hipnames' | 'dic' | 'navmesh';

@Component({
  selector: 'app-release',
  templateUrl: './release.component.html',
  styleUrls: ['../../settings/settings.component.less', './release.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent, NgClass],
})
export class ReleaseComponent implements OnInit {
  private readonly devicesService = inject(DevicesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected releases: Release[] = [];
  protected deviceTypes: DeviceGroup[] = [];
  protected total = 0;
  protected activeTabIndex = 0;
  protected activeReleaseType: ReleaseType = 'rain';

  protected readonly rainInstallPaths = [
    '/mnt/navfirst/nav-rain-go',
    '/etc/systemd/system/raind.service',
    'raind',
  ];

  protected readonly hipnamesInstallPaths = [
    '/mnt/navfirst/nav-hipnames',
    '/etc/systemd/system/hipnames.service',
    'hipnames',
  ];

  protected readonly statusTag: STColumnTag = {
    1: { text: '启用', color: 'green' },
    0: { text: '禁用', color: 'default' },
  };

  protected readonly releaseTabs: Array<{ label: string; value: ReleaseType }> = [
    {
      label: '北斗降雨水位版本',
      value: 'rain',
    },
    {
      label: '单机版版本',
      value: 'hipnames',
    },
    {
      label: '视觉位移版本',
      value: 'dic',
    },
    {
      label: '边缘客户端版本',
      value: 'navmesh',
    },
  ];

  protected readonly columns: STColumn<Release>[] = [
    { title: '文件', index: 'fileName', render: 'fileRender', fixed: 'left', width: 360 },
    { title: '设备类型', index: 'deviceType', render: 'deviceTypeRender', width: 120 },
    { title: '版本', index: 'version', render: 'versionRender', width: 130 },
    { title: '平台', index: 'os', render: 'platformRender', width: 180 },
    { title: '更新内容', index: 'changeLog', render: 'changeLogRender', width: 300 },
    { title: '大小', index: 'size', render: 'sizeRender', width: 110 },
    { title: '状态', index: 'status', type: 'tag', tag: this.statusTag, width: 100 },
    { title: '更新时间', index: 'updateTime', render: 'timeRender', width: 180 },
    {
      title: '操作',
      fixed: 'right',
      width: 220,
      buttons: [
        {
          icon: 'edit',
          click: (item) => this.router.navigate(['/version/release/edit', item.guid]),
        },
        {
          icon: 'cloud-upload',
          iif: (item) => this.canBatchUpgrade(item),
          click: (item) => this.openBatchUpgrade(item),
        },
        {
          icon: 'check-circle',
          iif: (item) => item.status === 0,
          click: (item) => this.enable(item),
          pop: {
            title: '启用后该版本可被下载和下发升级，确认继续？',
            okType: 'primary',
            icon: 'check-circle',
          },
        },
        {
          icon: 'stop',
          className: 'text-error',
          iif: (item) => item.status !== 0,
          click: (item) => this.disable(item),
          pop: {
            title: '禁用后该版本不能继续下载和下发升级，确认继续？',
            okType: 'danger',
            icon: 'stop',
          },
        },
        {
          icon: 'delete',
          className: 'text-error',
          click: (item) => this.delete(item),
          pop: {
            title: '删除后该版本记录将从列表移除，确认继续？',
            okType: 'danger',
            icon: 'delete',
          },
        },
        {
          icon: 'download',
          click: (item) => this.openDownload(item),
        },
      ],
    },
  ];

  protected q = {
    releaseType: this.activeReleaseType,
    page: 1,
    size: 10,
    deviceType: '',
    version: '',
    os: '',
    arch: '',
    status: '',
  };

  ngOnInit(): void {
    this.useReleaseType(this.route.snapshot.queryParamMap.get('releaseType'));
    this.loadDeviceTypes();
    this.load();
  }

  protected load(): void {
    this.loading = true;
    this.devicesService
      .releases(this.q)
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
        error: () => this.message.error('版本列表加载失败'),
      });
  }

  protected tableChange(event: STChange): void {
    switch (event.type) {
      case 'pi':
      case 'ps':
      case 'filter':
      case 'sort':
        this.q.page = event.pi;
        this.q.size = event.ps;
        this.load();
        break;
      default:
        break;
    }
  }

  protected resetSearch(): void {
    this.q = {
      releaseType: this.activeReleaseType,
      page: 1,
      size: this.q.size,
      deviceType: '',
      version: '',
      os: '',
      arch: '',
      status: '',
    };
    this.load();
  }

  protected switchReleaseType(index: number): void {
    const tab = this.releaseTabs[index] ?? this.releaseTabs[0];
    this.useReleaseType(tab.value);
    this.resetSearch();
  }

  protected downloadHref(item: Release): string {
    if (item.downloadUrl) return item.downloadUrl;
    const baseUrl = `${environment.api.baseUrl || ''}`.replace(/\/$/, '');
    return `${baseUrl}/downloads/releases/${encodeURIComponent(item.guid)}`;
  }

  protected openDownload(item: Release): void {
    window.open(this.downloadHref(item), '_blank', 'noopener');
  }

  protected openBatchUpgrade(item: Release): void {
    this.router.navigate(['/version/release/upgrade', item.guid]);
  }

  protected canBatchUpgrade(item: Release): boolean {
    const releaseType = this.normalizeReleaseType(
      this.firstText(item.releaseType, item.release_type, this.activeReleaseType),
    );
    return item.status === 1 && (releaseType === 'navmesh' || releaseType === 'rain');
  }

  protected onCopyRainInstallCommand(copied: boolean, label = 'raind在线安装命令'): void {
    if (copied) {
      this.message.success(`${label}已复制`);
    }
  }

  protected get rainInstallSimpleCommand(): string {
    return `curl -fsSL ${this.downloadBase}/install-rain.sh | sudo sh`;
  }

  protected get rainOfflineInstallCommand(): string {
    return 'sudo ./install-rain.sh --exe-file ./navRainApp --skip-deps';
  }

  protected get rainInstallScriptHref(): string {
    return `${this.downloadBase}/install-rain.sh`;
  }

  protected get hipnamesInstallSimpleCommand(): string {
    return `curl -fsSL ${this.downloadBase}/install-hipnames.sh | sudo sh`;
  }

  protected get hipnamesOfflineInstallCommand(): string {
    return 'sudo ./install-hipnames.sh --exe-file ./navHipnames';
  }

  protected get hipnamesInstallScriptHref(): string {
    return `${this.downloadBase}/install-hipnames.sh`;
  }

  protected currentTab(): (typeof this.releaseTabs)[number] {
    return this.releaseTabs[this.activeTabIndex] ?? this.releaseTabs[0];
  }

  protected releaseTypeText(item: Release): string {
    const value = this.firstText(item.releaseType, item.release_type, 'navmesh');
    const map: Record<string, string> = {
      rain: '北斗降雨水位',
      hipnames: '单机版',
      dic: '视觉位移',
      navmesh: '边缘客户端',
      device_software: '北斗降雨水位',
      standalone: '单机版',
      visual_displacement: '视觉位移',
      navmesh_client: '边缘客户端',
    };
    return map[value] ?? value;
  }

  protected versionText(item: Release): string {
    return this.firstText(item.version, '-');
  }

  protected deviceTypeText(value?: string): string {
    value = this.firstText(value);
    if (!value || value === 'all') return '全部设备';
    const item = this.deviceTypes.find((type) => type.key === value || type.guid === value);
    return item?.name || value;
  }

  protected releaseChangeLog(item: Release): string {
    return this.firstText(item.changeLog, item.change_log);
  }

  protected releaseChangeTitle(item: Release): string {
    const text = this.releaseChangeLog(item).replace(/\s+/g, ' ').trim();
    if (!text) return '暂无更新说明';
    const version = this.versionText(item);
    const normalized = text.replace(/^v?[\w.-]+\s*版本更新说明\s*/i, '').trim();
    const [beforeDate] = normalized.split(/发布日期\s*[:：]/);
    const title = beforeDate.replace(/[，,。;；:：]+$/, '').trim();
    return title || `${version} 更新说明`;
  }

  protected releaseChangeMeta(item: Release): string {
    const text = this.releaseChangeLog(item);
    const date = text.match(/发布日期\s*[:：]\s*([^，,。；;\s]+)/)?.[1];
    if (date) return `发布日期 ${date}`;
    return '';
  }

  protected platformText(item: Release): string {
    const os = this.firstText(item.os);
    const arch = this.firstText(item.arch);
    if ((!os || os === 'all') && (!arch || arch === 'all')) return '全部平台';
    return `${os && os !== 'all' ? os : '全部系统'}/${arch && arch !== 'all' ? arch : '全部架构'}`;
  }

  protected platformOs(item: Release): string {
    return this.firstText(item.os, 'all').toLowerCase();
  }

  protected platformArch(item: Release): string {
    return this.firstText(item.arch, 'all').toLowerCase();
  }

  protected platformMark(item: Release): string {
    const map: Record<string, string> = {
      linux: 'linux',
      darwin: 'macos',
      macos: 'macos',
      windows: 'windows',
      all: 'all',
    };
    return map[this.platformOs(item)] ?? this.platformOs(item);
  }

  protected platformOsLabel(item: Release): string {
    const map: Record<string, string> = {
      linux: 'linux',
      darwin: 'macos',
      macos: 'macos',
      windows: 'windows',
      all: '全部系统',
    };
    return map[this.platformOs(item)] ?? this.platformOs(item);
  }

  protected platformIconSrc(item: Release): string {
    const map: Record<string, string> = {
      linux: 'linux',
      darwin: 'macos',
      macos: 'macos',
      windows: 'windows',
    };
    const icon = map[this.platformOs(item)];
    return icon ? `assets/icons/${icon}.svg` : '';
  }

  protected platformArchLabel(item: Release): string {
    const map: Record<string, string> = {
      amd64: 'x64',
      arm64: 'ARM64',
      all: '全部架构',
    };
    return map[this.platformArch(item)] ?? this.platformArch(item);
  }

  protected platformClass(item: Release): string {
    const os = this.platformOs(item);
    if (['linux', 'darwin', 'macos', 'windows'].includes(os)) return `release-platform-${os}`;
    return 'release-platform-all';
  }

  protected shortSha(value?: string): string {
    const text = this.firstText(value);
    if (!text) return 'SHA -';
    return text.length > 18 ? `SHA ${text.slice(0, 12)}...${text.slice(-6)}` : `SHA ${text}`;
  }

  protected updateTime(item: Release): number {
    return item.updateTime || item.update_time || item.createTime || item.create_time || 0;
  }

  protected formatBytes(value: number): string {
    if (!value) return '0 B';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
    return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }

  protected enable(item: Release): void {
    this.devicesService.enableRelease(item.guid).subscribe({
      next: () => {
        this.message.success('版本已启用');
        this.load();
      },
      error: () => this.message.error('版本启用失败'),
    });
  }

  protected disable(item: Release): void {
    this.devicesService.disableRelease(item.guid).subscribe({
      next: () => {
        this.message.success('版本已禁用');
        this.load();
      },
      error: () => this.message.error('版本禁用失败'),
    });
  }

  protected delete(item: Release): void {
    this.devicesService.deleteRelease(item.guid).subscribe({
      next: () => {
        this.message.success('版本已删除');
        this.load();
      },
      error: (error) => this.message.error(error?.msg || error?.message || '版本删除失败'),
    });
  }

  private loadDeviceTypes(): void {
    this.devicesService
      .groups({ page: 1, size: 200, status: 1, all: true })
      .pipe(catchError(() => of({ data: [], total: 0, page: 1, size: 200 })))
      .subscribe((res) => {
        this.deviceTypes = res.data ?? [];
        this.cdr.markForCheck();
      });
  }

  private useReleaseType(value: string | null): void {
    const releaseType = this.normalizeReleaseType(value);
    this.activeReleaseType = releaseType;
    this.activeTabIndex = this.releaseTabs.findIndex((tab) => tab.value === releaseType);
    if (this.activeTabIndex < 0) {
      this.activeTabIndex = 0;
    }
    this.q.releaseType = releaseType;
  }

  private normalizeReleaseType(value: string | null): ReleaseType {
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

  private firstText(...values: Array<string | undefined | null>): string {
    for (const value of values) {
      const text = `${value ?? ''}`.trim();
      if (text) return text;
    }
    return '';
  }

  protected get downloadBase(): string {
    const baseUrl = `${environment.api.baseUrl || ''}`.replace(/\/$/, '');
    if (/^https?:\/\//.test(baseUrl)) return `${baseUrl}/downloads`;
    const origin = globalThis.location?.origin || '';
    return `${origin}${baseUrl}/downloads`;
  }
}
