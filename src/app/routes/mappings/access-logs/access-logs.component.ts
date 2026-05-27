import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DevicesService } from '../../devices/devices.service';
import { HTTPAccessLog, MappingsService } from '../mappings.service';

@Component({
  selector: 'app-access-logs',
  templateUrl: './access-logs.component.html',
  styleUrls: ['../mappings.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
})
export class AccessLogsComponent implements OnInit {
  private readonly mappingsService = inject(MappingsService);
  private readonly devicesService = inject(DevicesService);
  private readonly route = inject(ActivatedRoute);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected q = {
    page: 1,
    size: 10,
    host: '',
    deviceGuid: '',
    method: '',
    path: '',
    statusCode: '',
  };

  protected data: HTTPAccessLog[] = [];
  protected devices: Device[] = [];
  protected totalCount = 0;
  protected loading = false;

  protected readonly methodTag: STColumnTag = {
    GET: { text: 'GET', color: 'green' },
    POST: { text: 'POST', color: 'blue' },
    PUT: { text: 'PUT', color: 'gold' },
    PATCH: { text: 'PATCH', color: 'purple' },
    DELETE: { text: 'DELETE', color: 'red' },
  };

  protected readonly columns: STColumn<HTTPAccessLog>[] = [
    { title: 'Host', index: 'host', render: 'hostRender', fixed: 'left', width: 240 },
    { title: '方法', index: 'method', type: 'tag', tag: this.methodTag, width: 100 },
    { title: '路径', index: 'path', render: 'pathRender', width: 300 },
    { title: '状态码', index: 'statusCode', render: 'statusRender', width: 100 },
    { title: '耗时', index: 'durationMs', render: 'durationRender', width: 100 },
    { title: '流量', index: 'bytesIn', render: 'trafficRender', width: 150 },
    { title: '来源 IP', index: 'sourceIp', width: 150, default: '-' },
    { title: '绑定设备', index: 'deviceGuid', render: 'deviceRender', width: 240 },
    {
      title: '访问时间',
      index: 'createTime',
      type: 'date',
      dateFormat: 'yyyy-MM-dd HH:mm:ss',
      width: 180,
    },
    { title: '错误', index: 'errorMessage', render: 'errorRender', width: 260 },
  ];

  ngOnInit(): void {
    const host = this.route.snapshot.queryParamMap.get('host');
    if (host) {
      this.q.host = host;
    }
    const deviceGuid = this.route.snapshot.queryParamMap.get('deviceGuid');
    if (deviceGuid) {
      this.q.deviceGuid = deviceGuid;
    }
    this.load();
  }

  protected load(): void {
    this.loading = true;
    forkJoin({
      logs: this.mappingsService.accessLogs(this.q),
      devices: this.devicesService.list({ page: 1, size: 500 }),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ logs, devices }) => {
          this.data = (logs.data ?? []).map((item) => this.normalizeLog(item));
          this.totalCount = logs.total ?? 0;
          this.devices = devices.data ?? [];
        },
        error: () => this.message.error('访问日志加载失败'),
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

  protected search(): void {
    this.q.page = 1;
    this.load();
  }

  protected reset(): void {
    this.q = { page: 1, size: this.q.size, host: '', deviceGuid: '', method: '', path: '', statusCode: '' };
    this.load();
  }

  protected deviceName(guid: string | undefined): string {
    if (!guid) return '-';
    const device = this.devices.find((item) => item.guid === guid);
    return device?.alias || device?.sncode || device?.hostname || device?.name || device?.guid || guid;
  }

  protected statusClass(statusCode: number): string {
    if (statusCode >= 500) return 'status-danger';
    if (statusCode >= 400) return 'status-warning';
    if (statusCode >= 300) return 'status-info';
    return 'status-success';
  }

  protected formatBytes(value: number): string {
    if (!value) return '0 B';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
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

  private firstText(...values: Array<string | undefined>): string {
    return values.find((value) => value !== undefined && value !== '') ?? '';
  }

  private firstNumber(...values: Array<number | undefined>): number {
    return values.find((value) => value !== undefined && value !== null) ?? 0;
  }
}
