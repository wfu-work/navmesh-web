import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, Validators } from '@angular/forms';
import { STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { finalize, forkJoin } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { MappingsService, PortMapping } from '../../mappings/mappings.service';
import { DeviceToken } from '../devices.service';
import { DevicePageBase } from '../device-page-base';
import { SSHAlias, SSHEntrypoint, SSHService } from '../ssh.service';

@Component({
  selector: 'app-device-config',
  templateUrl: './device-config.component.html',
  styleUrls: ['../list/device-list.component.less', '../detail/device-detail.component.less', './device-config.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent, NzEmptyModule],
})
export class DeviceConfigComponent extends DevicePageBase implements OnInit {
  private readonly sshService = inject(SSHService);
  private readonly mappingsService = inject(MappingsService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected tokens: DeviceToken[] = [];
  protected sshAliases: SSHAlias[] = [];
  protected sshEntrypoints: SSHEntrypoint[] = [];
  protected mappings: PortMapping[] = [];
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
    { title: '凭证名称', index: 'name', render: 'tokenNameRender' },
    { title: '完整凭证', index: 'token', render: 'tokenValueRender', width: '220px' },
    { title: '状态', index: 'status', type: 'tag', tag: this.tokenStatusTag },
    { title: '最后使用', index: 'lastUsedAt', render: 'lastUsedAtRender' },
    { title: '过期时间', index: 'expiresAt', render: 'expiresAtRender' },
    {
      title: '创建时间',
      index: 'createTime',
      type: 'date',
      dateFormat: 'yyyy-MM-dd HH:mm:ss',
    },
    {
      title: '操作',
      width: '100',
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
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ detail, sshAliases, sshEntrypoints, mappings }) => {
          this.device = this.normalizeDevice(detail.device);
          this.tokens = (detail.tokens ?? []).map((token) => this.normalizeToken(token));
          this.sshAliases = (sshAliases ?? [])
            .map((item) => this.normalizeAlias(item))
            .filter((item) => item.deviceGuid === this.guid);
          this.sshEntrypoints = (sshEntrypoints ?? []).map((item) => this.normalizeEntrypoint(item));
          this.mappings = (mappings.data ?? []).map((item) => this.normalizeMapping(item));
        },
        error: () => this.message.error('设备配置加载失败'),
      });
  }

  protected openLogs(item?: PortMapping): void {
    const queryParams: Record<string, string> = { deviceGuid: this.guid };
    if (item?.publicHost) {
      queryParams['host'] = item.publicHost;
    }
    this.router.navigate(['/mappings/access-logs'], { queryParams });
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

  protected enabledTokenCount(): number {
    return this.tokens.filter((token) => token.status === 1).length;
  }

  protected enabledSshCount(): number {
    return this.sshAliases.filter((item) => item.status !== 0).length;
  }

  protected enabledMappingCount(): number {
    return this.mappings.filter((item) => item.status !== 0).length;
  }

  protected entrypointHint(): string {
    if (this.sshForm.controls.entrypointIp.value) return '已选择入口 IP';
    if (this.availableSshEntrypoints().length > 0) return '未选择时后台会自动分配可用入口 IP';
    return '暂无可用入口 IP，保存后会先生成 SSH 域名，待配置入口后再自动绑定';
  }

  protected availableSshEntrypoints(): SSHEntrypoint[] {
    return this.sshEntrypoints.filter((item) => item.status !== 0 && (!item.deviceGuid || item.deviceGuid === this.guid));
  }

  protected sshProxyCommand(alias: SSHAlias | undefined): string {
    const target = this.firstText(alias?.domain, alias?.alias, this.device?.sncode);
    if (!target) return '-';
    return `ssh root@${this.device?.sncode || target} -o ProxyCommand="navmesh-client -proxy -server ssh.navfirst.com -port 22 -target ${target}"`;
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

  private markFormDirty(controls: Record<string, AbstractControl>): void {
    Object.values(controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
  }

  private defaultEntrypointIp(): string {
    const bound = this.sshEntrypoints.find((item) => item.deviceGuid === this.guid && item.status !== 0);
    const free = this.sshEntrypoints.find((item) => !item.deviceGuid && item.status !== 0);
    return bound?.ip || free?.ip || this.sshEntrypoints[0]?.ip || '';
  }

  private defaultSshDomain(): string {
    const sncode = this.device?.sncode || this.device?.alias || this.device?.hostname || '';
    return sncode ? `${sncode}.ssh.navfirst.com` : '';
  }
}
