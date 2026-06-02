import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzModalService } from 'ng-zorro-antd/modal';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import {
  MetricSummaryComponent,
  MetricSummaryItem,
  MetricSummaryTone,
} from 'src/app/shared/components/metric-summary/metric-summary.component';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { NavMeshSetting, NavMeshSettingsService } from '../../settings/settings.service';
import { DeviceStatus, DeviceToken, DeviceTypeDefault, DeviceUpgradeTask, Release } from '../devices.service';
import { DevicePageBase } from '../device-page-base';
import { HttpMappingEditComponent } from '../mapping-edit/http-mapping-edit.component';
import { HttpAccessService, PortMapping } from '../http-access.service';
import { SshAliasEditComponent } from '../ssh-alias-edit/ssh-alias-edit.component';
import { SSHAlias, SSHEntrypoint, SSHService } from '../ssh.service';

@Component({
  selector: 'app-device-config',
  templateUrl: './device-config.component.html',
  styleUrls: ['../list/device-list.component.less', '../detail/device-detail.component.less', './device-config.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent, NzEmptyModule, MetricSummaryComponent],
})
export class DeviceConfigComponent extends DevicePageBase implements OnInit {
  private readonly sshService = inject(SSHService);
  private readonly httpAccessService = inject(HttpAccessService);
  private readonly settingsService = inject(NavMeshSettingsService);
  private readonly modalService = inject(NzModalService);

  protected tokens: DeviceToken[] = [];
  protected sshAliases: SSHAlias[] = [];
  protected sshEntrypoints: SSHEntrypoint[] = [];
  protected mappings: PortMapping[] = [];
  protected settings: NavMeshSetting[] = [];
  protected types: DeviceTypeDefault[] = [];
  protected releases: Release[] = [];
  protected upgradeTasks: DeviceUpgradeTask[] = [];
  protected selectedReleaseGuid = '';
  protected creatingUpgrade = false;

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
    this.load();
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
      types: this.devicesService.typeDefaults().pipe(catchError(() => of([] as DeviceTypeDefault[]))),
      settings: this.settingsService.list().pipe(catchError(() => of([] as NavMeshSetting[]))),
      releases: this.devicesService.releases({ page: 1, size: 100, status: 1, releaseType: 'navmesh' }).pipe(
        catchError(() => of({ data: [], total: 0, page: 1, size: 100 })),
      ),
      upgrades: this.devicesService.upgradeTasks(this.guid, { page: 1, size: 10 }).pipe(catchError(() => of({ data: [], total: 0, page: 1, size: 10 }))),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ detail, sshAliases, sshEntrypoints, mappings, types, settings, releases, upgrades }) => {
          this.device = this.normalizeDevice(detail.device);
          this.tokens = (detail.tokens ?? []).map((token) => this.normalizeToken(token));
          this.sshAliases = (sshAliases ?? [])
            .map((item) => this.normalizeAlias(item))
            .filter((item) => item.deviceGuid === this.guid);
          this.sshEntrypoints = (sshEntrypoints ?? []).map((item) => this.normalizeEntrypoint(item));
          this.mappings = (mappings.data ?? []).map((item) => this.normalizeMapping(item));
          this.types = (types ?? []).map((item) => this.normalizeType(item));
          this.settings = settings ?? [];
          this.releases = releases.data ?? [];
          this.upgradeTasks = upgrades.data ?? [];
          this.selectedReleaseGuid = this.compatibleReleases()[0]?.guid || '';
        },
        error: () => this.message.error('设备配置加载失败'),
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

  protected enabledTokenCount(): number {
    return this.tokens.filter((token) => token.status === 1).length;
  }

  protected enabledSshCount(): number {
    return this.sshAliases.filter((item) => item.status !== 0).length;
  }

  protected createUpgradeTask(): void {
    if (!this.guid || !this.selectedReleaseGuid) {
      this.message.warning('请选择客户端发布版本');
      return;
    }
    this.creatingUpgrade = true;
    this.devicesService
      .createUpgradeTask(this.guid, {
        releaseGuid: this.selectedReleaseGuid,
        message: '管理端下发客户端升级',
      })
      .pipe(
        finalize(() => {
          this.creatingUpgrade = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.message.success('升级任务已下发');
          this.load();
        },
        error: () => this.message.error('升级任务下发失败'),
      });
  }

  protected compatibleReleases(): Release[] {
    const os = this.normalizePlatformValue(this.device?.os);
    const arch = this.normalizePlatformValue(this.device?.arch);
    const deviceType = this.firstText(this.device?.deviceType, this.device?.device_type, this.device?.groupGuid, this.device?.group_guid);
    return this.releases.filter((item) => {
      const releaseType = this.normalizeReleaseType(this.firstText(item.releaseType, item.release_type, 'navmesh'));
      const releaseDeviceType = this.firstText(item.deviceType, item.device_type, 'all');
      const releaseOS = this.normalizePlatformValue(item.os);
      const releaseArch = this.normalizePlatformValue(item.arch);
      const matchDeviceType = !releaseDeviceType || releaseDeviceType === 'all' || !deviceType || releaseDeviceType === deviceType;
      return releaseType === 'navmesh' && matchDeviceType && (!os || !releaseOS || releaseOS === 'all' || os === releaseOS) && (!arch || !releaseArch || releaseArch === 'all' || arch === releaseArch);
    });
  }

  private normalizeReleaseType(value: string): string {
    const map: Record<string, string> = {
      navmesh_client: 'navmesh',
    };
    return map[value] ?? value;
  }

  protected devicePlatformText(): string {
    const os = this.firstText(this.device?.os);
    const arch = this.firstText(this.device?.arch);
    return [os || '未知系统', arch || '未知架构'].join('/');
  }

  protected releaseNotFoundText(): string {
    if (!this.releases.length) {
      return '暂无已启用的客户端发布包';
    }
    return `暂无匹配 ${this.devicePlatformText()} 的发布包`;
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

  protected taskTime(item: DeviceUpgradeTask): number {
    return item.updateTime || item.update_time || item.createTime || item.create_time || 0;
  }

  protected enabledMappingCount(): number {
    return this.mappings.filter((item) => item.status !== 0).length;
  }

  protected summaryItems(item: { status?: DeviceStatus }): MetricSummaryItem[] {
    return [
      { label: '激活状态', value: this.statusText(item.status), tone: this.statusTone(item.status) },
      { label: '启用凭证', value: `${this.enabledTokenCount()} / ${this.tokens.length}`, tone: this.enabledTokenCount() ? 'success' : 'muted' },
      { label: 'SSH 接入', value: `${this.enabledSshCount()} / ${this.sshAliases.length}`, tone: this.enabledSshCount() ? 'primary' : 'muted' },
      { label: 'HTTP 映射', value: `${this.enabledMappingCount()} / ${this.mappings.length}`, tone: this.enabledMappingCount() ? 'primary' : 'muted' },
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
    return this.sshEntrypoints.filter((item) => item.status !== 0 && (!item.deviceGuid || item.deviceGuid === this.guid));
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

  private normalizeType(item: DeviceTypeDefault): DeviceTypeDefault {
    return {
      ...item,
      key: this.firstText(item.key, item.group_key, item.guid, item.type),
      defaultWebPort: this.firstNumber(item.defaultWebPort, item.default_web_port),
      defaultDomain: this.firstText(item.defaultDomain, item.default_domain),
    };
  }

  private normalizePlatformValue(value: string | undefined): string {
    const normalized = String(value || '').trim().toLowerCase();
    const aliases: Record<string, string> = {
      aarch64: 'arm64',
      armv8: 'arm64',
      x86_64: 'amd64',
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
    return aliases[normalized] || normalized;
  }

  private normalizeToken(token: DeviceToken): DeviceToken {
    return {
      ...token,
      token: this.firstText(token.token),
      tokenPrefix: this.firstText(token.tokenPrefix, token.token_prefix, this.guidPrefix(token.guid)),
      lastUsedAt: this.firstNumber(token.lastUsedAt, token.last_used_at, token.lastUsedTime, token.last_used_time),
      expiresAt: this.firstNumber(token.expiresAt, token.expireTime, token.expire_time),
      createTime: this.firstNumber(token.createTime, token.create_time),
      updateTime: this.firstNumber(token.updateTime, token.update_time),
    };
  }

  private defaultEntrypointIp(): string {
    const bound = this.sshEntrypoints.find((item) => item.deviceGuid === this.guid && item.status !== 0);
    const free = this.sshEntrypoints.find((item) => !item.deviceGuid && item.status !== 0);
    return bound?.ip || free?.ip || this.sshEntrypoints[0]?.ip || '';
  }

  private defaultSshDomain(): string {
    const sncode = this.device?.sncode || this.device?.alias || this.device?.hostname || '';
    return sncode ? `${sncode}.${this.sshGatewayDomain()}` : '';
  }

  private defaultHttpType(): DeviceTypeDefault | undefined {
    const deviceType = this.firstText(this.device?.deviceType, this.device?.device_type);
    return this.types.find((item) => this.firstText(item.key, item.group_key, item.guid, item.type) === deviceType);
  }

  private defaultHttpPublicHost(): string {
    const domain = this.firstText(this.defaultHttpType()?.defaultDomain, this.device?.webDomain).replace(/^\.+|\.+$/g, '');
    const sncode = this.firstText(this.device?.sncode, this.device?.alias, this.device?.hostname);
    if (!domain) return '';
    return sncode ? `${sncode}.${domain}` : domain;
  }

  private defaultHttpTargetPort(): number {
    return this.firstPositiveNumber(this.defaultHttpType()?.defaultWebPort, this.device?.webPort, 80);
  }

  private defaultHttpIsCustomDomain(): boolean {
    return false;
  }

  private firstPositiveNumber(...values: Array<number | undefined | null>): number {
    return values.find((value) => Number(value) > 0) ?? 0;
  }

  private sshGatewayDomain(): string {
    return this.setting('ssh_gateway_domain', 'ssh.navfirst.com').replace(/^\.+|\.+$/g, '') || 'ssh.navfirst.com';
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
