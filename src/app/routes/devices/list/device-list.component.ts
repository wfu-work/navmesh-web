import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SearchCacheService, SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DeviceStats, DeviceStatus, DeviceTypeDefault, DevicesService } from '../devices.service';
import { HttpAccessService, PortMapping } from '../http-access.service';

interface DeviceListQuery {
  page: number;
  size: number;
  status: string;
  content: string;
  type: string;
}

const DEVICE_LIST_SEARCH_CACHE_KEY = 'devices:list:search';

@Component({
  selector: 'app-device-list',
  templateUrl: './device-list.component.html',
  styleUrls: ['./device-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
  standalone: true,
})
export class DeviceListComponent implements OnInit {
  private readonly devicesService = inject(DevicesService);
  private readonly httpAccessService = inject(HttpAccessService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly searchCache = inject(SearchCacheService);

  q: DeviceListQuery = {
    page: 1,
    size: 9,
    status: '',
    content: '',
    type: '',
  };

  protected data: Device[] = [];
  protected types: DeviceTypeDefault[] = [];
  protected mappingsByDevice = new Map<string, PortMapping[]>();
  protected totalCount = 0;
  protected onlineCount = 0;
  protected offlineCount = 0;
  protected loading = false;
  protected statusChanging = new Set<string>();

  ngOnInit(): void {
    this.restoreSearch();
    this.loadTypes();
    this.getData();
  }

  protected loadTypes(): void {
    this.devicesService.typeDefaults().subscribe({
      next: (res) => {
        this.types = (res ?? []).map((item) => this.normalizeType(item));
        this.cdr.markForCheck();
      },
      error: () => this.message.error('设备类型加载失败'),
    });
  }

  protected getData(): void {
    this.cacheSearch();
    this.loading = true;
    forkJoin({
      devices: this.devicesService.list(this.q),
      stats: this.devicesService.stats(this.statsQuery()),
    })
      .pipe(
        switchMap(({ devices, stats }) => {
          const rows = (devices.data ?? []).map((item) => this.normalizeDevice(item));
          const deviceGuids = rows.map((item) => item.guid).filter(Boolean).join(',');
          const mappings$ = deviceGuids
            ? this.httpAccessService.list({ page: 1, size: Math.max(20, rows.length * 5), status: 1, deviceGuids })
            : of({ data: [], total: 0, page: 1, size: 0 });
          return mappings$.pipe(map((mappings) => ({ devices, stats, rows, mappings })));
        }),
      )
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ devices, stats, rows, mappings }) => {
          this.data = rows;
          this.applyStats(stats, devices.total ?? 0);
          this.mappingsByDevice = this.groupMappingsByDevice((mappings.data ?? []).map((item) => this.normalizeMapping(item)));
        },
        error: () => this.message.error('设备列表加载失败'),
      });
  }

  protected edit(guid: string): void {
    this.router.navigate(['/devices/edit', guid]);
  }

  protected detail(guid: string): void {
    this.router.navigate(['/devices/detail', guid]);
  }

  protected accessConfig(guid: string): void {
    this.router.navigate(['/devices/config', guid]);
  }

  protected metrics(guid: string): void {
    this.router.navigate(['/sessions/list'], { queryParams: { deviceGuid: guid } });
  }

  protected delete(guid: string): void {
    this.devicesService.delete(guid).subscribe({
      next: (r) => {
        if (r) {
          this.message.success('设备已删除');
          this.data = this.data.filter((item) => item.guid !== guid);
          this.totalCount = Math.max(0, this.totalCount - 1);
          this.cdr.markForCheck();
          this.getData();
        } else {
          this.message.error('设备删除失败');
        }
      },
      error: () => this.message.error('设备删除失败'),
    });
  }

  protected enabled(status: DeviceStatus | undefined): boolean {
    return status !== 4;
  }

  protected activate(item: Device): void {
    this.toggleEnabled(item, true);
  }

  protected toggleEnabled(item: Device, checked: boolean): void {
    if (this.statusChanging.has(item.guid)) return;
    this.statusChanging.add(item.guid);
    const request = checked ? this.devicesService.enable(item.guid) : this.devicesService.disable(item.guid);
    request
      .pipe(
        finalize(() => {
          this.statusChanging.delete(item.guid);
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (ok) => {
          if (!ok) {
            this.message.error(checked ? '设备启用失败' : '设备禁用失败');
            this.getData();
            return;
          }
          this.message.success(checked && item.status === 1 ? '设备已激活' : checked ? '设备已启用' : '设备已禁用');
          item.status = checked ? 3 : 4;
          this.cdr.markForCheck();
        },
        error: () => {
          this.message.error(checked ? '设备启用失败' : '设备禁用失败');
          this.getData();
        },
      });
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

  protected statusColor(status: DeviceStatus | undefined): string {
    const map: Record<DeviceStatus, string> = {
      1: 'gold',
      2: 'success',
      3: 'error',
      4: 'default',
    };
    return status ? map[status] : 'default';
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

  protected osIconSrc(item: Device): string {
    return `assets/icons/${this.osKind(item)}.svg`;
  }

  protected osLabel(item: Device): string {
    const value = this.osText(item);
    if (value.includes('ubuntu')) return 'Ubuntu';
    if (value.includes('centos')) return 'CentOS';
    if (value.includes('darwin') || value.includes('mac')) return 'Mac';
    if (value.includes('win')) return 'Windows';
    if (value.includes('debian')) return 'Debian';
    if (value.includes('linux')) return 'Linux';
    return item.os || '未知系统';
  }

  protected osClass(item: Device): string {
    return `os-${this.osKind(item)}`;
  }

  protected systemLabel(item: Device): string {
    const os = this.firstText(item.os, this.osLabel(item));
    const version = this.firstText(item.osVersion);
    return [os, version].filter(Boolean).join(' ') || '-';
  }

  protected typeName(type: string | undefined): string {
    if (!type) return '-';
    const item = this.types.find((row) => this.typeValue(row) === type);
    return item?.name || item?.remark || type;
  }

  protected productName(type: string | undefined): string {
    if (!type) return '-';
    const item = this.types.find((row) => this.typeValue(row) === type);
    return item?.name || this.typeValue(item) || type;
  }

  protected productIcon(type: string | undefined): string {
    const item = this.types.find((row) => this.typeValue(row) === type);
    return this.normalizeIcon(this.firstText(item?.icon, this.defaultProductIcon(type)));
  }

  protected typeValue(item: DeviceTypeDefault | undefined): string {
    return this.firstText(item?.key, item?.group_key, item?.guid, item?.type);
  }

  protected productLink(type: string | undefined): void {
    if (!type) return;
    this.q.type = type;
    this.q.page = 1;
    this.getData();
  }

  protected reset(): void {
    this.q = { page: 1, size: this.q.size, status: '', content: '', type: '' };
    this.searchCache.clearCache(DEVICE_LIST_SEARCH_CACHE_KEY);
    this.getData();
  }

  protected formatTags(value: string): string[] {
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

  protected pageChange(page: number): void {
    this.q.page = page;
    this.getData();
  }

  protected pageSizeChange(size: number): void {
    this.q.size = size;
    this.q.page = 1;
    this.getData();
  }

  protected trackByGuid(_: number, item: Device): string {
    return item.guid;
  }

  protected httpMappings(guid: string): PortMapping[] {
    return this.mappingsByDevice.get(guid) ?? [];
  }

  protected mappingUrl(mapping: PortMapping): string {
    const host = mapping.publicHost || '';
    if (/^https?:\/\//i.test(host)) return host;
    const protocol = String(mapping.protocol || 'http').toLowerCase() === 'https' ? 'https' : 'http';
    return `${protocol}://${host}`;
  }

  protected mappingLabel(mapping: PortMapping): string {
    return mapping.publicHost || mapping.name || '-';
  }

  protected externalIp(item: Device): string {
    return this.firstText(item.wanIp);
  }

  protected locationLabel(item: Device): string {
    const location = this.firstText(item.location);
    if (location) return location;
    const parts = [item.country, item.province, item.city].map((value) => String(value || '').trim()).filter(Boolean);
    return Array.from(new Set(parts)).join(' ');
  }

  private normalizeDevice(item: Device): Device {
    return {
      ...item,
      name: this.firstText(item.alias, item.name, item.sncode, item.hostname, item.guid),
      hostname: this.firstText(item.hostname, item.remark),
      ip: this.firstText(item.wanIp, item.ip),
      sourceIp: this.firstText(item.sourceIp, item.source_ip, item.ip),
      wanIp: this.firstText(item.wanIp),
      hostIp: this.firstText(item.hostIp, item.host_ip, item.privateIp, item.private_ip),
      location: this.firstText(item.location),
      deviceType: this.firstText(item.deviceType, item.device_type),
      sshPort: this.firstNumber(item.sshPort, item.ssh_port),
      webPort: this.firstNumber(item.webPort, item.web_port),
      webDomain: this.firstText(item.webDomain, item.web_domain),
      osVersion: this.firstText(item.osVersion, item.os_version),
      kernel: this.firstText(item.kernel, item.kernelVersion, item.kernel_version),
      arch: this.firstText(item.arch),
      memoryTotal: this.firstNumber(item.memoryTotal, item.memory_total),
      memoryUsed: this.firstNumber(item.memoryUsed, item.memory_used),
      memoryFree: this.firstNumber(item.memoryFree, item.memory_free),
      diskTotal: this.firstNumber(item.diskTotal, item.disk_total),
      diskUsed: this.firstNumber(item.diskUsed, item.disk_used),
      diskFree: this.firstNumber(item.diskFree, item.disk_free),
      diskUsedPct: this.firstNumber(item.diskUsedPct, item.disk_used_pct),
      privateIp: this.firstText(item.privateIp, item.private_ip, item.hostIp, item.host_ip),
      clientVersion: this.firstText(item.clientVersion, item.client_version),
      lastHeartbeatAt: this.firstNumber(item.lastHeartbeatAt, item.last_heartbeat_at, item.lastSeenTime, item.last_seen_time),
      lastMetricAt: this.firstNumber(item.lastMetricAt, item.last_metric_at),
      groupGuid: this.firstText(item.groupGuid, item.group_guid),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private restoreSearch(): void {
    const cached = this.searchCache.getCache<DeviceListQuery>(DEVICE_LIST_SEARCH_CACHE_KEY);
    if (cached) {
      this.q = { ...this.q, ...cached };
    }
    const routeType = this.route.snapshot.queryParamMap.get('type');
    if (routeType !== null) {
      this.q.type = routeType;
      this.q.page = 1;
    }
  }

  private cacheSearch(): void {
    this.searchCache.setCache<DeviceListQuery>(DEVICE_LIST_SEARCH_CACHE_KEY, { ...this.q });
  }

  private statsQuery(): Omit<DeviceListQuery, 'page' | 'size'> {
    return {
      content: this.q.content,
      status: this.q.status,
      type: this.q.type,
    };
  }

  private applyStats(stats: DeviceStats | undefined, fallbackTotal: number): void {
    this.totalCount = stats?.total ?? fallbackTotal;
    this.onlineCount = stats?.online ?? 0;
    this.offlineCount = stats?.offline ?? 0;
  }

  private normalizeType(item: DeviceTypeDefault): DeviceTypeDefault {
    const key = this.firstText(item.key, item.group_key, item.guid, item.type);
    return {
      ...item,
      key,
      guid: this.firstText(item.guid, key),
      type: this.firstText(item.type, key),
      name: this.firstText(item.name, key),
      icon: this.normalizeIcon(this.firstText(item.icon, this.defaultProductIcon(key))),
      webPort: this.firstNumber(item.webPort, item.defaultWebPort, item.default_web_port),
      webDomain: this.firstText(item.webDomain, item.defaultDomain, item.default_domain),
      sort: this.firstNumber(item.sort),
      status: this.firstNumber(item.status),
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

  private groupMappingsByDevice(mappings: PortMapping[]): Map<string, PortMapping[]> {
    const result = new Map<string, PortMapping[]>();
    mappings.forEach((mapping) => {
      if (!mapping.deviceGuid || !mapping.publicHost || mapping.status === 0) return;
      const items = result.get(mapping.deviceGuid) ?? [];
      items.push(mapping);
      result.set(mapping.deviceGuid, items);
    });
    return result;
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

  private osKind(item: Device): 'linux' | 'ubuntu' | 'centos' | 'windows' | 'macos' {
    const value = this.osText(item);
    if (value.includes('ubuntu')) return 'ubuntu';
    if (value.includes('centos')) return 'centos';
    if (value.includes('darwin') || value.includes('mac')) return 'macos';
    if (value.includes('win')) return 'windows';
    return 'linux';
  }

  private osText(item: Device): string {
    return [item.os, item.osVersion, item.kernel, item.arch]
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean)
      .join(' ');
  }

  private defaultProductIcon(type: string | undefined): string {
    const value = String(type || '').toLowerCase();
    if (value.includes('ssh')) return 'code';
    if (value.includes('radar')) return 'radar-chart';
    if (value.includes('rain')) return 'cloud';
    if (value.includes('data')) return 'database';
    if (value.includes('dic')) return 'experiment';
    if (value.includes('ppp')) return 'deployment-unit';
    if (value.includes('sag')) return 'control';
    return 'appstore';
  }

  private normalizeIcon(icon: string | undefined): string {
    if (icon === 'terminal') return 'code';
    return icon || 'appstore';
  }
}
