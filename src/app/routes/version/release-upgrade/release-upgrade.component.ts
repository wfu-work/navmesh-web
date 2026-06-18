import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { SHARED_IMPORTS } from '@shared';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzMessageService } from 'ng-zorro-antd/message';
import { catchError, finalize, forkJoin, of, timer } from 'rxjs';
import {
  MetricSummaryComponent,
  MetricSummaryItem,
} from 'src/app/shared/components/metric-summary/metric-summary.component';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import {
  DeviceUpgradeBatchResult,
  DeviceUpgradeBatchSummary,
  DeviceUpgradeCandidate,
  DeviceUpgradeTask,
  DevicesService,
  Release,
  upgradeTaskErrorText,
  upgradeTaskMessageText,
  upgradeTaskTargetVersionText,
} from '../../devices/devices.service';

@Component({
  selector: 'app-release-upgrade',
  templateUrl: './release-upgrade.component.html',
  styleUrls: ['../../settings/settings.component.less', './release-upgrade.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent, MetricSummaryComponent, NzEmptyModule],
})
export class ReleaseUpgradeComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly devicesService = inject(DevicesService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformMismatchReason = '设备系统或架构与升级包不匹配';

  protected readonly releaseGuid = this.route.snapshot.paramMap.get('guid') ?? '';
  protected release?: Release;
  protected candidates: DeviceUpgradeCandidate[] = [];
  protected batches: DeviceUpgradeBatchSummary[] = [];
  protected batchTasks: DeviceUpgradeTask[] = [];
  protected selectedBatch?: DeviceUpgradeBatchSummary;
  protected selectedDeviceGuids = new Set<string>();
  protected batchMessage = '';
  protected loading = false;
  protected candidatesLoading = false;
  protected batchesLoading = false;
  protected tasksLoading = false;
  protected creating = false;
  protected batchTotal = 0;

  protected batchQuery = {
    page: 1,
    size: 10,
  };

  ngOnInit(): void {
    if (!this.releaseGuid) {
      this.message.error('版本标识不存在');
      this.router.navigate(['/version/release']);
      return;
    }
    this.load();
    timer(5000, 5000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.hasRunningWork()) {
          return;
        }
        this.loadCandidates(false);
        this.loadBatches(false);
        if (this.selectedBatch && this.isBatchActive(this.selectedBatch)) {
          this.loadBatchTasks(this.selectedBatch, false);
        }
      });
  }

  protected load(): void {
    this.loading = true;
    forkJoin({
      release: this.devicesService.release(this.releaseGuid),
      candidates: this.devicesService.upgradeCandidates(this.releaseGuid).pipe(catchError(() => of([] as DeviceUpgradeCandidate[]))),
      batches: this.devicesService
        .upgradeBatches(this.releaseGuid, this.batchQuery)
        .pipe(catchError(() => of({ data: [], total: 0, page: this.batchQuery.page, size: this.batchQuery.size }))),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ release, candidates, batches }) => {
          this.release = this.normalizeRelease(release);
          this.candidates = this.normalizeCandidates(candidates);
          this.batches = (batches.data ?? []).map((item) => this.normalizeBatch(item));
          this.batchTotal = batches.total ?? 0;
          this.reconcileSelection();
          this.ensureSelectedBatch();
        },
        error: () => this.message.error('批量升级页面加载失败'),
      });
  }

  protected loadCandidates(showLoading = true): void {
    if (showLoading) {
      this.candidatesLoading = true;
    }
    this.devicesService
      .upgradeCandidates(this.releaseGuid)
      .pipe(
        catchError(() => of([] as DeviceUpgradeCandidate[])),
        finalize(() => {
          if (showLoading) {
            this.candidatesLoading = false;
          }
          this.cdr.markForCheck();
        }),
      )
      .subscribe((items) => {
        this.candidates = this.normalizeCandidates(items);
        this.reconcileSelection();
      });
  }

  protected loadBatches(showLoading = true): void {
    if (showLoading) {
      this.batchesLoading = true;
    }
    this.devicesService
      .upgradeBatches(this.releaseGuid, this.batchQuery)
      .pipe(
        catchError(() => of({ data: [], total: 0, page: this.batchQuery.page, size: this.batchQuery.size })),
        finalize(() => {
          if (showLoading) {
            this.batchesLoading = false;
          }
          this.cdr.markForCheck();
        }),
      )
      .subscribe((res) => {
        this.batches = (res.data ?? []).map((item) => this.normalizeBatch(item));
        this.batchTotal = res.total ?? 0;
        this.ensureSelectedBatch();
      });
  }

  protected loadBatchTasks(batch: DeviceUpgradeBatchSummary, showLoading = true): void {
    this.selectedBatch = this.normalizeBatch(batch);
    if (showLoading) {
      this.tasksLoading = true;
    }
    this.devicesService
      .upgradeBatchTasks(this.releaseGuid, this.selectedBatch.guid, { page: 1, size: 200 })
      .pipe(
        catchError(() => of({ data: [], total: 0, page: 1, size: 200 })),
        finalize(() => {
          if (showLoading) {
            this.tasksLoading = false;
          }
          this.cdr.markForCheck();
        }),
      )
      .subscribe((res) => {
        this.batchTasks = (res.data ?? []).map((item) => this.normalizeTask(item));
      });
  }

  protected createBatch(): void {
    const deviceGuids = Array.from(this.selectedDeviceGuids);
    if (!deviceGuids.length) {
      this.message.warning('请选择可升级的在线设备');
      return;
    }
    this.creating = true;
    this.devicesService
      .createUpgradeBatch(this.releaseGuid, {
        deviceGuids,
        message: this.batchMessage.trim() || '管理端批量在线升级',
      })
      .pipe(
        finalize(() => {
          this.creating = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (result) => this.afterCreateBatch(result),
        error: (error) => this.message.error(error?.msg || error?.message || '批量升级任务创建失败'),
      });
  }

  protected toggleDevice(item: DeviceUpgradeCandidate, checked: boolean): void {
    if (!this.canSelectDevice(item)) {
      this.selectedDeviceGuids.delete(item.guid);
      this.cdr.markForCheck();
      return;
    }
    if (checked) {
      this.selectedDeviceGuids.add(item.guid);
    } else {
      this.selectedDeviceGuids.delete(item.guid);
    }
    this.cdr.markForCheck();
  }

  protected selectAllUpgradeable(): void {
    this.selectedDeviceGuids = new Set(this.upgradeableCandidates().map((item) => item.guid));
    this.cdr.markForCheck();
  }

  protected clearSelection(): void {
    this.selectedDeviceGuids.clear();
    this.cdr.markForCheck();
  }

  protected refreshAll(): void {
    this.loadCandidates();
    this.loadBatches();
    if (this.selectedBatch) {
      this.loadBatchTasks(this.selectedBatch);
    }
  }

  protected onBatchPageChange(page: number): void {
    this.batchQuery.page = page;
    this.loadBatches();
  }

  protected onBatchSizeChange(size: number): void {
    this.batchQuery.size = size;
    this.batchQuery.page = 1;
    this.loadBatches();
  }

  protected releaseTitle(): string {
    if (!this.release) return '批量升级';
    return this.firstText(this.release.version, this.release.fileName, this.release.guid);
  }

  protected releaseMeta(): string {
    if (!this.release) return '-';
    return [
      this.firstText(this.release.fileName, '-'),
      this.platformText(this.release),
      this.deviceTypeText(this.release.deviceType || this.release.device_type),
    ].join(' · ');
  }

  protected summaryItems(): MetricSummaryItem[] {
    const upgradeable = this.upgradeableCandidates().length;
    const latest = this.batches[0];
    return [
      { label: '可升级在线设备', value: upgradeable, tone: upgradeable ? 'success' : 'muted', hint: `共 ${this.candidates.length} 台匹配平台在线设备` },
      { label: '已选择设备', value: this.selectedDeviceGuids.size, tone: this.selectedDeviceGuids.size ? 'primary' : 'muted' },
      { label: '升级批次', value: this.batchTotal, tone: this.batchTotal ? 'primary' : 'muted' },
      {
        label: '最近批次',
        value: latest ? this.batchStatusText(latest.status) : '-',
        tone: latest ? this.batchTone(latest.status) : 'muted',
        hint: latest ? `${this.batchCount(latest, 'success')} 成功 / ${this.batchCount(latest, 'failed')} 失败` : '暂无记录',
      },
    ];
  }

  protected upgradeableCandidates(): DeviceUpgradeCandidate[] {
    return this.candidates.filter((item) => this.canSelectDevice(item));
  }

  protected canSelectDevice(item: DeviceUpgradeCandidate): boolean {
    return item.status === 2 && !this.hasActiveUpgrade(item) && this.onlineUpgradeable(item);
  }

  protected hasActiveUpgrade(item: DeviceUpgradeCandidate): boolean {
    return this.firstBoolean(item.hasActiveUpgrade, item.has_active_upgrade);
  }

  protected deviceName(item: DeviceUpgradeCandidate | DeviceUpgradeTask): string {
    const deviceGuid = 'deviceGuid' in item ? this.firstText(item.deviceGuid, item.device_guid) : item.guid;
    const candidate = this.candidates.find((row) => row.guid === deviceGuid);
    if (candidate) {
      return this.firstText(candidate.alias, candidate.name, candidate.sncode, candidate.hostname, candidate.guid);
    }
    if ('guid' in item && !('deviceGuid' in item)) {
      return this.firstText(item.alias, item.name, item.sncode, item.hostname, item.guid);
    }
    return deviceGuid || '-';
  }

  protected deviceMeta(item: DeviceUpgradeCandidate): string {
    return [
      this.firstText(item.hostname, item.sncode, item.guid),
      this.firstText(item.os, 'unknown') + '/' + this.firstText(item.arch, 'unknown'),
      this.firstText(item.clientVersion, item.client_version, '未上报版本'),
    ].join(' · ');
  }

  protected taskDeviceMeta(item: DeviceUpgradeTask): string {
    const releaseType = this.firstText(this.release?.releaseType, this.release?.release_type);
    if (releaseType === 'rain' || releaseType === 'device_software' || releaseType === 'hipnames') {
      return `目标版本 ${upgradeTaskTargetVersionText(item) || '-'}`;
    }
    const fromVersion = this.firstText(item.fromVersion, item.from_version, '-');
    const targetVersion = upgradeTaskTargetVersionText(item);
    return `从 ${fromVersion} 升级到 ${targetVersion || '-'}`;
  }

  protected taskMessageText(item: DeviceUpgradeTask): string {
    return upgradeTaskMessageText(item);
  }

  protected taskErrorText(item: DeviceUpgradeTask): string {
    return upgradeTaskErrorText(item);
  }

  protected activeTaskText(item: DeviceUpgradeCandidate): string {
    const status = this.firstNumber(item.activeTaskStatus, item.active_task_status);
    return status ? `已有${this.upgradeStatusText(status)}任务` : '已有升级任务';
  }

  protected disabledReason(item: DeviceUpgradeCandidate): string {
    if (this.hasActiveUpgrade(item)) {
      return this.activeTaskText(item);
    }
    return this.firstText(item.upgradeDisabledReason, item.upgrade_disabled_reason);
  }

  protected batchStatusText(status?: string): string {
    const map: Record<string, string> = {
      empty: '无任务',
      pending: '待执行',
      running: '升级中',
      failed: '有失败',
      canceled: '已取消',
      success: '已完成',
    };
    return map[status || ''] || '未知';
  }

  protected batchStatusColor(status?: string): string {
    const map: Record<string, string> = {
      empty: 'default',
      pending: 'gold',
      running: 'blue',
      failed: 'error',
      canceled: 'default',
      success: 'success',
    };
    return map[status || ''] || 'default';
  }

  protected batchTone(status?: string): MetricSummaryItem['tone'] {
    const map: Record<string, MetricSummaryItem['tone']> = {
      running: 'primary',
      pending: 'warning',
      failed: 'danger',
      canceled: 'muted',
      success: 'success',
      empty: 'muted',
    };
    return map[status || ''] || 'muted';
  }

  protected batchProgress(item: DeviceUpgradeBatchSummary): number {
    const progress = this.firstNumber(item.progress);
    if (item.status === 'success') return 100;
    return Math.min(100, Math.max(0, progress));
  }

  protected batchProgressStatus(item: DeviceUpgradeBatchSummary): 'success' | 'exception' | 'active' | 'normal' {
    if (item.status === 'success') return 'success';
    if (item.status === 'failed') return 'exception';
    if (item.status === 'running') return 'active';
    return 'normal';
  }

  protected batchCount(item: DeviceUpgradeBatchSummary, key: 'pending' | 'running' | 'success' | 'failed' | 'canceled' | 'finished' | 'total'): number {
    const map = {
      pending: [item.pendingCount, item.pending_count],
      running: [item.runningCount, item.running_count],
      success: [item.successCount, item.success_count],
      failed: [item.failedCount, item.failed_count],
      canceled: [item.canceledCount, item.canceled_count],
      finished: [item.finishedCount, item.finished_count],
      total: [item.totalCount, item.total_count],
    };
    return this.firstNumber(...map[key]);
  }

  protected isSelectedBatch(item: DeviceUpgradeBatchSummary): boolean {
    return this.selectedBatch?.guid === item.guid;
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

  protected upgradeProgress(task: DeviceUpgradeTask): number {
    const progress = this.firstNumber(task.progress);
    if (task.status === 3) return 100;
    if (task.status === 2 && progress <= 0) return 1;
    return Math.min(100, Math.max(0, progress));
  }

  protected upgradeProgressStatus(task: DeviceUpgradeTask): 'success' | 'exception' | 'active' | 'normal' {
    if (task.status === 3) return 'success';
    if (task.status === 4) return 'exception';
    if (task.status === 2) return 'active';
    return 'normal';
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
    return total > 0 ? `总大小 ${this.formatBytes(total)}` : '';
  }

  protected taskTime(item: DeviceUpgradeTask): number {
    return this.firstNumber(item.updateTime, item.update_time, item.createTime, item.create_time);
  }

  protected batchTime(item: DeviceUpgradeBatchSummary): number {
    return this.firstNumber(item.updateTime, item.update_time, item.createTime, item.create_time);
  }

  protected formatBytes(value: number): string {
    if (!value) return '0 B';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
    return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }

  protected platformText(item: Release | DeviceUpgradeBatchSummary): string {
    const os = this.firstText(item.os);
    const arch = this.firstText(item.arch);
    if ((!os || os === 'all') && (!arch || arch === 'all')) return '全部平台';
    return `${os && os !== 'all' ? os : '全部系统'}/${arch && arch !== 'all' ? arch : '全部架构'}`;
  }

  protected deviceTypeText(value?: string): string {
    value = this.firstText(value);
    return !value || value === 'all' ? '全部设备' : value;
  }

  private afterCreateBatch(result: DeviceUpgradeBatchResult): void {
    const summary = this.normalizeBatch(result.summary || result.batch);
    const taskCount = result.tasks?.length ?? this.batchCount(summary, 'total');
    const failureCount = result.failures?.length ?? 0;
    this.message.success(`已创建 ${taskCount} 个升级任务${failureCount ? `，${failureCount} 个设备未创建` : ''}`);
    this.selectedDeviceGuids.clear();
    this.batchMessage = '';
    this.selectedBatch = summary;
    this.batchQuery.page = 1;
    this.loadCandidates();
    this.loadBatches();
    this.loadBatchTasks(summary);
  }

  private ensureSelectedBatch(): void {
    if (!this.batches.length) {
      this.selectedBatch = undefined;
      this.batchTasks = [];
      return;
    }
    const current = this.selectedBatch ? this.batches.find((item) => item.guid === this.selectedBatch?.guid) : undefined;
    if (current) {
      this.selectedBatch = current;
      return;
    }
    this.loadBatchTasks(this.batches[0], false);
  }

  private reconcileSelection(): void {
    const selectable = new Set(this.upgradeableCandidates().map((item) => item.guid));
    Array.from(this.selectedDeviceGuids).forEach((guid) => {
      if (!selectable.has(guid)) {
        this.selectedDeviceGuids.delete(guid);
      }
    });
  }

  private hasRunningWork(): boolean {
    return this.batches.some((item) => this.isBatchActive(item)) || this.batchTasks.some((item) => item.status === 1 || item.status === 2);
  }

  private isBatchActive(item: DeviceUpgradeBatchSummary): boolean {
    return item.status === 'pending' || item.status === 'running';
  }

  private normalizeRelease(item: Release): Release {
    return {
      ...item,
      releaseType: this.firstText(item.releaseType, item.release_type),
      deviceType: this.firstText(item.deviceType, item.device_type),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
      createTime: this.firstNumber(item.createTime, item.create_time),
    };
  }

  private normalizeCandidate(item: DeviceUpgradeCandidate): DeviceUpgradeCandidate {
    return {
      ...item,
      name: this.firstText(item.alias, item.name, item.sncode, item.hostname, item.guid),
      hostname: this.firstText(item.hostname, item.sncode, item.guid),
      deviceType: this.firstText(item.deviceType, item.device_type),
      os: this.firstText(item.os),
      arch: this.firstText(item.arch),
      clientVersion: this.firstText(item.clientVersion, item.client_version),
      status: this.firstNumber(item.status) as DeviceUpgradeCandidate['status'],
      hasActiveUpgrade: this.firstBoolean(item.hasActiveUpgrade, item.has_active_upgrade),
      activeTaskGuid: this.firstText(item.activeTaskGuid, item.active_task_guid),
      activeTaskStatus: this.firstNumber(item.activeTaskStatus, item.active_task_status),
      onlineUpgradeable: this.firstBoolean(item.onlineUpgradeable, item.online_upgradeable, true),
      upgradeDisabledReason: this.firstText(item.upgradeDisabledReason, item.upgrade_disabled_reason),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private normalizeCandidates(items: DeviceUpgradeCandidate[] | undefined | null): DeviceUpgradeCandidate[] {
    return (items ?? [])
      .map((item) => this.normalizeCandidate(item))
      .filter((item) => !this.isPlatformMismatchCandidate(item));
  }

  private isPlatformMismatchCandidate(item: DeviceUpgradeCandidate): boolean {
    return this.firstText(item.upgradeDisabledReason, item.upgrade_disabled_reason) === this.platformMismatchReason;
  }

  private normalizeBatch(item: DeviceUpgradeBatchSummary): DeviceUpgradeBatchSummary {
    return {
      ...item,
      releaseGuid: this.firstText(item.releaseGuid, item.release_guid),
      releaseType: this.firstText(item.releaseType, item.release_type),
      deviceType: this.firstText(item.deviceType, item.device_type),
      fileName: this.firstText(item.fileName, item.file_name),
      totalCount: this.firstNumber(item.totalCount, item.total_count),
      pendingCount: this.firstNumber(item.pendingCount, item.pending_count),
      runningCount: this.firstNumber(item.runningCount, item.running_count),
      successCount: this.firstNumber(item.successCount, item.success_count),
      failedCount: this.firstNumber(item.failedCount, item.failed_count),
      canceledCount: this.firstNumber(item.canceledCount, item.canceled_count),
      finishedCount: this.firstNumber(item.finishedCount, item.finished_count),
      progress: this.firstNumber(item.progress),
      status: this.firstText(item.status),
      createTime: this.firstNumber(item.createTime, item.create_time),
      updateTime: this.firstNumber(item.updateTime, item.update_time),
    };
  }

  private normalizeTask(item: DeviceUpgradeTask): DeviceUpgradeTask {
    return {
      ...item,
      batchGuid: this.firstText(item.batchGuid, item.batch_guid),
      deviceGuid: this.firstText(item.deviceGuid, item.device_guid),
      releaseGuid: this.firstText(item.releaseGuid, item.release_guid),
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

  private firstText(...values: Array<string | undefined | null>): string {
    for (const value of values) {
      const text = `${value ?? ''}`.trim();
      if (text) return text;
    }
    return '';
  }

  private firstNumber(...values: Array<number | undefined | null>): number {
    return values.find((value) => value !== undefined && value !== null) ?? 0;
  }

  private firstBoolean(...values: Array<boolean | undefined | null>): boolean {
    return values.find((value) => value !== undefined && value !== null) ?? false;
  }

  private onlineUpgradeable(item: DeviceUpgradeCandidate): boolean {
    return this.firstBoolean(item.onlineUpgradeable, item.online_upgradeable, true);
  }
}
