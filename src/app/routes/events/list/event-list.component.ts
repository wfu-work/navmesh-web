import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';
import {
  MetricSummaryComponent,
  MetricSummaryItem,
} from 'src/app/shared/components/metric-summary/metric-summary.component';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DevicesService } from '../../devices/devices.service';
import {
  EventItem,
  EventStatus,
  EventsService,
  eventDisplayMessage,
  eventDisplayTitle,
  isClosedEventStatus,
  isOpenEventStatus,
} from '../events.service';

interface EventRow extends EventItem {
  deviceName: string;
}

@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent, MetricSummaryComponent],
})
export class EventListComponent implements OnInit {
  private readonly eventsService = inject(EventsService);
  private readonly devicesService = inject(DevicesService);
  private readonly message = inject(NzMessageService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected rows: EventRow[] = [];
  protected devices: Device[] = [];
  protected total = 0;

  protected q = {
    page: 1,
    size: 10,
    deviceGuid: '',
    level: '',
    status: '',
  };

  protected readonly statusTag: STColumnTag = {
    0: { text: '已关闭', color: 'green' },
    1: { text: '未处理', color: 'red' },
    2: { text: '已关闭', color: 'green' },
  };

  protected readonly levelTag: STColumnTag = {
    critical: { text: '严重', color: 'red' },
    error: { text: '错误', color: 'red' },
    high: { text: '高危', color: 'volcano' },
    warn: { text: '警告', color: 'gold' },
    warning: { text: '警告', color: 'gold' },
    medium: { text: '中危', color: 'gold' },
    low: { text: '低危', color: 'blue' },
    info: { text: '信息', color: 'default' },
  };

  protected readonly sourceTag: STColumnTag = {
    device: { text: '设备', color: 'green' },
    device_offline: { text: '设备离线', color: 'orange' },
    ssh: { text: 'SSH', color: 'purple' },
    http: { text: 'HTTP', color: 'blue' },
    tunnel: { text: '隧道', color: 'cyan' },
    auth: { text: '认证', color: 'gold' },
    mapping: { text: '映射', color: 'geekblue' },
    session_rejected: { text: '会话拒绝', color: 'gold' },
    open_tcp_failed: { text: '连接失败', color: 'red' },
  };

  protected readonly columns: STColumn<EventRow>[] = [
    { title: '事件', index: 'title', render: 'titleRender', fixed: 'left', width: 280 },
    { title: '等级', index: 'level', type: 'tag', tag: this.levelTag, width: 100 },
    { title: '来源', index: 'source', type: 'tag', tag: this.sourceTag, width: 120 },
    { title: '设备', index: 'deviceName', width: 120, default: '-' },
    { title: '状态', index: 'status', type: 'tag', tag: this.statusTag, width: 110 },
    { title: '消息', index: 'message', render: 'messageRender', width: 360 },
    { title: '发生时间', index: 'occurredAt', render: 'timeRender', width: 180 },
    { title: '关闭时间', index: 'closedAt', render: 'timeRender', width: 180 },
    {
      title: '操作',
      fixed: 'right',
      width: 140,
      buttons: [
        {
          icon: 'folder-view',
          click: (item) => this.detail(item.guid),
        },
        {
          icon: 'check',
          iif: (item) => isOpenEventStatus(item.status),
          click: (item) => this.ack(item.guid),
        },
        {
          icon: 'close',
          className: 'text-error',
          iif: (item) => !isClosedEventStatus(item.status),
          click: (item) => this.close(item.guid),
          pop: {
            title: '确认关闭该事件？',
            okType: 'danger',
            icon: 'close',
          },
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    forkJoin({
      devices: this.devicesService.list({ page: 1, size: 200 }),
      events: this.eventsService.list({
        page: this.q.page,
        size: this.q.size,
        deviceGuid: this.q.deviceGuid || undefined,
        level: this.q.level || undefined,
        status: this.q.status || undefined,
      }),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ devices, events }) => {
          this.devices = devices.data ?? [];
          this.total = events.total ?? 0;
          this.rows = this.toRows(events.data ?? []);
        },
        error: () => this.message.error('事件中心加载失败'),
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
    this.q = { page: 1, size: this.q.size, deviceGuid: '', level: '', status: '' };
    this.load();
  }

  protected detail(guid: string): void {
    this.router.navigate(['/events', guid]);
  }

  protected ack(guid: string): void {
    this.eventsService.ack(guid).subscribe({
      next: () => {
        this.message.success('事件已处理');
        this.load();
      },
      error: () => this.message.error('事件确认失败'),
    });
  }

  protected close(guid: string): void {
    this.eventsService.close(guid).subscribe({
      next: () => {
        this.message.success('事件已关闭');
        this.load();
      },
      error: () => this.message.error('事件关闭失败'),
    });
  }

  protected openCount(): number {
    return this.rows.filter((item) => isOpenEventStatus(item.status)).length;
  }

  protected ackedCount(): number {
    return this.rows.filter((item) => isClosedEventStatus(item.status)).length;
  }

  protected closedCount(): number {
    return this.rows.filter((item) => isClosedEventStatus(item.status)).length;
  }

  protected severeCount(): number {
    return this.rows.filter((item) => ['critical', 'error', 'high'].includes(item.level)).length;
  }

  protected summaryItems(): MetricSummaryItem[] {
    return [
      { label: '本页未处理', value: this.openCount(), tone: this.openCount() ? 'danger' : 'muted' },
      { label: '本页已处理', value: this.ackedCount(), tone: this.ackedCount() ? 'warning' : 'muted' },
      { label: '本页已关闭', value: this.closedCount(), tone: this.closedCount() ? 'success' : 'muted' },
      { label: '本页严重', value: this.severeCount(), tone: this.severeCount() ? 'danger' : 'muted' },
    ];
  }

  protected statusText(status: EventStatus): string {
    const map: Record<string, string> = {
      0: '已关闭',
      1: '未处理',
      2: '已关闭',
    };
    return map[String(status)] ?? '未知';
  }

  protected formatDateTime(value: number | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const pad = (item: number): string => String(item).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  protected formatPayload(value: string): string {
    if (!value) return '-';
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  protected timeValue(item: EventRow, index: string | string[] | undefined): number {
    const key = Array.isArray(index) ? index[0] : index;
    if (key === 'closedAt') return item.closedAt;
    if (key === 'createTime') return item.createTime;
    if (key === 'updateTime') return item.updateTime;
    return item.occurredAt;
  }

  protected deviceLabel(device: Device): string {
    return this.firstText(device.sncode, device.alias, device.name, device.hostname, device.guid);
  }

  private toRows(items: EventItem[]): EventRow[] {
    const deviceMap = new Map(this.devices.map((device) => [device.guid, this.deviceLabel(device)]));
    return items.map((item) => {
      const eventType = this.firstText(item.eventType, item.event_type);
      const deviceGuid = this.firstText(item.deviceGuid, item.device_guid);
      const deviceSncode = this.firstText(item.deviceSncode, item.device_sncode);
      const title = eventDisplayTitle({ ...item, eventType });
      return {
        ...item,
        deviceGuid,
        deviceSncode,
        eventType,
        source: this.firstText(item.source, eventType),
        level: this.normalizeLevel(item.level),
        title,
        message: eventDisplayMessage({ ...item, eventType, title }),
        payload: this.firstText(item.payload, item.payload_json),
        occurredAt: this.firstNumber(item.occurredAt, item.occurred_at, item.createTime, item.create_time),
        closedAt: this.firstNumber(item.closedAt, item.closed_at),
        createTime: this.firstNumber(item.createTime, item.create_time),
        updateTime: this.firstNumber(item.updateTime, item.update_time),
        deviceName: this.firstText(deviceSncode, deviceMap.get(deviceGuid), deviceGuid),
      };
    });
  }

  private normalizeLevel(level: string | undefined): string {
    const value = String(level || 'info').toLowerCase();
    if (value === 'warning') return 'warn';
    return value;
  }

  private firstText(...values: Array<string | undefined>): string {
    return values.find((value) => value !== undefined && value !== '') ?? '';
  }

  private firstNumber(...values: Array<number | undefined>): number {
    return values.find((value) => value !== undefined && value !== null) ?? 0;
  }
}
