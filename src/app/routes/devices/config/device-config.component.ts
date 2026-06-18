import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DA_SERVICE_TOKEN } from '@delon/auth';
import { STColumn, STColumnTag } from '@delon/abc/st';
import { environment } from '@env/environment';
import { SHARED_IMPORTS } from '@shared';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzModalService } from 'ng-zorro-antd/modal';
import { catchError, finalize, forkJoin, of, timer } from 'rxjs';
import {
  MetricSummaryComponent,
  MetricSummaryItem,
  MetricSummaryTone,
} from 'src/app/shared/components/metric-summary/metric-summary.component';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { NavMeshSetting, NavMeshSettingsService } from '../../settings/settings.service';
import {
  DeviceStatus,
  DeviceToken,
  DeviceTypeDefault,
  DeviceUpgradeTask,
  Release,
  upgradeTaskErrorText,
  upgradeTaskMessageText,
  upgradeTaskTargetVersionText,
} from '../devices.service';
import { DevicePageBase } from '../device-page-base';
import { HttpMappingEditComponent } from '../mapping-edit/http-mapping-edit.component';
import { TcpMappingEditComponent } from '../mapping-edit/tcp-mapping-edit.component';
import { HttpAccessService, PortMapping, TCPMapping } from '../http-access.service';
import { SshAliasEditComponent } from '../ssh-alias-edit/ssh-alias-edit.component';
import { SSHAlias, SSHEntrypoint, SSHService } from '../ssh.service';

type ServiceLogStatus = 'idle' | 'connecting' | 'streaming' | 'error';
type UpgradeReleaseType = 'navmesh' | 'rain' | 'hipnames';

interface UpgradeSection {
  releaseType: UpgradeReleaseType;
  title: string;
  description: string;
  message: string;
}

interface UpgradeTaskPage {
  data: DeviceUpgradeTask[];
  total: number;
  page: number;
  size: number;
}

@Component({
  selector: 'app-device-config',
  templateUrl: './device-config.component.html',
  styleUrls: [
    '../list/device-list.component.less',
    '../detail/device-detail.component.less',
    './device-config.component.less',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent, NzEmptyModule, MetricSummaryComponent],
})
export class DeviceConfigComponent extends DevicePageBase implements OnInit {
  @ViewChild('serviceLogWindow') private serviceLogWindow?: ElementRef<HTMLElement>;

  private readonly sshService = inject(SSHService);
  private readonly httpAccessService = inject(HttpAccessService);
  private readonly settingsService = inject(NavMeshSettingsService);
  private readonly modalService = inject(NzModalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tokenService = inject(DA_SERVICE_TOKEN);
  private readonly serviceLogNamePattern = /^[A-Za-z0-9_.@-]+\.service$/;
  private readonly maxServiceLogChars = 240_000;
  private serviceLogAbortController?: AbortController;

  protected tokens: DeviceToken[] = [];
  protected sshAliases: SSHAlias[] = [];
  protected sshEntrypoints: SSHEntrypoint[] = [];
  protected mappings: PortMapping[] = [];
  protected tcpMappings: TCPMapping[] = [];
  protected settings: NavMeshSetting[] = [];
  protected types: DeviceTypeDefault[] = [];
  protected releases: Release[] = [];
  protected selectedReleaseGuids: Partial<Record<UpgradeReleaseType, string>> = {};
  protected upgradeTaskPages: Partial<Record<UpgradeReleaseType, UpgradeTaskPage>> = {};
  protected creatingUpgradeType: UpgradeReleaseType | '' = '';
  protected refreshingUpgrades = false;
  protected restartingVPN = false;
  protected serviceLogName = '';
  protected serviceLogTail = 200;
  protected serviceLogStatus: ServiceLogStatus = 'idle';
  protected serviceLogOutput = '';
  protected serviceLogError = '';
  protected readonly upgradeTaskPageSizeOptions = [5, 8, 10, 20];
  private readonly defaultUpgradeTaskPageSize = 8;
  protected readonly serviceLogTailOptions = [50, 100, 200, 500, 1000, 2000, 5000, 10000];

  protected readonly tokenStatusTag: STColumnTag = {
    1: { text: '启用', color: 'green' },
    0: { text: '禁用', color: 'red' },
  };

  protected readonly tokenColumns: STColumn<DeviceToken>[] = [
    { title: '凭证名称', index: 'name', render: 'tokenNameRender', width: 260 },
    { title: '完整凭证', index: 'token', render: 'tokenValueRender', width: 170 },
    { title: '状态', index: 'status', type: 'tag', tag: this.tokenStatusTag, width: 90 },
    { title: '最后使用', index: 'lastUsedAt', render: 'lastUsedAtRender', width: 170 },
    {
      title: '创建时间',
      index: 'createTime',
      type: 'date',
      dateFormat: 'yyyy-MM-dd HH:mm:ss',
      width: 170,
    },
    {
      title: '操作',
      width: 100,
      buttons: [
        {
          icon: 'sync',
          click: (item) => this.rotateToken(item),
          pop: {
            title: '轮换后客户端需要使用新凭证重新上线，确认继续？',
            okType: 'primary',
            icon: 'sync',
          },
        },
        {
          icon: 'check-circle',
          iif: (item) => item.status === 0,
          click: (item) => this.enableToken(item),
          pop: {
            title: '启用后设备可继续使用该凭证接入，确认继续？',
            okType: 'primary',
            icon: 'check-circle',
          },
        },
        {
          icon: 'stop',
          className: 'text-error',
          iif: (item) => item.status !== 0,
          click: (item) => this.disableToken(item),
          pop: {
            title: '禁用后设备将无法使用该凭证接入，确认继续？',
            okType: 'danger',
            icon: 'stop',
          },
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.stopServiceLogStream(false));
    this.load();
    timer(3000, 3000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.hasActiveUpgradeTask()) {
          this.refreshUpgradeTasks();
        }
      });
  }

  protected load(): void {
    if (!this.guid) {
      this.message.error('设备标识不存在');
      return;
    }

    this.loading = true;
    forkJoin({
      detail: this.devicesService.get(this.guid),
      sshAliases: this.sshService.listAliases(),
      sshEntrypoints: this.sshService.listEntrypoints(),
      mappings: this.httpAccessService.list({ page: 1, size: 100, deviceGuid: this.guid }),
      tcpMappings: this.httpAccessService.tcpList({ page: 1, size: 100, deviceGuid: this.guid }),
      types: this.devicesService
        .typeDefaults()
        .pipe(catchError(() => of([] as DeviceTypeDefault[]))),
      settings: this.settingsService.list().pipe(catchError(() => of([] as NavMeshSetting[]))),
      releases: this.devicesService
        .releases({ page: 1, size: 100, status: 1 })
        .pipe(catchError(() => of({ data: [], total: 0, page: 1, size: 100 }))),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({
          detail,
          sshAliases,
          sshEntrypoints,
          mappings,
          tcpMappings,
          types,
          settings,
          releases,
        }) => {
          this.device = this.normalizeDevice(detail.device);
          this.tokens = (detail.tokens ?? []).map((token) => this.normalizeToken(token));
          this.sshAliases = (sshAliases ?? [])
            .map((item) => this.normalizeAlias(item))
            .filter((item) => item.deviceGuid === this.guid);
          this.sshEntrypoints = (sshEntrypoints ?? []).map((item) =>
            this.normalizeEntrypoint(item),
          );
          this.mappings = (mappings.data ?? []).map((item) => this.normalizeMapping(item));
          this.tcpMappings = (tcpMappings.data ?? []).map((item) => this.normalizeTCPMapping(item));
          this.types = (types ?? []).map((item) => this.normalizeType(item));
          this.settings = settings ?? [];
          this.releases = releases.data ?? [];
          this.syncUpgradeSelections();
          this.serviceLogName ||= this.defaultServiceLogName();
          this.refreshUpgradeTasks(true);
        },
        error: () => this.message.error('设备配置加载失败'),
      });
  }

  private refreshUpgradeTasks(force = false): void {
    if (!this.guid || (this.refreshingUpgrades && !force)) {
      return;
    }
    const sections = this.upgradeSections();
    if (!sections.length) {
      return;
    }
    this.refreshingUpgrades = true;
    forkJoin(
      sections.map((section) => {
        const query = this.upgradeTaskQuery(section.releaseType);
        return this.devicesService
          .upgradeTasks(this.guid, {
            page: query.page,
            size: query.size,
            releaseType: section.releaseType,
          })
          .pipe(
            catchError(() => of(this.pageResultFallback(section.releaseType))),
          );
      }),
    )
      .pipe(
        finalize(() => {
          this.refreshingUpgrades = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((pages) => {
        sections.forEach((section, index) => {
          this.applyUpgradeTaskPage(section.releaseType, pages[index]);
        });
        this.syncDeviceVersionFromUpgradeTasks();
      });
  }

  protected openLogs(item?: PortMapping): void {
    const queryParams: Record<string, string> = { deviceGuid: this.guid };
    if (item?.publicHost) {
      queryParams['host'] = item.publicHost;
    }
    this.router.navigate(['/devices/access-logs'], { queryParams });
  }

  protected rotateToken(token: DeviceToken): void {
    const deviceGuid = token.deviceGuid || this.guid;
    this.devicesService.rotateToken(deviceGuid, token.guid).subscribe({
      next: () => {
        this.message.success('凭证已轮换');
        this.load();
      },
      error: () => this.message.error('凭证轮换失败'),
    });
  }

  protected disableToken(token: DeviceToken): void {
    const deviceGuid = token.deviceGuid || this.guid;
    this.devicesService.disableToken(deviceGuid, token.guid).subscribe({
      next: () => {
        this.message.success('凭证已禁用');
        this.load();
      },
      error: () => this.message.error('凭证禁用失败'),
    });
  }

  protected enableToken(token: DeviceToken): void {
    const deviceGuid = token.deviceGuid || this.guid;
    this.devicesService.enableToken(deviceGuid, token.guid).subscribe({
      next: () => {
        this.message.success('凭证已启用');
        this.load();
      },
      error: () => this.message.error('凭证启用失败'),
    });
  }

  protected restartVPN(): void {
    if (!this.guid) {
      this.message.error('设备标识不存在');
      return;
    }
    if (this.device?.status !== 2) {
      this.message.warning('设备在线时才能下发 VPN 重启');
      return;
    }
    this.restartingVPN = true;
    this.devicesService
      .restartVPN(this.guid)
      .pipe(
        finalize(() => {
          this.restartingVPN = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => this.message.success('VPN 重启指令已创建，等待客户端心跳执行'),
        error: () => this.message.error('VPN 重启指令下发失败'),
      });
  }

  protected useServiceLogName(value: string): void {
    if (this.serviceLogStatus === 'streaming' || this.serviceLogStatus === 'connecting') return;
    this.serviceLogName = value;
  }

  protected serviceLogSuggestions(): string[] {
    const names = ['navmesh-client.service'];
    const deviceService = this.deviceTypeServiceLogName();
    if (deviceService && !names.includes(deviceService)) {
      names.push(deviceService);
    }
    return names;
  }

  protected startServiceLogStream(): void {
    if (!this.guid) {
      this.message.error('设备标识不存在');
      return;
    }
    if (this.device?.status !== 2) {
      this.message.warning('设备在线时才能查看实时日志');
      return;
    }
    const serviceName = this.serviceLogName.trim();
    if (!this.serviceLogNamePattern.test(serviceName)) {
      this.message.warning('请输入有效的 systemd service 名称，例如 navmesh-client.service');
      return;
    }
    this.stopServiceLogStream(false);
    const controller = new AbortController();
    this.serviceLogAbortController = controller;
    this.serviceLogStatus = 'connecting';
    this.serviceLogOutput = '';
    this.serviceLogError = '';
    this.cdr.markForCheck();
    void this.readServiceLogStream(serviceName, this.serviceLogTail, controller);
  }

  protected stopServiceLogStream(markIdle = true): void {
    this.serviceLogAbortController?.abort();
    this.serviceLogAbortController = undefined;
    if (markIdle && this.serviceLogStatus !== 'error') {
      this.serviceLogStatus = 'idle';
    }
    this.cdr.markForCheck();
  }

  protected clearServiceLogs(): void {
    this.serviceLogOutput = '';
    this.serviceLogError = '';
    this.cdr.markForCheck();
  }

  protected serviceLogStatusText(): string {
    const map: Record<ServiceLogStatus, string> = {
      idle: '未连接',
      connecting: '连接中',
      streaming: '实时查看中',
      error: '连接失败',
    };
    return map[this.serviceLogStatus];
  }

  protected serviceLogStatusColor(): string {
    const map: Record<ServiceLogStatus, string> = {
      idle: 'default',
      connecting: 'processing',
      streaming: 'success',
      error: 'error',
    };
    return map[this.serviceLogStatus];
  }

  protected openSshModal(item?: SSHAlias): void {
    const alias = item ? this.normalizeAlias(item) : this.sshAliases[0];
    const modal = this.modalService.create({
      nzTitle: 'SSH 接入配置',
      nzContent: SshAliasEditComponent,
      nzOkText: '保存',
      nzCancelText: '取消',
      nzMaskClosable: false,
      nzData: {
        deviceGuid: this.guid,
        alias,
        defaultAlias: this.device?.sncode || this.device?.alias || '',
        defaultDomain: this.defaultSshDomain(),
        defaultEntrypointIp: this.defaultEntrypointIp(),
      },
      nzOnOk: (componentInstance) => {
        componentInstance.submit().subscribe({
          next: (success) => {
            if (!success) return;
            modal.close();
            this.message.success('SSH 接入配置已保存');
            this.load();
          },
          error: (error) => this.message.error(error.message || 'SSH 接入配置保存失败'),
        });
        return false;
      },
    });
  }

  protected disableSshAlias(item: SSHAlias): void {
    this.sshService.disableAlias(item.guid || String(item.id)).subscribe({
      next: () => {
        this.message.success('SSH 别名已禁用');
        this.load();
      },
      error: () => this.message.error('SSH 别名禁用失败'),
    });
  }

  protected openMappingModal(item?: PortMapping): void {
    const mapping = item ? this.normalizeMapping(item) : undefined;
    const modal = this.modalService.create({
      nzTitle: mapping ? '编辑 HTTP 映射' : '新增 HTTP 映射',
      nzContent: HttpMappingEditComponent,
      nzOkText: '保存',
      nzCancelText: '取消',
      nzMaskClosable: false,
      nzWidth: 640,
      nzData: {
        deviceGuid: this.guid,
        device: this.device,
        mapping,
        defaultPublicHost: mapping ? undefined : this.defaultHttpPublicHost(),
        defaultTargetPort: mapping ? undefined : this.defaultHttpTargetPort(),
        defaultIsCustomDomain: mapping ? undefined : this.defaultHttpIsCustomDomain(),
      },
      nzOnOk: (componentInstance) => {
        componentInstance.submit().subscribe({
          next: (success) => {
            if (!success) return;
            modal.close();
            this.message.success('HTTP 映射已保存');
            this.load();
          },
          error: (error) => this.message.error(error.message || 'HTTP 映射保存失败'),
        });
        return false;
      },
    });
  }

  protected disableMapping(item: PortMapping): void {
    this.httpAccessService.disable(item.guid).subscribe({
      next: () => {
        this.message.success('HTTP 映射已禁用');
        this.load();
      },
      error: () => this.message.error('HTTP 映射禁用失败'),
    });
  }

  protected openTCPMappingModal(item?: TCPMapping): void {
    const mapping = item ? this.normalizeTCPMapping(item) : undefined;
    const modal = this.modalService.create({
      nzTitle: mapping ? '编辑 TCP 映射' : '新增 TCP 映射',
      nzContent: TcpMappingEditComponent,
      nzOkText: '保存',
      nzCancelText: '取消',
      nzMaskClosable: false,
      nzWidth: 640,
      nzData: {
        deviceGuid: this.guid,
        device: this.device,
        mapping,
        defaultPublicHost: mapping ? undefined : this.defaultTCPPublicHost(),
        defaultTargetPort: mapping ? undefined : this.defaultTCPTargetPort(),
      },
      nzOnOk: (componentInstance) => {
        componentInstance.submit().subscribe({
          next: (success) => {
            if (!success) return;
            modal.close();
            this.message.success('TCP 映射已保存');
            this.load();
          },
          error: (error) => this.message.error(error.message || 'TCP 映射保存失败'),
        });
        return false;
      },
    });
  }

  protected disableTCPMapping(item: TCPMapping): void {
    this.httpAccessService.disableTcp(item.guid).subscribe({
      next: () => {
        this.message.success('TCP 映射已禁用');
        this.load();
      },
      error: () => this.message.error('TCP 映射禁用失败'),
    });
  }

  protected enabledTokenCount(): number {
    return this.tokens.filter((token) => token.status === 1).length;
  }

  private async readServiceLogStream(
    serviceName: string,
    tail: number,
    controller: AbortController,
  ): Promise<void> {
    try {
      const response = await fetch(this.serviceLogStreamUrl(serviceName, tail), {
        headers: this.serviceLogHeaders(),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const errorText = await response.text().catch(() => '');
        throw new Error(errorText || `日志流连接失败：${response.status}`);
      }
      this.serviceLogStatus = 'streaming';
      this.appendServiceLog(`[${new Date().toLocaleTimeString()}] 已连接 ${serviceName}\n`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (!controller.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          this.appendServiceLog(decoder.decode(value, { stream: true }));
        }
      }
      const rest = decoder.decode();
      if (rest) this.appendServiceLog(rest);
      if (!controller.signal.aborted) {
        this.serviceLogStatus = 'idle';
        this.appendServiceLog('\n[日志流已结束]\n');
      }
    } catch (error) {
      if (controller.signal.aborted) {
        this.appendServiceLog('\n[日志流已停止]\n');
        return;
      }
      const message = error instanceof Error ? error.message : '日志流连接失败';
      this.serviceLogStatus = 'error';
      this.serviceLogError = message;
      this.appendServiceLog(`\n[连接失败] ${message}\n`);
      this.message.error('服务日志连接失败');
    } finally {
      if (this.serviceLogAbortController === controller) {
        this.serviceLogAbortController = undefined;
      }
      this.cdr.markForCheck();
    }
  }

  private appendServiceLog(chunk: string): void {
    if (!chunk) return;
    const next = this.serviceLogOutput + chunk;
    this.serviceLogOutput =
      next.length > this.maxServiceLogChars
        ? next.slice(next.length - this.maxServiceLogChars)
        : next;
    this.cdr.markForCheck();
    setTimeout(() => this.scrollServiceLogToBottom());
  }

  private scrollServiceLogToBottom(): void {
    const element = this.serviceLogWindow?.nativeElement;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }

  private serviceLogStreamUrl(serviceName: string, tail: number): string {
    const params = new URLSearchParams({
      service: serviceName,
      tail: String(tail || 200),
    });
    return `${this.apiBaseUrl()}/devices/${encodeURIComponent(this.guid)}/service-logs/stream?${params.toString()}`;
  }

  private serviceLogHeaders(): HeadersInit {
    const token = this.tokenService.get()?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private apiBaseUrl(): string {
    return `${environment.api.baseUrl || ''}`.replace(/\/$/, '');
  }

  protected enabledSshCount(): number {
    return this.sshAliases.filter((item) => item.status !== 0).length;
  }

  protected createUpgradeTask(section: UpgradeSection): void {
    const releaseGuid = this.selectedReleaseGuids[section.releaseType] || '';
    if (!this.guid || !releaseGuid) {
      this.message.warning(`请选择${section.title}发布版本`);
      return;
    }
    this.creatingUpgradeType = section.releaseType;
    this.devicesService
      .createUpgradeTask(this.guid, {
        releaseGuid,
        message: section.message,
      })
      .pipe(
        finalize(() => {
          this.creatingUpgradeType = '';
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.message.success('升级任务已下发');
          this.setUpgradeTaskQuery(section.releaseType, {
            ...this.upgradeTaskQuery(section.releaseType),
            page: 1,
          });
          this.refreshUpgradeTasks(true);
        },
        error: () => this.message.error('升级任务下发失败'),
      });
  }

  protected upgradeSections(): UpgradeSection[] {
    const sections: UpgradeSection[] = [
      {
        releaseType: 'navmesh',
        title: '客户端升级',
        description: '选择边缘客户端发布版本，下发后客户端会在下一次心跳中执行。',
        message: '管理端下发客户端升级',
      },
    ];
    const deviceKind = this.deviceUpgradeKind();
    if (deviceKind === 'rain') {
      sections.push({
        releaseType: 'rain',
        title: '雨量升级',
        description: '选择雨量应用发布版本，下发后设备端雨量服务会在线替换并重启。',
        message: '管理端下发雨量应用升级',
      });
    }
    if (deviceKind === 'hipnames') {
      sections.push({
        releaseType: 'hipnames',
        title: '单机版升级',
        description: '选择单机版解算发布版本，下发后设备端单机版服务会在线替换并重启。',
        message: '管理端下发单机版应用升级',
      });
    }
    return sections;
  }

  protected compatibleReleases(releaseType: UpgradeReleaseType): Release[] {
    const os = this.normalizePlatformValue(this.device?.os);
    const arch = this.normalizePlatformValue(this.device?.arch);
    const deviceType = this.deviceTypeKey();
    return this.releases.filter((item) => {
      const itemReleaseType = this.normalizeReleaseType(
        this.firstText(item.releaseType, item.release_type, 'navmesh'),
      );
      const releaseDeviceType = this.firstText(item.deviceType, item.device_type, 'all');
      const releaseOS = this.normalizePlatformValue(item.os);
      const releaseArch = this.normalizePlatformValue(item.arch);
      const matchDeviceType =
        !releaseDeviceType ||
        releaseDeviceType === 'all' ||
        !deviceType ||
        releaseDeviceType === deviceType;
      return (
        itemReleaseType === releaseType &&
        matchDeviceType &&
        (!os || !releaseOS || releaseOS === 'all' || os === releaseOS) &&
        (!arch || !releaseArch || releaseArch === 'all' || arch === releaseArch)
      );
    });
  }

  private normalizeReleaseType(value: string): string {
    value = this.firstText(value).trim().toLowerCase();
    const map: Record<string, string> = {
      navmesh_client: 'navmesh',
      device_software: 'rain',
      standalone: 'hipnames',
    };
    return map[value] ?? value;
  }

  private deviceUpgradeKind(): Exclude<UpgradeReleaseType, 'navmesh'> | '' {
    const deviceType = this.deviceTypeKey().toLowerCase();
    if (deviceType.includes('rain')) return 'rain';
    if (deviceType.includes('hipnames') || deviceType.includes('standalone')) return 'hipnames';
    return '';
  }

  private deviceTypeKey(): string {
    return this.firstText(
      this.device?.deviceType,
      this.device?.device_type,
      this.device?.groupGuid,
      this.device?.group_guid,
    );
  }

  protected devicePlatformText(): string {
    const os = this.firstText(this.device?.os);
    const arch = this.firstText(this.device?.arch);
    return [os || '未知系统', arch || '未知架构'].join('/');
  }

  protected upgradeSectionMetaText(section: UpgradeSection): string {
    if (section.releaseType === 'navmesh') {
      return `当前客户端版本：${this.device?.clientVersion || '-'} · 当前平台：${this.devicePlatformText()}`;
    }
    return `当前平台：${this.devicePlatformText()}`;
  }

  protected releaseNotFoundText(section: UpgradeSection): string {
    if (!this.releases.length) {
      return '暂无已启用的发布包';
    }
    return `暂无匹配 ${this.devicePlatformText()} 的${section.title}发布包`;
  }

  protected isCreatingUpgrade(section: UpgradeSection): boolean {
    return this.creatingUpgradeType === section.releaseType;
  }

  protected upgradeTasksForType(releaseType: UpgradeReleaseType): DeviceUpgradeTask[] {
    return this.upgradeTaskPage(releaseType).data;
  }

  protected upgradeTaskTotal(releaseType: UpgradeReleaseType): number {
    return this.upgradeTaskPage(releaseType).total;
  }

  protected upgradeTaskRangeText(section: UpgradeSection): string {
    const page = this.upgradeTaskPage(section.releaseType);
    if (!page.total) {
      return '暂无记录';
    }
    const start = (page.page - 1) * page.size + 1;
    const end = Math.min(page.total, start + page.data.length - 1);
    return `第 ${start}-${end} 条 / 共 ${page.total} 条`;
  }

  protected upgradeStatusText(status: number): string {
    const map: Record<number, string> = {
      1: '待执行',
      2: '执行中',
      3: '成功',
      4: '失败',
      5: '已取消',
    };
    return map[status] || '未知';
  }

  protected upgradeStatusColor(status: number): string {
    const map: Record<number, string> = {
      1: 'gold',
      2: 'blue',
      3: 'success',
      4: 'error',
      5: 'default',
    };
    return map[status] || 'default';
  }

  protected hasActiveUpgradeTask(): boolean {
    return Object.values(this.upgradeTaskPages).some((page) =>
      (page?.data ?? []).some((task) => task.status === 1 || task.status === 2),
    );
  }

  protected showUpgradeProgress(task: DeviceUpgradeTask): boolean {
    return task.status !== 1 || this.upgradeProgress(task) > 0;
  }

  protected upgradeProgress(task: DeviceUpgradeTask): number {
    const progress = this.firstNumber(task.progress);
    if (task.status === 3) return 100;
    if (task.status === 2 && progress <= 0) return 1;
    return Math.min(100, Math.max(0, progress));
  }

  protected upgradeProgressStatus(
    task: DeviceUpgradeTask,
  ): 'success' | 'exception' | 'active' | 'normal' {
    if (task.status === 3) return 'success';
    if (task.status === 4) return 'exception';
    if (task.status === 2) return 'active';
    return 'normal';
  }

  protected upgradeStageText(task: DeviceUpgradeTask): string {
    return upgradeTaskMessageText(task, this.upgradeStatusText(task.status));
  }

  protected upgradeErrorText(task: DeviceUpgradeTask): string {
    return upgradeTaskErrorText(task);
  }

  protected upgradeDownloadedText(task: DeviceUpgradeTask): string {
    const downloaded = this.firstNumber(task.downloadedSize, task.downloaded_size);
    const total = this.firstNumber(task.size);
    if (downloaded > 0 && total > 0) {
      return `${this.formatBytes(downloaded)} / ${this.formatBytes(total)}`;
    }
    if (downloaded > 0) {
      return `已下载 ${this.formatBytes(downloaded)}`;
    }
    if (total > 0 && task.status === 2) {
      return `总大小 ${this.formatBytes(total)}`;
    }
    return '';
  }

  protected upgradeVersionText(task: DeviceUpgradeTask): string {
    const fromVersion = this.firstText(task.fromVersion, task.from_version);
    const targetVersion = upgradeTaskTargetVersionText(task);
    if (fromVersion && targetVersion && fromVersion !== targetVersion) {
      return `${fromVersion} -> ${targetVersion}`;
    }
    if (targetVersion) {
      return `目标 ${targetVersion}`;
    }
    if (fromVersion) {
      return `来自 ${fromVersion}`;
    }
    return '';
  }

  protected onUpgradeTaskPageChange(section: UpgradeSection, page: number): void {
    const query = this.upgradeTaskQuery(section.releaseType);
    if (page === query.page) return;
    this.setUpgradeTaskQuery(section.releaseType, { ...query, page });
    this.refreshUpgradeTasks();
  }

  protected onUpgradeTaskSizeChange(section: UpgradeSection, size: number): void {
    const query = this.upgradeTaskQuery(section.releaseType);
    if (size === query.size) return;
    this.setUpgradeTaskQuery(section.releaseType, { page: 1, size });
    this.refreshUpgradeTasks();
  }

  protected taskTime(item: DeviceUpgradeTask): number {
    return item.updateTime || item.update_time || item.createTime || item.create_time || 0;
  }

  protected enabledMappingCount(): number {
    return this.mappings.filter((item) => item.status !== 0).length;
  }

  protected enabledTCPMappingCount(): number {
    return this.tcpMappings.filter((item) => item.status !== 0).length;
  }

  protected summaryItems(item: { status?: DeviceStatus }): MetricSummaryItem[] {
    return [
      {
        label: '激活状态',
        value: this.statusText(item.status),
        tone: this.statusTone(item.status),
      },
      {
        label: '启用凭证',
        value: `${this.enabledTokenCount()} / ${this.tokens.length}`,
        tone: this.enabledTokenCount() ? 'success' : 'muted',
      },
      {
        label: 'SSH 接入',
        value: `${this.enabledSshCount()} / ${this.sshAliases.length}`,
        tone: this.enabledSshCount() ? 'primary' : 'muted',
      },
      {
        label: 'HTTP 映射',
        value: `${this.enabledMappingCount()} / ${this.mappings.length}`,
        tone: this.enabledMappingCount() ? 'primary' : 'muted',
      },
      {
        label: 'TCP 映射',
        value: `${this.enabledTCPMappingCount()} / ${this.tcpMappings.length}`,
        tone: this.enabledTCPMappingCount() ? 'primary' : 'muted',
      },
    ];
  }

  protected entrypointHint(): string {
    if (this.availableSshEntrypoints().length > 0) return '未选择时后台会自动分配可用入口 IP';
    return '暂无可用入口 IP，保存后会先生成 SSH 域名，待配置入口后再自动绑定';
  }

  private statusTone(status: DeviceStatus | undefined): MetricSummaryTone {
    const map: Record<string, MetricSummaryTone> = {
      1: 'warning',
      2: 'success',
      3: 'danger',
      4: 'muted',
    };
    return map[String(status)] ?? 'muted';
  }

  protected availableSshEntrypoints(): SSHEntrypoint[] {
    return this.sshEntrypoints.filter(
      (item) => item.status !== 0 && (!item.deviceGuid || item.deviceGuid === this.guid),
    );
  }

  protected sshTargetHost(alias: SSHAlias | undefined): string {
    const target = this.firstText(alias?.domain, alias?.alias, this.device?.sncode);
    return target || '-';
  }

  protected sshProxyAddress(): string {
    return `${this.sshGatewayDomain()}:${this.sshGatewayPort()}`;
  }

  protected sshConnectCommand(alias: SSHAlias | undefined): string {
    const target = this.sshTargetHost(alias);
    if (target === '-') return '-';
    return `ssh root@${target} -o 'ProxyCommand=nc -X connect -x ${this.sshProxyAddress()} %h %p'`;
  }

  private normalizeAlias(item: SSHAlias): SSHAlias {
    return {
      ...item,
      guid: this.firstText(item.guid, String(item.id || '')),
      deviceGuid: this.firstText(item.deviceGuid, item.device_guid),
      entrypointIp: this.firstText(item.entrypointIp, item.entrypoint_ip),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private normalizeEntrypoint(item: SSHEntrypoint): SSHEntrypoint {
    return {
      ...item,
      deviceGuid: this.firstText(item.deviceGuid, item.device_guid),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private normalizeMapping(item: PortMapping): PortMapping {
    return {
      ...item,
      deviceGuid: this.firstText(item.deviceGuid, item.device_guid),
      publicHost: this.firstText(item.publicHost, item.public_host),
      targetHost: this.firstText(item.targetHost, item.target_host),
      targetPort: this.firstNumber(item.targetPort, item.target_port),
      isCustomDomain: this.firstBoolean(item.isCustomDomain, item.is_custom_domain),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private normalizeTCPMapping(item: TCPMapping): TCPMapping {
    return {
      ...item,
      deviceGuid: this.firstText(item.deviceGuid, item.device_guid),
      publicHost: this.firstText(item.publicHost, item.public_host),
      publicPort: this.firstNumber(item.publicPort, item.public_port),
      targetHost: this.firstText(item.targetHost, item.target_host),
      targetPort: this.firstNumber(item.targetPort, item.target_port),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private normalizeUpgradeTask(item: DeviceUpgradeTask): DeviceUpgradeTask {
    return {
      ...item,
      deviceGuid: this.firstText(item.deviceGuid, item.device_guid),
      releaseGuid: this.firstText(item.releaseGuid, item.release_guid),
      releaseType: this.normalizeReleaseType(
        this.firstText(item.releaseType, item.release_type, 'navmesh'),
      ),
      deviceType: this.firstText(item.deviceType, item.device_type),
      fileName: this.firstText(item.fileName, item.file_name),
      downloadUrl: this.firstText(item.downloadUrl, item.download_url),
      fromVersion: this.firstText(item.fromVersion, item.from_version),
      currentVersion: this.firstText(item.currentVersion, item.current_version),
      progress: this.firstNumber(item.progress),
      downloadedSize: this.firstNumber(item.downloadedSize, item.downloaded_size),
      errorMessage: this.firstText(item.errorMessage, item.error_message),
      startTime: this.firstNumber(item.startTime, item.start_time),
      finishTime: this.firstNumber(item.finishTime, item.finish_time),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private applyUpgradeTaskPage(
    releaseType: UpgradeReleaseType,
    upgrades: {
      data?: DeviceUpgradeTask[];
      total?: number;
      page?: number;
      size?: number;
    },
  ): void {
    const current = this.upgradeTaskPage(releaseType);
    const data = (upgrades.data ?? []).map((task) => this.normalizeUpgradeTask(task));
    this.upgradeTaskPages = {
      ...this.upgradeTaskPages,
      [releaseType]: {
        data,
        total: this.firstNumber(upgrades.total, data.length),
        page: this.firstNumber(upgrades.page, current.page) || 1,
        size: this.firstNumber(upgrades.size, current.size) || current.size,
      },
    };
  }

  private upgradeTaskPage(releaseType: UpgradeReleaseType): UpgradeTaskPage {
    return (
      this.upgradeTaskPages[releaseType] ?? {
        data: [],
        total: 0,
        page: 1,
        size: this.defaultUpgradeTaskPageSize,
      }
    );
  }

  protected upgradeTaskQuery(releaseType: UpgradeReleaseType): { page: number; size: number } {
    const page = this.upgradeTaskPage(releaseType);
    return { page: page.page, size: page.size };
  }

  private setUpgradeTaskQuery(
    releaseType: UpgradeReleaseType,
    query: { page: number; size: number },
  ): void {
    const page = this.upgradeTaskPage(releaseType);
    this.upgradeTaskPages = {
      ...this.upgradeTaskPages,
      [releaseType]: {
        ...page,
        page: query.page,
        size: query.size,
      },
    };
  }

  private syncUpgradeSelections(): void {
    const visibleTypes = new Set(this.upgradeSections().map((section) => section.releaseType));
    const nextSelections: Partial<Record<UpgradeReleaseType, string>> = {};
    for (const section of this.upgradeSections()) {
      const releases = this.compatibleReleases(section.releaseType);
      const selected = this.selectedReleaseGuids[section.releaseType] || '';
      nextSelections[section.releaseType] = releases.some((item) => item.guid === selected)
        ? selected
        : releases[0]?.guid || '';
    }
    this.selectedReleaseGuids = nextSelections;
    this.upgradeTaskPages = Object.fromEntries(
      Object.entries(this.upgradeTaskPages).filter(([releaseType]) =>
        visibleTypes.has(releaseType as UpgradeReleaseType),
      ),
    ) as Partial<Record<UpgradeReleaseType, UpgradeTaskPage>>;
  }

  private syncDeviceVersionFromUpgradeTasks(): void {
    const latestSuccess = this.upgradeTasksForType('navmesh').find(
      (task) => task.status === 3 && this.firstText(task.currentVersion),
    );
    if (
      this.device &&
      latestSuccess?.currentVersion &&
      this.device.clientVersion !== latestSuccess.currentVersion
    ) {
      this.device = { ...this.device, clientVersion: latestSuccess.currentVersion };
    }
  }

  private pageResultFallback(releaseType: UpgradeReleaseType): {
    data?: DeviceUpgradeTask[];
    total?: number;
    page?: number;
    size?: number;
  } {
    const page = this.upgradeTaskPage(releaseType);
    return {
      data: page.data,
      total: page.total,
      page: page.page,
      size: page.size,
    };
  }

  private normalizeType(item: DeviceTypeDefault): DeviceTypeDefault {
    return {
      ...item,
      key: this.firstText(item.key, item.group_key, item.guid, item.type),
      defaultWebPort: this.firstNumber(item.defaultWebPort, item.default_web_port),
      defaultDomain: this.firstText(item.defaultDomain, item.default_domain),
    };
  }

  private normalizePlatformValue(value: string | undefined): string {
    const raw = String(value || '')
      .trim()
      .toLowerCase();
    const normalized = raw.replace(/[_/-]+/g, ' ').replace(/\s+/g, ' ').trim();
    const aliases: Record<string, string> = {
      aarch64: 'arm64',
      armv8: 'arm64',
      x86_64: 'amd64',
      'x86 64': 'amd64',
      x64: 'amd64',
      macos: 'darwin',
      osx: 'darwin',
      win32: 'windows',
      win64: 'windows',
      ubuntu: 'linux',
      debian: 'linux',
      centos: 'linux',
      rhel: 'linux',
      redhat: 'linux',
      fedora: 'linux',
      rocky: 'linux',
      almalinux: 'linux',
      opensuse: 'linux',
      suse: 'linux',
      alpine: 'linux',
    };
    if (aliases[raw]) return aliases[raw];
    if (aliases[normalized]) return aliases[normalized];
    for (const [alias, mapped] of Object.entries(aliases)) {
      if (this.platformNameContainsToken(normalized, alias)) {
        return mapped;
      }
    }
    return normalized;
  }

  private platformNameContainsToken(value: string, token: string): boolean {
    if (!value || !token) return false;
    if (value === token) return true;
    return value.split(/\s+/).some((field) => field === token);
  }

  private normalizeToken(token: DeviceToken): DeviceToken {
    return {
      ...token,
      token: this.firstText(token.token),
      tokenPrefix: this.firstText(
        token.tokenPrefix,
        token.token_prefix,
        this.guidPrefix(token.guid),
      ),
      lastUsedAt: this.firstNumber(
        token.lastUsedAt,
        token.last_used_at,
        token.lastUsedTime,
        token.last_used_time,
      ),
      expiresAt: this.firstNumber(token.expiresAt, token.expireTime, token.expire_time),
      createTime: this.firstNumber(token.createTime, token.create_time),
      updateTime: this.firstNumber(token.updateTime, token.update_time),
    };
  }

  private defaultEntrypointIp(): string {
    const bound = this.sshEntrypoints.find(
      (item) => item.deviceGuid === this.guid && item.status !== 0,
    );
    const free = this.sshEntrypoints.find((item) => !item.deviceGuid && item.status !== 0);
    return bound?.ip || free?.ip || this.sshEntrypoints[0]?.ip || '';
  }

  private defaultSshDomain(): string {
    const sncode = this.device?.sncode || this.device?.alias || this.device?.hostname || '';
    return sncode ? `${sncode}.${this.sshGatewayDomain()}` : '';
  }

  private defaultHttpType(): DeviceTypeDefault | undefined {
    const deviceType = this.firstText(this.device?.deviceType, this.device?.device_type);
    return this.types.find(
      (item) => this.firstText(item.key, item.group_key, item.guid, item.type) === deviceType,
    );
  }

  private defaultHttpPublicHost(): string {
    const domain = this.firstText(
      this.defaultHttpType()?.defaultDomain,
      this.device?.webDomain,
    ).replace(/^\.+|\.+$/g, '');
    const sncode = this.firstText(this.device?.sncode, this.device?.alias, this.device?.hostname);
    if (!domain) return '';
    return sncode ? `${sncode}.${domain}` : domain;
  }

  private defaultHttpTargetPort(): number {
    return this.firstPositiveNumber(
      this.defaultHttpType()?.defaultWebPort,
      this.device?.webPort,
      80,
    );
  }

  private defaultHttpIsCustomDomain(): boolean {
    return false;
  }

  protected tcpEndpoint(mapping: TCPMapping): string {
    const port = this.firstNumber(mapping.publicPort, mapping.public_port);
    const host = this.firstText(mapping.publicHost, mapping.public_host);
    if (!host) return port ? `:${port}` : '-';
    return port ? `${host}:${port}` : host;
  }

  private defaultTCPPublicHost(): string {
    const sncode = this.firstText(this.device?.sncode, this.device?.alias, this.device?.hostname);
    const domain =
      this.setting('tcp_gateway_domain', 'tcpd.navfirst.com').replace(/^\.+|\.+$/g, '') ||
      'tcpd.navfirst.com';
    return sncode ? `${sncode}.${domain}` : domain;
  }

  private defaultTCPTargetPort(): number {
    return this.firstPositiveNumber(this.device?.webPort, 80);
  }

  private defaultServiceLogName(): string {
    return this.serviceLogSuggestions()[0] || 'navmesh-client.service';
  }

  private deviceTypeServiceLogName(): string {
    const deviceType = this.firstText(
      this.device?.deviceType,
      this.device?.device_type,
      this.device?.groupGuid,
      this.device?.group_guid,
    ).toLowerCase();
    if (deviceType.includes('rain')) return 'raind.service';
    if (deviceType.includes('hipnames') || deviceType.includes('standalone')) return 'hipnames.service';
    return '';
  }

  private firstPositiveNumber(...values: Array<number | undefined | null>): number {
    return values.find((value) => Number(value) > 0) ?? 0;
  }

  private sshGatewayDomain(): string {
    return (
      this.setting('ssh_gateway_domain', 'ssh.navfirst.com').replace(/^\.+|\.+$/g, '') ||
      'ssh.navfirst.com'
    );
  }

  private sshGatewayPort(): number {
    const value = this.setting('ssh_listen', ':22').trim();
    if (/^\d+$/.test(value)) return Number(value);
    const match = value.match(/:(\d+)$/);
    const port = match ? Number(match[1]) : 22;
    return Number.isFinite(port) && port > 0 && port <= 65535 ? port : 22;
  }

  private setting(key: string, fallback: string): string {
    return this.settings.find((item) => item.key === key)?.value || fallback;
  }
}
