import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { HTTPAccessLog, MappingsService, PortMapping } from '../../mappings/mappings.service';
import { SessionsService, TunnelSession } from '../../sessions/sessions.service';
import { TunnelConnection, TunnelsService } from '../../tunnels/tunnels.service';
import { Device, DeviceStatus, DeviceToken, DevicesService } from '../devices.service';
import { SSHAlias, SSHEntrypoint, SSHService } from '../ssh.service';

@Component({
  selector: 'app-device-detail',
  templateUrl: './device-detail.component.html',
  styleUrls: ['../list/device-list.component.less', './device-detail.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent, NzEmptyModule],
})
export class DeviceDetailComponent implements OnInit {
  protected readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  protected readonly devicesService = inject(DevicesService);
  protected readonly sshService = inject(SSHService);
  protected readonly mappingsService = inject(MappingsService);
  protected readonly sessionsService = inject(SessionsService);
  protected readonly tunnelsService = inject(TunnelsService);
  protected readonly fb = inject(NonNullableFormBuilder);
  protected readonly message = inject(NzMessageService);
  protected readonly cdr = inject(ChangeDetectorRef);

  protected readonly guid = this.route.snapshot.paramMap.get('guid') ?? '';
  protected loading = false;
  protected device?: Device;
  protected tokens: DeviceToken[] = [];
  protected sshAliases: SSHAlias[] = [];
  protected sshEntrypoints: SSHEntrypoint[] = [];
  protected mappings: PortMapping[] = [];
  protected sessions: TunnelSession[] = [];
  protected accessLogs: HTTPAccessLog[] = [];
  protected connections: TunnelConnection[] = [];
  protected sshModalVisible = false;
  protected sshSaving = false;
  protected mappingModalVisible = false;
  protected mappingSaving = false;

  protected readonly sshForm = this.fb.group({
    alias: ['', [Validators.required]],
    domain: ['', [Validators.required]],
    entrypointIp: [''],
    status: [1],
  });

  protected readonly mappingForm = this.fb.group({
    guid: [''],
    name: ['', [Validators.required]],
    publicHost: ['', [Validators.required]],
    targetHost: ['127.0.0.1', [Validators.required]],
    targetPort: [80, [Validators.required, Validators.min(1), Validators.max(65535)]],
    protocol: ['http', [Validators.required]],
    isCustomDomain: [false],
  });

  protected readonly tokenStatusTag: STColumnTag = {
    1: { text: '启用', color: 'green' },
    0: { text: '禁用', color: 'red' },
  };

  protected readonly tokenColumns: STColumn<DeviceToken>[] = [
    { title: '凭证名称', index: 'name', render: 'tokenNameRender', width: 240 },
    { title: '完整凭证', index: 'token', render: 'tokenValueRender', width: 420 },
    { title: '状态', index: 'status', type: 'tag', tag: this.tokenStatusTag, width: 100 },
    { title: '最后使用', index: 'lastUsedAt', render: 'lastUsedAtRender', width: 180 },
    { title: '过期时间', index: 'expiresAt', render: 'expiresAtRender', width: 180 },
    {
      title: '创建时间',
      index: 'createTime',
      type: 'date',
      dateFormat: 'yyyy-MM-dd HH:mm:ss',
      width: 180,
    },
    {
      title: '操作',
      fixed: 'right',
      width: 140,
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
      mappings: this.mappingsService.list({ page: 1, size: 100, deviceGuid: this.guid }),
      sessions: this.sessionsService.list({ page: 1, size: 100, deviceGuid: this.guid }),
      accessLogs: this.mappingsService.accessLogs({ page: 1, size: 100, deviceGuid: this.guid }),
      connections: this.tunnelsService.connections(),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ detail, sshAliases, sshEntrypoints, mappings, sessions, accessLogs, connections }) => {
          this.device = this.normalizeDevice(detail.device);
          this.tokens = (detail.tokens ?? []).map((token) => this.normalizeToken(token));
          this.sshAliases = (sshAliases ?? [])
            .map((item) => this.normalizeAlias(item))
            .filter((item) => item.deviceGuid === this.guid);
          this.sshEntrypoints = (sshEntrypoints ?? []).map((item) => this.normalizeEntrypoint(item));
          this.mappings = (mappings.data ?? []).map((item) => this.normalizeMapping(item));
          this.sessions = (sessions.data ?? []).map((item) => this.normalizeSession(item));
          this.accessLogs = (accessLogs.data ?? []).map((item) => this.normalizeLog(item));
          this.connections = (connections ?? []).filter((item) => item.deviceGuid === this.guid);
        },
        error: () => this.message.error('设备详情加载失败'),
      });
  }

  protected back(): void {
    this.router.navigate(['/devices/list']);
  }

  protected edit(): void {
    if (!this.guid) return;
    this.router.navigate(['/devices/edit', this.guid]);
  }

  protected openAccessConfig(): void {
    if (!this.guid) return;
    this.router.navigate(['/devices/config', this.guid]);
  }

  protected openDetail(): void {
    if (!this.guid) return;
    this.router.navigate(['/devices/detail', this.guid]);
  }

  protected openLogs(item?: PortMapping): void {
    const queryParams: Record<string, string> = { deviceGuid: this.guid };
    if (item?.publicHost) {
      queryParams['host'] = item.publicHost;
    }
    this.router.navigate(['/mappings/access-logs'], { queryParams });
  }

  protected metrics(): void {
    if (!this.guid) return;
    this.router.navigate(['/sessions/list'], { queryParams: { deviceGuid: this.guid } });
  }

  protected rotateToken(token: DeviceToken): void {
    const deviceGuid = token.deviceGuid || this.guid;
    this.devicesService.rotateToken(deviceGuid, token.guid).subscribe({
      next: (res) => {
        this.message.success('凭证已轮换');
        this.load();
      },
      error: () => this.message.error('凭证轮换失败'),
    });
  }

  protected openSshModal(item?: SSHAlias): void {
    const alias = item ? this.normalizeAlias(item) : this.sshAliases[0];
    this.sshForm.reset({
      alias: alias?.alias || this.device?.sncode || this.device?.alias || '',
      domain: alias?.domain || this.defaultSshDomain(),
      entrypointIp: alias?.entrypointIp || this.defaultEntrypointIp(),
      status: alias?.status ?? 1,
    });
    this.sshModalVisible = true;
  }

  protected saveSshAlias(): void {
    if (this.sshForm.invalid) {
      this.markFormDirty(this.sshForm.controls);
      return;
    }
    const value = this.sshForm.getRawValue();
    this.sshSaving = true;
    this.sshService
      .saveAlias({
        deviceGuid: this.guid,
        alias: value.alias.trim(),
        domain: value.domain.trim(),
        entrypointIp: value.entrypointIp.trim(),
        status: value.status,
      })
      .pipe(
        finalize(() => {
          this.sshSaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.message.success('SSH 接入配置已保存');
          this.sshModalVisible = false;
          this.load();
        },
        error: () => this.message.error('SSH 接入配置保存失败'),
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
    this.mappingForm.reset({
      guid: mapping?.guid ?? '',
      name: mapping?.name || this.device?.alias || this.device?.hostname || '',
      publicHost: mapping?.publicHost || this.device?.webDomain || '',
      targetHost: mapping?.targetHost || '127.0.0.1',
      targetPort: mapping?.targetPort || this.device?.webPort || 80,
      protocol: mapping?.protocol || 'http',
      isCustomDomain: mapping?.isCustomDomain ?? Boolean(this.device?.webDomain),
    });
    this.mappingModalVisible = true;
  }

  protected saveMapping(): void {
    if (this.mappingForm.invalid) {
      this.markFormDirty(this.mappingForm.controls);
      return;
    }
    const value = this.mappingForm.getRawValue();
    this.mappingSaving = true;
    this.mappingsService
      .save({
        guid: value.guid || undefined,
        deviceGuid: this.guid,
        name: value.name.trim(),
        publicHost: value.publicHost.trim(),
        targetHost: value.targetHost.trim(),
        targetPort: Number(value.targetPort),
        protocol: value.protocol,
        isCustomDomain: value.isCustomDomain,
        status: 1,
      })
      .pipe(
        finalize(() => {
          this.mappingSaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.message.success('HTTP 映射已保存');
          this.mappingModalVisible = false;
          this.load();
        },
        error: () => this.message.error('HTTP 映射保存失败'),
      });
  }

  protected disableMapping(item: PortMapping): void {
    this.mappingsService.disable(item.guid).subscribe({
      next: () => {
        this.message.success('HTTP 映射已禁用');
        this.load();
      },
      error: () => this.message.error('HTTP 映射禁用失败'),
    });
  }

  protected title(): string {
    return this.device?.name || this.device?.hostname || this.guid || '设备详情';
  }

  protected osIcon(os: string | undefined): string {
    const value = String(os || '').toLowerCase();
    if (value.includes('darwin') || value.includes('mac')) return 'apple';
    if (value.includes('win')) return 'windows';
    if (value.includes('linux') || value.includes('ubuntu') || value.includes('debian') || value.includes('centos')) return 'code';
    return 'desktop';
  }

  protected osClass(os: string | undefined): string {
    const value = String(os || '').toLowerCase();
    if (value.includes('darwin') || value.includes('mac')) return 'os-macos';
    if (value.includes('win')) return 'os-windows';
    if (value.includes('linux') || value.includes('ubuntu') || value.includes('debian') || value.includes('centos')) return 'os-linux';
    return 'os-unknown';
  }

  protected statusText(status: DeviceStatus | undefined): string {
    const map: Record<DeviceStatus, string> = {
      1: '已注册',
      2: '在线',
      3: '离线',
      4: '已禁用',
    };
    return status ? map[status] : '未知';
  }

  protected statusClass(status: DeviceStatus | undefined): string {
    const map: Record<DeviceStatus, string> = {
      1: 'status-registered',
      2: 'status-online',
      3: 'status-offline',
      4: 'status-disabled',
    };
    return status ? map[status] : 'status-unknown';
  }

  protected deviceStateClass(status: DeviceStatus | undefined): string {
    const map: Record<DeviceStatus, string> = {
      1: 'device-registered',
      2: 'device-online',
      3: 'device-offline',
      4: 'device-disabled',
    };
    return status ? map[status] : 'device-unknown';
  }

  protected enabledTokenCount(): number {
    return this.tokens.filter((token) => token.status === 1).length;
  }

  protected enabledSshCount(): number {
    return this.sshAliases.filter((item) => item.status !== 0).length;
  }

  protected enabledMappingCount(): number {
    return this.mappings.filter((item) => item.status !== 0).length;
  }

  protected activeConnectionCount(): number {
    return this.connections.length;
  }

  protected activeSessionCount(): number {
    return this.sessions.filter((item) => item.status === 1).length;
  }

  protected totalTraffic(): number {
    return this.sessions.reduce((sum, item) => sum + item.bytesIn + item.bytesOut, 0);
  }

  protected inboundTraffic(): number {
    return this.sessions.reduce((sum, item) => sum + item.bytesIn, 0);
  }

  protected outboundTraffic(): number {
    return this.sessions.reduce((sum, item) => sum + item.bytesOut, 0);
  }

  protected errorLogCount(): number {
    return this.accessLogs.filter((item) => item.statusCode >= 500 || item.errorMessage).length;
  }

  protected recentSessions(): TunnelSession[] {
    return this.sessions.slice(0, 6);
  }

  protected trafficBars(): Array<{ label: string; value: number; height: number }> {
    const buckets = Array.from({ length: 8 }, () => 0);
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const bucketMs = dayMs / buckets.length;
    this.sessions.forEach((item) => {
      const time = item.startTime || item.createTime || 0;
      const age = now - time;
      if (age < 0 || age > dayMs) return;
      const index = Math.min(buckets.length - 1, Math.floor((dayMs - age) / bucketMs));
      buckets[index] += item.bytesIn + item.bytesOut;
    });
    const max = Math.max(...buckets, 1);
    return buckets.map((value, index) => ({
      label: `${index * 3}h`,
      value,
      height: value > 0 ? Math.max(12, Math.round((value / max) * 100)) : 6,
    }));
  }

  protected formatBytes(value: number): string {
    if (!value) return '0 B';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
    return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }

  protected formatDuration(ms: number): string {
    if (!Number.isFinite(ms) || ms <= 0) return '-';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds} 秒`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} 分钟`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时 ${minutes % 60} 分钟`;
    const days = Math.floor(hours / 24);
    return `${days} 天 ${hours % 24} 小时`;
  }

  protected statusLabel(status: number | undefined): string {
    return status === 0 ? '禁用' : '启用';
  }

  protected activationText(status: DeviceStatus | undefined): string {
    const map: Record<DeviceStatus, string> = {
      1: '已注册，等待设备使用独立凭证上线',
      2: '已激活并在线',
      3: '已激活，当前离线',
      4: '设备已禁用',
    };
    return status ? map[status] : '未知';
  }

  protected formatTags(value: string | undefined): string[] {
    if (!value) return [];
    try {
      const tags = JSON.parse(value) as unknown;
      return Array.isArray(tags) ? tags.map(String) : [];
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
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

  private normalizeSession(item: TunnelSession): TunnelSession {
    return {
      ...item,
      deviceGuid: this.firstText(item.deviceGuid, item.device_guid),
      sessionType: this.firstText(item.sessionType, item.session_type),
      sourceIp: this.firstText(item.sourceIp, item.source_ip),
      targetHost: this.firstText(item.targetHost, item.target_host),
      targetPort: this.firstNumber(item.targetPort, item.target_port),
      publicHost: this.firstText(item.publicHost, item.public_host),
      bytesIn: this.firstNumber(item.bytesIn, item.bytes_in),
      bytesOut: this.firstNumber(item.bytesOut, item.bytes_out),
      startTime: this.firstNumber(item.startTime, item.start_time),
      endTime: this.firstNumber(item.endTime, item.end_time),
      disconnectReason: this.firstText(item.disconnectReason, item.disconnect_reason),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private normalizeLog(item: HTTPAccessLog): HTTPAccessLog {
    return {
      ...item,
      mappingGuid: this.firstText(item.mappingGuid, item.mapping_guid),
      deviceGuid: this.firstText(item.deviceGuid, item.device_guid),
      sourceIp: this.firstText(item.sourceIp, item.source_ip),
      statusCode: this.firstNumber(item.statusCode, item.status_code),
      durationMs: this.firstNumber(item.durationMs, item.duration_ms),
      bytesIn: this.firstNumber(item.bytesIn, item.bytes_in),
      bytesOut: this.firstNumber(item.bytesOut, item.bytes_out),
      errorMessage: this.firstText(item.errorMessage, item.error_message),
      createTime: this.firstNumber(item.createTime, item.create_time),
    };
  }

  private normalizeDevice(item: Device): Device {
    return {
      ...item,
      name: this.firstText(item.alias, item.name, item.sncode, item.hostname, item.guid),
      hostname: this.firstText(item.hostname, item.remark),
      ip: this.firstText(item.sourceIp, item.source_ip, item.ip),
      sourceIp: this.firstText(item.sourceIp, item.source_ip, item.ip),
      hostIp: this.firstText(item.hostIp, item.host_ip, item.privateIp, item.private_ip),
      deviceType: this.firstText(item.deviceType, item.device_type),
      sshPort: this.firstNumber(item.sshPort, item.ssh_port),
      webPort: this.firstNumber(item.webPort, item.web_port),
      webDomain: this.firstText(item.webDomain, item.web_domain),
      osVersion: this.firstText(item.osVersion, item.os_version),
      kernel: this.firstText(item.kernel, item.kernelVersion, item.kernel_version),
      privateIp: this.firstText(item.privateIp, item.private_ip, item.hostIp, item.host_ip),
      clientVersion: this.firstText(item.clientVersion, item.client_version, item.clientVersion, item.client_version),
      lastHeartbeatAt: this.firstNumber(item.lastHeartbeatAt, item.last_heartbeat_at, item.lastSeenTime, item.last_seen_time),
      lastMetricAt: this.firstNumber(item.lastMetricAt, item.last_metric_at),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private normalizeToken(token: DeviceToken): DeviceToken {
    return {
      ...token,
      token: this.firstText(token.token),
      tokenPrefix: this.firstText(token.tokenPrefix, token.token_prefix, this.guidPrefix(token.guid)),
      lastUsedAt: this.firstNumber(token.lastUsedAt, token.last_used_at),
      expiresAt: this.firstNumber(token.expiresAt, token.expireTime, token.expire_time),
      createTime: this.firstNumber(token.createTime, token.create_time),
      updateTime: this.firstNumber(token.updateTime, token.update_time),
    };
  }

  private firstText(...values: Array<string | undefined>): string {
    return values.find((value) => value !== undefined && value !== '') ?? '';
  }

  private firstNumber(...values: Array<number | undefined>): number {
    return values.find((value) => value !== undefined && value !== null) ?? 0;
  }

  private firstBoolean(...values: Array<boolean | undefined>): boolean {
    return values.find((value) => value !== undefined && value !== null) ?? false;
  }

  private markFormDirty(controls: Record<string, AbstractControl>): void {
    Object.values(controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
  }

  private expireTime(days: number): number {
    if (!days || days <= 0) return 0;
    return Date.now() + days * 24 * 60 * 60 * 1000;
  }

  private guidPrefix(guid: string | undefined): string {
    return guid ? `${guid.slice(0, 8)}...` : '';
  }

  private defaultEntrypointIp(): string {
    const bound = this.sshEntrypoints.find((item) => item.deviceGuid === this.guid && item.status !== 0);
    const free = this.sshEntrypoints.find((item) => !item.deviceGuid && item.status !== 0);
    return bound?.ip || free?.ip || this.sshEntrypoints[0]?.ip || '';
  }

  protected entrypointHint(): string {
    if (this.sshForm.controls.entrypointIp.value) return '已选择入口 IP';
    if (this.availableSshEntrypoints().length > 0) return '未选择时后台会自动分配可用入口 IP';
    return '暂无可用入口 IP，保存后会先生成 SSH 域名，待配置入口后再自动绑定';
  }

  protected availableSshEntrypoints(): SSHEntrypoint[] {
    return this.sshEntrypoints.filter((item) => item.status !== 0 && (!item.deviceGuid || item.deviceGuid === this.guid));
  }

  private defaultSshDomain(): string {
    const sncode = this.device?.sncode || this.device?.alias || this.device?.hostname || '';
    return sncode ? `${sncode}.navfirst.com` : '';
  }
}
