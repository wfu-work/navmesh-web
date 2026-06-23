import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PageEntity } from '@shared';
import { Observable } from 'rxjs';

export interface DeviceQuery {
  keyword?: string;
  content?: string;
  status?: string;
  type?: string;
  groupGuid?: string;
  tag?: string;
  page?: number;
  size?: number;
}

export interface DeviceStatsQuery {
  keyword?: string;
  content?: string;
  status?: string;
  type?: string;
  groupGuid?: string;
  tag?: string;
}

export interface DeviceStats {
  total: number;
  registered: number;
  online: number;
  offline: number;
  disabled: number;
}

export interface DeviceTrafficQuery {
  deviceGuid?: string;
  iface?: string;
  from?: string;
  to?: string;
  days?: number;
}

export interface DeviceTrafficSummary {
  rxBytes: number;
  rx_bytes?: number;
  txBytes: number;
  tx_bytes?: number;
  totalBytes: number;
  total_bytes?: number;
}

export interface DeviceTrafficDay {
  id: number;
  deviceGuid: string;
  device_guid?: string;
  iface: string;
  day: string;
  rxBytes: number;
  rx_bytes?: number;
  txBytes: number;
  tx_bytes?: number;
  totalBytes: number;
  total_bytes?: number;
  sampleCount: number;
  sample_count?: number;
  resetCount: number;
  reset_count?: number;
  firstSeenTime: number;
  first_seen_time?: number;
  lastSeenTime: number;
  last_seen_time?: number;
  createTime: number;
  create_time?: number;
  updateTime: number;
  update_time?: number;
}

export interface DeviceTrafficDailyResult {
  items: DeviceTrafficDay[];
  summary: DeviceTrafficSummary;
}

export interface DeviceVPNRestartCommand {
  requestedAt: number;
  message: string;
}

export interface DeviceTokenPayload {
  name?: string;
  expireTime?: number;
}

export interface DevicePayload {
  guid?: string;
  name?: string;
  sncode?: string;
  hostname: string;
  alias?: string;
  remark?: string;
  deviceType?: string;
  type?: string;
  hostIp?: string;
  sourceIp?: string;
  wanIp?: string;
  sshPort?: number;
  webPort?: number;
  webDomain?: string;
  os?: string;
  osVersion?: string;
  kernel?: string;
  arch?: string;
  memoryTotal?: number;
  memoryUsed?: number;
  memoryFree?: number;
  diskTotal?: number;
  diskUsed?: number;
  diskFree?: number;
  diskUsedPct?: number;
  ip?: string;
  privateIp?: string;
  clientVersion?: string;
  status?: DeviceStatus;
  tags?: string[];
  groupGuid?: string;
  group_guid?: string;
}

export type DeviceStatus = 1 | 2 | 3 | 4;

export interface Device {
  guid: string;
  name: string;
  hostname: string;
  sncode?: string;
  alias?: string;
  remark?: string;
  deviceType?: string;
  device_type?: string;
  hostIp?: string;
  host_ip?: string;
  sourceIp?: string;
  source_ip?: string;
  wanIp?: string;
  sshPort?: number;
  ssh_port?: number;
  webPort?: number;
  web_port?: number;
  webDomain?: string;
  web_domain?: string;
  webDomains?: string[];
  web_domains?: string[];
  os: string;
  osVersion: string;
  os_version?: string;
  kernel: string;
  kernelVersion?: string;
  kernel_version?: string;
  arch: string;
  memoryTotal?: number;
  memory_total?: number;
  memoryUsed?: number;
  memory_used?: number;
  memoryFree?: number;
  memory_free?: number;
  diskTotal?: number;
  disk_total?: number;
  diskUsed?: number;
  disk_used?: number;
  diskFree?: number;
  disk_free?: number;
  diskUsedPct?: number;
  disk_used_pct?: number;
  networkType?: string;
  network_type?: string;
  networkIface?: string;
  network_iface?: string;
  signalDbm?: number;
  signal_dbm?: number;
  signalPct?: number;
  signal_pct?: number;
  cellularRsrp?: number;
  cellular_rsrp?: number;
  cellularRsrq?: number;
  cellular_rsrq?: number;
  cellularSinr?: number;
  cellular_sinr?: number;
  wifiSsid?: string;
  wifi_ssid?: string;
  wifiRssi?: number;
  wifi_rssi?: number;
  pingTarget?: string;
  ping_target?: string;
  pingLatencyMs?: number;
  ping_latency_ms?: number;
  pingLossPct?: number;
  ping_loss_pct?: number;
  rxRateBps?: number;
  rx_rate_bps?: number;
  txRateBps?: number;
  tx_rate_bps?: number;
  ip: string;
  privateIp?: string;
  private_ip?: string;
  location?: string;
  country?: string;
  province?: string;
  city?: string;
  clientVersion?: string;
  client_version?: string;
  status: DeviceStatus;
  lastHeartbeatAt: number;
  last_heartbeat_at?: number;
  lastSeenTime?: number;
  last_seen_time?: number;
  lastMetricAt: number;
  last_metric_at?: number;
  tags: string;
  groupGuid?: string;
  group_guid?: string;
  createTime: number;
  create_time?: number;
  updateTime: number;
  update_time?: number;
}

export interface DeviceToken {
  guid: string;
  deviceGuid?: string;
  token?: string;
  name: string;
  tokenPrefix: string;
  token_prefix?: string;
  status: number;
  lastUsedAt: number;
  last_used_at?: number;
  lastUsedTime?: number;
  last_used_time?: number;
  expiresAt: number;
  expireTime?: number;
  expire_time?: number;
  createTime: number;
  create_time?: number;
  updateTime: number;
  update_time?: number;
}

export interface DeviceDetail {
  device: Device;
  tokens: DeviceToken[];
}

export interface DeviceTokenResult {
  token: string;
  item: DeviceToken;
}

export interface DeviceTypeDefault {
  guid?: string;
  key?: string;
  group_key?: string;
  type?: string;
  name?: string;
  icon?: string;
  defaultWebPort?: number;
  default_web_port?: number;
  webPort?: number;
  defaultDomain?: string;
  default_domain?: string;
  webDomain?: string;
  sort?: number;
  remark: string;
  status?: number;
  createTime?: number;
  create_time?: number;
  updateTime?: number;
  update_time?: number;
}

export interface DeviceGroupQuery {
  keyword?: string;
  status?: string | number;
  all?: boolean | string;
  page?: number;
  size?: number;
}

export interface DeviceGroup {
  id: number;
  guid: string;
  key?: string;
  group_key?: string;
  name: string;
  icon?: string;
  description?: string;
  defaultWebPort?: number;
  default_web_port?: number;
  defaultDomain?: string;
  default_domain?: string;
  sort?: number;
  remark?: string;
  status: number;
  createTime: number;
  create_time?: number;
  updateTime: number;
  update_time?: number;
}

export interface ReleaseQuery {
  releaseType?: string;
  deviceType?: string;
  version?: string;
  os?: string;
  arch?: string;
  status?: string | number;
  page?: number;
  size?: number;
}

export interface Release {
  guid: string;
  releaseType?: string;
  release_type?: string;
  deviceType?: string;
  device_type?: string;
  version?: string;
  os: string;
  arch: string;
  fileName: string;
  filePath?: string;
  sha256: string;
  size: number;
  downloadUrl?: string;
  changeLog?: string;
  change_log?: string;
  status: number;
  createTime: number;
  create_time?: number;
  updateTime: number;
  update_time?: number;
}

export interface CreateDeviceUpgradePayload {
  releaseGuid: string;
  message?: string;
}

export interface DeviceUpgradeTask {
  guid: string;
  batchGuid?: string;
  batch_guid?: string;
  deviceGuid: string;
  device_guid?: string;
  releaseGuid: string;
  release_guid?: string;
  releaseType?: string;
  release_type?: string;
  deviceType?: string;
  device_type?: string;
  version?: string;
  os: string;
  arch: string;
  fileName: string;
  file_name?: string;
  downloadUrl: string;
  download_url?: string;
  sha256: string;
  size: number;
  fromVersion?: string;
  from_version?: string;
  currentVersion?: string;
  current_version?: string;
  status: number;
  progress?: number;
  downloadedSize?: number;
  downloaded_size?: number;
  message?: string;
  errorMessage?: string;
  error_message?: string;
  startTime?: number;
  start_time?: number;
  finishTime?: number;
  finish_time?: number;
  createTime: number;
  create_time?: number;
  updateTime: number;
  update_time?: number;
}

const upgradeMessageMap: Record<string, string> = {
  'client binary replaced': '客户端二进制已替换，准备重启服务',
  'client binary has been replaced': '客户端二进制已替换，准备重启服务',
  'preparing upgrade': '准备升级',
  'downloading client binary': '正在下载客户端二进制',
  'setting client file permissions': '正在设置客户端文件权限',
  'backing up current client': '正在备份当前客户端',
  'replacing client binary': '正在替换客户端二进制',
  'verifying client binary': '正在校验客户端二进制',
  'client binary verified': '客户端二进制校验完成',
  'client upgrade failed': '客户端升级失败',
};

export function upgradeTaskMessageText(
  task: Partial<DeviceUpgradeTask>,
  fallback = '',
): string {
  const message = firstUpgradeText(task.message);
  return message ? upgradeDisplayText(message) : fallback;
}

export function upgradeTaskErrorText(task: Partial<DeviceUpgradeTask>): string {
  const message = firstUpgradeText(task.errorMessage, task.error_message);
  if (!message || isUpgradeVersionText(message)) {
    return '';
  }
  return upgradeDisplayText(message);
}

export function upgradeTaskTargetVersionText(task: Partial<DeviceUpgradeTask>): string {
  return firstUpgradeText(task.version, task.currentVersion, task.current_version);
}

function upgradeDisplayText(value: string): string {
  const text = firstUpgradeText(value);
  const key = text.toLowerCase().replace(/\s+/g, ' ');
  if (upgradeMessageMap[key]) {
    return upgradeMessageMap[key];
  }
  if (key.startsWith('download status ')) {
    return `下载失败，${text}`;
  }
  if (key.startsWith('sha256 mismatch')) {
    return `SHA256 校验失败，${text}`;
  }
  if (key.startsWith('download size mismatch')) {
    return `下载文件大小不一致，${text}`;
  }
  if (key.startsWith('upgrade os mismatch')) {
    return `系统不匹配，${text}`;
  }
  if (key.startsWith('upgrade arch mismatch')) {
    return `架构不匹配，${text}`;
  }
  if (key === 'rain upgrade only supports linux hosts') {
    return '北斗降雨升级仅支持 Linux 主机';
  }
  if (key === 'hipnames upgrade only supports linux hosts') {
    return '单机版解算升级仅支持 Linux 主机';
  }
  if (key.startsWith('systemctl not found')) {
    return `未找到 systemctl，${text}`;
  }
  return text;
}

function isUpgradeVersionText(value: string): boolean {
  return /^v?\d+(?:\.\d+){1,3}(?:[-+][0-9a-z.-]+)?$/i.test(firstUpgradeText(value));
}

function firstUpgradeText(...values: Array<string | undefined | null>): string {
  for (const value of values) {
    const text = `${value ?? ''}`.trim();
    if (text) return text;
  }
  return '';
}

export interface DeviceUpgradeCandidate extends Device {
  hasActiveUpgrade?: boolean;
  has_active_upgrade?: boolean;
  activeTaskGuid?: string;
  active_task_guid?: string;
  activeTaskStatus?: number;
  active_task_status?: number;
  onlineUpgradeable?: boolean;
  online_upgradeable?: boolean;
  upgradeDisabledReason?: string;
  upgrade_disabled_reason?: string;
}

export interface CreateDeviceUpgradeBatchPayload {
  deviceGuids: string[];
  message?: string;
}

export interface DeviceUpgradeFailure {
  deviceGuid: string;
  device_guid?: string;
  message: string;
}

export interface DeviceUpgradeBatchSummary {
  guid: string;
  releaseGuid: string;
  release_guid?: string;
  releaseType?: string;
  release_type?: string;
  deviceType?: string;
  device_type?: string;
  version?: string;
  os: string;
  arch: string;
  fileName: string;
  file_name?: string;
  totalCount: number;
  total_count?: number;
  pendingCount?: number;
  pending_count?: number;
  runningCount?: number;
  running_count?: number;
  successCount?: number;
  success_count?: number;
  failedCount?: number;
  failed_count?: number;
  canceledCount?: number;
  canceled_count?: number;
  finishedCount?: number;
  finished_count?: number;
  progress?: number;
  status?: string;
  message?: string;
  createTime: number;
  create_time?: number;
  updateTime: number;
  update_time?: number;
}

export interface DeviceUpgradeBatchResult {
  batch: DeviceUpgradeBatchSummary;
  summary: DeviceUpgradeBatchSummary;
  tasks: DeviceUpgradeTask[];
  failures?: DeviceUpgradeFailure[];
}

export interface SaveDeviceGroupPayload {
  guid?: string;
  key?: string;
  name: string;
  icon?: string;
  description?: string;
  defaultWebPort?: number;
  defaultDomain?: string;
  sort?: number;
  remark?: string;
  status: number;
}

@Injectable({ providedIn: 'root' })
export class DevicesService {
  private readonly http = inject(HttpClient);

  list(params?: DeviceQuery): Observable<PageEntity<Device>> {
    return this.http.get<PageEntity<Device>>('/devices/list', { params: { ...params } });
  }

  stats(params?: DeviceStatsQuery): Observable<DeviceStats> {
    return this.http.get<DeviceStats>('/devices/stats', { params: { ...params } });
  }

  trafficDaily(params?: DeviceTrafficQuery): Observable<DeviceTrafficDailyResult> {
    return this.http.get<DeviceTrafficDailyResult>('/devices/traffic/daily', {
      params: this.cleanParams(params),
    });
  }

  deviceTrafficDaily(guid: string, params?: DeviceTrafficQuery): Observable<DeviceTrafficDailyResult> {
    return this.http.get<DeviceTrafficDailyResult>(`/devices/${guid}/traffic/daily`, {
      params: this.cleanParams(params),
    });
  }

  get(guid: string): Observable<DeviceDetail> {
    return this.http.get<DeviceDetail>(`/devices/${guid}`);
  }

  update(guid: string, payload: DevicePayload): Observable<Device> {
    return this.http.put<Device>(`/devices/${guid}`, payload);
  }

  delete(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/devices/${guid}`);
  }

  enable(guid: string): Observable<boolean> {
    return this.http.post<boolean>(`/devices/${guid}/enable`, {});
  }

  disable(guid: string): Observable<boolean> {
    return this.http.post<boolean>(`/devices/${guid}/disable`, {});
  }

  restartVPN(guid: string): Observable<DeviceVPNRestartCommand> {
    return this.http.post<DeviceVPNRestartCommand>(`/devices/${guid}/vpn/restart`, {});
  }

  createToken(deviceGuid: string, payload: DeviceTokenPayload): Observable<DeviceTokenResult> {
    return this.http.post<DeviceTokenResult>(`/devices/${deviceGuid}/tokens`, payload);
  }

  disableToken(deviceGuid: string, tokenGuid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/devices/${deviceGuid}/tokens/${tokenGuid}`);
  }

  enableToken(deviceGuid: string, tokenGuid: string): Observable<boolean> {
    return this.http.post<boolean>(`/devices/${deviceGuid}/tokens/${tokenGuid}/enable`, {});
  }

  rotateToken(deviceGuid: string, tokenGuid: string): Observable<DeviceTokenResult> {
    return this.http.post<DeviceTokenResult>(`/devices/${deviceGuid}/tokens/${tokenGuid}/rotate`, {});
  }

  typeDefaults(): Observable<DeviceTypeDefault[]> {
    return this.http.get<DeviceTypeDefault[]>('/devices/types/defaults');
  }

  groups(params?: DeviceGroupQuery): Observable<PageEntity<DeviceGroup>> {
    return this.http.get<PageEntity<DeviceGroup>>('/device-groups/list', {
      params: this.cleanParams(params),
    });
  }

  saveGroup(payload: SaveDeviceGroupPayload): Observable<DeviceGroup> {
    return this.http.post<DeviceGroup>('/device-groups', payload);
  }

  disableGroup(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/device-groups/${guid}`);
  }

  deleteGroup(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/device-groups/${guid}/delete`);
  }

  releases(params?: ReleaseQuery): Observable<PageEntity<Release>> {
    return this.http.get<PageEntity<Release>>('/releases/list', {
      params: this.cleanParams(params),
    });
  }

  release(guid: string): Observable<Release> {
    return this.http.get<Release>(`/releases/${guid}`);
  }

  uploadRelease(payload: FormData): Observable<Release> {
    return this.http.post<Release>('/releases/upload', payload);
  }

  updateRelease(guid: string, payload: FormData): Observable<Release> {
    return this.http.put<Release>(`/releases/${guid}`, payload);
  }

  enableRelease(guid: string): Observable<boolean> {
    return this.http.post<boolean>(`/releases/${guid}/enable`, {});
  }

  disableRelease(guid: string): Observable<boolean> {
    return this.http.post<boolean>(`/releases/${guid}/disable`, {});
  }

  deleteRelease(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/releases/${guid}/delete`);
  }

  upgradeTasks(
    deviceGuid: string,
    params?: { page?: number; size?: number; status?: string | number; releaseType?: string },
  ): Observable<PageEntity<DeviceUpgradeTask>> {
    return this.http.get<PageEntity<DeviceUpgradeTask>>(`/devices/${deviceGuid}/upgrades`, {
      params: this.cleanParams(params),
    });
  }

  createUpgradeTask(deviceGuid: string, payload: CreateDeviceUpgradePayload): Observable<DeviceUpgradeTask> {
    return this.http.post<DeviceUpgradeTask>(`/devices/${deviceGuid}/upgrades`, payload);
  }

  upgradeCandidates(releaseGuid: string): Observable<DeviceUpgradeCandidate[]> {
    return this.http.get<DeviceUpgradeCandidate[]>(`/releases/${releaseGuid}/upgrade/candidates`);
  }

  createUpgradeBatch(releaseGuid: string, payload: CreateDeviceUpgradeBatchPayload): Observable<DeviceUpgradeBatchResult> {
    return this.http.post<DeviceUpgradeBatchResult>(`/releases/${releaseGuid}/upgrade/batches`, payload);
  }

  upgradeBatches(releaseGuid: string, params?: { page?: number; size?: number }): Observable<PageEntity<DeviceUpgradeBatchSummary>> {
    return this.http.get<PageEntity<DeviceUpgradeBatchSummary>>(`/releases/${releaseGuid}/upgrade/batches`, {
      params: this.cleanParams(params),
    });
  }

  upgradeBatchTasks(
    releaseGuid: string,
    batchGuid: string,
    params?: { page?: number; size?: number; status?: string | number },
  ): Observable<PageEntity<DeviceUpgradeTask>> {
    return this.http.get<PageEntity<DeviceUpgradeTask>>(`/releases/${releaseGuid}/upgrade/batches/${batchGuid}/tasks`, {
      params: this.cleanParams(params),
    });
  }

  assignGroup(deviceGuid: string, groupGuid: string): Observable<boolean> {
    return this.http.put<boolean>(`/devices/${deviceGuid}/group`, { groupGuid });
  }

  private cleanParams(params?: object): Record<string, string | number | boolean> {
    const result: Record<string, string | number | boolean> = {};
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        result[key] = value as string | number | boolean;
      }
    });
    return result;
  }
}
