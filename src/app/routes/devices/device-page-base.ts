import { ChangeDetectorRef, Directive, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';

import { Device, DeviceStatus, DevicesService } from './devices.service';

@Directive()
export abstract class DevicePageBase {
  protected readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  protected readonly devicesService = inject(DevicesService);
  protected readonly message = inject(NzMessageService);
  protected readonly cdr = inject(ChangeDetectorRef);

  protected readonly guid = this.route.snapshot.paramMap.get('guid') ?? '';
  protected loading = false;
  protected device?: Device;

  protected title(): string {
    return this.device?.name || this.device?.hostname || this.guid || '设备详情';
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

  protected statusLabel(status: number | undefined): string {
    return status === 0 ? '禁用' : '启用';
  }

  protected formatBytes(value: number): string {
    if (!value) return '0 B';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
    return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }

  protected formatUsage(used: number | undefined, total: number | undefined): string {
    if (!total) return '-';
    const percent = used ? ` (${Math.min(100, (used / total) * 100).toFixed(1)}%)` : '';
    return `${this.formatBytes(used || 0)} / ${this.formatBytes(total)}${percent}`;
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

  protected normalizeDevice(item: Device): Device {
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
      webDomains: this.webDomains(item),
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
      networkType: this.firstText(item.networkType, item.network_type),
      networkIface: this.firstText(item.networkIface, item.network_iface),
      signalDbm: this.firstNumber(item.signalDbm, item.signal_dbm),
      signalPct: this.firstNumber(item.signalPct, item.signal_pct),
      cellularRsrp: this.firstNumber(item.cellularRsrp, item.cellular_rsrp),
      cellularRsrq: this.firstNumber(item.cellularRsrq, item.cellular_rsrq),
      cellularSinr: this.firstNumber(item.cellularSinr, item.cellular_sinr),
      wifiSsid: this.firstText(item.wifiSsid, item.wifi_ssid),
      wifiRssi: this.firstNumber(item.wifiRssi, item.wifi_rssi),
      pingTarget: this.firstText(item.pingTarget, item.ping_target),
      pingLatencyMs: this.firstNumber(item.pingLatencyMs, item.ping_latency_ms),
      pingLossPct: this.firstNumber(item.pingLossPct, item.ping_loss_pct),
      rxRateBps: this.firstNumber(item.rxRateBps, item.rx_rate_bps),
      txRateBps: this.firstNumber(item.txRateBps, item.tx_rate_bps),
      privateIp: this.firstText(item.privateIp, item.private_ip, item.hostIp, item.host_ip),
      clientVersion: this.firstText(item.clientVersion, item.client_version),
      lastHeartbeatAt: this.firstNumber(item.lastHeartbeatAt, item.last_heartbeat_at, item.lastSeenTime, item.last_seen_time),
      lastMetricAt: this.firstNumber(item.lastMetricAt, item.last_metric_at),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  protected firstText(...values: Array<string | undefined | null>): string {
    return values.find((value) => value !== undefined && value !== null && value !== '') ?? '';
  }

  protected firstNumber(...values: Array<number | undefined | null>): number {
    return values.find((value) => value !== undefined && value !== null) ?? 0;
  }

  protected firstBoolean(...values: Array<boolean | undefined | null>): boolean {
    return values.find((value) => value !== undefined && value !== null) ?? false;
  }

  protected webDomainText(item: Device): string {
    return this.webDomains(item).join('、') || '-';
  }

  protected guidPrefix(guid: string | undefined): string {
    return guid ? `${guid.slice(0, 8)}...` : '';
  }

  protected networkLabel(item: Device): string {
    const type = this.networkTypeLabel(item.networkType);
    const iface = this.firstText(item.networkIface);
    if (!type && !iface) return '-';
    return [type || '未知链路', iface].filter(Boolean).join(' / ');
  }

  protected networkIcon(item: Device): string {
    switch (this.firstText(item.networkType).toLowerCase()) {
      case 'cellular':
        return 'mobile';
      case 'wifi':
        return 'wifi';
      case 'ethernet':
        return 'gateway';
      default:
        return 'global';
    }
  }

  protected signalPercent(item: Device): number {
    if (!this.hasSignalMetrics(item)) {
      return 0;
    }
    const pct = this.firstNumber(item.signalPct, item.signal_pct);
    if (pct > 0) {
      return Math.min(100, Math.max(0, Math.round(pct)));
    }
    return this.signalPercentFromDbm(this.signalDbm(item));
  }

  protected signalText(item: Device): string {
    if (!this.hasSignalMetrics(item)) {
      return '-';
    }
    const pct = this.signalPercent(item);
    const dbm = this.signalDbm(item);
    if (pct > 0 && dbm !== 0) return `${pct}% / ${dbm} dBm`;
    if (pct > 0) return `${pct}%`;
    if (dbm !== 0) return `${dbm} dBm`;
    return '-';
  }

  protected networkQualityText(item: Device): string {
    if (this.normalizedNetworkType(item) === 'ethernet') {
      return '有线链路';
    }
    return this.signalText(item);
  }

  protected showSignalBar(item: Device): boolean {
    return this.hasSignalMetrics(item);
  }

  protected rateText(item: Device): string {
    const rx = this.firstNumber(item.rxRateBps, item.rx_rate_bps);
    const tx = this.firstNumber(item.txRateBps, item.tx_rate_bps);
    if (rx <= 0 && tx <= 0) return '-';
    return `↓ ${this.formatBitRate(rx)}  ↑ ${this.formatBitRate(tx)}`;
  }

  protected latencyText(item: Device): string {
    const latency = this.firstNumber(item.pingLatencyMs, item.ping_latency_ms);
    const loss = this.firstNumber(item.pingLossPct, item.ping_loss_pct);
    if (latency <= 0 && loss <= 0) return '-';
    if (latency > 0 && loss > 0) return `${latency} ms / 丢包 ${this.formatPercent(loss)}`;
    if (latency > 0) return `${latency} ms`;
    return `丢包 ${this.formatPercent(loss)}`;
  }

  protected cellularMetricsText(item: Device): string {
    const parts = [
      this.metricPart('RSRP', this.firstNumber(item.cellularRsrp, item.cellular_rsrp), 'dBm'),
      this.metricPart('RSRQ', this.firstNumber(item.cellularRsrq, item.cellular_rsrq), 'dB'),
      this.metricPart('SINR', this.firstNumber(item.cellularSinr, item.cellular_sinr), 'dB'),
    ].filter(Boolean);
    return parts.join(' / ') || '-';
  }

  protected networkMetricsLabel(item: Device): string {
    switch (this.normalizedNetworkType(item)) {
      case 'wifi':
        return 'WiFi 参数';
      case 'cellular':
        return '蜂窝参数';
      case 'ethernet':
        return '有线参数';
      default:
        return '链路参数';
    }
  }

  protected networkMetricsText(item: Device): string {
    switch (this.normalizedNetworkType(item)) {
      case 'wifi':
        return this.wifiMetricsText(item);
      case 'cellular':
        return this.cellularMetricsText(item);
      case 'ethernet':
        return this.ethernetMetricsText(item);
      default:
        return '-';
    }
  }

  protected wifiMetricsText(item: Device): string {
    const ssid = this.firstText(item.wifiSsid, item.wifi_ssid);
    const rssi = this.firstNumber(item.wifiRssi, item.wifi_rssi);
    const parts = [ssid, rssi !== 0 ? `${rssi} dBm` : ''].filter(Boolean);
    return parts.join(' / ') || '-';
  }

  protected ethernetMetricsText(item: Device): string {
    const iface = this.firstText(item.networkIface, item.network_iface);
    return iface ? `接口 ${iface}` : '-';
  }

  protected formatBitRate(bps: number | undefined): string {
    const value = Number(bps || 0);
    if (!Number.isFinite(value) || value <= 0) return '0 b/s';
    const units = ['b/s', 'K/s', 'M/s', 'G/s', 'T/s'];
    let current = value;
    let index = 0;
    while (current >= 1000 && index < units.length - 1) {
      current /= 1000;
      index += 1;
    }
    const precision = index === 0 || current >= 10 ? 0 : 1;
    return `${current.toFixed(precision)} ${units[index]}`;
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

  private networkTypeLabel(value: string | undefined): string {
    switch (String(value || '').trim().toLowerCase()) {
      case 'cellular':
        return '蜂窝';
      case 'wifi':
        return 'WiFi';
      case 'ethernet':
        return '有线';
      case 'unknown':
        return '未知';
      default:
        return '';
    }
  }

  private normalizedNetworkType(item: Device): string {
    return String(this.firstText(item.networkType, item.network_type)).trim().toLowerCase();
  }

  private signalDbm(item: Device): number {
    return this.firstNumber(item.signalDbm, item.signal_dbm, item.wifiRssi, item.wifi_rssi, item.cellularRsrp, item.cellular_rsrp);
  }

  private hasSignalMetrics(item: Device): boolean {
    const type = this.normalizedNetworkType(item);
    if (type !== 'wifi' && type !== 'cellular') {
      return false;
    }
    return Boolean(
      this.firstNumber(item.signalPct, item.signal_pct, item.signalDbm, item.signal_dbm, item.wifiRssi, item.wifi_rssi, item.cellularRsrp, item.cellular_rsrp) ||
        this.firstText(item.wifiSsid, item.wifi_ssid),
    );
  }

  private signalPercentFromDbm(dbm: number): number {
    if (!dbm) return 0;
    if (dbm <= -110) return 0;
    if (dbm >= -50) return 100;
    return Math.round(((dbm + 110) * 100) / 60);
  }

  private metricPart(label: string, value: number, unit: string): string {
    return value !== 0 ? `${label} ${value} ${unit}` : '';
  }

  private formatPercent(value: number): string {
    if (!Number.isFinite(value)) return '0%';
    const rounded = Math.round(value * 10) / 10;
    return `${rounded.toFixed(Number.isInteger(rounded) ? 0 : 1)}%`;
  }

  private webDomains(item: Device): string[] {
    const values = [
      ...(item.webDomains ?? []),
      ...(item.web_domains ?? []),
      this.firstText(item.webDomain, item.web_domain),
    ];
    const result: string[] = [];
    const seen = new Set<string>();
    values.forEach((value) => {
      `${value ?? ''}`
        .split(/[,，\n\t]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) => {
          if (seen.has(part)) return;
          seen.add(part);
          result.push(part);
        });
    });
    return result;
  }
}
