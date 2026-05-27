import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';

import { Device, DevicesService } from '../../devices/devices.service';
import { EventItem, EventStatus, EventsService, isClosedEventStatus, isOpenEventStatus } from '../events.service';

interface EventRow extends EventItem {
  deviceName: string;
}

@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SHARED_IMPORTS, TitleLabelComponent],
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
    deviceGuid: '',
    level: '',
    status: '',
    limit: 100,
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
    { title: '来源', index: 'source', type: 'tag', tag: this.sourceTag, width: 100 },
    { title: '设备', index: 'deviceName', width: 180, default: '-' },
    { title: '状态', index: 'status', type: 'tag', tag: this.statusTag, width: 110 },
    { title: '消息', index: 'message', render: 'messageRender', width: 360 },
    { title: '发生时间', index: 'occurredAt', render: 'timeRender', width: 180 },
    { title: '关闭时间', index: 'closedAt', render: 'timeRender', width: 180 },
    {
      title: '操作',
      fixed: 'right',
      width: 160,
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
        page: 1,
        size: this.q.limit,
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
        error: () => this.message.error('事件告警加载失败'),
      });
  }

  protected reset(): void {
    this.q = { deviceGuid: '', level: '', status: '', limit: this.q.limit };
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

  private toRows(items: EventItem[]): EventRow[] {
    const deviceMap = new Map(this.devices.map((device) => [device.guid, device.name || device.hostname || device.guid]));
    return items.map((item) => {
      const eventType = this.firstText(item.eventType, item.event_type);
      const deviceGuid = this.firstText(item.deviceGuid, item.device_guid);
      const title = this.firstText(item.title, eventType, '事件');
      return {
        ...item,
        deviceGuid,
        eventType,
        source: this.firstText(item.source, eventType),
        level: this.normalizeLevel(item.level),
        title,
        message: this.firstText(item.message, title, eventType),
        payload: this.firstText(item.payload, item.payload_json),
        occurredAt: this.firstNumber(item.occurredAt, item.occurred_at, item.createTime, item.create_time),
        closedAt: this.firstNumber(item.closedAt, item.closed_at),
        createTime: this.firstNumber(item.createTime, item.create_time),
        updateTime: this.firstNumber(item.updateTime, item.update_time),
        deviceName: deviceMap.get(deviceGuid) ?? deviceGuid,
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
